'use client';

import { useState } from 'react';
import { Phone, MessageCircle, X, Accessibility, MessageSquare } from 'lucide-react';

export function FloatingButtons() {
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [isAccessibilityOpen, setIsAccessibilityOpen] = useState(false);

  // Accessibility settings
  const [fontSize, setFontSize] = useState(100);
  const [highContrast, setHighContrast] = useState(false);
  const [grayscale, setGrayscale] = useState(false);
  const [highlightLinks, setHighlightLinks] = useState(false);

  const applyAccessibility = () => {
    document.documentElement.style.fontSize = `${fontSize}%`;
    
    // Apply high contrast to main content only, not floating buttons
    const mainContent = document.querySelector('main');
    const header = document.querySelector('header');
    const footer = document.querySelector('footer');
    
    if (highContrast) {
      mainContent?.classList.add('high-contrast');
      header?.classList.add('high-contrast');
      footer?.classList.add('high-contrast');
    } else {
      mainContent?.classList.remove('high-contrast');
      header?.classList.remove('high-contrast');
      footer?.classList.remove('high-contrast');
    }
    
    // Apply grayscale to main content only
    if (grayscale) {
      if (mainContent) (mainContent as HTMLElement).style.filter = 'grayscale(100%)';
      if (header) (header as HTMLElement).style.filter = 'grayscale(100%)';
      if (footer) (footer as HTMLElement).style.filter = 'grayscale(100%)';
    } else {
      if (mainContent) (mainContent as HTMLElement).style.filter = '';
      if (header) (header as HTMLElement).style.filter = '';
      if (footer) (footer as HTMLElement).style.filter = '';
    }

    if (highlightLinks) {
      document.body.classList.add('highlight-links');
    } else {
      document.body.classList.remove('highlight-links');
    }
  };

  const resetAccessibility = () => {
    setFontSize(100);
    setHighContrast(false);
    setGrayscale(false);
    setHighlightLinks(false);
    document.documentElement.style.fontSize = '100%';
    
    // Reset main content
    const mainContent = document.querySelector('main');
    const header = document.querySelector('header');
    const footer = document.querySelector('footer');
    
    mainContent?.classList.remove('high-contrast');
    header?.classList.remove('high-contrast');
    footer?.classList.remove('high-contrast');
    
    if (mainContent) (mainContent as HTMLElement).style.filter = '';
    if (header) (header as HTMLElement).style.filter = '';
    if (footer) (footer as HTMLElement).style.filter = '';
    
    document.body.classList.remove('highlight-links');
  };

  return (
    <>
      {/* Contact Button - Right Side */}
      <div className="fixed bottom-6 right-6 z-50 floating-buttons-container">
        {/* Contact Menu */}
        <div className={`absolute bottom-16 right-0 mb-2 transition-all duration-300 ${isContactOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
          <div className="bg-white rounded-2xl shadow-xl p-4 min-w-[200px] border">
            <h3 className="font-semibold text-gray-900 mb-3 text-center">צרו קשר</h3>
            
            {/* WhatsApp */}
            <a
              href="https://wa.me/97235566696"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors group"
            >
              <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                <MessageCircle className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="font-medium text-gray-900">וואטסאפ</p>
                <p className="text-xs text-gray-500">מענה מהיר</p>
              </div>
            </a>

            {/* Phone */}
            <a
              href="tel:03-5566696"
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors group mt-1"
            >
              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                <Phone className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="font-medium text-gray-900">03-5566696</p>
                <p className="text-xs text-gray-500">א-ה 10:00-17:00</p>
              </div>
            </a>
          </div>
        </div>

        {/* Main Contact Button */}
        <button
          onClick={() => setIsContactOpen(!isContactOpen)}
          className={`w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 ${
            isContactOpen 
              ? 'bg-gray-800 rotate-0' 
              : 'bg-green-500 hover:bg-green-600'
          }`}
          aria-label="צור קשר"
        >
          {isContactOpen ? (
            <X className="h-6 w-6 text-white" />
          ) : (
            <MessageSquare className="h-6 w-6 text-white" />
          )}
        </button>
      </div>

      {/* Accessibility Button - Left Side */}
      <div className="fixed bottom-6 left-6 z-50 floating-buttons-container">
        {/* Accessibility Menu */}
        <div className={`absolute bottom-16 left-0 mb-2 transition-all duration-300 ${isAccessibilityOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
          <div className="bg-white rounded-2xl shadow-xl p-4 min-w-[280px] border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">הצהרת נגישות</h3>
              <button
                onClick={resetAccessibility}
                className="text-xs text-blue-600 hover:underline"
              >
                איפוס
              </button>
            </div>
            
            {/* Font Size */}
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">גודל טקסט</p>
              <div className="flex gap-2">
                <button
                  onClick={() => { setFontSize(Math.max(80, fontSize - 10)); applyAccessibility(); }}
                  className="flex-1 py-2 px-3 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors text-lg font-bold"
                >
                  א-
                </button>
                <button
                  onClick={() => { setFontSize(100); applyAccessibility(); }}
                  className="flex-1 py-2 px-3 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  רגיל
                </button>
                <button
                  onClick={() => { setFontSize(Math.min(150, fontSize + 10)); applyAccessibility(); }}
                  className="flex-1 py-2 px-3 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors text-lg font-bold"
                >
                  א+
                </button>
              </div>
            </div>

            {/* Toggle Options */}
            <div className="space-y-2">
              <button
                onClick={() => { setHighContrast(!highContrast); setTimeout(applyAccessibility, 0); }}
                className={`w-full py-2.5 px-4 rounded-lg text-right transition-colors flex items-center justify-between ${
                  highContrast ? 'bg-blue-500 text-white' : 'bg-gray-100 hover:bg-gray-200'
                }`}
              >
                <span>ניגודיות גבוהה</span>
                <span className="text-lg">◐</span>
              </button>

              <button
                onClick={() => { setGrayscale(!grayscale); setTimeout(applyAccessibility, 0); }}
                className={`w-full py-2.5 px-4 rounded-lg text-right transition-colors flex items-center justify-between ${
                  grayscale ? 'bg-blue-500 text-white' : 'bg-gray-100 hover:bg-gray-200'
                }`}
              >
                <span>גווני אפור</span>
                <span className="text-lg">◑</span>
              </button>

              <button
                onClick={() => { setHighlightLinks(!highlightLinks); setTimeout(applyAccessibility, 0); }}
                className={`w-full py-2.5 px-4 rounded-lg text-right transition-colors flex items-center justify-between ${
                  highlightLinks ? 'bg-blue-500 text-white' : 'bg-gray-100 hover:bg-gray-200'
                }`}
              >
                <span>הדגשת קישורים</span>
                <span className="text-lg">🔗</span>
              </button>
            </div>

            {/* Accessibility Statement Link */}
            <div className="mt-4 pt-3 border-t">
              <a 
                href="/accessibility" 
                className="text-sm text-blue-600 hover:underline block text-center"
              >
                קרא את הצהרת הנגישות המלאה
              </a>
            </div>
          </div>
        </div>

        {/* Main Accessibility Button */}
        <button
          onClick={() => setIsAccessibilityOpen(!isAccessibilityOpen)}
          className={`w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 ${
            isAccessibilityOpen 
              ? 'bg-gray-800' 
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
          aria-label="נגישות"
        >
          {isAccessibilityOpen ? (
            <X className="h-6 w-6 text-white" />
          ) : (
            <Accessibility className="h-6 w-6 text-white" />
          )}
        </button>
      </div>

      {/* Accessibility CSS (injected) */}
      <style jsx global>{`
        .high-contrast {
          filter: contrast(1.5);
        }
        .high-contrast * {
          border-color: #000 !important;
        }
        /* Exclude floating buttons from high contrast filter by moving them outside the filter context */
        .floating-buttons-container {
          isolation: isolate;
        }
        .high-contrast ~ .floating-buttons-container,
        body.high-contrast .floating-buttons-container {
          filter: none !important;
          position: fixed !important;
        }
        .highlight-links a:not(.floating-buttons-container a) {
          background-color: #ffff00 !important;
          color: #000 !important;
          text-decoration: underline !important;
          padding: 2px 4px;
        }
      `}</style>
    </>
  );
}
