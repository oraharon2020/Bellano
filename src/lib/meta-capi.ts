// Meta (Facebook) Conversions API — server-side purchase reporting.
//
// Sends a server "Purchase" event straight to the Graph API from a trusted
// server context (the Meshulam payment webhook). This is immune to ad
// blockers / iOS / Safari ITP. It is de-duplicated against the browser Pixel
// via a shared `event_id` (order_<id>), so Meta counts each purchase once.
//
// Secrets come from env only (never the client):
//   META_PIXEL_ID            – the Bellano dataset/pixel id
//   META_CAPI_ACCESS_TOKEN   – Conversions API access token
//   META_CAPI_TEST_CODE      – optional; set while testing in Events Manager

import crypto from 'crypto';

const PIXEL_ID = process.env.META_PIXEL_ID;
const ACCESS_TOKEN = process.env.META_CAPI_ACCESS_TOKEN;
const TEST_CODE = process.env.META_CAPI_TEST_CODE;
const API_VERSION = 'v21.0';

function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

/** Lowercase + trim then hash. Meta requires SHA-256 of normalized values. */
function hashField(value?: string | null): string | undefined {
  if (!value) return undefined;
  const v = value.trim().toLowerCase();
  return v ? sha256(v) : undefined;
}

/** Normalize an Israeli phone to E.164 digits (972…) then hash. */
function hashPhone(phone?: string | null): string | undefined {
  if (!phone) return undefined;
  let p = phone.replace(/\D/g, '');
  if (!p) return undefined;
  if (p.startsWith('00')) p = p.slice(2);
  if (p.startsWith('0')) p = '972' + p.slice(1);
  else if (!p.startsWith('972')) p = '972' + p;
  return sha256(p);
}

export interface MetaPurchaseInput {
  eventId: string;               // dedup key, e.g. `order_1234`
  eventSourceUrl?: string;
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  city?: string;
  clientIp?: string;
  userAgent?: string;
  fbp?: string;                  // _fbp cookie
  fbc?: string;                  // _fbc cookie
  value: number;
  currency: string;              // e.g. 'ILS'
  contentIds?: string[];
  contents?: { id: string; quantity: number; item_price?: number }[];
  numItems?: number;
}

/**
 * Fire a server-side Purchase to the Conversions API.
 * Never throws — returns a result object so the caller (webhook) is unaffected.
 */
export async function sendMetaPurchase(input: MetaPurchaseInput): Promise<{ ok: boolean; error?: string }> {
  if (!PIXEL_ID || !ACCESS_TOKEN) {
    return { ok: false, error: 'META CAPI env not configured' };
  }

  const userData: Record<string, unknown> = {};
  const em = hashField(input.email);      if (em) userData.em = [em];
  const ph = hashPhone(input.phone);      if (ph) userData.ph = [ph];
  const fn = hashField(input.firstName);  if (fn) userData.fn = [fn];
  const ln = hashField(input.lastName);   if (ln) userData.ln = [ln];
  const ct = hashField(input.city);       if (ct) userData.ct = [ct];
  userData.country = [sha256('il')];
  if (input.clientIp) userData.client_ip_address = input.clientIp;
  if (input.userAgent) userData.client_user_agent = input.userAgent;
  if (input.fbp) userData.fbp = input.fbp;
  if (input.fbc) userData.fbc = input.fbc;

  const event: Record<string, unknown> = {
    event_name: 'Purchase',
    event_time: Math.floor(Date.now() / 1000),
    event_id: input.eventId,
    action_source: 'website',
    user_data: userData,
    custom_data: {
      currency: input.currency,
      value: input.value,
      content_type: 'product',
      ...(input.contentIds ? { content_ids: input.contentIds } : {}),
      ...(input.contents ? { contents: input.contents } : {}),
      ...(input.numItems ? { num_items: input.numItems } : {}),
    },
  };
  if (input.eventSourceUrl) event.event_source_url = input.eventSourceUrl;

  const payload: Record<string, unknown> = { data: [event] };
  if (TEST_CODE) payload.test_event_code = TEST_CODE;

  try {
    const res = await fetch(
      `https://graph.facebook.com/${API_VERSION}/${PIXEL_ID}/events?access_token=${encodeURIComponent(ACCESS_TOKEN)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }
    );
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, error: JSON.stringify(json?.error || json) };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}
