// Unit tests for src/lib/attribution.ts — run with `npm test` (node --test, no
// dependencies: Node strips the TypeScript types itself).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ATTRIBUTION_MAX_AGE_MS,
  CHANNEL_LABELS,
  buildOrderAttribution,
  buildTouch,
  classifyTouch,
  recordTouch,
  sanitizeAttribution,
  stateFromLegacy,
  summarizeTouch,
  withTrackingParams,
} from '../src/lib/attribution.ts';

const SITE = 'https://bellano.co.il';
const OWN = [SITE, 'https://admin.bellano.co.il', 'https://bellano.vercel.app', 'localhost'];
const NOW = new Date('2026-10-19T10:00:00.000Z');
const DAY = 24 * 60 * 60 * 1000;

const touch = (path, referrer = '', now = NOW) =>
  buildTouch({ href: SITE + path, referrer, now, ownHosts: OWN });

// [path + query, referrer, channel, detail?]
const CASES = [
  // Google Ads
  ['/product/sofa?gclid=Cj0KCQjw7Py4BhCbARIsAMMx-_JdK2aBc&gad_source=1&gad_campaignid=21345', 'https://www.google.com/', 'google_ads'],
  ['/?gbraid=0AAAAADtTs1Abc_DEF-ghi&gad_source=1', 'https://www.google.co.il/', 'google_ads'],
  ['/?wbraid=CjkKCQjw_wbraid-123', '', 'google_ads'],
  ['/?utm_source=google&utm_medium=cpc&utm_campaign=pmax_sofas', '', 'google_ads'],
  ['/?utm_source=google_ads&utm_medium=paid_search', '', 'google_ads'],
  ['/product/sofa?gad_source=1', 'https://www.google.com/', 'google_ads'],
  ['/', 'https://www.googleadservices.com/', 'google_ads'],
  ['/', 'https://googleads.g.doubleclick.net/', 'google_ads'],
  ['/', 'https://syndicatedsearch.goog/', 'google_ads'],
  // Google organic
  ['/', 'https://www.google.com/', 'google_organic'],
  ['/category/living-room-sideboards', 'https://www.google.co.il/', 'google_organic'],
  ['/', 'android-app://com.google.android.googlequicksearchbox/', 'google_organic'],
  ['/', 'https://news.google.com/', 'google_organic'],
  ['/product/sofa?srsltid=AfmBOoqKnB3x_y-Z', '', 'google_organic'],
  ['/product/sofa?srsltid=AfmBOoqKnB3x_y-Z', 'https://www.google.com/', 'google_organic'],
  ['/?utm_source=google&utm_medium=organic&utm_campaign=gmb', '', 'google_organic'],
  ['/', 'https://docs.google.com/document/d/1', 'referral', 'docs.google.com'],
  // Bing
  ['/', 'https://www.bing.com/', 'bing'],
  ['/', 'https://cn.bing.com/', 'bing'],
  ['/?msclkid=3f9a1b2c4d5e6f7a8b9c', '', 'bing'],
  ['/?utm_source=bing&utm_medium=cpc', '', 'bing'],
  // Facebook / Instagram — what the shops' Meta ads actually carry
  ['/product/sofa?utm_source=facebook&utm_medium=paid&utm_campaign=retarget&fbclid=IwAR2abcDEF', 'https://l.facebook.com/', 'facebook_ads'],
  ['/?utm_source=fb&utm_medium=paid_social&fbclid=IwAR2abcDEF', 'https://m.facebook.com/', 'facebook_ads'],
  ['/?utm_source=ig&utm_medium=paid&fbclid=PAZXh0bgNhZW0', 'https://l.instagram.com/', 'facebook_ads'],
  ['/?utm_source=facebook&utm_medium=cpc', '', 'facebook_ads'],
  ['/?fbclid=IwAR2abcDEF&utm_medium=cpc', '', 'facebook_ads'],
  ['/?utm_source=ig&utm_medium=social&fbclid=PAZXh0bgNhZW0', 'https://l.instagram.com/', 'instagram_organic'],
  ['/?utm_source=IGShopping&utm_medium=Social', '', 'instagram_organic'],
  ['/?utm_source=facebook', '', 'facebook_organic'],
  ['/?fbclid=IwZXh0bgNhZW0CMTEAAR0abc', 'https://l.facebook.com/', 'facebook_organic'],
  ['/?fbclid=PAZXh0bgNhZW0CMTEAAabc', 'https://l.instagram.com/', 'instagram_organic'],
  ['/', 'https://lm.facebook.com/', 'facebook_organic'],
  ['/', 'android-app://com.facebook.katana/', 'facebook_organic'],
  ['/', 'https://www.instagram.com/', 'instagram_organic'],
  // TikTok
  ['/?ttclid=E.C.P.CrABx-yz_123', '', 'tiktok'],
  ['/', 'https://www.tiktok.com/', 'tiktok'],
  ['/?utm_source=tiktok&utm_medium=paid', '', 'tiktok'],
  // AI assistants
  ['/product/sofa?utm_source=chatgpt.com', '', 'ai', 'ChatGPT'],
  ['/?utm_source=chatgpt.com', 'https://chatgpt.com/', 'ai', 'ChatGPT'],
  ['/', 'https://chat.openai.com/', 'ai', 'ChatGPT'],
  ['/', 'https://www.perplexity.ai/', 'ai', 'Perplexity'],
  ['/?utm_source=perplexity', '', 'ai', 'Perplexity'],
  ['/', 'https://gemini.google.com/', 'ai', 'Gemini'],
  ['/', 'https://copilot.microsoft.com/', 'ai', 'Copilot'],
  ['/', 'https://edgeservices.bing.com/', 'ai', 'Copilot'],
  ['/?utm_source=copilot.com', '', 'ai', 'Copilot'],
  ['/', 'https://claude.ai/', 'ai', 'Claude'],
  ['/', 'https://chat.deepseek.com/', 'ai', 'DeepSeek'],
  ['/', 'https://grok.com/', 'ai', 'Grok'],
  // Email
  ['/?utm_source=inforu&utm_medium=email&utm_campaign=black_friday', '', 'email'],
  ['/?utm_source=newsletter', '', 'email'],
  ['/?utm_medium=email', '', 'email'],
  ['/', 'https://mail.google.com/', 'email'],
  ['/', 'android-app://com.google.android.gm/', 'email'],
  ['/', 'https://outlook.live.com/', 'email'],
  // WhatsApp
  ['/', 'https://web.whatsapp.com/', 'whatsapp'],
  ['/', 'https://l.wl.co/', 'whatsapp'],
  ['/?utm_source=whatsapp&utm_medium=message', '', 'whatsapp'],
  // Referral
  ['/', 'https://www.ynet.co.il/home/0,7340,L-8,00.html', 'referral', 'ynet.co.il'],
  ['/', 'https://duckduckgo.com/', 'referral', 'duckduckgo.com'],
  ['/', 'https://www.youtube.com/', 'referral', 'youtube.com'],
  ['/?utm_source=designer_partner', '', 'referral', 'designer_partner'],
  ['/?utm_source=taboola&utm_medium=cpc', '', 'referral', 'taboola'],
  // Direct — including the site's own hosts and the payment pages
  ['/', '', 'direct'],
  ['/?utm_content=hero', '', 'direct'],
  ['/', 'https://bellano.co.il/product/sofa', 'direct'],
  ['/', 'https://www.bellano.co.il/', 'direct'],
  ['/', 'https://admin.bellano.co.il/wp-admin/post.php', 'direct'],
  ['/', 'https://bellano.vercel.app/api/checkout/meshulam-callback', 'direct'],
  ['/', 'https://secure.meshulam.co.il/purchase', 'direct'],
  ['/', 'https://sandbox.meshulam.co.il/', 'direct'],
  ['/', 'https://pay.grow.link/abc', 'direct'],
  ['/', 'http://localhost:3003/cart', 'direct'],
];

