import { getApiEndpoint, siteConfig } from '@/config/site';

/** A single top-level navigation entry (link, category, or dropdown). */
export interface NavItem {
  name: string;
  href?: string;
  slug?: string;
  highlight?: boolean;
  children?: { name: string; slug: string }[];
}

export interface InfoLink {
  name: string;
  href: string;
}

export interface NavMenu {
  main: NavItem[];
  info: InfoLink[];
}

/**
 * The storefront menu, managed in WordPress (Appearance → "תפריט האתר") and
 * served over REST. Falls back to the built-in menu in siteConfig if the
 * endpoint is unavailable, so navigation never disappears.
 */
export async function getNavMenu(): Promise<NavMenu> {
  const fallback: NavMenu = {
    main: siteConfig.navigation.main as unknown as NavItem[],
    info: siteConfig.navigation.info as unknown as InfoLink[],
  };
  try {
    // An hour. The root layout reads this, so at 60 s it pulled EVERY page on the site down to a rebuild a
    // minute — the product pages' 1800 s included — most of its $46 a month in ISR writes (Vercel bill, 15/11/2026).
    // Saving the menu in WordPress still shows at once: the menu builder calls /api/cache, which expires the tag.
    const res = await fetch(getApiEndpoint('nav-menu'), {
      next: { revalidate: 3600, tags: ['nav-menu'] },
    });
    if (res.ok) {
      const data = await res.json();
      return {
        main: Array.isArray(data?.items) && data.items.length ? (data.items as NavItem[]) : fallback.main,
        info: Array.isArray(data?.info) && data.info.length ? (data.info as InfoLink[]) : fallback.info,
      };
    }
  } catch {
    // fall through to the built-in menu
  }
  return fallback;
}
