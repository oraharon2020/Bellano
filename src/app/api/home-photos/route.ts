import { NextRequest, NextResponse } from 'next/server';
import { siteConfig } from '@/config/site';

const WP_URL = process.env.NEXT_PUBLIC_WORDPRESS_URL || siteConfig.wordpressUrl;

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Same-origin proxy for the admin-only home-photos gallery. Both read and write
// require an admin token (verified in WordPress); this only forwards.
export async function GET(request: NextRequest) {
  const productId = Number(request.nextUrl.searchParams.get('productId')) || 0;
  const token = request.headers.get('x-admin-token') || '';
  if (!productId || !token) {
    return NextResponse.json({ success: false, photos: [] }, { status: 400 });
  }
  try {
    const res = await fetch(
      `${WP_URL}/wp-json/bellano/v1/home-photos/${productId}?token=${encodeURIComponent(token)}&_=${Date.now()}`,
      { cache: 'no-store' }
    );
    const data = await res.json();
    return NextResponse.json(data, { status: res.status, headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ success: false, photos: [] });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const productId = Number(body?.productId) || 0;
    const adminToken = typeof body?.adminToken === 'string' ? body.adminToken : '';
    const photos = Array.isArray(body?.photos) ? body.photos : [];
    if (!productId || !adminToken) {
      return NextResponse.json({ success: false, message: 'missing data' }, { status: 400 });
    }
    const res = await fetch(`${WP_URL}/wp-json/bellano/v1/home-photos/${productId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: adminToken, photos }),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ success: false, message: 'server error' }, { status: 500 });
  }
}
