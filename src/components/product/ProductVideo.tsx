'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Play, Pause, X, Volume2, VolumeX } from 'lucide-react';
import { fixMediaUrl } from '@/config/site';

interface ProductVideoProps {
  video: {
    url: string;
    thumbnail: string | null;
    type: 'file' | 'youtube';
    youtubeId: string | null;
  };
  productName: string;
}

export function ProductVideo({ video, productName }: ProductVideoProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  const videoUrl = fixMediaUrl(video.url);
  const thumbnailSrc = fixMediaUrl(video.thumbnail);
  const thumbnailUrl =
    thumbnailSrc ||
    (video.youtubeId ? `https://img.youtube.com/vi/${video.youtubeId}/maxresdefault.jpg` : '');

  const isYouTube = video.type === 'youtube' && !!video.youtubeId;

  const open = useCallback(() => {
    setProgress(0);
    setIsPaused(false);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setIsPaused(false);
    setProgress(0);
  }, []);

  // Lock body scroll + close on Escape while the story is open.
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [isOpen, close]);

  // Kick off playback when the story opens.
  useEffect(() => {
    if (isOpen && !isYouTube) {
      const v = videoRef.current;
      if (v) {
        v.currentTime = 0;
        v.play().catch(() => setIsPaused(true));
      }
    }
  }, [isOpen, isYouTube]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play().catch(() => {});
      setIsPaused(false);
    } else {
      v.pause();
      setIsPaused(true);
    }
  };

  const onTimeUpdate = () => {
    const v = videoRef.current;
    if (v && v.duration) setProgress((v.currentTime / v.duration) * 100);
  };

  return (
    <>
      {/* ── Thumbnail card ─────────────────────────────────────────── */}
      <button
        type="button"
        onClick={open}
        className="group relative block w-full aspect-[4/3] rounded-2xl overflow-hidden bg-gray-100 shadow-sm ring-1 ring-black/5 cursor-pointer"
        aria-label={`נגן סרטון של ${productName}`}
      >
        {thumbnailUrl ? (
          <Image
            src={thumbnailUrl}
            alt={`סרטון ${productName}`}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, 400px"
            loading="lazy"
            quality={75}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-gray-200 to-gray-300" />
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-black/20 transition-colors group-hover:from-black/60" />

        {/* Play button */}
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="relative flex items-center justify-center">
            <span className="absolute inline-flex h-16 w-16 md:h-20 md:w-20 rounded-full bg-white/40 animate-ping opacity-60" />
            <span className="relative w-16 h-16 md:w-20 md:h-20 bg-white rounded-full flex items-center justify-center shadow-xl transition-transform duration-300 group-hover:scale-110">
              <Play className="w-6 h-6 md:w-8 md:h-8 text-black ml-[2px]" fill="currentColor" />
            </span>
          </span>
        </span>

        {/* Label */}
        <span className="absolute bottom-3 right-3 inline-flex items-center gap-1 bg-black/70 backdrop-blur-sm text-white text-xs font-medium px-2.5 py-1 rounded-full">
          🎬 צפייה בסרטון
        </span>
      </button>

      {/* ── Full-screen story ──────────────────────────────────────── */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95"
          onClick={(e) => {
            if (e.target === e.currentTarget) close();
          }}
        >
          {/* Ambient blurred backdrop */}
          {thumbnailUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={thumbnailUrl}
              alt=""
              aria-hidden
              className="absolute inset-0 h-full w-full object-cover scale-110 blur-2xl opacity-30 pointer-events-none"
            />
          )}

          {/* Story frame (phone-like on desktop, edge-to-edge on mobile) */}
          <div className="relative h-full w-full sm:h-[92vh] sm:w-auto sm:aspect-[9/16] sm:max-w-[460px] sm:rounded-[28px] overflow-hidden bg-black shadow-2xl sm:ring-1 sm:ring-white/10">
            {/* In-frame blurred fill so letterboxed videos still look premium */}
            {thumbnailUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={thumbnailUrl}
                alt=""
                aria-hidden
                className="absolute inset-0 h-full w-full object-cover scale-110 blur-xl opacity-50 pointer-events-none"
              />
            )}

            {/* The media */}
            {isYouTube ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <iframe
                  src={`https://www.youtube.com/embed/${video.youtubeId}?autoplay=1&rel=0&playsinline=1`}
                  title={productName}
                  className="w-full aspect-video"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            ) : (
              <video
                ref={videoRef}
                src={videoUrl}
                autoPlay
                muted={isMuted}
                playsInline
                preload="auto"
                onTimeUpdate={onTimeUpdate}
                onClick={togglePlay}
                onEnded={() => setIsPaused(true)}
                className="absolute inset-0 h-full w-full object-contain"
              />
            )}

            {/* Top / bottom gradients for legibility */}
            <div className="absolute top-0 inset-x-0 h-28 bg-gradient-to-b from-black/70 to-transparent pointer-events-none" />
            <div className="absolute bottom-0 inset-x-0 h-28 bg-gradient-to-t from-black/70 to-transparent pointer-events-none" />

            {/* Story progress bar (file videos) */}
            {!isYouTube && (
              <div className="absolute top-3 inset-x-3 z-20">
                <div className="h-1 w-full rounded-full bg-white/25 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-white transition-[width] duration-150 ease-linear"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Header: product name + close */}
            <div className="absolute top-6 inset-x-3 z-30 flex items-center justify-between gap-3">
              <div className="min-w-0 flex items-center gap-2">
                <span className="text-lg">🎬</span>
                <span className="truncate text-white text-sm font-semibold drop-shadow">
                  {productName}
                </span>
              </div>
              <button
                onClick={close}
                className="shrink-0 w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur flex items-center justify-center text-white transition-colors"
                aria-label="סגור"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Center play affordance when paused (file videos) */}
            {!isYouTube && isPaused && (
              <button
                onClick={togglePlay}
                className="absolute inset-0 z-20 flex items-center justify-center"
                aria-label="נגן"
              >
                <span className="w-20 h-20 rounded-full bg-white/90 flex items-center justify-center shadow-xl">
                  <Play className="w-9 h-9 text-black ml-[3px]" fill="currentColor" />
                </span>
              </button>
            )}

            {/* Bottom controls (file videos) */}
            {!isYouTube && (
              <div className="absolute bottom-5 inset-x-4 z-30 flex items-center justify-between">
                <button
                  onClick={togglePlay}
                  className="w-11 h-11 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur flex items-center justify-center text-white transition-colors"
                  aria-label={isPaused ? 'נגן' : 'השהה'}
                >
                  {isPaused ? (
                    <Play className="w-5 h-5 ml-[2px]" fill="currentColor" />
                  ) : (
                    <Pause className="w-5 h-5" fill="currentColor" />
                  )}
                </button>

                <button
                  onClick={() => setIsMuted((m) => !m)}
                  className="inline-flex items-center gap-2 h-11 px-4 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur text-white text-sm font-medium transition-colors"
                  aria-label={isMuted ? 'הפעל צליל' : 'השתק'}
                >
                  {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                  {isMuted ? 'הפעל צליל' : 'השתק'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
