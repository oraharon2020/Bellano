import { NextRequest, NextResponse } from 'next/server';
import { siteConfig } from '@/config/site';

const WP_URL = process.env.NEXT_PUBLIC_WORDPRESS_URL || siteConfig.wordpressUrl;

// Server-side proxy for saving product hotspots. Keeps the write same-origin
// (no cross-domain CORS to admin.*) — WordPress still authorises via the admin
// token, so this only forwards; it does not weaken the auth.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const productId = Number(body?.productId) || 0;
    const adminToken = typeof body?.adminToken === 'string' ? body.adminToken : '';
    const hotspots = Array.isArray(body?.hotspots) ? body.hotspots : [];

    if (!productId || !adminToken) {
      return NextResponse.json({ success: false, message: 'missing data' }, { status: 400 });
    }

    const res = await fetch(`${WP_URL}/wp-json/bellano/v1/hotspots/${productId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: adminToken, hotspots }),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ success: false, message: 'server error' }, { status: 500 });
  }
}
