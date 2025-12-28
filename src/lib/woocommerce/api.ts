// WooCommerce REST API Configuration
import { siteConfig, getApiEndpoint } from '@/config/site';
import { cache } from 'react';

const WOOCOMMERCE_URL = process.env.NEXT_PUBLIC_WORDPRESS_URL || siteConfig.wordpressUrl;
const CONSUMER_KEY = process.env.WOOCOMMERCE_CONSUMER_KEY || '';
const CONSUMER_SECRET = process.env.WOOCOMMERCE_CONSUMER_SECRET || '';

// Cache durations
const CACHE_DURATION = {
  PRODUCTS: 300,      // 5 minutes for product listings
  PRODUCT: 600,       // 10 minutes for single product
  CATEGORIES: 3600,   // 1 hour for categories
  SWATCHES: 3600,     // 1 hour for color swatches
  VARIATIONS: 600,    // 10 minutes for variations
};

// Base fetch function with authentication
async function wooFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = new URL(`${WOOCOMMERCE_URL}/wp-json/wc/v3/${endpoint}`);
  
  // Add authentication
  if (CONSUMER_KEY && CONSUMER_SECRET) {
    url.searchParams.append('consumer_key', CONSUMER_KEY);
    url.searchParams.append('consumer_secret', CONSUMER_SECRET);
  }

  const response = await fetch(url.toString(), {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    next: { 
      revalidate: options.next?.revalidate ?? CACHE_DURATION.PRODUCTS,
      tags: ['woocommerce'] 
    },
  });

  if (!response.ok) {
    throw new Error(`WooCommerce API error: ${response.status}`);
  }

  return response.json();
}

// Types
export interface WooProduct {
  id: number;
  name: string;
  slug: string;
  permalink: string;
  type: 'simple' | 'variable' | 'grouped' | 'external';
  status: string;
  description: string;
  short_description: string;
  sku: string;
  price: string;
  regular_price: string;
  sale_price: string;
  on_sale: boolean;
  stock_status: string;
  bellano_availability?: 'in_stock' | 'custom_order'; // Custom field from Bellano plugin
  bellano_assembly?: boolean; // Custom field - product comes assembled (default: true)
  bellano_tambour?: { enabled: boolean; price: number } | null; // Custom field - Tambour color option
  bellano_related?: {
    enabled: boolean;
    discount: number;
    products: {
      id: number;
      parent_id?: number;
      name: string;
      slug: string;
      price: string;
      regular_price?: string;
      image: string;
      is_variation?: boolean;
      variation_attributes?: string[];
    }[];
    variation_bundles?: Record<string, {
      products: number[];
      discount: number | null;
    }> | null;
  } | null; // Custom field - complete the look bundle
  categories: { id: number; name: string; slug: string }[];
  images: { id: number; src: string; alt: string }[];
  attributes: { id: number; name: string; options: string[]; variation: boolean; visible?: boolean }[];
  variations: number[];
  related_ids: number[];
}

export interface WooCategory {
  id: number;
  name: string;
  slug: string;
  parent: number;
  description: string;
  image: { id: number; src: string; alt: string } | null;
  count: number;
}

export interface WooVariation {
  id: number;
  price: string;
  regular_price: string;
  sale_price: string;
  on_sale: boolean;
  attributes: { name: string; option: string }[];
  image: { src: string; alt: string };
}

export interface WooTag {
  id: number;
  name: string;
  slug: string;
  description: string;
  count: number;
}

// API Functions

/**
 * Get all product categories
 */
export async function getCategories(params?: {
  per_page?: number;
  hide_empty?: boolean;
}): Promise<WooCategory[]> {
  const searchParams = new URLSearchParams();
  searchParams.append('per_page', String(params?.per_page || 100));
  searchParams.append('hide_empty', String(params?.hide_empty ?? true));
  
  return wooFetch<WooCategory[]>(`products/categories?${searchParams}`);
}

/**
 * Get single category by slug
 */
export async function getCategoryBySlug(slug: string): Promise<WooCategory | null> {
  const categories = await wooFetch<WooCategory[]>(`products/categories?slug=${slug}`);
  return categories[0] || null;
}

/**
 * Get all product tags
 */
