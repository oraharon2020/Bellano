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
    badge: 'מבצע סוף שנה',
    
    // Hebrew headline
    headline: 'סוף שנה בבלאנו 🎉',
    
    // English text
    englishText: 'End of Year Sale',
    
    // Discount display
    discountNumber: '7%',
    discountText: 'הנחה על כל האתר',
    
    // Coupon section
    couponLabel: 'קוד קופון',
    couponCode: 'END7',
    copyButtonText: 'העתק',
    copiedText: 'הועתק!',
    
    // CTA button
    ctaText: 'לקנייה עכשיו',
    ctaLink: '/categories',
    
    // Footer note
    footerNote: 'המבצע בתוקף עד 31.12',
  },
};
