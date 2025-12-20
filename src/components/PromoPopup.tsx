'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import Link from 'next/link';
import { promoPopupConfig } from '@/config/promo-popup';

export default function PromoPopup() {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const { enabled, showOncePerSession, delay, content } = promoPopupConfig;

  useEffect(() => {
    if (!enabled) return;

    if (showOncePerSession) {
      const hasSeenPopup = sessionStorage.getItem('bellano_promo_popup_seen');
      if (hasSeenPopup) return;
    }

    const timer = setTimeout(() => {
      setIsOpen(true);
      if (showOncePerSession) {
        sessionStorage.setItem('bellano_promo_popup_seen', 'true');
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [enabled, showOncePerSession, delay]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
    }, 300);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content.couponCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = content.couponCode;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] transition-opacity duration-300 ${
          isClosing ? 'opacity-0' : 'opacity-100'
        }`}
        onClick={handleClose}
      />

      {/* Popup */}
      <div 
        className={`fixed inset-0 z-[101] flex items-center justify-center p-4 transition-all duration-300 ${
          isClosing ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
        }`}
      >
        <div 
          className="relative w-full max-w-[360px] bg-white overflow-hidden shadow-2xl rounded-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top Gold Accent Bar */}
          <div className="h-1 w-full bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-400" />
          
          {/* Close Button */}
          <button
            onClick={handleClose}
            className="absolute top-3 left-3 w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-full transition-colors z-10"
            aria-label="סגור"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>

          {/* Content */}
          <div className="px-6 pt-8 pb-6">
            
            {/* Menorah Icon */}
            <div className="text-center mb-4">
              <span className="text-4xl">🕎</span>
            </div>

            {/* Headlines - Centered & Clean */}
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-0.5">
                {content.headline}
              </h2>
              <p className="text-sm text-gray-400 font-light tracking-wider">
                {content.englishText}
              </p>
            </div>

            {/* Discount Box */}
            <div className="bg-gray-50 rounded-xl p-5 mb-5 text-center">
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-5xl font-black text-gray-900">7</span>
                <span className="text-3xl font-bold text-gray-900">%</span>
              </div>
              <p className="text-sm text-gray-600 mt-1">{content.discountText}</p>
            </div>

            {/* Coupon Code Section */}
            <div className="mb-5">
              <p className="text-xs text-gray-400 text-center mb-2 uppercase tracking-wider">
                {content.couponLabel}
              </p>
              <div className="flex gap-2">
                <div className="flex-1 bg-gray-900 text-white px-4 py-3 rounded-lg text-center">
                  <span className="font-mono text-lg font-bold tracking-widest">
                    {content.couponCode}
                  </span>
                </div>
                <button
                  onClick={handleCopy}
                  className={`px-5 py-3 rounded-lg text-sm font-semibold transition-all duration-200 ${
                    copied 
                      ? 'bg-green-500 text-white' 
                      : 'bg-amber-400 text-gray-900 hover:bg-amber-500'
                  }`}
                >
                  {copied ? '✓' : content.copyButtonText}
                </button>
              </div>
              {copied && (
                <p className="text-green-600 text-xs text-center mt-2 font-medium">
                  {content.copiedText}
                </p>
              )}
            </div>

            {/* CTA Button */}
            <Link
              href={content.ctaLink}
              onClick={handleClose}
              className="block w-full bg-gray-900 text-white py-3.5 rounded-lg font-semibold text-center hover:bg-gray-800 transition-colors"
            >
              {content.ctaText} ←
            </Link>

            {/* Footer Note */}
            <p className="text-gray-400 text-[11px] text-center mt-4">
              {content.footerNote}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
