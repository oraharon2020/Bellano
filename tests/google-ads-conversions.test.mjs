// Unit tests for src/lib/google-ads-conversions.ts — run with `npm test`
// (node --test, no dependencies). The service-account key here is a throwaway
// RSA pair generated per run; nothing talks to Google — fetch is stubbed.
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {
  DATA_MANAGER_SCOPE,
  buildServiceAccountAssertion,
  getGoogleAdsAccessToken,
  parseServiceAccountKey,
  resetGoogleAdsTokenCache,
  sendGoogleAdsConversion,
} from '../src/lib/google-ads-conversions.ts';

const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  publicKeyEncoding: { type: 'spki', format: 'pem' },
});
const KEY_FILE = {
  type: 'service_account',
  project_id: 'test-project',
  private_key_id: 'kid-0123456789abcdef',
  private_key: privateKey,
  client_email: 'uploader@test-project.iam.gserviceaccount.com',
  client_id: '100000000000000000000',
  token_uri: 'https://oauth2.googleapis.com/token',
};
const KEY_JSON = JSON.stringify(KEY_FILE);
const KEY_B64 = Buffer.from(KEY_JSON).toString('base64');
// The PEM body without its armour — what must never reach a log.
const KEY_BODY = privateKey.split('\n').slice(1, -2).join('');

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const INGEST_URL = 'https://datamanager.googleapis.com/v1/events:ingest';
const ENV_KEYS = [
  'GOOGLE_ADS_CUSTOMER_ID',
  'GOOGLE_ADS_LOGIN_CUSTOMER_ID',
  'GOOGLE_ADS_CONVERSION_ACTION_ID',
  'GOOGLE_ADS_SA_KEY',
  'GOOGLE_OAUTH_CLIENT_ID',
  'GOOGLE_OAUTH_CLIENT_SECRET',
  'GOOGLE_OAUTH_REFRESH_TOKEN',
];
const ORDER = {
  orderId: '70001',
  gclid: 'Cj0KCQtest-gclid',
  value: 4990,
  currency: 'ILS',
  conversionDate: new Date('2026-10-20T20:03:00.000Z'),
  email: 'Buyer@Example.com ',
  phone: '050-1234567',
};

const realFetch = globalThis.fetch;
let calls;

