'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Play, X } from 'lucide-react';

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
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Get YouTube thumbnail if no custom thumbnail
  const thumbnailUrl = video.thumbnail || 
    (video.youtubeId ? `https://img.youtube.com/vi/${video.youtubeId}/maxresdefault.jpg` : null);

  // Handle play button click
  const handlePlay = () => {
    setIsPlaying(true);
  };

  // Handle close fullscreen
  const handleClose = () => {
    setIsFullscreen(false);
    setIsPlaying(false);
  };

  // Open fullscreen video
  const handleFullscreen = () => {
    setIsFullscreen(true);
    setIsPlaying(true);
  };

  return (
    <>
      <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-gray-100 group cursor-pointer">
        {/* Thumbnail */}
        {!isPlaying && (
          <>
            {thumbnailUrl ? (
              <Image
                src={thumbnailUrl}
                alt={`סרטון ${productName}`}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 400px"
                loading="lazy"
                quality={75}
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-gray-200 to-gray-300" />
            )}
            
            {/* Dark overlay on hover */}
            <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors" />
            
            {/* Play button */}
            <button
              onClick={handleFullscreen}
              className="absolute inset-0 flex items-center justify-center"
            >
              <div className="w-16 h-16 md:w-20 md:h-20 bg-white/95 rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <Play className="w-6 h-6 md:w-8 md:h-8 text-black mr-[-2px]" fill="currentColor" />
              </div>
            </button>
            
            {/* Label */}
            <div className="absolute bottom-3 right-3 bg-black/70 text-white text-xs px-2 py-1 rounded">
              🎬 צפייה בסרטון
            </div>
          </>
        )}

        {/* Inline video (if playing inline, not fullscreen) */}
        {isPlaying && !isFullscreen && (
          <div className="absolute inset-0">
            {video.type === 'youtube' && video.youtubeId ? (
              <iframe
                src={`https://www.youtube.com/embed/${video.youtubeId}?autoplay=1&rel=0`}
                title={productName}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <video
                src={video.url}
                autoPlay
                controls
                className="w-full h-full object-contain bg-black"
              />
            )}
          </div>
        )}
      </div>

      {/* Fullscreen modal */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center">
          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute top-4 left-4 z-50 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Video container */}
          <div className="w-full max-w-5xl mx-4 aspect-video">
            {video.type === 'youtube' && video.youtubeId ? (
              <iframe
                src={`https://www.youtube.com/embed/${video.youtubeId}?autoplay=1&rel=0`}
                title={productName}
                className="w-full h-full rounded-lg"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <video
                src={video.url}
                autoPlay
                controls
                className="w-full h-full object-contain rounded-lg"
              />
            )}
          </div>
        </div>
      )}
    </>
  );
}
