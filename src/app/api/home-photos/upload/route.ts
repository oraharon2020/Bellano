import { NextRequest, NextResponse } from 'next/server';
import { siteConfig } from '@/config/site';

const WP_URL = process.env.NEXT_PUBLIC_WORDPRESS_URL || siteConfig.wordpressUrl;

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Same-origin proxy for uploading a home photo into the WordPress media library.
// Admin token is verified server-side in WordPress; this only forwards the file.
export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const productId = Number(form.get('productId')) || 0;
    const adminToken = String(form.get('adminToken') || '');
    const file = form.get('file');

    if (!productId || !adminToken || !(file instanceof File)) {
      return NextResponse.json({ success: false, message: 'missing data' }, { status: 400 });
    }

    const forward = new FormData();
    forward.append('file', file, file.name);

    const res = await fetch(
      `${WP_URL}/wp-json/bellano/v1/home-photos/${productId}/upload?token=${encodeURIComponent(adminToken)}`,
      { method: 'POST', body: forward }
    );
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ success: false, message: 'server error' }, { status: 500 });
  }
}
