import { NextRequest, NextResponse } from 'next/server';
import { sendMetaPurchase } from '@/lib/meta-capi';

const WC_URL = process.env.NEXT_PUBLIC_WORDPRESS_URL || 'https://admin.bellano.co.il';
const WC_KEY = process.env.WC_CONSUMER_KEY || process.env.WOOCOMMERCE_CONSUMER_KEY;
const WC_SECRET = process.env.WC_CONSUMER_SECRET || process.env.WOOCOMMERCE_CONSUMER_SECRET;

/**
 * Meshulam Payment Webhook
 * Receives payment notifications from Meshulam and updates WooCommerce orders
 * 
 * Meshulam sends: status=1, data[customFields][cField1]=order_id, data[asmachta]=xxx
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  // Debug log
  console.log('Webhook called, WC_KEY exists:', !!WC_KEY, 'WC_SECRET exists:', !!WC_SECRET);
  
  try {
    // Parse form data (Meshulam sends as application/x-www-form-urlencoded)
    const formData = await request.formData();
    const data: Record<string, any> = {};
    
    // Convert FormData to nested object
    for (const [key, value] of formData.entries()) {
      // Handle nested keys like data[customFields][cField1]
      const matches = key.match(/^(\w+)(?:\[(\w+)\])?(?:\[(\w+)\])?$/);
      if (matches) {
        const [, root, level1, level2] = matches;
        if (level2) {
          data[root] = data[root] || {};
          data[root][level1] = data[root][level1] || {};
          data[root][level1][level2] = value;
        } else if (level1) {
          data[root] = data[root] || {};
          data[root][level1] = value;
        } else {
          data[root] = value;
        }
      } else {
        data[key] = value;
      }
    }
    
    console.log('Meshulam Webhook received:', JSON.stringify(data, null, 2));
    
    // Extract order info
    const status = parseInt(data.status as string) || 0;
    let orderId = 0;
    let transactionId = '';
    let transactionToken = '';
    let cardSuffix = '';
    
    // Meshulam nested format: data.customFields.cField1
    if (data.data?.customFields?.cField1) {
      orderId = parseInt(data.data.customFields.cField1);
      transactionId = data.data.asmachta || '';
      transactionToken = data.data.transactionToken || '';
      cardSuffix = data.data.cardSuffix || '';
    }
    // Flat format fallback
    else if (data.cField1) {
      orderId = parseInt(data.cField1 as string);
      transactionId = (data.asmachta as string) || '';
    }
    
    if (!orderId) {
      console.error('Meshulam Webhook: No order ID found');
      return NextResponse.json({ status: 'error', message: 'No order ID' }, { status: 400 });
    }
    
    console.log(`Meshulam Webhook: Processing order ${orderId}, status=${status}, asmachta=${transactionId}`);
    
    if (!WC_KEY || !WC_SECRET) {
      console.error('Meshulam Webhook: WooCommerce credentials not configured');
      return NextResponse.json({ status: 'error', message: 'Server configuration error' }, { status: 500 });
    }
    
    // Get current order status
    const orderResponse = await fetch(
      `${WC_URL}/wp-json/wc/v3/orders/${orderId}?consumer_key=${WC_KEY}&consumer_secret=${WC_SECRET}`,
      { method: 'GET', headers: { 'Content-Type': 'application/json' } }
    );
    
    if (!orderResponse.ok) {
      console.error(`Meshulam Webhook: Order ${orderId} not found`);
      return NextResponse.json({ status: 'error', message: 'Order not found' }, { status: 404 });
    }
    
    const order = await orderResponse.json();
    
    // Check if already processed
    if (['processing', 'completed'].includes(order.status)) {
      console.log(`Meshulam Webhook: Order ${orderId} already processed (${order.status})`);
      return NextResponse.json({ 
        status: 'success', 
        message: 'Already processed', 
        order_id: orderId,
        time_ms: Date.now() - startTime 
      });
    }
    
    if (status === 1) {
      // Payment successful - update order
      const updateData: Record<string, any> = {
        status: 'processing',
        transaction_id: transactionId,
        set_paid: true,
        meta_data: [
          { key: '_meshulam_transaction_id', value: transactionId },
          { key: '_paid_via', value: 'bellano_nextjs_checkout' },
          { key: '_payment_completed_at', value: new Date().toISOString() },
        ]
      };
      
      if (transactionToken) {
        updateData.meta_data.push({ key: '_meshulam_transaction_token', value: transactionToken });
      }
      if (cardSuffix) {
        updateData.meta_data.push({ key: '_meshulam_card_suffix', value: cardSuffix });
      }
      
      const updateResponse = await fetch(
        `${WC_URL}/wp-json/wc/v3/orders/${orderId}?consumer_key=${WC_KEY}&consumer_secret=${WC_SECRET}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateData),
        }
      );
      
      if (!updateResponse.ok) {
        const errorText = await updateResponse.text();
        console.error(`Meshulam Webhook: Failed to update order ${orderId}:`, errorText);
        return NextResponse.json({ status: 'error', message: 'Failed to update order' }, { status: 500 });
      }
      
      // Add order note
      await fetch(
        `${WC_URL}/wp-json/wc/v3/orders/${orderId}/notes?consumer_key=${WC_KEY}&consumer_secret=${WC_SECRET}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            note: `תשלום התקבל בהצלחה דרך משולם (Next.js Checkout)\nמספר אסמכתא: ${transactionId}${cardSuffix ? `\n4 ספרות אחרונות: ${cardSuffix}` : ''}`,
          }),
        }
      );

      // Server-side Meta Purchase (de-duplicated with the browser Pixel via
      // event_id = order_<id>). Never blocks the webhook response on failure.
      try {
        const getMeta = (k: string): string | undefined =>
          (order.meta_data || []).find((m: { key: string; value: unknown }) => m.key === k)?.value as string | undefined;
        const lineItems: Array<{ product_id: number; quantity: number; price: string | number }> = order.line_items || [];
        const capiRes = await sendMetaPurchase({
          eventId: `order_${orderId}`,
          eventSourceUrl: getMeta('_event_source_url'),
          email: order.billing?.email,
          phone: order.billing?.phone,
          firstName: order.billing?.first_name,
          lastName: order.billing?.last_name,
          city: order.billing?.city,
          clientIp: getMeta('_client_ip'),
          userAgent: getMeta('_client_user_agent'),
          fbp: getMeta('_fbp'),
          fbc: getMeta('_fbc'),
          value: parseFloat(order.total) || 0,
          currency: order.currency || 'ILS',
          contentIds: lineItems.map((li) => String(li.product_id)),
          contents: lineItems.map((li) => ({ id: String(li.product_id), quantity: li.quantity, item_price: Number(li.price) || undefined })),
          numItems: lineItems.reduce((n, li) => n + (li.quantity || 0), 0),
        });
        if (!capiRes.ok) {
          console.error(`Meta CAPI Purchase failed for order ${orderId}:`, capiRes.error);
        } else {
          console.log(`Meta CAPI Purchase sent for order ${orderId}`);
        }
      } catch (e) {
        console.error(`Meta CAPI Purchase threw for order ${orderId}:`, e);
      }

      console.log(`Meshulam Webhook: Order ${orderId} marked as processing, asmachta: ${transactionId}, time: ${Date.now() - startTime}ms`);
      
      return NextResponse.json({ 
        status: 'success', 
        order_id: orderId,
        time_ms: Date.now() - startTime 
      });
      
    } else {
      // Payment failed
      await fetch(
        `${WC_URL}/wp-json/wc/v3/orders/${orderId}?consumer_key=${WC_KEY}&consumer_secret=${WC_SECRET}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'failed' }),
        }
      );
      
      await fetch(
        `${WC_URL}/wp-json/wc/v3/orders/${orderId}/notes?consumer_key=${WC_KEY}&consumer_secret=${WC_SECRET}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ note: `תשלום משולם נכשל - סטטוס: ${status}` }),
        }
      );
      
      console.log(`Meshulam Webhook: Order ${orderId} marked as failed`);
      
      return NextResponse.json({ 
        status: 'failed', 
        order_id: orderId,
        time_ms: Date.now() - startTime 
      });
    }
    
  } catch (error) {
    console.error('Meshulam Webhook error:', error);
    return NextResponse.json({ status: 'error', message: 'Internal error' }, { status: 500 });
  }
}

// Also support GET for testing
export async function GET() {
  return NextResponse.json({ 
    status: 'ok', 
    message: 'Meshulam webhook endpoint is active',
    timestamp: new Date().toISOString()
  });
}
