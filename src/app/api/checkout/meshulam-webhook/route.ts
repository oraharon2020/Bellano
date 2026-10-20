import { NextRequest, NextResponse } from 'next/server';
import { getApiEndpoint, siteConfig } from '@/config/site';
import { sendGoogleAdsConversion } from '@/lib/google-ads-conversions';

const WC_URL = process.env.NEXT_PUBLIC_WORDPRESS_URL || siteConfig.wordpressUrl;
const WC_KEY = process.env.WC_CONSUMER_KEY || process.env.WOOCOMMERCE_CONSUMER_KEY;
const WC_SECRET = process.env.WC_CONSUMER_SECRET || process.env.WOOCOMMERCE_CONSUMER_SECRET;

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
    const res = await fetch(`${WC_URL}/wp-json/wc/v3/orders/${orderId}`, {
      headers: { Authorization: `Basic ${auth}` },
      cache: 'no-store',
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
      console.error(`Google Ads conversion failed for order ${orderId}:`, adsRes.error);
    } else {
      console.log(`Google Ads conversion sent for order ${orderId}`);
    }
  } catch (e) {
    console.error(`Google Ads conversion threw for order ${orderId}:`, e);
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
    
    console.log('Meshulam webhook received:', data);
    
    // Extract order info
    const status = data['status'] || data['data[status]'];
    const orderId = data['cField1'] || data['data[customFields][cField1]'];
    const asmachta = data['asmachta'] || data['data[asmachta]'];
    const transactionId = data['transactionId'] || data['data[transactionId]'];
    const transactionToken = data['transactionToken'] || data['data[transactionToken]'];
    
    console.log('Parsed webhook:', { status, orderId, asmachta, transactionId });
    
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
      console.log('WordPress webhook response:', wpResult);
      
    } catch (wpError) {
      console.error('Failed to forward to WordPress:', wpError);
      // Continue anyway - don't fail the webhook
    }
    
    // Paid orders only. Awaited so it finishes before the function is frozen.
    if (status === '1' || status === 1) {
      await reportGoogleAdsConversion(String(orderId));
    }
    
    return NextResponse.json({ status: 'ok', orderId });
    
  } catch (error) {
    console.error('Webhook error:', error);
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
  
  console.log('Meshulam webhook GET:', data);
  
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
      console.error('WordPress forward error:', e);
    }
    
    if (status === 'success' || status === '1') {
      await reportGoogleAdsConversion(String(orderId));
    }
  }
  
  return NextResponse.json({ status: 'ok' });
}
