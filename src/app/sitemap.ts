import { MetadataRoute } from 'next';
import { getProducts, getCategories } from '@/lib/woocommerce';

const SITE_URL = 'https://bellano.co.il';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${SITE_URL}/categories`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/about`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${SITE_URL}/contact`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${SITE_URL}/faq`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${SITE_URL}/accessibility`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ];

  // Get all products
  let productPages: MetadataRoute.Sitemap = [];
  try {
    const products = await getProducts({ per_page: 100 });
    productPages = products.map((product: any) => ({
      url: `${SITE_URL}/product/${product.slug}`,
      lastModified: new Date(product.date_modified || product.date_created || new Date()),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }));
  } catch (error) {
    console.error('Error fetching products for sitemap:', error);
  }

  // Get all categories
  let categoryPages: MetadataRoute.Sitemap = [];
  try {
    const categories = await getCategories({ per_page: 100, hide_empty: true });
    categoryPages = categories
      .filter((cat) => cat.slug !== 'uncategorized')
      .map((category) => ({
        url: `${SITE_URL}/category/${category.slug}`,
        lastModified: new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      }));
  } catch (error) {
    console.error('Error fetching categories for sitemap:', error);
  }

  return [...staticPages, ...categoryPages, ...productPages];
}
