import { NextResponse } from 'next/server';
import { siteConfig } from '@/config/site';

/**
 * bellano.co.il/o/<8 letters> → that payment link's page.
 *
 * The short address a customer is sent for a payment link. The link itself
 * lives in WordPress (darion-child/whatsapp/paylink.php, copied from Nalla's
 * theme on 2026-10-14): the page that shows what is being paid and opens
 * Grow's payment is served at admin.bellano.co.il/wp-json/bellano/v1/pay/<code>.
 * This route only asks WordPress where a code leads and sends the customer
 * there — a short, readable address on the shop's own domain rather than a
 * /wp-json/ one, which reads like something to be wary of.
 *
 * The question goes to nalla/v1/promo-link, the name Nalla's storefront asks:
 * paylink.php answers 8-letter codes on it before WordPress looks for the
 * route at all (rest_pre_dispatch), so the same code serves both shops and the
 * two files stay diffable. Bellano has no promotions behind it; anything else
 * is a 404, and a 404 ends at the shop.
 *
 * 302, never 301, and no caching anywhere: a link that has been paid or has
 * expired must stop leading to payment the moment it does, and a permanent
 * redirect held in a browser would outlive it.
 *
 * Only to the shop's own WordPress. The answer names the page to go to; an
 * open redirect on an address customers are asked to pay through is exactly
 * what a phisher would want, so nothing else is followed.
 */

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

const NO_STORE = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
} as const;

function toShop() {
  return NextResponse.redirect(new URL('/', siteConfig.url), {
    status: 302,
    headers: NO_STORE,
  });
}

export async function GET(_request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;

  // A payment link's code is eight letters and digits; it arrives retyped and autocorrected as often as not.
  const clean = (code || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  if (clean.length !== 8) {
    return toShop();
  }

  try {
    const endpoint = `${siteConfig.wordpressUrl}/wp-json/nalla/v1/promo-link?code=${encodeURIComponent(clean)}`;
    const response = await fetch(endpoint, {
      cache: 'no-store',
      // Browser-like UA so the WAF does not block this server-to-server call.
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
      },
    });
    if (!response.ok) {
      return toShop();
    }

    const data: { active?: string; url?: string } = await response.json();
    if (data.active !== 'yes' || !data.url) {
      return toShop();
    }

    let target: URL;
    try {
      target = new URL(data.url);
    } catch {
      return toShop();
    }
    if (target.protocol !== 'https:' || target.host !== new URL(siteConfig.wordpressUrl).host) {
      return toShop();
    }

    return NextResponse.redirect(target.toString(), { status: 302, headers: NO_STORE });
  } catch {
    return toShop();
  }
}
