/**
 * Formula Pricing — client-side calculator.
 *
 * EXACT mirror of class-nalla-formula-calculator.php so slider feedback is
 * instant with no network round-trip. The server recalculates the price
 * independently at order creation (create-order route), so this is for
 * display only — a drifted client price can never reach an order.
 */

import type {
  FormulaConfig,
  FormulaDimensionConfig,
  FormulaTier,
  FormulaDimensions,
  FormulaCalcResult,
} from './types';

/**
 * Snap a chosen value to the nearest valid step, measured from the dimension's
 * minimum, then clamp into [min, max]. Mirrors snap_to_step() in the PHP
 * calculator so the client price always matches the server price.
 */
export function snapToStep(value: number, cfg: FormulaDimensionConfig): number {
  const min = Number(cfg.min ?? value);
  let v = value;
  const step = Number(cfg.step ?? 0);
  if (step > 0) {
    v = min + Math.round((v - min) / step) * step;
  }
  if (cfg.min != null && v < cfg.min) v = cfg.min;
  if (cfg.max != null && v > cfg.max) v = cfg.max;
  return Math.round(v * 100) / 100;
}

export function calculateFormulaPrice(
  config: FormulaConfig,
  dimensions: FormulaDimensions
): FormulaCalcResult {
  const breakdown: FormulaCalcResult['breakdown'] = {};
  const errors: string[] = [];
  let total = 0;
  let baseForPct = 0;

  // ── Width ──────────────────────────────────────────────────
  if (config.width && dimensions.width != null) {
    const wCfg = config.width;
    let w = snapToStep(dimensions.width, wCfg);

    if (wCfg.min != null && w < wCfg.min) {
      errors.push(`width below minimum (${wCfg.min})`);
      w = wCfg.min;
    }
    if (wCfg.max != null && w > wCfg.max) {
      errors.push(`width above maximum (${wCfg.max})`);
      w = wCfg.max;
    }

    const base = Number(wCfg.base_price ?? 0);
    baseForPct = base;

    const extraCm = w - Number(wCfg.min ?? w);
    const mode = wCfg.mode ?? 'linear';
    const rateType = wCfg.rate_type ?? 'fixed';
    let wExtra = 0;
    let anchored = false;

    if (mode === 'tiered' && Array.isArray(wCfg.tiers) && wCfg.tiers.length > 0) {
      const priced = tieredWidthPrice(Number(wCfg.min ?? 0), w, wCfg.tiers, rateType, base);
      if (priced.anchored) {
        // An anchored tier states the price from that width up: the variation
        // price and every earlier tier stop applying. Mirrors PHP.
        anchored = true;
        total += priced.amount;
        breakdown.base_price = 0;
      } else {
        wExtra = priced.amount;
      }
    } else {
      const rate = Number(wCfg.per_cm ?? 0);
      wExtra = rateType === 'percent' ? extraCm * base * (rate / 100) : extraCm * rate;
    }

    if (!anchored) {
      total += base + wExtra;
      breakdown.base_price = base;
    }
    breakdown.width = { value: w, extra_cm: extraCm, amount: wExtra, anchored };
  }

  // ── Depth / Height (linear only) ───────────────────────────
  for (const dim of ['depth', 'height'] as const) {
    const cfg = config[dim];
    if (cfg && dimensions[dim] != null) {
      const extra = linearExtra(cfg, dimensions[dim]!, errors, dim, baseForPct);
      total += extra.amount;
      breakdown[dim] = extra;
    }
  }

  return {
    price: Math.round(total * 100) / 100,
    breakdown,
    errors,
  };
}

function linearExtra(
  cfg: FormulaDimensionConfig,
  value: number,
  errors: string[],
  label: string,
  basePrice: number
) {
  let v = snapToStep(value, cfg);
  if (cfg.min != null && v < cfg.min) {
    errors.push(`${label} below minimum (${cfg.min})`);
    v = cfg.min;
  }
  if (cfg.max != null && v > cfg.max) {
    errors.push(`${label} above maximum (${cfg.max})`);
    v = cfg.max;
  }
  const extraCm = v - Number(cfg.min ?? v);
  const rate = Number(cfg.per_cm ?? 0);
  const rateType = cfg.rate_type ?? 'fixed';
  const amount = rateType === 'percent' ? extraCm * basePrice * (rate / 100) : extraCm * rate;
  return { value: v, extra_cm: extraCm, amount };
}

/**
 * Sort tiers by their start and trim away any overlap, so every centimetre is
 * charged exactly once and the result never depends on the order the rows were
 * written in. Mirrors normalize_tiers() in the PHP calculator exactly.
 *
 * Where tiers overlap, the one that starts earlier keeps the overlap.
 */
function normalizeTiers(tiers: FormulaTier[]): FormulaTier[] {
  const clean = tiers
    .filter((t) => t && Number(t.to ?? 0) > Number(t.from ?? 0))
    .map((t) => ({
      from: Number(t.from ?? 0),
      to: Number(t.to ?? 0),
      per_cm: Number(t.per_cm ?? 0),
      start_price:
        t.start_price === undefined || t.start_price === null || (t.start_price as unknown) === ''
          ? null
          : Number(t.start_price),
    }))
    .sort((a, b) => (a.from === b.from ? a.to - b.to : a.from - b.from));

  const out: FormulaTier[] = [];
  let covered: number | null = null;
  for (const t of clean) {
    const from = covered !== null && t.from < covered ? covered : t.from;
    if (t.to <= from) continue; // fully swallowed by an earlier tier
    covered = covered === null ? t.to : Math.max(covered, t.to);
    out.push({ ...t, from });
  }
  return out;
}

/**
 * Price the width when tiers are in play. A tier may carry `start_price`: from
 * that width up, that IS the price. Mirrors tiered_width_price() in PHP.
 */
function tieredWidthPrice(
  min: number,
  value: number,
  tiers: FormulaTier[],
  rateType: 'fixed' | 'percent',
  basePrice: number
): { anchored: boolean; amount: number } {
  const norm = normalizeTiers(tiers);
  let anchor: FormulaTier | null = null;
  for (const t of norm) {
    if (t.start_price == null) continue;
    if (Number(t.from) <= value) anchor = t;
  }
  if (!anchor) return { anchored: false, amount: tieredCost(min, value, tiers, rateType, basePrice) };
  let amount = Number(anchor.start_price);
  for (const t of norm) {
    const lo = Math.max(Number(anchor.from), Number(t.from));
    const hi = Math.min(value, Number(t.to));
    if (hi > lo) {
      const rate = Number(t.per_cm ?? 0);
      amount += rateType === 'percent' ? (hi - lo) * basePrice * (rate / 100) : (hi - lo) * rate;
    }
  }
  return { anchored: true, amount };
}

function tieredCost(
  start: number,
  value: number,
  tiers: FormulaTier[],
  rateType: 'fixed' | 'percent',
  basePrice: number
): number {
  let cost = 0;
  for (const tier of normalizeTiers(tiers)) {
    const lo = Math.max(start, Number(tier.from));
    const hi = Math.min(value, Number(tier.to));
    if (hi > lo) {
      const rate = Number(tier.per_cm ?? 0);
      cost += rateType === 'percent' ? (hi - lo) * basePrice * (rate / 100) : (hi - lo) * rate;
    }
  }
  return cost;
}

/** Round a price to the nearest multiple. roundTo = 0 disables. */
export function applyFormulaRounding(price: number, roundTo: number): number {
  if (!roundTo || roundTo <= 0) return Math.round(price * 100) / 100;
  return Math.round(price / roundTo) * roundTo;
}
