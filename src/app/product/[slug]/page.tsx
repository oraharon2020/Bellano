import { ProductPageClient } from './ProductPageClient';
import { getProductBySlug, getProductVariations, transformProduct, getColorSwatches, getProducts } from '@/lib/woocommerce/api';
import { notFound } from 'next/navigation';
import { ProductJsonLd, BreadcrumbJsonLd, FAQJsonLd } from '@/components/seo';
import { siteConfig, getApiEndpoint } from '@/config/site';
import { getYoastSEO, yoastToMetadata } from '@/lib/wordpress/seo';

const SITE_URL = siteConfig.url;

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

// Default FAQs template (fallback if API fails)
const defaultFaqs = [
  {
    question: 'זמני אספקה',
    answer: 'זמני האספקה נעים בין 12-26 ימי עסקים, בהתאם לסוג המוצר והזמינות במלאי. מוצרים בהתאמה אישית עשויים לדרוש זמן ייצור ארוך יותר. נציג שירות יצור אתכם קשר לתיאום מועד אספקה נוח.'
  },
  {
    question: 'אחריות המוצרים',
    answer: 'שנה אחריות מלאה על המוצר מיום הקנייה. האחריות מכסה פגמים במבנה ובייצור. האחריות אינה כוללת בלאי טבעי, נזק שנגרם משימוש לא נכון, או נזקי הובלה לאחר מסירת המוצר.'
  },
  {
    question: 'נקיון ותחזוקת המוצרים',
    answer: 'מומלץ לנקות את המוצר באופן קבוע עם מטלית רכה ויבשה. להסרת כתמים, השתמשו במטלית לחה עם מעט סבון עדין. הימנעו משימוש בחומרי ניקוי אגרסיביים או שוחקים. מומלץ להרחיק את המוצר ממקורות חום ישירים ומלחות גבוהה.'
  },
  {
    question: 'אפשרויות תשלום',
    answer: 'אנו מציעים מגוון אפשרויות תשלום נוחות: תשלום מאובטח בכרטיס אשראי, עד 12 תשלומים ללא ריבית, תשלום בביט או בהעברה בנקאית. כל התשלומים מאובטחים בתקן PCI DSS.'
  },
  {
    question: 'משלוח והובלה',
    answer: 'משלוח חינם עד הבית! ההובלה כוללת הכנסה לבית עד לקומה השלישית ללא מעלית, או לכל קומה עם מעלית. נציג יתאם אתכם מועד אספקה נוח מראש.'
  },
];

// Fetch product FAQs from WordPress
async function getProductFaqs(productId: number) {
  try {
    const response = await fetch(
      getApiEndpoint(`product-faq/${productId}`),
      { next: { revalidate: 300 } }
    );
    
    if (!response.ok) {
      return defaultFaqs;
    }
    
    const data = await response.json();
    return data.faqs && data.faqs.length > 0 ? data.faqs : defaultFaqs;
  } catch (error) {
    console.error('Error fetching product FAQs:', error);
    return defaultFaqs;
  }
}

// Fetch product video from WordPress
async function getProductVideo(productId: number) {
  try {
    const response = await fetch(
      getApiEndpoint(`product-video/${productId}`),
      { next: { revalidate: 300 } }
    );
    
    if (!response.ok) {
      return null;
    }
    
    const data = await response.json();
    
    if (!data.hasVideo || !data.video) {
      return null;
    }
    
    return {
      url: data.video.url,
      thumbnail: data.video.thumbnail || null,
      type: data.video.type as 'file' | 'youtube',
      youtubeId: data.video.youtubeId || null,
    };
  } catch (error) {
    console.error('Error fetching product video:', error);
    return null;
  }
}

// ISR - Revalidate every 30 minutes (products rarely change)
// First visit generates the page, then served from cache
export const revalidate = 1800;

