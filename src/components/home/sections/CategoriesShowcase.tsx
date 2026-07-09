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

  const [lead, ...rest] = categories.slice(0, 9);

  const Tile = ({ category, large = false }: { category: CategoryItem; large?: boolean }) => (
    <Link href={`/category/${category.slug}`} className="group relative block overflow-hidden bg-[#efeeec]">
      <div className={`relative ${large ? 'aspect-[16/10] md:aspect-[21/9]' : 'aspect-[4/5]'}`}>
        {category.image?.sourceUrl && (
          <Image
            src={category.image.sourceUrl}
            alt={category.name}
            fill
            className="object-cover grayscale transition-all duration-[900ms] ease-out group-hover:grayscale-0 group-hover:scale-[1.04]"
            sizes={large ? '100vw' : '(max-width: 768px) 50vw, 320px'}
            quality={82}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-5 md:p-6 flex items-end justify-between">
          <h3 className={`text-white font-medium leading-tight ${large ? 'text-2xl md:text-4xl' : 'text-lg md:text-xl'}`}>
            {category.name}
          </h3>
          <span
            className="text-white/80 text-sm translate-x-2 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100"
            aria-hidden="true"
          >
            ←
          </span>
        </div>
      </div>
    </Link>
  );

  return (
    <section className="py-16 md:py-28 bg-white">
      <div className="container mx-auto px-5 md:px-8">
        <div className="flex items-end justify-between mb-8 md:mb-14">
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

        {/* Full-width lead tile, then a tight grid of the rest */}
        {lead && (
          <div className="mb-3 md:mb-4">
            <Tile category={lead} large />
          </div>
        )}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {rest.slice(0, 8).map((c) => (
            <Tile key={c.id} category={c} />
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
