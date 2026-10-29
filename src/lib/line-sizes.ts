/**
 * One size per line (his word 29/10: "יש פה כפילות במידות ... מה נכון?").
 *
 * A rep's own measurement (the admin panel's רוחב / עומק / גובה, or a formula's sliders) replaces the standard size
 * chosen from the product's options. Until 29/10 both travelled: the cart showed "40 • 60 • 35" beside "רוחב 60 /
 * עומק 50 / גובה 60", and 53 of the last 194 rep-measured order lines carried both, with different numbers. The
 * drawing already took the rep's (the last value wins there); the order, the quote and the workshop saw two.
 *
 * Here: which size an option chooses, and the line's options less the sizes the rep replaced. The theme removes the
 * same from WooCommerce's own copy of the variation (order-screen/order-sizes.php).
 */

export type SizeDimension = 'width' | 'depth' | 'height';

/** Which size an option chooses — from its name (pa_width, "בחרו רוחב", "עומק ספה", …) — or null. */
export function sizeDimensionOf(name: string): SizeDimension | null {
  let n = String(name || '');
  try {
    n = decodeURIComponent(n);
  } catch {
    /* not encoded */
  }
  n = n.toLowerCase();
  if (/רוחב|אורך|width|length/.test(n)) return 'width';
  if (/עומק|depth/.test(n)) return 'depth';
  if (/גובה|height/.test(n)) return 'height';
  return null;
}

interface OwnSizes {
  width?: string;
  depth?: string;
  height?: string;
}

/** The sizes this line was measured in by hand, by dimension. */
export function ownSizes(fields?: OwnSizes | null): Record<SizeDimension, boolean> {
  return {
    width: Boolean(String(fields?.width ?? '').trim()),
    depth: Boolean(String(fields?.depth ?? '').trim()),
    height: Boolean(String(fields?.height ?? '').trim()),
  };
}

/** The chosen options, less any size the rep's own measurement replaces; and the ones left out. */
export function splitLineAttributes<T extends { name: string; value: string }>(
  attributes: T[] | undefined,
  fields?: OwnSizes | null
): { keep: T[]; replaced: T[] } {
  const own = ownSizes(fields);
  const keep: T[] = [];
  const replaced: T[] = [];
  for (const a of attributes || []) {
    const d = sizeDimensionOf(a.name);
    (d && own[d] ? replaced : keep).push(a);
  }
  return { keep, replaced };
}
