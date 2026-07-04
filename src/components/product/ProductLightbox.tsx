'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { fixMediaUrl } from '@/config/site';

interface LightboxImage {
  sourceUrl: string;
  altText?: string;
}

interface LightboxVideo {
  url: string;
  thumbnail: string | null;
  type: 'file' | 'youtube';
  youtubeId: string | null;
}

interface ProductLightboxProps {
  images: LightboxImage[];
  video?: LightboxVideo | null;
  index: number;
  onIndexChange: (i: number) => void;
  open: boolean;
  onClose: () => void;
  productName: string;
}

/**
 * Full-screen product gallery: swipe / arrow through every image plus an
 * optional video slide at the end. Opened by tapping the main product image.
 */
export function ProductLightbox({
  images,
  video,
  index,
  onIndexChange,
  open,
  onClose,
  productName,
}: ProductLightboxProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const hasVideo = !!video;
  const total = images.length + (hasVideo ? 1 : 0);
  const isVideoSlide = hasVideo && index >= images.length;

  const go = useCallback(
    (dir: number) => {
      if (total <= 0) return;
      onIndexChange((index + dir + total) % total);
    },
    [index, total, onIndexChange]
  );

  // Body-scroll lock + keyboard navigation while open (RTL: right = previous).
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft') go(1);
      else if (e.key === 'ArrowRight') go(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, go, onClose]);

  const touchX = useRef<number | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    touchX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchX.current === null) return;
    const diff = touchX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) go(diff > 0 ? 1 : -1); // swipe left → next
    touchX.current = null;
  };

  if (!mounted || !open || total === 0) return null;

  const videoUrl = video ? fixMediaUrl(video.url) : '';
  const isYouTube = video?.type === 'youtube' && !!video.youtubeId;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] bg-black/95 flex flex-col select-none"
      dir="rtl"
      role="dialog"
      aria-modal="true"
      aria-label={`גלריית ${productName}`}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 text-white/90">
        <span className="text-sm tabular-nums">
          {index + 1} / {total}
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="סגור"
          className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Stage */}
      <div
        className="relative flex-1 min-h-0 flex items-center justify-center"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        {isVideoSlide ? (
          <div className="relative w-full h-full max-w-5xl max-h-[80vh] mx-auto flex items-center justify-center px-2">
            {isYouTube ? (
              <iframe
                src={`https://www.youtube.com/embed/${video!.youtubeId}?autoplay=1&rel=0`}
                title={`סרטון ${productName}`}
                className="w-full aspect-video rounded-xl"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <video
                src={videoUrl}
                controls
                autoPlay
                playsInline
                className="max-w-full max-h-full rounded-xl"
              />
            )}
          </div>
        ) : (
          images[index]?.sourceUrl && (
            <div className="relative w-full h-full max-w-5xl max-h-[80vh] mx-auto">
              <Image
                src={images[index].sourceUrl}
                alt={images[index].altText || productName}
                fill
                className="object-contain"
                sizes="100vw"
                quality={90}
                priority
              />
            </div>
          )
        )}

        {total > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="הקודם"
              className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/25 text-white flex items-center justify-center"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="הבא"
              className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/25 text-white flex items-center justify-center"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          </>
        )}
      </div>

      {/* Thumbnail strip */}
      {total > 1 && (
        <div className="flex flex-row-reverse gap-2 overflow-x-auto px-3 py-3 justify-start md:justify-center scrollbar-hide">
          {images.map((img, i) => (
            <button
              key={`lb-thumb-${i}`}
              type="button"
              onClick={() => onIndexChange(i)}
              className={`relative aspect-square w-14 md:w-16 flex-shrink-0 rounded-lg overflow-hidden transition-all ${
                index === i ? 'ring-2 ring-white' : 'opacity-60 hover:opacity-100'
              }`}
              aria-label={`תמונה ${i + 1}`}
            >
              {img.sourceUrl && (
                <Image
                  src={img.sourceUrl}
                  alt={img.altText || `תמונה ${i + 1}`}
                  fill
                  className="object-cover"
                  sizes="64px"
                  quality={60}
                />
              )}
            </button>
          ))}
          {hasVideo && (
            <button
              type="button"
              onClick={() => onIndexChange(images.length)}
              className={`relative aspect-square w-14 md:w-16 flex-shrink-0 rounded-lg overflow-hidden transition-all ${
                isVideoSlide ? 'ring-2 ring-white' : 'opacity-60 hover:opacity-100'
              }`}
              aria-label="סרטון"
            >
              {video?.thumbnail || video?.youtubeId ? (
                <Image
                  src={
                    fixMediaUrl(video.thumbnail) ||
                    (video.youtubeId ? `https://img.youtube.com/vi/${video.youtubeId}/hqdefault.jpg` : '')
                  }
                  alt="סרטון"
                  fill
                  className="object-cover"
                  sizes="64px"
                  quality={60}
                />
              ) : (
                <span className="absolute inset-0 bg-gray-700" />
              )}
              <span className="absolute inset-0 flex items-center justify-center bg-black/30">
                <span className="w-6 h-6 rounded-full bg-white flex items-center justify-center">
                  <span className="w-0 h-0 border-y-[5px] border-y-transparent border-r-[8px] border-r-black ml-[-1px]" />
                </span>
              </span>
            </button>
          )}
        </div>
      )}
    </div>,
    document.body
  );
}
