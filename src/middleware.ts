import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // Handle old WordPress category URLs with query parameters
  // /product-category/X?orderby=Y → /category/X (remove orderby parameter)
  if (pathname.startsWith('/product-category/')) {
    const newPathname = pathname.replace('/product-category/', '/category/');
    
    // Remove orderby and other unnecessary parameters that cause duplicate content
    const cleanUrl = new URL(newPathname, request.url);
    
    // Only keep essential parameters if any (currently we remove all sorting params)
    // This prevents duplicate content issues in Google
    searchParams.delete('orderby');
    searchParams.delete('order');
    searchParams.delete('filter_color');
    searchParams.delete('min_price');
    searchParams.delete('max_price');
    searchParams.delete('paged'); // WordPress pagination
    
    // If there are remaining useful params, keep them (like page number for pagination)
    if (searchParams.has('page')) {
      cleanUrl.searchParams.set('page', searchParams.get('page')!);
    }
    
    return NextResponse.redirect(cleanUrl, 308); // 308 Permanent Redirect
  }

  // Handle URLs with orderby parameter on category pages
  // /category/X?orderby=Y → /category/X
  if (pathname.startsWith('/category/') && searchParams.has('orderby')) {
    const cleanUrl = new URL(pathname, request.url);
    // Remove orderby to prevent duplicate content
    return NextResponse.redirect(cleanUrl, 308);
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
