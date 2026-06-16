import { ProductPageClient } from './ProductPageClient';
import { getFullProductData, transformProduct, getProducts } from '@/lib/woocommerce/api';
import { getFormulaConfig } from '@/lib/formula-pricing';
import { notFound } from 'next/navigation';
import { ProductJsonLd, BreadcrumbJsonLd, FAQJsonLd } from '@/components/seo';
import { siteConfig } from '@/config/site';

const SITE_URL = siteConfig.url;

/** Replace admin subdomain URLs with public site URL */
function sanitizeAdminUrl(url: string | undefined): string | undefined {
  if (!url) return url;
  const adminHost = new URL(siteConfig.wordpressUrl).host;
  const publicHost = new URL(siteConfig.url).host;
  return url.replaceAll(adminHost, publicHost);
}

/** Convert admin image URL to publicly accessible URL via Next.js image proxy */
function sanitizeImageUrl(url: string | undefined): string | undefined {
  if (!url) return url;
  const adminHost = new URL(siteConfig.wordpressUrl).host;
  if (url.includes(adminHost) || url.includes('/wp-content/uploads/')) {
    const adminUrl = url.includes(adminHost) ? url : url.replace(new URL(siteConfig.url).host, adminHost);
    return `${SITE_URL}/_next/image?url=${encodeURIComponent(adminUrl)}&w=1200&q=75`;
  }
  return url;
}

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
  {
    question: 'מחירון התקנות',
    answer: '₪200 – שידת צד מיטה צפה\n₪100 – קונסולה צפה\n₪200 – מזנון צף\n₪200 – שולחן משרד\n₪100 – מיטה\n₪200 – פינת אוכל\n₪200 – ארון שירות צף\n\nההתקנה על אחריות הלקוח בלבד. איננו מתקינים על גבס או על חיפוי קיר.'
  },
];

// ISR - Revalidate every 30 minutes (products rarely change)
// First visit generates the page, then served from cache
export const revalidate = 1800;

// Pre-generate only popular products at build time
// Rest will be generated on-demand with ISR (fast after first visit)
export async function generateStaticParams() {
  try {
    // Pre-build top 100 most popular products at build time for faster initial loads
    // Other products are built on first visit and cached via ISR
    const products = await getProducts({ per_page: 100, orderby: 'popularity' });
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

  // Single API call - cached and shared with page component
  let data;
  try {
    data = await getFullProductData(slug);
  } catch (error) {
    console.error('Error fetching product metadata:', error);
    return { title: 'בלאנו - רהיטי מעצבים' };
  }

  // notFound() must be thrown here (before streaming starts) so the response
  // gets a real 404 status — throwing it only in the page body yields a soft 404.
  // It must also stay outside the try/catch or the catch would swallow it.
  if (!data) {
    notFound();
  }

  const { product: wooProduct, seo } = data;
    const product = transformProduct(wooProduct);
    
    const fallbackDescription = product.description?.replace(/<[^>]*>/g, '').slice(0, 160) || 
      `${product.name} - רהיט מעוצב באיכות גבוהה. משלוח חינם עד הבית!`;
    const fallbackImage = product.image?.sourceUrl;
    
    // If Yoast SEO data exists from WordPress
    if (seo?.title) {
      return {
        // Yoast title already includes the brand — absolute skips the layout
        // template that would append "| בלאנו - רהיטי מעצבים" a second time
        title: { absolute: seo.title },
        description: seo.description || fallbackDescription,
        alternates: {
          canonical: sanitizeAdminUrl(seo.canonical) || `${SITE_URL}/product/${slug}`,
        },
        openGraph: {
          title: seo.og_title || `${product.name} | בלאנו`,
          description: seo.og_description || fallbackDescription,
          url: `${SITE_URL}/product/${slug}`,
          type: 'article',
          images: seo.og_image ? [{ 
            url: sanitizeImageUrl(seo.og_image)!,
            width: 1200,
            height: 630,
            alt: product.name,
          }] : fallbackImage ? [{ 
            url: sanitizeImageUrl(fallbackImage)!,
            width: 800,
            height: 600,
            alt: product.name,
          }] : [],
        },
        twitter: {
          card: 'summary_large_image',
          title: seo.twitter_title || `${product.name} | בלאנו`,
          description: seo.twitter_description || fallbackDescription,
          images: seo.twitter_image ? [sanitizeImageUrl(seo.twitter_image)!] : fallbackImage ? [sanitizeImageUrl(fallbackImage)!] : [],
        },
      };
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
        type: 'article',
        images: fallbackImage ? [{ 
          url: sanitizeImageUrl(fallbackImage)!,
          width: 800,
          height: 600,
          alt: product.name,
        }] : [],
      },
      twitter: {
        card: 'summary_large_image',
        title: `${product.name} | בלאנו`,
        description: fallbackDescription,
        images: fallbackImage ? [sanitizeImageUrl(fallbackImage)!] : [],
      },
    };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  
  try {
    // Single API call - cached and shared with generateMetadata
    const data = await getFullProductData(slug);
    
    if (!data) {
      notFound();
    }
    
    const { product: wooProduct, variations, faqs: apiFaqs, video, swatches } = data;

    // Formula pricing config (custom-dimension products) — null for regular
    // products or if the WP module is unreachable, so it can never break the page
    const formulaConfig = await getFormulaConfig(wooProduct.id);

    // Use API FAQs or fallback to default
    const faqs = apiFaqs && apiFaqs.length > 0 ? apiFaqs : defaultFaqs;
    
    // Transform product with variations and swatches
    const product = transformProduct(wooProduct, variations, swatches);

    // Get category name for breadcrumb
    const categoryName = wooProduct.categories?.[0]?.name || 'מוצרים';
    const categorySlug = wooProduct.categories?.[0]?.slug || '';

    // Get related products data (complete the look)
    const relatedData = wooProduct.bellano_related || null;

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
        
        <ProductPageClient 
          product={product} 
          variations={variations} 
          faqs={faqs} 
          video={video} 
          swatches={swatches}
          category={categorySlug ? { name: categoryName, slug: categorySlug } : undefined}
          relatedData={relatedData}
          formulaConfig={formulaConfig}
        />
      </>
    );
  } catch (error) {
    console.error('Error fetching product:', error);
    notFound();
  }
}
