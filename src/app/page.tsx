import Link from 'next/link';
import Image from 'next/image';
import { getProducts, getCategories, transformProduct, transformCategory } from '@/lib/woocommerce';
import { Truck, ShieldCheck, CreditCard, RotateCcw } from 'lucide-react';
import { NewsletterForm } from '@/components/home/NewsletterForm';

// Types for homepage banners
interface HomepageBanner {
  mediaType: 'image' | 'video';
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
    const res = await fetch('https://bellano.co.il/wp-json/bellano/v1/homepage', {
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
  const imageUrl = banner?.image || 'https://bellano.co.il/wp-content/uploads/2024/06/banner-main.jpg';
  const mobileImageUrl = banner?.mobileImage || imageUrl;
  const videoUrl = banner?.video || '';
  const mobileVideoUrl = banner?.mobileVideo || videoUrl; // Fallback to main video
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
  const overlayClass = textColor === 'white' ? 'bg-black/30' : 'bg-white/30';
  
  // Text position classes
  const positionClasses = {
    top: 'items-start pt-24 md:pt-32',
    center: 'items-center',
    bottom: 'items-end pb-24 md:pb-32'
  };
  const textPositionClass = positionClasses[textPosition] || positionClasses.center;

  return (
    <section className="relative h-[85vh] md:h-[85vh] overflow-hidden">
      {/* Background - Video or Image */}
      <div className="absolute inset-0 bg-[#f5f5f0]">
        {/* Desktop: Show video if available, otherwise image */}
        {hasDesktopVideo ? (
          <video
            autoPlay
            muted
            loop
            playsInline
            poster={videoPoster || imageUrl}
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
            poster={videoPoster || mobileImageUrl}
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
        
        {/* Overlay */}
        <div className={`absolute inset-0 ${overlayClass}`} />
      </div>
      
      {/* Content - Only show if there's any text */}
      {(title || subtitle || buttonText) && (
        <div className={`relative h-full flex ${textPositionClass} justify-center text-center`}>
          <div className="max-w-3xl px-6">
            {title && (
              <h1 className={`text-4xl md:text-6xl lg:text-7xl ${getFontClass(titleFont, titleWeight)} ${textColorClass} mb-6 leading-tight ${titleFont === 'english' ? 'tracking-wider' : ''}`}>
                {title}
              </h1>
            )}
            {subtitle && (
              <p className={`${getFontClass(subtitleFont, subtitleWeight)} ${textColorMuted} text-lg md:text-xl mb-8 ${subtitleFont === 'english' ? 'tracking-wide' : ''}`}>
                {subtitle}
              </p>
            )}
            {buttonText && buttonLink && (
              <Link
                href={buttonLink}
                className={`inline-block ${getFontClass(buttonFont, buttonWeight)} ${textColor === 'white' ? 'bg-white text-black hover:bg-black hover:text-white' : 'bg-black text-white hover:bg-white hover:text-black'} px-8 py-4 text-sm tracking-wider transition-all duration-300 uppercase`}
              >
                {buttonText}
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <div className={`w-6 h-10 border-2 ${textColor === 'white' ? 'border-white/50' : 'border-black/50'} rounded-full flex justify-center pt-2`}>
          <div className={`w-1 h-2 ${textColor === 'white' ? 'bg-white/50' : 'bg-black/50'} rounded-full`} />
        </div>
      </div>
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
    const res = await fetch('https://bellano.co.il/wp-json/bellano/v1/featured-categories', {
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
    const wooCategories = await getCategories({ per_page: 8, hide_empty: true });
    categories = wooCategories
      .filter((cat: { parent: number }) => cat.parent === 0)
      .slice(0, 8)
      .map(transformCategory) as CategoryItem[];
  }

  // Category descriptions for better engagement
  const categoryDescriptions: Record<string, string> = {
    'ספות': 'נוחות מושלמת לכל רגע בבית',
    'כורסאות': 'עיצוב ייחודי שמשדרג כל חלל',
    'שולחנות': 'מרכז הבית שלכם',
    'כסאות': 'סטייל ונוחות בכל ארוחה',
    'מיטות': 'שינה איכותית בעיצוב מרהיב',
    'ארונות': 'פתרונות אחסון חכמים',
    'default': 'גלו את הקולקציה המלאה'
  };

  return (
    <section className="py-16 md:py-24 bg-[#fafaf8]">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-12">
          <p className="font-english text-gray-400 text-xs tracking-[0.3em] uppercase mb-4">
            FIND YOUR STYLE
          </p>
          <h2 className="text-3xl md:text-5xl font-light mb-4">
            מה אתם <span className="font-bold">מחפשים?</span>
          </h2>
          <p className="text-gray-500 max-w-xl mx-auto">
            בחרו קטגוריה וגלו מגוון רחב של רהיטים מעוצבים באיכות גבוהה
          </p>
        </div>

        {/* Categories Grid - 2 cols mobile, 4 cols desktop */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5">
          {categories.slice(0, 8).map((category, index) => (
            <Link
              key={category.id}
              href={`/category/${category.slug}`}
              className="group relative"
            >
              {/* Card Container - Square with one sharp corner */}
              <div className="relative aspect-square overflow-hidden rounded-2xl rounded-bl-none bg-white shadow-sm hover:shadow-xl transition-all duration-500">
                {/* Background Image */}
                {category.image && (
                  <Image
                    src={category.image.sourceUrl}
                    alt={category.name}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-110"
                    sizes="(max-width: 768px) 50vw, 25vw"
                  />
                )}
                
                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-80 group-hover:opacity-90 transition-opacity duration-500" />
                
                {/* Content */}
                <div className="absolute inset-0 flex flex-col justify-end p-4 md:p-5">
                  {/* Text Content */}
                  <div className="relative z-10">
                    <h3 className="text-white text-lg md:text-xl font-bold mb-1">
                      {category.name}
                    </h3>
                    <p className="text-white/60 text-xs md:text-sm hidden md:block">
                      {categoryDescriptions[category.name] || categoryDescriptions.default}
                    </p>
                    
                    {/* Arrow on hover */}
                    <span className="inline-flex items-center gap-1 text-white/80 text-xs mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <span>לצפייה</span>
                      <span className="group-hover:-translate-x-1 transition-transform">←</span>
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* View All Link */}
        <div className="text-center mt-10">
          <Link 
            href="/categories" 
            className="inline-flex items-center gap-3 text-gray-600 hover:text-black transition-colors group"
          >
            <span className="text-sm border-b border-gray-300 group-hover:border-black pb-1">
              לכל הקטגוריות
            </span>
            <span className="group-hover:-translate-x-1 transition-transform">←</span>
          </Link>
        </div>
      </div>
    </section>
  );
}

// Best Sellers Section
async function BestSellersSection() {
  const wooProducts = await getProducts({ per_page: 8, orderby: 'popularity' });
  const products = wooProducts.map((product) => transformProduct(product));

  return (
    <section className="py-20 md:py-28 bg-white">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-12">
          <div>
            <p className="font-english text-gray-400 text-xs tracking-[0.3em] uppercase mb-3">
              TRENDING NOW
            </p>
            <h2 className="text-3xl md:text-5xl font-light">
              הכי <span className="font-bold">נמכרים</span>
            </h2>
          </div>
          <Link 
            href="/categories" 
            className="mt-4 md:mt-0 text-sm text-gray-600 hover:text-black transition-colors flex items-center gap-2 group"
          >
            <span>לכל המוצרים</span>
            <span className="group-hover:-translate-x-1 transition-transform">←</span>
          </Link>
        </div>

        {/* Products Horizontal Scroll on Mobile, Grid on Desktop */}
        <div className="relative">
          {/* Mobile Scroll Container */}
          <div className="flex md:grid md:grid-cols-4 gap-6 overflow-x-auto pb-4 md:pb-0 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
            {products.map((product) => (
              <Link
                key={product.id}
                href={`/product/${product.slug}`}
                className="group flex-shrink-0 w-[70vw] md:w-auto"
              >
                {/* Image Container - Square with one sharp corner */}
                <div className="relative aspect-square overflow-hidden bg-[#f5f5f0] mb-4 rounded-2xl rounded-tr-none">
                  {product.image && (
                    <Image
                      src={product.image.sourceUrl}
                      alt={product.name}
                      fill
                      className="object-cover transition-all duration-500 group-hover:scale-105"
                      sizes="(max-width: 768px) 70vw, 25vw"
                    />
                  )}
                  {product.onSale && (
                    <span className="absolute top-4 right-4 bg-black text-white text-[10px] font-english tracking-wider px-3 py-1.5 rounded-lg rounded-tr-none">
                      SALE
                    </span>
                  )}
                  {/* Quick View on Hover */}
                  <div className="absolute inset-x-0 bottom-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                    <span className="block w-full bg-white/95 backdrop-blur-sm text-center py-3 text-sm font-medium hover:bg-black hover:text-white transition-colors">
                      צפייה מהירה
                    </span>
                  </div>
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
            <div className="aspect-[4/3] relative overflow-hidden rounded-2xl rounded-br-none">
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
              className="inline-flex items-center gap-3 bg-black text-white px-8 py-4 font-medium hover:bg-gray-800 transition-colors"
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

// Features Strip
function FeaturesStrip() {
  const features = [
    {
      icon: CreditCard,
      title: 'תנאי תשלום נוחים',
      description: 'עד 12 תשלומים ללא ריבית',
    },
    {
      icon: RotateCcw,
      title: 'מדיניות ביטולים נוחה',
      description: 'ביטול עסקה ללא דמי ביטול',
    },
    {
      icon: Truck,
      title: 'משלוח מהיר',
      description: 'משלוח חינם עד הבית',
    },
    {
      icon: ShieldCheck,
      title: 'איכות גבוהה',
      description: 'אחריות מלאה על כל המוצרים',
    },
  ];

  return (
    <section className="py-12 border-y border-gray-200">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {features.map((feature) => (
            <div key={feature.title} className="text-center">
              <feature.icon className="h-8 w-8 mx-auto mb-3 text-gray-700" strokeWidth={1.5} />
              <h3 className="font-bold text-sm mb-1">{feature.title}</h3>
              <p className="text-gray-500 text-xs">{feature.description}</p>
            </div>
          ))}
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
            הצטרפו לרשימת התפוצה שלנו וקבלו עדכונים על מוצרים חדשים, 
            מבצעים בלעדיים והשראה לעיצוב הבית
          </p>
          
          <NewsletterForm />
          
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
  
  const instagramHandle = 'bellano.decor';

  return (
    <section className="py-16 md:py-20">
      <div className="container mx-auto px-4 mb-10">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-english text-gray-400 text-xs tracking-[0.3em] uppercase mb-3">
              @{instagramHandle.toUpperCase()}
            </p>
            <h2 className="text-3xl md:text-4xl font-light">
              עקבו <span className="font-bold">אחרינו</span>
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
              sizes="(max-width: 768px) 33vw, 16vw"
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
export default async function HomePage() {
  return (
    <div className="flex flex-col">
      <HeroSection />
      <FeaturesStrip />
      <CategoriesSection />
      <CustomFurnitureSection />
      <BestSellersSection />
      <InstagramSection />
      <NewsletterSection />
    </div>
  );
}
