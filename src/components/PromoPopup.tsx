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

    // Check if already shown this session
    if (showOncePerSession) {
      const hasSeenPopup = sessionStorage.getItem('bellano_promo_popup_seen');
      if (hasSeenPopup) return;
    }

    // Show popup after delay
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
      // Fallback for older browsers
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
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] transition-opacity duration-300 ${
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
          className="relative w-full max-w-sm bg-white overflow-hidden shadow-2xl rounded-3xl rounded-bl-none"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Button */}
          <button
            onClick={handleClose}
            className="absolute top-4 left-4 p-1.5 hover:bg-gray-100 rounded-full transition-colors z-10"
            aria-label="סגור"
          >
            <X className="w-5 h-5 text-gray-400 hover:text-black" />
          </button>

          {/* Content */}
          <div className="p-8 pt-12 text-center">
            {/* Badge */}
            <div className="inline-block mb-4">
              <span className="text-[10px] uppercase tracking-[0.2em] text-gray-500 border border-gray-200 px-3 py-1.5 rounded-full">
                {content.badge}
              </span>
            </div>

            {/* Headlines */}
            <h2 className="text-2xl font-bold text-black mb-1">
              {content.headline}
            </h2>
            <p className="font-english text-lg text-gray-500 font-light tracking-wide mb-8">
              {content.englishText}
            </p>

            {/* Discount */}
            <div className="mb-8">
              <div className="text-6xl font-bold text-black tracking-tight leading-none">
                {content.discountNumber}
              </div>
              <div className="text-sm text-gray-600 mt-2">
                {content.discountText}
              </div>
            </div>

            {/* Coupon Code */}
            <div className="mb-6">
              <p className="text-[10px] uppercase tracking-[0.15em] text-gray-400 mb-2">
                {content.couponLabel}
              </p>
              <div className="flex items-center justify-center gap-2">
                <div className="bg-gray-50 border border-gray-200 px-6 py-3 rounded-xl rounded-bl-none font-english text-lg tracking-[0.1em] font-medium">
                  {content.couponCode}
                </div>
                <button
                  onClick={handleCopy}
                  className={`px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                    copied 
                      ? 'bg-green-500 text-white' 
                      : 'bg-black text-white hover:bg-gray-800'
                  }`}
                >
                  {copied ? '✓' : content.copyButtonText}
                </button>
              </div>
              {copied && (
                <p className="text-green-600 text-xs mt-2">
                  {content.copiedText}
                </p>
              )}
            </div>

            {/* CTA Button */}
            <Link
              href={content.ctaLink}
              onClick={handleClose}
              className="inline-block w-full bg-black text-white py-4 px-8 rounded-xl font-medium text-sm tracking-wide hover:bg-gray-900 transition-colors"
            >
              {content.ctaText}
            </Link>

            {/* Footer Note */}
            <p className="text-gray-400 text-xs mt-4">
              {content.footerNote}
            </p>
          </div>

          {/* Bottom accent line - follows the rounded corner */}
          <div className="h-1.5 w-full bg-black rounded-b-3xl rounded-bl-none" />
        </div>
      </div>
    </>
  );
}
