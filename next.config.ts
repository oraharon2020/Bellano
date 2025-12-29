import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Redirects from old WordPress URLs to new Next.js URLs
  async redirects() {
    return [
      // WordPress Admin - redirect to admin subdomain
      {
        source: '/wp-admin/:path*',
        destination: 'https://admin.bellano.co.il/wp-admin/:path*',
        permanent: false,
      },
      {
        source: '/wp-login.php',
        destination: 'https://admin.bellano.co.il/wp-login.php',
        permanent: false,
      },
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
      // About page (old URL redirects to clean URL)
      {
        source: '/about-us',
        destination: '/about',
        permanent: true,
      },
      // Policies (old URLs redirect to clean URLs)
      {
        source: '/refund_returns-2',
        destination: '/faq',
        permanent: true,
      },
      {
        source: '/privacy-policy-2',
        destination: '/privacy-policy',
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

  // Rewrites - clean URLs that load from /page/[slug]
  async rewrites() {
    return [
      // About page - /about loads content from /page/about-us
      {
        source: '/about',
        destination: '/page/about-us',
      },
      // Privacy policy
      {
        source: '/privacy-policy',
        destination: '/page/privacy-policy',
      },
      // Terms
      {
        source: '/terms',
        destination: '/page/privacy-policy',
      },
    ];
  },

  // Image optimization
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'admin.bellano.co.il',
        pathname: '/wp-content/**',
      },
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
      // CRITICAL: Allow iframe embedding for Meshulam payment callbacks
      {
        source: '/api/checkout/meshulam-callback',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'ALLOWALL',
          },
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'self' https://*.meshulam.co.il https://secure.meshulam.co.il https://sandbox.meshulam.co.il",
          },
        ],
      },
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
    optimizePackageImports: ['lucide-react', '@radix-ui/react-dialog', '@radix-ui/react-popover', 'zustand'],
    // Optimize CSS loading - critical CSS inlining
    optimizeCss: true,
    // Use modern output for smaller bundles
    webpackMemoryOptimizations: true,
  },
  
  // Turbopack for faster dev builds (Next.js 15+)
  // turbopack: {},
};

export default nextConfig;
