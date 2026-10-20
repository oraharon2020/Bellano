/**
 * Where a visit came from, and what an order records about it.
 *
 * The one place the rules live. The browser records arrivals with it
 * (useUtmTracking), create-order and the WhatsApp lead route classify with it,
 * and the server never trusts a channel the browser worked out — it re-runs
 * these rules on the raw touch it was sent. Each arrival is also sent to the
 * shop's own analytics as one Vercel custom event (arrivalEventData), because
 * Vercel's drain carries no query string; the server classifies that again too.
 *
 * Pure on purpose — no imports, no window, no Next — so tests/attribution.test.mjs
 * can run it under plain `node --test`. The same file lives in Nalla's repo;
 * the channel codes and meta keys are one contract across both shops, which is
 * also why the keys keep the `_nalla_` prefix here.
 *
 * Channels, first matching rule wins:
 *
 *   1. google_ads         gclid / gbraid / wbraid on the URL
 *   2. bing               msclkid
 *   3. tiktok             ttclid
 *   4. ai                 utm_source or referrer is an AI assistant (chatgpt.com,
 *                         chat.openai.com, perplexity.ai, gemini.google.com,
 *                         copilot.microsoft.com, claude.ai, …). detail = its name
 *   5. email              utm_medium email/newsletter, an e-mail tool as
 *                         utm_source (inforu, mailchimp, …), or a webmail referrer
 *   6. by utm_source      google*  → google_ads when the medium is paid (cpc,
 *                                    paid, ads, …) or gad_source is set,
 *                                    otherwise google_organic
 *                         bing / microsoft → bing
 *                         facebook / fb / meta / instagram / ig → facebook_ads
 *                                    when the medium is paid, otherwise
 *                                    instagram_organic or facebook_organic
 *                         tiktok   → tiktok
 *                         whatsapp / wa / wati → whatsapp
 *                         anything else → referral, detail = the utm_source
 *   7. fbclid, no source  facebook_ads with a paid medium, otherwise organic:
 *                         Facebook appends fbclid to every outbound link
 *   8. gad_source alone   google_ads
 *   9. by referrer host   Google ad hosts (googleadservices.com, doubleclick.net,
 *                         …) → google_ads; google.* and the Google app →
 *                         google_organic; bing.com → bing; Facebook, Instagram,
 *                         TikTok and WhatsApp hosts → their channel;
 *                         anything else → referral, detail = the host
 *  10. srsltid alone      google_organic — a Merchant Center free listing whose
 *                         referrer was stripped
 *  11. nothing            direct
 *
 *   rep                   never derived from a visit. create-order sets it on an
 *                         order placed from a browser in sales-rep mode, because
 *                         that browser's history belongs to the rep.
 *
 * whatsapp is beyond the original list on purpose: Nalla's inbox already writes
 * מקור הגעה = וואטסאפ on the orders it opens, and both shops share these codes.
 *
 * Referrers from the site's own hosts and from the payment pages are never
 * recorded, so returning from Meshulam/Grow cannot pass for a referral.
 */

export type Channel =
  | 'google_ads'
  | 'google_organic'
  | 'bing'
  | 'facebook_ads'
  | 'facebook_organic'
  | 'instagram_organic'
  | 'tiktok'
  | 'ai'
  | 'email'
  | 'whatsapp'
  | 'referral'
  | 'direct'
  | 'rep';

/** Existing values of מקור הגעה are kept where the meaning did not change, so old and new orders group together. */
export const CHANNEL_LABELS: Record<Channel, string> = {
  google_ads: 'Google Ads',
  google_organic: 'Google (אורגני)',
  bing: 'Bing',
  facebook_ads: 'Facebook Ads',
  facebook_organic: 'Facebook (אורגני)',
  instagram_organic: 'Instagram (אורגני)',
  tiktok: 'TikTok',
  ai: 'בינה מלאכותית',
  email: 'דיוור',
  whatsapp: 'וואטסאפ',
  referral: 'הפניה',
  direct: 'ישיר',
  rep: 'מכירה דרך נציג',
};

export type ClickKind = 'gclid' | 'gbraid' | 'wbraid' | 'msclkid' | 'ttclid' | 'fbclid';

