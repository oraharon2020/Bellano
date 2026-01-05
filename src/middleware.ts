import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  
  // Base URL for redirects - always use www
  const baseUrl = 'https://www.bellano.co.il';

  // Handle old WordPress category URLs with query parameters
  // /product-category/X?orderby=Y → https://www.bellano.co.il/category/X (clean, single redirect)
  if (pathname.startsWith('/product-category/')) {
    const newPathname = pathname.replace('/product-category/', '/category/');
    
    // Build clean URL without sorting/filtering params (prevents duplicate content)
    const cleanUrl = new URL(newPathname, baseUrl);
    
    // Only keep pagination if present
    if (searchParams.has('page')) {
      cleanUrl.searchParams.set('page', searchParams.get('page')!);
    }
    
    return NextResponse.redirect(cleanUrl, 308); // 308 Permanent Redirect
  }

  // Handle URLs with orderby/filter parameters on category pages
  // /category/X?orderby=Y → /category/X
  if (pathname.startsWith('/category/')) {
    const hasOrderby = searchParams.has('orderby');
    const hasOrder = searchParams.has('order');
    const hasFilter = searchParams.has('filter_color') || 
                      searchParams.has('min_price') || 
                      searchParams.has('max_price');
    
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
    // Match product-category paths
    '/product-category/:path*',
    // Match category paths with query strings
    '/category/:path*',
  ],
};