// Pre-generate only popular products at build time
// Rest will be generated on-demand with ISR (fast after first visit)
export async function generateStaticParams() {
  try {
    // Only build top 30 most popular products at build time
    // This keeps build fast (~1 min) even with 1000+ products
    // Other products are built on first visit and cached
    const products = await getProducts({ per_page: 30, orderby: 'popularity' });
    return products.map((product) => ({
      slug: product.slug,
    }));
  } catch (error) {
    console.error('Error generating product params:', error);
    return [];
  }
}

export async function generateMetadata({ params }: ProductPageProps) {
  const { slug } = await params;
  
  try {
    // Try to get Yoast SEO data from WordPress first
    const yoastData = await getYoastSEO(`/product/${slug}/`);
    
    const wooProduct = await getProductBySlug(slug);
    if (!wooProduct) {
      return { title: 'מוצר לא נמצא | בלאנו' };
    }
    
    const product = transformProduct(wooProduct);
    const fallbackDescription = product.description?.replace(/<[^>]*>/g, '').slice(0, 160) || 
      `${product.name} - רהיט מעוצב באיכות גבוהה. משלוח חינם עד הבית!`;
    const fallbackImage = product.image?.sourceUrl;
    
    // If Yoast data exists, use it (what you configure in WordPress)
    if (yoastData) {
      return yoastToMetadata(yoastData, {
        title: `${product.name} | בלאנו`,
        description: fallbackDescription,
        url: `${SITE_URL}/product/${slug}`,
        image: fallbackImage,
      });
    }
    
    // Fallback to auto-generated metadata
    return {
      title: product.name,
      description: fallbackDescription,
      alternates: {
        canonical: `${SITE_URL}/product/${slug}`,
      },
      openGraph: {
        title: `${product.name} | בלאנו`,
        description: fallbackDescription,
        url: `${SITE_URL}/product/${slug}`,
        type: 'website',
        images: fallbackImage ? [{ 
          url: fallbackImage,
          width: 800,
          height: 600,
          alt: product.name,
        }] : [],
      },
      twitter: {
        card: 'summary_large_image',
        title: `${product.name} | בלאנו`,
        description: fallbackDescription,
        images: fallbackImage ? [fallbackImage] : [],
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
    
    // Fetch everything in parallel for speed
    const isVariable = wooProduct.type === 'variable' && wooProduct.variations?.length > 0;
    
    const [variations, faqs, video, swatches] = await Promise.all([
      isVariable ? getProductVariations(wooProduct.id).catch(() => []) : Promise.resolve([]),
      getProductFaqs(wooProduct.id),
      getProductVideo(wooProduct.id),
      getColorSwatches(),
    ]);
    
    const product = transformProduct(wooProduct, variations, swatches);

    // Get category name for breadcrumb
    const categoryName = wooProduct.categories?.[0]?.name || 'מוצרים';
    const categorySlug = wooProduct.categories?.[0]?.slug || '';

    return (
      <>
        {/* JSON-LD Structured Data */}
        <ProductJsonLd
          name={product.name}
          description={product.description || ''}
          image={product.image?.sourceUrl || ''}
          url={`${SITE_URL}/product/${slug}`}
          price={product.price}
          sku={product.sku || String(product.databaseId)}
          availability={wooProduct.stock_status === 'instock' ? 'InStock' : 'OutOfStock'}
        />
        <BreadcrumbJsonLd
          items={[
            { name: 'דף הבית', url: SITE_URL },
            ...(categorySlug ? [{ name: categoryName, url: `${SITE_URL}/category/${categorySlug}` }] : []),
            { name: product.name, url: `${SITE_URL}/product/${slug}` },
          ]}
        />
        {/* FAQ Schema for product questions */}
        <FAQJsonLd questions={faqs} />
        
        <ProductPageClient product={product} variations={variations} faqs={faqs} video={video} swatches={swatches} />
      </>
    );
  } catch (error) {
    console.error('Error fetching product:', error);
    notFound();
  }
}