/** Strongest signal first: the order a touch reports its `click` in. */
export const CLICK_KINDS: readonly ClickKind[] = ['gclid', 'gbraid', 'wbraid', 'msclkid', 'ttclid', 'fbclid'];

const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'] as const;

/** Query parameters a redirect must carry over, or the arrival it belongs to is lost. */
export const TRACKING_PARAMS: readonly string[] = [
  ...UTM_KEYS,
  'utm_id',
  ...CLICK_KINDS,
  'gad_source',
  'gad_campaignid',
  'srsltid',
];

/**
 * How long a stored click is allowed to speak for an order.
 *
 * Ninety days is Google's own click-to-conversion window, so a click older than
 * this could not be credited with the sale anyway. The record this replaced had
 * no limit at all: one click stayed on a browser for good and was stamped on
 * every later order from it. At Nalla that put one salesperson's months-old
 * click id on 70 different orders.
 */
export const ATTRIBUTION_MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000;

/** One arrival on the site. */
export interface Touch {
  /** ISO time of the arrival. */
  at: string;
  /** Path the visit landed on, as the browser reported it. */
  landing: string;
  /** Referrer host; the site's own hosts and the payment pages are never stored. */
  ref?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  gclid?: string;
  gbraid?: string;
  wbraid?: string;
  msclkid?: string;
  ttclid?: string;
  fbclid?: string;
  gad_source?: string;
  /** '1' when the URL carried srsltid; the value itself is noise. */
  srsltid?: string;
}

export interface ClickRecord {
  id: string;
  at: string;
}

/**
 * What the browser keeps between visits.
 *
 * `first` is the first arrival inside the window, whatever it was. `last` is
 * the latest arrival that was not direct: a tagged or referred visit replaces
 * it, a plain direct one never does. `clicks` holds the newest id of each kind,
 * because an organic revisit after an ad click changes the channel but must not
 * take away the click Google and Meta are entitled to count.
 */
export interface AttributionState {
  first?: Touch;
  last?: Touch;
  clicks?: Partial<Record<ClickKind, ClickRecord>>;
}

export interface Classification {
  channel: Channel;
  /** Hebrew, for מקור הגעה and the screens. */
  label: string;
  /** The AI assistant's name, or the referring host / unknown utm_source. */
  detail?: string;
}

// ---------------------------------------------------------------------------
// Host and source tables
// ---------------------------------------------------------------------------

const AI_ASSISTANTS: ReadonlyArray<{ name: string; hosts: readonly string[]; sources: readonly string[] }> = [
  { name: 'ChatGPT', hosts: ['chatgpt.com', 'chat.openai.com', 'openai.com'], sources: ['chatgpt', 'openai'] },
  { name: 'Perplexity', hosts: ['perplexity.ai'], sources: ['perplexity'] },
  { name: 'Gemini', hosts: ['gemini.google.com', 'bard.google.com'], sources: ['gemini', 'bard'] },
  {
    name: 'Copilot',
    hosts: ['copilot.microsoft.com', 'copilot.com', 'copilot.cloud.microsoft', 'edgeservices.bing.com'],
    sources: ['copilot'],
  },
  { name: 'Claude', hosts: ['claude.ai'], sources: ['claude'] },
  { name: 'DeepSeek', hosts: ['deepseek.com'], sources: ['deepseek'] },
  { name: 'Grok', hosts: ['grok.com', 'x.ai'], sources: ['grok'] },
  { name: 'Meta AI', hosts: ['meta.ai'], sources: ['metaai'] },
  { name: 'Mistral', hosts: ['chat.mistral.ai'], sources: ['mistral'] },
  { name: 'You.com', hosts: ['you.com'], sources: [] },
  { name: 'Phind', hosts: ['phind.com'], sources: ['phind'] },
  { name: 'Poe', hosts: ['poe.com'], sources: ['poe'] },
];

