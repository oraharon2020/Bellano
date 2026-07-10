import Link from 'next/link';
import Image from 'next/image';
import { getProductsWithSwatches, getCategories, transformCategory } from '@/lib/woocommerce';
import { getApiEndpoint, siteConfig } from '@/config/site';

export const metadata = {
  title: 'בלאנו — תצוגה מקדימה',
  robots: { index: false, follow: false },
};

interface Category {
  id: string | number;
  name: string;
  slug: string;
  image?: { sourceUrl: string };
}

const roomPaths = [
  { icon: '⌂', title: 'סלון', subtitle: 'החלל שבו הכל קורה', links: [{ label: 'ספות', slug: 'sofas' }, { label: 'מזנונים', slug: 'living-room-sideboards' }, { label: 'שולחנות סלון', slug: 'living-room-tables' }] },
  { icon: '◫', title: 'פינת אוכל', subtitle: 'רגעים סביב השולחן', links: [{ label: 'פינות אוכל', slug: 'dining' }, { label: 'כיסאות', slug: 'dining-room-chairs' }, { label: 'שולחנות בר', slug: 'bar-tables' }] },
  { icon: '▭', title: 'חדר שינה', subtitle: 'המקום שהוא רק שלכם', links: [{ label: 'מיטות', slug: 'beds' }, { label: 'קומודות', slug: 'dresser' }, { label: 'שידות לילה', slug: 'bedside-tables' }] },
  { icon: '▱', title: 'כניסה לבית', subtitle: 'הרושם הראשון', links: [{ label: 'קונסולות', slug: 'consoles' }, { label: 'מראות', slug: 'mirrors' }, { label: 'אקססוריז', slug: 'accessories' }] },
];

async function getBanner(): Promise<string> {
  try {
    const res = await fetch(getApiEndpoint('homepage'), { next: { revalidate: 300 } });
    if (res.ok) return (await res.json())?.banners?.[0]?.image || siteConfig.defaultBannerImage;
  } catch {
    /* fall through */
  }
  return siteConfig.defaultBannerImage;
}

async function getFeaturedCategories(): Promise<Category[]> {
  try {
    const res = await fetch(getApiEndpoint('featured-categories'), { next: { revalidate: 300 } });
    if (res.ok) {
      const data = await res.json();
      if (data.categories?.length) return data.categories;
    }
  } catch {
    /* use Woo fallback */
  }
  const categories = await getCategories({ per_page: 50, hide_empty: true });
  return categories
    .filter((c: { parent: number; slug: string }) => c.parent === 0 && c.slug !== 'uncategorized')
    .slice(0, 8)
    .map(transformCategory) as Category[];
}

