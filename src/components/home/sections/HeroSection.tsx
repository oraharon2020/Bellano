import Link from 'next/link';
import Image from 'next/image';
import { siteConfig, getApiEndpoint, fixMediaUrl } from '@/config/site';

const getOptimizedImageUrl = (src: string, width = 750) =>
  src ? `/_next/image?url=${encodeURIComponent(src)}&w=${width}&q=75` : '';

export interface HomepageBanner {
  mediaType: 'image' | 'video';
  imageOnly: boolean;
  image: string;
  mobileImage: string;
  video: string;
  mobileVideo: string;
  videoPoster: string;
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

async function getHomepageData(): Promise<{ banners: HomepageBanner[] } | null> {
  try {
    const res = await fetch(getApiEndpoint('homepage'), { next: { revalidate: 300 } });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

/**
 * Editorial black-and-white hero. Honours the WP-managed banner (image / video /
 * image-only) and layers a refined, minimal luxury caption on top.
 */
export async function HeroSection() {
  const homepageData = await getHomepageData();
  const banner = homepageData?.banners?.[0];

  const mediaType = banner?.mediaType || 'image';
  const imageOnly = banner?.imageOnly || false;
  const imageUrl = banner?.image || siteConfig.defaultBannerImage;
  const mobileImageUrl = banner?.mobileImage || imageUrl;
  const videoUrl = fixMediaUrl(banner?.video) || '';
  const mobileVideoUrl = fixMediaUrl(banner?.mobileVideo) || videoUrl;
  const videoPoster = banner?.videoPoster || imageUrl;
  const title = banner?.title || '';
  const titleFont = banner?.titleFont || 'hebrew';
  const titleWeight = banner?.titleWeight || 'bold';
  const subtitle = banner?.subtitle || '';
  const buttonText = banner?.buttonText || '';
  const buttonLink = banner?.buttonLink || '/categories';
  const textColor = banner?.textColor || 'white';
  const textPosition = banner?.textPosition || 'center';

  const hasDesktopVideo = mediaType === 'video' && videoUrl;
  const hasMobileVideo = mediaType === 'video' && mobileVideoUrl;

  const getFontClass = (font: string, weight: string) => {
    const fontClass = font === 'english' ? 'font-english' : '';
    const weightClass = weight === 'bold' ? 'font-bold' : weight === 'light' ? 'font-light' : 'font-normal';
    return `${fontClass} ${weightClass}`.trim();
  };

  const isWhite = textColor === 'white';
  const textColorClass = isWhite ? 'text-white' : 'text-black';
  const textColorMuted = isWhite ? 'text-white/85' : 'text-black/75';

  const positionClasses = {
    top: 'items-start pt-28 md:pt-36',
    center: 'items-center',
    bottom: 'items-end pb-24 md:pb-32',
  } as const;
  const textPositionClass = positionClasses[textPosition] || positionClasses.center;

  const titleIsHebrew = /[֐-׿]/.test(title);
  const defaultH1 = 'רהיטים מעוצבים לבית - בלאנו';

  // Image-only banner: show the designed artwork at its natural ratio.
  if (imageOnly) {
    return (
      <section className="w-full bg-[#f5f5f0]">
        <h1 className="sr-only">{title || defaultH1}</h1>
        <picture>
          {mobileImageUrl && mobileImageUrl !== imageUrl && (
            <source media="(max-width: 767px)" srcSet={mobileImageUrl} />
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl} alt="בלאנו רהיטי מעצבים" className="block w-full h-auto" fetchPriority="high" />
        </picture>
      </section>
    );
  }

  return (
    <section className="relative h-[78vh] md:h-[90vh] overflow-hidden bg-[#0a0a0a]">
      <div className="absolute inset-0">
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
            sizes="100vw"
            quality={92}
            priority
          />
        )}

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
            sizes="100vw"
            quality={92}
            priority
          />
        )}

        {/* Cinematic vignette: darker at the bottom + a soft side wash on the RTL start. */}
        <div
          className={`absolute inset-0 ${
            isWhite
              ? 'bg-gradient-to-t from-black/70 via-black/20 to-black/30'
              : 'bg-gradient-to-t from-white/70 via-white/10 to-white/30'
          }`}
        />
        <div
          className={`absolute inset-0 ${
            isWhite ? 'bg-gradient-to-l from-black/45 to-transparent' : 'bg-gradient-to-l from-white/50 to-transparent'
          }`}
        />
      </div>

      <div className={`relative h-full flex ${textPositionClass}`}>
        <div className="container mx-auto px-5 md:px-10 w-full">
          <div className="max-w-2xl text-right">
            {/* Hairline overline */}
            <div className="flex items-center justify-end gap-3 mb-6">
              <span className={`h-px w-10 ${isWhite ? 'bg-white/50' : 'bg-black/40'}`} aria-hidden="true" />
              <p className={`font-english text-[11px] tracking-[0.45em] uppercase ${isWhite ? 'text-white/80' : 'text-black/70'}`}>
                Bellano · Designed Furniture
              </p>
            </div>

            {title && titleIsHebrew ? (
              <h1 className={`text-5xl md:text-7xl lg:text-[5.5rem] ${getFontClass(titleFont, titleWeight)} ${textColorClass} mb-6 leading-[1.05] tracking-tight`}>
                {title}
              </h1>
            ) : (
              <>
                {title && (
                  <p className={`text-5xl md:text-7xl lg:text-[5.5rem] ${getFontClass(titleFont, titleWeight)} ${textColorClass} mb-3 leading-[1.05] ${titleFont === 'english' ? 'tracking-wider' : 'tracking-tight'}`}>
                    {title}
                  </p>
                )}
                <h1 className={`${textColorClass} ${title ? 'text-lg md:text-2xl font-light mb-6' : 'text-5xl md:text-7xl lg:text-[5.5rem] font-bold mb-6 leading-[1.05] tracking-tight'}`}>
                  {defaultH1}
                </h1>
              </>
            )}

            {subtitle && (
              <p className={`${textColorMuted} text-base md:text-xl font-light mb-9 max-w-lg ml-auto leading-relaxed`}>
                {subtitle}
              </p>
            )}

            <div className="flex flex-wrap items-center justify-end gap-4">
              <Link
                href={buttonText && buttonLink ? buttonLink : '/categories'}
                className={`group inline-flex items-center gap-3 ${
                  isWhite ? 'bg-white text-black hover:bg-transparent hover:text-white' : 'bg-black text-white hover:bg-transparent hover:text-black'
                } border ${isWhite ? 'border-white' : 'border-black'} px-9 py-4 text-sm tracking-[0.15em] uppercase font-medium transition-all duration-300`}
              >
                <span>{buttonText || 'לצפייה בקולקציות'}</span>
                <span className="transition-transform duration-300 group-hover:-translate-x-1" aria-hidden="true">←</span>
              </Link>
            </div>

            <div className={`mt-10 flex flex-wrap items-center justify-end gap-x-4 gap-y-2 text-xs md:text-sm ${isWhite ? 'text-white/70' : 'text-black/60'}`}>
              <span>משלוח חינם עד הבית</span>
              <span aria-hidden="true" className={`h-3 w-px ${isWhite ? 'bg-white/30' : 'bg-black/25'}`} />
              <span>עד 12 תשלומים ללא ריבית</span>
              <span aria-hidden="true" className={`h-3 w-px ${isWhite ? 'bg-white/30' : 'bg-black/25'}`} />
              <span>שנה אחריות מלאה</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