const EMAIL_MEDIUMS = ['email', 'e-mail', 'e_mail', 'mail', 'newsletter', 'edm', 'emailing'];
const EMAIL_SOURCES = [
  'email', 'newsletter', 'inforu', 'mailchimp', 'activetrail', 'smoove', 'sendgrid', 'klaviyo',
  'brevo', 'sendinblue', 'mailerlite', 'omnisend', 'gmail', 'outlook',
];
const WEBMAIL_HOSTS = [
  'mail.google.com', 'com.google.android.gm', 'outlook.live.com', 'outlook.office.com',
  'outlook.office365.com', 'com.microsoft.office.outlook', 'mail.yahoo.com', 'mail.aol.com',
  'mail.proton.me', 'mail.walla.co.il',
];

const GOOGLE_AD_HOSTS = ['googleadservices.com', 'doubleclick.net', 'googlesyndication.com', 'syndicatedsearch.goog'];
/** google.* subdomains that link out without being a search. */
const GOOGLE_NON_SEARCH = ['docs', 'drive', 'sites', 'accounts', 'translate', 'groups', 'classroom', 'calendar', 'support'];

const FACEBOOK_HOSTS = ['facebook.com', 'fb.com', 'fb.me', 'messenger.com', 'm.me', 'com.facebook.katana', 'com.facebook.orca', 'com.facebook.lite'];
const INSTAGRAM_HOSTS = ['instagram.com', 'ig.me', 'com.instagram.android'];
const TIKTOK_HOSTS = ['tiktok.com', 'tiktokv.com', 'com.zhiliaoapp.musically', 'com.ss.android.ugc.trill'];
const WHATSAPP_HOSTS = ['whatsapp.com', 'wa.me', 'wl.co', 'com.whatsapp', 'com.whatsapp.w4b'];

/** Meshulam / Grow and the wallets that hand the customer back to the site after paying. */
const PAYMENT_HOSTS = ['meshulam.co.il', 'grow.link', 'grow.business', 'grow.website', 'pay.google.com', 'payments.google.com', 'bitpay.co.il'];

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

const lower = (value: string | undefined): string => (value || '').trim().toLowerCase();
const bare = (host: string): string => host.replace(/^www\./, '');

function hostIs(host: string, domain: string): boolean {
  return host === domain || host.endsWith(`.${domain}`);
}

function hostIn(host: string, domains: readonly string[]): boolean {
  return !!host && domains.some((domain) => hostIs(host, domain));
}

/**
 * Free text from a URL or a request body. Quotes and backslashes go: the value
 * may end up inside the JSON stored on an order, and WordPress unslashes meta.
 */
function cleanText(value: unknown, max: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  const text = Array.from(value, (ch) => (ch < ' ' || ch === '\u007f' || ch === '"' || ch === '\\' ? '' : ch))
    .join('')
    .trim()
    .slice(0, max);
  return text || undefined;
}

/** Click ids are URL-safe tokens; 255 is the widest column that stores one. */
function cleanClickId(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const id = value.trim();
  return /^[A-Za-z0-9._~-]{1,255}$/.test(id) ? id : undefined;
}

function cleanPath(value: unknown): string | undefined {
  const path = cleanText(value, 300);
  return path && path.startsWith('/') ? path : undefined;
}

function cleanIso(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const time = Date.parse(value);
  return Number.isFinite(time) ? new Date(time).toISOString() : undefined;
}

function hostOf(value: string): string {
  try {
    return new URL(value.includes('://') ? value : `https://${value}`).hostname.toLowerCase();
  } catch {
    return '';
  }
}

export function isOwnHost(host: string, ownHosts: readonly string[] = []): boolean {
  const h = bare(lower(host));
  if (!h) return false;
  if (h === 'localhost' || h === '127.0.0.1') return true;

  return ownHosts.some((own) => {
    const base = bare(hostOf(own));
    return !!base && hostIs(h, base);
  });
}

/**
 * The referring host worth keeping, or nothing.
 *
 * `android-app://com.google.android.gm/` yields the package name, which is how
 * the Gmail and Google apps identify themselves.
 */
export function referrerHost(referrer: string | null | undefined, ownHosts: readonly string[] = []): string | undefined {
  if (!referrer) return undefined;

  let host: string;
  try {
    host = new URL(referrer).hostname.toLowerCase().replace(/\.$/, '');
  } catch {
    return undefined;
  }

  if (!/^[a-z0-9.-]{1,100}$/.test(host)) return undefined;
  if (isOwnHost(host, ownHosts) || hostIn(host, PAYMENT_HOSTS)) return undefined;

  return host;
}