/** Stub fetch: `routes[url]` returns { status, body } or throws. */
function stubFetch(routes) {
  calls = [];
  globalThis.fetch = async (url, init = {}) => {
    calls.push({ url: String(url), init });
    const route = routes[String(url)];
    if (!route) throw new Error(`unexpected fetch ${url}`);
    const r = typeof route === 'function' ? await route(init, calls) : route;
    return new Response(JSON.stringify(r.body ?? {}), {
      status: r.status ?? 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };
}
const tokenCalls = () => calls.filter((c) => c.url === TOKEN_URL);
const ingestCalls = () => calls.filter((c) => c.url === INGEST_URL);
const decodePart = (part) => JSON.parse(Buffer.from(part, 'base64url').toString('utf8'));

beforeEach(() => {
  for (const k of ENV_KEYS) delete process.env[k];
  process.env.GOOGLE_ADS_CUSTOMER_ID = '312-816-9327';
  process.env.GOOGLE_ADS_CONVERSION_ACTION_ID = '6837155486';
  resetGoogleAdsTokenCache();
});
afterEach(() => {
  globalThis.fetch = realFetch;
  for (const k of ENV_KEYS) delete process.env[k];
});

// ---------------------------------------------------------------------------
// Key parsing
// ---------------------------------------------------------------------------

test('the key is read from base64 (the documented form) and from raw JSON alike', () => {
  for (const raw of [KEY_B64, KEY_JSON, `  ${KEY_B64}\n`]) {
    const k = parseServiceAccountKey(raw);
    assert.equal(k.client_email, KEY_FILE.client_email);
    assert.equal(k.private_key_id, KEY_FILE.private_key_id);
    assert.equal(k.private_key, privateKey);
  }
});

test('a key pasted through one JSON encoding too many still loads', () => {
  const doubled = JSON.stringify({ ...KEY_FILE, private_key: privateKey.replace(/\n/g, '\\n') });
  assert.equal(parseServiceAccountKey(doubled).private_key, privateKey);
});

test('a broken key is refused with a message that quotes none of it', () => {
  const cases = [
    ['', /empty/],
    ['not-base64-or-json!!!', /neither JSON nor base64/],
    [JSON.stringify({ ...KEY_FILE, type: 'authorized_user' }), /not a service-account key/],
    [JSON.stringify({ ...KEY_FILE, client_email: undefined }), /no client_email/],
    [JSON.stringify({ ...KEY_FILE, private_key: undefined }), /no private_key/],
    [JSON.stringify({ ...KEY_FILE, private_key: '-----BEGIN PRIVATE KEY-----\nAAAA\n-----END PRIVATE KEY-----\n' }), /not a readable PEM/],
  ];
  for (const [raw, re] of cases) {
    assert.throws(() => parseServiceAccountKey(raw), (e) => {
      assert.match(e.message, re);
      assert.ok(!e.message.includes(KEY_BODY.slice(0, 40)));
      assert.ok(!e.message.includes('AAAA'));
      return true;
    });
  }
});

// ---------------------------------------------------------------------------
// JWT assertion
// ---------------------------------------------------------------------------

test('the assertion is an RS256 JWT with the claims Google requires', () => {
  const now = 1_790_000_000;
  const jwt = buildServiceAccountAssertion(parseServiceAccountKey(KEY_B64), now);
  const parts = jwt.split('.');
  assert.equal(parts.length, 3);
  assert.deepEqual(decodePart(parts[0]), { alg: 'RS256', typ: 'JWT', kid: KEY_FILE.private_key_id });
  assert.deepEqual(decodePart(parts[1]), {
    iss: KEY_FILE.client_email,
    scope: 'https://www.googleapis.com/auth/datamanager',
    aud: TOKEN_URL,
    iat: now,
    exp: now + 3600,
  });
  assert.equal(DATA_MANAGER_SCOPE, 'https://www.googleapis.com/auth/datamanager');
  // base64url, unpadded — no '+', '/' or '='.
  for (const p of parts) assert.match(p, /^[A-Za-z0-9_-]+$/);
});

test('the signature verifies with the public key, and fails once a claim is changed', () => {
  const jwt = buildServiceAccountAssertion(parseServiceAccountKey(KEY_JSON), 1_790_000_000);
  const [h, c, sig] = jwt.split('.');
  const verify = (input) =>
    crypto.verify('sha256', Buffer.from(input), publicKey, Buffer.from(sig, 'base64url'));
  assert.equal(verify(`${h}.${c}`), true);

  const forged = Buffer.from(JSON.stringify({ ...decodePart(c), iss: 'attacker@example.com' })).toString('base64url');
  assert.equal(verify(`${h}.${forged}`), false);

  const other = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 }).publicKey;
  assert.equal(crypto.verify('sha256', Buffer.from(`${h}.${c}`), other, Buffer.from(sig, 'base64url')), false);
});

test('no kid header when the key file has no private_key_id', () => {
  const k = parseServiceAccountKey(JSON.stringify({ ...KEY_FILE, private_key_id: undefined }));
  const jwt = buildServiceAccountAssertion(k, 1_790_000_000);
  assert.deepEqual(decodePart(jwt.split('.')[0]), { alg: 'RS256', typ: 'JWT' });
});

// ---------------------------------------------------------------------------
// Token exchange + caching
// ---------------------------------------------------------------------------

test('the service account swaps a signed JWT for a token, sent as Bearer to ingest', async () => {
  process.env.GOOGLE_ADS_SA_KEY = KEY_B64;
  stubFetch({
    [TOKEN_URL]: { body: { access_token: 'ya29.sa-token', expires_in: 3599, token_type: 'Bearer' } },
    [INGEST_URL]: { body: { requestId: 'req-1' } },
  });
  const r = await sendGoogleAdsConversion(ORDER);
  assert.deepEqual(r, { ok: true, requestId: 'req-1' });

  const [t] = tokenCalls();
  const form = new URLSearchParams(String(t.init.body));
  assert.equal(form.get('grant_type'), 'urn:ietf:params:oauth:grant-type:jwt-bearer');
  const [h, c, sig] = form.get('assertion').split('.');
  assert.equal(crypto.verify('sha256', Buffer.from(`${h}.${c}`), publicKey, Buffer.from(sig, 'base64url')), true);
  assert.equal(decodePart(c).iss, KEY_FILE.client_email);
  assert.equal(form.get('client_secret'), null);

  const [i] = ingestCalls();
  assert.equal(i.init.headers.Authorization, 'Bearer ya29.sa-token');
});

