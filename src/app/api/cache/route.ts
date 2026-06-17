import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';
import { siteConfig } from '@/config/site';

const WP_URL = process.env.NEXT_PUBLIC_WORDPRESS_URL || siteConfig.wordpressUrl;

async function verifyAdminToken(token: string): Promise<boolean> {
  try {
    const res = await fetch(`${WP_URL}/wp-json/bellano/v1/verify-admin-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
      cache: 'no-store',
    });
    if (!res.ok) return false;
    const data = await res.json();
    return !!data?.valid;
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  const adminToken = request.headers.get('x-admin-token');

  if (!adminToken) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  const isValid = await verifyAdminToken(adminToken);
  if (!isValid) {
    return NextResponse.json({ success: false, message: 'Invalid token' }, { status: 403 });
  }

  let path = '/';
  try {
    const body = await request.json();
    path = body.path || '/';
  } catch {
    // no body — default to '/'
  }

  // Revalidate the requested path and the root layout (clears all cached pages)
  revalidatePath(path);
  if (path !== '/') {
    revalidatePath('/', 'layout');
  } else {
    revalidatePath('/', 'layout');
    revalidatePath('/categories');
  }

  return NextResponse.json({
    success: true,
    path,
    clearedAt: new Date().toISOString(),
  });
}
