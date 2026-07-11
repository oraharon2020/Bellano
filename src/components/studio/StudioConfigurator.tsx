'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import { Check, ChevronLeft, Loader2, RotateCcw, ShoppingBag } from 'lucide-react';
import { useCartStore } from '@/lib/store/cart';

interface Option { key: string; label: string; price: number; description?: string; image?: string }
interface Group { label: string; multiple?: boolean; options: Option[] }
interface Variation { id: number; name: string; attributes: { name: string; value: string }[]; image: string }
interface DimConfig { min?: number; max?: number; step?: number; default?: number }
interface FormulaVariation { variation_id: number; config: { width?: DimConfig; depth?: DimConfig; height?: DimConfig } }
interface StudioConfig {
  enabled: boolean;
  product: { id: number; name: string; slug: string; image: string; variations: Variation[] };
  formula: { show_depth?: boolean; show_height?: boolean; labels?: Record<string,string>; variations: FormulaVariation[] };
  studio: { eyebrow: string; title: string; intro: string; groups: Record<string, Group> };
}
interface Calculation { price: number; formula_price: number; options_price: number }

function values(config?: DimConfig) {
  if (!config?.min || !config?.max) return [];
  const step = config.step || 1, out: number[] = [];
  for (let n = config.min; n <= config.max; n += step) out.push(n);
  return out;
}

/**
 * Live layered preview: the selected colour image is the base, and each chosen
 * option that has a transparent layer image is stacked on top. Everything is
 * plain <img> (object-contain) so any admin.bellano.co.il media URL just works.
 */
function LivePreview({ base, layers, width, height }: { base: string; layers: string[]; width: number; height: number }) {
  return (
    <div className="relative w-full max-w-[560px] aspect-square mx-auto">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {base && <img src={base} alt="תצוגת הרהיט" className="absolute inset-0 w-full h-full object-contain" />}
      {layers.map((src, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={src + i} src={src} alt="" aria-hidden="true" className="absolute inset-0 w-full h-full object-contain pointer-events-none transition-opacity duration-300" />
      ))}
      <span className="absolute bottom-1 inset-x-0 text-center text-xs text-gray-500">{width} × {height} ס״מ · תצוגה חיה</span>
    </div>
  );
}

