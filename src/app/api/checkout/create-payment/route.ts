import { NextRequest, NextResponse } from 'next/server';

// Meshulam API configuration
const MESHULAM_API_KEY = 'ae67b1668109'; // Production API key from Meshulam plugin

// Page codes for different payment methods (from WordPress)
const PAGE_CODES = {
  credit_card: '81e04dc34850',
  bit: 'e10278843d0e', // Will be fetched from WordPress
  apple_pay: 'e10278843d0e', // Will be fetched from WordPress
  google_pay: 'e10278843d0e', // Will be fetched from WordPress
};

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://bellano.vercel.app';
const WP_URL = process.env.NEXT_PUBLIC_WORDPRESS_URL || 'https://bellano.co.il';

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
  try {
    const response = await fetch(`${WP_URL}/wp-json/bellano/v1/meshulam-config`);
    if (response.ok) {
      const data = await response.json();
      return {
        userId: data.userId || 'e1ee96ba76032485',
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
  return { userId: 'e1ee96ba76032485', pageCodes: PAGE_CODES }; // Fallback
}

export async function POST(request: NextRequest) {
  try {
    const body: CreatePaymentRequest = await request.json();
    const { order_id, amount, customer, payments, items, payment_type = 'credit_card' } = body;

    // Get config from WordPress (or use fallback)
    const config = await getMeshulamConfig();
    
    // Determine if sandbox mode (check WordPress or env)
    const isSandbox = process.env.MESHULAM_SANDBOX === 'true';
    const apiUrl = isSandbox 
      ? 'https://sandbox.meshulam.co.il/api/light/server/1.0/createPaymentProcess'
      : 'https://secure.meshulam.co.il/api/light/server/1.0/createPaymentProcess';
    
    const apiKey = isSandbox ? '305a9a777e42' : MESHULAM_API_KEY;
    
    // Get the correct page code for the payment method
    const pageCode = config.pageCodes[payment_type] || PAGE_CODES.credit_card;

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
    formData.append('description', `הזמנה #${order_id} - בלאנו`);
    
    // Callback URLs
    formData.append('successUrl', `${SITE_URL}/checkout/success?order_id=${order_id}`);
    formData.append('cancelUrl', `${SITE_URL}/checkout?cancelled=true`);
    
    // Webhook URL - goes to WordPress to update order status
    formData.append('notifyUrl', `${WP_URL}/wp-json/bellano/v1/meshulam-webhook`);
    
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

    const data = await response.json();

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
