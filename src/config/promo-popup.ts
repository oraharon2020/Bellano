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
    badge: 'מבצע חורף',

    // Hebrew headline
    headline: 'נכנסים לחורף ❄️',

    // English text
    englishText: 'WINTER SALE',

    // Discount display — WINTER15 is limited in WooCommerce to the dresser (147) and
    // bedside-tables (151) categories and is individual-use, so keep this text in step
    // with the coupon if either changes.
    discountNumber: '15',
    discountText: 'הנחה על קומודות ושידות צד מיטה',

    // Coupon section
    couponLabel: 'קוד קופון',
    couponCode: 'WINTER15',
    copyButtonText: 'העתק',
    copiedText: 'הועתק!',

    // CTA button
    ctaText: 'לקנייה עכשיו',
    ctaLink: '/categories',

    // Footer note
    footerNote: 'חורף חם מתחיל בבית 🏡',
  },
};
