import { NextRequest, NextResponse } from 'next/server';

const WC_URL = process.env.NEXT_PUBLIC_WOOCOMMERCE_URL || 'https://bellano.co.il';
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
  try {
    const { code, cart_total, product_ids } = await request.json();

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

    // Check product restrictions
    if (coupon.product_ids.length > 0 && product_ids) {
      const hasValidProduct = product_ids.some((id: number) => coupon.product_ids.includes(id));
      if (!hasValidProduct) {
        return NextResponse.json(
          { success: false, message: 'הקופון לא תקף למוצרים בסל' },
          { status: 400 }
        );
      }
    }

    // Check excluded products
    if (coupon.excluded_product_ids.length > 0 && product_ids) {
      const allExcluded = product_ids.every((id: number) => coupon.excluded_product_ids.includes(id));
      if (allExcluded) {
        return NextResponse.json(
          { success: false, message: 'הקופון לא תקף למוצרים בסל' },
          { status: 400 }
        );
      }
    }

    // Calculate discount
    let discount = 0;
    let discountDisplay = '';

    switch (coupon.discount_type) {
      case 'percent':
        discount = (cart_total * parseFloat(coupon.amount)) / 100;
        discountDisplay = `${coupon.amount}%`;
        break;
      case 'fixed_cart':
        discount = parseFloat(coupon.amount);
        discountDisplay = `₪${coupon.amount}`;
        break;
      case 'fixed_product':
        // For fixed product discount, calculate based on eligible products
        discount = parseFloat(coupon.amount);
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