function aiAssistant(value: string): string | undefined {
  const v = bare(value);
  if (!v) return undefined;

  return AI_ASSISTANTS.find((ai) => hostIn(v, ai.hosts) || ai.sources.includes(v))?.name;
}

function isPaidMedium(medium: string): boolean {
  return (
    medium.startsWith('paid') ||
    /(^|[^a-z])(cpc|ppc|cpm|cpv|cpa|paid|ads?|display|banner|sponsored|retargeting|remarketing|pmax)([^a-z]|$)/.test(medium)
  );
}

function isEmail(source: string, medium: string, host: string): boolean {
  return (
    EMAIL_MEDIUMS.includes(medium) ||
    medium.includes('newsletter') ||
    EMAIL_SOURCES.includes(source) ||
    source.includes('newsletter') ||
    source.includes('email') ||
    hostIn(host, WEBMAIL_HOSTS) ||
    /^(web)?mail\./.test(host)
  );
}

const isGoogleSource = (s: string) => s.startsWith('google') || s === 'adwords' || s === 'gads';
const isBingSource = (s: string) => s.startsWith('bing') || s.startsWith('microsoft');
const isInstagramSource = (s: string) => s.includes('instagram') || s === 'ig' || s === 'igshopping';
const isMetaSource = (s: string) =>
  isInstagramSource(s) || s.includes('facebook') || s.startsWith('fb') || /^(meta|an|msg|messenger)([._-]|$)/.test(s);
const isWhatsAppSource = (s: string) => s.includes('whatsapp') || s === 'wa' || s === 'wati';

function isGoogleSearchHost(host: string): boolean {
  if (host === 'com.google.android.googlequicksearchbox') return true;
  if (!/(^|\.)google\.(com|co\.[a-z]{2}|com\.[a-z]{2}|[a-z]{2})$/.test(host)) return false;

  return !GOOGLE_NON_SEARCH.includes(host.split('.')[0]);
}

function result(channel: Channel, detail?: string): Classification {
  const named = channel === 'ai' || channel === 'referral' ? cleanText(detail, 60) : undefined;

  return named
    ? { channel, label: `${CHANNEL_LABELS[channel]} (${named})`, detail: named }
    : { channel, label: CHANNEL_LABELS[channel] };
}

// ---------------------------------------------------------------------------
// The classifier
// ---------------------------------------------------------------------------

export function classifyTouch(touch: Touch | null | undefined): Classification {
  if (!touch) return result('direct');

  const source = lower(touch.utm_source);
  const medium = lower(touch.utm_medium);
  const host = bare(lower(touch.ref));
  const paid = isPaidMedium(medium);

  if (touch.gclid || touch.gbraid || touch.wbraid) return result('google_ads');
  if (touch.msclkid) return result('bing');
  if (touch.ttclid) return result('tiktok');

  const ai = aiAssistant(source) || aiAssistant(host);
  if (ai) return result('ai', ai);

  if (isEmail(source, medium, host)) return result('email');

  if (source) {
    if (isGoogleSource(source)) return result(paid || touch.gad_source ? 'google_ads' : 'google_organic');
    if (isBingSource(source)) return result('bing');
    if (isMetaSource(source)) {
      if (paid) return result('facebook_ads');
      return result(isInstagramSource(source) || hostIn(host, INSTAGRAM_HOSTS) ? 'instagram_organic' : 'facebook_organic');
    }
    if (source.includes('tiktok')) return result('tiktok');
    if (isWhatsAppSource(source)) return result('whatsapp');

    return result('referral', touch.utm_source);
  }

  if (touch.fbclid) {
    if (paid) return result('facebook_ads');
    return result(hostIn(host, INSTAGRAM_HOSTS) ? 'instagram_organic' : 'facebook_organic');
  }

  if (touch.gad_source) return result('google_ads');

  if (host) {
    if (hostIn(host, GOOGLE_AD_HOSTS)) return result('google_ads');
    if (isGoogleSearchHost(host)) return result('google_organic');
    if (hostIs(host, 'bing.com')) return result('bing');
    if (hostIn(host, FACEBOOK_HOSTS)) return result('facebook_organic');
    if (hostIn(host, INSTAGRAM_HOSTS)) return result('instagram_organic');
    if (hostIn(host, TIKTOK_HOSTS)) return result('tiktok');
    if (hostIn(host, WHATSAPP_HOSTS)) return result('whatsapp');

    return result('referral', host);
  }

  if (touch.srsltid) return result('google_organic');

  return result('direct');
}

