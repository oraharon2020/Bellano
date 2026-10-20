// Unit tests for src/lib/rep-source.ts — run with `npm test` (node --test, no dependencies).
// "איך הלקוח הגיע אלינו?": required of a verified rep, ignored on a customer's order.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  REP_SOURCE_INVALID_MESSAGE,
  REP_SOURCE_META,
  REP_SOURCE_MISSING_MESSAGE,
  REP_SOURCE_NOTE_MAX,
  REP_SOURCE_OPTIONS,
  REP_SOURCE_VALUES,
  isRepSource,
  repSourceOrderMeta,
  sanitizeRepSourceNote,
  validateRepSource,
} from '../src/lib/rep-source.ts';

const NOW = new Date('2026-10-20T10:00:00.000Z');
const NOW_UNIX = String(Math.floor(NOW.getTime() / 1000));
const read = (meta) => Object.fromEntries(meta.map((r) => [r.key, r.value]));

test('exactly the six values, in the order and with the words the checkout shows', () => {
  assert.deepEqual([...REP_SOURCE_VALUES], ['google', 'meta', 'referral', 'returning', 'showroom', 'other']);
  assert.deepEqual(
    REP_SOURCE_OPTIONS.map((o) => [o.value, o.label]),
    [
      ['google', 'גוגל'],
      ['meta', 'פייסבוק / אינסטגרם'],
      ['referral', 'המלצה מחבר או מכר'],
      ['returning', 'לקוח חוזר'],
      ['showroom', 'אולם התצוגה'],
      ['other', 'אחר'],
    ]
  );
});

test('the meta keys are the contract the server analytics reads on both shops', () => {
  assert.deepEqual(REP_SOURCE_META, {
    source: '_nalla_rep_source',
    at: '_nalla_rep_source_at',
    note: '_nalla_rep_source_note',
  });
});

test('each of the six is accepted as is', () => {
  for (const v of REP_SOURCE_VALUES) {
    assert.equal(isRepSource(v), true, v);
    const r = validateRepSource(v);
    assert.equal(r.ok, true, v);
    assert.equal(r.source, v);
    assert.equal(r.note, '');
  }
});

test('missing is refused with the "missing" message', () => {
  for (const v of [undefined, null, '']) {
    assert.deepEqual(validateRepSource(v), { ok: false, message: REP_SOURCE_MISSING_MESSAGE }, String(v));
  }
});

test('junk is refused with the "unknown" message — no case folding, no padding, no near-misses', () => {
  const junk = ['Google', 'GOOGLE', ' google', 'google ', 'facebook', 'instagram', 'google_ads', 'said:google',
    'rep', 'direct', 'unknown', 'אחר', 'גוגל', '0', 0, 1, true, false, {}, [], ['google'], { value: 'google' }, NaN];
  for (const v of junk) {
    assert.equal(isRepSource(v), false, JSON.stringify(v));
    assert.deepEqual(validateRepSource(v), { ok: false, message: REP_SOURCE_INVALID_MESSAGE }, JSON.stringify(v));
  }
});

test('both refusals are Hebrew', () => {
  assert.match(REP_SOURCE_MISSING_MESSAGE, /[֐-׿]/);
  assert.match(REP_SOURCE_INVALID_MESSAGE, /[֐-׿]/);
});

test('"אחר" note: trimmed, whitespace collapsed, capped at 60 characters', () => {
  assert.equal(REP_SOURCE_NOTE_MAX, 60);
  assert.equal(sanitizeRepSourceNote('   שלט בכביש 4   '), 'שלט בכביש 4');
  assert.equal(sanitizeRepSourceNote('תערוכה\n\nבגני\tהתערוכה'), 'תערוכה בגני התערוכה');
  const long = 'א'.repeat(75);
  assert.equal(sanitizeRepSourceNote(long), 'א'.repeat(60));
  assert.equal(Array.from(sanitizeRepSourceNote('ב '.repeat(40))).length <= 60, true);
  // the cut never leaves a trailing space
  assert.equal(sanitizeRepSourceNote('א'.repeat(59) + ' ב'), 'א'.repeat(59));
});

test('"אחר" note: control, bidi-override and angle-bracket characters are removed; an emoji is never split', () => {
  assert.equal(sanitizeRepSourceNote('<b>שכן</b>'), 'bשכן/b');
  assert.equal(sanitizeRepSourceNote('‮הפוך‬'), 'הפוך');
  assert.equal(sanitizeRepSourceNote('a\u0000b\u0007c\u009Fd'), 'a b c d');
  const emoji = '😀'.repeat(61);
  const cut = sanitizeRepSourceNote(emoji);
  assert.equal(Array.from(cut).length, 60);
  assert.equal(cut, '😀'.repeat(60));
});

