import { NextRequest, NextResponse } from 'next/server';
import { siteConfig, getApiEndpoint } from '@/config/site';

const WP_URL = process.env.NEXT_PUBLIC_WORDPRESS_URL || siteConfig.wordpressUrl;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || siteConfig.url;

/**
 * Meshulam Success Callback
 * This endpoint receives the redirect from Meshulam after payment
 * and processes it, then redirects to the success page
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  
  // Log all params for debugging
  console.log('Meshulam callback GET params:', Object.fromEntries(searchParams));
  
  // Get order ID from cField1 (our custom field)
  const orderId = searchParams.get('cField1');
  const response = searchParams.get('response'); // 'success' or 'failure'
  const json = searchParams.get('json'); // Base64 encoded response data
  
  // Parse JSON data if present
  let meshulamData: any = null;
  if (json) {
    try {
      meshulamData = JSON.parse(Buffer.from(json, 'base64').toString('utf-8'));
      console.log('Meshulam decoded data:', meshulamData);
    } catch (e) {
      console.error('Failed to parse Meshulam JSON:', e);
    }
  }
  
  // If payment successful and we have order ID
  if (response === 'success' && orderId) {
    // Also notify WordPress webhook to update order status
    try {
      const webhookUrl = getApiEndpoint('meshulam-webhook');
      const webhookData: any = {
        status: 1,
        data: {
          customFields: { cField1: orderId },
          asmachta: meshulamData?.data?.asmachta || searchParams.get('asmachta') || '',
          transactionId: meshulamData?.data?.transactionId || searchParams.get('transactionId') || '',
          transactionToken: meshulamData?.data?.transactionToken || searchParams.get('transactionToken') || '',
        }
      };
      
      console.log('Notifying WordPress webhook:', webhookUrl);
      
      // Fire and forget - don't wait for response
      fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(webhookData),
      }).catch(err => console.error('Webhook error:', err));
      
    } catch (e) {
      console.error('Failed to notify WordPress:', e);
    }
    
    // Redirect to success page
    const successUrl = `${SITE_URL}/checkout/success?order_id=${orderId}`;
    
    // Use JavaScript redirect to break out of iframe (like Meshulam plugin does)
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>מעבר לדף תודה...</title>
        <script>
          // Break out of iframe and redirect
          if (window.top !== window.self) {
            window.top.location.href = "${successUrl}";
          } else {
            window.location.href = "${successUrl}";
          }
        </script>
      </head>
      <body style="display:flex;justify-content:center;align-items:center;height:100vh;font-family:Arial,sans-serif;direction:rtl;">
        <div style="text-align:center;">
          <p>מעבד את התשלום...</p>
          <p><a href="${successUrl}">לחץ כאן אם אינך מועבר אוטומטית</a></p>
        </div>
      </body>
      </html>
    `;
    
    return new NextResponse(html, {
      status: 200,
      headers: { 
        'Content-Type': 'text/html; charset=utf-8',
        'X-Frame-Options': 'ALLOWALL',
      },
    });
  }
  
  // Payment failed or cancelled
  if (response === 'failure' || (meshulamData?.err && meshulamData?.status !== 1)) {
    const errorMessage = meshulamData?.err?.message || 'התשלום נכשל';
    const cancelUrl = `${SITE_URL}/checkout?cancelled=true&order_id=${orderId || ''}&error=${encodeURIComponent(errorMessage)}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>חזרה לעגלה...</title>
        <script>
          if (window.top !== window.self) {
            window.top.location.href = "${cancelUrl}";
          } else {
            window.location.href = "${cancelUrl}";
          }
        </script>
      </head>
      <body style="display:flex;justify-content:center;align-items:center;height:100vh;font-family:Arial,sans-serif;direction:rtl;">
        <div style="text-align:center;">
          <p>חוזר לדף התשלום...</p>
          <p><a href="${cancelUrl}">לחץ כאן אם אינך מועבר אוטומטית</a></p>
        </div>
      </body>
      </html>
    `;
    
    return new NextResponse(html, {
      status: 200,
      headers: { 
        'Content-Type': 'text/html; charset=utf-8',
        'X-Frame-Options': 'ALLOWALL',
      },
    });
  }
  
  // No valid response - redirect to checkout
  const fallbackUrl = `${SITE_URL}/checkout`;
  return NextResponse.redirect(fallbackUrl);
}

/**
 * Meshulam also sends POST notifications
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const data: Record<string, any> = {};
    
    formData.forEach((value, key) => {
      data[key] = value;
    });
    
    console.log('Meshulam callback POST data:', data);
    
    // Forward to WordPress webhook
    try {
      const webhookUrl = getApiEndpoint('meshulam-webhook');
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    } catch (e) {
      console.error('Failed to forward to WordPress:', e);
    }
    
    // Get order ID
    const orderId = data['data[customFields][cField1]'] || data['cField1'];
    const status = data['status'];
    
    if (status === '1' && orderId) {
      const successUrl = `${SITE_URL}/checkout/success?order_id=${orderId}`;
      
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <script>
            if (window.top !== window.self) {
              window.top.location.href = "${successUrl}";
            } else {
              window.location.href = "${successUrl}";
            }
          </script>
        </head>
        <body></body>
        </html>
      `;
      
      return new NextResponse(html, {
        status: 200,
        headers: { 
          'Content-Type': 'text/html; charset=utf-8',
          'X-Frame-Options': 'ALLOWALL',
        },
      });
    }
    
    return NextResponse.json({ status: 'received' });
    
  } catch (error) {
    console.error('Meshulam callback POST error:', error);
    return NextResponse.json({ error: 'Failed to process' }, { status: 500 });
  }
}
