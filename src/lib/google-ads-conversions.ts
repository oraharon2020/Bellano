// Google Ads — server-side conversion upload via the Data Manager API.
//
// Google sunset ConversionUploadService.UploadClickConversions for new
// integrations; the current path is the Data Manager API `events:ingest`.
// Uploads a purchase event straight to Google Ads from a trusted server context
// (the Meshulam payment webhook), keyed by the click's `gclid` captured at order
// creation — immune to ad blockers / iOS / users who never return to the
// thank-you page — so Google Ads stops under-counting ad-driven purchases.
//
// De-duplicated against the browser tag by `transactionId` (order id). That
// only works inside ONE conversion action, so the destination must be the same
// action the browser tag fires (see meshulam-webhook/route.ts).
//
// Auth, in order of preference:
//   1. A dedicated service account (GOOGLE_ADS_SA_KEY). Signs its own RS256 JWT
//      and swaps it for an access token — nothing expires or gets revoked when
//      someone's Google password, 2FA or OAuth consent changes. The service
//      account's e-mail must be a user on the Google Ads account (Admin → Access
//      and security), or Google answers PERMISSION_DENIED.
//   2. A user OAuth refresh token (GOOGLE_OAUTH_*), used only when no service
//      account key is set. This is what failed on the first real order: Google
//      rejected the refresh token and nobody knew whose it was.
//
// Secrets come from env only (never the client):
//   GOOGLE_ADS_CUSTOMER_ID            – the Ads account id (digits only)
//   GOOGLE_ADS_LOGIN_CUSTOMER_ID      – optional; manager id when the credential
//                                       is a user on a parent MCC, not on the
//                                       account itself
//   GOOGLE_ADS_CONVERSION_ACTION_ID   – numeric id of the Purchase conversion action
//   GOOGLE_ADS_SA_KEY                 – the service account's JSON key file,
//                                       base64-encoded on one line
//                                       (`base64 -i key.json | tr -d '\n'`).
//                                       Base64 so the PEM's newlines survive
//                                       every copy/paste; raw JSON is accepted too.
//   GOOGLE_OAUTH_CLIENT_ID            – fallback: OAuth client id
//   GOOGLE_OAUTH_CLIENT_SECRET        – fallback: OAuth client secret
//   GOOGLE_OAUTH_REFRESH_TOKEN        – fallback: refresh token WITH the
//                                       .../auth/datamanager scope
//
// Every network call has an 8 s timeout. The webhook runs this in after(),
// once Meshulam has its answer; the cap keeps a hung Google call from holding
// the function open until its maxDuration.

import crypto from 'crypto';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const INGEST_URL = 'https://datamanager.googleapis.com/v1/events:ingest';
export const DATA_MANAGER_SCOPE = 'https://www.googleapis.com/auth/datamanager';

const FETCH_TIMEOUT_MS = 8000;
/** Refresh a cached token this long before Google says it expires. */
const TOKEN_REFRESH_MARGIN_MS = 5 * 60 * 1000;
/** Google accepts service-account assertions valid for at most one hour. */
const ASSERTION_LIFETIME_S = 3600;

const digits = (v?: string) => (v || '').replace(/\D/g, '');

/** Read env at call time, not import time, so a test can set it per case. */
function readConfig() {
  return {
    customerId: digits(process.env.GOOGLE_ADS_CUSTOMER_ID),
    loginCustomerId: digits(process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID),
    conversionActionId: digits(process.env.GOOGLE_ADS_CONVERSION_ACTION_ID),
    serviceAccountKey: (process.env.GOOGLE_ADS_SA_KEY || '').trim(),
    oauthClientId: process.env.GOOGLE_OAUTH_CLIENT_ID,
    oauthClientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    oauthRefreshToken: process.env.GOOGLE_OAUTH_REFRESH_TOKEN,
  };
}

/** One line, no control characters, bounded — for anything Google sends back. */
function clip(value: unknown, max = 200): string {
  const s = String(value ?? '').replace(/\p{Cc}+/gu, ' ').trim();
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

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

// ---------------------------------------------------------------------------
// Service-account auth (RFC 7523 JWT bearer grant), Node crypto only.
// ---------------------------------------------------------------------------

export interface ServiceAccountKey {
  client_email: string;
  private_key: string;
  private_key_id?: string;
}

/**
 * Decode GOOGLE_ADS_SA_KEY (base64 of the JSON key file, or the JSON itself).
 * Throws with a message that never contains any part of the value.
 */
export function parseServiceAccountKey(raw: string): ServiceAccountKey {
  const trimmed = (raw || '').trim();
  if (!trimmed) throw new Error('GOOGLE_ADS_SA_KEY is empty');

  let parsed: Record<string, unknown>;
  try {
    const json = trimmed.startsWith('{') ? trimmed : Buffer.from(trimmed, 'base64').toString('utf8');
    parsed = JSON.parse(json);
  } catch {
    throw new Error('GOOGLE_ADS_SA_KEY is neither JSON nor base64 of JSON');
  }
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('GOOGLE_ADS_SA_KEY is not a JSON object');
  }
  if (parsed.type !== undefined && parsed.type !== 'service_account') {
    throw new Error('GOOGLE_ADS_SA_KEY is not a service-account key (type is not "service_account")');
  }
  const email = parsed.client_email;
  if (typeof email !== 'string' || !email.includes('@')) {
    throw new Error('GOOGLE_ADS_SA_KEY has no client_email');
  }
  if (typeof parsed.private_key !== 'string' || !parsed.private_key.includes('PRIVATE KEY')) {
    throw new Error('GOOGLE_ADS_SA_KEY has no private_key');
  }
  // A key pasted through one JSON encoding too many arrives with literal "\n".
  const privateKey = parsed.private_key.replace(/\\n/g, '\n');
  try {
    crypto.createPrivateKey(privateKey);
  } catch {
    throw new Error('GOOGLE_ADS_SA_KEY private_key is not a readable PEM key');
  }
  return {
    client_email: email,
    private_key: privateKey,
    private_key_id: typeof parsed.private_key_id === 'string' ? parsed.private_key_id : undefined,
  };
}

