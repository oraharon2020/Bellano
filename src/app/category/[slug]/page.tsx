import { CategoryProductGrid } from '@/components/products';
import { getProductsByCategorySlugPaginated, getCategoryBySlug, getCategories } from '@/lib/woocommerce';
import { getCategoryContent } from '@/lib/wordpress';
import { BreadcrumbJsonLd, CollectionPageJsonLd } from '@/components/seo';
import { CategoryContentSection } from '@/components/category/CategoryContentSection';
import { ExpandableDescription } from '@/components/ui/ExpandableDescription';
import { siteConfig, fixMediaUrl } from '@/config/site';
import { getYoastCategorySEO, yoastToMetadata } from '@/lib/wordpress/seo';
import { notFound } from 'next/navigation';

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
    // Get Yoast SEO data straight from the product_cat taxonomy
    const yoastData = await getYoastCategorySEO(slug);
    
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
      title: `${name} | בלאנו`,
      description: fallbackDescription,
      alternates: {
        canonical: canonicalUrl,
      },
      openGraph: {
        title: `${name} | בלאנו`,
        description: fallbackDescription,
        url: canonicalUrl,
        type: 'website',
        siteName: siteConfig.name,
        locale: 'he_IL',
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
      robots: {
        index: true,
        follow: true,
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
  let categoryContent = null;
  let fetchFailed = false;

  try {
    const [categoryData, paginatedData, contentData] = await Promise.all([
      getCategoryBySlug(slug),
      getProductsByCategorySlugPaginated(slug, { per_page: PRODUCTS_PER_PAGE, page: 1 }),
      getCategoryContent(slug),
    ]);
    
    category = categoryData;
    products = paginatedData.products;
    total = paginatedData.total;
    categoryContent = contentData;
  } catch (error) {
    console.error('Error fetching category data:', error);
    fetchFailed = true;
  }

  // A slug that resolves to no real category is a genuine 404 — return the
  // proper not-found page instead of an empty "no products" soft 404. Only when
  // the fetch actually succeeded (never 404 on a transient API error).
  if (!fetchFailed && !category) {
    notFound();
  }

  const categoryName = category?.name || slug;

  const bannerImg = categoryContent?.topBanner ? (
    <picture>
      {categoryContent.topBannerMobile ? (
        <source media="(max-width: 767px)" srcSet={fixMediaUrl(categoryContent.topBannerMobile)} />
      ) : null}
      <img
        src={fixMediaUrl(categoryContent.topBanner)}
        alt={`מבצע ${categoryName}`}
        className="w-full h-auto rounded-2xl"
        loading="eager"
      />
    </picture>
  ) : null;

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

      {/* JSON-LD CollectionPage + ItemList (first page of products) */}
      {products.length > 0 && (
        <CollectionPageJsonLd
          name={categoryName}
          url={`${SITE_URL}/category/${slug}`}
          description={category?.description}
          image={category?.image?.src}
          products={products.slice(0, 24).map((product) => ({
            name: product.name,
            slug: product.slug,
            image: product.images?.[0]?.src,
            price: product.price,
            availability: product.stock_status === 'outofstock' ? 'OutOfStock' : 'InStock',
          }))}
        />
      )}
      
      {bannerImg && (
        <div className="container mx-auto px-4 pt-6">
          {categoryContent?.topBannerLink ? (
            <a href={categoryContent.topBannerLink} className="block">{bannerImg}</a>
          ) : bannerImg}
        </div>
      )}

      <div className="container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav className="text-sm text-muted-foreground mb-6" aria-label="Breadcrumb">
          <a href="/" className="hover:text-primary">דף הבית</a>
          <span className="mx-2">/</span>
          <span>{categoryName}</span>
        </nav>

        {/* Category Header */}
        <div className="mb-8">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <h1 className="text-3xl md:text-4xl font-bold">{categoryName}</h1>
            {total > 0 && (
              <span className="inline-flex items-center rounded-full bg-secondary px-3 py-1 text-sm font-medium text-secondary-foreground">
                {total} מוצרים
              </span>
            )}
          </div>
          <span className="mt-3 block h-1 w-16 rounded-full bg-primary/80" />
          {category?.description && (
            <div className="mt-4">
              <ExpandableDescription description={category.description} />
            </div>
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

        {/* Rich SEO content section (article, advantages, FAQ, related) */}
        {categoryContent && (
          <CategoryContentSection
            content={categoryContent}
            categoryName={categoryName}
          />
        )}
      </div>
    </>
  );
}
