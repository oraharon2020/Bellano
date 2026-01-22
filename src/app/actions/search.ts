'use server';

import { searchProducts, getProducts, WooProduct } from '@/lib/woocommerce/api';

export interface SearchResult {
  id: number;
  name: string;
  slug: string;
  price: string;
  image: string | null;
  category?: string;
}

// Normalize Hebrew text for better matching
function normalizeHebrew(text: string): string {
  return text
    .replace(/[״"]/g, '"')
    .replace(/[׳']/g, "'")
    .replace(/[-–—]/g, ' ')
    .toLowerCase()
    .trim();
}

// Score product relevance to query
function getRelevanceScore(product: WooProduct, query: string): number {
  const normalizedQuery = normalizeHebrew(query);
  const normalizedName = normalizeHebrew(product.name);
  
  let score = 0;
  
  // Exact match in name = highest score
  if (normalizedName.includes(normalizedQuery)) {
    score += 100;
    // Bonus for match at start
    if (normalizedName.startsWith(normalizedQuery)) {
      score += 50;
    }
  }
  
  // Match in category names
  if (product.categories?.some(cat => 
    normalizeHebrew(cat.name).includes(normalizedQuery)
  )) {
    score += 30;
  }
  
  // Match in short description
  if (product.short_description && 
      normalizeHebrew(product.short_description).includes(normalizedQuery)) {
    score += 20;
  }
  
  // Match in SKU
  if (product.sku && normalizeHebrew(product.sku).includes(normalizedQuery)) {
    score += 40;
  }
  
  return score;
}

export async function searchProductsAction(query: string): Promise<SearchResult[]> {
  if (!query || query.length < 2) {
    return [];
  }

  try {
    // Fetch more products for better relevance sorting
    const products = await searchProducts(query, 30);
    
    // Score and sort by relevance
    const scoredProducts = products
      .map(p => ({ product: p, score: getRelevanceScore(p, query) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 15); // Return top 15 results
    
    return scoredProducts.map(({ product: p }) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      price: p.price ? `₪${p.price}` : '',
      image: p.images?.[0]?.src || null,
      category: p.categories?.[0]?.name,
    }));
  } catch (error) {
    console.error('Search error:', error);
    return [];
  }
}
