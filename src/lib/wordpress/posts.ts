/**
 * WordPress Posts API
 * שליפת פוסטים מהבלוג של WordPress
 */

import { siteConfig } from '@/config/site';

const WP_URL = process.env.NEXT_PUBLIC_WORDPRESS_URL || siteConfig.wordpressUrl;

export interface WPPost {
  id: number;
  slug: string;
  title: { rendered: string };
  content: { rendered: string };
  excerpt: { rendered: string };
  date: string;
  modified: string;
  featured_media: number;
  categories: number[];
  tags: number[];
  author: number;
  _embedded?: {
    'wp:featuredmedia'?: Array<{
      source_url: string;
      alt_text: string;
    }>;
    author?: Array<{
      name: string;
      avatar_urls?: { [key: string]: string };
    }>;
  };
}

export interface WPCategory {
  id: number;
  name: string;
  slug: string;
  count: number;
}

/**
 * Get all blog posts
 */
export async function getPosts(params?: {
  per_page?: number;
  page?: number;
  categories?: number;
  search?: string;
}): Promise<WPPost[]> {
  const searchParams = new URLSearchParams();
  searchParams.append('per_page', String(params?.per_page || 12));
  searchParams.append('page', String(params?.page || 1));
  searchParams.append('_embed', 'true'); // Include featured image and author
  
  if (params?.categories) searchParams.append('categories', String(params.categories));
  if (params?.search) searchParams.append('search', params.search);
  
  const response = await fetch(`${WP_URL}/wp-json/wp/v2/posts?${searchParams}`, {
    next: { revalidate: 300 }, // 5 minutes
  });
  
  if (!response.ok) {
    throw new Error(`WordPress API error: ${response.status}`);
  }
  
  return response.json();
}

/**
 * Get single post by slug
 */
export async function getPostBySlug(slug: string): Promise<WPPost | null> {
  const response = await fetch(
    `${WP_URL}/wp-json/wp/v2/posts?slug=${slug}&_embed=true`,
    { next: { revalidate: 300 } }
  );
  
  if (!response.ok) {
    throw new Error(`WordPress API error: ${response.status}`);
  }
  
  const posts = await response.json();
  return posts[0] || null;
}

/**
 * Get blog categories
 */
export async function getBlogCategories(): Promise<WPCategory[]> {
  const response = await fetch(
    `${WP_URL}/wp-json/wp/v2/categories?per_page=50&hide_empty=true`,
    { next: { revalidate: 3600 } } // 1 hour
  );
  
  if (!response.ok) {
    throw new Error(`WordPress API error: ${response.status}`);
  }
  
  return response.json();
}

/**
 * Get featured image URL from post
 */
export function getFeaturedImage(post: WPPost): string | null {
  return post._embedded?.['wp:featuredmedia']?.[0]?.source_url || null;
}

/**
 * Get author name from post
 */
export function getAuthorName(post: WPPost): string {
  return post._embedded?.author?.[0]?.name || 'בלאנו';
}

/**
 * Format date in Hebrew
 */
export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('he-IL', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Strip HTML tags from string
 */
export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim();
}

/**
 * Get excerpt (clean, limited length)
 */
export function getExcerpt(post: WPPost, maxLength = 150): string {
  const text = stripHtml(post.excerpt.rendered);
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + '...';
}
