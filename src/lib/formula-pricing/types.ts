/**
 * Formula Pricing — types mirroring the WP module
 * (wp-content/themes/darion-child/formula-pricing).
 *
 * Source of truth for the config shape is class-nalla-formula-calculator.php.
 */

export type FormulaDimension = 'width' | 'depth' | 'height';

export interface FormulaTier {
  from: number;
  to: number;
  per_cm: number;
}

export interface FormulaDimensionConfig {
  min?: number;
  max?: number;
  /** Width only — the base price of the variation at minimum width */
  base_price?: number;
  /** Width only — 'linear' (default) or 'tiered' */
  mode?: 'linear' | 'tiered';
  per_cm?: number;
  /** 'fixed' (₪ per cm, default) or 'percent' (% of base price per cm) */
  rate_type?: 'fixed' | 'percent';
  /** Width only, when mode === 'tiered' */
  tiers?: FormulaTier[];
}

export interface FormulaConfig {
  width?: FormulaDimensionConfig;
  depth?: FormulaDimensionConfig;
  height?: FormulaDimensionConfig;
}

export interface FormulaVariation {
  variation_id: number;
  /** WC variation attributes, e.g. { attribute_pa_color: 'walnut' } */
  attributes: Record<string, string>;
  config: FormulaConfig;
  price_range: { min: number; max: number };
}

/** Response of GET /wp-json/nalla/v1/formula/{product_id} */
export interface FormulaProductConfig {
  enabled: boolean;
  product_id?: number;
  show_depth?: boolean;
  show_height?: boolean;
  round_to?: number;
  variations?: FormulaVariation[];
}

export type FormulaDimensions = Partial<Record<FormulaDimension, number>>;

export interface FormulaCalcResult {
  price: number;
  breakdown: {
    base_price?: number;
    width?: { value: number; extra_cm: number; amount: number };
    depth?: { value: number; extra_cm: number; amount: number };
    height?: { value: number; extra_cm: number; amount: number };
  };
  errors: string[];
}

/** What gets stored on a cart item for a formula-priced product */
export interface FormulaFieldsData {
  dimensions: FormulaDimensions;
  price: number;
}