test('classifies real-world arrivals', () => {
  for (const [path, referrer, channel, detail] of CASES) {
    const got = classifyTouch(touch(path, referrer));
    assert.equal(got.channel, channel, `${path} ← ${referrer || '(no referrer)'}`);
    assert.equal(got.detail, detail, `detail of ${path} ← ${referrer}`);
  }
});

test('labels are Hebrew and keep the old values of מקור הגעה', () => {
  assert.equal(classifyTouch(touch('/?gclid=abc')).label, 'Google Ads');
  assert.equal(classifyTouch(touch('/', 'https://www.google.com/')).label, 'Google (אורגני)');
  assert.equal(classifyTouch(touch('/', '')).label, 'ישיר');
  assert.equal(classifyTouch(touch('/', 'https://www.perplexity.ai/')).label, 'בינה מלאכותית (Perplexity)');
  assert.equal(classifyTouch(touch('/', 'https://www.ynet.co.il/')).label, 'הפניה (ynet.co.il)');
  assert.equal(classifyTouch(null).label, 'ישיר');
  assert.equal(CHANNEL_LABELS.rep, 'מכירה דרך נציג');
});

test('a touch keeps the referrer host only, never own or payment hosts', () => {
  const t = touch('/product/sofa?utm_source=facebook&utm_medium=paid&utm_campaign=A%22B%5C', 'https://l.facebook.com/l.php?u=x');
  assert.equal(t.ref, 'l.facebook.com');
  assert.equal(t.landing, '/product/sofa');
  assert.equal(t.utm_campaign, 'AB', 'quotes and backslashes are stripped');
  assert.equal(touch('/', 'https://secure.meshulam.co.il/x').ref, undefined);
  assert.equal(touch('/', 'https://bellano.co.il/x').ref, undefined);
  assert.equal(touch('/?gclid=<script>').gclid, undefined, 'a click id that is not a token is dropped');
});

