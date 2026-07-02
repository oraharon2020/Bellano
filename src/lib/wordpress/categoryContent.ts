// Category SEO content fetching (Bellano category-content WP module)
import { siteConfig } from '@/config/site';

export interface CategoryFaqItem {
  question: string;
  answer: string;
}

export interface CategoryAdvantage {
  title: string;
  text: string;
}

export interface CategoryRelated {
  name: string;
  slug: string;
}

export interface CategoryContent {
  article: string;
  faq: CategoryFaqItem[];
  advantages: CategoryAdvantage[];
  related: CategoryRelated[];
  topBanner: string;
  topBannerMobile: string;
  topBannerLink: string;
}

const EMPTY_CONTENT: CategoryContent = {
  article: '',
  faq: [],
  advantages: [],
  related: [],
  topBanner: '',
  topBannerMobile: '',
  topBannerLink: '',
};

/**
 * Fetch the rich SEO content block for a product category.
 * Backed by the `bellano/v1/category-content/{slug}` REST endpoint
 * provided by the darion-child `category-content` theme module.
 */
export async function getCategoryContent(slug: string): Promise<CategoryContent> {
  try {
    const apiUrl = `${siteConfig.wordpressUrl}/wp-json/bellano/v1/category-content/${encodeURIComponent(slug)}`;

    const response = await fetch(apiUrl, {
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      return EMPTY_CONTENT;
    }

    const data = await response.json();

    return {
      article: typeof data?.article === 'string' ? data.article : '',
      faq: Array.isArray(data?.faq)
        ? data.faq
            .filter((f: CategoryFaqItem) => f?.question && f?.answer)
            .map((f: CategoryFaqItem) => ({ question: f.question, answer: f.answer }))
        : [],
      advantages: Array.isArray(data?.advantages)
        ? data.advantages
            .filter((a: CategoryAdvantage) => a?.title || a?.text)
            .map((a: CategoryAdvantage) => ({ title: a.title || '', text: a.text || '' }))
        : [],
      related: Array.isArray(data?.related)
        ? data.related
            .filter((r: CategoryRelated) => r?.name && r?.slug)
            .map((r: CategoryRelated) => ({ name: r.name, slug: r.slug }))
        : [],
      topBanner: typeof data?.topBanner === 'string' ? data.topBanner : '',
      topBannerMobile: typeof data?.topBannerMobile === 'string' ? data.topBannerMobile : '',
      topBannerLink: typeof data?.topBannerLink === 'string' ? data.topBannerLink : '',
    };
  } catch {
    return EMPTY_CONTENT;
  }
}
