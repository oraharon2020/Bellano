'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { banners as fallbackBanners, bannerSettings as fallbackSettings, Banner } from '@/config/banners';

interface HomepageData {
  banners: Banner[];
  settings: typeof fallbackSettings;
}

export function HeroBanner() {
  const [data, setData] = useState<HomepageData>({ 
    banners: fallbackBanners, 
    settings: fallbackSettings 
  });
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch banners from WordPress
  useEffect(() => {
    const fetchBanners = async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_WORDPRESS_URL || 'https://bellano.co.il'}/wp-json/bellano/v1/homepage`,
          { next: { revalidate: 60 } } // Cache for 1 minute
        );
        
        if (res.ok) {
          const wpData = await res.json();
          if (wpData.banners && wpData.banners.length > 0) {
            setData({
              banners: wpData.banners,
              settings: { ...fallbackSettings, ...wpData.settings }
            });
          }
        }
      } catch (error) {
        console.log('Using fallback banners');
      } finally {
        setIsLoading(false);
      }
    };

    fetchBanners();
  }, []);

  const { banners, settings } = data;

  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % banners.length);
  }, [banners.length]);

  const prevSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev - 1 + banners.length) % banners.length);
  }, [banners.length]);

  // Auto play
  useEffect(() => {
    if (!settings.autoPlay || isHovered || banners.length <= 1) return;

    const interval = setInterval(nextSlide, settings.autoPlayInterval);
    return () => clearInterval(interval);
  }, [isHovered, nextSlide, settings.autoPlay, settings.autoPlayInterval, banners.length]);

  if (banners.length === 0) return null;

  const currentBanner = banners[currentSlide];

  return (
    <section
      className="relative w-full overflow-hidden"
      style={{ 
        height: settings.height.mobile,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <style jsx>{`
        @media (min-width: 768px) {
          section {
            height: ${settings.height.desktop} !important;
          }
        }
      `}</style>

      {/* Slides */}
      <div className="relative w-full h-full">
        {banners.map((banner, index) => (
          <div
            key={banner.id}
            className={`absolute inset-0 transition-opacity duration-700 ${
              index === currentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0'
            }`}
            style={{ backgroundColor: banner.backgroundColor || '#f5f5f5' }}
          >
            {/* Background Image */}
            <Image
              src={banner.image}
              alt={banner.title || 'Banner'}
              fill
              className="object-cover hidden md:block"
              priority={index === 0}
              sizes="100vw"
            />
            {/* Mobile Image */}
            <Image
              src={banner.mobileImage || banner.image}
              alt={banner.title || 'Banner'}
              fill
              className="object-cover md:hidden"
              priority={index === 0}
              sizes="100vw"
            />

            {/* Overlay Content */}
            {(banner.title || banner.subtitle || banner.buttonText) && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                <div className="text-center text-white px-4">
                  {banner.title && (
                    <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold mb-2 md:mb-4 drop-shadow-lg">
                      {banner.title}
                    </h1>
                  )}
                  {banner.subtitle && (
                    <p className="text-lg md:text-2xl mb-4 md:mb-6 drop-shadow-md">
                      {banner.subtitle}
                    </p>
                  )}
                  {banner.buttonText && banner.buttonLink && (
                    <Link
                      href={banner.buttonLink}
                      className="inline-block bg-white text-black px-6 py-3 md:px-8 md:py-4 rounded-full font-medium hover:bg-gray-100 transition-colors text-sm md:text-base"
                    >
                      {banner.buttonText}
                    </Link>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Navigation Arrows */}
      {settings.showArrows && banners.length > 1 && (
        <>
          <button
            onClick={prevSlide}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 md:w-12 md:h-12 bg-white/80 hover:bg-white rounded-full flex items-center justify-center shadow-lg transition-all"
            aria-label="הבא"
          >
            <ChevronRight className="w-5 h-5 md:w-6 md:h-6" />
          </button>
          <button
            onClick={nextSlide}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 md:w-12 md:h-12 bg-white/80 hover:bg-white rounded-full flex items-center justify-center shadow-lg transition-all"
            aria-label="הקודם"
          >
            <ChevronLeft className="w-5 h-5 md:w-6 md:h-6" />
          </button>
        </>
      )}

      {/* Dots Navigation */}
      {settings.showDots && banners.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-2">
          {banners.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`w-2.5 h-2.5 md:w-3 md:h-3 rounded-full transition-all ${
                index === currentSlide
                  ? 'bg-white w-6 md:w-8'
                  : 'bg-white/50 hover:bg-white/75'
              }`}
              aria-label={`עבור לסליידר ${index + 1}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