export async function getTags(params?: {
  per_page?: number;
  hide_empty?: boolean;
}): Promise<WooTag[]> {
  const searchParams = new URLSearchParams();
  searchParams.append('per_page', String(params?.per_page || 100));
  searchParams.append('hide_empty', String(params?.hide_empty ?? true));
  
  return wooFetch<WooTag[]>(`products/tags?${searchParams}`);
}

/**
 * Get single tag by slug
 */
export async function getTagBySlug(slug: string): Promise<WooTag | null> {
  const tags = await wooFetch<WooTag[]>(`products/tags?slug=${slug}`);
  return tags[0] || null;
}

/**
 * Get products by tag ID
 */
export async function getProductsByTag(
  tagId: number,
  params?: { per_page?: number; page?: number }
): Promise<WooProduct[]> {
  const searchParams = new URLSearchParams();
  searchParams.append('per_page', String(params?.per_page || 24));
  searchParams.append('page', String(params?.page || 1));
  searchParams.append('tag', String(tagId));
  searchParams.append('status', 'publish');
  
  return wooFetch<WooProduct[]>(`products?${searchParams}`);
}

/**
 * Get products by tag slug (with swatches)
 */
export async function getProductsByTagSlugWithSwatches(
  tagSlug: string,
  params?: { per_page?: number; page?: number }
): Promise<ReturnType<typeof transformProduct>[]> {
  const tag = await getTagBySlug(tagSlug);
  if (!tag) return [];
  
  const [products, swatches] = await Promise.all([
    getProductsByTag(tag.id, params),
    getColorSwatches()
  ]);
  
  return products.map(product => transformProduct(product, undefined, swatches));
}

/**
 * Get products with filters
 */
export async function getProducts(params?: {
  per_page?: number;
  page?: number;
  category?: number;
  search?: string;
  orderby?: 'date' | 'price' | 'popularity' | 'rating' | 'menu_order';
  order?: 'asc' | 'desc';
  featured?: boolean;
  on_sale?: boolean;
}): Promise<WooProduct[]> {
  const searchParams = new URLSearchParams();
  searchParams.append('per_page', String(params?.per_page || 12));
  searchParams.append('page', String(params?.page || 1));
  searchParams.append('status', 'publish');
  
  if (params?.category) searchParams.append('category', String(params.category));
  if (params?.search) searchParams.append('search', params.search);
  if (params?.orderby) searchParams.append('orderby', params.orderby);
  if (params?.order) searchParams.append('order', params.order);
  if (params?.featured) searchParams.append('featured', 'true');
  if (params?.on_sale) searchParams.append('on_sale', 'true');

  return wooFetch<WooProduct[]>(`products?${searchParams}`);
}

/**
 * Get single product by slug
 */
export async function getProductBySlug(slug: string): Promise<WooProduct | null> {
  const products = await wooFetch<WooProduct[]>(`products?slug=${slug}`);
  return products[0] || null;
}

/**
 * Full product data response type
 */
export interface FullProductData {
  success: boolean;
  product: WooProduct;
  variations: WooVariation[];
  faqs: { question: string; answer: string }[];
  video: {
    url: string;
    thumbnail: string | null;
    type: 'file' | 'youtube';
    youtubeId: string | null;
  } | null;
  swatches: Record<string, {
    id: number;
    name: string;
    slug: string;
    attribute: string;
    attribute_slug: string;
    image?: string;
    color?: string;
  }>;
  seo: {
    title: string;
    description: string;
    canonical: string;
    og_title: string;
    og_description: string;
    og_image: string;
    og_type: string;
    twitter_title: string;
    twitter_description: string;
    twitter_image: string;
  } | null;
}

/**
 * Get full product data in a single API call (cached per request)
 * This fetches product, variations, FAQs, video, swatches, and SEO in one call
 * Uses React's cache() to deduplicate between generateMetadata and page component
 */
