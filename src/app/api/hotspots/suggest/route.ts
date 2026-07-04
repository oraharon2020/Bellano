import { NextRequest, NextResponse } from 'next/server';
import { siteConfig } from '@/config/site';

const WP_URL = process.env.NEXT_PUBLIC_WORDPRESS_URL || siteConfig.wordpressUrl;

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Same-origin proxy for AI hotspot suggestions. WordPress authorises via the
// admin token and runs the vision model; this only forwards the request.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const productId = Number(body?.productId) || 0;
    const adminToken = typeof body?.adminToken === 'string' ? body.adminToken : '';
    const image = typeof body?.image === 'string' ? body.image : '';
    const idx = Number(body?.idx) || 0;

    if (!productId || !adminToken) {
      return NextResponse.json({ success: false, message: 'missing data' }, { status: 400 });
    }

    const res = await fetch(`${WP_URL}/wp-json/bellano/v1/hotspots/${productId}/suggest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: adminToken, image, idx }),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ success: false, message: 'server error' }, { status: 500 });
  }
}