/** The signed assertion Google's token endpoint swaps for an access token. */
export function buildServiceAccountAssertion(
  key: ServiceAccountKey,
  nowSeconds: number = Math.floor(Date.now() / 1000)
): string {
  const header: Record<string, string> = { alg: 'RS256', typ: 'JWT' };
  if (key.private_key_id) header.kid = key.private_key_id;
  const claims = {
    iss: key.client_email,
    scope: DATA_MANAGER_SCOPE,
    aud: TOKEN_URL,
    iat: nowSeconds,
    exp: nowSeconds + ASSERTION_LIFETIME_S,
  };
  const encode = (part: object) => Buffer.from(JSON.stringify(part)).toString('base64url');
  const signingInput = `${encode(header)}.${encode(claims)}`;
  // RSASSA-PKCS1-v1_5 + SHA-256 = RS256.
  const signature = crypto.sign('sha256', Buffer.from(signingInput), key.private_key).toString('base64url');
  return `${signingInput}.${signature}`;
}

// ---------------------------------------------------------------------------
// Access token, cached in module scope (one per warm function instance).
// ---------------------------------------------------------------------------

type CredentialKind = 'service_account' | 'refresh_token';
type TokenResult = { ok: true; token: string } | { ok: false; error: string };

let cachedToken: { value: string; expiresAt: number } | null = null;

/** Tests only: forget the cached access token. */
export function resetGoogleAdsTokenCache(): void {
  cachedToken = null;
}

function describeFetchFailure(e: unknown): string {
  const err = e as { name?: string; message?: string; cause?: { code?: string } };
  if (err?.name === 'TimeoutError' || err?.name === 'AbortError') {
    return `timed out after ${FETCH_TIMEOUT_MS} ms`;
  }
  const code = err?.cause?.code ? ` (${clip(err.cause.code, 40)})` : '';
  return `network error: ${clip(err?.message || e, 120)}${code}`;
}

/**
 * Google's own error code (invalid_grant, invalid_client, unauthorized_client…)
 * plus its short description. Only those two fields are read, so neither the
 * assertion, the client secret nor the refresh token can end up in a log.
 */
function describeOAuthError(status: number, body: unknown): string {
  const b = (body && typeof body === 'object' ? body : {}) as { error?: unknown; error_description?: unknown };
  const code = typeof b.error === 'string' ? clip(b.error, 60) : 'no error code';
  const detail = typeof b.error_description === 'string' ? ` – ${clip(b.error_description, 160)}` : '';
  return `HTTP ${status} ${code}${detail}`;
}

async function exchangeForToken(body: URLSearchParams, kind: CredentialKind): Promise<TokenResult> {
  let res: Response;
  try {
    res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
  } catch (e) {
    return { ok: false, error: `token exchange failed (${kind}): ${describeFetchFailure(e)}` };
  }
  const json = await res.json().catch(() => ({}));
  if (res.ok && typeof json?.access_token === 'string' && json.access_token) {
    const ttlSeconds = Number(json.expires_in) > 0 ? Number(json.expires_in) : 3600;
    cachedToken = { value: json.access_token, expiresAt: Date.now() + ttlSeconds * 1000 };
    return { ok: true, token: json.access_token };
  }
  return { ok: false, error: `token exchange failed (${kind}): ${describeOAuthError(res.status, json)}` };
}

/** A Data Manager access token: cached one, else service account, else refresh token. */
export async function getGoogleAdsAccessToken(): Promise<TokenResult> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - TOKEN_REFRESH_MARGIN_MS) {
    return { ok: true, token: cachedToken.value };
  }
  cachedToken = null;
  const cfg = readConfig();

  if (cfg.serviceAccountKey) {
    let assertion: string;
    try {
      assertion = buildServiceAccountAssertion(parseServiceAccountKey(cfg.serviceAccountKey));
    } catch (e) {
      return { ok: false, error: `token exchange failed (service_account): ${clip((e as Error)?.message, 120)}` };
    }
    return exchangeForToken(
      new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
      'service_account'
    );
  }

  if (cfg.oauthClientId && cfg.oauthClientSecret && cfg.oauthRefreshToken) {
    return exchangeForToken(
      new URLSearchParams({
        client_id: cfg.oauthClientId,
        client_secret: cfg.oauthClientSecret,
        refresh_token: cfg.oauthRefreshToken,
        grant_type: 'refresh_token',
      }),
      'refresh_token'
    );
  }

  return { ok: false, error: 'no Google credentials configured (GOOGLE_ADS_SA_KEY or GOOGLE_OAUTH_*)' };
}