async function TopHero() {
  const image = await getBanner();
  return (
    <section className="relative h-[74vh] min-h-[530px] overflow-hidden bg-[#f0efec]">
      <Image src={image} alt="בלאנו רהיטי מעצבים" fill priority className="object-cover" sizes="100vw" quality={90} />
      <div className="absolute inset-0 bg-gradient-to-l from-black/45 via-black/10 to-transparent" />
      <div className="relative h-full container mx-auto px-5 md:px-10 flex items-end pb-14 md:pb-20">
        <div className="max-w-xl text-white">
          <p className="text-[11px] font-english tracking-[0.38em] uppercase text-white/80 mb-4">Bellano / Made for living</p>
          <h1 className="text-4xl md:text-6xl font-light leading-[1.1] tracking-tight">
            בואו נעצב את<br /><strong className="font-bold">הבית שלכם.</strong>
          </h1>
          <p className="mt-5 max-w-md text-base md:text-lg leading-relaxed text-white/90">
            רהיטים מעוצבים, התאמה אישית וליווי מקצועי — מהרעיון הראשון ועד הבית.
          </p>
          <div className="flex flex-wrap gap-3 mt-8">
            <a href="#rooms" className="bg-white text-black px-7 py-3.5 text-sm font-medium hover:bg-black hover:text-white transition-colors">
              התחילו לפי חלל
            </a>
            <Link href="/design-assistant" className="border border-white/70 px-7 py-3.5 text-sm font-medium hover:bg-white hover:text-black transition-colors">
              עוזר העיצוב שלנו
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function RoomChooser() {
  return (
    <section id="rooms" className="bg-[#faf9f7] py-16 md:py-24 scroll-mt-20">
      <div className="container mx-auto px-5 md:px-10">
        <div className="max-w-xl mb-10 md:mb-14">
          <p className="text-xs font-english tracking-[0.35em] uppercase text-gray-400 mb-3">Start here</p>
          <h2 className="text-3xl md:text-5xl font-light tracking-tight">מה אתם <strong className="font-bold">מעצבים היום?</strong></h2>
          <p className="text-gray-500 mt-4 leading-relaxed">בחרו חלל, גלו רעיונות ומצאו את הרהיטים שמתאימים בדיוק אליו.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border-t border-l border-gray-200">
          {roomPaths.map((room) => (
            <article key={room.title} className="bg-white border-b border-r border-gray-200 p-6 md:p-8 min-h-[260px] flex flex-col group hover:bg-black hover:text-white transition-colors duration-300">
              <span className="font-english text-4xl text-gray-300 group-hover:text-white/50 mb-8 transition-colors" aria-hidden="true">{room.icon}</span>
              <h3 className="text-2xl font-medium">{room.title}</h3>
              <p className="text-sm text-gray-500 group-hover:text-white/60 mt-2 transition-colors">{room.subtitle}</p>
              <div className="mt-auto pt-8 flex flex-wrap gap-x-3 gap-y-2">
                {room.links.map((link) => (
                  <Link key={link.slug} href={`/category/${link.slug}`} className="text-xs border-b border-gray-300 group-hover:border-white/60 pb-0.5 hover:opacity-60 transition-opacity">
                    {link.label}
                  </Link>
                ))}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

async function CategoryWall() {
  const cats = (await getFeaturedCategories()).slice(0, 8);
  if (!cats.length) return null;
  return (
    <section className="py-16 md:py-24 bg-white">
      <div className="container mx-auto px-5 md:px-10 flex items-end justify-between mb-8 md:mb-12">
        <div>
          <p className="text-xs font-english tracking-[0.35em] uppercase text-gray-400 mb-3">Shop by category</p>
          <h2 className="text-3xl md:text-5xl font-light tracking-tight">כל מה שהבית <strong className="font-bold">צריך</strong></h2>
        </div>
        <Link href="/categories" className="hidden md:block text-sm border-b border-black pb-1 hover:opacity-60">לכל הקטגוריות</Link>
      </div>
      <div className="container mx-auto px-5 md:px-10 grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5">
        {cats.map((cat) => (
          <Link href={`/category/${cat.slug}`} key={cat.id} className="group">
            <div className="relative aspect-square overflow-hidden bg-[#f3f2ef]">
              {cat.image?.sourceUrl && <Image src={cat.image.sourceUrl} alt={cat.name} fill className="object-cover group-hover:scale-105 transition-transform duration-700" sizes="(max-width: 768px) 50vw, 25vw" quality={80} />}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 to-transparent pt-14 px-4 pb-4">
                <h3 className="text-white font-medium text-sm md:text-base">{cat.name}</h3>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

async function Solutions() {
  const products = await getProductsWithSwatches({ per_page: 4, orderby: 'popularity' });
  if (!products.length) return null;
  return (
    <section className="py-16 md:py-24 bg-[#f0efec]">
      <div className="container mx-auto px-5 md:px-10">
        <div className="grid md:grid-cols-[1fr_2.2fr] gap-8 md:gap-14 items-start">
          <div className="md:sticky md:top-28">
            <p className="text-xs font-english tracking-[0.35em] uppercase text-gray-400 mb-3">Most loved</p>
            <h2 className="text-3xl md:text-5xl font-light leading-tight tracking-tight">בחירות <strong className="font-bold">שלקוחות אוהבים</strong></h2>
            <p className="text-gray-500 mt-5 leading-relaxed">הפריטים שנכנסו להכי הרבה בתים — וממשיכים לקבל מחמאות.</p>
            <Link href="/categories" className="mt-8 inline-block bg-black text-white px-7 py-3.5 text-sm hover:bg-gray-700 transition-colors">לכל המוצרים</Link>
          </div>
          <div className="grid grid-cols-2 gap-4 md:gap-6">
            {products.map((product) => (
              <Link key={product.id} href={`/product/${product.slug}`} className="group">
                <div className="relative aspect-square bg-white overflow-hidden">
                  {product.image && <Image src={product.image.sourceUrl} alt={product.name} fill className="object-cover group-hover:scale-105 transition-transform duration-700" sizes="(max-width: 768px) 50vw, 30vw" quality={78} />}
                </div>
                <h3 className="mt-3 text-sm md:text-base font-medium line-clamp-1">{product.name}</h3>
                <p className="mt-1 font-bold">{product.price}</p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function PersonalDesign() {
  return (
    <section className="bg-black text-white py-16 md:py-24">
      <div className="container mx-auto px-5 md:px-10 grid md:grid-cols-2 gap-10 md:gap-20 items-center">
        <div>
          <p className="text-xs font-english tracking-[0.35em] uppercase text-white/40 mb-4">Your home, your way</p>
          <h2 className="text-4xl md:text-6xl font-light leading-tight tracking-tight">לא מצאתם<br /><strong className="font-bold">בדיוק מה שחיפשתם?</strong></h2>
        </div>
        <div>
          <p className="text-white/70 text-lg leading-relaxed">בבלאנו אפשר להתאים מידות, צבעים, בדים וגימורים. שלחו לנו את החלל, הרעיון או המידה — ואנחנו נעזור לבנות את הפריט הנכון.</p>
          <div className="flex flex-wrap gap-3 mt-8">
            <Link href="/design-assistant" className="bg-white text-black px-7 py-3.5 text-sm font-medium hover:bg-gray-200 transition-colors">התחילו התאמה אישית</Link>
            <Link href="/contact" className="border border-white/40 px-7 py-3.5 text-sm hover:border-white transition-colors">דברו איתנו</Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function TrustBar() {
  const items = [['15+', 'שנות ניסיון'], ['12', 'תשלומים ללא ריבית'], ['∞', 'משלוח חינם עד הבית'], ['1', 'שנת אחריות מלאה']];
  return (
    <section className="py-12 md:py-16 bg-white border-b border-gray-200">
      <div className="container mx-auto px-5 md:px-10 grid grid-cols-2 md:grid-cols-4 divide-x divide-x-reverse divide-gray-200">
        {items.map(([value, label]) => (
          <div key={label} className="text-center px-4 py-3">
            <p className="font-english text-4xl md:text-5xl font-bold">{value}</p>
            <p className="text-gray-500 text-xs md:text-sm mt-2">{label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export default async function HomePreview() {
  return (
    <main>
      <TopHero />
      <TrustBar />
      <RoomChooser />
      <CategoryWall />
      <Solutions />
      <PersonalDesign />
    </main>
  );
}
