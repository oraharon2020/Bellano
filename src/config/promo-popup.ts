// Promo Popup Configuration
// Edit this file to change the popup content

export const promoPopupConfig = {
  // Toggle popup on/off
  enabled: true,
  
  // Show popup only once per session (uses sessionStorage)
  // Set to false to show on every page load
  showOncePerSession: true,
  
  // Delay before showing popup (in milliseconds)
  // Higher delay so it doesn't pop the moment the site opens
  delay: 9000,
  
  // Popup content
  content: {
    // Small badge at top
    badge: 'סאמר סייל',

    // Hebrew headline
    headline: 'מבצע קיץ בבלאנו ☀️',

    // English text
    englishText: 'SUMMER SALE',

    // Discount display
    discountNumber: '15%',
    discountText: 'הנחה על כל האתר',

    // Coupon section
    couponLabel: 'קוד קופון',
    couponCode: 'SUMMER15',
    copyButtonText: 'העתק',
    copiedText: 'הועתק!',

    // CTA button
    ctaText: 'לקנייה עכשיו',
    ctaLink: '/categories',

    // Footer note
    footerNote: 'קיץ מושלם מתחיל בבית 🏡',
  },
};
