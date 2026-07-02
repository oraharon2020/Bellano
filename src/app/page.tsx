import Link from 'next/link';
import Image from 'next/image';
import { getProductsWithSwatches, getCategories, transformCategory } from '@/lib/woocommerce';
import { WhatsAppSubscribeForm } from '@/components/home/WhatsAppSubscribeForm';
import { GoogleReviews } from '@/components/home/GoogleReviews';
import { CategoryQuickNav } from '@/components/home/CategoryQuickNav';
import { siteConfig, getApiEndpoint, fixMediaUrl } from '@/config/site';

// Helper to get optimized image URL through Next.js
const getOptimizedImageUrl = (src: string, width: number = 750) => {
  if (!src) return '';
  // Use Next.js image optimization API
  return `/_next/image?url=${encodeURIComponent(src)}&w=${width}&q=75`;
};

// Types for homepage banners
interface HomepageBanner {
  mediaType: 'image' | 'video';
  imageOnly: boolean;
  image: string;
  mobileImage: string;
  video: string;
  mobileVideo: string;
  videoPoster: string;
  videoAutoplay: boolean;
  videoLoop: boolean;
  videoMuted: boolean;
  title: string;
  titleFont: 'hebrew' | 'english';
  titleWeight: 'normal' | 'bold';
  subtitle: string;
  subtitleFont: 'hebrew' | 'english';
  subtitleWeight: 'normal' | 'bold';
  buttonText: string;
  buttonFont: 'hebrew' | 'english';
  buttonWeight: 'normal' | 'bold';
  buttonLink: string;
  textColor: 'white' | 'black';
  textPosition: 'top' | 'center' | 'bottom';
}

