import { NextRequest, NextResponse } from 'next/server';
import { siteConfig } from '@/config/site';

const WC_URL = process.env.NEXT_PUBLIC_WORDPRESS_URL || siteConfig.wordpressUrl;
const WC_KEY = process.env.WC_CONSUMER_KEY || process.env.WOOCOMMERCE_CONSUMER_KEY;
const WC_SECRET = process.env.WC_CONSUMER_SECRET || process.env.WOOCOMMERCE_CONSUMER_SECRET;

interface AdminFields {
  width?: string;
  depth?: string;
  height?: string;
  additional_fee?: string;
  additional_fee_reason?: string;
  discount_type?: 'percent' | 'fixed';
  discount_value?: string;
  free_comments?: string;
  uploaded_file?: string;
  uploaded_file_name?: string;
  original_price?: string;
  final_price?: string;
}

interface VariationAttribute {
  name: string;
  value: string;
}

interface OrderItem {
  product_id: number;
  variation_id?: number;
  quantity: number;
  variation_attributes?: VariationAttribute[];
  admin_fields?: AdminFields;
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
  coupon_code?: string | null;
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateOrderRequest = await request.json();
    const { customer, items, shipping_method, payment_method = 'credit_card', coupon_code } = body;

    // DEBUG: Log received items
    console.log('=== CREATE ORDER DEBUG ===');
    items.forEach((item, idx) => {
      console.log(`Item ${idx} variation_attributes:`, JSON.stringify(item.variation_attributes));
    });
    console.log('=== END DEBUG ===');

    if (!WC_KEY || !WC_SECRET) {
      return NextResponse.json(
        { success: false, message: 'WooCommerce credentials not configured' },
        { status: 500 }
      );
    }

    // Determine payment method settings
    const isPhoneOrder = payment_method === 'phone_order';
    
    // Check if any items have admin fields (sales rep order)
    const hasAdminFields = items.some(item => item.admin_fields);
    
    // Build line items with meta data for admin fields
    const lineItems = items.map((item) => {
      const lineItem: any = {
        product_id: item.product_id,
        // Don't send variation_id - WooCommerce auto-adds variation attributes which causes duplicates
        // We'll send all attributes as meta_data instead for full control over display
        quantity: item.quantity,
      };
      
      // Initialize meta_data array
      lineItem.meta_data = [];
      
      // Add variation_id back - WooCommerce needs it for stock management and pricing
      // WooCommerce will auto-add the variation's defined attributes (like color)
      if (item.variation_id) {
        lineItem.variation_id = item.variation_id;
      }
      
      // Add variation attributes that are NOT part of the variation definition
      // (attributes set to "Any" in WooCommerce - like length, depth, height)
      // These won't be auto-added by WooCommerce so we need to add them manually
      if (item.variation_attributes && item.variation_attributes.length > 0) {
        // Get list of attributes that WooCommerce will auto-add (from variation)
        // We'll add all attributes except the first one (color) which comes from variation
        // Actually, let's add them all with a display prefix to avoid filtering
        item.variation_attributes.forEach((attr, index) => {
          // Skip the first attribute (usually color) as it comes from variation_id
          if (index > 0) {
            lineItem.meta_data.push({ key: attr.name, value: attr.value });
          }
        });
      }
      
      // If admin fields are present, add them as meta data and override price
      if (item.admin_fields) {
        
        if (item.admin_fields.width) {
          lineItem.meta_data.push({ key: 'רוחב', value: item.admin_fields.width });
        }
        if (item.admin_fields.depth) {
          lineItem.meta_data.push({ key: 'עומק', value: item.admin_fields.depth });
        }
        if (item.admin_fields.height) {
          lineItem.meta_data.push({ key: 'גובה', value: item.admin_fields.height });
        }
        if (item.admin_fields.additional_fee) {
          lineItem.meta_data.push({ key: 'תוספת מחיר', value: item.admin_fields.additional_fee });
        }
        if (item.admin_fields.additional_fee_reason) {
          lineItem.meta_data.push({ key: 'סיבת תוספת', value: item.admin_fields.additional_fee_reason });
        }
        if (item.admin_fields.discount_type) {
          lineItem.meta_data.push({ key: 'סוג הנחה', value: item.admin_fields.discount_type === 'percent' ? 'אחוזים' : 'סכום קבוע' });
        }
        if (item.admin_fields.discount_value) {
          lineItem.meta_data.push({ key: 'ערך הנחה', value: item.admin_fields.discount_value });
        }
        if (item.admin_fields.free_comments) {
          lineItem.meta_data.push({ key: 'הערות נציג', value: item.admin_fields.free_comments });
        }
        if (item.admin_fields.uploaded_file) {
          lineItem.meta_data.push({ key: 'קובץ מצורף', value: item.admin_fields.uploaded_file });
        }
        if (item.admin_fields.uploaded_file_name) {
          lineItem.meta_data.push({ key: 'שם קובץ', value: item.admin_fields.uploaded_file_name });
        }
        if (item.admin_fields.original_price) {
          lineItem.meta_data.push({ key: 'מחיר מקורי', value: item.admin_fields.original_price });
        }
        if (item.admin_fields.final_price) {
          // Use the final price from admin fields
          const finalPrice = parseFloat(item.admin_fields.final_price.replace(/[^\d.]/g, ''));
          lineItem.price = finalPrice;
          lineItem.subtotal = (finalPrice * item.quantity).toString();
          lineItem.total = (finalPrice * item.quantity).toString();
          lineItem.meta_data.push({ key: 'מחיר סופי', value: item.admin_fields.final_price });
        }
      }
      
      return lineItem;
    });
    
    // DEBUG: Log what we're sending to WooCommerce
    console.log('=== LINE ITEMS TO WOOCOMMERCE ===');
    lineItems.forEach((item, idx) => {
      console.log(`Line Item ${idx} meta_data:`, JSON.stringify(item.meta_data));
    });
    console.log('=== END LINE ITEMS ===');
    
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
      line_items: lineItems,
      shipping_lines: [
        {
          method_id: shipping_method,
          method_title: shipping_method === 'free_shipping' ? 'משלוח חינם' : 'משלוח',
          total: '0',
        },
      ],
      customer_note: customer.notes || '',
      // Add coupon if provided
      coupon_lines: coupon_code ? [{ code: coupon_code }] : [],
      meta_data: [
        {
          key: '_created_via',
          value: 'bellano_nextjs_checkout',
        },
        ...(hasAdminFields ? [{ key: '_sales_rep_order', value: 'yes' }] : []),
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
