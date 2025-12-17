// Banner Configuration
// Easy to update - just change the values here!

export interface Banner {
  id: string;
  image: string;           // URL of the banner image
  mobileImage?: string;    // Optional different image for mobile
  title?: string;          // Optional overlay title
  subtitle?: string;       // Optional overlay subtitle
  buttonText?: string;     // Optional button text
  buttonLink?: string;     // Optional button link
  backgroundColor?: string; // Fallback background color
}

export const banners: Banner[] = [
  {
    id: 'banner-1',
    image: 'https://bellano.co.il/wp-content/uploads/2024/06/banner-main.jpg',
    mobileImage: 'https://bellano.co.il/wp-content/uploads/2024/06/banner-main-mobile.jpg',
    title: 'רהיטי מעצבים',
    subtitle: 'עיצוב איטלקי | איכות ללא פשרות',
    buttonText: 'לקולקציה',
    buttonLink: '/categories',
    backgroundColor: '#f5f5f5',
  },
  // Add more banners here for a slider:
  // {
  //   id: 'banner-2',
  //   image: 'https://bellano.co.il/wp-content/uploads/2024/06/banner-sale.jpg',
  //   title: 'מבצע סוף עונה',
  //   subtitle: 'עד 50% הנחה על פריטים נבחרים',
  //   buttonText: 'למבצעים',
  //   buttonLink: '/category/sale',
  // },
];

// Settings
export const bannerSettings = {
  autoPlay: true,           // Auto rotate banners
  autoPlayInterval: 5000,   // Time between slides (ms)
  showDots: true,           // Show navigation dots
  showArrows: true,         // Show prev/next arrows
  height: {
    desktop: '500px',       // Banner height on desktop
    mobile: '300px',        // Banner height on mobile
  },
};
