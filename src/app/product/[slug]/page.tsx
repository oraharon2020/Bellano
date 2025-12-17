import { ProductPageClient } from './ProductPageClient';
import { getProductBySlug, getProductVariations, getProducts, transformProduct } from '@/lib/woocommerce/api';
import { notFound } from 'next/navigation';

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

// Generate static pages for popular products at build time
// Falls back to on-demand rendering if API unavailable during build
export async function generateStaticParams() {
  // Skip during build if no API keys
  if (!process.env.WOOCOMMERCE_CONSUMER_KEY) {
    console.log('Skipping static generation - no API keys');
    return [];
  }
  
  try {
    const products = await getProducts({ per_page: 50 });
    return products.map((p) => ({ slug: p.slug }));
  } catch (error) {
    console.error('Failed to generate product params:', error);
    return [];
  }
}

// Allow dynamic rendering for pages not generated at build time
export const dynamicParams = true;

// Revalidate every 5 minutes
export const revalidate = 300;

export async function generateMetadata({ params }: ProductPageProps) {
  const { slug } = await params;
  
  try {
    const wooProduct = await getProductBySlug(slug);
    if (!wooProduct) {
      return { title: 'מוצר לא נמצא | בלאנו' };
    }
    
    const product = transformProduct(wooProduct);
    const description = product.description?.replace(/<[^>]*>/g, '').slice(0, 160) || '';
    
    return {
      title: `${product.name} | בלאנו - רהיטי מעצבים`,
      description,
      openGraph: {
        title: product.name,
        description,
        images: product.image?.sourceUrl ? [product.image.sourceUrl] : [],
      },
    };
  } catch (error) {
    console.error('Error fetching product metadata:', error);
    return { title: 'בלאנו - רהיטי מעצבים' };
  }
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  
  try {
    const wooProduct = await getProductBySlug(slug);
    
    if (!wooProduct) {
      notFound();
    }
    
    // Fetch variations if it's a variable product
    let variations: any[] = [];
    if (wooProduct.type === 'variable' && wooProduct.variations?.length > 0) {
      try {
        variations = await getProductVariations(wooProduct.id);
      } catch (error) {
        console.error('Error fetching variations:', error);
      }
    }
    
    const product = transformProduct(wooProduct, variations);

    return <ProductPageClient product={product} variations={variations} />;
  } catch (error) {
    console.error('Error fetching product:', error);
    notFound();
  }
}