// ---------------------------------------------------------------------------
// Recording arrivals (browser)
// ---------------------------------------------------------------------------

export interface Arrival {
  href: string;
  referrer?: string | null;
  now?: Date;
  /** Hosts (or URLs) that are the site itself. */
  ownHosts?: readonly string[];
}

export function buildTouch({ href, referrer, now = new Date(), ownHosts = [] }: Arrival): Touch {
  const url = new URL(href);
  const params = url.searchParams;
  const touch: Touch = { at: now.toISOString(), landing: cleanPath(url.pathname) || '/' };

  const ref = referrerHost(referrer, ownHosts);
  if (ref) touch.ref = ref;

  for (const key of UTM_KEYS) {
    const value = cleanText(params.get(key), 150);
    if (value) touch[key] = value;
  }
  for (const kind of CLICK_KINDS) {
    const id = cleanClickId(params.get(kind));
    if (id) touch[kind] = id;
  }

  const gad = cleanText(params.get('gad_source'), 20);
  if (gad) touch.gad_source = gad;
  if (params.has('srsltid')) touch.srsltid = '1';

  return touch;
}

function isFresh(at: string | undefined, now: number): boolean {
  const time = at ? Date.parse(at) : NaN;
  // A day of slack the other way, for a phone whose clock runs ahead.
  return Number.isFinite(time) && now - time <= ATTRIBUTION_MAX_AGE_MS && time - now <= 24 * 60 * 60 * 1000;
}

/** Drop whatever has aged out of the window. */
export function pruneAttribution(state: AttributionState | null | undefined, now: Date = new Date()): AttributionState {
  const n = now.getTime();
  const out: AttributionState = {};

  if (state?.first && isFresh(state.first.at, n)) out.first = state.first;
  if (state?.last && isFresh(state.last.at, n)) out.last = state.last;

  const clicks: Partial<Record<ClickKind, ClickRecord>> = {};
  for (const kind of CLICK_KINDS) {
    const click = state?.clicks?.[kind];
    if (click?.id && isFresh(click.at, n)) clicks[kind] = click;
  }
  if (Object.keys(clicks).length) out.clicks = clicks;

  return out;
}

/**
 * Fold one arrival into the stored state.
 *
 * A direct arrival matters only as the session's first page, and then only as
 * a first touch. Later direct page loads in the same session are navigation,
 * not arrivals.
 */
export function recordTouch(
  state: AttributionState | null | undefined,
  touch: Touch,
  { sessionStart }: { sessionStart: boolean },
): AttributionState {
  const next = pruneAttribution(state, new Date(touch.at));
  const direct = classifyTouch(touch).channel === 'direct';

  if (direct && !sessionStart) return next;

  if (!next.first) next.first = touch;
  if (!direct) next.last = touch;

  for (const kind of CLICK_KINDS) {
    const id = touch[kind];
    if (id) next.clicks = { ...next.clicks, [kind]: { id, at: touch.at } };
  }

  return next;
}

// ---------------------------------------------------------------------------
// The arrival event (Vercel Web Analytics)
// ---------------------------------------------------------------------------

/**
 * Is this page load an arrival — exactly what recordTouch keeps: the first
 * page of a browser session, or any page reached from a tagged or referring
 * link. A later direct page load in the same session is navigation.
 */
export function isArrival(touch: Touch, { sessionStart }: { sessionStart: boolean }): boolean {
  return sessionStart || classifyTouch(touch).channel !== 'direct';
}

export const ARRIVAL_EVENT = 'arrival';

/** Vercel Web Analytics on Pro: two properties per custom event, 255 characters per value. */
const ARRIVAL_MAX_VALUE = 255;

