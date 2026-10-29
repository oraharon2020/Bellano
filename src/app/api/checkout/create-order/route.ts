import { NextRequest, NextResponse } from 'next/server';
import { siteConfig } from '@/config/site';
import { checkRateLimit, getClientIp } from '@/lib/rate-limiter';
import { buildOrderAttribution } from '@/lib/attribution';
import { verifyAdminToken } from '@/lib/auth/verify-admin';
import { repSourceOrderMeta } from '@/lib/rep-source';
import { splitLineAttributes } from '@/lib/line-sizes';

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
  glass_option?: boolean;
  glass_label?: string;
  glass_price?: number;
  glass_product_id?: number;
  glass_for?: string;
  upgrades?: { name: string; price: number; qty: number }[];
}

interface VariationAttribute {
  name: string;
  value: string;
}

interface FormulaOrderData {
  dimensions: { width?: number; depth?: number; height?: number };
  price: number; // Client-calculated price - re-validated server-side before use
  labels?: { width?: string; depth?: string; height?: string }; // Custom dim labels
}

interface OrderItem {
  product_id: number;
  variation_id?: number;
  quantity: number;
  variation_attributes?: VariationAttribute[];
  admin_fields?: AdminFields;
  formula?: FormulaOrderData; // Formula pricing (custom dimensions)
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
  gbraid?: string;
  wbraid?: string;
  fbclid?: string;
  landing_page?: string;
  referrer?: string;
  timestamp?: string;
}

interface CreateOrderRequest {
  customer: CustomerData;
  items: OrderItem[];
  shipping_method: string;
  /** 'quote' — a rep's quote (his word 29/10): saved as an order in the "הצעת מחיר" status, never charged. */
  payment_method?: 'credit_card' | 'phone_order' | 'quote';
  coupon_code?: string | null;
  /** Set to 'rep' by a browser in sales-rep mode (it also sends x-admin-token). */
  order_entry?: 'rep' | 'site';
  /** First/last touch as stored by useUtmTracking; validated and re-classified here. */
  attribution?: unknown;
  /** Sent by pages loaded before `attribution` existed. */
  utm_data?: UtmData | null;
  /** "איך הלקוח הגיע אלינו?" — read only on a verified rep's order, see src/lib/rep-source.ts. */
  rep_source?: unknown;
  /** The "אחר" text that goes with `rep_source: 'other'`. */
  rep_source_note?: unknown;
}

/**
 * Re-validate a formula price server-side via the WP module
 * (POST /wp-json/nalla/v1/formula/{id}/calculate). Returns null when the
 * module is unreachable — caller falls back to the client price and flags
 * the order for manual review.
 */
