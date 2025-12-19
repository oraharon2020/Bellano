import { ProductPageClient } from './ProductPageClient';
import { getProductBySlug, getProductVariations, transformProduct, getColorSwatches } from '@/lib/woocommerce/api';
import { notFound } from 'next/navigation';
import { ProductJsonLd, BreadcrumbJsonLd, FAQJsonLd } from '@/components/seo';

const SITE_URL = 'https://bellano.co.il';

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
      `https://bellano.co.il/wp-json/bellano/v1/product-faq/${productId}`,
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
      `https://bellano.co.il/wp-json/bellano/v1/product-video/${productId}`,
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

// Force dynamic rendering - no static generation
export const dynamic = 'force-dynamic';

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
    const description = product.description?.replace(/<[^>]*>/g, '').slice(0, 160) || 
      `${product.name} - רהיט מעוצב באיכות גבוהה. משלוח חינם עד הבית!`;
    
    return {
      title: product.name,
      description,
      alternates: {
        canonical: `${SITE_URL}/product/${slug}`,
      },
      openGraph: {
        title: `${product.name} | בלאנו`,
        description,
        url: `${SITE_URL}/product/${slug}`,
        type: 'website',
        images: product.image?.sourceUrl ? [{ 
          url: product.image.sourceUrl,
          width: 800,
          height: 600,
          alt: product.name,
        }] : [],
      },
      twitter: {
        card: 'summary_large_image',
        title: `${product.name} | בלאנו`,
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
        <FAQJsonLd faqs={faqs} />
        
        <ProductPageClient product={product} variations={variations} faqs={faqs} video={video} swatches={swatches} />
      </>
    );
  } catch (error) {
    console.error('Error fetching product:', error);
    notFound();
  }
}