test('the token is cached across orders until five minutes before it expires', async () => {
  process.env.GOOGLE_ADS_SA_KEY = KEY_B64;
  let n = 0;
  stubFetch({
    [TOKEN_URL]: () => ({ body: { access_token: `tok-${++n}`, expires_in: 3599 } }),
    [INGEST_URL]: { body: {} },
  });
  await sendGoogleAdsConversion(ORDER);
  await sendGoogleAdsConversion({ ...ORDER, orderId: '70002' });
  await sendGoogleAdsConversion({ ...ORDER, orderId: '70003' });
  assert.equal(tokenCalls().length, 1);
  assert.equal(ingestCalls().length, 3);
  assert.ok(ingestCalls().every((c) => c.init.headers.Authorization === 'Bearer tok-1'));
});

test('a token inside the five-minute margin is not reused', async () => {
  process.env.GOOGLE_ADS_SA_KEY = KEY_B64;
  let n = 0;
  stubFetch({
    // 4 minutes left: already inside the margin on arrival.
    [TOKEN_URL]: () => ({ body: { access_token: `tok-${++n}`, expires_in: 240 } }),
    [INGEST_URL]: { body: {} },
  });
  await sendGoogleAdsConversion(ORDER);
  await sendGoogleAdsConversion({ ...ORDER, orderId: '70002' });
  assert.equal(tokenCalls().length, 2);
  assert.equal(ingestCalls()[1].init.headers.Authorization, 'Bearer tok-2');
});

test('a 401 from ingest drops the cached token so the next order fetches a new one', async () => {
  process.env.GOOGLE_ADS_SA_KEY = KEY_B64;
  let n = 0;
  let first = true;
  stubFetch({
    [TOKEN_URL]: () => ({ body: { access_token: `tok-${++n}`, expires_in: 3599 } }),
    [INGEST_URL]: () => {
      if (first) {
        first = false;
        return { status: 401, body: { error: { code: 401, status: 'UNAUTHENTICATED', message: 'Request had invalid authentication credentials.' } } };
      }
      return { body: {} };
    },
  });
  const r1 = await sendGoogleAdsConversion(ORDER);
  assert.equal(r1.ok, false);
  assert.match(r1.error, /HTTP 401 UNAUTHENTICATED/);
  const r2 = await sendGoogleAdsConversion({ ...ORDER, orderId: '70002' });
  assert.equal(r2.ok, true);
  assert.equal(tokenCalls().length, 2);
});

test('the service account is preferred when the OAuth fallback is also set', async () => {
  process.env.GOOGLE_ADS_SA_KEY = KEY_B64;
  process.env.GOOGLE_OAUTH_CLIENT_ID = 'cid.apps.googleusercontent.com';
  process.env.GOOGLE_OAUTH_CLIENT_SECRET = 'GOCSPX-secret';
  process.env.GOOGLE_OAUTH_REFRESH_TOKEN = '1//refresh';
  stubFetch({ [TOKEN_URL]: { body: { access_token: 't', expires_in: 3599 } } });
  assert.equal((await getGoogleAdsAccessToken()).ok, true);
  assert.equal(new URLSearchParams(String(tokenCalls()[0].init.body)).get('grant_type'), 'urn:ietf:params:oauth:grant-type:jwt-bearer');
});

test('without a service-account key the refresh token is still used', async () => {
  process.env.GOOGLE_OAUTH_CLIENT_ID = 'cid.apps.googleusercontent.com';
  process.env.GOOGLE_OAUTH_CLIENT_SECRET = 'GOCSPX-secret';
  process.env.GOOGLE_OAUTH_REFRESH_TOKEN = '1//refresh';
  stubFetch({ [TOKEN_URL]: { body: { access_token: 't', expires_in: 3599 } } });
  assert.equal((await getGoogleAdsAccessToken()).ok, true);
  const form = new URLSearchParams(String(tokenCalls()[0].init.body));
  assert.equal(form.get('grant_type'), 'refresh_token');
  assert.equal(form.get('refresh_token'), '1//refresh');
});

test('no credentials at all is a failure, not a silent skip', async () => {
  stubFetch({});
  const r = await sendGoogleAdsConversion(ORDER);
  assert.equal(r.ok, false);
  assert.equal(r.skipped, undefined);
  assert.match(r.error, /no Google credentials configured/);
  assert.equal(calls.length, 0);
});

// ---------------------------------------------------------------------------
// Error reporting: Google's code, never the secret
// ---------------------------------------------------------------------------

