import { NextRequest, NextResponse, after } from 'next/server';
import { getApiEndpoint, siteConfig } from '@/config/site';
import { sendGoogleAdsConversion } from '@/lib/google-ads-conversions';
import { describeErrorForLog, summarizeMeshulamPayload } from '@/lib/meshulam-log';

const WC_URL = process.env.NEXT_PUBLIC_WORDPRESS_URL || siteConfig.wordpressUrl;
const WC_KEY = process.env.WC_CONSUMER_KEY || process.env.WOOCOMMERCE_CONSUMER_KEY;
const WC_SECRET = process.env.WC_CONSUMER_SECRET || process.env.WOOCOMMERCE_CONSUMER_SECRET;

// Node, not Edge: the Google upload signs its JWT with node:crypto.
export const runtime = 'nodejs';
// The Google upload runs in after(), which Vercel keeps alive (waitUntil) only
// up to this limit. Its three calls are capped at 8 s each, so 60 s covers the
// WordPress forward plus a worst-case upload — and fits every Vercel plan.
export const maxDuration = 60;

/**
 * Server-side Google Ads conversion for a paid order.
 *
 * This is the notifyUrl Meshulam actually calls (see create-payment), so it is
 * where the offline import belongs. It catches the ad-driven purchases the
 * browser tag misses — blocked tags, closed tab, a thank-you page that never
 * confirmed the payment in time.
 *
 * De-duplicated against the browser tag by the WooCommerce order id, which both
 * sides send as the transaction id. For Google to actually collapse the pair,
 * GOOGLE_ADS_CONVERSION_ACTION_ID must be the numeric id of the very same
 * conversion action as siteConfig.analytics.googleAdsConversionLabel — a
 * different action means the same purchase is counted twice.
 */
async function reportGoogleAdsConversion(orderId: string): Promise<void> {
  if (!WC_KEY || !WC_SECRET) {
    console.log(`Google Ads conversion skipped for order ${orderId}: WooCommerce credentials missing`);
    return;
  }

  try {
    const auth = Buffer.from(`${WC_KEY}:${WC_SECRET}`).toString('base64');
    // Same 8 s ceiling as the Google calls.
    const res = await fetch(`${WC_URL}/wp-json/wc/v3/orders/${orderId}`, {
      headers: { Authorization: `Basic ${auth}` },
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      console.error(`Google Ads conversion: could not load order ${orderId} (${res.status})`);
      return;
    }
    const order = await res.json();

    const getMeta = (k: string): string | undefined =>
      (order.meta_data || []).find((m: { key: string; value: unknown }) => m.key === k)?.value as string | undefined;

    const adsRes = await sendGoogleAdsConversion({
      orderId: String(orderId),
      gclid: getMeta('_gclid'),
      gbraid: getMeta('_gbraid'),
      wbraid: getMeta('_wbraid'),
      value: parseFloat(order.total) || 0,
      currency: order.currency || 'ILS',
      conversionDate: order.date_created_gmt ? new Date(order.date_created_gmt + 'Z') : new Date(),
      email: order.billing?.email,
      phone: order.billing?.phone,
      orderEntry: getMeta('_order_entry'),
    });

    if (adsRes.skipped) {
      console.log(`Google Ads conversion skipped for order ${orderId}: ${adsRes.error}`);
    } else if (!adsRes.ok) {
      console.error(`Google Ads conversion failed for order ${orderId}: ${adsRes.error}`);
    } else {
      const req = adsRes.requestId ? ` (request ${adsRes.requestId})` : '';
      const warn = adsRes.warnings ? ` — warnings: ${adsRes.warnings}` : '';
      console.log(`Google Ads conversion sent for order ${orderId}${req}${warn}`);
    }
  } catch (e) {
    console.error(`Google Ads conversion threw for order ${orderId}: ${describeErrorForLog(e)}`);
  }
}

/**
 * Meshulam Webhook - receives server-to-server notifications
 * Forwards the notification to WordPress to update order status
 */
export async function POST(request: NextRequest) {
  try {
    // Get form data or JSON
    let data: Record<string, any> = {};
    
    const contentType = request.headers.get('content-type') || '';
    
    if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await request.formData();
      formData.forEach((value, key) => {
        data[key] = value;
      });
    } else if (contentType.includes('application/json')) {
      data = await request.json();
    } else {
      // Try to parse as form data
      const text = await request.text();
      const params = new URLSearchParams(text);
      params.forEach((value, key) => {
        data[key] = value;
      });
    }
    
    // Never the whole payload: it carries the payer's name, phone, e-mail and
    // card details. See lib/meshulam-log.ts for what is kept.
    console.log('Meshulam webhook received:', JSON.stringify(summarizeMeshulamPayload(data)));
    
    // Extract order info
    const status = data['status'] || data['data[status]'];
    const orderId = data['cField1'] || data['data[customFields][cField1]'];
    const asmachta = data['asmachta'] || data['data[asmachta]'];
    const transactionId = data['transactionId'] || data['data[transactionId]'];
    const transactionToken = data['transactionToken'] || data['data[transactionToken]'];
    
    if (!orderId) {
      console.error('No order ID in webhook');
      return NextResponse.json({ error: 'No order ID' }, { status: 400 });
    }
    
    // Forward to WordPress to update order
    const wpWebhookUrl = getApiEndpoint('meshulam-webhook');
    
    try {
      const wpResponse = await fetch(wpWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: status === '1' || status === 1 ? 1 : 0,
          data: {
            customFields: { cField1: orderId },
            asmachta: asmachta || '',
            transactionId: transactionId || '',
            transactionToken: transactionToken || '',
          }
        }),
      });
      
      const wpResult = await wpResponse.text();
      console.log(`WordPress webhook response (${wpResponse.status}):`, wpResult.slice(0, 300));
      
    } catch (wpError) {
      console.error('Failed to forward to WordPress:', describeErrorForLog(wpError));
      // Continue anyway - don't fail the webhook
    }
    
    // Paid orders only, and after the response: Meshulam gets its answer as
    // soon as WordPress has the payment, whatever Google is doing. after()
    // runs the callback once the response is sent, and on Vercel holds the
    // function open (waitUntil) until it settles — so it is not frozen
    // mid-upload. reportGoogleAdsConversion never throws and logs its result.
    if (status === '1' || status === 1) {
      after(() => reportGoogleAdsConversion(String(orderId)));
    }
    
    return NextResponse.json({ status: 'ok', orderId });
    
  } catch (error) {
    console.error('Webhook error:', describeErrorForLog(error));
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
  }
}

// Also handle GET requests (some payment gateways use GET)
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  
  const data: Record<string, any> = {};
  searchParams.forEach((value, key) => {
    data[key] = value;
  });
  
  console.log('Meshulam webhook GET:', JSON.stringify(summarizeMeshulamPayload(data)));
  
  // Forward to POST handler logic
  const orderId = data['cField1'];
  const status = data['status'] || data['response'];
  
  if (orderId) {
    // Forward to WordPress
    try {
      const wpWebhookUrl = getApiEndpoint('meshulam-webhook');
      await fetch(wpWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: status === 'success' || status === '1' ? 1 : 0,
          data: {
            customFields: { cField1: orderId },
            asmachta: data['asmachta'] || '',
          }
        }),
      });
    } catch (e) {
      console.error('WordPress forward error:', describeErrorForLog(e));
    }
    
    if (status === 'success' || status === '1') {
      after(() => reportGoogleAdsConversion(String(orderId)));
    }
  }
  
  return NextResponse.json({ status: 'ok' });
}