test('first touch stays, last non-direct touch moves, a direct revisit changes nothing', () => {
  const at = (minutes) => new Date(NOW.getTime() + minutes * 60 * 1000);
  let s = {};
  s = recordTouch(s, touch('/', 'https://www.google.com/', at(0)), { sessionStart: true });
  assert.equal(classifyTouch(s.first).channel, 'google_organic');
  assert.equal(classifyTouch(s.last).channel, 'google_organic');

  s = recordTouch(s, touch('/product/sofa?gclid=TESTGCLID123&gad_source=1', 'https://www.google.com/', at(10)), { sessionStart: true });
  assert.equal(classifyTouch(s.last).channel, 'google_ads');
  assert.equal(s.clicks.gclid.id, 'TESTGCLID123');

  s = recordTouch(s, touch('/?utm_source=chatgpt.com', '', at(20)), { sessionStart: true });
  assert.equal(classifyTouch(s.last).detail, 'ChatGPT');

  s = recordTouch(s, touch('/', 'https://www.perplexity.ai/', at(30)), { sessionStart: true });
  assert.equal(classifyTouch(s.last).detail, 'Perplexity');

  const before = JSON.stringify(s);
  s = recordTouch(s, touch('/', '', at(40)), { sessionStart: true });
  assert.equal(JSON.stringify(s), before, 'a direct arrival never overwrites last');
  s = recordTouch(s, touch('/', 'https://secure.meshulam.co.il/purchase', at(50)), { sessionStart: false });
  assert.equal(JSON.stringify(s), before, 'a return from the payment page is not an arrival');

  assert.equal(classifyTouch(s.first).channel, 'google_organic', 'first touch kept');
  assert.equal(s.clicks.gclid.id, 'TESTGCLID123', 'the ad click survives later visits');
});

test('a direct arrival only counts as the first page of a session', () => {
  assert.deepEqual(recordTouch({}, touch('/'), { sessionStart: false }), {});
  const s = recordTouch({}, touch('/'), { sessionStart: true });
  assert.equal(classifyTouch(s.first).channel, 'direct');
  assert.equal(s.last, undefined);
});

test('everything expires after 90 days', () => {
  const old = new Date(NOW.getTime() - ATTRIBUTION_MAX_AGE_MS - DAY);
  let s = recordTouch({}, touch('/?gclid=OLDCLICK', 'https://www.google.com/', old), { sessionStart: true });
  s = recordTouch(s, touch('/', '', NOW), { sessionStart: true });
  assert.equal(s.clicks, undefined);
  assert.equal(s.last, undefined);
  assert.equal(classifyTouch(s.first).channel, 'direct', 'the next arrival becomes the first touch');

  const fresh = new Date(NOW.getTime() - 89 * DAY);
  const kept = recordTouch(recordTouch({}, touch('/?gclid=KEEP', '', fresh), { sessionStart: true }), touch('/', '', NOW), { sessionStart: true });
  assert.equal(kept.clicks.gclid.id, 'KEEP');
});

test('the legacy single record migrates only when it has a timestamp', () => {
  const s = stateFromLegacy(
    { gclid: 'LEGACY1', landing_page: '/product/sofa', referrer: 'https://www.google.com/', timestamp: '2026-10-01T08:00:00.000Z' },
    OWN,
    NOW,
  );
  assert.equal(classifyTouch(s.last).channel, 'google_ads');
  assert.equal(s.last.ref, 'www.google.com');
  assert.equal(s.clicks.gclid.id, 'LEGACY1');
  assert.deepEqual(stateFromLegacy({ gclid: 'NOTIME' }, OWN, NOW), {});
});

