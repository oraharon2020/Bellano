import { NextRequest, NextResponse } from 'next/server';
import { siteConfig, getApiEndpoint } from '@/config/site';

// Fallback page codes (will be overridden by WordPress settings)
const PAGE_CODES = {
  credit_card: siteConfig.meshulam.pageCodes.creditCard,
  bit: siteConfig.meshulam.pageCodes.bit,
  apple_pay: siteConfig.meshulam.pageCodes.applePay,
  google_pay: siteConfig.meshulam.pageCodes.googlePay,
};

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || siteConfig.vercelUrl;
const WP_URL = process.env.NEXT_PUBLIC_WORDPRESS_URL || siteConfig.wordpressUrl;

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
    const apiUrl = isSandbox 
      ? 'https://sandbox.meshulam.co.il/api/light/server/1.0/createPaymentProcess'
      : 'https://secure.meshulam.co.il/api/light/server/1.0/createPaymentProcess';
    
    const apiKey = isSandbox ? siteConfig.meshulam.sandboxApiKey : siteConfig.meshulam.apiKey;
    
    // Get the correct page code for the payment method
    const pageCode = config.pageCodes[payment_type] || PAGE_CODES.credit_card;

    // Log config for debugging
    console.log('Meshulam config:', {
      isSandbox,
      apiUrl,
      pageCode,
      userId: config.userId,
      hasApiKey: !!apiKey
    });

    // Build form data for Meshulam API
    const formData = new URLSearchParams();
    formData.append('pageCode', pageCode);
    formData.append('apiKey', apiKey);
    formData.append('userId', config.userId);
    
    // Amount
    formData.append('sum', amount.toFixed(2));
    
    // Customer details
    formData.append('pageField[fullName]', `${customer.firstName} ${customer.lastName}`);
    formData.append('pageField[phone]', customer.phone);
    formData.append('pageField[email]', customer.email);
    
    // Payment configuration
    formData.append('paymentNum', payments.toString());
    formData.append('chargeType', '1'); // 1 = Regular charge
    
    // Order reference
    formData.append('cField1', order_id.toString()); // Store WC order ID
    formData.append('description', `הזמנה #${order_id} - ${siteConfig.name}`);
    
    // Callback URLs
    formData.append('successUrl', `${SITE_URL}/checkout/success?order_id=${order_id}`);
    formData.append('cancelUrl', `${SITE_URL}/checkout?cancelled=true`);
    
    // Webhook URL - goes to WordPress to update order status
    formData.append('notifyUrl', getApiEndpoint('meshulam-webhook'));
    
    // Product data
    items.forEach((item, index) => {
      formData.append(`productData[${index}][catalogNumber]`, item.sku);
      formData.append(`productData[${index}][price]`, item.price.toFixed(2));
      formData.append(`productData[${index}][itemDescription]`, item.name);
      formData.append(`productData[${index}][quantity]`, item.quantity.toString());
    });

    // Call Meshulam API
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    // Get response as text first to handle HTML errors
    const responseText = await response.text();
    
    // Log for debugging
    console.log('Meshulam response status:', response.status);
    console.log('Meshulam response (first 500 chars):', responseText.substring(0, 500));
    
    // Check if response is HTML (error page)
    if (responseText.startsWith('<') || responseText.startsWith('<!')) {
      console.error('Meshulam returned HTML instead of JSON:', responseText.substring(0, 1000));
      return NextResponse.json(
        { 
          success: false, 
          message: 'שגיאה בחיבור למשולם - נסה שוב מאוחר יותר',
          debug: process.env.NODE_ENV === 'development' ? responseText.substring(0, 500) : undefined
        },
        { status: 502 }
      );
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse Meshulam response:', responseText.substring(0, 500));
      return NextResponse.json(
        { 
          success: false, 
          message: 'תשובה לא תקינה ממשולם'
        },
        { status: 502 }
      );
    }

    if (data.status !== 1 || !data.data?.url) {
      console.error('Meshulam API error:', data);
      return NextResponse.json(
        { 
          success: false, 
          message: data.err?.message || 'שגיאה ביצירת תהליך התשלום' 
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      payment_url: data.data.url,
      process_id: data.data.processId,
      process_token: data.data.processToken,
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
