/**
 * Formula Pricing — server-side fetch of the per-product config.
 * Endpoint is public (no auth) and served by the WP module:
 * GET /wp-json/nalla/v1/formula/{product_id}
 */

import { siteConfig } from '@/config/site';
import type { FormulaProductConfig } from './types';

const WP_URL = process.env.NEXT_PUBLIC_WORDPRESS_URL || siteConfig.wordpressUrl;

/**
 * Returns the formula config for a product, or null when the module is
 * disabled for it / unreachable. Callers must treat null as "regular
 * product" so a module failure never breaks the product page.
 */
export async function getFormulaConfig(productId: number): Promise<FormulaProductConfig | null> {
  try {
    // 30 minutes, the product page's own revalidate — at 60 s this pulled every formula product's page down to a
    // rebuild a minute. Saving a formula product in WordPress still shows at once (the theme's formula module
    // calls /api/cache, which expires the 'formula' tag), and create-order re-prices every formula line anyway.
    const res = await fetch(`${WP_URL}/wp-json/nalla/v1/formula/${productId}`, {
      next: { revalidate: 1800, tags: ['formula', `formula-${productId}`] },
    });
    if (!res.ok) return null;
    const data: FormulaProductConfig = await res.json();
    if (!data?.enabled || !data.variations?.length) return null;
    return data;
  } catch {
    return null;
  }
}
