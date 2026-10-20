// What a Meshulam (Grow) payment notification may be logged with.
//
// A notification carries the payer's full name, phone and e-mail, the card's
// last digits, brand and expiry, and the transaction token. Vercel keeps
// function logs and shows them to everyone on the team, so none of that is
// written there. An allowlist, not a blocklist: a field Meshulam adds tomorrow
// stays out of the logs until someone decides it belongs in them.
//
// Kept: what is needed to trace a payment — status, our order id, Meshulam's
// asmachta and transaction id, the sum and the payment type.

export interface MeshulamLogSummary {
  status?: string;
  response?: string;          // the redirect's success / failure
  orderId?: string;           // cField1
  asmachta?: string;
  transactionId?: string;
  sum?: string;
  paymentType?: string;
  transactionTypeId?: string; // card / Bit / Apple Pay …
}

const MAX_LEN = 64;

function clean(value: unknown, max = MAX_LEN): string | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value !== 'string') return undefined;
  const s = value.replace(/\p{Cc}+/gu, ' ').trim();
  if (!s) return undefined;
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

/**
 * Meshulam's fields arrive in three shapes, depending on the route and the
 * content type: flat (`asmachta`), bracketed form keys (`data[asmachta]`), or
 * nested objects (`data.asmachta`). `path` is the nested form, e.g.
 * ['data', 'customFields', 'cField1'].
 */
function lookup(data: Record<string, unknown>, path: string[]): unknown {
  const bracketed = path[0] + path.slice(1).map((p) => `[${p}]`).join('');
  if (data[bracketed] !== undefined) return data[bracketed];
  let node: unknown = data;
  for (const p of path) {
    if (!node || typeof node !== 'object') return undefined;
    node = (node as Record<string, unknown>)[p];
  }
  return node;
}

function first(data: Record<string, unknown>, ...paths: string[][]): string | undefined {
  for (const path of paths) {
    const v = clean(lookup(data, path));
    if (v !== undefined) return v;
  }
  return undefined;
}

/** The loggable part of a Meshulam notification — everything else is dropped. */
export function summarizeMeshulamPayload(payload: unknown): MeshulamLogSummary {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return {};
  const data = payload as Record<string, unknown>;
  const summary: MeshulamLogSummary = {
    status: first(data, ['status'], ['data', 'status']),
    response: first(data, ['response']),
    orderId: first(data, ['data', 'customFields', 'cField1'], ['cField1'], ['data', 'cField1']),
    asmachta: first(data, ['data', 'asmachta'], ['asmachta']),
    transactionId: first(data, ['data', 'transactionId'], ['transactionId']),
    sum: first(data, ['data', 'sum'], ['sum']),
    paymentType: first(data, ['data', 'paymentType'], ['paymentType']),
    transactionTypeId: first(data, ['data', 'transactionTypeId'], ['transactionTypeId']),
  };
  for (const k of Object.keys(summary) as Array<keyof MeshulamLogSummary>) {
    if (summary[k] === undefined) delete summary[k];
  }
  return summary;
}

/**
 * An error thrown while reading a notification, safe to log. A SyntaxError
 * from JSON.parse quotes the start of the body it failed on — that body is the
 * payer's details — so only its name is kept.
 */
export function describeErrorForLog(error: unknown): string {
  if (error instanceof SyntaxError) return 'SyntaxError (body could not be parsed)';
  if (error instanceof Error) {
    const msg = clean(error.message, 160);
    return msg ? `${error.name}: ${msg}` : error.name;
  }
  return 'non-Error thrown';
}
