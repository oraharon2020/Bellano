'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Ruler, Minus, Plus } from 'lucide-react';
import { calculateFormulaPrice, applyFormulaRounding, snapToStep } from '@/lib/formula-pricing';
import type {
  FormulaConfig,
  FormulaDimension,
  FormulaDimensions,
  FormulaFieldsData,
} from '@/lib/formula-pricing';

const DIM_LABELS: Record<FormulaDimension, string> = {
  width: 'רוחב',
  depth: 'עומק',
  height: 'גובה',
};

interface FormulaPricingPanelProps {
  /** Formula config of the currently selected variation */
  config: FormulaConfig;
  showDepth: boolean;
  showHeight: boolean;
  roundTo: number;
  /** Optional custom labels per dimension (e.g. width → "קוטר"). */
  labels?: Partial<Record<FormulaDimension, string>>;
  /** Fires on every dimension change with the chosen dims + calculated price */
  onChange: (data: FormulaFieldsData) => void;
}

export function FormulaPricingPanel({
  config,
  showDepth,
  showHeight,
  roundTo,
  labels,
  onChange,
}: FormulaPricingPanelProps) {
  const labelFor = (dim: FormulaDimension): string =>
    (labels && labels[dim]) || DIM_LABELS[dim];

  const visibleDims = useMemo(() => {
    const dims: FormulaDimension[] = [];
    if (config.width) dims.push('width');
    if (showDepth && config.depth) dims.push('depth');
    if (showHeight && config.height) dims.push('height');
    return dims;
  }, [config, showDepth, showHeight]);

  const initialDims = useMemo(() => {
    const d: FormulaDimensions = {};
    for (const dim of visibleDims) {
      const cfg = config[dim];
      const fallback = Number(cfg?.default ?? cfg?.min ?? 0);
      d[dim] = cfg ? snapToStep(fallback, cfg) : fallback;
    }
    return d;
  }, [visibleDims, config]);

  const [dims, setDims] = useState<FormulaDimensions>(initialDims);

  // Reset to defaults when the variation (and therefore the config) changes
  useEffect(() => {
    setDims(initialDims);
  }, [initialDims]);

  const result = useMemo(() => {
    const r = calculateFormulaPrice(config, dims);
    return { ...r, price: applyFormulaRounding(r.price, roundTo) };
  }, [config, dims, roundTo]);

  // Notify parent via ref so an inline onChange prop can't cause an effect loop
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  useEffect(() => {
    onChangeRef.current({ dimensions: dims, price: result.price });
  }, [dims, result.price]);

  const clampDim = (dim: FormulaDimension, raw: number) => {
    const cfg = config[dim];
    if (!cfg) return;
    setDims((prev) => ({ ...prev, [dim]: snapToStep(raw, cfg) }));
  };

  if (visibleDims.length === 0) return null;

  // Below this many discrete options we show tap-to-select chips instead of a
  // slider — a 3-stop slider is fiddly, chips are a single confident tap.
  const CHIP_THRESHOLD = 8;

  return (
    <div className="mb-4 md:mb-6 border border-gray-200 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-4">
        <Ruler className="w-4 h-4 text-gray-500" />
        <span className="text-sm font-medium text-gray-900">התאמת מידות</span>
        <span className="text-xs text-gray-400">המחיר מתעדכן לפי המידות שתבחרו</span>
      </div>

      <div className="space-y-5">
        {visibleDims.map((dim) => {
          const cfg = config[dim]!;
          const min = Number(cfg.min ?? 0);
          const max = Number(cfg.max ?? min);
          const step = Number(cfg.step) > 0 ? Number(cfg.step) : 1;
          const value = dims[dim] ?? min;
          const extra =
            dim === 'width' ? result.breakdown.width?.amount : result.breakdown[dim]?.amount;

          // Build the list of valid stops (min, min+step, … , max).
          const options: number[] = [];
          if (max > min) {
            for (let v = min; v <= max + 0.001; v += step) {
              options.push(Math.round(v * 100) / 100);
            }
            if (options[options.length - 1] !== max) options.push(max);
          }
          const useChips = options.length > 1 && options.length <= CHIP_THRESHOLD;

          return (
            <div key={dim}>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor={`formula-${dim}`} className="text-xs font-medium text-gray-700">
                  {labelFor(dim)}
                  {extra != null && extra > 0 && (
                    <span className="text-gray-400 font-normal mr-2">
                      (+{Math.round(extra).toLocaleString()}₪)
                    </span>
                  )}
                </label>
                <span className="text-sm font-semibold text-gray-900">
                  {value} <span className="text-xs font-normal text-gray-400">ס״מ</span>
                </span>
              </div>

              {/* Few options → tap-to-select chips */}
              {useChips && (
                <div className="flex flex-wrap gap-2">
                  {options.map((opt) => {
                    const active = Math.abs(opt - value) < 0.001;
                    return (
                      <button
                        key={opt}
                        type="button"
                        aria-pressed={active}
                        onClick={() => clampDim(dim, opt)}
                        className={`min-w-[3.25rem] rounded-lg border px-3 py-2 text-sm font-medium transition-all ${
                          active
                            ? 'border-black bg-black text-white shadow-sm'
                            : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400 hover:bg-gray-50'
                        }`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Many options → stepper + slider with tick stops */}
              {!useChips && max > min && (
                <>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      aria-label={`הקטן ${labelFor(dim)}`}
                      onClick={() => clampDim(dim, value - step)}
                      disabled={value <= min}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-gray-300 text-gray-700 transition-colors hover:border-black hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-gray-300 disabled:hover:bg-transparent disabled:hover:text-gray-700"
                    >
                      <Minus className="h-4 w-4" />
                    </button>

                    <input
                      id={`formula-${dim}`}
                      type="range"
                      aria-label={`${labelFor(dim)} בס״מ`}
                      list={`formula-ticks-${dim}`}
                      min={min}
                      max={max}
                      step={step}
                      value={Math.min(Math.max(value, min), max)}
                      onChange={(e) => clampDim(dim, Number(e.target.value))}
                      className="h-2 flex-1 accent-black cursor-pointer"
                    />

                    <button
                      type="button"
                      aria-label={`הגדל ${labelFor(dim)}`}
                      onClick={() => clampDim(dim, value + step)}
                      disabled={value >= max}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-gray-300 text-gray-700 transition-colors hover:border-black hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-gray-300 disabled:hover:bg-transparent disabled:hover:text-gray-700"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  <datalist id={`formula-ticks-${dim}`}>
                    {options.map((opt) => (
                      <option key={opt} value={opt} />
                    ))}
                  </datalist>
                  <div className="mt-1 flex justify-between px-11 text-[11px] text-gray-400">
                    <span>{min} ס״מ</span>
                    <span>{max} ס״מ</span>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
