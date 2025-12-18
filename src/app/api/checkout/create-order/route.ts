import { NextRequest, NextResponse } from 'next/server';

const WC_URL = process.env.NEXT_PUBLIC_WORDPRESS_URL || 'https://bellano.co.il';
const WC_KEY = process.env.WC_CONSUMER_KEY || process.env.WOOCOMMERCE_CONSUMER_KEY;
const WC_SECRET = process.env.WC_CONSUMER_SECRET || process.env.WOOCOMMERCE_CONSUMER_SECRET;

interface OrderItem {
  product_id: number;
  variation_id?: number;
  quantity: number;
}

interface CustomerData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postcode: string;
  notes: string;
}

interface CreateOrderRequest {
  customer: CustomerData;
  items: OrderItem[];
  shipping_method: string;
  payment_method?: 'credit_card' | 'phone_order';
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateOrderRequest = await request.json();
    const { customer, items, shipping_method, payment_method = 'credit_card' } = body;

    if (!WC_KEY || !WC_SECRET) {
      return NextResponse.json(
        { success: false, message: 'WooCommerce credentials not configured' },
        { status: 500 }
      );
    }

    // Determine payment method settings
    const isPhoneOrder = payment_method === 'phone_order';
    
    // Create the order in WooCommerce
    const orderData = {
      payment_method: isPhoneOrder ? 'cod' : 'meshulam',
      payment_method_title: isPhoneOrder ? 'תשלום דרך נציג' : 'כרטיס אשראי',
      set_paid: false,
      status: isPhoneOrder ? 'on-hold' : 'pending',
      billing: {
        first_name: customer.firstName,
        last_name: customer.lastName,
        email: customer.email,
        phone: customer.phone,
        address_1: customer.address,
        city: customer.city,
        postcode: customer.postcode || '',
        country: 'IL',
      },
      shipping: {
        first_name: customer.firstName,
        last_name: customer.lastName,
        address_1: customer.address,
        city: customer.city,
        postcode: customer.postcode || '',
        country: 'IL',
      },
      line_items: items.map((item) => ({
        product_id: item.product_id,
        variation_id: item.variation_id || undefined,
        quantity: item.quantity,
      })),
      shipping_lines: [
        {
          method_id: shipping_method,
          method_title: shipping_method === 'free_shipping' ? 'משלוח חינם' : 'משלוח',
          total: '0',
        },
      ],
      customer_note: customer.notes || '',
      meta_data: [
        {
          key: '_created_via',
          value: 'bellano_nextjs_checkout',
        },
      ],
    };

    const auth = Buffer.from(`${WC_KEY}:${WC_SECRET}`).toString('base64');

    const response = await fetch(`${WC_URL}/wp-json/wc/v3/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify(orderData),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('WooCommerce order creation failed:', data);
      return NextResponse.json(
        { 
          success: false, 
          message: data.message || 'שגיאה ביצירת ההזמנה בווקומרס' 
        },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      order_id: data.id,
      order_key: data.order_key,
      total: parseFloat(data.total),
      currency: data.currency,
    });

  } catch (error) {
    console.error('Error creating order:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : 'שגיאה לא צפויה' 
      },
      { status: 500 }
    );
  }
}