export const getFullProductData = cache(async (slug: string): Promise<FullProductData | null> => {
  try {
    const response = await fetch(getApiEndpoint(`product-full/${slug}`), {
      next: { revalidate: 600 } // 10 minutes cache
    });
    
    if (!response.ok) {
      return null;
    }
    
    const data = await response.json();
    
    if (!data.success) {
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Error fetching full product data:', error);
    return null;
  }
});

/**
 * Get single product by ID
 */
export async function getProductById(id: number): Promise<WooProduct> {
  return wooFetch<WooProduct>(`products/${id}`);
}

/**
 * Get product variations (with cache)
 */
export async function getProductVariations(productId: number): Promise<WooVariation[]> {
  const url = new URL(`${WOOCOMMERCE_URL}/wp-json/wc/v3/products/${productId}/variations`);
  url.searchParams.append('per_page', '100');
  
  if (CONSUMER_KEY && CONSUMER_SECRET) {
    url.searchParams.append('consumer_key', CONSUMER_KEY);
    url.searchParams.append('consumer_secret', CONSUMER_SECRET);
  }

  const response = await fetch(url.toString(), {
    next: { revalidate: CACHE_DURATION.VARIATIONS },
  });

  if (!response.ok) {
    throw new Error(`WooCommerce API error: ${response.status}`);
  }

  return response.json();
}

/**
 * Get related products
 */
export async function getRelatedProducts(productId: number, limit = 4): Promise<WooProduct[]> {
  const product = await getProductById(productId);
  if (!product.related_ids.length) return [];
  
  const relatedIds = product.related_ids.slice(0, limit);
  const products = await Promise.all(relatedIds.map(id => getProductById(id)));
  return products;
}

/**
 * Search products
 */
export async function searchProducts(query: string, limit = 12): Promise<WooProduct[]> {
  return getProducts({ search: query, per_page: limit });
}

/**
 * Get featured products
 */
export async function getFeaturedProducts(limit = 8): Promise<WooProduct[]> {
  return getProducts({ featured: true, per_page: limit });
}

/**
 * Get products on sale
 */
export async function getSaleProducts(limit = 8): Promise<WooProduct[]> {
  return getProducts({ on_sale: true, per_page: limit });
}

/**
 * Get products by category slug
 */
export async function getProductsByCategorySlug(
  categorySlug: string,
  params?: { per_page?: number; page?: number; orderby?: 'date' | 'price' | 'popularity' | 'rating' | 'menu_order'; order?: 'asc' | 'desc' }
): Promise<WooProduct[]> {
  const category = await getCategoryBySlug(categorySlug);
  if (!category) return [];
  
  return getProducts({
    category: category.id,
    orderby: 'menu_order',
    order: 'asc',
    ...params,
  });
}

/**
 * Get products with swatches only (no variations - faster for catalog pages)
 * This is optimized for category pages where we just need color swatches, not full variation data
 */
export async function getProductsWithSwatches(params?: {
  per_page?: number;
  page?: number;
  category?: number;
  search?: string;
  orderby?: 'date' | 'price' | 'popularity' | 'rating' | 'menu_order';
  order?: 'asc' | 'desc';
}): Promise<ReturnType<typeof transformProduct>[]> {
  // Fetch products and color swatches in parallel
  const [products, swatches] = await Promise.all([
    getProducts(params),
    getColorSwatches()
  ]);
  
  // Transform products with swatches only (no individual variation API calls!)
  return products.map(product => transformProduct(product, undefined, swatches));
}

/**
 * Get products by category slug with swatches (optimized for category pages)
 */
export async function getProductsByCategorySlugWithSwatches(
  categorySlug: string,
  params?: { per_page?: number; page?: number; orderby?: 'date' | 'price' | 'popularity' | 'rating' | 'menu_order'; order?: 'asc' | 'desc' }
): Promise<ReturnType<typeof transformProduct>[]> {
  const category = await getCategoryBySlug(categorySlug);
  if (!category) return [];
  
  return getProductsWithSwatches({
    category: category.id,
    orderby: 'menu_order',
    order: 'asc',
    ...params,
  });
}

// Transform functions to match our app types

// Color swatch cache
export interface ColorSwatch {
  id: number;
  name: string;
  slug: string;
  attribute: string;
  attribute_slug: string;
  image?: string;
  color?: string;
}

let colorSwatchesCache: Record<string, ColorSwatch> | null = null;
let swatchesCacheTime: number = 0;
const SWATCHES_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Fetch color swatches from WordPress
export async function getColorSwatches(): Promise<Record<string, ColorSwatch>> {
  // Return cached data if available and not expired
  if (colorSwatchesCache && Date.now() - swatchesCacheTime < SWATCHES_CACHE_DURATION) {
    return colorSwatchesCache;
  }

  try {
    const response = await fetch(`${WOOCOMMERCE_URL}/wp-json/${siteConfig.prefix}/v1/color-swatches`, {
      next: { revalidate: 300 }
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success && data.swatches) {
        colorSwatchesCache = data.swatches;
        swatchesCacheTime = Date.now();
        return data.swatches;
      }
    }
  } catch (error) {
    console.error('Error fetching color swatches:', error);
  }

  return colorSwatchesCache || {};
}

// Normalize string for comparison (remove extra spaces, lowercase)
function normalizeForComparison(str: string): string {
  return str.trim().toLowerCase().replace(/\s+/g, ' ');
}

// Find swatch by name (improved matching)
export function findSwatchByName(swatches: Record<string, ColorSwatch>, name: string): ColorSwatch | undefined {
  if (!name || !swatches) return undefined;
  
  const normalizedName = normalizeForComparison(name);
  
  // 1. Try exact name match first (case-insensitive)
  const exactMatch = Object.values(swatches).find(s => 
    normalizeForComparison(s.name) === normalizedName
  );
  if (exactMatch) return exactMatch;
  
  // 2. Try slug match (convert Hebrew name to potential slug patterns)
  const possibleSlugs = [
    name.toLowerCase().replace(/\s+/g, '-'),
    name.toLowerCase().replace(/\s+/g, ''),
  ];
  for (const slug of possibleSlugs) {
    if (swatches[slug]) return swatches[slug];
  }
  
  // 3. Try partial match - swatch name contains the search term
  const partialMatch = Object.values(swatches).find(s => 
    normalizeForComparison(s.name).includes(normalizedName) ||
    normalizedName.includes(normalizeForComparison(s.name))
  );
  if (partialMatch) return partialMatch;
  
  return undefined;
}

export function transformProduct(wooProduct: WooProduct, variations?: WooVariation[], swatches?: Record<string, ColorSwatch>) {
  // Extract color attribute only if it's used for variations
  const colorAttr = wooProduct.attributes?.find(attr => 
    (attr.name === 'צבע' || attr.name === 'color' || attr.name === 'pa_color' || attr.name === 'pa_color-product') &&
    attr.variation === true // Only include if used for variations
  );
  
  // Build variations array from actual variations data (ensure it's an array)
  const variationsArray = Array.isArray(variations) ? variations : [];
  const productVariations = variationsArray.map(v => {
    const colorAttribute = v.attributes?.find(a => 
      a.name === 'צבע' || a.name === 'color' || a.name === 'pa_color' || a.name === 'pa_color-product'
    );
    
    const colorName = colorAttribute?.option || '';
    
    // If variation has image, use it. Otherwise try to get from swatches
    let swatchImage: { sourceUrl: string; altText: string } | undefined = undefined;
    
    if (v.image?.src) {
      swatchImage = {
        sourceUrl: v.image.src,
        altText: v.image.alt || colorName || wooProduct.name,
      };
    } else if (swatches && colorName) {
      // Try to find swatch image by color name
      const swatch = findSwatchByName(swatches, colorName);
      if (swatch?.image) {
        swatchImage = {
          sourceUrl: swatch.image,
          altText: swatch.name || colorName,
        };
      }
    }
    
    return {
      id: String(v.id),
      colorName,
      colorSlug: colorAttribute?.option?.toLowerCase().replace(/\s+/g, '-') || '',
      image: swatchImage,
      // Also store the swatch thumbnail separately for the color circles
      swatchImage: swatches ? findSwatchByName(swatches, colorName)?.image : undefined,
    };
  }).filter(v => v.colorName);

  // If no variations but has color attribute (used for variations), create from attribute options
  const fallbackVariations = !productVariations.length && colorAttr && colorAttr.variation
    ? colorAttr.options.map((color, index) => {
        const swatch = swatches ? findSwatchByName(swatches, color) : undefined;
        return {
          id: `${wooProduct.id}-color-${index}`,
          colorName: color,
          colorSlug: color.toLowerCase().replace(/\s+/g, '-'),
          image: swatch?.image ? {
            sourceUrl: swatch.image,
            altText: swatch.name || color,
          } : (wooProduct.images?.[index] ? {
            sourceUrl: wooProduct.images[index].src,
            altText: wooProduct.images[index].alt || color,
          } : undefined),
          swatchImage: swatch?.image,
        };
      })
    : [];

  return {
    id: String(wooProduct.id),
    databaseId: wooProduct.id,
    name: wooProduct.name,
    slug: wooProduct.slug,
    description: wooProduct.description,
    shortDescription: wooProduct.short_description,
    price: wooProduct.price ? `${wooProduct.price} ₪` : '',
    regularPrice: wooProduct.regular_price ? `${wooProduct.regular_price} ₪` : undefined,
    salePrice: wooProduct.sale_price ? `${wooProduct.sale_price} ₪` : undefined,
    onSale: wooProduct.on_sale,
    sku: wooProduct.sku,
    availabilityType: wooProduct.bellano_availability || 'in_stock',
    assemblyIncluded: wooProduct.bellano_assembly !== false, // Default to true if not specified
    tambourColor: wooProduct.bellano_tambour || null, // { enabled: boolean, price: number }
    image: wooProduct.images?.[0] ? {
      sourceUrl: wooProduct.images[0].src,
      altText: wooProduct.images[0].alt || wooProduct.name,
    } : undefined,
    galleryImages: (wooProduct.images || []).slice(1).map(img => ({
      sourceUrl: img.src,
      altText: img.alt || wooProduct.name,
    })),
    variations: productVariations.length ? productVariations : fallbackVariations,
    productCategories: {
      nodes: (wooProduct.categories || []).map(cat => ({
        name: cat.name,
        slug: cat.slug,
      })),
    },
    attributes: {
      // Include all attributes (colors, sizes, materials, etc.)
      // Don't filter by variation flag - include all visible attributes
      nodes: (wooProduct.attributes || [])
        .filter(attr => attr.visible !== false) // Include visible attributes
        .map(attr => ({
          name: attr.name,
          options: attr.options,
        })),
    },
  };
}

/**
 * Get products with their variations (for catalog/category pages)
 */
export async function getProductsWithVariations(params?: {
  per_page?: number;
  page?: number;
  category?: number;
  search?: string;
  orderby?: 'date' | 'price' | 'popularity' | 'rating';
  order?: 'asc' | 'desc';
}): Promise<ReturnType<typeof transformProduct>[]> {
  // Fetch products and color swatches in parallel
  const [products, swatches] = await Promise.all([
    getProducts(params),
    getColorSwatches()
  ]);
  
  // Fetch variations for variable products in parallel
  const productsWithVariations = await Promise.all(
    products.map(async (product) => {
      if (product.type === 'variable' && product.variations.length > 0) {
        try {
          const variations = await getProductVariations(product.id);
          return transformProduct(product, variations, swatches);
        } catch {
          return transformProduct(product, undefined, swatches);
        }
      }
      return transformProduct(product, undefined, swatches);
    })
  );
  
  return productsWithVariations;
}

/**
 * Get products by category slug with variations
 */
export async function getProductsByCategorySlugWithVariations(
  categorySlug: string,
  params?: { per_page?: number; page?: number; orderby?: 'date' | 'price' | 'popularity' | 'rating'; order?: 'asc' | 'desc' }
): Promise<ReturnType<typeof transformProduct>[]> {
  const category = await getCategoryBySlug(categorySlug);
  if (!category) return [];
  
  return getProductsWithVariations({
    category: category.id,
    ...params,
  });
}

export function transformCategory(wooCategory: WooCategory) {
  return {
    id: String(wooCategory.id),
    databaseId: wooCategory.id,
    name: wooCategory.name,
    slug: wooCategory.slug,
    description: wooCategory.description,
    image: wooCategory.image ? {
      sourceUrl: wooCategory.image.src,
      altText: wooCategory.image.alt || wooCategory.name,
    } : undefined,
    count: wooCategory.count,
  };
}
