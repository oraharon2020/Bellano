import { NextRequest, NextResponse } from 'next/server';
import { siteConfig } from '@/config/site';
import { buildOrderAttribution } from '@/lib/attribution';

/**
 * Records which ad click a WhatsApp lead code belongs to.
 *
 * Called by `sendBeacon` as the customer leaves for WhatsApp, so it has to be
 * cheap and it must never keep the browser waiting. Nothing here is worth
 * failing visibly over: if the record is lost, the customer still reaches
 * WhatsApp and only the attribution is missing.
 *
 * Storage lives in WordPress rather than here, beside the orders this will
 * eventually be matched against. Nalla's route, copied on 26/10/2026; Nalla
 * has a wpFetch helper for the WAF's sake and Bellano does not, so the
 * browser-like User-Agent is set here, as verify-admin.ts sets it.
 */

const WP_BROWSER_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

/** A code this route issued: six characters from our own alphabet. */
const CODE_PATTERN = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Anyone can post here, so only our own shape is stored — no free-form
    // text reaches the database.
    if (typeof body?.code !== 'string' || !CODE_PATTERN.test(body.code)) {
      return NextResponse.json({ success: false }, { status: 400 });
    }

    const str = (v: unknown, max: number) =>
      typeof v === 'string' && v ? v.slice(0, max) : undefined;

    /*
     * A page that predates `attribution` sends the flat fields only, and they
     * are forwarded as before. Otherwise everything is derived here from the
     * touches, with the same rules an order is classified by, so a lead and
     * the order it becomes can be compared field for field.
     */
    const lead = 'attribution' in body
      ? buildOrderAttribution({
          entry: 'site',
          attribution: body.attribution,
          ownHosts: [siteConfig.url, siteConfig.wordpressUrl, siteConfig.vercelUrl],
        })
      : null;

    /*
     * Built by hand rather than with getApiEndpoint(): that helper builds
     * bellano/v1, while the theme's whatsapp-lead.php (the same file in both
     * themes) registers this route under nalla/v1 — the namespace Bellano
     * already serves the formula pricing from.
     */
    const endpoint = `${siteConfig.wordpressUrl}/wp-json/nalla/v1/whatsapp-lead`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': WP_BROWSER_UA },
      body: JSON.stringify(lead
        ? {
            code: body.code,
            gclid: lead.clicks.gclid?.id,
            gbraid: lead.clicks.gbraid?.id,
            wbraid: lead.clicks.wbraid?.id,
            fbclid: lead.clicks.fbclid?.id,
            utm_source: str(lead.attributed?.utm_source, 100),
            utm_medium: str(lead.attributed?.utm_medium, 100),
            utm_campaign: str(lead.attributed?.utm_campaign, 200),
            page: str(body.page, 200),
            channel: lead.channel,
            attr_first: lead.firstJson,
            attr_last: lead.lastJson,
          }
        : {
            code: body.code,
            gclid: str(body.gclid, 200),
            fbclid: str(body.fbclid, 200),
            utm_source: str(body.utm_source, 100),
            utm_medium: str(body.utm_medium, 100),
            utm_campaign: str(body.utm_campaign, 200),
            page: str(body.page, 200),
          }),
      cache: 'no-store',
    });

    return NextResponse.json({ success: response.ok }, { status: response.ok ? 200 : 502 });
  } catch (error) {
    console.error('WhatsApp lead registration failed:', error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
