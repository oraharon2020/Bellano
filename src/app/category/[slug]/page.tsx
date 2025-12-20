import { ProductGrid } from '@/components/products';
import { getProductsByCategorySlugWithSwatches, getCategoryBySlug, getCategories } from '@/lib/woocommerce';
import { BreadcrumbJsonLd } from '@/components/seo';
import { ExpandableDescription } from '@/components/ui/ExpandableDescription';
import { siteConfig } from '@/config/site';

const SITE_URL = siteConfig.url;

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
  
  try {
    const category = await getCategoryBySlug(slug);
    const name = category?.name || slug;
    const description = category?.description?.replace(/<[^>]*>/g, '').slice(0, 160) || 
      `מבחר רחב של ${name} איכותיים בעיצוב מודרני. משלוח חינם עד הבית!`;
    
    // Use category image or fallback to site OG image
    const ogImage = category?.image?.src || `${SITE_URL}/og-image.jpg`;
    
    return {
      title: name,
      description,
      alternates: {
        canonical: `${SITE_URL}/category/${slug}`,
      },
      openGraph: {
        title: `${name} | בלאנו`,
        description,
        url: `${SITE_URL}/category/${slug}`,
        type: 'website',
        images: [{ 
          url: ogImage,
          width: 1200,
          height: 630,
          alt: name,
        }],
      },
      twitter: {
        card: 'summary_large_image',
        title: `${name} | בלאנו`,
        description,
        images: [ogImage],
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

  try {
    const [categoryData, productsData] = await Promise.all([
      getCategoryBySlug(slug),
      getProductsByCategorySlugWithSwatches(slug, { per_page: 24 }),
    ]);
    
    category = categoryData;
    products = productsData;
  } catch (error) {
    console.error('Error fetching category data:', error);
  }

  const categoryName = category?.name || slug;

  return (
    <>
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
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">{categoryName}</h1>
          {category?.description ? (
            <ExpandableDescription description={category.description} />
          ) : (
            <p className="text-muted-foreground text-sm">
              מבחר רחב של {categoryName} איכותיים בעיצוב מודרני
            </p>
          )}
        </div>

      {/* Sort Options */}
      <div className="flex justify-between items-center mb-6">
        <p className="text-sm text-muted-foreground">
          {products.length} מוצרים
        </p>
        <div className="flex items-center gap-2">
          <label htmlFor="sort-select" className="text-sm text-muted-foreground sr-only">מיון לפי</label>
          <select 
            id="sort-select"
            className="border rounded-md px-3 py-2 text-sm bg-background"
            aria-label="מיין מוצרים"
          >
            <option value="default">מיון בחירת מחדל</option>
            <option value="price-low">מחיר: נמוך לגבוה</option>
            <option value="price-high">מחיר: גבוה לנמוך</option>
            <option value="newest">חדשים ביותר</option>
          </select>
        </div>
      </div>

        {/* Products Grid */}
        {products.length > 0 ? (
          <ProductGrid products={products} />
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">לא נמצאו מוצרים בקטגוריה זו</p>
          </div>
        )}
      </div>
    </>
  );
}
