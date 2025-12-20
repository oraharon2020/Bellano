/**
 * Site Configuration
 * ==================
 * כל הפרטים הספציפיים לאתר מרוכזים כאן.
 * לשכפול לאתר חדש - שנה רק את הקובץ הזה!
 */

export const siteConfig = {
  // Basic Info
  name: 'בלאנו',
  tagline: 'רהיטי מעצבים',
  fullName: 'בלאנו - רהיטי מעצבים',
  description: 'מבחר רחב של רהיטים איכותיים: מזנונים, שולחנות סלון, קומודות, כורסאות, מיטות ועוד. משלוח חינם עד הבית!',
  shortDescription: 'מבחר רחב של רהיטים איכותיים. משלוח חינם עד הבית!',
  
  // URLs
  url: 'https://www.bellano.co.il',
  wordpressUrl: process.env.NEXT_PUBLIC_WORDPRESS_URL || 'https://admin.bellano.co.il',
  vercelUrl: 'https://bellano.vercel.app',
  
  // ============================================================
  // NAVIGATION - תפריט הניווט
  // ============================================================
  navigation: {
    // תפריט ראשי - מחשב (מוצג ב-Header)
    main: [
      { name: 'דף הבית', href: '/' },
      { name: 'SALE', slug: 'sale', highlight: true },
      {
        name: 'סלון',
        href: '/categories',
        children: [
          { name: 'מזנונים לסלון', slug: 'living-room-sideboards' },
          { name: 'שולחנות סלון', slug: 'living-room-tables' },
          { name: 'כורסאות לסלון', slug: 'designed-armchairs' },
          { name: 'ספריות', slug: 'libraries' },
        ],
      },
      {
        name: 'חדר שינה',
        href: '/categories',
        children: [
          { name: 'מיטות', slug: 'beds' },
          { name: 'קומודות', slug: 'dresser' },
          { name: 'שידות לילה', slug: 'bedside-tables' },
        ],
      },
      {
        name: 'פינת אוכל',
        href: '/categories',
        children: [
          { name: 'פינות אוכל', slug: 'dining' },
          { name: 'כיסאות לפינת אוכל', slug: 'dining-room-chairs' },
          { name: 'שולחנות בר', slug: 'bar-tables' },
        ],
      },
      {
        name: 'כניסה ומסדרון',
        href: '/categories',
        children: [
          { name: 'קונסולות', slug: 'consoles' },
          { name: 'מראות', slug: 'mirrors' },
        ],
      },
    ],
    
    // קישורים מהירים (ללא dropdown)
    quickLinks: [
      { name: 'מזנונים', slug: 'living-room-sideboards' },
      { name: 'שולחנות סלון', slug: 'living-room-tables' },
      { name: 'קומודות', slug: 'dresser' },
      { name: 'קונסולות', slug: 'consoles' },
      { name: 'שידות לילה', slug: 'bedside-tables' },
      { name: 'מיטות', slug: 'beds' },
      { name: 'כורסאות', slug: 'designed-armchairs' },
    ],
    
    // דפי מידע
    info: [
      { name: 'בלוג', href: '/blog' },
      { name: 'אודותינו', href: '/page/about-us' },
      { name: 'צרו קשר', href: '/contact' },
      { name: 'שאלות נפוצות', href: '/faq' },
      { name: 'הצהרת נגישות', href: '/accessibility' },
    ],
  },

  // Contact
  email: 'info@bellano.co.il',
  phone: '054-9942466',
  phoneClean: '0549942466', // Without dashes for tel: links
  whatsapp: '972549942466', // International format for WhatsApp
  
  // Social Media
  social: {
    instagram: 'https://www.instagram.com/bellano.decor/',
    instagramHandle: 'bellano.decor',
    facebook: 'https://www.facebook.com/bellano.decor',
    facebookHandle: 'bellano.decor',
  },
  
  // SEO Keywords
  keywords: [
    'רהיטים',
    'מזנונים',
    'שולחנות סלון',
    'קומודות',
    'כורסאות',
    'מיטות',
    'רהיטי מעצבים',
    'בלאנו',
    'ריהוט לבית',
    'ריהוט מעוצב',
    'רהיטים אונליין',
  ],
  
  // Images/Logos
  logo: {
    dark: '/images/bellano logo.avif', // Black logo on transparent
    light: '/images/bellano-logo-white.png', // White logo for dark backgrounds
    square: '/images/bellano-logo-square.webp',
    wordpressUrl: 'https://bellano.co.il/wp-content/uploads/2024/06/Bellano-שחור-על-רקע-שקוף.png',
  },
  favicon: {
    ico32: 'https://i0.wp.com/bellano.co.il/wp-content/uploads/2024/06/cropped-Bellano-%D7%A9%D7%97%D7%95%D7%A8-%D7%A2%D7%9C-%D7%A8%D7%A7%D7%A2-%D7%A9%D7%A7%D7%95%D7%A3-1.png?fit=32%2C32&ssl=1',
    ico192: 'https://i0.wp.com/bellano.co.il/wp-content/uploads/2024/06/cropped-Bellano-%D7%A9%D7%97%D7%95%D7%A8-%D7%A2%D7%9C-%D7%A8%D7%A7%D7%A2-%D7%A9%D7%A7%D7%95%D7%A3-1.png?fit=192%2C192&ssl=1',
    appleTouchIcon: 'https://i0.wp.com/bellano.co.il/wp-content/uploads/2024/06/cropped-Bellano-%D7%A9%D7%97%D7%95%D7%A8-%D7%A2%D7%9C-%D7%A8%D7%A7%D7%A2-%D7%A9%D7%A7%D7%95%D7%A3-1.png?fit=180%2C180&ssl=1',
  },
  ogImage: '/images/bellano%20logo.avif',
  
  // Analytics & Tracking
  analytics: {
    googleTagManager: 'GT-WBL97X64',
    googleAds: 'AW-16598610854',
    googleAdsConversionLabel: '8F3sCJ7tmrwZEKbn6uo9', // Purchase conversion
    googleAdsAddToCartLabel: 'KtOHCIW4mdQbEKbn6uo9', // Add to cart conversion
    googleVerification: 'MFPhXQELpvk-2gH-jHTP0R4LTOxhJxrH-DVa8l6Hqis',
    facebookPixel: '421335350861171',
    facebookDomainVerification: 'v0s7x4i0ko65qjr2nczfx0yoshknu0',
  },
  
  // Business Info (for JSON-LD)
  business: {
    type: 'FurnitureStore',
    priceRange: '₪₪₪',
    address: {
      street: '',
      city: 'ישראל',
      region: '',
      postalCode: '',
      country: 'IL',
    },
    geo: {
      latitude: 32.0853,
      longitude: 34.7818,
    },
    openingHours: [
      'Su-Th 09:00-18:00',
      'Fr 09:00-14:00',
    ],
  },
  
  // WooCommerce API (these should match .env.local)
  woocommerce: {
    consumerKey: process.env.WOOCOMMERCE_CONSUMER_KEY || '',
    consumerSecret: process.env.WOOCOMMERCE_CONSUMER_SECRET || '',
  },
  
  // Payment Gateway - Meshulam
  // Note: Page codes are fetched from WordPress, these are fallbacks
  meshulam: {
    apiKey: process.env.MESHULAM_API_KEY || 'ae67b1668109',
    sandboxApiKey: process.env.MESHULAM_SANDBOX_API_KEY || '305a9a777e42',
    isSandbox: process.env.MESHULAM_SANDBOX === 'true',
    // Default page codes (will be overridden by WordPress settings)
    pageCodes: {
      creditCard: process.env.MESHULAM_PAGECODE_CREDIT || '81e04dc34850',
      bit: process.env.MESHULAM_PAGECODE_BIT || '',
      applePay: process.env.MESHULAM_PAGECODE_APPLE || '',
      googlePay: process.env.MESHULAM_PAGECODE_GOOGLE || '',
    },
  },
  
  // Prefix for localStorage, cookies, etc.
  prefix: 'bellano',
  
  // Default banner image
  defaultBannerImage: 'https://bellano.co.il/wp-content/uploads/2024/06/banner-main.jpg',
  
  // Currency
  currency: {
    code: 'ILS',
    symbol: '₪',
    locale: 'he-IL',
  },
  
  // Locale
  locale: 'he_IL',
  language: 'he',
  direction: 'rtl',
} as const;

// Helper function to get full URL
export const getFullUrl = (path: string = '') => {
  return `${siteConfig.url}${path}`;
};

// Helper function to get WordPress URL
export const getWpUrl = (path: string = '') => {
  return `${siteConfig.wordpressUrl}${path}`;
};

// Helper function to get API endpoint
export const getApiEndpoint = (endpoint: string) => {
  return `${siteConfig.wordpressUrl}/wp-json/${siteConfig.prefix}/v1/${endpoint}`;
};

// Helper function to format phone for tel: link
export const getTelLink = () => {
  return `tel:${siteConfig.phoneClean}`;
};

// Helper function to get WhatsApp link
export const getWhatsAppLink = (message?: string) => {
  const base = `https://wa.me/${siteConfig.whatsapp}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
};

export type SiteConfig = typeof siteConfig;
