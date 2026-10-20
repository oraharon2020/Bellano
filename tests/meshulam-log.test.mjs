// Unit tests for src/lib/meshulam-log.ts — run with `npm test`.
// What a Meshulam notification may leave in the Vercel logs. All personal data
// below is invented.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { describeErrorForLog, summarizeMeshulamPayload } from '../src/lib/meshulam-log.ts';

const PERSONAL = {
  fullName: 'ישראל ישראלי',
  payerPhone: '0501234567',
  payerEmail: 'buyer@example.com',
  cardSuffix: '4321',
  cardBrand: 'Visa',
  cardExp: '1229',
  transactionToken: 'tok_9f8e7d6c5b4a',
  processToken: 'ptok_1a2b3c4d',
};
const assertNoPersonalData = (summary) => {
  const line = JSON.stringify(summary);
  for (const [k, v] of Object.entries(PERSONAL)) {
    assert.ok(!line.includes(v), `${k} leaked: ${line}`);
  }
};

test('form-encoded notification (bracket keys, the live notifyUrl route)', () => {
  const body = {
    status: '1',
    err: '',
    'data[asmachta]': '12345678',
    'data[transactionId]': '9876543',
    'data[sum]': '4990',
    'data[paymentType]': '1',
    'data[transactionTypeId]': '1',
    'data[customFields][cField1]': '70001',
    'data[statusCode]': '2',
    ...Object.fromEntries(Object.entries(PERSONAL).map(([k, v]) => [`data[${k}]`, v])),
  };
  const s = summarizeMeshulamPayload(body);
  assert.deepEqual(s, {
    status: '1',
    orderId: '70001',
    asmachta: '12345678',
    transactionId: '9876543',
    sum: '4990',
    paymentType: '1',
    transactionTypeId: '1',
  });
  assertNoPersonalData(s);
});

test('nested object (the fallback route, or a JSON body)', () => {
  const body = {
    status: 1,
    data: {
      asmachta: '12345678',
      transactionId: 9876543,
      sum: 4990,
      customFields: { cField1: '70001' },
      ...PERSONAL,
    },
  };
  const s = summarizeMeshulamPayload(body);
  assert.deepEqual(s, { status: '1', orderId: '70001', asmachta: '12345678', transactionId: '9876543', sum: '4990' });
  assertNoPersonalData(s);
});

test('flat query string (GET notification / browser redirect)', () => {
  const s = summarizeMeshulamPayload({
    response: 'success',
    cField1: '70001',
    asmachta: '12345678',
    json: Buffer.from(JSON.stringify({ data: PERSONAL })).toString('base64'),
    ...PERSONAL,
  });
  assert.deepEqual(s, { response: 'success', orderId: '70001', asmachta: '12345678' });
  assertNoPersonalData(s);
});

test('a field Meshulam adds later stays out until someone allows it', () => {
  const s = summarizeMeshulamPayload({ status: '1', 'data[newPayerId]': '000000018', data: { payerAddress: 'הרצל 1' } });
  assert.deepEqual(s, { status: '1' });
});

test('values are one bounded line; objects in an allowed slot are dropped', () => {
  const s = summarizeMeshulamPayload({
    status: '1\nINJECTED log line',
    'data[asmachta]': 'x'.repeat(500),
    'data[sum]': { nested: PERSONAL.fullName },
  });
  assert.equal(s.status, '1 INJECTED log line');
  assert.equal(s.asmachta.length, 65);
  assert.ok(s.asmachta.endsWith('…'));
  assert.equal(s.sum, undefined);
  assertNoPersonalData(s);
});

test('anything that is not an object gives an empty summary', () => {
  for (const v of [null, undefined, '', 'status=1', 42, ['a']]) {
    assert.deepEqual(summarizeMeshulamPayload(v), {});
  }
});

test('a JSON parse error is logged by name only — its message quotes the body', () => {
  let err;
  try {
    JSON.parse(`{"fullName":"${PERSONAL.fullName}","payerEmail":"${PERSONAL.payerEmail}"`);
  } catch (e) {
    err = e;
  }
  assert.ok(err instanceof SyntaxError);
  const line = describeErrorForLog(err);
  assert.equal(line, 'SyntaxError (body could not be parsed)');
  assertNoPersonalData(line);
});

test('other errors keep their name and a bounded message', () => {
  assert.equal(describeErrorForLog(new TypeError('fetch failed')), 'TypeError: fetch failed');
  assert.equal(describeErrorForLog('a string'), 'non-Error thrown');
  assert.ok(describeErrorForLog(new Error('y'.repeat(400))).length < 200);
});
