// Promo Popup Configuration
// Edit this file to change the popup content

export const promoPopupConfig = {
  // Toggle popup on/off
  enabled: true,
  
  // Show popup only once per session (uses sessionStorage)
  // Set to false to show on every page load
  showOncePerSession: true,
  
  // Delay before showing popup (in milliseconds)
  delay: 3000,
  
  // Popup content
  content: {
    // Small badge at top
    badge: 'מבצע מיוחד',
    
    // Hebrew headline
    headline: 'חג חנוכה שמח 🕎',
    
    // English text
    englishText: 'Happy Hanukkah',
    
    // Discount display
    discountNumber: '7%',
    discountText: 'הנחה על כל האתר',
    
    // Coupon section
    couponLabel: 'קוד קופון',
    couponCode: 'Bellano7',
    copyButtonText: 'העתק',
    copiedText: 'הועתק!',
    
    // CTA button
    ctaText: 'לקנייה עכשיו',
    ctaLink: '/categories',
    
    // Footer note
    footerNote: 'המבצע בתוקף עד סוף החג',
  },
};
