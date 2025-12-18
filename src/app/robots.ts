import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/checkout/',
          '/wishlist/',
          '/_next/',
          '/admin/',
        ],
      },
    ],
    sitemap: 'https://bellano.co.il/sitemap.xml',
  };
}
