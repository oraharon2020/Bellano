import Link from 'next/link';
import Image from 'next/image';
import { getCategories, transformCategory } from '@/lib/woocommerce';
import { getApiEndpoint } from '@/config/site';

interface CategoryItem {
  id: string | number;
  name: string;
  slug: string;
  image?: { sourceUrl: string };
}

async function getShowcaseCategories(): Promise<CategoryItem[]> {
  let categories: CategoryItem[] = [];
  try {
    const res = await fetch(getApiEndpoint('featured-categories'), { next: { revalidate: 300 } });
    if (res.ok) {
      const data = await res.json();
      if (data.categories?.length) categories = data.categories;
    }
  } catch {
    /* fall back to WooCommerce below */
  }

  if (categories.length === 0) {
    const woo = await getCategories({ per_page: 50, hide_empty: true });
    categories = woo
      .filter((c: { parent: number; slug: string }) => c.parent === 0 && c.slug !== 'uncategorized')
      .slice(0, 12)
      .map(transformCategory) as CategoryItem[];
  }
  return categories;
}

/**
 * Editorial collections showcase — a large lead tile beside a tight grid,
 * grayscale imagery that blooms into colour on hover. Minimal black-and-white.
 */
export async function CategoriesShowcase() {
  const categories = await getShowcaseCategories();
  if (categories.length === 0) return null;

  return (
    <section className="py-16 md:py-24 bg-white">
      <div className="container mx-auto px-5 md:px-8">
        <div className="flex items-end justify-between mb-8 md:mb-12">
          <div>
            <p className="font-english text-gray-400 text-[11px] tracking-[0.4em] uppercase mb-3">Collections</p>
            <h2 className="text-3xl md:text-5xl font-light tracking-tight">
              כל <span className="font-bold">הקולקציות</span>
            </h2>
          </div>
          <Link
            href="/categories"
            className="group hidden md:inline-flex items-center gap-2 text-sm text-gray-500 hover:text-black transition-colors"
          >
            <span className="uppercase tracking-[0.15em] text-xs border-b border-gray-300 group-hover:border-black pb-1">All categories</span>
            <span className="group-hover:-translate-x-1 transition-transform" aria-hidden="true">←</span>
          </Link>
        </div>

        {/* Square (1:1) tiles that match Bellano's square product photography */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5">
          {categories.slice(0, 8).map((category) => (
            <Link key={category.id} href={`/category/${category.slug}`} className="group">
              <div className="relative aspect-square overflow-hidden bg-[#f4f3f1]">
                {category.image?.sourceUrl && (
                  <Image
                    src={category.image.sourceUrl}
                    alt={category.name}
                    fill
                    className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                    sizes="(max-width: 768px) 50vw, 320px"
                    quality={80}
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-4 md:p-5 flex items-center justify-between">
                  <h3 className="text-white font-medium text-base md:text-lg leading-tight">{category.name}</h3>
                  <span
                    className="text-white/80 text-sm translate-x-2 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100"
                    aria-hidden="true"
                  >
                    ←
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-8 text-center md:hidden">
          <Link
            href="/categories"
            className="inline-block border border-gray-300 hover:border-black px-8 py-3 text-xs tracking-[0.15em] uppercase transition-colors"
          >
            All categories
          </Link>
        </div>
      </div>
    </section>
  );
}
