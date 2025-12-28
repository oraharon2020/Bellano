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
  tambour_color?: string;
  tambour_price?: number;
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
  bundle_discount?: number; // Bundle discount percentage
  price?: string; // Actual price (may include bundle discount)
  original_price?: string; // Original price before bundle discount
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

interface UtmData {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  gclid?: string;
  fbclid?: string;
  landing_page?: string;
  referrer?: string;
  timestamp?: string;
}

interface CreateOrderRequest {
  customer: CustomerData;
  items: OrderItem[];
  shipping_method: string;
  payment_method?: 'credit_card' | 'phone_order';
  coupon_code?: string | null;
  utm_data?: UtmData | null;
}

// Helper to determine traffic source label
function getTrafficSourceLabel(utm: UtmData | null | undefined): string {
  if (!utm) return 'ישיר';
  
  if (utm.gclid) return 'Google Ads';
  if (utm.fbclid) return 'Facebook Ads';
  
  if (utm.utm_source) {
    const source = utm.utm_source.toLowerCase();
    if (source.includes('google')) return 'Google';
    if (source.includes('facebook') || source.includes('fb')) return 'Facebook';
    if (source.includes('instagram') || source.includes('ig')) return 'Instagram';
    if (source.includes('tiktok')) return 'TikTok';
    if (source.includes('email') || source.includes('newsletter')) return 'Email';
    return utm.utm_source;
  }
  
  if (utm.referrer) {
    if (utm.referrer.includes('google')) return 'Google (אורגני)';
    if (utm.referrer.includes('facebook')) return 'Facebook (אורגני)';
    return 'הפניה';
  }
  
  return 'ישיר';
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateOrderRequest = await request.json();
    const { customer, items, shipping_method, payment_method = 'credit_card', coupon_code, utm_data } = body;

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
        quantity: item.quantity,
      };
      
      // Initialize meta_data array
      lineItem.meta_data = [];
      
      // Add variation_id - WooCommerce handles displaying attributes
      if (item.variation_id) {
        lineItem.variation_id = item.variation_id;
      }
      
      // Add variation attributes as meta_data for display in emails
      // Use special format that WooCommerce will display in emails
      if (item.variation_attributes && item.variation_attributes.length > 0) {
        item.variation_attributes.forEach((attr) => {
          // Use bellano_attr_ prefix (without underscore at start - WooCommerce hides underscore-prefixed meta)
          lineItem.meta_data.push({ 
            key: `bellano_attr_${attr.name.replace(/\s+/g, '_')}`,
            value: attr.value,
            display_key: attr.name,
            display_value: attr.value
          });
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
        // Tambour color - add to order meta
        if (item.admin_fields.tambour_color) {
          lineItem.meta_data.push({ 
            key: 'צבע טמבור', 
            value: item.admin_fields.tambour_color + (item.admin_fields.tambour_price ? ` (+${item.admin_fields.tambour_price}₪)` : '')
          });
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
      
      // Handle bundle discount - override price if bundle discount applied
      if (item.bundle_discount && item.bundle_discount > 0 && item.price) {
        const bundlePrice = parseFloat(item.price.replace(/[^\d.]/g, ''));
        if (!isNaN(bundlePrice) && bundlePrice > 0) {
          lineItem.price = bundlePrice;
          lineItem.subtotal = (bundlePrice * item.quantity).toString();
          lineItem.total = (bundlePrice * item.quantity).toString();
          lineItem.meta_data.push({ 
            key: 'הנחת באנדל', 
            value: `${item.bundle_discount}%` 
          });
          if (item.original_price) {
            lineItem.meta_data.push({ 
              key: 'מחיר מקורי', 
              value: item.original_price 
            });
          }
        }
      }
      
      return lineItem;
    });
    
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
          key: 'bellano_created_via',
          value: 'bellano_nextjs_checkout',
        },
        ...(hasAdminFields ? [{ key: 'bellano_sales_rep_order', value: 'yes' }] : []),
        // Traffic source tracking
        {
          key: 'מקור הגעה',
          value: getTrafficSourceLabel(utm_data),
        },
        ...(utm_data?.utm_source ? [{ key: '_utm_source', value: utm_data.utm_source }] : []),
        ...(utm_data?.utm_medium ? [{ key: '_utm_medium', value: utm_data.utm_medium }] : []),
        ...(utm_data?.utm_campaign ? [{ key: '_utm_campaign', value: utm_data.utm_campaign }] : []),
        ...(utm_data?.gclid ? [{ key: '_gclid', value: utm_data.gclid }] : []),
        ...(utm_data?.fbclid ? [{ key: '_fbclid', value: utm_data.fbclid }] : []),
        ...(utm_data?.landing_page ? [{ key: '_landing_page', value: utm_data.landing_page }] : []),
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
