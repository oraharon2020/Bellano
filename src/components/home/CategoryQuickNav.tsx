import Link from 'next/link';
import Image from 'next/image';
import { getCategories } from '@/lib/woocommerce';

/**
 * Horizontal category quick-nav strip shown right below the header.
 * Gives shoppers (and crawlers) one-tap access to every category
 * before the hero — inspired by kualastyle.com's top category strip.
 */
export async function CategoryQuickNav() {
  let categories: Awaited<ReturnType<typeof getCategories>> = [];
  try {
    categories = await getCategories({ per_page: 50, hide_empty: true });
  } catch {
    return null;
  }

  // All real categories, biggest first; SALE gets its own manual tile
  const items = categories
    .filter((cat) => cat.slug !== 'uncategorized' && cat.slug !== 'sale')
    .sort((a, b) => (b.count || 0) - (a.count || 0));

  if (items.length === 0) return null;

  return (
    <nav aria-label="קטגוריות" className="border-b border-gray-100 bg-white">
      <div className="overflow-x-auto scrollbar-hide">
        {/* w-max + mx-auto: centered when it fits, edge-scrollable when it overflows */}
        <ul className="flex items-start gap-5 md:gap-7 w-max mx-auto py-4 px-4">
          {/* SALE tile first */}
          <li className="flex-shrink-0">
            <Link href="/category/sale" className="group flex flex-col items-center gap-2 w-16 md:w-20">
              <span className="flex items-center justify-center w-14 h-14 md:w-16 md:h-16 rounded-full bg-red-50 border border-red-200 group-hover:border-red-400 transition-colors">
                <span className="font-english text-red-500 text-xs font-bold tracking-wider">SALE</span>
              </span>
              <span className="text-xs text-red-500 font-medium text-center">מבצעים</span>
            </Link>
          </li>

          {items.map((cat) => (
            <li key={cat.id} className="flex-shrink-0">
              <Link
                href={`/category/${cat.slug}`}
                className="group flex flex-col items-center gap-2 w-16 md:w-20"
              >
                <span className="relative w-14 h-14 md:w-16 md:h-16 rounded-full overflow-hidden bg-[#f5f5f0] border border-gray-200 group-hover:border-gray-400 transition-colors">
                  {cat.image?.src ? (
                    <Image
                      src={cat.image.src}
                      alt={cat.name}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-110"
                      sizes="64px"
                      quality={70}
                    />
                  ) : (
                    <span className="flex items-center justify-center w-full h-full text-lg text-gray-400">
                      {cat.name.charAt(0)}
                    </span>
                  )}
                </span>
                <span className="text-xs text-gray-700 group-hover:text-black text-center leading-tight transition-colors">
                  {cat.name}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
