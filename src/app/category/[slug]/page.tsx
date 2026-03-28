import { CategoryProductGrid } from '@/components/products';
import { getProductsByCategorySlugPaginated, getCategoryBySlug, getCategories } from '@/lib/woocommerce';
import { BreadcrumbJsonLd } from '@/components/seo';
import { ExpandableDescription } from '@/components/ui/ExpandableDescription';
import { siteConfig } from '@/config/site';
import { getYoastSEO, yoastToMetadata } from '@/lib/wordpress/seo';

const SITE_URL = siteConfig.url;
const PRODUCTS_PER_PAGE = 24;

interface CategoryPageProps {
  params: Promise<{ slug: string }>;
}

// Generate static pages for all categories at build time
// Falls back to on-demand rendering if API unavailable during build
export async function generateStaticParams() {
  // Skip during build if no API keys
  if (!process.env.WOOCOMMERCE_CONSUMER_KEY) {
    console.log('Skipping static generation - no API keys');
    return [];
  }
  
  try {
    const categories = await getCategories({ per_page: 50 });
    return categories.map((cat) => ({ slug: cat.slug }));
  } catch (error) {
    console.error('Failed to generate category params:', error);
    return [];
  }
}

// Allow dynamic rendering for pages not generated at build time
export const dynamicParams = true;

// Revalidate every 5 minutes
export const revalidate = 300;

export async function generateMetadata({ params }: CategoryPageProps) {
  const { slug } = await params;
  const canonicalUrl = `${SITE_URL}/category/${slug}`;
  
  try {
    // Get Yoast SEO data from WordPress
    const yoastData = await getYoastSEO(`/product-category/${slug}/`);
    
    const category = await getCategoryBySlug(slug);
    const name = category?.name || slug;
    const fallbackDescription = category?.description?.replace(/<[^>]*>/g, '').slice(0, 160) || 
      `מבחר רחב של ${name} איכותיים בעיצוב מודרני. משלוח חינם עד הבית!`;
    const fallbackImage = category?.image?.src || `${SITE_URL}/og-image.jpg`;
    
    // If Yoast data exists, use it (what you configure in WordPress)
    if (yoastData) {
      return yoastToMetadata(yoastData, {
        title: `${name} | בלאנו`,
        description: fallbackDescription,
        url: canonicalUrl,
        image: fallbackImage,
      });
    }
    
    // Fallback to auto-generated metadata
    return {
      title: name,
      description: fallbackDescription,
      alternates: {
        canonical: canonicalUrl,
      },
      openGraph: {
        title: `${name} | בלאנו`,
        description: fallbackDescription,
        url: canonicalUrl,
        type: 'website',
        images: [{ 
          url: fallbackImage,
          width: 1200,
          height: 630,
          alt: name,
        }],
      },
      twitter: {
        card: 'summary_large_image',
        title: `${name} | בלאנו`,
        description: fallbackDescription,
        images: [fallbackImage],
      },
    };
  } catch {
    return {
      title: slug,
    };
  }
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params;
  
  let category = null;
  let products: any[] = [];
  let total = 0;

  try {
    const [categoryData, paginatedData] = await Promise.all([
      getCategoryBySlug(slug),
      getProductsByCategorySlugPaginated(slug, { per_page: PRODUCTS_PER_PAGE, page: 1 }),
    ]);
    
    category = categoryData;
    products = paginatedData.products;
    total = paginatedData.total;
  } catch (error) {
    console.error('Error fetching category data:', error);
  }

  const categoryName = category?.name || slug;

  return (
    <>
      {/* Prefetch product pages for faster navigation */}
      {products.slice(0, 12).map((product) => (
        <link 
          key={product.slug} 
          rel="prefetch" 
          href={`/product/${product.slug}`} 
          as="document"
        />
      ))}
      
      {/* JSON-LD Breadcrumb */}
      <BreadcrumbJsonLd 
        items={[
          { name: 'דף הבית', url: SITE_URL },
          { name: categoryName, url: `${SITE_URL}/category/${slug}` },
        ]} 
      />
      
      <div className="container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav className="text-sm text-muted-foreground mb-6" aria-label="Breadcrumb">
          <a href="/" className="hover:text-primary">דף הבית</a>
          <span className="mx-2">/</span>
          <span>{categoryName}</span>
        </nav>

        {/* Category Header */}
        <div className="mb-6">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">{categoryName}</h1>
          {category?.description && (
            <ExpandableDescription description={category.description} />
          )}
          {total > 0 && (
            <p className="text-sm text-muted-foreground mt-1">{total} מוצרים</p>
          )}
        </div>

        {/* Products Grid with Load More */}
        {products.length > 0 ? (
          <CategoryProductGrid
            initialProducts={products}
            categorySlug={slug}
            totalProducts={total}
            perPage={PRODUCTS_PER_PAGE}
          />
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">לא נמצאו מוצרים בקטגוריה זו</p>
          </div>
        )}
      </div>
    </>
  );
}
