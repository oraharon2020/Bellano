import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  
  // Base URL for redirects - always use www
  const baseUrl = 'https://www.bellano.co.il';

  // Block WordPress admin/login pages - return 410 Gone
  if (pathname.startsWith('/wp-login.php') || pathname.startsWith('/wp-admin')) {
    return new NextResponse(null, { status: 410 }); // 410 Gone - tells Google to remove from index
  }

  // Block RSS feeds - return 410 Gone
  if (pathname.endsWith('/feed/') || pathname.endsWith('/feed')) {
    return new NextResponse(null, { status: 410 });
  }

  // Handle old /shop/ URLs → redirect to categories
  if (pathname === '/shop' || pathname === '/shop/') {
    return NextResponse.redirect(new URL('/categories', baseUrl), 308);
  }

  // Handle /color-product/ URLs → redirect to categories (no equivalent page)
  if (pathname.startsWith('/color-product/')) {
    return NextResponse.redirect(new URL('/categories', baseUrl), 308);
  }

  // Handle /product/ URLs with add-to-cart parameter → redirect to clean product URL
  if (pathname.startsWith('/product/') && searchParams.has('add-to-cart')) {
    const cleanUrl = new URL(pathname, baseUrl);
    return NextResponse.redirect(cleanUrl, 308);
  }

  // Handle old WordPress category URLs with query parameters
  // /product-category/X?orderby=Y → https://www.bellano.co.il/category/X (clean, single redirect)
  if (pathname.startsWith('/product-category/')) {
    // Extract category slug (handle nested categories)
    const pathWithoutPrefix = pathname.replace('/product-category/', '');
    const segments = pathWithoutPrefix.split('/').filter(Boolean);
    const lastSlug = segments[segments.length - 1] || segments[0];
    
    const cleanUrl = new URL(`/category/${lastSlug}`, baseUrl);
    
    // Only keep pagination if present
    if (searchParams.has('page')) {
      cleanUrl.searchParams.set('page', searchParams.get('page')!);
    }
    
    return NextResponse.redirect(cleanUrl, 308); // 308 Permanent Redirect
  }

  // Handle URLs with orderby/filter parameters on category pages
  // /category/X?orderby=Y → /category/X
  if (pathname.startsWith('/category/')) {
    // Handle nested/hierarchical category URLs from old WooCommerce
    // /category/parent/child → /category/child
    const pathParts = pathname.split('/').filter(Boolean); // ['category', 'parent', 'child']
    
    if (pathParts.length > 2) {
      // Has nested categories - redirect to the last segment (actual category)
      const lastSlug = pathParts[pathParts.length - 1];
      const cleanUrl = new URL(`/category/${lastSlug}`, baseUrl);
      
      // Only keep pagination if present
      if (searchParams.has('page')) {
        cleanUrl.searchParams.set('page', searchParams.get('page')!);
      }
      
      return NextResponse.redirect(cleanUrl, 308);
    }
    
    const hasOrderby = searchParams.has('orderby');
    const hasOrder = searchParams.has('order');
    const hasFilter = searchParams.has('filter_color') || 
                      searchParams.has('min_price') || 
                      searchParams.has('max_price') ||
                      searchParams.has('category-view-mode') ||
                      searchParams.has('product_col_large') ||
                      searchParams.has('add-to-cart');
    
    if (hasOrderby || hasOrder || hasFilter) {
      const cleanUrl = new URL(pathname, baseUrl);
      
      // Only keep pagination if present
      if (searchParams.has('page')) {
        cleanUrl.searchParams.set('page', searchParams.get('page')!);
      }
      
      return NextResponse.redirect(cleanUrl, 308);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // WordPress legacy URLs
    '/wp-login.php',
    '/wp-admin/:path*',
    // Shop and color product pages
    '/shop/:path*',
    '/color-product/:path*',
    // Product pages with query params
    '/product/:path*',
    // Match product-category paths
    '/product-category/:path*',
    // Match category paths with query strings
    '/category/:path*',
    // RSS feeds
    '/:path*/feed',
  ],
};
    // Match category paths with query strings
    '/category/:path*',
  ],
};