/**
 * A Google API error as one readable line: HTTP status, canonical status,
 * message and the machine reasons (ErrorInfo.reason, field violations).
 */
function describeApiError(status: number, body: unknown): string {
  const err = (body as { error?: unknown })?.error as
    | { status?: unknown; message?: unknown; details?: unknown }
    | undefined;
  if (!err || typeof err !== 'object') return `HTTP ${status}`;

  const reasons: string[] = [];
  for (const d of Array.isArray(err.details) ? err.details : []) {
    const detail = d as { reason?: unknown; fieldViolations?: unknown };
    if (typeof detail?.reason === 'string') reasons.push(detail.reason);
    for (const v of Array.isArray(detail?.fieldViolations) ? detail.fieldViolations : []) {
      const fv = v as { field?: unknown; reason?: unknown; description?: unknown };
      reasons.push(`${clip(fv.field, 80)}: ${clip(fv.reason || fv.description, 80)}`);
    }
  }
  const head = [`HTTP ${status}`, typeof err.status === 'string' ? err.status : '', clip(err.message, 200)]
    .filter(Boolean)
    .join(' ');
  return clip(reasons.length ? `${head} [${[...new Set(reasons)].join('; ')}]` : head, 600);
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
  orderEntry?: string;           // the order's `_order_entry` meta
  validateOnly?: boolean;        // Google checks the request, ingests nothing
}

export interface GoogleAdsConversionResult {
  ok: boolean;
  error?: string;
  skipped?: boolean;
  requestId?: string;            // Data Manager request id, for requestStatus:retrieve
  warnings?: string;             // fieldWarnings Google returned with a success
}

/**
 * Ingest a purchase event to Google Ads via the Data Manager API. Never throws —
 * returns a result object so the caller (webhook) is unaffected.
 */
export async function sendGoogleAdsConversion(
  input: GoogleAdsConversionInput
): Promise<GoogleAdsConversionResult> {
  // A sales rep's order is never uploaded. Any click id on it would be the
  // rep's own, months old, and Google would credit that click with a sale the
  // ad never made. The browser tag skips rep orders for the same reason.
  if (input.orderEntry === 'rep') {
    return { ok: false, skipped: true, error: 'sales-rep order' };
  }
  const cfg = readConfig();
  if (!cfg.customerId || !cfg.conversionActionId) {
    return { ok: false, skipped: true, error: 'Google Ads env not configured' };
  }
  const hasClick = !!(input.gclid || input.gbraid || input.wbraid);
  const em = hashField(input.email);
  const ph = hashPhone(input.phone);
  if (!hasClick && !em && !ph) {
    return { ok: false, skipped: true, error: 'no gclid or user identifiers' };
  }

  const token = await getGoogleAdsAccessToken();
  if (!token.ok) return { ok: false, error: token.error };

  // `accountType` replaced the deprecated `product` field of ProductAccount.
  // loginAccount defaults to the operating account; it is set only when the
  // credential is a user on a manager account above it.
  const destination: Record<string, unknown> = {
    operatingAccount: { accountType: 'GOOGLE_ADS', accountId: cfg.customerId },
    productDestinationId: cfg.conversionActionId,
  };
  if (cfg.loginCustomerId && cfg.loginCustomerId !== cfg.customerId) {
    destination.loginAccount = { accountType: 'GOOGLE_ADS', accountId: cfg.loginCustomerId };
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

  const payload: Record<string, unknown> = {
    destinations: [destination],
    events: [event],
    encoding: 'HEX',
  };
  if (input.validateOnly) payload.validateOnly = true;

  // No developer-token / login-customer-id headers: the Data Manager API
  // ignores request headers on ingestion and reads the accounts from the body.
  let res: Response;
  try {
    res = await fetch(INGEST_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
  } catch (e) {
    return { ok: false, error: `ingest ${describeFetchFailure(e)}` };
  }

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    // A token Google no longer accepts must not be reused for the next order.
    if (res.status === 401) cachedToken = null;
    return { ok: false, error: describeApiError(res.status, json) };
  }

  const result: GoogleAdsConversionResult = { ok: true };
  if (typeof json?.requestId === 'string') result.requestId = json.requestId;
  if (Array.isArray(json?.fieldWarnings) && json.fieldWarnings.length) {
    result.warnings = clip(
      json.fieldWarnings
        .map((w: { field?: unknown; reason?: unknown }) => `${clip(w?.field, 80)}: ${clip(w?.reason, 80)}`)
        .join('; '),
      400
    );
  }
  return result;
}
