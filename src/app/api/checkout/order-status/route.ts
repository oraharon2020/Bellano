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
          product_id?: number;
          variation_id?: number;
          image?: { src?: string };
          meta_data?: Array<{ key: string; value: string; display_key?: string; display_value?: string }>;
        }) => {
          // Extract variation attributes from meta_data
          const attributes: Array<{ name: string; value: string }> = [];
          if (item.meta_data) {
            item.meta_data.forEach((meta) => {
              // Skip internal/empty meta
              if (!meta.value || meta.value === '' || meta.key.startsWith('_') || 
                  meta.key.startsWith('pa_') || meta.key === 'סוג הנחה' || 
                  meta.key === 'מחיר מקורי' || meta.key === 'מחיר סופי' ||
                  meta.key.startsWith('bellano_attr_')) {
                
                // Handle bellano_attr_ prefix
                if (meta.key.startsWith('bellano_attr_') && meta.value) {
                  const displayKey = meta.key.replace('bellano_attr_', '').replace(/_/g, ' ');
                  attributes.push({
                    name: displayKey,
                    value: meta.value
                  });
                }
                return;
              }
              
              // Use display_key if available, otherwise use key
              const displayKey = meta.display_key || meta.key;
              const displayValue = meta.display_value || meta.value;
              
              attributes.push({
                name: displayKey,
                value: displayValue
              });
            });
          }
          
          return {
            name: item.name,
            quantity: item.quantity,
            price: `₪${parseFloat(item.total).toLocaleString()}`,
            image: item.image?.src || null,
            product_id: item.product_id || 0,
            variation_id: item.variation_id || 0,
            attributes: attributes.length > 0 ? attributes : undefined,
          };
        }),
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
