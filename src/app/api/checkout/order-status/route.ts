import { NextRequest, NextResponse } from 'next/server';
import { siteConfig } from '@/config/site';

const WC_URL = process.env.NEXT_PUBLIC_WORDPRESS_URL || siteConfig.wordpressUrl;
const WC_KEY = process.env.WC_CONSUMER_KEY || process.env.WOOCOMMERCE_CONSUMER_KEY;
const WC_SECRET = process.env.WC_CONSUMER_SECRET || process.env.WOOCOMMERCE_CONSUMER_SECRET;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('order_id');
    const includeDetails = searchParams.get('include_details') === 'true';

    if (!orderId) {
      return NextResponse.json(
        { success: false, message: 'Missing order_id' },
        { status: 400 }
      );
    }

    if (!WC_KEY || !WC_SECRET) {
      return NextResponse.json(
        { success: false, message: 'WooCommerce credentials not configured' },
        { status: 500 }
      );
    }

    const auth = Buffer.from(`${WC_KEY}:${WC_SECRET}`).toString('base64');

    const response = await fetch(`${WC_URL}/wp-json/wc/v3/orders/${orderId}`, {
      headers: {
        Authorization: `Basic ${auth}`,
      },
      // Don't cache this request
      cache: 'no-store',
    });

    if (!response.ok) {
      return NextResponse.json(
        { success: false, message: 'Order not found' },
        { status: 404 }
      );
    }

    const data = await response.json();

    // Basic response
    const result: Record<string, unknown> = {
      success: true,
      order_id: data.id,
      status: data.status,
      total: data.total,
      payment_method: data.payment_method,
      date_paid: data.date_paid,
    };

    // Include full order details for thank you page
    if (includeDetails) {
      result.order = {
        id: data.id.toString(),
        status: data.status,
        total: data.total,
        currency: data.currency,
        items: data.line_items.map((item: {
          name: string;
          quantity: number;
          total: string;
          image?: { src?: string };
        }) => ({
          name: item.name,
          quantity: item.quantity,
          price: `₪${parseFloat(item.total).toLocaleString()}`,
          image: item.image?.src || null,
        })),
        billing: {
          first_name: data.billing.first_name,
          last_name: data.billing.last_name,
          email: data.billing.email,
          phone: data.billing.phone,
        },
      };
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error('Error checking order status:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : 'שגיאה לא צפויה' 
      },
      { status: 500 }
    );
  }
}
