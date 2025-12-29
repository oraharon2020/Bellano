import { NextRequest, NextResponse } from 'next/server';
import { siteConfig, getApiEndpoint } from '@/config/site';

// Fallback page codes (will be overridden by WordPress settings)
const PAGE_CODES = {
  credit_card: siteConfig.meshulam.pageCodes.creditCard,
  bit: siteConfig.meshulam.pageCodes.bit,
  apple_pay: siteConfig.meshulam.pageCodes.applePay,
  google_pay: siteConfig.meshulam.pageCodes.googlePay,
};

// Always use the main domain for redirects, not Vercel URL
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || siteConfig.url;
const WP_URL = process.env.NEXT_PUBLIC_WORDPRESS_URL || siteConfig.wordpressUrl;
// Use Vercel URL for Meshulam callbacks (bypasses Cloudflare blocking)
const VERCEL_URL = siteConfig.vercelUrl || 'https://bellano.vercel.app';

interface CustomerData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

interface PaymentItem {
  name: string;
  price: number;
  quantity: number;
  sku: string;
}

type PaymentMethodType = 'credit_card' | 'bit' | 'apple_pay' | 'google_pay';

interface CreatePaymentRequest {
  order_id: number;
  amount: number;
  customer: CustomerData;
  payments: number;
  items: PaymentItem[];
  payment_type?: PaymentMethodType;
}

// Get Meshulam user ID and page codes from WordPress
async function getMeshulamConfig(): Promise<{ userId: string; pageCodes: typeof PAGE_CODES }> {
  const fallbackUserId = siteConfig.meshulam.userId || 'e1ee96ba76032485';
  
  try {
    const response = await fetch(getApiEndpoint('meshulam-config'));
    if (response.ok) {
      const data = await response.json();
      return {
        userId: data.userId || fallbackUserId,
        pageCodes: {
          credit_card: data.pageCodes?.credit_card || PAGE_CODES.credit_card,
          bit: data.pageCodes?.bit || PAGE_CODES.bit,
          apple_pay: data.pageCodes?.apple_pay || PAGE_CODES.apple_pay,
          google_pay: data.pageCodes?.google_pay || PAGE_CODES.google_pay,
        }
      };
    }
  } catch (error) {
    console.error('Error fetching Meshulam config:', error);
  }
  return { userId: fallbackUserId, pageCodes: PAGE_CODES }; // Fallback
}

export async function POST(request: NextRequest) {
  try {
    const body: CreatePaymentRequest = await request.json();
    const { order_id, amount, customer, payments, items, payment_type = 'credit_card' } = body;

    // Get config from WordPress (or use fallback)
    const config = await getMeshulamConfig();
    
    // Determine if sandbox mode
    const isSandbox = siteConfig.meshulam.isSandbox;
    
    // Get the correct page code for the payment method
    const pageCode = config.pageCodes[payment_type] || PAGE_CODES.credit_card;

    // Log config for debugging
    console.log('Meshulam config:', {
      isSandbox,
      pageCode,
      userId: config.userId,
    });

    // Use WordPress proxy to bypass Imperva blocking on Vercel
    const proxyUrl = getApiEndpoint('meshulam-proxy');
    
    // Use admin.bellano.co.il for Meshulam callbacks - it's on an Israeli server
    // and has X-Frame-Options: ALLOWALL set, which allows iframe redirects
    const WP_CALLBACK_URL = 'https://admin.bellano.co.il';
    
    // WordPress wc-api will receive the callback, update the order, and redirect to Next.js success page
    const successUrl = `${WP_CALLBACK_URL}/?wc-api=bellano_meshulam_success`;
    
    const proxyData = {
      sandbox: isSandbox,
      pageCode,
      sum: amount,
      fullName: `${customer.firstName} ${customer.lastName}`,
      phone: customer.phone,
      email: customer.email,
      payments,
      orderId: order_id.toString(),
      description: `הזמנה #${order_id} - ${siteConfig.name}`,
      // Success callback goes to WordPress (Israeli server - Meshulam allows it)
      successUrl: successUrl,
      cancelUrl: `${SITE_URL}/checkout?cancelled=true`,
      // Notify also goes to WordPress for order status updates
      notifyUrl: `${WP_CALLBACK_URL}/?wc-api=bellano_meshulam_notify`,
      items: items.map(item => ({
        sku: item.sku,
        price: item.price,
        name: item.name,
        quantity: item.quantity,
      })),
    };

    console.log('Calling WordPress proxy:', proxyUrl);
    console.log('Success URL:', successUrl);

    // Call WordPress proxy instead of Meshulam directly
    const response = await fetch(proxyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(proxyData),
    });

    const data = await response.json();
    
    console.log('Proxy response:', data);

    if (!data.success) {
      return NextResponse.json(
        { 
          success: false, 
          message: data.message || 'שגיאה ביצירת תהליך התשלום' 
        },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      payment_url: data.payment_url,
      process_id: data.process_id,
      process_token: data.process_token,
    });

  } catch (error) {
    console.error('Error creating payment:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : 'שגיאה לא צפויה' 
      },
      { status: 500 }
    );
  }
}
