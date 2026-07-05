// Google Ads — server-side offline conversion import.
//
// Uploads a purchase conversion straight to Google Ads from a trusted server
// context (the Meshulam payment webhook), keyed by the click's `gclid` that we
// captured at order creation. This is the Google equivalent of Meta CAPI: it is
// immune to ad blockers / iOS / Safari ITP / users who never return to the
// thank-you page, so Google Ads stops under-counting ad-driven purchases.
//
// It is de-duplicated against the browser tag by `orderId` (transaction id).
//
// Secrets come from env only (never the client):
//   GOOGLE_ADS_DEVELOPER_TOKEN        – Google Ads API developer token
//   GOOGLE_ADS_CUSTOMER_ID            – the account running the ads (digits only)
//   GOOGLE_ADS_LOGIN_CUSTOMER_ID      – optional; MCC/manager id (digits only)
//   GOOGLE_ADS_CONVERSION_ACTION_ID   – numeric id of the Purchase conversion action
//   GOOGLE_OAUTH_CLIENT_ID            – OAuth client id
//   GOOGLE_OAUTH_CLIENT_SECRET        – OAuth client secret
//   GOOGLE_OAUTH_REFRESH_TOKEN        – OAuth refresh token (offline access)

import crypto from 'crypto';

const DEVELOPER_TOKEN = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
const CUSTOMER_ID = (process.env.GOOGLE_ADS_CUSTOMER_ID || '').replace(/\D/g, '');
const LOGIN_CUSTOMER_ID = (process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID || '').replace(/\D/g, '');
const CONVERSION_ACTION_ID = (process.env.GOOGLE_ADS_CONVERSION_ACTION_ID || '').replace(/\D/g, '');
const OAUTH_CLIENT_ID = process.env.GOOGLE_OAUTH_CLIENT_ID;
const OAUTH_CLIENT_SECRET = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
const OAUTH_REFRESH_TOKEN = process.env.GOOGLE_OAUTH_REFRESH_TOKEN;

const API_VERSION = 'v18';

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

/** "yyyy-mm-dd hh:mm:ss+00:00" in UTC — the format Google Ads expects. */
function formatConversionDateTime(date: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return (
    `${date.getUTCFullYear()}-${p(date.getUTCMonth() + 1)}-${p(date.getUTCDate())} ` +
    `${p(date.getUTCHours())}:${p(date.getUTCMinutes())}:${p(date.getUTCSeconds())}+00:00`
  );
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
 * Upload a purchase conversion to Google Ads. Never throws — returns a result
 * object so the caller (webhook) is unaffected.
 */
export async function sendGoogleAdsConversion(
  input: GoogleAdsConversionInput
): Promise<{ ok: boolean; error?: string; skipped?: boolean }> {
  if (!DEVELOPER_TOKEN || !CUSTOMER_ID || !CONVERSION_ACTION_ID) {
    return { ok: false, skipped: true, error: 'Google Ads env not configured' };
  }
  // No click id and no user identifiers → nothing Google can attribute.
  const hasClick = !!(input.gclid || input.gbraid || input.wbraid);
  const em = hashField(input.email);
  const ph = hashPhone(input.phone);
  if (!hasClick && !em && !ph) {
    return { ok: false, skipped: true, error: 'no gclid or user identifiers' };
  }

  const accessToken = await getAccessToken();
  if (!accessToken) return { ok: false, error: 'oauth token exchange failed' };

  const conversion: Record<string, unknown> = {
    conversionAction: `customers/${CUSTOMER_ID}/conversionActions/${CONVERSION_ACTION_ID}`,
    conversionDateTime: formatConversionDateTime(input.conversionDate || new Date()),
    conversionValue: input.value,
    currencyCode: input.currency,
    orderId: input.orderId,
  };
  if (input.gclid) conversion.gclid = input.gclid;
  if (input.gbraid) conversion.gbraid = input.gbraid;
  if (input.wbraid) conversion.wbraid = input.wbraid;

  const userIdentifiers: Array<Record<string, string>> = [];
  if (em) userIdentifiers.push({ hashedEmail: em });
  if (ph) userIdentifiers.push({ hashedPhoneNumber: ph });
  if (userIdentifiers.length) conversion.userIdentifiers = userIdentifiers;

  const payload = {
    conversions: [conversion],
    partialFailure: true,
  };

  try {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${accessToken}`,
      'developer-token': DEVELOPER_TOKEN,
      'Content-Type': 'application/json',
    };
    if (LOGIN_CUSTOMER_ID) headers['login-customer-id'] = LOGIN_CUSTOMER_ID;

    const res = await fetch(
      `https://googleads.googleapis.com/${API_VERSION}/customers/${CUSTOMER_ID}:uploadClickConversions`,
      { method: 'POST', headers, body: JSON.stringify(payload) }
    );
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, error: JSON.stringify(json?.error || json) };
    }
    // partialFailureError is reported with HTTP 200 — surface it.
    if (json?.partialFailureError) {
      return { ok: false, error: JSON.stringify(json.partialFailureError) };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}
