import { NextRequest, NextResponse } from 'next/server';
import { siteConfig } from '@/config/site';
import { checkRateLimit, getClientIp } from '@/lib/rate-limiter';

const WC_URL = process.env.NEXT_PUBLIC_WOOCOMMERCE_URL || siteConfig.wordpressUrl;
const WC_KEY = process.env.WOOCOMMERCE_CONSUMER_KEY;
const WC_SECRET = process.env.WOOCOMMERCE_CONSUMER_SECRET;

interface WooCoupon {
  id: number;
  code: string;
  amount: string;
  discount_type: 'percent' | 'fixed_cart' | 'fixed_product';
  description: string;
  date_expires: string | null;
  usage_count: number;
  usage_limit: number | null;
  usage_limit_per_user: number | null;
  limit_usage_to_x_items: number | null;
  free_shipping: boolean;
  product_ids: number[];
  excluded_product_ids: number[];
  product_categories: number[];
  excluded_product_categories: number[];
  minimum_amount: string;
  maximum_amount: string;
  individual_use: boolean;
}

export async function POST(request: NextRequest) {
  // Rate limit: max 10 coupon checks per minute per IP
  const ip = getClientIp(request);
  const rateLimit = checkRateLimit(ip, { maxRequests: 10, windowSeconds: 60, prefix: 'coupon-validate' });
  
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { success: false, message: 'יותר מדי ניסיונות. נסו שוב בעוד דקה.' },
      { status: 429, headers: { 'Retry-After': rateLimit.resetIn.toString() } }
    );
  }

  try {
    const { code, cart_total, product_ids, has_bundle_items, line_items } = await request.json();

    if (!code) {
      return NextResponse.json(
        { success: false, message: 'נא להזין קוד קופון' },
        { status: 400 }
      );
    }

    if (!WC_KEY || !WC_SECRET) {
      return NextResponse.json(
        { success: false, message: 'שגיאת תצורה בשרת' },
        { status: 500 }
      );
    }

    // Fetch coupon from WooCommerce
    const auth = Buffer.from(`${WC_KEY}:${WC_SECRET}`).toString('base64');
    const response = await fetch(
      `${WC_URL}/wp-json/wc/v3/coupons?code=${encodeURIComponent(code)}`,
      {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        { success: false, message: 'שגיאה באימות הקופון' },
        { status: 500 }
      );
    }

    const coupons: WooCoupon[] = await response.json();

    if (coupons.length === 0) {
      return NextResponse.json(
        { success: false, message: 'קוד הקופון אינו תקף' },
        { status: 404 }
      );
    }

    const coupon = coupons[0];

    // Check if individual_use coupon is being combined with bundle discounts
    if (coupon.individual_use && has_bundle_items) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'קופון זה לא ניתן לשילוב עם הנחת באנדל. הסירו את מוצרי הבאנדל מהסל או השתמשו בקופון אחר.',
          individual_use: true
        },
        { status: 400 }
      );
    }

    // Check if coupon has expired
    if (coupon.date_expires) {
      const expiryDate = new Date(coupon.date_expires);
      if (expiryDate < new Date()) {
        return NextResponse.json(
          { success: false, message: 'תוקף הקופון פג' },
          { status: 400 }
        );
      }
    }

    // Check usage limit
    if (coupon.usage_limit !== null && coupon.usage_count >= coupon.usage_limit) {
      return NextResponse.json(
        { success: false, message: 'הקופון הגיע למגבלת השימוש' },
        { status: 400 }
      );
    }

    // Check minimum amount
    if (coupon.minimum_amount && parseFloat(coupon.minimum_amount) > 0) {
      if (cart_total < parseFloat(coupon.minimum_amount)) {
        return NextResponse.json(
          { 
            success: false, 
            message: `סכום ההזמנה המינימלי לקופון זה הוא ₪${coupon.minimum_amount}` 
          },
          { status: 400 }
        );
      }
    }

    // Check maximum amount
    if (coupon.maximum_amount && parseFloat(coupon.maximum_amount) > 0) {
      if (cart_total > parseFloat(coupon.maximum_amount)) {
        return NextResponse.json(
          { 
            success: false, 
            message: `סכום ההזמנה המקסימלי לקופון זה הוא ₪${coupon.maximum_amount}` 
          },
          { status: 400 }
        );
      }
    }

    // ── Eligibility: does the cart actually contain items this coupon covers? ──
    // WooCommerce limits coupons by product AND category (include / exclude). We
    // resolve each cart product's categories and keep only the ELIGIBLE items,
    // so a category-limited coupon (e.g. SUMMER15 for bedside tables) is refused
    // when the cart has none of them, and discounts ONLY the eligible items when
    // the cart is mixed — instead of silently applying to the whole cart.
    const hasProductRestriction =
      coupon.product_ids.length > 0 ||
      coupon.excluded_product_ids.length > 0 ||
      coupon.product_categories.length > 0 ||
      coupon.excluded_product_categories.length > 0;

    // Working line items (prefer per-item data; fall back to bare product_ids).
    const lines: { product_id: number; price: number; quantity: number }[] =
      Array.isArray(line_items) && line_items.length
        ? line_items.map((li: any) => ({
            product_id: Number(li.product_id) || 0,
            price: Number(li.price) || 0,
            quantity: Number(li.quantity) || 1,
          }))
        : Array.isArray(product_ids)
          ? product_ids.map((id: number) => ({ product_id: Number(id) || 0, price: 0, quantity: 1 }))
          : [];

    // Resolve the cart products' categories (only when a restriction exists).
    const catMap: Record<number, number[]> = {};
    if (hasProductRestriction && lines.length) {
      const ids = Array.from(new Set(lines.map((l) => l.product_id).filter(Boolean)));
      if (ids.length) {
        try {
          const prodRes = await fetch(
            `${WC_URL}/wp-json/wc/v3/products?include=${ids.join(',')}&per_page=100&_fields=id,categories`,
            { headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' }, cache: 'no-store' }
          );
          if (prodRes.ok) {
            const prods: { id: number; categories?: { id: number }[] }[] = await prodRes.json();
            for (const p of prods) catMap[p.id] = (p.categories || []).map((c) => c.id);
          }
        } catch {
          // On a fetch failure, skip the CATEGORY check rather than wrongly
          // reject a valid coupon; the product-id rules below still apply.
        }
      }
    }

    const isEligible = (pid: number): boolean => {
      const catsKnown = pid in catMap;
      const cats = catMap[pid] || [];
      const inProducts = coupon.product_ids.length === 0 || coupon.product_ids.includes(pid);
      const notExcludedProduct = !coupon.excluded_product_ids.includes(pid);
      const inCategories =
        coupon.product_categories.length === 0 || !catsKnown || cats.some((c) => coupon.product_categories.includes(c));
      const notExcludedCategory =
        coupon.excluded_product_categories.length === 0 || !catsKnown || !cats.some((c) => coupon.excluded_product_categories.includes(c));
      return inProducts && notExcludedProduct && inCategories && notExcludedCategory;
    };

    const eligibleLines = hasProductRestriction ? lines.filter((l) => isEligible(l.product_id)) : lines;

    if (hasProductRestriction && eligibleLines.length === 0) {
      return NextResponse.json(
        { success: false, message: 'הקופון אינו תקף למוצרים שבסל.' },
        { status: 400 }
      );
    }

    // Base the discount on the ELIGIBLE items only (matches WooCommerce). When
    // no per-item prices were sent, fall back to the whole cart.
    const havePrices = eligibleLines.some((l) => l.price > 0);
    const eligibleSubtotal = havePrices
      ? eligibleLines.reduce((sum, l) => sum + l.price * l.quantity, 0)
      : cart_total;
    const eligibleQty = eligibleLines.reduce((sum, l) => sum + l.quantity, 0) || 1;
    const discountBase = hasProductRestriction ? eligibleSubtotal : cart_total;

    // Calculate discount
    let discount = 0;
    let discountDisplay = '';

    switch (coupon.discount_type) {
      case 'percent':
        discount = (discountBase * parseFloat(coupon.amount)) / 100;
        discountDisplay = `${coupon.amount}%`;
        break;
      case 'fixed_cart':
        discount = parseFloat(coupon.amount);
        discountDisplay = `₪${coupon.amount}`;
        break;
      case 'fixed_product':
        // Fixed amount off each eligible item (per quantity).
        discount = parseFloat(coupon.amount) * eligibleQty;
        discountDisplay = `₪${coupon.amount}`;
        break;
    }

    // Don't allow discount to exceed cart total
    if (discount > cart_total) {
      discount = cart_total;
    }

    return NextResponse.json({
      success: true,
      coupon: {
        code: coupon.code,
        discount_type: coupon.discount_type,
        amount: coupon.amount,
        description: coupon.description,
        free_shipping: coupon.free_shipping,
        individual_use: coupon.individual_use,
      },
      discount: Math.round(discount * 100) / 100,
      discountDisplay,
      message: `קופון "${coupon.code}" הוחל בהצלחה!`,
    });

  } catch (error) {
    console.error('Coupon validation error:', error);
    return NextResponse.json(
      { success: false, message: 'שגיאה באימות הקופון' },
      { status: 500 }
    );
  }
}