test('"אחר" note: anything that is not text is no note', () => {
  for (const v of [undefined, null, 5, true, {}, ['שלט'], '   ', '\n\t']) {
    assert.equal(sanitizeRepSourceNote(v), '', JSON.stringify(v));
  }
});

test('the note is kept only with "other"', () => {
  assert.deepEqual(validateRepSource('other', '  שלט בכביש  '), { ok: true, source: 'other', note: 'שלט בכביש' });
  assert.deepEqual(validateRepSource('google', 'שלט בכביש'), { ok: true, source: 'google', note: '' });
});

test('a verified rep order: source + time, and the note only when "אחר" has one', () => {
  const r = repSourceOrderMeta({ rep_source: 'showroom' }, { isRep: true, now: NOW });
  assert.equal(r.ok, true);
  assert.deepEqual(r.meta, [
    { key: '_nalla_rep_source', value: 'showroom' },
    { key: '_nalla_rep_source_at', value: NOW_UNIX },
  ]);

  const other = repSourceOrderMeta({ rep_source: 'other', rep_source_note: ' ראה מודעה באוטובוס ' }, { isRep: true, now: NOW });
  assert.deepEqual(read(other.meta), {
    _nalla_rep_source: 'other',
    _nalla_rep_source_at: NOW_UNIX,
    _nalla_rep_source_note: 'ראה מודעה באוטובוס',
  });

  const otherEmpty = repSourceOrderMeta({ rep_source: 'other', rep_source_note: '   ' }, { isRep: true, now: NOW });
  assert.deepEqual(Object.keys(read(otherEmpty.meta)), ['_nalla_rep_source', '_nalla_rep_source_at']);

  const stray = repSourceOrderMeta({ rep_source: 'meta', rep_source_note: 'leftover' }, { isRep: true, now: NOW });
  assert.deepEqual(Object.keys(read(stray.meta)), ['_nalla_rep_source', '_nalla_rep_source_at']);
});

test('the time is unix seconds as a string', () => {
  const r = repSourceOrderMeta({ rep_source: 'google' }, { isRep: true, now: NOW });
  assert.match(read(r.meta)._nalla_rep_source_at, /^\d{10}$/);
  assert.equal(read(r.meta)._nalla_rep_source_at, '1792490400');
});

test('a verified rep order without an answer, or with junk, is refused with a Hebrew 400', () => {
  const payloads = [{}, { rep_source: '' }, { rep_source: null }, null, undefined, 'google', [],
    { rep_source: 'Google' }, { rep_source: 'tiktok' }, { rep_source: ['google'] }, { source: 'google' }];
  for (const p of payloads) {
    const r = repSourceOrderMeta(p, { isRep: true, now: NOW });
    assert.equal(r.ok, false, JSON.stringify(p));
    assert.equal(r.status, 400);
    assert.match(r.message, /[֐-׿]/);
  }
  assert.equal(repSourceOrderMeta({}, { isRep: true }).message, REP_SOURCE_MISSING_MESSAGE);
  assert.equal(repSourceOrderMeta({ rep_source: 'tiktok' }, { isRep: true }).message, REP_SOURCE_INVALID_MESSAGE);
});

test('a non-rep payload ignores the field entirely — valid, junk, or a forged rep body', () => {
  const customerCheckout = {
    customer: { firstName: 'דנה', lastName: 'כהן', email: 'd@example.com', phone: '0501234567', address: 'הרצל 1', city: 'חולון', postcode: '', notes: '' },
    items: [{ product_id: 1, variation_id: 0, quantity: 1 }],
    shipping_method: 'free_shipping',
    payment_method: 'credit_card',
    coupon_code: null,
    order_entry: 'site',
    attribution: null,
  };
  const payloads = [
    customerCheckout,
    { ...customerCheckout, rep_source: 'google' },
    { ...customerCheckout, rep_source: 'other', rep_source_note: 'שלט' },
    { ...customerCheckout, rep_source: 'junk', rep_source_note: '<script>' },
    { ...customerCheckout, order_entry: 'rep', rep_source: 'showroom' },
    {},
    null,
  ];
  for (const p of payloads) {
    assert.deepEqual(repSourceOrderMeta(p, { isRep: false, now: NOW }), { ok: true, meta: [] }, JSON.stringify(p));
  }
});
