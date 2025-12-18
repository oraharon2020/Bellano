import { ProductPageClient } from './ProductPageClient';
import { getProductBySlug, getProductVariations, transformProduct } from '@/lib/woocommerce/api';
import { notFound } from 'next/navigation';

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
    
    // Fetch FAQs for this product
    const faqs = await getProductFaqs(wooProduct.id);

    return <ProductPageClient product={product} variations={variations} faqs={faqs} />;
  } catch (error) {
    console.error('Error fetching product:', error);
    notFound();
  }
}
