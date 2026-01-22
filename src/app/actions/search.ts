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
  
  // Match in name = highest priority
  if (normalizedName.includes(normalizedQuery)) {
    score += 100;
    // Bonus for match at start of name
    if (normalizedName.startsWith(normalizedQuery)) {
      score += 50;
    }
    // Bonus for shorter names (more specific match)
    score += Math.max(0, 30 - normalizedName.length);
  }
  
  // Match in category names (lower priority than name)
  if (product.categories?.some(cat => 
    normalizeHebrew(cat.name).includes(normalizedQuery)
  )) {
    // Only give category bonus if name doesn't match
    // This prevents products with only category match from ranking too high
    if (!normalizedName.includes(normalizedQuery)) {
      score += 15; // Lower score for category-only matches
    } else {
      score += 30; // Higher score if both name and category match
    }
  }
  
  // Match in SKU
  if (product.sku && normalizeHebrew(product.sku).includes(normalizedQuery)) {
    score += 40;
  }
  
  // Match only in description = lowest priority (don't add much score)
  // This is what causes "קונסולה" to appear for "מזנון" search
  if (product.short_description && 
      normalizeHebrew(product.short_description).includes(normalizedQuery)) {
    // Only add small score if name doesn't already match
    if (!normalizedName.includes(normalizedQuery)) {
      score += 5; // Very low score for description-only matches
    }
  }
  
  return score;
}

export async function searchProductsAction(query: string): Promise<SearchResult[]> {
  if (!query || query.length < 2) {
    return [];
  }

  try {
    // Fetch more products for better relevance sorting
    const products = await searchProducts(query, 50);
    
    // Score, filter low relevance, and sort
    const scoredProducts = products
      .map(p => ({ product: p, score: getRelevanceScore(p, query) }))
      .filter(({ score }) => score >= 50) // Only show products with name match (score >= 50)
      .sort((a, b) => b.score - a.score)
      .slice(0, 20); // Return top 20 results
    
    // If no high-relevance results, fall back to showing top results by score
    if (scoredProducts.length === 0) {
      const fallbackProducts = products
        .map(p => ({ product: p, score: getRelevanceScore(p, query) }))
        .filter(({ score }) => score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);
      
      return fallbackProducts.map(({ product: p }) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        price: p.price ? `₪${p.price}` : '',
        image: p.images?.[0]?.src || null,
        category: p.categories?.[0]?.name,
      }));
    }
    
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
