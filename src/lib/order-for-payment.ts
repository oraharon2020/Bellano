import { siteConfig } from '@/config/site';

/**
 * The order as WooCommerce keeps it — its total, status and lines — for the routes that take money or mark an order
 * paid.
 *
 * Found 29/10/2026: create-payment asked the payment page for whatever `amount` the browser sent, and Nalla's
 * complete-free-order marked any order id paid. A payment is for the order's own total; a "free" order is one whose
 * total is 0. Read straight from WooCommerce with the shop's key, never cached.
 *
 * The lines become the items on Grow's invoice (productData), so they come from the order too, not the browser.
 */

const WP_URL = process.env.NEXT_PUBLIC_WORDPRESS_URL || siteConfig.wordpressUrl;
const KEY = process.env.WC_CONSUMER_KEY || process.env.WOOCOMMERCE_CONSUMER_KEY || '';
const SECRET = process.env.WC_CONSUMER_SECRET || process.env.WOOCOMMERCE_CONSUMER_SECRET || '';

/** Statuses an order can still be paid from (a failed payment may be tried again). */
export const PAYABLE_STATUSES = ['pending', 'failed', 'on-hold'];

/** One item line on the payment page and its invoice. */
export interface InvoiceLine {
  sku: string;
  name: string;
  price: number;
  quantity: number;
}

export interface OrderForPayment {
  id: number;
  total: number;
  status: string;
  /** The order's lines adding up exactly to `total`, or null when they cannot (the caller sends one line). */
  lines: InvoiceLine[] | null;
}

interface WooLine {
  name?: string;
  sku?: string;
  product_id?: number;
  quantity?: number;
  total?: string;
  method_title?: string;
}

interface WooOrder {
  id?: number;
  total?: string;
  status?: string;
  line_items?: WooLine[];
  fee_lines?: WooLine[];
  shipping_lines?: WooLine[];
}

const cents = (n: number) => Math.round(n * 100);

const cleanName = (s: unknown, fallback: string) =>
  String(s ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&[a-z#0-9]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100) || fallback;

/**
 * Products (after coupons — WooCommerce's line `total`), fees and shipping, as the invoice should list them.
 * A line whose unit price would not come out in whole agorot goes as one line "name × qty". Tax is off on both shops,
 * so these add up to the order total; when they don't (or a line is negative, which the payment page may refuse),
 * null — and the caller falls back to one line for the total, which is always right.
 */
export function invoiceLines(order: WooOrder, total: number): InvoiceLine[] | null {
  const raw: { sku: string; name: string; amount: number; qty: number }[] = [];
  for (const li of order.line_items ?? []) {
    raw.push({
      sku: String(li.sku || `item-${li.product_id ?? ''}`),
      name: cleanName(li.name, 'פריט'),
      amount: Number(li.total),
      qty: Math.max(1, Math.round(Number(li.quantity) || 1)),
    });
  }
  for (const f of order.fee_lines ?? []) raw.push({ sku: 'fee', name: cleanName(f.name, 'תוספת'), amount: Number(f.total), qty: 1 });
  for (const s of order.shipping_lines ?? []) raw.push({ sku: 'shipping', name: cleanName(s.method_title, 'משלוח'), amount: Number(s.total), qty: 1 });

  if (raw.some((r) => !Number.isFinite(r.amount))) return null;
  // A discount kept as a negative line (a rep's negative shipping or fee, seen on Bellano) comes off the largest
  // line instead: the payment page may refuse a negative item, and the invoice still lists every piece.
  const off = raw.filter((r) => r.amount < 0).reduce((s, r) => s + r.amount, 0);
  const kept = raw.filter((r) => r.amount >= 0);
  if (off < 0) {
    const big = kept.reduce<(typeof kept)[number] | null>((b, r) => (!b || r.amount > b.amount ? r : b), null);
    if (!big || big.amount + off <= 0) return null;
    big.amount += off;
  }

  const lines: InvoiceLine[] = [];
  for (const r of kept) {
    if (cents(r.amount) === 0) continue; // a free line adds nothing to the charge
    const unit = cents(r.amount / r.qty) / 100;
    lines.push(
      cents(unit * r.qty) === cents(r.amount)
        ? { sku: r.sku, name: r.name, price: unit, quantity: r.qty }
        : { sku: r.sku, name: cleanName(`${r.name} × ${r.qty}`, r.name), price: cents(r.amount) / 100, quantity: 1 },
    );
  }
  if (!lines.length) return null;
  const sum = lines.reduce((s, l) => s + cents(l.price) * l.quantity, 0);
  return sum === cents(total) ? lines : null;
}

/** null when WooCommerce cannot be asked or has no such order: the caller refuses (money fails closed). */
export async function orderForPayment(orderId: number): Promise<OrderForPayment | null> {
  if (!Number.isInteger(orderId) || orderId <= 0 || !KEY || !SECRET) return null;
  try {
    const fields = 'id,total,status,line_items,fee_lines,shipping_lines';
    const res = await fetch(`${WP_URL}/wp-json/wc/v3/orders/${orderId}?_fields=${fields}`, {
      headers: {
        Authorization: `Basic ${Buffer.from(`${KEY}:${SECRET}`).toString('base64')}`,
        // Browser-like UA so the WAF does not block this server-to-server call.
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
      },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const data = (await res.json().catch(() => null)) as WooOrder | null;
    const total = Number(data?.total);
    if (!data || !Number.isFinite(total) || typeof data.status !== 'string') return null;
    return { id: Number(data.id) || orderId, total, status: data.status, lines: invoiceLines(data, total) };
  } catch {
    return null;
  }
}
