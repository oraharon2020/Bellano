import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// TEMPORARY diagnostic — verifies the Google Ads Data Manager env is wired in
// production. Runs OAuth + a validateOnly ingest (creates no data). Delete after.
const GATE = 'chk_9f3a7c21';

export async function GET(request: NextRequest) {
  if (request.nextUrl.searchParams.get('key') !== GATE) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const env = {
    GOOGLE_ADS_CUSTOMER_ID: !!process.env.GOOGLE_ADS_CUSTOMER_ID,
    GOOGLE_ADS_CONVERSION_ACTION_ID: !!process.env.GOOGLE_ADS_CONVERSION_ACTION_ID,
    GOOGLE_OAUTH_CLIENT_ID: !!process.env.GOOGLE_OAUTH_CLIENT_ID,
    GOOGLE_OAUTH_CLIENT_SECRET: !!process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    GOOGLE_OAUTH_REFRESH_TOKEN: !!process.env.GOOGLE_OAUTH_REFRESH_TOKEN,
    GOOGLE_ADS_DEVELOPER_TOKEN: !!process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
    GOOGLE_ADS_LOGIN_CUSTOMER_ID: !!process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID,
  };

  const cid = process.env.GOOGLE_OAUTH_CLIENT_ID || '';
  const csec = process.env.GOOGLE_OAUTH_CLIENT_SECRET || '';
  const rtok = process.env.GOOGLE_OAUTH_REFRESH_TOKEN || '';
  const customerId = (process.env.GOOGLE_ADS_CUSTOMER_ID || '').replace(/\D/g, '');
  const actionId = (process.env.GOOGLE_ADS_CONVERSION_ACTION_ID || '').replace(/\D/g, '');

  let oauth = 'skipped';
  let scopes = '';
  let ingestHttp = 0;
  let ingestBody = '';

  if (cid && csec && rtok) {
    try {
      const tr = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ client_id: cid, client_secret: csec, refresh_token: rtok, grant_type: 'refresh_token' }),
      });
      const tj = await tr.json().catch(() => ({} as Record<string, unknown>));
      const at = (tj as { access_token?: string }).access_token || '';
      oauth = at ? 'ok' : 'fail';

      if (at) {
        const ti = await fetch(`https://oauth2.googleapis.com/tokeninfo?access_token=${at}`);
        scopes = ((await ti.json().catch(() => ({}))) as { scope?: string }).scope || '';

        const ir = await fetch('https://datamanager.googleapis.com/v1/events:ingest', {
          method: 'POST',
          headers: { Authorization: `Bearer ${at}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            destinations: [{ operatingAccount: { product: 'GOOGLE_ADS', accountId: customerId }, productDestinationId: actionId }],
            encoding: 'HEX',
            validateOnly: true,
            events: [{ transactionId: 'diag_check', eventTimestamp: new Date().toISOString(), eventSource: 'WEB', currency: 'ILS', conversionValue: 1, adIdentifiers: { gclid: 'diag_dummy' } }],
          }),
        });
        ingestHttp = ir.status;
        ingestBody = (await ir.text()).slice(0, 300);
      }
    } catch (e) {
      oauth = 'error: ' + String(e);
    }
  }

  return NextResponse.json({ env, oauth, scopes, ingestHttp, ingestBody });
}
