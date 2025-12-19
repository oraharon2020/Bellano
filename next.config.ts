import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Redirects from old WordPress URLs to new Next.js URLs
  async redirects() {
    return [
      // Category pages: /product-category/X → /category/X
      {
        source: '/product-category/:slug*',
        destination: '/category/:slug*',
        permanent: true,
      },
      // Shop page
      {
        source: '/shop',
        destination: '/categories',
        permanent: true,
      },
      // Cart pages
      {
        source: '/cart',
        destination: '/checkout',
        permanent: true,
      },
      {
        source: '/cart-2',
        destination: '/checkout',
        permanent: true,
      },
      // Checkout
      {
        source: '/checkout-2',
        destination: '/checkout',
        permanent: true,
      },
      // Account pages (redirect to homepage for now)
      {
        source: '/my-account',
        destination: '/',
        permanent: false,
      },
      {
        source: '/dashboard',
        destination: '/',
        permanent: false,
      },
      {
        source: '/my-orders',
        destination: '/',
        permanent: false,
      },
      {
        source: '/order-tracking',
        destination: '/',
        permanent: false,
      },
      // About page
      {
        source: '/about-us',
        destination: '/page/about-us',
        permanent: true,
      },
      {
        source: '/about',
        destination: '/page/about-us',
        permanent: true,
      },
      // Policies
      {
        source: '/refund_returns-2',
        destination: '/faq',
        permanent: true,
      },
      {
        source: '/privacy-policy-2',
        destination: '/page/privacy-policy',
        permanent: true,
      },
      // Hebrew pages
      {
        source: '/%D7%A8%D7%94%D7%99%D7%98-%D7%91%D7%94%D7%AA%D7%90%D7%9E%D7%94-%D7%90%D7%99%D7%A9%D7%99%D7%AA',
        destination: '/faq',
        permanent: true,
      },
      // Site map
      {
        source: '/site-map',
        destination: '/sitemap.xml',
        permanent: true,
      },
      // Blog (if not exists, redirect to home)
      {
        source: '/blog',
        destination: '/',
        permanent: false,
      },
      // Partner page
      {
        source: '/partner',
        destination: '/',
        permanent: false,
      },
      // New home page redirect
      {
        source: '/new-home-page',
        destination: '/',
        permanent: true,
      },
      // Trailing slashes
      {
        source: '/:path+/',
        destination: '/:path+',
        permanent: true,
      },
    ];
  },

  // Image optimization
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'bellano.co.il',
        pathname: '/wp-content/**',
      },
      {
        protocol: 'https',
        hostname: 'i0.wp.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'i1.wp.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'i2.wp.com',
        pathname: '/**',
      },
    ],
    // Use modern formats
    formats: ['image/avif', 'image/webp'],
    // Minimize image sizes
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
  },
  
  // Performance optimizations
  compress: true,
  poweredByHeader: false,
  
  // Optimize production builds
  productionBrowserSourceMaps: false,
  
  // Headers for caching
  async headers() {
    return [
      {
        source: '/:all*(svg|jpg|jpeg|png|webp|avif|ico|css|js)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
        ],
      },
      // Preconnect to external domains for faster loading
      {
        source: '/',
        headers: [
          {
            key: 'Link',
            value: '<https://bellano.co.il>; rel=preconnect, <https://i0.wp.com>; rel=preconnect, <https://fonts.googleapis.com>; rel=preconnect',
          },
        ],
      },
    ];
  },
  
  // Experimental optimizations
  experimental: {
    // Optimize package imports
    optimizePackageImports: ['lucide-react', '@radix-ui/react-dialog', '@radix-ui/react-popover'],
    // Optimize CSS loading
    optimizeCss: true,
  },
};

export default nextConfig;
