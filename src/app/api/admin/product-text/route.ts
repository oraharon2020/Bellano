import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken } from '@/lib/auth/verify-admin';
import { siteConfig } from '@/config/site';

const WP_URL = process.env.NEXT_PUBLIC_WORDPRESS_URL || siteConfig.wordpressUrl;

// Keyed on a per-request admin token — never cacheable at the edge.
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

const NO_STORE = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
};

// Browser-like UA so the WAF does not block this server-to-server call,
// matching /api/auth/check-admin and verify-admin.ts.
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

const EDITABLE_FIELDS = ['description', 'short_description'] as const;
type EditableField = (typeof EDITABLE_FIELDS)[number];

const unauthorized = () =>
  NextResponse.json(
    { success: false, message: 'נדרשת הזדהות כמנהל' },
    { status: 401, headers: NO_STORE }
  );

/**
 * The raw product text, straight from WordPress.
 *
 * The editor loads this rather than scraping the rendered page, so what gets
 * saved back is the stored markup itself and not whatever the page happened to
 * render — video shortcodes and any markup the storefront does not display
 * included.
 */
export async function GET(request: NextRequest) {
  const token = request.headers.get('x-admin-token');

  if (!(await verifyAdminToken(token))) return unauthorized();

  const productId = request.nextUrl.searchParams.get('productId');
  if (!productId || !/^\d+$/.test(productId)) {
    return NextResponse.json(
      { success: false, message: 'מזהה מוצר לא תקין' },
      { status: 400, headers: NO_STORE }
    );
  }

  try {
    const res = await fetch(`${WP_URL}/wp-json/bellano/v1/product-text/${productId}`, {
      headers: { 'x-admin-token': token as string, 'User-Agent': UA },
      cache: 'no-store',
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status, headers: NO_STORE });
  } catch (error) {
    console.error('product-text: fetch failed', error);
    return NextResponse.json(
      { success: false, message: 'לא ניתן לטעון את הטקסט מוורדפרס' },
      { status: 502, headers: NO_STORE }
    );
  }
}

/**
 * Save one field back to WordPress.
 *
 * No revalidation happens here on purpose: after saving, the plugin calls
 * Bellano_Cache::clear_product_cache() explicitly, which purges /product/{slug},
 * / and the product's category pages on Vercel. Doing it here as well would
 * just duplicate that path.
 */
export async function POST(request: NextRequest) {
  const token = request.headers.get('x-admin-token');

  if (!(await verifyAdminToken(token))) return unauthorized();

  let body: { productId?: number; field?: string; value?: string };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, message: 'בקשה לא תקינה' },
      { status: 400, headers: NO_STORE }
    );
  }

  const { productId, field, value } = body;

  if (!productId || !Number.isInteger(productId)) {
    return NextResponse.json(
      { success: false, message: 'מזהה מוצר לא תקין' },
      { status: 400, headers: NO_STORE }
    );
  }

  if (!field || !EDITABLE_FIELDS.includes(field as EditableField)) {
    return NextResponse.json(
      { success: false, message: 'שדה לא מורשה לעריכה' },
      { status: 400, headers: NO_STORE }
    );
  }

  if (typeof value !== 'string') {
    return NextResponse.json(
      { success: false, message: 'תוכן לא תקין' },
      { status: 400, headers: NO_STORE }
    );
  }

  try {
    const res = await fetch(`${WP_URL}/wp-json/bellano/v1/product-text/${productId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-token': token as string,
        'User-Agent': UA,
      },
      body: JSON.stringify({ field, value }),
      cache: 'no-store',
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status, headers: NO_STORE });
  } catch (error) {
    console.error('product-text: save failed', error);
    return NextResponse.json(
      { success: false, message: 'השמירה נכשלה — וורדפרס לא זמין' },
      { status: 502, headers: NO_STORE }
    );
  }
}
