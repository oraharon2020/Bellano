import Link from 'next/link';
import Image from 'next/image';
import { getProducts, getCategories, transformProduct, transformCategory } from '@/lib/woocommerce';
import { Truck, ShieldCheck, CreditCard, RotateCcw } from 'lucide-react';

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
  subtitle: string;
  buttonText: string;
  buttonLink: string;
  textColor: 'white' | 'black';
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
  const subtitle = banner?.subtitle || '';
  const buttonText = banner?.buttonText || '';
  const buttonLink = banner?.buttonLink || '/categories';
  const textColor = banner?.textColor || 'white';
  
  // Check if we have any video (desktop or mobile)
  const hasDesktopVideo = mediaType === 'video' && videoUrl;
  const hasMobileVideo = mediaType === 'video' && mobileVideoUrl;
  const hasAnyVideo = hasDesktopVideo || hasMobileVideo;
  
  const textColorClass = textColor === 'white' ? 'text-white' : 'text-black';
  const textColorMuted = textColor === 'white' ? 'text-white/90' : 'text-black/80';
  const overlayClass = textColor === 'white' ? 'bg-black/30' : 'bg-white/30';

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
        <div className="relative h-full flex items-center justify-center text-center">
          <div className="max-w-3xl px-6">
            {title && (
              <h1 className={`text-4xl md:text-6xl lg:text-7xl font-bold ${textColorClass} mb-6 leading-tight`}>
                {title}
              </h1>
            )}
            {subtitle && (
              <p className={`${textColorMuted} text-lg md:text-xl mb-8`}>
                {subtitle}
              </p>
            )}
            {buttonText && buttonLink && (
              <Link
                href={buttonLink}
                className={`inline-block ${textColor === 'white' ? 'bg-white text-black hover:bg-black hover:text-white' : 'bg-black text-white hover:bg-white hover:text-black'} px-8 py-4 text-sm font-medium tracking-wider transition-all duration-300`}
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

// Categories Grid Component
async function CategoriesSection() {
  const wooCategories = await getCategories({ per_page: 6, hide_empty: true });
  const categories = wooCategories
    .filter((cat: { parent: number }) => cat.parent === 0)
    .slice(0, 6)
    .map(transformCategory);

  return (
    <section className="py-16 md:py-24">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-12">
          <p className="font-english text-gray-500 text-sm tracking-[0.3em] uppercase mb-2">
            TOP COLLECTIONS
          </p>
          <h2 className="text-3xl md:text-4xl font-bold">הקולקציות שלנו</h2>
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
          {categories.map((category) => (
            <Link
              key={category.id}
              href={`/category/${category.slug}`}
              className="group relative aspect-[4/5] overflow-hidden bg-gray-100"
            >
              {/* Image */}
              {category.image && (
                <Image
                  src={category.image.sourceUrl}
                  alt={category.name}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-110"
                  sizes="(max-width: 768px) 50vw, 33vw"
                />
              )}
              
              {/* Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              
              {/* Content */}
              <div className="absolute inset-0 flex flex-col items-center justify-end pb-8 text-white">
                <h3 className="text-xl md:text-2xl font-bold mb-2">{category.name}</h3>
                <span className="font-english text-xs tracking-[0.2em] uppercase opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  DISCOVER
                </span>
              </div>
            </Link>
          ))}
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
    <section className="py-16 md:py-24 bg-[#f8f8f6]">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-12">
          <p className="font-english text-gray-500 text-sm tracking-[0.3em] uppercase mb-2">
            BEST SELLERS
          </p>
          <h2 className="text-3xl md:text-4xl font-bold">הנמכרים ביותר</h2>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {products.map((product) => (
            <Link
              key={product.id}
              href={`/product/${product.slug}`}
              className="group"
            >
              {/* Image */}
              <div className="relative aspect-square overflow-hidden bg-gray-100 mb-4">
                {product.image && (
                  <Image
                    src={product.image.sourceUrl}
                    alt={product.name}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="(max-width: 768px) 50vw, 25vw"
                  />
                )}
                {product.onSale && (
                  <span className="absolute top-3 right-3 bg-red-500 text-white text-xs px-2 py-1">
                    SALE
                  </span>
                )}
              </div>
              
              {/* Info */}
              <div className="text-center">
                <h3 className="font-medium text-sm md:text-base mb-1 group-hover:text-gray-600 transition-colors">
                  {product.name}
                </h3>
                <div className="flex items-center justify-center gap-2">
                  {product.onSale && product.regularPrice && (
                    <span className="text-gray-400 line-through text-sm">
                      {product.regularPrice}
                    </span>
                  )}
                  <span className="font-bold">{product.price}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* View All Button */}
        <div className="text-center mt-12">
          <Link
            href="/categories"
            className="inline-block border-2 border-black text-black px-8 py-3 text-sm font-medium tracking-wider hover:bg-black hover:text-white transition-all duration-300"
          >
            VIEW ALL PRODUCTS
          </Link>
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

// Newsletter Section
function NewsletterSection() {
  return (
    <section className="py-16 md:py-24 bg-black text-white">
      <div className="container mx-auto px-4 text-center">
        <p className="font-english text-white/60 text-sm tracking-[0.3em] uppercase mb-4">
          JOIN THE CLUB
        </p>
        <h2 className="text-2xl md:text-3xl font-bold mb-4">
          הצטרפו למועדון הלקוחות
        </h2>
        <p className="text-white/70 mb-8 max-w-md mx-auto">
          קבלו עדכונים על מוצרים חדשים, מבצעים והטבות בלעדיות לחברי המועדון
        </p>
        
        <form className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
          <input
            type="email"
            placeholder="כתובת אימייל"
            className="flex-1 px-4 py-3 bg-white/10 border border-white/20 text-white placeholder:text-white/50 focus:outline-none focus:border-white/50 transition-colors"
          />
          <button
            type="submit"
            className="px-8 py-3 bg-white text-black font-medium hover:bg-gray-200 transition-colors"
          >
            הרשמה
          </button>
        </form>
      </div>
    </section>
  );
}

// Quote Section
function QuoteSection() {
  return (
    <section className="py-16 md:py-24">
      <div className="container mx-auto px-4 text-center">
        <blockquote className="max-w-3xl mx-auto">
          <p className="font-english text-2xl md:text-4xl font-light italic text-gray-700 leading-relaxed">
            "It seems that the future belongs to those who design it."
          </p>
          <footer className="mt-6 text-gray-500">
            <span className="font-english">— BELLANO</span>
          </footer>
        </blockquote>
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
      <BestSellersSection />
      <QuoteSection />
      <NewsletterSection />
    </div>
  );
}
