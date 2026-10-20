// Unit tests for the arrival event of src/lib/attribution.ts — run with `npm test` (node --test, no dependencies).
// The event Vercel's drain carries to the shop's own analytics instead of the query string it drops: two properties
// (Vercel Pro's limit), 255 characters each, the click KIND and never the id, no personal data.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ARRIVAL_EVENT, CLICK_KINDS, arrivalEventData, buildTouch, classifyTouch, isArrival } from '../src/lib/attribution.ts';

const SITE = 'https://bellano.co.il';
const OWN = [SITE, 'https://admin.bellano.co.il', 'https://bellano.vercel.app', 'localhost'];
const NOW = new Date('2026-10-20T10:00:00.000Z');
const touch = (path, referrer = '') => buildTouch({ href: SITE + path, referrer, now: NOW, ownHosts: OWN });
const read = (params) => Object.fromEntries(new URLSearchParams(params));

test('an arrival is what recordTouch keeps: a session\'s first page, or any tagged or referred page load', () => {
  assert.equal(isArrival(touch('/'), { sessionStart: true }), true);
  assert.equal(isArrival(touch('/product/sofa'), { sessionStart: false }), false);
  assert.equal(isArrival(touch('/?gclid=Cj0KCQjw'), { sessionStart: false }), true);
  assert.equal(isArrival(touch('/', 'https://www.google.com/'), { sessionStart: false }), true);
  assert.equal(isArrival(touch('/', SITE + '/category/x'), { sessionStart: false }), false);
});

test('a Google ad: the click kind, the UTM, gad_source and the referring host — never the click id', () => {
  const t = touch('/product/sofa?gclid=Cj0KCQjw7Py4BhCbARIsAMMx-_JdK2aBc&gad_source=1&utm_source=google&utm_medium=cpc&utm_campaign=pmax_sofas', 'https://www.google.com/');
  const d = arrivalEventData(t);
  assert.equal(ARRIVAL_EVENT, 'arrival');
  assert.deepEqual(Object.keys(d), ['channel', 'params']);
  assert.equal(d.channel, 'google_ads');
  assert.deepEqual(read(d.params), { click: 'gclid', utm_source: 'google', utm_medium: 'cpc', utm_campaign: 'pmax_sofas', gad_source: '1', ref: 'www.google.com' });
  assert.ok(!d.params.includes('Cj0KCQjw'), 'the click id itself is never sent');
});

test('only the strongest click kind, as the order reports its click', () => {
  assert.equal(read(arrivalEventData(touch('/?fbclid=IwAR2&gclid=X1')).params).click, 'gclid');
  assert.equal(read(arrivalEventData(touch('/?fbclid=IwAR2&wbraid=W1')).params).click, 'wbraid');
  for (const kind of CLICK_KINDS) assert.equal(read(arrivalEventData(touch(`/?${kind}=abc123`)).params).click, kind);
});

test('a Facebook ad, an AI assistant, a Merchant Center listing, direct', () => {
  let d = arrivalEventData(touch('/category/sofas?utm_source=facebook&utm_medium=paid&utm_campaign=retarget-oct&fbclid=IwAR2', 'https://m.facebook.com/'));
  assert.equal(d.channel, 'facebook_ads');
  assert.deepEqual(read(d.params), { click: 'fbclid', utm_source: 'facebook', utm_medium: 'paid', utm_campaign: 'retarget-oct', ref: 'm.facebook.com' });
  d = arrivalEventData(touch('/?utm_source=chatgpt.com'));
  assert.equal(d.channel, 'ai');
  assert.equal(d.params, 'utm_source=chatgpt.com');
  d = arrivalEventData(touch('/product/sofa?srsltid=AfmBOoq'));
  assert.equal(d.channel, 'google_organic');
  assert.equal(d.params, 'srsltid=1');
  d = arrivalEventData(touch('/'));
  assert.deepEqual(d, { channel: 'direct', params: '' });
});

test('utm_term and utm_content are never sent; nor is the referring URL beyond its host', () => {
  const d = arrivalEventData(touch('/?utm_source=newsletter&utm_term=private-word&utm_content=user-42', 'https://mail.google.com/mail/u/0/#inbox/FMfcgz'));
  assert.ok(!d.params.includes('private-word') && !d.params.includes('user-42') && !d.params.includes('FMfcgz'));
  assert.equal(read(d.params).ref, 'mail.google.com');
});

test('an e-mail address or a phone number in a UTM value is blanked as the server blanks it', () => {
  const d = arrivalEventData(touch('/?utm_source=newsletter&utm_medium=email&utm_campaign=' + encodeURIComponent('dana.levi@gmail.com 054-123-4567 oct')));
  const c = read(d.params).utm_campaign;
  assert.equal(c, '[מייל] [טלפון] oct');
  assert.ok(!d.params.includes('dana') && !d.params.includes('4567'));
});

test('two properties, each a string of at most 255 characters — a long campaign is cut first, the click kept', () => {
  const long = encodeURIComponent('קמפיין '.repeat(80));
  const t = touch(`/?gclid=X&utm_source=${'s'.repeat(150)}&utm_medium=${'m'.repeat(150)}&utm_campaign=${long}`, 'https://www.google.com/');
  const d = arrivalEventData(t);
  assert.ok(d.params.length <= 255, String(d.params.length));
  assert.ok(typeof d.channel === 'string' && d.channel.length <= 255);
  const p = read(d.params);
  assert.equal(p.click, 'gclid');
  assert.ok(p.utm_source && p.utm_source.length <= 150 && p.utm_source.length >= 1);
  assert.equal(classifyTouch(t).channel, d.channel);
});

test('a Hebrew campaign survives the round trip as itself', () => {
  const d = arrivalEventData(touch('/?utm_source=google&utm_medium=cpc&utm_campaign=' + encodeURIComponent('מזנונים — אוקטובר')));
  assert.equal(read(d.params).utm_campaign, 'מזנונים — אוקטובר');
  assert.ok(d.params.length <= 255);
});

test('the payload alone tells the classifier what the URL told it: the same channel, re-read from params', () => {
  const urls = [
    ['/?gclid=a1', ''], ['/?gbraid=b', 'https://www.google.co.il/'], ['/?utm_source=google&utm_medium=cpc', ''], ['/?gad_source=1', 'https://www.google.com/'],
    ['/', 'https://www.google.com/'], ['/?msclkid=m', ''], ['/?ttclid=t', ''], ['/?fbclid=f', 'https://l.instagram.com/'], ['/?utm_source=ig&utm_medium=paid', ''],
    ['/?utm_source=newsletter', ''], ['/', 'https://www.ynet.co.il/'], ['/?utm_source=beytili', ''], ['/', 'https://wa.me/'], ['/', 'https://perplexity.ai/'],
    ['/?srsltid=x', ''], ['/', ''],
  ];
  for (const [path, ref] of urls) {
    const t = touch(path, ref);
    const p = read(arrivalEventData(t).params);
    const q = new URLSearchParams();
    for (const k of ['utm_source', 'utm_medium', 'utm_campaign', 'gad_source', 'srsltid']) if (p[k] !== undefined) q.set(k, p[k]);
    if (p.click) q.set(p.click, 'arrival');
    const again = buildTouch({ href: SITE + '/x' + (q.toString() ? '?' + q : ''), referrer: p.ref ? `https://${p.ref}/` : '', now: NOW, ownHosts: OWN });
    assert.deepEqual([path, ref, classifyTouch(again).channel], [path, ref, classifyTouch(t).channel]);
  }
});
