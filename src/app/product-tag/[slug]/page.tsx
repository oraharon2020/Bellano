import { CategoryProductGrid } from '@/components/products/CategoryProductGrid';
import { getProductsByTagSlugPaginated, getTagBySlug, getTags } from '@/lib/woocommerce';
import { BreadcrumbJsonLd } from '@/components/seo';
import { siteConfig } from '@/config/site';

const SITE_URL = siteConfig.url;

interface TagPageProps {
  params: Promise<{ slug: string }>;
}

// Generate static pages for all tags at build time
export async function generateStaticParams() {
  if (!process.env.WOOCOMMERCE_CONSUMER_KEY) {
    return [];
  }
  
  try {
    const tags = await getTags({ per_page: 50, hide_empty: true });
    return tags.map((tag) => ({ slug: tag.slug }));
  } catch (error) {
    console.error('Failed to generate tag params:', error);
    return [];
  }
}

export const dynamicParams = true;
export const revalidate = 300;

export async function generateMetadata({ params }: TagPageProps) {
  const { slug } = await params;
  
  try {
    const tag = await getTagBySlug(slug);
    const name = tag?.name || slug;
    const description = tag?.description?.replace(/<[^>]*>/g, '').slice(0, 160) || 
      `מבחר רחב של ${name} איכותיים בעיצוב מודרני. משלוח חינם עד הבית!`;
    
    return {
      title: name,
      description,
      alternates: {
        canonical: `${SITE_URL}/product-tag/${slug}`,
      },
      openGraph: {
        title: `${name} | בלאנו`,
        description,
        url: `${SITE_URL}/product-tag/${slug}`,
        type: 'website',
      },
      twitter: {
        card: 'summary_large_image',
        title: `${name} | בלאנו`,
        description,
      },
    };
  } catch {
    return {
      title: slug,
    };
  }
}

export default async function TagPage({ params }: TagPageProps) {
  const { slug } = await params;
  
  const PER_PAGE = 24;
  let tag = null;
  let products: any[] = [];
  let total = 0;

  try {
    const [tagData, productsData] = await Promise.all([
      getTagBySlug(slug),
      getProductsByTagSlugPaginated(slug, { per_page: PER_PAGE, page: 1 }),
    ]);
    
    tag = tagData;
    products = productsData.products;
    total = productsData.total;
  } catch (error) {
    console.error('Error fetching tag data:', error);
  }

  const tagName = tag?.name || slug;

  return (
    <>
      {/* JSON-LD Breadcrumb */}
      <BreadcrumbJsonLd 
        items={[
          { name: 'דף הבית', url: SITE_URL },
          { name: tagName, url: `${SITE_URL}/product-tag/${slug}` },
        ]} 
      />
      
      <div className="container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav className="text-sm text-muted-foreground mb-6" aria-label="Breadcrumb">
          <a href="/" className="hover:text-primary">דף הבית</a>
          <span className="mx-2">/</span>
          <span>{tagName}</span>
        </nav>

        {/* Tag Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">{tagName}</h1>
          {tag?.description ? (
            <p className="text-muted-foreground" dangerouslySetInnerHTML={{ __html: tag.description }} />
          ) : (
            <p className="text-muted-foreground text-sm">
              מבחר רחב של {tagName} איכותיים בעיצוב מודרני
            </p>
          )}
        </div>

        {/* Products Grid with Infinite Scroll */}
        {products.length > 0 ? (
          <CategoryProductGrid 
            initialProducts={products} 
            categorySlug={slug}
            totalProducts={total}
            perPage={PER_PAGE}
            apiPath={`/api/products/tag/${encodeURIComponent(slug)}`}
          />
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">לא נמצאו מוצרים בתגית זו</p>
          </div>
        )}
      </div>
    </>
  );
}
