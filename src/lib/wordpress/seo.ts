// Yoast SEO data fetching
import { siteConfig } from '@/config/site';

interface YoastSEOData {
  title?: string;
  description?: string;
  canonical?: string;
  og_title?: string;
  og_description?: string;
  og_url?: string;
  og_type?: string;
  og_locale?: string;
  og_site_name?: string;
  og_image?: Array<{
    url: string;
    width?: string;
    height?: string;
    type?: string;
  }>;
  twitter_card?: string;
  robots?: {
    index?: string;
    follow?: string;
  };
}

/**
 * Fetch Yoast SEO data for a given URL
 * This pulls the exact SEO settings you configure in WordPress Yoast/RankMath
 */
export async function getYoastSEO(path: string): Promise<YoastSEOData | null> {
  try {
    const fullUrl = `${siteConfig.wordpressUrl}${path}`;
    const apiUrl = `${siteConfig.wordpressUrl}/wp-json/yoast/v1/get_head?url=${encodeURIComponent(fullUrl)}`;
    
    const response = await fetch(apiUrl, {
      next: { revalidate: 300 } // Cache for 5 minutes
    });
    
    if (!response.ok) {
      // Silently fail - will use fallback SEO
      return null;
    }
    
    const data = await response.json();
    return data.json || null;
  } catch {
    // Silently fail - will use fallback SEO
    return null;
  }
}

/**
 * Convert Yoast data to Next.js Metadata format
 */
export function yoastToMetadata(yoast: YoastSEOData, fallback: {
  title: string;
  description: string;
  url: string;
  image?: string;
}) {
  const ogImage = yoast.og_image?.[0]?.url || fallback.image;
  
  return {
    title: yoast.title || fallback.title,
    description: yoast.description || fallback.description,
    alternates: {
      canonical: yoast.canonical || fallback.url,
    },
    openGraph: {
      title: yoast.og_title || yoast.title || fallback.title,
      description: yoast.og_description || yoast.description || fallback.description,
      url: yoast.og_url || fallback.url,
      type: (yoast.og_type as 'website' | 'article') || 'website',
      siteName: yoast.og_site_name || siteConfig.name,
      locale: yoast.og_locale || 'he_IL',
      images: ogImage ? [{
        url: ogImage,
        width: 1200,
        height: 630,
      }] : [],
    },
    twitter: {
      card: (yoast.twitter_card as 'summary_large_image' | 'summary') || 'summary_large_image',
      title: yoast.og_title || yoast.title || fallback.title,
      description: yoast.og_description || yoast.description || fallback.description,
      images: ogImage ? [ogImage] : [],
    },
    // Always allow indexing on Next.js site (ignore Yoast robots from admin subdomain)
    robots: {
      index: true,
      follow: true,
    },
  };
}

/**
 * Fetch Yoast SEO data for a product category using WordPress REST API
 * This pulls SEO data directly from the product_cat taxonomy
 */
export async function getYoastCategorySEO(slug: string): Promise<YoastSEOData | null> {
  try {
    const apiUrl = `${siteConfig.wordpressUrl}/wp-json/wp/v2/product_cat?slug=${encodeURIComponent(slug)}`;
    
    const response = await fetch(apiUrl, {
      next: { revalidate: 300 }
    });
    
    if (!response.ok) {
      return null;
    }
    
    const data = await response.json();
    
    if (!data || data.length === 0) {
      return null;
    }
    
    const category = data[0];
    const yoastHead = category.yoast_head_json;
    
    if (!yoastHead) {
      return null;
    }
    
    return {
      title: yoastHead.title,
      description: yoastHead.description,
      canonical: yoastHead.canonical,
      og_title: yoastHead.og_title,
      og_description: yoastHead.og_description,
      og_url: yoastHead.og_url,
      og_type: yoastHead.og_type,
      og_locale: yoastHead.og_locale,
      og_site_name: yoastHead.og_site_name,
      og_image: yoastHead.og_image,
      twitter_card: yoastHead.twitter_card,
      robots: yoastHead.robots,
    };
  } catch {
    return null;
  }
}