test('a rejected service-account assertion reports Google’s error code and nothing secret', async () => {
  process.env.GOOGLE_ADS_SA_KEY = KEY_B64;
  stubFetch({
    [TOKEN_URL]: { status: 400, body: { error: 'invalid_grant', error_description: 'Invalid JWT Signature.' } },
  });
  const r = await sendGoogleAdsConversion(ORDER);
  assert.equal(r.ok, false);
  assert.equal(r.error, 'token exchange failed (service_account): HTTP 400 invalid_grant – Invalid JWT Signature.');
  const assertion = new URLSearchParams(String(tokenCalls()[0].init.body)).get('assertion');
  for (const secret of [assertion, assertion.split('.')[2], KEY_B64.slice(0, 40), KEY_BODY.slice(0, 40)]) {
    assert.ok(!r.error.includes(secret));
  }
});

test('a rejected refresh token reports invalid_client / invalid_grant without the secret or token', async () => {
  process.env.GOOGLE_OAUTH_CLIENT_ID = 'cid.apps.googleusercontent.com';
  process.env.GOOGLE_OAUTH_CLIENT_SECRET = 'GOCSPX-very-secret-value';
  process.env.GOOGLE_OAUTH_REFRESH_TOKEN = '1//0refresh-token-value';
  for (const [status, body, expected] of [
    [401, { error: 'invalid_client', error_description: 'The OAuth client was not found.' }, 'HTTP 401 invalid_client – The OAuth client was not found.'],
    [400, { error: 'invalid_grant', error_description: 'Token has been expired or revoked.' }, 'HTTP 400 invalid_grant – Token has been expired or revoked.'],
    [400, { error: 'invalid_grant' }, 'HTTP 400 invalid_grant'],
    [502, {}, 'HTTP 502 no error code'],
  ]) {
    resetGoogleAdsTokenCache();
    stubFetch({ [TOKEN_URL]: { status, body } });
    const r = await sendGoogleAdsConversion(ORDER);
    assert.equal(r.error, `token exchange failed (refresh_token): ${expected}`);
    assert.ok(!r.error.includes('GOCSPX-very-secret-value'));
    assert.ok(!r.error.includes('1//0refresh-token-value'));
  }
});

test('an unusable key is reported before any network call, without quoting it', async () => {
  process.env.GOOGLE_ADS_SA_KEY = Buffer.from('{"type":"service_account","client_email":"x@y"}').toString('base64');
  stubFetch({});
  const r = await sendGoogleAdsConversion(ORDER);
  assert.equal(r.error, 'token exchange failed (service_account): GOOGLE_ADS_SA_KEY has no private_key');
  assert.equal(calls.length, 0);
});

test('an ingest error is one line: status, message and Google’s reasons', async () => {
  process.env.GOOGLE_ADS_SA_KEY = KEY_B64;
  stubFetch({
    [TOKEN_URL]: { body: { access_token: 't', expires_in: 3599 } },
    [INGEST_URL]: {
      status: 403,
      body: {
        error: {
          code: 403,
          status: 'PERMISSION_DENIED',
          message: 'The caller does not have permission',
          details: [
            { '@type': 'type.googleapis.com/google.rpc.ErrorInfo', reason: 'PERMISSION_DENIED', domain: 'datamanager.googleapis.com' },
            { '@type': 'type.googleapis.com/google.rpc.BadRequest', fieldViolations: [{ field: 'destinations[0]', reason: 'INVALID_CONVERSION_ACTION_TYPE', description: 'The conversion action type is not valid.' }] },
          ],
        },
      },
    },
  });
  const r = await sendGoogleAdsConversion(ORDER);
  assert.equal(
    r.error,
    'HTTP 403 PERMISSION_DENIED The caller does not have permission [PERMISSION_DENIED; destinations[0]: INVALID_CONVERSION_ACTION_TYPE]'
  );
  assert.ok(!r.error.includes('\n'));
});

test('a slow Google is cut off: both calls carry a timeout signal, and a timeout is reported as one', async () => {
  process.env.GOOGLE_ADS_SA_KEY = KEY_B64;
  stubFetch({
    [TOKEN_URL]: { body: { access_token: 't', expires_in: 3599 } },
    [INGEST_URL]: () => {
      throw new DOMException('The operation was aborted due to timeout', 'TimeoutError');
    },
  });
  const r = await sendGoogleAdsConversion(ORDER);
  assert.deepEqual(r, { ok: false, error: 'ingest timed out after 8000 ms' });
  for (const c of calls) assert.ok(c.init.signal instanceof AbortSignal, c.url);

  resetGoogleAdsTokenCache();
  stubFetch({
    [TOKEN_URL]: () => {
      throw new DOMException('The operation was aborted due to timeout', 'TimeoutError');
    },
  });
  const r2 = await sendGoogleAdsConversion(ORDER);
  assert.equal(r2.error, 'token exchange failed (service_account): timed out after 8000 ms');
});

