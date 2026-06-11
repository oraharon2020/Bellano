'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Ruler } from 'lucide-react';
import { calculateFormulaPrice, applyFormulaRounding } from '@/lib/formula-pricing';
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
  /** Fires on every dimension change with the chosen dims + calculated price */
  onChange: (data: FormulaFieldsData) => void;
}

export function FormulaPricingPanel({
  config,
  showDepth,
  showHeight,
  roundTo,
  onChange,
}: FormulaPricingPanelProps) {
  const visibleDims = useMemo(() => {
    const dims: FormulaDimension[] = [];
    if (config.width) dims.push('width');
    if (showDepth && config.depth) dims.push('depth');
    if (showHeight && config.height) dims.push('height');
    return dims;
  }, [config, showDepth, showHeight]);

  const minDims = useMemo(() => {
    const d: FormulaDimensions = {};
    for (const dim of visibleDims) {
      d[dim] = Number(config[dim]?.min ?? 0);
    }
    return d;
  }, [visibleDims, config]);

  const [dims, setDims] = useState<FormulaDimensions>(minDims);

  // Reset to minimums when the variation (and therefore the config) changes
  useEffect(() => {
    setDims(minDims);
  }, [minDims]);

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

  const setDim = (dim: FormulaDimension, raw: number) => {
    setDims((prev) => ({ ...prev, [dim]: raw }));
  };

  const clampDim = (dim: FormulaDimension, raw: number) => {
    const cfg = config[dim];
    let v = raw;
    if (cfg?.min != null && v < cfg.min) v = cfg.min;
    if (cfg?.max != null && v > cfg.max) v = cfg.max;
    setDims((prev) => ({ ...prev, [dim]: v }));
  };

  if (visibleDims.length === 0) return null;

  return (
    <div className="mb-4 md:mb-6 border border-gray-200 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-4">
        <Ruler className="w-4 h-4 text-gray-500" />
        <span className="text-sm font-medium text-gray-900">התאמת מידות</span>
        <span className="text-xs text-gray-400">המחיר מתעדכן לפי המידות שתבחרו</span>
      </div>

      <div className="space-y-4">
        {visibleDims.map((dim) => {
          const cfg = config[dim]!;
          const min = Number(cfg.min ?? 0);
          const max = Number(cfg.max ?? min);
          const value = dims[dim] ?? min;
          const extra =
            dim === 'width' ? result.breakdown.width?.amount : result.breakdown[dim]?.amount;

          return (
            <div key={dim}>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor={`formula-${dim}`} className="text-xs font-medium text-gray-700">
                  {DIM_LABELS[dim]}
                  {extra != null && extra > 0 && (
                    <span className="text-gray-400 font-normal mr-2">
                      (+{Math.round(extra).toLocaleString()}₪)
                    </span>
                  )}
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    id={`formula-${dim}`}
                    type="number"
                    inputMode="numeric"
                    min={min}
                    max={max}
                    value={value}
                    onChange={(e) => setDim(dim, Number(e.target.value))}
                    onBlur={(e) => clampDim(dim, Number(e.target.value))}
                    className="w-20 text-sm text-center border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:border-black"
                  />
                  <span className="text-xs text-gray-400">ס״מ</span>
                </div>
              </div>

              {max > min && (
                <>
                  <input
                    type="range"
                    aria-label={`${DIM_LABELS[dim]} בס״מ`}
                    min={min}
                    max={max}
                    step={1}
                    value={Math.min(Math.max(value, min), max)}
                    onChange={(e) => setDim(dim, Number(e.target.value))}
                    className="w-full h-2 accent-black cursor-pointer"
                  />
                  <div className="flex justify-between text-[11px] text-gray-400 mt-0.5">
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
