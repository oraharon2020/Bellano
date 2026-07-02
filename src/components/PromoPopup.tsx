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
        className={`fixed inset-0 bg-black/40 z-[100] transition-opacity duration-300 ${
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
          className="relative w-full max-w-[320px] bg-white overflow-hidden shadow-xl rounded-3xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Button */}
          <button
            onClick={handleClose}
            className="absolute top-4 left-4 w-7 h-7 flex items-center justify-center text-gray-300 hover:text-gray-500 transition-colors z-10"
            aria-label="סגור"
          >
            <X className="w-5 h-5" strokeWidth={1.5} />
          </button>

          {/* Content */}
          <div className="px-8 pt-12 pb-8">
            
            {/* Headline */}
            <div className="text-center mb-8">
              <p className="text-[11px] text-gray-400 uppercase tracking-[0.2em] mb-3">
                {content.englishText}
              </p>
              <h2 className="text-2xl font-light text-gray-900 tracking-wide">
                {content.headline}
              </h2>
            </div>

            {/* Discount */}
            <div className="text-center mb-8">
              <span className="text-6xl font-extralight text-gray-900 tracking-tight">
                {content.discountNumber}<span className="text-3xl">%</span>
              </span>
              <p className="text-[13px] text-gray-500 mt-2 font-light">
                {content.discountText}
              </p>
            </div>

            {/* Coupon Code */}
            <div className="mb-6">
              <button
                onClick={handleCopy}
                className="w-full group"
              >
                <div className={`border ${copied ? 'border-gray-900 bg-gray-900' : 'border-gray-200 bg-gray-50 hover:border-gray-300'} rounded-xl py-4 px-6 transition-all duration-200`}>
                  <p className="text-[10px] text-gray-400 uppercase tracking-[0.15em] mb-1">
                    {content.couponLabel}
                  </p>
                  <p className={`font-mono text-lg tracking-[0.1em] transition-colors ${copied ? 'text-white' : 'text-gray-900'}`}>
                    {copied ? '✓ הועתק' : content.couponCode}
                  </p>
                </div>
              </button>
            </div>

            {/* CTA Button */}
            <Link
              href={content.ctaLink}
              onClick={handleClose}
              className="block w-full bg-gray-900 text-white py-4 rounded-xl text-[13px] font-medium text-center hover:bg-gray-800 transition-colors tracking-wide"
            >
              {content.ctaText}
            </Link>

            {/* Footer */}
            <p className="text-gray-300 text-[10px] text-center mt-6 tracking-wide">
              {content.footerNote}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