export function StudioConfigurator({ initial }: { initial: StudioConfig }) {
  const addItem = useCartStore(s => s.addItem);
  const firstVariation = initial.product.variations[0];
  const [variationId, setVariationId] = useState(firstVariation?.id || 0);
  const activeFormula = useMemo(() => initial.formula.variations.find(v => v.variation_id === variationId), [initial, variationId]);
  const defaultDims = useMemo(() => {
    const c = activeFormula?.config || {};
    return { width: c.width?.default || c.width?.min || 160, depth: c.depth?.default || c.depth?.min || 30, height: c.height?.default || c.height?.min || 25 };
  }, [activeFormula]);
  const defaultSelections = useMemo(() => Object.fromEntries(Object.entries(initial.studio.groups).map(([key,g]) => [key, g.multiple ? [] : g.options[0]?.key || ''])), [initial]);
  const [dimensions, setDimensions] = useState(defaultDims);
  const [selections, setSelections] = useState<Record<string,string|string[]>>(defaultSelections);
  const [calculation, setCalculation] = useState<Calculation | null>(null);
  const [loading, setLoading] = useState(true);
  const [added, setAdded] = useState(false);

  useEffect(() => setDimensions(defaultDims), [defaultDims]);
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/studio', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ product_id:initial.product.id, variation_id:variationId, dimensions, selections }), signal:controller.signal });
        if (!res.ok) throw new Error();
        setCalculation(await res.json());
      } catch (error) { if ((error as Error).name !== 'AbortError') setCalculation(null); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [initial.product.id, variationId, dimensions, selections]);

  const select = (groupKey:string, optionKey:string, multiple=false) => setSelections(prev => {
    if (!multiple) return {...prev,[groupKey]:optionKey};
    const current = (prev[groupKey] as string[]) || [];
    return {...prev,[groupKey]:current.includes(optionKey)?current.filter(k=>k!==optionKey):[...current,optionKey]};
  });
  const selected = (g:string,k:string) => Array.isArray(selections[g]) ? (selections[g] as string[]).includes(k) : selections[g] === k;
  const labels = Object.fromEntries(Object.entries(initial.studio.groups).map(([key,g]) => [key,g.options.filter(o=>selected(key,o.key)).map(o=>o.label)]));
  const variation = initial.product.variations.find(v=>v.id===variationId) || firstVariation;
  const baseImage = variation?.image || initial.product.image;
  const previewLayers = Object.entries(initial.studio.groups).flatMap(([key,group]) => group.options.filter(o => o.image && selected(key,o.key)).map(o => o.image as string));

  const add = () => {
    if (!calculation || !variation) return;
    const signature = btoa(unescape(encodeURIComponent(JSON.stringify({variationId,dimensions,selections})))).replace(/=|\//g,'').slice(0,24);
    addItem({
      id:`studio-${initial.product.id}-${signature}`, databaseId:initial.product.id, name:`${initial.product.name} · Studio`, slug:initial.product.slug,
      price:`${calculation.price} ₪`, image:{sourceUrl:variation.image || initial.product.image},
      variation:{id:variation.id,name:variation.name,attributes:variation.attributes},
      formulaFields:{dimensions,price:calculation.formula_price,labels:initial.formula.labels},
      studioFields:{productId:initial.product.id,variationId:variation.id,dimensions,selections,labels,price:calculation.price},
    });
    setAdded(true); setTimeout(()=>setAdded(false),1800);
  };

  const dims = activeFormula?.config || {};
  return (
    <div className="min-h-screen bg-[#f4f4f2] text-[#111]" dir="rtl">
      <header className="border-b border-black/10 bg-white"><div className="max-w-[1500px] mx-auto px-5 md:px-10 h-16 flex items-center justify-between"><span className="font-english tracking-[.35em] font-semibold">BELLANO STUDIO</span><a href={`/product/${initial.product.slug}`} className="text-sm text-gray-500 hover:text-black flex items-center gap-1">למוצר הרגיל <ChevronLeft className="w-4 h-4"/></a></div></header>
      <main className="max-w-[1500px] mx-auto grid lg:grid-cols-[1.15fr_.85fr] min-h-[calc(100vh-64px)]">
        <section className="relative bg-[#e9e8e5] p-5 md:p-10 flex flex-col min-h-[520px] lg:sticky lg:top-0 lg:h-[calc(100vh-64px)]">
          <div className="flex items-center justify-between"><span className="text-xs tracking-[.2em] uppercase text-gray-500">Live configuration</span><button onClick={()=>{setSelections(defaultSelections);setDimensions(defaultDims);}} className="text-xs flex gap-2 items-center text-gray-500"><RotateCcw className="w-3.5 h-3.5"/>איפוס</button></div>
          <div className="flex-1 min-h-[300px] flex items-center justify-center"><LivePreview base={baseImage} layers={previewLayers} width={dimensions.width} height={dimensions.height}/></div>
          <div className="bg-white/70 backdrop-blur p-4 grid grid-cols-3 gap-3 text-center"><div><span className="block text-xs text-gray-500">רוחב</span><b>{dimensions.width} ס״מ</b></div><div><span className="block text-xs text-gray-500">עומק</span><b>{dimensions.depth} ס״מ</b></div><div><span className="block text-xs text-gray-500">גובה</span><b>{dimensions.height} ס״מ</b></div></div>
        </section>
        <section className="bg-white px-5 md:px-10 py-10 md:py-14 lg:max-h-[calc(100vh-64px)] lg:overflow-y-auto">
          <p className="font-english text-xs tracking-[.35em] text-gray-400">{initial.studio.eyebrow}</p><h1 className="text-3xl md:text-5xl font-light mt-3 leading-tight">{initial.studio.title}</h1><p className="text-gray-500 mt-4 leading-relaxed">{initial.studio.intro}</p>
          <div className="mt-10 space-y-10">
            <div><h2 className="font-semibold mb-4">1. בחרו צבע וגימור</h2><div className="grid grid-cols-2 gap-3">{initial.product.variations.map(v=><button key={v.id} onClick={()=>setVariationId(v.id)} className={`relative border p-3 text-right transition ${variationId===v.id?'border-black bg-black text-white':'border-gray-200 hover:border-gray-500'}`}><span className="block font-medium">{v.name}</span>{variationId===v.id&&<Check className="absolute left-3 top-3 w-4 h-4"/>}</button>)}</div></div>
            <div><h2 className="font-semibold mb-4">2. התאימו מידות</h2><div className="grid sm:grid-cols-3 gap-4">{(['width','depth','height'] as const).map(dim=>{const list=values(dims[dim]);if(!list.length)return null;return <label key={dim} className="text-sm"><span className="block mb-2 text-gray-500">{{width:'רוחב',depth:'עומק',height:'גובה'}[dim]}</span><select value={dimensions[dim]} onChange={e=>setDimensions(p=>({...p,[dim]:Number(e.target.value)}))} className="w-full border border-gray-300 bg-white px-3 py-3">{list.map(n=><option key={n}>{n}</option>)}</select></label>})}</div></div>
            {Object.entries(initial.studio.groups).map(([key,group],idx)=><div key={key}><h2 className="font-semibold mb-4">{idx+3}. {group.label}</h2><div className="grid sm:grid-cols-2 gap-3">{group.options.map(option=><button key={option.key} onClick={()=>select(key,option.key,group.multiple)} className={`relative border p-4 text-right transition ${selected(key,option.key)?'border-black bg-[#f4f4f2]':'border-gray-200 hover:border-gray-500'}`}><span className="block font-medium">{option.label}</span>{option.description&&<span className="block text-xs text-gray-500 mt-1">{option.description}</span>}<span className="block text-xs mt-2">{option.price?`+₪${option.price.toLocaleString()}`:'כלול'}</span>{selected(key,option.key)&&<Check className="absolute left-3 top-3 w-4 h-4"/>}</button>)}</div></div>)}
          </div>
          <div className="sticky bottom-0 bg-white border-t mt-12 pt-5 pb-2 flex items-center justify-between gap-5"><div><span className="block text-xs text-gray-500">מחיר הרהיט שלכם</span>{loading?<Loader2 className="w-6 h-6 animate-spin mt-2"/>:<strong className="text-3xl">{calculation?`₪${calculation.price.toLocaleString()}`:'לא זמין'}</strong>}{calculation&&calculation.options_price>0&&<span className="block text-xs text-gray-400">כולל ₪{calculation.options_price.toLocaleString()} תוספות</span>}</div><button disabled={!calculation||loading} onClick={add} className="bg-black text-white px-6 md:px-9 py-4 disabled:opacity-40 hover:bg-gray-800 transition flex items-center gap-2"><ShoppingBag className="w-5 h-5"/>{added?'נוסף לסל ✓':'הוספה לסל'}</button></div>
        </section>
      </main>
    </div>
  );
}