async function validateFormulaPrice(
  productId: number,
  variationId: number,
  dimensions: FormulaOrderData['dimensions']
): Promise<number | null> {
  try {
    const res = await fetch(`${WC_URL}/wp-json/nalla/v1/formula/${productId}/calculate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ variation_id: variationId, dimensions }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const price = Number(data?.price);
    return Number.isFinite(price) && price > 0 ? price : null;
  } catch {
    return null;
  }
}

/**
 * Fetch the product's custom dimension labels (e.g. width → "שולחן קטן"), so
 * the WooCommerce order shows the same names the customer saw. Falls back to
 * the default רוחב/עומק/גובה when none are configured or on any error.
 */
async function fetchFormulaLabels(productId: number): Promise<Record<string, string>> {
  const defaults: Record<string, string> = { width: 'רוחב', depth: 'עומק', height: 'גובה' };
  try {
    const res = await fetch(`${WC_URL}/wp-json/nalla/v1/formula/${productId}`);
    if (!res.ok) return defaults;
    const data = await res.json();
    const labels = data?.labels;
    if (labels && typeof labels === 'object') {
      for (const dim of ['width', 'depth', 'height']) {
        if (labels[dim]) defaults[dim] = String(labels[dim]);
      }
    }
    return defaults;
  } catch {
    return defaults;
  }
}

/**
 * A link to the quote page for this order, signed for the rep whose storefront token this is (the theme's
 * order-quote-send.php checks the token with the plugin and signs a key for this order and this person, 48 hours).
 * null when WordPress cannot be reached or refuses — never thrown: the order is already saved.
 */
async function quoteLinkFor(adminToken: string, orderId: number): Promise<string | null> {
  try {
    const res = await fetch(`${WC_URL}/wp-json/nalla/v1/quote/rep-link`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Browser-like UA so the WAF does not block this server-to-server call, as verify-admin.ts does.
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
      },
      body: JSON.stringify({ token: adminToken, order: orderId }),
      cache: 'no-store',
    });
    const body = (await res.json().catch(() => null)) as { ok?: boolean; url?: string; message?: string } | null;
    if (!res.ok || !body?.ok || typeof body.url !== 'string' || !body.url.startsWith(WC_URL)) {
      console.error('Quote link refused', res.status, body?.message);
      return null;
    }
    return body.url;
  } catch (error) {
    console.error('Quote link failed:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  // Rate limit: max 5 orders per minute per IP
  const ip = getClientIp(request);
  const rateLimit = checkRateLimit(ip, { maxRequests: 5, windowSeconds: 60, prefix: 'create-order' });
  
  if (!rateLimit.allowed) {
    console.warn(`Rate limit exceeded for create-order from IP: ${ip}`);
    return NextResponse.json(
      { success: false, message: 'יותר מדי בקשות. נסו שוב בעוד דקה.' },
      { status: 429, headers: { 'Retry-After': rateLimit.resetIn.toString() } }
    );
  }

  try {
    const body: CreateOrderRequest = await request.json();
    const { customer, items, shipping_method, payment_method = 'credit_card', coupon_code, utm_data } = body;

    if (!WC_KEY || !WC_SECRET) {
      return NextResponse.json(
        { success: false, message: 'WooCommerce credentials not configured' },
        { status: 500 }
      );
    }

    // A rep must say where the customer came from before the order is placed:
    // the rep's browser carries no trace of it. Asked only of a rep whose token
    // WordPress verifies (fails closed) — the header and order_entry are the
    // browser's own word, so on their own they neither require the answer nor
    // get one stored. Checked before any line is priced, so a refusal costs
    // no formula calls.
    const adminToken = request.headers.get('x-admin-token');
    const verifiedRep = adminToken ? await verifyAdminToken(adminToken) : null;
    const repSource = repSourceOrderMeta(body, { isRep: Boolean(verifiedRep) });
    if (!repSource.ok) {
      return NextResponse.json({ success: false, message: repSource.message }, { status: repSource.status });
    }

    // Determine payment method settings
    const isPhoneOrder = payment_method === 'phone_order';
    // A quote is a rep's tool only: the order is saved in the quote status and the rep gets the quote page.
    const isQuote = payment_method === 'quote';
    if (isQuote && !verifiedRep) {
      return NextResponse.json({ success: false, message: 'הצעת מחיר זמינה לנציגים מחוברים בלבד. התחברו מחדש ונסו שוב.' }, { status: 403 });
    }
    
    // Check if any items have admin fields (sales rep order)
    const hasAdminFields = items.some(item => item.admin_fields);
    
    // Build line items with meta data for admin fields
    const lineItems = await Promise.all(items.map(async (item) => {
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
        // A size measured by hand (the rep's, or a formula's) replaces the chosen one: one size per line
        // (lib/line-sizes.ts). The replaced choice is kept out of sight, for the record.
        const measured = {
          width: item.admin_fields?.width || String(item.formula?.dimensions?.width ?? ''),
          depth: item.admin_fields?.depth || String(item.formula?.dimensions?.depth ?? ''),
          height: item.admin_fields?.height || String(item.formula?.dimensions?.height ?? ''),
        };
        const { keep, replaced } = splitLineAttributes(item.variation_attributes, measured);
        if (replaced.length) {
          lineItem.meta_data.push({ key: '_nalla_size_replaced', value: replaced.map((a) => `${a.name}: ${a.value}`).join(' · ') });
        }
        keep.forEach((attr) => {
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
        // The type only with a value: the panel starts on "percent", and an order full of "סוג הנחה: אחוזים" with no
        // discount reads as if one was given.
        if (item.admin_fields.discount_type && item.admin_fields.discount_value) {
          lineItem.meta_data.push({ key: 'סוג הנחה', value: item.admin_fields.discount_type === 'percent' ? 'אחוזים' : 'סכום קבוע' });
        }
        // The rep's upgrades are in the price already; the line says what they are, so the installer, the workshop
        // and the quote know (they were lost until 29/10: a higher price, and no word of what it bought).
        const upgrades = (item.admin_fields.upgrades || []).filter((u) => u && u.name && Number(u.qty) > 0);
        if (upgrades.length) {
          lineItem.meta_data.push({
            key: 'שדרוגים',
            value: upgrades.map((u) => `${String(u.name).slice(0, 80)}${Number(u.qty) > 1 ? ` ×${Number(u.qty)}` : ''} (+${Number(u.price) * Number(u.qty)}₪)`).join(', '),
          });
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
        // Glass option is emitted as a SEPARATE product line below (so the
        // production team clearly sees it and which product it belongs to).
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
      
      // Formula pricing (custom dimensions).
      // Regular order: recalculate the price server-side, never trust the client.
      // Sales-rep order: the admin has already set a manual final price above
      // (admin_fields.final_price), and for a formula product that price is the
      // formula dimension price MINUS the rep's discount. In that case we must
      // KEEP the rep's price and NOT overwrite it here — overwriting wiped the
      // discount, so the order total came back higher than the discounted cart
      // total and tripped the "price changed" guard at checkout.
      if (item.formula?.dimensions && item.variation_id) {
        // Unit price recorded on the line: the rep's final price when present,
        // otherwise the server-validated formula price.
        let unitPrice: number;

        if (item.admin_fields?.final_price) {
          // Keep the price the admin block already set on the line item above.
          unitPrice = parseFloat(item.admin_fields.final_price.replace(/[^\d.]/g, ''));
        } else {
          const serverPrice = await validateFormulaPrice(
            item.product_id,
            item.variation_id,
            item.formula.dimensions
          );
          unitPrice = serverPrice ?? item.formula.price;

          lineItem.price = unitPrice;
          lineItem.subtotal = (unitPrice * item.quantity).toString();
          lineItem.total = (unitPrice * item.quantity).toString();

          if (serverPrice === null) {
            console.error(
              `Formula price validation failed for product ${item.product_id} variation ${item.variation_id} - using client price ${item.formula.price}`
            );
            lineItem.meta_data.push({ key: 'אימות מחיר מידות', value: 'נכשל - יש לוודא מחיר ידנית' });
          }
        }

        // Dimension meta is emitted for BOTH paths so production always sees the
        // custom dimensions on the order.
        // Prefer labels sent with the order (what the customer actually saw);
        // fall back to fetching them from the product config.
        const dimLabels = (item.formula.labels && Object.keys(item.formula.labels).length)
          ? { width: 'רוחב', depth: 'עומק', height: 'גובה', ...item.formula.labels }
          : await fetchFormulaLabels(item.product_id);
        for (const [dim, value] of Object.entries(item.formula.dimensions)) {
          if (value == null || value === 0) continue;
          lineItem.meta_data.push({ key: dimLabels[dim] || dim, value: `${value} ס״מ` });
          // Underscore meta for parity with the WP cart module (hidden in UI)
          lineItem.meta_data.push({ key: `_nalla_formula_${dim}`, value: String(value) });
        }
        lineItem.meta_data.push({ key: '_nalla_formula_price', value: String(unitPrice) });
      }

      return lineItem;
    }));

    // Glass add-on: a SEPARATE real product line per parent product, priced
    // per unit × quantity, named so production sees exactly which product it is
    // for. Decoupled from the parent line so it can never be “swallowed”.
    for (const item of items) {
      const af = item.admin_fields;
      const gp = Number(af?.glass_price || 0);
      if (af?.glass_option && af?.glass_product_id && gp > 0) {
        const label = af.glass_label || 'תוספת זכוכית';
        lineItems.push({
          product_id: af.glass_product_id,
          quantity: item.quantity,
          name: label + (af.glass_for ? ' — ' + af.glass_for : ''),
          price: gp,
          subtotal: String(gp * item.quantity),
          total: String(gp * item.quantity),
          meta_data: af.glass_for ? [{ key: 'עבור מוצר', value: af.glass_for }] : [],
        });
      }
    }

    // Where the order came from. An order placed from a browser in sales-rep
    // mode is the rep's entry: none of that browser's touches or click ids may
    // describe the customer, so it gets channel `rep` and nothing else.
    // Header OR body flag — a rep whose token lapsed is still a rep.
    const isRepEntry = Boolean(request.headers.get('x-admin-token')) || body.order_entry === 'rep';
    const attribution = buildOrderAttribution({
      entry: isRepEntry ? 'rep' : 'site',
      attribution: body.attribution,
      legacyUtm: utm_data,
      ownHosts: [siteConfig.url, siteConfig.wordpressUrl, siteConfig.vercelUrl],
    });

    // Capture Meta CAPI signals (used server-side by the payment webhook for a
    // de-duplicated Purchase event). Stored as order meta.
    // Not on a rep's order: the cookies, IP and user agent are the rep's, and
    // sending them would credit the rep's own Facebook click with the sale.
    const fbp = isRepEntry ? '' : request.cookies.get('_fbp')?.value || '';
    let fbc = isRepEntry ? '' : request.cookies.get('_fbc')?.value || '';
    const fbclick = attribution.clicks.fbclid;
    if (!fbc && fbclick) {
      // fbc's timestamp is when the click was seen, not when the order was placed.
      fbc = `fb.1.${Date.parse(fbclick.at) || Date.now()}.${fbclick.id}`;
    }
    const clientUserAgent = isRepEntry ? '' : request.headers.get('user-agent') || '';
    const clientIp = isRepEntry ? '' : ip;
    const eventSourceUrl = isRepEntry ? '' : request.headers.get('referer') || attribution.attributed?.landing || '';

    // Create the order in WooCommerce
    const orderData = {
      payment_method: isPhoneOrder || isQuote ? 'cod' : 'meshulam',
      payment_method_title: isQuote ? 'הצעת מחיר' : isPhoneOrder ? 'תשלום דרך נציג' : 'כרטיס אשראי',
      set_paid: false,
      // 'bid' is the shops' "הצעת מחיר" status: off every sales count, the dashboard's open quotes.
      status: isQuote ? 'bid' : isPhoneOrder ? 'on-hold' : 'pending',
      billing: {
        first_name: customer.firstName,
        last_name: customer.lastName,
        // A quote may go out before the customer's e-mail is known; WooCommerce refuses an empty one.
        ...(customer.email?.trim() ? { email: customer.email.trim() } : {}),
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
        {
          key: '_bellano_nextjs_order',
          value: 'yes',
        },
        ...(hasAdminFields ? [{ key: 'bellano_sales_rep_order', value: 'yes' }] : []),
        // Traffic source: מקור הגעה, the legacy _utm_* / click-id keys (read by
        // the payment webhook's Google Ads upload), _order_entry, _nalla_channel
        // and the first/last touch — see src/lib/attribution.ts.
        ...attribution.meta,
        // What the rep marked: _nalla_rep_source(_at, _note). Empty unless verified rep.
        ...repSource.meta,
        // Meta CAPI signals (read by the payment webhook)
        ...(fbp ? [{ key: '_fbp', value: fbp }] : []),
        ...(fbc ? [{ key: '_fbc', value: fbc }] : []),
        ...(clientUserAgent ? [{ key: '_client_user_agent', value: clientUserAgent }] : []),
        ...(clientIp ? [{ key: '_client_ip', value: clientIp }] : []),
        ...(eventSourceUrl ? [{ key: '_event_source_url', value: eventSourceUrl }] : []),
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

    // The quote page with its popup (download, WhatsApp, e-mail), opened by the rep's key. Without it the order
    // still stands; the checkout says to open the quote from the order screen.
    const quoteUrl = isQuote && adminToken ? await quoteLinkFor(adminToken, data.id) : null;

    return NextResponse.json({
      success: true,
      order_id: data.id,
      ...(isQuote ? { quote_url: quoteUrl } : {}),
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
