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
      console.error('Yoast API error:', response.status);
      return null;
    }
    
    const data = await response.json();
    return data.json || null;
  } catch (error) {
    console.error('Error fetching Yoast SEO:', error);
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
    robots: yoast.robots ? {
      index: yoast.robots.index !== 'noindex',
      follow: yoast.robots.follow !== 'nofollow',
    } : undefined,
  };
}
