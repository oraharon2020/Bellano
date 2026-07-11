import { NextRequest, NextResponse } from 'next/server';
import { siteConfig } from '@/config/site';

const WP_URL = process.env.NEXT_PUBLIC_WORDPRESS_URL || siteConfig.wordpressUrl;
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
const headers = { 'Cache-Control': 'no-store, no-cache, must-revalidate' };

export async function GET() {
  try {
    const response = await fetch(`${WP_URL}/wp-json/bellano/v1/studio`, {
      cache: 'no-store',
      headers: { 'User-Agent': 'Mozilla/5.0 BellanoStudio/1.0' },
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status, headers });
  } catch {
    return NextResponse.json({ enabled: false, message: 'Studio unavailable' }, { status: 503, headers });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const response = await fetch(`${WP_URL}/wp-json/bellano/v1/studio/calculate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0 BellanoStudio/1.0' },
      body: JSON.stringify(body),
      cache: 'no-store',
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status, headers });
  } catch {
    return NextResponse.json({ message: 'Calculation unavailable' }, { status: 503, headers });
  }
}
