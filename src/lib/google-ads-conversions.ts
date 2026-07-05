// Google Ads — server-side offline conversion import via the Data Manager API.
//
// Google sunset ConversionUploadService.UploadClickConversions for new
// integrations; the current path is the Data Manager API `events:ingest`.
// Uploads a purchase event straight to Google Ads from a trusted server context
// (the Meshulam payment webhook), keyed by the click's `gclid` captured at order
// creation — immune to ad blockers / iOS / users who never return to the
// thank-you page — so Google Ads stops under-counting ad-driven purchases.
//
// De-duplicated against the browser tag by `transactionId` (order id).
//
// Secrets come from env only (never the client):
//   GOOGLE_ADS_CUSTOMER_ID            – the Ads account id (digits only)
//   GOOGLE_ADS_LOGIN_CUSTOMER_ID      – optional; manager id when going via MCC
//   GOOGLE_ADS_CONVERSION_ACTION_ID   – numeric id of the Purchase conversion action
//   GOOGLE_ADS_DEVELOPER_TOKEN        – optional; sent as developer-token header
//   GOOGLE_OAUTH_CLIENT_ID            – OAuth client id
//   GOOGLE_OAUTH_CLIENT_SECRET        – OAuth client secret
//   GOOGLE_OAUTH_REFRESH_TOKEN        – OAuth refresh token WITH the
//                                       .../auth/datamanager scope

import crypto from 'crypto';

const DEVELOPER_TOKEN = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
const CUSTOMER_ID = (process.env.GOOGLE_ADS_CUSTOMER_ID || '').replace(/\D/g, '');
const LOGIN_CUSTOMER_ID = (process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID || '').replace(/\D/g, '');
const CONVERSION_ACTION_ID = (process.env.GOOGLE_ADS_CONVERSION_ACTION_ID || '').replace(/\D/g, '');
const OAUTH_CLIENT_ID = process.env.GOOGLE_OAUTH_CLIENT_ID;
const OAUTH_CLIENT_SECRET = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
const OAUTH_REFRESH_TOKEN = process.env.GOOGLE_OAUTH_REFRESH_TOKEN;

const INGEST_URL = 'https://datamanager.googleapis.com/v1/events:ingest';

function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

/** Lowercase + trim then hash. Google requires SHA-256 of normalized values. */
function hashField(value?: string | null): string | undefined {
  if (!value) return undefined;
  const v = value.trim().toLowerCase();
  return v ? sha256(v) : undefined;
}

/** Normalize an Israeli phone to E.164 (+972…) then hash. */
function hashPhone(phone?: string | null): string | undefined {
  if (!phone) return undefined;
  let p = phone.replace(/\D/g, '');
  if (!p) return undefined;
  if (p.startsWith('00')) p = p.slice(2);
  if (p.startsWith('0')) p = '972' + p.slice(1);
  else if (!p.startsWith('972')) p = '972' + p;
  return sha256('+' + p);
}

/** Exchange the offline refresh token for a short-lived access token. */
async function getAccessToken(): Promise<string | null> {
  if (!OAUTH_CLIENT_ID || !OAUTH_CLIENT_SECRET || !OAUTH_REFRESH_TOKEN) return null;
  try {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: OAUTH_CLIENT_ID,
        client_secret: OAUTH_CLIENT_SECRET,
        refresh_token: OAUTH_REFRESH_TOKEN,
        grant_type: 'refresh_token',
      }),
    });
    const json = await res.json().catch(() => ({}));
    return res.ok && json?.access_token ? (json.access_token as string) : null;
  } catch {
    return null;
  }
}

export interface GoogleAdsConversionInput {
  orderId: string;               // dedup key (transaction id)
  gclid?: string;                // click id captured at order creation
  gbraid?: string;               // iOS web-to-app click id
  wbraid?: string;               // iOS app-to-web click id
  value: number;
  currency: string;              // e.g. 'ILS'
  conversionDate?: Date;         // defaults to now
  email?: string;                // enhanced-conversions fallback match
  phone?: string;
}

/**
 * Ingest a purchase event to Google Ads via the Data Manager API. Never throws —
 * returns a result object so the caller (webhook) is unaffected.
 */
export async function sendGoogleAdsConversion(
  input: GoogleAdsConversionInput
): Promise<{ ok: boolean; error?: string; skipped?: boolean }> {
  if (!CUSTOMER_ID || !CONVERSION_ACTION_ID) {
    return { ok: false, skipped: true, error: 'Google Ads env not configured' };
  }
  const hasClick = !!(input.gclid || input.gbraid || input.wbraid);
  const em = hashField(input.email);
  const ph = hashPhone(input.phone);
  if (!hasClick && !em && !ph) {
    return { ok: false, skipped: true, error: 'no gclid or user identifiers' };
  }

  const accessToken = await getAccessToken();
  if (!accessToken) return { ok: false, error: 'oauth token exchange failed' };

  const destination: Record<string, unknown> = {
    operatingAccount: { product: 'GOOGLE_ADS', accountId: CUSTOMER_ID },
    productDestinationId: CONVERSION_ACTION_ID,
  };
  if (LOGIN_CUSTOMER_ID) {
    destination.loginAccount = { product: 'GOOGLE_ADS', accountId: LOGIN_CUSTOMER_ID };
  }

  const adIdentifiers: Record<string, string> = {};
  if (input.gclid) adIdentifiers.gclid = input.gclid;
  if (input.gbraid) adIdentifiers.gbraid = input.gbraid;
  if (input.wbraid) adIdentifiers.wbraid = input.wbraid;

  const userIdentifiers: Array<Record<string, string>> = [];
  if (em) userIdentifiers.push({ emailAddress: em });
  if (ph) userIdentifiers.push({ phoneNumber: ph });

  const event: Record<string, unknown> = {
    transactionId: input.orderId,
    eventTimestamp: (input.conversionDate || new Date()).toISOString(),
    eventSource: 'WEB',
    currency: input.currency,
    conversionValue: input.value,
  };
  if (Object.keys(adIdentifiers).length) event.adIdentifiers = adIdentifiers;
  if (userIdentifiers.length) event.userData = { userIdentifiers };

  const payload = {
    destinations: [destination],
    events: [event],
    encoding: 'HEX',
  };

  try {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    };
    if (DEVELOPER_TOKEN) headers['developer-token'] = DEVELOPER_TOKEN;
    if (LOGIN_CUSTOMER_ID) headers['login-customer-id'] = LOGIN_CUSTOMER_ID;

    const res = await fetch(INGEST_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, error: JSON.stringify(json?.error || json) };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}
