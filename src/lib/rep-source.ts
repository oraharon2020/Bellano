/**
 * "איך הלקוח הגיע אלינו?" — what a sales rep marks at checkout in rep mode.
 *
 * About half of the orders are entered by reps through the site's own
 * checkout, and those orders carry the rep's browser: no click, UTM or
 * referrer on them describes the customer (see attribution.ts — a rep's order
 * gets channel `rep` and nothing else). So the rep asks the customer and picks
 * one answer before the order can be placed. It is what the customer SAID,
 * kept apart from every click-based channel.
 *
 * Order meta, identical in Nalla's repo — the server analytics
 * (app-traffic.php, nalla_shop_rep_sources) reads the same keys on both shops:
 *
 *   _nalla_rep_source       one of REP_SOURCE_VALUES
 *   _nalla_rep_source_at    unix time (seconds) the order was placed
 *   _nalla_rep_source_note  the "אחר" text, sanitized, at most 60 characters —
 *                           only with `other`, only when there is any
 *
 * Only a VERIFIED rep order is asked for it, and only one carries it: a
 * customer's order ignores the field even when a request sends one, so a
 * forged value cannot pass for the rep's word.
 *
 * Pure on purpose — no imports, no window, no Next — so
 * tests/rep-source.test.mjs can run it under plain `node --test`.
 */

export const REP_SOURCE_VALUES = ['google', 'meta', 'ai', 'referral', 'returning', 'showroom', 'other'] as const;

export type RepSource = (typeof REP_SOURCE_VALUES)[number];

/** In the order the checkout shows them. */
export const REP_SOURCE_OPTIONS: readonly { value: RepSource; label: string }[] = [
  { value: 'google', label: 'גוגל' },
  { value: 'meta', label: 'פייסבוק / אינסטגרם' },
  { value: 'ai', label: 'ChatGPT / בינה מלאכותית' },
  { value: 'referral', label: 'המלצה מחבר או מכר' },
  { value: 'returning', label: 'לקוח חוזר' },
  { value: 'showroom', label: 'אולם התצוגה' },
  { value: 'other', label: 'אחר' },
];

export const REP_SOURCE_QUESTION = 'איך הלקוח הגיע אלינו?';

export const REP_SOURCE_NOTE_MAX = 60;

export const REP_SOURCE_MISSING_MESSAGE = 'יש לסמן איך הלקוח הגיע אלינו לפני שליחת ההזמנה.';

export const REP_SOURCE_INVALID_MESSAGE = 'התשובה ל"איך הלקוח הגיע אלינו?" לא זוהתה. סמנו שוב אחת מהאפשרויות ונסו שנית.';

export const REP_SOURCE_META = {
  source: '_nalla_rep_source',
  at: '_nalla_rep_source_at',
  note: '_nalla_rep_source_note',
} as const;

export function isRepSource(value: unknown): value is RepSource {
  return typeof value === 'string' && (REP_SOURCE_VALUES as readonly string[]).includes(value);
}

/**
 * The "אחר" text as it may be stored: control characters become spaces, the
 * bidi embedding/override/isolate marks and angle brackets go, whitespace
 * collapses, and it is cut to REP_SOURCE_NOTE_MAX characters (whole code
 * points, so an emoji is never split in half). Anything that is not a string
 * is no note.
 */
export function sanitizeRepSourceNote(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  let out = '';
  for (const ch of raw) {
    const c = ch.codePointAt(0) ?? 0;
    if (c < 0x20 || (c >= 0x7f && c <= 0x9f)) {
      out += ' ';
      continue;
    }
    if ((c >= 0x202a && c <= 0x202e) || (c >= 0x2066 && c <= 0x2069)) continue;
    if (ch === '<' || ch === '>') continue;
    out += ch;
  }
  out = out.replace(/\s+/g, ' ').trim();
  return Array.from(out).slice(0, REP_SOURCE_NOTE_MAX).join('').trim();
}

export type RepSourceValidation =
  | { ok: true; source: RepSource; note: string }
  | { ok: false; message: string };

/** The rep's answer: missing and unknown values are refused, the note is kept only with `other`. */
export function validateRepSource(source: unknown, note?: unknown): RepSourceValidation {
  if (source === undefined || source === null || source === '') {
    return { ok: false, message: REP_SOURCE_MISSING_MESSAGE };
  }
  if (!isRepSource(source)) return { ok: false, message: REP_SOURCE_INVALID_MESSAGE };
  return { ok: true, source, note: source === 'other' ? sanitizeRepSourceNote(note) : '' };
}

export interface RepSourceMetaRow {
  key: string;
  value: string;
}

export type RepSourceOrderMeta =
  | { ok: true; meta: RepSourceMetaRow[] }
  | { ok: false; status: 400; message: string };

/**
 * What create-order writes for the rep's answer, read from the request body
 * (`rep_source`, `rep_source_note`). `isRep` must come from the server's own
 * token verification, never from anything the browser says about itself.
 * A non-rep order gets nothing, whatever the body holds.
 */
export function repSourceOrderMeta(
  body: unknown,
  { isRep, now = new Date() }: { isRep: boolean; now?: Date }
): RepSourceOrderMeta {
  if (!isRep) return { ok: true, meta: [] };

  const fields = body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
  const answer = validateRepSource(fields.rep_source, fields.rep_source_note);
  if (!answer.ok) return { ok: false, status: 400, message: answer.message };

  const meta: RepSourceMetaRow[] = [
    { key: REP_SOURCE_META.source, value: answer.source },
    { key: REP_SOURCE_META.at, value: String(Math.floor(now.getTime() / 1000)) },
  ];
  if (answer.note) meta.push({ key: REP_SOURCE_META.note, value: answer.note });
  return { ok: true, meta };
}
