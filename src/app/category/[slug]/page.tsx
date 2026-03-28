import { FilterableProductGrid } from '@/components/products';
import { getProductsByCategorySlugPaginated, getCategoryBySlug, getCategories } from '@/lib/woocommerce';
import { BreadcrumbJsonLd } from '@/components/seo';
import { ExpandableDescription } from '@/components/ui/ExpandableDescription';
import { siteConfig } from '@/config/site';
import { getYoastSEO, yoastToMetadata } from '@/lib/wordpress/seo';
import Link from 'next/link';

const SITE_URL = siteConfig.url;
const PRODUCTS_PER_PAGE = 24;

interface CategoryPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
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

export async function generateMetadata({ params, searchParams }: CategoryPageProps) {
  const { slug } = await params;
  const { page: pageParam } = await searchParams;
  const currentPage = parseInt(pageParam || '1', 10) || 1;
  const canonicalUrl = currentPage > 1 ? `${SITE_URL}/category/${slug}?page=${currentPage}` : `${SITE_URL}/category/${slug}`;
  
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

export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
  const { slug } = await params;
  const { page: pageParam } = await searchParams;
  const currentPage = Math.max(1, parseInt(pageParam || '1', 10) || 1);
  
  let category = null;
  let products: any[] = [];
  let totalPages = 1;
  let total = 0;

  try {
    const [categoryData, paginatedData] = await Promise.all([
      getCategoryBySlug(slug),
      getProductsByCategorySlugPaginated(slug, { per_page: PRODUCTS_PER_PAGE, page: currentPage }),
    ]);
    
    category = categoryData;
    products = paginatedData.products;
    totalPages = paginatedData.totalPages;
    total = paginatedData.total;
  } catch (error) {
    console.error('Error fetching category data:', error);
  }

  const categoryName = category?.name || slug;
  const categoryUrl = `${SITE_URL}/category/${slug}`;

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
      
      {/* SEO pagination links */}
      {currentPage > 1 && (
        <link rel="prev" href={currentPage === 2 ? categoryUrl : `${categoryUrl}?page=${currentPage - 1}`} />
      )}
      {currentPage < totalPages && (
        <link rel="next" href={`${categoryUrl}?page=${currentPage + 1}`} />
      )}
      
      {/* JSON-LD Breadcrumb */}
      <BreadcrumbJsonLd 
        items={[
          { name: 'דף הבית', url: SITE_URL },
          { name: categoryName, url: categoryUrl },
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
            <p className="text-sm text-muted-foreground mt-1">{total} מוצרים{currentPage > 1 ? ` · עמוד ${currentPage} מתוך ${totalPages}` : ''}</p>
          )}
        </div>

        {/* Products Grid with Filters & Sort */}
        {products.length > 0 ? (
          <FilterableProductGrid products={products} />
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">לא נמצאו מוצרים בקטגוריה זו</p>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <nav className="flex justify-center items-center gap-2 mt-10" aria-label="ניווט בין עמודים">
            {currentPage > 1 && (
              <Link
                href={currentPage === 2 ? `/category/${slug}` : `/category/${slug}?page=${currentPage - 1}`}
                className="px-4 py-2 rounded-md border border-border hover:bg-accent transition-colors"
              >
                → הקודם
              </Link>
            )}
            
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2)
              .reduce<(number | 'ellipsis')[]>((acc, p, i, arr) => {
                if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push('ellipsis');
                acc.push(p);
                return acc;
              }, [])
              .map((item, i) =>
                item === 'ellipsis' ? (
                  <span key={`ellipsis-${i}`} className="px-2 text-muted-foreground">…</span>
                ) : (
                  <Link
                    key={item}
                    href={item === 1 ? `/category/${slug}` : `/category/${slug}?page=${item}`}
                    className={`px-3 py-2 rounded-md border transition-colors ${
                      item === currentPage
                        ? 'bg-primary text-primary-foreground border-primary font-bold'
                        : 'border-border hover:bg-accent'
                    }`}
                    {...(item === currentPage ? { 'aria-current': 'page' as const } : {})}
                  >
                    {item}
                  </Link>
                )
              )}
            
            {currentPage < totalPages && (
              <Link
                href={`/category/${slug}?page=${currentPage + 1}`}
                className="px-4 py-2 rounded-md border border-border hover:bg-accent transition-colors"
              >
                הבא ←
              </Link>
            )}
          </nav>
        )}
      </div>
    </>
  );
}