test('a rep order carries no touches and no click ids', () => {
  const state = recordTouch({}, touch('/?gclid=REPSTALECLICK&utm_source=google&utm_medium=cpc'), { sessionStart: true });
  const a = buildOrderAttribution({ entry: 'rep', attribution: state, legacyUtm: { gclid: 'X', timestamp: NOW.toISOString() }, ownHosts: OWN, now: NOW });
  assert.deepEqual(a.meta, [
    { key: 'מקור הגעה', value: 'מכירה דרך נציג' },
    { key: '_order_entry', value: 'rep' },
    { key: '_nalla_channel', value: 'rep' },
  ]);
  assert.deepEqual(a.clicks, {});
});

test('a site order writes the legacy keys and the new ones', () => {
  let s = recordTouch({}, touch('/', 'https://www.google.com/', new Date(NOW.getTime() - 3 * DAY)), { sessionStart: true });
  s = recordTouch(s, touch('/product/sofa?gbraid=0AAAGB&utm_source=google&utm_medium=cpc&utm_campaign=pmax', '', new Date(NOW.getTime() - DAY)), { sessionStart: true });
  // The browser round-trips it through localStorage and JSON.
  const a = buildOrderAttribution({ entry: 'site', attribution: JSON.parse(JSON.stringify(s)), ownHosts: OWN, now: NOW });
  const meta = Object.fromEntries(a.meta.map((m) => [m.key, m.value]));

  assert.equal(meta['מקור הגעה'], 'Google Ads');
  assert.equal(meta._nalla_channel, 'google_ads');
  assert.equal(meta._order_entry, 'site');
  assert.equal(meta._utm_source, 'google');
  assert.equal(meta._utm_medium, 'cpc');
  assert.equal(meta._utm_campaign, 'pmax');
  assert.equal(meta._gbraid, '0AAAGB');
  assert.equal(meta._landing_page, '/product/sofa');
  assert.equal(meta._gclid, undefined);

  const first = JSON.parse(meta._nalla_attr_first);
  const last = JSON.parse(meta._nalla_attr_last);
  assert.deepEqual(Object.keys(first), ['channel', 'ref', 'landing', 'at']);
  assert.equal(first.channel, 'google_organic');
  assert.equal(last.channel, 'google_ads');
  assert.equal(last.click, 'gbraid');
  assert.equal(last.campaign, 'pmax');
  assert.ok(!meta._nalla_attr_last.includes('\\'), 'no backslashes: WordPress unslashes meta values');
});

test('an organic revisit after an ad click keeps the click for the ad platforms', () => {
  let s = recordTouch({}, touch('/?gclid=ADCLICK', 'https://www.google.com/', new Date(NOW.getTime() - 2 * DAY)), { sessionStart: true });
  s = recordTouch(s, touch('/', 'https://www.google.com/', NOW), { sessionStart: true });
  const meta = Object.fromEntries(buildOrderAttribution({ entry: 'site', attribution: s, ownHosts: OWN, now: NOW }).meta.map((m) => [m.key, m.value]));
  assert.equal(meta._nalla_channel, 'google_organic');
  assert.equal(meta._gclid, 'ADCLICK');
});

test('a page loaded before this shipped still sends utm_data', () => {
  const meta = (legacyUtm) =>
    Object.fromEntries(buildOrderAttribution({ entry: 'site', legacyUtm, ownHosts: OWN, now: NOW }).meta.map((m) => [m.key, m.value]));

  const ads = meta({ gclid: 'OLDBUNDLE', landing_page: '/', timestamp: '2026-10-18T12:00:00.000Z' });
  assert.equal(ads['מקור הגעה'], 'Google Ads');
  assert.equal(ads._gclid, 'OLDBUNDLE');
  assert.equal(ads._landing_page, '/');

  const none = meta(null);
  assert.equal(none['מקור הגעה'], 'ישיר');
  assert.equal(none._nalla_channel, 'direct');
  assert.equal(none._nalla_attr_first, undefined);
});

