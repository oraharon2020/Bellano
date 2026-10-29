import { siteConfig } from '@/config/site';

/**
 * The order as WooCommerce keeps it — its total and status — for the routes that take money or mark an order paid.
 *
 * Found 29/10/2026: create-payment asked the payment page for whatever `amount` the browser sent, and Nalla's
 * complete-free-order marked any order id paid. A payment is for the order's own total; a "free" order is one whose
 * total is 0. Read straight from WooCommerce with the shop's key, never cached.
 */

const WP_URL = process.env.NEXT_PUBLIC_WORDPRESS_URL || siteConfig.wordpressUrl;
const KEY = process.env.WC_CONSUMER_KEY || process.env.WOOCOMMERCE_CONSUMER_KEY || '';
const SECRET = process.env.WC_CONSUMER_SECRET || process.env.WOOCOMMERCE_CONSUMER_SECRET || '';

/** Statuses an order can still be paid from (a failed payment may be tried again). */
export const PAYABLE_STATUSES = ['pending', 'failed', 'on-hold'];

export interface OrderForPayment {
  id: number;
  total: number;
  status: string;
}

/** null when WooCommerce cannot be asked or has no such order: the caller refuses (money fails closed). */
export async function orderForPayment(orderId: number): Promise<OrderForPayment | null> {
  if (!Number.isInteger(orderId) || orderId <= 0 || !KEY || !SECRET) return null;
  try {
    const res = await fetch(`${WP_URL}/wp-json/wc/v3/orders/${orderId}?_fields=id,total,status`, {
      headers: {
        Authorization: `Basic ${Buffer.from(`${KEY}:${SECRET}`).toString('base64')}`,
        // Browser-like UA so the WAF does not block this server-to-server call.
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
      },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const data = (await res.json().catch(() => null)) as { id?: number; total?: string; status?: string } | null;
    const total = Number(data?.total);
    if (!data || !Number.isFinite(total) || typeof data.status !== 'string') return null;
    return { id: Number(data.id) || orderId, total, status: data.status };
  } catch {
    return null;
  }
}
