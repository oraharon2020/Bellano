// Route test for src/app/api/checkout/meshulam-webhook/route.ts — run with
// `npm test`. Loads the real route; only `next/server` is swapped for a stub
// whose after() queues the callback instead of running it, the way Next.js
// holds it until the response is sent. The `@/` alias is resolved to src/.
// fetch is stubbed; the service-account key is a throwaway pair; the payer's
// details are invented.
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { existsSync } from 'node:fs';
import { registerHooks } from 'node:module';

const SRC = new URL('../src/', import.meta.url);
const NEXT_SERVER_STUB = `data:text/javascript,${encodeURIComponent(`
  export class NextRequest extends Request {}
  export class NextResponse extends Response {
    static json(body, init) { return Response.json(body, init); }
  }
  export function after(task) { globalThis.__afterTasks.push(task); }
`)}`;

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === 'next/server') return { url: NEXT_SERVER_STUB, shortCircuit: true };
    if (specifier.startsWith('@/')) {
      for (const ext of ['.ts', '/index.ts']) {
        const url = new URL(specifier.slice(2) + ext, SRC);
        if (existsSync(url)) return { url: url.href, shortCircuit: true };
      }
    }
    return nextResolve(specifier, context);
  },
});

// The route reads these at import time.
process.env.WC_CONSUMER_KEY = 'ck_test';
process.env.WC_CONSUMER_SECRET = 'cs_test';
process.env.NEXT_PUBLIC_WORDPRESS_URL = 'https://wp.test';
process.env.GOOGLE_ADS_CUSTOMER_ID = '3128169327';
process.env.GOOGLE_ADS_CONVERSION_ACTION_ID = '6837155486';
const { privateKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  publicKeyEncoding: { type: 'spki', format: 'pem' },
});
process.env.GOOGLE_ADS_SA_KEY = Buffer.from(
  JSON.stringify({ type: 'service_account', private_key: privateKey, client_email: 'uploader@test.iam.gserviceaccount.com' })
).toString('base64');

const route = await import('../src/app/api/checkout/meshulam-webhook/route.ts');
const { resetGoogleAdsTokenCache } = await import('../src/lib/google-ads-conversions.ts');

const WP_FORWARD = 'https://wp.test/wp-json/bellano/v1/meshulam-webhook';
const WC_ORDER = 'https://wp.test/wp-json/wc/v3/orders/70001';
const TOKEN = 'https://oauth2.googleapis.com/token';
const INGEST = 'https://datamanager.googleapis.com/v1/events:ingest';
const PAYER = { fullName: 'ישראל ישראלי', payerPhone: '0501234567', payerEmail: 'buyer@example.com', cardSuffix: '4321' };
const ORDER = {
  id: 70001,
  total: '4990.00',
  currency: 'ILS',
  date_created_gmt: '2026-10-20T20:03:00',
  billing: { email: PAYER.payerEmail, phone: PAYER.payerPhone },
  meta_data: [{ key: '_gclid', value: 'Cj0KCQtest' }],
};

const realFetch = globalThis.fetch;
const realLog = console.log;
const realError = console.error;
let calls, logs, releaseOrder;

function deferred() {
  let resolve;
  const promise = new Promise((r) => (resolve = r));
  return { promise, resolve };
}

beforeEach(() => {
  globalThis.__afterTasks = [];
  calls = [];
  logs = [];
  resetGoogleAdsTokenCache();
  const gate = deferred();
  releaseOrder = gate.resolve;
  const json = (body, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
  globalThis.fetch = async (url, init = {}) => {
    calls.push(String(url));
    switch (String(url)) {
      case WP_FORWARD:
        return json({ status: 'success', order_id: 70001 });
      case WC_ORDER:
        await gate.promise; // the order lookup hangs until the test lets it go
        return json(ORDER);
      case TOKEN:
        return json({ access_token: 'tok', expires_in: 3599 });
      case INGEST:
        assert.equal(JSON.parse(init.body).events[0].transactionId, '70001');
        return json({ requestId: 'req-70001' });
      default:
        throw new Error(`unexpected fetch ${url}`);
    }
  };
  console.log = (...a) => logs.push(a.join(' '));
  console.error = (...a) => logs.push(a.join(' '));
});
afterEach(() => {
  globalThis.fetch = realFetch;
  console.log = realLog;
  console.error = realError;
});

const runAfterTasks = () =>
  Promise.all(globalThis.__afterTasks.map((t) => (typeof t === 'function' ? t() : t)));

const notification = (status) =>
  new Request('https://bellano.co.il/api/checkout/meshulam-webhook', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      status,
      'data[customFields][cField1]': '70001',
      'data[asmachta]': '12345678',
      'data[transactionId]': '9876543',
      'data[transactionToken]': 'tok_secret_value',
      ...Object.fromEntries(Object.entries(PAYER).map(([k, v]) => [`data[${k}]`, v])),
    }).toString(),
  });

test('the route runs on Node with room for the deferred upload', () => {
  assert.equal(route.runtime, 'nodejs');
  assert.equal(route.maxDuration, 60);
});

test('a paid notification is answered before the Google upload even starts', async () => {
  const res = await route.POST(notification('1'));

  // Answered, with the order lookup still hanging and nothing sent to Google.
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { status: 'ok', orderId: '70001' });
  assert.deepEqual(calls, [WP_FORWARD]);
  assert.equal(globalThis.__afterTasks.length, 1);
  assert.equal(typeof globalThis.__afterTasks[0], 'function', 'after() gets a callback, not a running promise');

  // Next.js runs it once the response is out; it waits on the slow lookup…
  const upload = runAfterTasks();
  await new Promise((r) => setImmediate(r));
  assert.deepEqual(calls, [WP_FORWARD, WC_ORDER]);

  // …and completes when the lookup does, logging its result.
  releaseOrder();
  await upload;
  assert.deepEqual(calls, [WP_FORWARD, WC_ORDER, TOKEN, INGEST]);
  assert.ok(logs.includes('Google Ads conversion sent for order 70001 (request req-70001)'), logs.join('\n'));
});

test('the GET form is deferred the same way', async () => {
  const req = { nextUrl: new URL('https://bellano.co.il/api/checkout/meshulam-webhook?cField1=70001&status=1') };
  const res = await route.GET(req);
  assert.deepEqual(await res.json(), { status: 'ok' });
  assert.deepEqual(calls, [WP_FORWARD]);
  assert.equal(globalThis.__afterTasks.length, 1);
  releaseOrder();
  await runAfterTasks();
  assert.deepEqual(calls, [WP_FORWARD, WC_ORDER, TOKEN, INGEST]);
});

test('an unpaid notification schedules no upload', async () => {
  const res = await route.POST(notification('0'));
  assert.equal(res.status, 200);
  assert.equal(globalThis.__afterTasks.length, 0);
  assert.deepEqual(calls, [WP_FORWARD]);
});

test('nothing the payer typed, nor the transaction token, reaches the log', async () => {
  await route.POST(notification('1'));
  releaseOrder();
  await runAfterTasks();
  const all = logs.join('\n');
  for (const v of [...Object.values(PAYER), 'tok_secret_value']) {
    assert.ok(!all.includes(v), `${v} leaked:\n${all}`);
  }
  assert.ok(
    logs.includes('Meshulam webhook received: {"status":"1","orderId":"70001","asmachta":"12345678","transactionId":"9876543"}'),
    all
  );
});
