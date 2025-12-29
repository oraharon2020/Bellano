import { NextRequest, NextResponse } from 'next/server';
import { getApiEndpoint } from '@/config/site';

/**
 * Meshulam Webhook - receives server-to-server notifications
 * Forwards the notification to WordPress to update order status
 */
export async function POST(request: NextRequest) {
  try {
    // Get form data or JSON
    let data: Record<string, any> = {};
    
    const contentType = request.headers.get('content-type') || '';
    
    if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await request.formData();
      formData.forEach((value, key) => {
        data[key] = value;
      });
    } else if (contentType.includes('application/json')) {
      data = await request.json();
    } else {
      // Try to parse as form data
      const text = await request.text();
      const params = new URLSearchParams(text);
      params.forEach((value, key) => {
        data[key] = value;
      });
    }
    
    console.log('Meshulam webhook received:', data);
    
    // Extract order info
    const status = data['status'] || data['data[status]'];
    const orderId = data['cField1'] || data['data[customFields][cField1]'];
    const asmachta = data['asmachta'] || data['data[asmachta]'];
    const transactionId = data['transactionId'] || data['data[transactionId]'];
    const transactionToken = data['transactionToken'] || data['data[transactionToken]'];
    
    console.log('Parsed webhook:', { status, orderId, asmachta, transactionId });
    
    if (!orderId) {
      console.error('No order ID in webhook');
      return NextResponse.json({ error: 'No order ID' }, { status: 400 });
    }
    
    // Forward to WordPress to update order
    const wpWebhookUrl = getApiEndpoint('meshulam-webhook');
    
    try {
      const wpResponse = await fetch(wpWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: status === '1' || status === 1 ? 1 : 0,
          data: {
            customFields: { cField1: orderId },
            asmachta: asmachta || '',
            transactionId: transactionId || '',
            transactionToken: transactionToken || '',
          }
        }),
      });
      
      const wpResult = await wpResponse.text();
      console.log('WordPress webhook response:', wpResult);
      
    } catch (wpError) {
      console.error('Failed to forward to WordPress:', wpError);
      // Continue anyway - don't fail the webhook
    }
    
    return NextResponse.json({ status: 'ok', orderId });
    
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
  }
}

// Also handle GET requests (some payment gateways use GET)
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  
  const data: Record<string, any> = {};
  searchParams.forEach((value, key) => {
    data[key] = value;
  });
  
  console.log('Meshulam webhook GET:', data);
  
  // Forward to POST handler logic
  const orderId = data['cField1'];
  const status = data['status'] || data['response'];
  
  if (orderId) {
    // Forward to WordPress
    try {
      const wpWebhookUrl = getApiEndpoint('meshulam-webhook');
      await fetch(wpWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: status === 'success' || status === '1' ? 1 : 0,
          data: {
            customFields: { cField1: orderId },
            asmachta: data['asmachta'] || '',
          }
        }),
      });
    } catch (e) {
      console.error('WordPress forward error:', e);
    }
  }
  
  return NextResponse.json({ status: 'ok' });
}