// Fetch homepage data from WordPress
async function getHomepageData(): Promise<{ banners: HomepageBanner[] } | null> {
  try {
    const res = await fetch(getApiEndpoint('homepage'), {
      next: { revalidate: 300 } // Cache for 5 minutes
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

// Hero Banner Component - Now supports video!
async function HeroSection() {
  const homepageData = await getHomepageData();
  const banner = homepageData?.banners?.[0]; // Get first banner
  
  // Default values if no banner from WordPress
  const mediaType = banner?.mediaType || 'image';
  const imageOnly = banner?.imageOnly || false;
  const imageUrl = banner?.image || siteConfig.defaultBannerImage;
  const mobileImageUrl = banner?.mobileImage || imageUrl;
  const videoUrl = fixMediaUrl(banner?.video) || '';
  const mobileVideoUrl = fixMediaUrl(banner?.mobileVideo) || videoUrl; // Fallback to main video
  const videoPoster = banner?.videoPoster || imageUrl;
  const title = banner?.title || '';
  const titleFont = banner?.titleFont || 'hebrew';
  const titleWeight = banner?.titleWeight || 'bold';
  const subtitle = banner?.subtitle || '';
  const subtitleFont = banner?.subtitleFont || 'hebrew';
  const subtitleWeight = banner?.subtitleWeight || 'normal';
  const buttonText = banner?.buttonText || '';
  const buttonFont = banner?.buttonFont || 'english';
  const buttonWeight = banner?.buttonWeight || 'normal';
  const buttonLink = banner?.buttonLink || '/categories';
  const textColor = banner?.textColor || 'white';
  const textPosition = banner?.textPosition || 'center';
  
  // Check if we have any video (desktop or mobile)
  const hasDesktopVideo = mediaType === 'video' && videoUrl;
  const hasMobileVideo = mediaType === 'video' && mobileVideoUrl;
  
  // Font classes helper
  const getFontClass = (font: string, weight: string) => {
    const fontClass = font === 'english' ? 'font-english' : '';
    const weightClasses: Record<string, string> = {
      light: 'font-light',
      normal: 'font-normal',
      bold: 'font-bold'
    };
    const weightClass = weightClasses[weight] || 'font-normal';
    return `${fontClass} ${weightClass}`.trim();
  };
  
  const textColorClass = textColor === 'white' ? 'text-white' : 'text-black';
  const textColorMuted = textColor === 'white' ? 'text-white/90' : 'text-black/80';
  
  // Text position classes
  const positionClasses = {
    top: 'items-start pt-24 md:pt-32',
    center: 'items-center',
    bottom: 'items-end pb-24 md:pb-32'
  };
  const textPositionClass = positionClasses[textPosition] || positionClasses.center;

  // Detect Hebrew so a keyword-bearing Hebrew H1 always exists:
  // an English banner title is rendered as decorative text instead
  const titleIsHebrew = /[֐-׿]/.test(title);
  const defaultH1 = 'רהיטים מעוצבים לבית - בלאנו';

  return (
    <section className="relative h-[60vh] md:h-[72vh] overflow-hidden">
      {/* Background - Video or Image */}
      <div className="absolute inset-0 bg-[#f5f5f0]">
        {/* Desktop: Show video if available, otherwise image */}
        {hasDesktopVideo ? (
          <video
            autoPlay
            muted
            loop
            playsInline
            poster={getOptimizedImageUrl(videoPoster || imageUrl, 1200)}
            className="absolute inset-0 w-full h-full object-cover hidden md:block"
          >
            <source src={videoUrl} type="video/mp4" />
          </video>
        ) : (
          <Image
            src={imageUrl}
            alt="בלאנו רהיטי מעצבים"
            fill
            className="object-cover hidden md:block"
            priority
          />
        )}
        
        {/* Mobile: Show video if available, otherwise image */}
        {hasMobileVideo ? (
          <video
            autoPlay
            muted
            loop
            playsInline
            poster={getOptimizedImageUrl(videoPoster || mobileImageUrl, 750)}
            className="absolute inset-0 w-full h-full object-cover md:hidden"
          >
            <source src={mobileVideoUrl} type="video/mp4" />
          </video>
        ) : (
          <Image
            src={mobileImageUrl}
            alt="בלאנו רהיטי מעצבים"
            fill
            className="object-cover md:hidden"
            priority
          />
        )}
        
        {/* Side gradient overlay - text sits on the right (RTL start) */}
        {!imageOnly && (
          <div className={`absolute inset-0 ${textColor === 'white'
            ? 'bg-gradient-to-l from-black/60 via-black/25 to-black/5'
            : 'bg-gradient-to-l from-white/70 via-white/30 to-white/5'}`} />
        )}
      </div>
      
      {/* Content - hidden entirely for image-only banners; keep an sr-only H1 for SEO */}
      {imageOnly ? (
        <h1 className="sr-only">{title || defaultH1}</h1>
      ) : (
      <div className={`relative h-full flex ${textPositionClass}`}>
        <div className="container mx-auto px-4 md:px-8 w-full">
          <div className="max-w-2xl text-right">
            {/* Overline */}
            <p className={`font-english text-[11px] tracking-[0.4em] uppercase mb-5 ${textColor === 'white' ? 'text-white/70' : 'text-black/60'}`}>
              Bellano · Designed Furniture
            </p>

            {title && titleIsHebrew ? (
              <h1 className={`text-4xl md:text-6xl lg:text-7xl ${getFontClass(titleFont, titleWeight)} ${textColorClass} mb-5 leading-[1.1]`}>
                {title}
              </h1>
            ) : (
              <>
                {title && (
                  <p className={`text-4xl md:text-6xl lg:text-7xl ${getFontClass(titleFont, titleWeight)} ${textColorClass} mb-3 leading-[1.1] ${titleFont === 'english' ? 'tracking-wider' : ''}`}>
                    {title}
                  </p>
                )}
                <h1 className={`${textColorClass} ${title ? 'text-lg md:text-2xl font-light mb-5' : `text-4xl md:text-6xl lg:text-7xl ${getFontClass(titleFont, titleWeight)} mb-5 leading-[1.1]`}`}>
                  {defaultH1}
                </h1>
              </>
            )}

            {subtitle && (
              <p className={`${getFontClass(subtitleFont, subtitleWeight)} ${textColorMuted} text-base md:text-lg mb-8 ${subtitleFont === 'english' ? 'tracking-wide' : ''}`}>
                {subtitle}
              </p>
            )}

            {/* CTA - single clean pill */}
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href={buttonText && buttonLink ? buttonLink : '/categories'}
                className={`inline-block rounded-full ${buttonText ? getFontClass(buttonFont, buttonWeight) : 'font-medium'} ${textColor === 'white' ? 'bg-white text-black hover:bg-black hover:text-white' : 'bg-black text-white hover:bg-white hover:text-black'} px-10 py-4 text-sm tracking-wide transition-all duration-300`}
              >
                {buttonText || 'לצפייה בקולקציות'}
              </Link>
            </div>

            {/* Trust line */}
            <p className={`mt-8 text-xs md:text-sm ${textColor === 'white' ? 'text-white/75' : 'text-black/65'} flex flex-wrap gap-x-2 items-center`}>
              <span>משלוח חינם עד הבית</span>
              <span aria-hidden="true">·</span>
              <span>עד 12 תשלומים ללא ריבית</span>
              <span aria-hidden="true">·</span>
              <span>שנה אחריות מלאה</span>
            </p>
          </div>
        </div>
      </div>
      )}
    </section>
  );
}

// Categories Section - Beautiful Full-Width Cards with Hover Effects
async function CategoriesSection() {
  // Define category type
  interface CategoryItem {
    id: string | number;
    name: string;
    slug: string;
    image?: { sourceUrl: string };
  }
  
  // Try to get featured categories from WordPress, fallback to WooCommerce
  let categories: CategoryItem[] = [];
  
  try {
    const res = await fetch(getApiEndpoint('featured-categories'), {
      next: { revalidate: 300 }
    });
    if (res.ok) {
      const data = await res.json();
      if (data.categories && data.categories.length > 0) {
        categories = data.categories;
      }
    }
  } catch {
    // Fallback to WooCommerce categories
  }
  
  // Fallback: get from WooCommerce
  if (categories.length === 0) {
    const wooCategories = await getCategories({ per_page: 50, hide_empty: true });
    categories = wooCategories
      .filter((cat: { parent: number; slug: string }) => cat.parent === 0 && cat.slug !== 'uncategorized')
      .slice(0, 12)
      .map(transformCategory) as CategoryItem[];
  }

  return (
    <section className="py-16 md:py-24 bg-white">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="flex items-end justify-between mb-8 md:mb-12">
          <h2 className="text-2xl md:text-4xl font-bold">כל הקולקציות</h2>
          <Link
            href="/categories"
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-black transition-colors group"
          >
            <span className="border-b border-gray-300 group-hover:border-black pb-0.5">לכל הקטגוריות</span>
            <span className="group-hover:-translate-x-1 transition-transform">←</span>
          </Link>
        </div>

        {/* Clean collection cards - image on soft background, name below */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {categories.slice(0, 8).map((category) => (
            <Link
              key={category.id}
              href={`/category/${category.slug}`}
              className="group"
            >
              <div className="relative aspect-square rounded-3xl overflow-hidden bg-[#f6f6f4]">
                {category.image?.sourceUrl && (
                  <Image
                    src={category.image.sourceUrl}
                    alt={category.name}
                    fill
                    className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                    sizes="(max-width: 768px) 50vw, 330px"
                    quality={80}
                  />
                )}
              </div>
              <h3 className="mt-3 text-center font-medium text-sm md:text-base text-gray-900 group-hover:text-gray-500 transition-colors">
                {category.name}
              </h3>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

// Best Sellers Section
async function BestSellersSection() {
  const products = await getProductsWithSwatches({ per_page: 8, orderby: 'popularity' });

  return (
    <section className="py-16 md:py-24 bg-[#fafaf8]">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="flex items-end justify-between mb-8 md:mb-12">
          <h2 className="text-2xl md:text-4xl font-bold">המוצרים הנמכרים ביותר</h2>
          <Link
            href="/categories"
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-black transition-colors group"
          >
            <span className="border-b border-gray-300 group-hover:border-black pb-0.5">לכל המוצרים</span>
            <span className="group-hover:-translate-x-1 transition-transform">←</span>
          </Link>
        </div>

        {/* Products Horizontal Scroll on Mobile, Grid on Desktop */}
        <div className="relative">
          {/* Mobile Scroll Container */}
          <div className="flex md:grid md:grid-cols-4 gap-5 md:gap-6 overflow-x-auto pb-4 md:pb-0 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
            {products.map((product) => (
              <Link
                key={product.id}
                href={`/product/${product.slug}`}
                className="group flex-shrink-0 w-[70vw] md:w-auto"
              >
                {/* Image Container - second image revealed on hover */}
                <div className="relative aspect-square overflow-hidden bg-white mb-4 rounded-3xl border border-gray-100">
                  {product.image && (
                    <Image
                      src={product.image.sourceUrl}
                      alt={product.name}
                      fill
                      className={product.galleryImages?.[0]
                        ? 'object-cover transition-opacity duration-500 group-hover:opacity-0'
                        : 'object-cover transition-transform duration-500 group-hover:scale-105'}
                      sizes="(max-width: 768px) 70vw, 300px"
                      quality={75}
                    />
                  )}
                  {product.galleryImages?.[0] && (
                    <Image
                      src={product.galleryImages[0].sourceUrl}
                      alt={product.galleryImages[0].altText || product.name}
                      fill
                      className="object-cover opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                      sizes="(max-width: 768px) 70vw, 300px"
                      quality={75}
                    />
                  )}
                  {product.onSale && (
                    <span className="absolute top-4 right-4 z-10 bg-black text-white text-[10px] font-english tracking-wider px-3 py-1.5 rounded-lg rounded-tr-none">
                      SALE
                    </span>
                  )}
                </div>
                
                {/* Info */}
                <div className="space-y-1">
                  <h3 className="font-medium text-base group-hover:text-gray-600 transition-colors line-clamp-1">
                    {product.name}
                  </h3>
                  <div className="flex items-center gap-3">
                    {product.onSale && product.regularPrice && (
                      <span className="text-gray-400 line-through text-sm">
                        {product.regularPrice}
                      </span>
                    )}
                    <span className="font-bold text-lg">{product.price}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// Sale Section - on-sale products with discount badges
async function SaleSection() {
  let products: Awaited<ReturnType<typeof getProductsWithSwatches>> = [];
  try {
    products = await getProductsWithSwatches({ per_page: 8, on_sale: true, orderby: 'popularity' });
  } catch {
    // Section is skipped when sale products can't be fetched
  }

  if (products.length === 0) return null;

  const getDiscountPercent = (regular?: string, sale?: string) => {
    const r = parseFloat((regular || '').replace(/[^\d.]/g, ''));
    const s = parseFloat((sale || '').replace(/[^\d.]/g, ''));
    if (!r || !s || s >= r) return 0;
    return Math.round(((r - s) / r) * 100);
  };

  return (
    <section className="py-16 md:py-24 bg-white">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="flex items-end justify-between mb-8 md:mb-12">
          <h2 className="text-2xl md:text-4xl font-bold">
            מבצעים <span className="text-red-500">חמים</span>
          </h2>
          <Link
            href="/category/sale"
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-black transition-colors group"
          >
            <span className="border-b border-gray-300 group-hover:border-black pb-0.5">לכל המבצעים</span>
            <span className="group-hover:-translate-x-1 transition-transform">←</span>
          </Link>
        </div>

        {/* Products Horizontal Scroll on Mobile, Grid on Desktop */}
        <div className="flex md:grid md:grid-cols-4 gap-5 md:gap-6 overflow-x-auto pb-4 md:pb-0 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
          {products.map((product) => {
            const discount = getDiscountPercent(product.regularPrice, product.salePrice || product.price);
            return (
              <Link
                key={product.id}
                href={`/product/${product.slug}`}
                className="group flex-shrink-0 w-[70vw] md:w-auto"
              >
                <div className="relative aspect-square overflow-hidden bg-[#f6f6f4] mb-4 rounded-3xl">
                  {product.image && (
                    <Image
                      src={product.image.sourceUrl}
                      alt={product.name}
                      fill
                      className="object-cover transition-all duration-500 group-hover:scale-105"
                      sizes="(max-width: 768px) 70vw, 300px"
                      quality={75}
                    />
                  )}
                  {/* Variable products expose no parent regular_price, so fall back to a SALE badge */}
                  <span className="absolute top-4 right-4 bg-red-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg rounded-tr-none">
                    {discount > 0 ? `${discount}%-` : 'SALE'}
                  </span>
                </div>

                {/* Info */}
                <div className="space-y-1">
                  <h3 className="font-medium text-base group-hover:text-gray-600 transition-colors line-clamp-1">
                    {product.name}
                  </h3>
                  <div className="flex items-center gap-3">
                    {product.regularPrice && (
                      <span className="text-gray-400 line-through text-sm">
                        {product.regularPrice}
                      </span>
                    )}
                    <span className="font-bold text-lg text-red-500">{product.salePrice || product.price}</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// Giant stat section - whitespace and one number (ZVZ-style)
function StatSection() {
  return (
    <section className="bg-[#fafaf8] py-20 md:py-28">
      <div className="container mx-auto px-4 text-center">
        <p
          aria-hidden="true"
          className="font-english text-[110px] md:text-[200px] leading-none font-bold text-gray-200 select-none"
        >
          5.0
        </p>
        <p className="text-xl md:text-2xl font-bold -mt-4 md:-mt-8 relative">
          דירוג מושלם בגוגל
        </p>
        <p className="text-gray-500 text-sm mt-2">
          מבוסס על 42 ביקורות של לקוחות אמיתיים
        </p>
      </div>
    </section>
  );
}

// Homepage FAQ - native accordion, no JS needed
function FAQSection() {
  const faqs = [
    {
      question: 'תוך כמה זמן אקבל את הרהיט?',
      answer: 'זמני האספקה נעים בין 12-26 ימי עסקים, בהתאם לסוג המוצר והזמינות במלאי. מוצרים בהתאמה אישית עשויים לדרוש זמן ייצור ארוך יותר. נציג שירות יצור אתכם קשר לתיאום מועד אספקה נוח.',
    },
    {
      question: 'האם המשלוח באמת חינם?',
      answer: 'כן! משלוח חינם עד הבית על כל המוצרים. ההובלה כוללת הכנסה לבית עד לקומה השלישית ללא מעלית, או לכל קומה עם מעלית. נציג יתאם אתכם מועד אספקה נוח מראש.',
    },
    {
      question: 'אפשר להזמין רהיט במידות ובצבע שלי?',
      answer: 'בהחלט. אנחנו מתמחים בהתאמה אישית של כל פריט - מידות, צבעים, בדים ופרטים קטנים שעושים את ההבדל. הצוות המקצועי שלנו ילווה אתכם משלב התכנון ועד להתקנה בבית.',
    },
    {
      question: 'מה כוללת האחריות?',
      answer: 'שנה אחריות מלאה על המוצר מיום הקנייה. האחריות מכסה פגמים במבנה ובייצור.',
    },
    {
      question: 'איך אפשר לשלם?',
      answer: 'תשלום מאובטח בכרטיס אשראי עד 12 תשלומים ללא ריבית, תשלום בביט או בהעברה בנקאית. כל התשלומים מאובטחים בתקן PCI DSS.',
    },
  ];

  return (
    <section className="py-16 md:py-24 bg-white">
      <div className="container mx-auto px-4 max-w-3xl">
        <h2 className="text-2xl md:text-4xl font-bold text-center mb-10 md:mb-14">השאלות שלכם</h2>

        <div className="space-y-3">
          {faqs.map((faq) => (
            <details
              key={faq.question}
              className="group rounded-2xl border border-gray-200 bg-white open:bg-[#fafaf8] transition-colors"
            >
              <summary className="flex items-center justify-between cursor-pointer list-none px-5 md:px-6 py-4 md:py-5 font-medium text-sm md:text-base [&::-webkit-details-marker]:hidden">
                <span>{faq.question}</span>
                <span className="text-gray-400 text-xl leading-none transition-transform duration-200 group-open:rotate-45" aria-hidden="true">+</span>
              </summary>
              <p className="px-5 md:px-6 pb-5 text-gray-600 text-sm leading-relaxed">
                {faq.answer}
              </p>
            </details>
          ))}
        </div>

        <div className="text-center mt-8">
          <Link
            href="/faq"
            className="inline-block rounded-full border border-gray-300 hover:border-black px-8 py-3 text-sm font-medium transition-colors"
          >
            לכל השאלות והתשובות
          </Link>
        </div>
      </div>
    </section>
  );
}

// Custom Furniture Section
// To change image: Replace /public/images/homepage/custom-furniture.jpg
function CustomFurnitureSection() {
  // Image loaded from: public/images/homepage/custom-furniture.jpg
  // Just replace that file to change the image!
  const customFurnitureImage = "/images/homepage/custom-furniture.jpg";
  
  return (
    <section className="py-20 md:py-28 bg-[#f8f7f5]">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Image Side */}
          <div className="relative">
            <div className="aspect-[4/3] relative overflow-hidden rounded-3xl">
              <Image
                src={customFurnitureImage}
                alt="התאמה אישית"
                fill
                className="object-cover"
              />
            </div>
            {/* Floating Badge */}
            <div className="absolute -bottom-6 -left-6 md:left-auto md:-right-6 bg-black text-white p-6 md:p-8">
              <p className="font-english text-4xl md:text-5xl font-bold">15+</p>
              <p className="text-sm mt-1">שנות ניסיון</p>
            </div>
          </div>
          
          {/* Content Side */}
          <div className="lg:pr-12">
            <p className="font-english text-gray-400 text-xs tracking-[0.3em] uppercase mb-4">
              CUSTOM MADE
            </p>
            <h2 className="text-3xl md:text-5xl font-light mb-6 leading-tight">
              מומחים <span className="font-bold">בהתאמה אישית</span>
            </h2>
            <p className="text-gray-600 text-lg leading-relaxed mb-8">
              כל לקוח הוא ייחודי, וכך גם הריהוט שלו. אנחנו מתמחים בהתאמה אישית של כל פריט - 
              מידות, צבעים, בדים ופרטים קטנים שעושים את ההבדל. הצוות המקצועי שלנו ילווה אתכם 
              משלב התכנון ועד להתקנה בבית.
            </p>
            
            {/* Features List */}
            <div className="grid grid-cols-2 gap-6 mb-10">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-black/5 flex items-center justify-center flex-shrink-0">
                  <span className="text-lg">📐</span>
                </div>
                <div>
                  <h4 className="font-bold text-sm mb-1">מידות מותאמות</h4>
                  <p className="text-gray-500 text-xs">לכל חלל ודרישה</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-black/5 flex items-center justify-center flex-shrink-0">
                  <span className="text-lg">🎨</span>
                </div>
                <div>
                  <h4 className="font-bold text-sm mb-1">מגוון צבעים</h4>
                  <p className="text-gray-500 text-xs">מפלטת עשירה</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-black/5 flex items-center justify-center flex-shrink-0">
                  <span className="text-lg">🛋️</span>
                </div>
                <div>
                  <h4 className="font-bold text-sm mb-1">בדים לבחירה</h4>
                  <p className="text-gray-500 text-xs">איכות פרימיום</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-black/5 flex items-center justify-center flex-shrink-0">
                  <span className="text-lg">🚚</span>
                </div>
                <div>
                  <h4 className="font-bold text-sm mb-1">התקנה מקצועית</h4>
                  <p className="text-gray-500 text-xs">עד הבית</p>
                </div>
              </div>
            </div>
            
            <Link
              href="/contact"
              className="inline-flex items-center gap-3 rounded-full bg-black text-white px-10 py-4 font-medium hover:bg-gray-800 transition-colors"
            >
              <span>דברו איתנו</span>
              <span>←</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}


// Newsletter Section - Elegant Design with functional form
function NewsletterSection() {
  return (
    <section className="py-20 md:py-28 bg-[#1a1a1a] text-white relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{ 
          backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
          backgroundSize: '40px 40px'
        }} />
      </div>
      
      <div className="container mx-auto px-4 relative">
        <div className="max-w-2xl mx-auto text-center">
          <p className="font-english text-white/40 text-xs tracking-[0.3em] uppercase mb-4">
            STAY UPDATED
          </p>
          <h2 className="text-3xl md:text-5xl font-light mb-4">
            הישארו <span className="font-bold">מעודכנים</span>
          </h2>
          <p className="text-white/60 mb-10 text-lg">
            קבלו עדכונים על מוצרים חדשים ומבצעים בלעדיים 
            ישירות לוואטסאפ
          </p>
          
          <WhatsAppSubscribeForm />
          
          <p className="text-white/30 text-xs mt-6">
            לא נשלח ספאם. ניתן לבטל בכל עת.
          </p>
        </div>
      </div>
    </section>
  );
}

// Instagram Section
// To update images: Replace files in /public/images/instagram/
// Files: 1.jpg, 2.jpg, 3.jpg, 4.jpg, 5.jpg, 6.jpg
function InstagramSection() {
  // Images loaded from: public/images/instagram/1.jpg through 6.jpg
  // Just replace those files to change the images!
  const instagramImages = [
    '/images/instagram/1.jpg',
    '/images/instagram/2.jpg',
    '/images/instagram/3.jpg',
    '/images/instagram/4.jpg',
    '/images/instagram/5.jpg',
    '/images/instagram/6.jpg',
  ];
  
  const instagramHandle = siteConfig.social.instagramHandle;

  return (
    <section className="py-16 md:py-20">
      <div className="container mx-auto px-4 mb-10">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-english text-gray-400 text-xs tracking-[0.3em] uppercase mb-3">
              @{instagramHandle.toUpperCase()}
            </p>
            <h2 className="text-2xl md:text-4xl font-bold">
              הבית שלכם עם בלאנו
            </h2>
          </div>
          <a 
            href={`https://instagram.com/${instagramHandle}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 md:mt-0 inline-flex items-center gap-2 text-sm text-gray-600 hover:text-black transition-colors group"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
            </svg>
            <span>עקבו אחרינו באינסטגרם</span>
            <span className="group-hover:-translate-x-1 transition-transform">←</span>
          </a>
        </div>
      </div>
      
      {/* Full Width Image Grid */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-1">
        {instagramImages.map((img, index) => (
          <a
            key={index}
            href={`https://instagram.com/${instagramHandle}`}
            target="_blank"
            rel="noopener noreferrer"
            className="relative aspect-square overflow-hidden group bg-[#f5f5f0]"
          >
            <Image
              src={img}
              alt={`Instagram ${index + 1}`}
              fill
              className="object-cover transition-all duration-500 group-hover:scale-110"
              sizes="(max-width: 768px) 33vw, 200px"
              quality={75}
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
              <svg className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}

// Main Page Component
// Order: shopping-first (quick-nav, products, categories) before brand sections
export default async function HomePage() {
  return (
    <div className="flex flex-col">
      <CategoryQuickNav />
      <HeroSection />
      <CategoriesSection />
      <BestSellersSection />
      <StatSection />
      <SaleSection />
      <CustomFurnitureSection />
      <FAQSection />
      <InstagramSection />
      <GoogleReviews />
      <NewsletterSection />
    </div>
  );
}
