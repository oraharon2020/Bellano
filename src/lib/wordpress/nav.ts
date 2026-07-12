import { getApiEndpoint, siteConfig } from '@/config/site';

/** A single top-level navigation entry (link, category, or dropdown). */
export interface NavItem {
  name: string;
  href?: string;
  slug?: string;
  highlight?: boolean;
  children?: { name: string; slug: string }[];
}

/**
 * The storefront menu, managed in WordPress (Appearance → "תפריט האתר") and
 * served over REST. Falls back to the built-in menu in siteConfig if the
 * endpoint is unavailable, so navigation never disappears.
 */
export async function getNavMenu(): Promise<NavItem[]> {
  try {
    const res = await fetch(getApiEndpoint('nav-menu'), {
      next: { revalidate: 60, tags: ['nav-menu'] },
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.items) && data.items.length) {
        return data.items as NavItem[];
      }
    }
  } catch {
    // fall through to the built-in menu
  }
  return siteConfig.navigation.main as unknown as NavItem[];
}
