import { ProductGrid } from '@/components/products';
import { getProductsByCategorySlug, getCategoryBySlug, getCategories, transformProduct } from '@/lib/woocommerce';
import { BreadcrumbJsonLd } from '@/components/seo';

const SITE_URL = 'https://bellano.co.il';

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
        images: category?.image?.src ? [{ url: category.image.src }] : [],
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

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params;
  
  let category = null;
  let products: any[] = [];

  try {
    const [categoryData, wooProducts] = await Promise.all([
      getCategoryBySlug(slug),
      getProductsByCategorySlug(slug, { per_page: 24 }),
    ]);
    
    category = categoryData;
    products = wooProducts.map(p => transformProduct(p));
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
        <h1 className="text-3xl md:text-4xl font-bold mb-4">{categoryName}</h1>
        {category?.description ? (
          <div 
            className="text-muted-foreground prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: category.description }}
          />
        ) : (
          <p className="text-muted-foreground">
            מבחר רחב של {categoryName} איכותיים בעיצוב מודרני
          </p>
        )}
      </div>

      {/* Sort Options */}
      <div className="flex justify-between items-center mb-6">
        <p className="text-sm text-muted-foreground">
          {products.length} מוצרים
        </p>
        <select className="border rounded-md px-3 py-2 text-sm bg-background">
          <option value="default">מיון בחירת מחדל</option>
          <option value="price-low">מחיר: נמוך לגבוה</option>
          <option value="price-high">מחיר: גבוה לנמוך</option>
          <option value="newest">חדשים ביותר</option>
        </select>
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
