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
    total += base;
    baseForPct = base;
    breakdown.base_price = base;

    const extraCm = w - Number(wCfg.min ?? w);
    const mode = wCfg.mode ?? 'linear';
    const rateType = wCfg.rate_type ?? 'fixed';
    let wExtra = 0;

    if (mode === 'tiered' && Array.isArray(wCfg.tiers) && wCfg.tiers.length > 0) {
      wExtra = tieredCost(Number(wCfg.min ?? 0), w, wCfg.tiers, rateType, base);
    } else {
      const rate = Number(wCfg.per_cm ?? 0);
      wExtra = rateType === 'percent' ? extraCm * base * (rate / 100) : extraCm * rate;
    }

    total += wExtra;
    breakdown.width = { value: w, extra_cm: extraCm, amount: wExtra };
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

function tieredCost(
  start: number,
  value: number,
  tiers: FormulaTier[],
  rateType: 'fixed' | 'percent',
  basePrice: number
): number {
  let cost = 0;
  for (const tier of tiers) {
    const from = Number(tier.from ?? 0);
    const to = Number(tier.to ?? 0);
    const rate = Number(tier.per_cm ?? 0);
    const lo = Math.max(start, from);
    const hi = Math.min(value, to);
    if (hi > lo) {
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
