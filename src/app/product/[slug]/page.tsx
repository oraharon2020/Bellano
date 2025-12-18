import { ProductPageClient } from './ProductPageClient';
import { getProductBySlug, getProductVariations, transformProduct } from '@/lib/woocommerce/api';
import { notFound } from 'next/navigation';

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

// Default FAQs template (fallback if API fails)
const defaultFaqs = [
  {
    question: 'מה זמן האספקה?',
    answer: 'זמן האספקה הוא בין 14-21 ימי עסקים, בהתאם לזמינות במלאי וסוג המוצר.'
  },
  {
    question: 'מה האחריות על המוצר?',
    answer: 'אחריות של שנה מיום הקנייה על פגמים במבנה ובייצור. האחריות אינה כוללת בלאי טבעי או נזק שנגרם משימוש לא נכון.'
  },
  {
    question: 'האם המוצר מגיע מורכב?',
    answer: 'חלק מהמוצרים מגיעים מורכבים וחלקם דורשים הרכבה קלה. הוראות הרכבה מפורטות מצורפות לאריזה. ניתן להזמין שירות הרכבה בתוספת תשלום.'
  },
  {
    question: 'מה מדיניות ההחזרות?',
    answer: 'ניתן להחזיר את המוצר תוך 14 יום מיום הקבלה, כל עוד המוצר באריזתו המקורית ולא נעשה בו שימוש.'
  },
  {
    question: 'האם המשלוח כולל הכנסה לבית?',
    answer: 'כן, המשלוח כולל הובלה והכנסה לבית עד לקומה השלישית ללא מעלית, או לכל קומה עם מעלית.'
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