export interface ArrivalEventData {
  /** The browser's own reading, for Vercel's dashboard and to compare; the server classifies again from `params`. */
  channel: Channel;
  /** The landing URL's attribution as a query string — see arrivalEventData. */
  params: string;
}

/** Blanked as the server blanks what it keeps (app-traffic.php's nalla_traffic_redact): e-mail addresses, phone-like runs of 7+ digits. */
function redact(value: string): string {
  return value
    .replace(/[^\s@/?&=:;,<>()"']+@[^\s@/?&=:;,<>()"']+\.[^\s@/?&=:;,<>()"']{2,}/gu, '[מייל]')
    .replace(/\+?\d[\d\s().-]{5,}\d/gu, (run) => (run.replace(/\D+/g, '').length >= 7 ? '[טלפון]' : run));
}

/** The first `n` characters, by code point (an emoji is never cut in half). */
const head = (value: string, n: number): string => Array.from(value).slice(0, Math.max(0, n)).join('');

/**
 * The custom event the storefront sends on every arrival.
 *
 * Vercel's Web Analytics drain carries no query string on this plan, so the
 * click id and the UTM of an ad visit never reached the shop's own analytics:
 * a Google ad arrived as "google.com" and read as organic, a Facebook ad as a
 * Facebook post, and no campaign was ever known. This puts back exactly what
 * the classifier reads — nothing more:
 *
 *   params  the landing URL's attribution, as a query string:
 *           click         the KIND of the strongest click id (gclid, gbraid,
 *                         wbraid, msclkid, ttclid, fbclid) — never the id
 *           utm_source, utm_medium, utm_campaign
 *           gad_source, srsltid   as 1 when the URL had them
 *           ref           the referring host (never the referring URL)
 *   channel the browser's own reading of it
 *
 * Two properties, Vercel Pro's limit, each at most 255 characters: a long
 * campaign is cut first, then the medium and the source, then the referring
 * host is left to the event's own referrer. utm_term and utm_content are
 * never sent; an e-mail address or a phone number in a UTM value is blanked.
 * The server classifies again from `params` with its own port of these rules
 * and keeps `channel` only to compare.
 */
export function arrivalEventData(touch: Touch): ArrivalEventData {
  const { channel } = classifyTouch(touch);
  const click = CLICK_KINDS.find((kind) => touch[kind]);
  const clean = (value?: string): string => (value ? redact(value) : '');
  let source = clean(touch.utm_source);
  let medium = clean(touch.utm_medium);
  let campaign = clean(touch.utm_campaign);
  let ref = touch.ref || '';

  const build = (): string => {
    const params = new URLSearchParams();
    if (click) params.set('click', click);
    if (source) params.set('utm_source', source);
    if (medium) params.set('utm_medium', medium);
    if (campaign) params.set('utm_campaign', campaign);
    if (touch.gad_source) params.set('gad_source', '1');
    if (touch.srsltid) params.set('srsltid', '1');
    if (ref) params.set('ref', ref);
    return params.toString();
  };

  let params = build();
  for (const [take, floor] of [['campaign', 0], ['medium', 40], ['source', 60], ['ref', 0], ['medium', 0], ['source', 0]] as const) {
    while (params.length > ARRIVAL_MAX_VALUE) {
      if (take === 'ref') { if (!ref) break; ref = ''; }
      else {
        const now = take === 'campaign' ? campaign : take === 'medium' ? medium : source;
        const len = Array.from(now).length;
        if (len <= floor) break;
        const next = head(now, Math.max(floor, len - 8));
        if (take === 'campaign') campaign = next; else if (take === 'medium') medium = next; else source = next;
      }
      params = build();
    }
  }

  return { channel, params };
}

/** The single record the storefront kept before first/last touches existed. */
export interface LegacyUtm {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  gclid?: string;
  gbraid?: string;
  wbraid?: string;
  fbclid?: string;
  landing_page?: string;
  referrer?: string;
  timestamp?: string;
}

/**
 * Read a legacy record as a touch. One without a timestamp predates the expiry
 * check, so its age is unknown and it cannot speak for anything.
 */