test('whatever arrives over the wire is reduced to our own shape', () => {
  assert.deepEqual(sanitizeAttribution('nope', OWN, NOW), {});
  assert.deepEqual(sanitizeAttribution(null, OWN, NOW), {});

  const s = sanitizeAttribution(
    {
      first: { at: 'yesterday', landing: '/' },
      last: { at: NOW.toISOString(), landing: 'javascript:alert(1)', ref: 'www.bellano.co.il', utm_source: 'x"},{"y' },
      clicks: { gclid: { id: 'bad id!', at: NOW.toISOString() }, fbclid: { id: 'IwAR2ok', at: NOW.toISOString() } },
      extra: 'dropped',
    },
    OWN,
    NOW,
  );
  assert.equal(s.first, undefined, 'a touch without a real time is dropped');
  assert.equal(s.last.landing, '/', 'a landing that is not a path is replaced');
  assert.equal(s.last.ref, undefined, 'own host dropped');
  assert.equal(s.last.utm_source, 'x},{y');
  assert.equal(s.clicks.gclid, undefined);
  assert.equal(s.clicks.fbclid.id, 'IwAR2ok');
  assert.equal('extra' in s, false);

  const directLast = sanitizeAttribution({ last: { at: NOW.toISOString(), landing: '/' } }, OWN, NOW);
  assert.equal(directLast.last, undefined, 'last is never a direct touch');
});

test('an ad click keeps the campaign it came from, by id, onto the order', () => {
  // Bellano, 22/10/2026: the product feed gives every campaign utm_campaign=pmax_category; the id is what tells them apart.
  const t = touch('/product/sofa?gclid=GCLID1&gad_source=1&gad_campaignid=24054060925&utm_source=google&utm_medium=cpc&utm_campaign=pmax_category&utm_id=24054060925', 'https://www.google.com/');
  assert.equal(t.gad_campaignid, '24054060925');
  assert.equal(t.utm_id, '24054060925');
  const s = recordTouch({}, t, { sessionStart: true });
  const meta = Object.fromEntries(buildOrderAttribution({ entry: 'site', attribution: JSON.parse(JSON.stringify(s)), ownHosts: OWN, now: NOW }).meta.map((m) => [m.key, m.value]));
  assert.equal(meta._utm_campaign, 'pmax_category');
  assert.equal(meta._gad_campaignid, '24054060925');
  assert.equal(meta._utm_id, '24054060925');
  assert.equal(JSON.parse(meta._nalla_attr_last).campaignId, '24054060925');
  // Google's id alone still says Google Ads.
  assert.equal(classifyTouch(touch('/?gad_campaignid=123', '')).channel, 'google_ads');
  // Over the wire: a Google id that is not digits, or a utm_id that is not a short token, is dropped.
  const w = sanitizeAttribution({ last: { at: NOW.toISOString(), landing: '/', gclid: 'G', gad_campaignid: '12a', utm_id: 'x'.repeat(41) } }, OWN, NOW);
  assert.equal(w.last.gad_campaignid, undefined);
  assert.equal(w.last.utm_id, undefined);
  const ok = sanitizeAttribution({ last: { at: NOW.toISOString(), landing: '/', gclid: 'G', gad_campaignid: '987', utm_id: 'abc-1' } }, OWN, NOW);
  assert.equal(ok.last.gad_campaignid, '987');
  assert.equal(ok.last.utm_id, 'abc-1');
  // A rep's order still carries nothing of the browser's.
  const rep = buildOrderAttribution({ entry: 'rep', attribution: s, ownHosts: OWN, now: NOW });
  assert.equal(rep.meta.some((m) => m.key === '_gad_campaignid' || m.key === '_utm_id'), false);
});

test('summaries list fields in a fixed order', () => {
  const s = summarizeTouch(touch('/product/sofa?utm_source=facebook&utm_medium=paid&utm_campaign=c&fbclid=IwAR', 'https://l.facebook.com/'));
  assert.deepEqual(Object.keys(s), ['channel', 'source', 'medium', 'campaign', 'click', 'ref', 'landing', 'at']);
});

test('redirects carry the tracking parameters and nothing else', () => {
  const from = new URLSearchParams('gclid=G1&gad_source=1&utm_source=google&orderby=price&add-to-cart=5&fbclid=F1');
  const target = withTrackingParams(new URL('https://bellano.co.il/product/sofa?page=2'), from);
  assert.equal(target.searchParams.get('gclid'), 'G1');
  assert.equal(target.searchParams.get('gad_source'), '1');
  assert.equal(target.searchParams.get('utm_source'), 'google');
  assert.equal(target.searchParams.get('fbclid'), 'F1');
  assert.equal(target.searchParams.get('page'), '2');
  assert.equal(target.searchParams.has('orderby'), false);
  assert.equal(target.searchParams.has('add-to-cart'), false);
});
