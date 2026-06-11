import { MetadataRoute } from 'next';
import { siteConfig } from '@/config/site';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // NOTE: /_next/ must stay crawlable — /_next/image serves every product
        // image (Google Images) and /_next/static is required for page rendering
        disallow: [
          '/api/',
          '/checkout/',
          '/wishlist/',
          '/admin/',
          '/design-assistant/',
        ],
      },
    ],
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}