export function touchFromLegacy(raw: unknown, ownHosts: readonly string[] = []): Touch | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const utm = raw as Record<string, unknown>;

  const at = cleanIso(utm.timestamp);
  if (!at) return undefined;

  const touch: Touch = { at, landing: cleanPath(utm.landing_page) || '/' };
  const ref = typeof utm.referrer === 'string' ? referrerHost(utm.referrer, ownHosts) : undefined;
  if (ref) touch.ref = ref;

  for (const key of UTM_KEYS) {
    const value = cleanText(utm[key], 150);
    if (value) touch[key] = value;
  }
  for (const kind of CLICK_KINDS) {
    const id = cleanClickId(utm[kind]);
    if (id) touch[kind] = id;
  }

  return touch;
}

export function stateFromLegacy(raw: unknown, ownHosts: readonly string[] = [], now: Date = new Date()): AttributionState {
  const touch = touchFromLegacy(raw, ownHosts);
  return touch ? pruneAttribution(recordTouch({}, touch, { sessionStart: true }), now) : {};
}

// ---------------------------------------------------------------------------
// Reading what a browser sent (server)
// ---------------------------------------------------------------------------

function sanitizeTouch(raw: unknown, ownHosts: readonly string[]): Touch | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const r = raw as Record<string, unknown>;

  const at = cleanIso(r.at);
  if (!at) return undefined;

  const touch: Touch = { at, landing: cleanPath(r.landing) || '/' };

  if (typeof r.ref === 'string') {
    const host = lower(r.ref);
    if (/^[a-z0-9.-]{1,100}$/.test(host) && !isOwnHost(host, ownHosts) && !hostIn(host, PAYMENT_HOSTS)) touch.ref = host;
  }
  for (const key of UTM_KEYS) {
    const value = cleanText(r[key], 150);
    if (value) touch[key] = value;
  }
  for (const kind of CLICK_KINDS) {
    const id = cleanClickId(r[kind]);
    if (id) touch[kind] = id;
  }

  const gad = cleanText(r.gad_source, 20);
  if (gad) touch.gad_source = gad;
  if (r.srsltid) touch.srsltid = '1';

  return touch;
}

/** Validate a state that came over the wire. Anything not in our own shape is dropped. */
export function sanitizeAttribution(raw: unknown, ownHosts: readonly string[] = [], now: Date = new Date()): AttributionState {
  if (!raw || typeof raw !== 'object') return {};
  const r = raw as Record<string, unknown>;
  const out: AttributionState = {};

  const first = sanitizeTouch(r.first, ownHosts);
  if (first) out.first = first;

  const last = sanitizeTouch(r.last, ownHosts);
  if (last && classifyTouch(last).channel !== 'direct') out.last = last;

  if (r.clicks && typeof r.clicks === 'object') {
    const clicks: Partial<Record<ClickKind, ClickRecord>> = {};
    for (const kind of CLICK_KINDS) {
      const click = (r.clicks as Record<string, unknown>)[kind] as Record<string, unknown> | undefined;
      const id = cleanClickId(click?.id);
      const at = cleanIso(click?.at);
      if (id && at) clicks[kind] = { id, at };
    }
    if (Object.keys(clicks).length) out.clicks = clicks;
  }

  return pruneAttribution(out, now);
}

/** The compact form stored on an order and a WhatsApp lead. */
export interface TouchSummary {
  channel: Channel;
  detail?: string;
  source?: string;
  medium?: string;
  campaign?: string;
  click?: ClickKind;
  ref?: string;
  landing: string;
  at: string;
}

export function summarizeTouch(touch: Touch): TouchSummary {
  const { channel, detail } = classifyTouch(touch);
  const click = CLICK_KINDS.find((kind) => touch[kind]);

  // Built in a fixed key order, so the stored JSON reads the same on every order.
  return {
    channel,
    ...(detail ? { detail } : {}),
    ...(touch.utm_source ? { source: touch.utm_source } : {}),
    ...(touch.utm_medium ? { medium: touch.utm_medium } : {}),
    ...(touch.utm_campaign ? { campaign: touch.utm_campaign } : {}),
    ...(click ? { click } : {}),
    ...(touch.ref ? { ref: touch.ref } : {}),
    landing: touch.landing,
    at: touch.at,
  };
}