// ---------------------------------------------------------------------------
// The ingest request itself
// ---------------------------------------------------------------------------

test('the event goes to the conversion action, keyed by the order id, with hashed identifiers', async () => {
  process.env.GOOGLE_ADS_SA_KEY = KEY_B64;
  stubFetch({
    [TOKEN_URL]: { body: { access_token: 't', expires_in: 3599 } },
    [INGEST_URL]: { body: { requestId: 'r' } },
  });
  await sendGoogleAdsConversion(ORDER);
  const [i] = ingestCalls();
  assert.equal(i.init.method, 'POST');
  assert.equal(i.init.headers['developer-token'], undefined);
  assert.equal(i.init.headers['login-customer-id'], undefined);
  const body = JSON.parse(i.init.body);
  assert.deepEqual(body.destinations, [
    { operatingAccount: { accountType: 'GOOGLE_ADS', accountId: '3128169327' }, productDestinationId: '6837155486' },
  ]);
  assert.equal(body.encoding, 'HEX');
  assert.equal(body.validateOnly, undefined);
  const [e] = body.events;
  assert.equal(e.transactionId, '70001');
  assert.equal(e.eventTimestamp, '2026-10-20T20:03:00.000Z');
  assert.equal(e.eventSource, 'WEB');
  assert.equal(e.currency, 'ILS');
  assert.equal(e.conversionValue, 4990);
  assert.deepEqual(e.adIdentifiers, { gclid: 'Cj0KCQtest-gclid' });
  const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
  assert.deepEqual(e.userData.userIdentifiers, [
    { emailAddress: sha('buyer@example.com') },
    { phoneNumber: sha('+972501234567') },
  ]);
  assert.ok(!i.init.body.includes('Buyer@Example.com'));
  assert.ok(!i.init.body.includes('050-1234567'));
});

test('validateOnly is passed through, and a manager login account only when it differs', async () => {
  process.env.GOOGLE_ADS_SA_KEY = KEY_B64;
  process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID = '111-222-3333';
  stubFetch({
    [TOKEN_URL]: { body: { access_token: 't', expires_in: 3599 } },
    [INGEST_URL]: { body: {} },
  });
  await sendGoogleAdsConversion({ ...ORDER, validateOnly: true });
  let body = JSON.parse(ingestCalls()[0].init.body);
  assert.equal(body.validateOnly, true);
  assert.deepEqual(body.destinations[0].loginAccount, { accountType: 'GOOGLE_ADS', accountId: '1112223333' });

  process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID = '3128169327';
  await sendGoogleAdsConversion(ORDER);
  body = JSON.parse(ingestCalls()[1].init.body);
  assert.equal(body.destinations[0].loginAccount, undefined);
});

test('field warnings on a success are returned for the log', async () => {
  process.env.GOOGLE_ADS_SA_KEY = KEY_B64;
  stubFetch({
    [TOKEN_URL]: { body: { access_token: 't', expires_in: 3599 } },
    [INGEST_URL]: { body: { requestId: 'r9', fieldWarnings: [{ field: 'events[0].cart_data', reason: 'WARNING_REASON_GENERIC', description: 'x' }] } },
  });
  const r = await sendGoogleAdsConversion(ORDER);
  assert.deepEqual(r, { ok: true, requestId: 'r9', warnings: 'events[0].cart_data: WARNING_REASON_GENERIC' });
});

// ---------------------------------------------------------------------------
// What is never sent
// ---------------------------------------------------------------------------

test('a sales rep’s order is skipped before any network call', async () => {
  process.env.GOOGLE_ADS_SA_KEY = KEY_B64;
  stubFetch({});
  const r = await sendGoogleAdsConversion({ ...ORDER, orderEntry: 'rep' });
  assert.deepEqual(r, { ok: false, skipped: true, error: 'sales-rep order' });
  assert.equal(calls.length, 0);
});

test('missing account env or identifiers skip without a network call', async () => {
  process.env.GOOGLE_ADS_SA_KEY = KEY_B64;
  stubFetch({});
  delete process.env.GOOGLE_ADS_CONVERSION_ACTION_ID;
  assert.deepEqual(await sendGoogleAdsConversion(ORDER), { ok: false, skipped: true, error: 'Google Ads env not configured' });
  process.env.GOOGLE_ADS_CONVERSION_ACTION_ID = '6837155486';
  assert.deepEqual(
    await sendGoogleAdsConversion({ orderId: '1', value: 1, currency: 'ILS' }),
    { ok: false, skipped: true, error: 'no gclid or user identifiers' }
  );
  assert.equal(calls.length, 0);
});