// ---------------------------------------------------------------------------
// The order
// ---------------------------------------------------------------------------

export type OrderEntry = 'rep' | 'site';

export interface MetaRow {
  key: string;
  value: string;
}

export interface OrderAttribution {
  entry: OrderEntry;
  channel: Channel;
  label: string;
  /** The touch the channel was read from: the last non-direct one, else the first. */
  attributed?: Touch;
  /** Newest id of each kind inside the window. Empty on a rep's order. */
  clicks: Partial<Record<ClickKind, ClickRecord>>;
  firstJson?: string;
  lastJson?: string;
  meta: MetaRow[];
}

export interface OrderAttributionInput {
  entry: OrderEntry;
  /** `attribution` from the request body, as the browser sent it. */
  attribution?: unknown;
  /** `utm_data` from a page loaded before this shipped. Read only when `attribution` is absent. */
  legacyUtm?: unknown;
  ownHosts?: readonly string[];
  now?: Date;
}

/**
 * Everything create-order writes about where the order came from.
 *
 * A rep's order carries no touches and no click ids at all. The browser in
 * sales-rep mode belongs to the salesperson, and whatever brought them to the
 * site has nothing to do with the customer in front of them. Where that
 * customer came from is resolved later, server side.
 *
 * The legacy keys keep their meaning: `_utm_*` and `_landing_page` describe
 * the attributed touch, `_gclid` / `_fbclid` the newest click of that kind.
 */
export function buildOrderAttribution({
  entry,
  attribution,
  legacyUtm,
  ownHosts = [],
  now = new Date(),
}: OrderAttributionInput): OrderAttribution {
  if (entry === 'rep') {
    const label = CHANNEL_LABELS.rep;
    return {
      entry,
      channel: 'rep',
      label,
      clicks: {},
      meta: [
        { key: 'מקור הגעה', value: label },
        { key: '_order_entry', value: 'rep' },
        { key: '_nalla_channel', value: 'rep' },
      ],
    };
  }

  const state =
    attribution !== undefined && attribution !== null
      ? sanitizeAttribution(attribution, ownHosts, now)
      : stateFromLegacy(legacyUtm, ownHosts, now);

  const attributed = state.last ?? state.first;
  const { channel, label } = classifyTouch(attributed);

  const clicks: Partial<Record<ClickKind, ClickRecord>> = { ...state.clicks };
  if (attributed) {
    for (const kind of CLICK_KINDS) {
      const id = attributed[kind];
      if (id && !clicks[kind]) clicks[kind] = { id, at: attributed.at };
    }
  }

  const firstJson = state.first ? JSON.stringify(summarizeTouch(state.first)) : undefined;
  const lastJson = state.last ? JSON.stringify(summarizeTouch(state.last)) : undefined;

  const row = (key: string, value: string | undefined): MetaRow[] => (value ? [{ key, value }] : []);

  return {
    entry,
    channel,
    label,
    attributed,
    clicks,
    firstJson,
    lastJson,
    meta: [
      { key: 'מקור הגעה', value: label },
      ...row('_utm_source', attributed?.utm_source),
      ...row('_utm_medium', attributed?.utm_medium),
      ...row('_utm_campaign', attributed?.utm_campaign),
      ...row('_gclid', clicks.gclid?.id),
      ...row('_gbraid', clicks.gbraid?.id),
      ...row('_wbraid', clicks.wbraid?.id),
      ...row('_fbclid', clicks.fbclid?.id),
      ...row('_landing_page', attributed?.landing),
      { key: '_order_entry', value: 'site' },
      { key: '_nalla_channel', value: channel },
      ...row('_nalla_attr_first', firstJson),
      ...row('_nalla_attr_last', lastJson),
    ],
  };
}

/** Carry the tracking parameters of a request onto a redirect target. */
export function withTrackingParams(target: URL, from: URLSearchParams): URL {
  for (const key of TRACKING_PARAMS) {
    const value = from.get(key);
    if (value !== null && !target.searchParams.has(key)) target.searchParams.set(key, value);
  }

  return target;
}
