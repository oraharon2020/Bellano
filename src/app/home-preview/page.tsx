import Link from 'next/link';
import Image from 'next/image';
import { getProductsWithSwatches, getCategories, transformCategory } from '@/lib/woocommerce';
import { siteConfig, getApiEndpoint } from '@/config/site';
import { WhatsAppSubscribeForm } from '@/components/home/WhatsAppSubscribeForm';

export const metadata = {
  title: 'בלאנו — תצוגה מקדימה',
  robots: { index: false, follow: false },
};

interface Cat {
  id: string | number;
  name: string;
  slug: string;
  image?: { sourceUrl: string };
}

async function getBannerImage(): Promise<string> {
  try {
    const res = await fetch(getApiEndpoint('homepage'), { next: { revalidate: 300 } });
    if (res.ok) {
      const data = await res.json();
      const b = data?.banners?.[0];
      return b?.image || siteConfig.defaultBannerImage;
    }
  } catch {
    /* fall through */
  }
  return siteConfig.defaultBannerImage;
}

async function getCats(): Promise<Cat[]> {
  let cats: Cat[] = [];
  try {
    const res = await fetch(getApiEndpoint('featured-categories'), { next: { revalidate: 300 } });
    if (res.ok) {
      const data = await res.json();
      if (data.categories?.length) cats = data.categories;
    }
  } catch {
    /* fall through */
  }
  if (!cats.length) {
    const woo = await getCategories({ per_page: 50, hide_empty: true });
    cats = woo
      .filter((c: { parent: number; slug: string }) => c.parent === 0 && c.slug !== 'uncategorized')
      .slice(0, 12)
      .map(transformCategory) as Cat[];
  }
  return cats;
}

/* ─── Hero — full-bleed image with an oversized magazine masthead ─── */
async function HeroEditorial() {
  const image = await getBannerImage();
  return (
    <section className="relative h-[92vh] min-h-[560px] w-full overflow-hidden bg-[#0a0a0a]">
      <Image src={image} alt="בלאנו רהיטי מעצבים" fill priority quality={92} className="object-cover" sizes="100vw" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-black/45" />

      {/* top masthead line */}
      <div className="absolute inset-x-0 top-0 z-10">
        <div className="container mx-auto px-5 md:px-10 pt-6 flex items-center justify-between text-white/80 text-[11px] tracking-[0.35em] uppercase font-english">
          <span>Est. 2009</span>
          <span className="hidden md:block">Designed Furniture</span>
          <span>Tel Aviv</span>
        </div>
      </div>

      {/* Oversized wordmark + statement */}
      <div className="relative z-10 h-full flex flex-col justify-end pb-16 md:pb-24">
        <div className="container mx-auto px-5 md:px-10">
          <p className="text-white/70 font-english text-xs tracking-[0.4em] uppercase mb-4">The Furniture Gallery</p>
          <h1 className="text-white font-english font-bold leading-[0.82] tracking-[-0.03em] text-[24vw] md:text-[16vw]">
            BELLANO
          </h1>
          <div className="mt-6 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <p className="text-white/90 text-lg md:text-2xl font-light max-w-md leading-relaxed">
              רהיטים מעוצבים בהתאמה אישית — כל פריט הוא יצירה אחת ויחידה.
            </p>
            <Link
              href="/categories"
              className="group inline-flex items-center gap-3 bg-white text-black hover:bg-transparent hover:text-white border border-white px-9 py-4 text-sm tracking-[0.15em] uppercase font-medium transition-all duration-300 self-start md:self-auto"
            >
              <span>לצפייה בקולקציה</span>
              <span className="group-hover:-translate-x-1 transition-transform" aria-hidden="true">←</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Marquee strip ─── */
function Marquee() {
  const items = ['משלוח חינם עד הבית', 'עד 12 תשלומים ללא ריבית', 'שנה אחריות מלאה', 'התאמה אישית מלאה', 'ייצור בישראל'];
  const row = [...items, ...items];
  return (
    <section className="bg-black text-white overflow-hidden border-y border-white/10">
      <style
        dangerouslySetInnerHTML={{
          __html: '@keyframes bl-marquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}',
        }}
      />
      <div className="flex whitespace-nowrap py-4" style={{ animation: 'bl-marquee 30s linear infinite' }}>
        {row.map((t, i) => (
          <span key={i} className="flex items-center text-sm tracking-[0.2em] uppercase">
            <span className="px-8">{t}</span>
            <span className="text-white/30" aria-hidden="true">✦</span>
          </span>
        ))}
      </div>
    </section>
  );
}

/* ─── Categories — cinematic horizontal gallery, numbered ─── */
async function CategoriesGallery() {
  const cats = (await getCats()).slice(0, 8);
  if (!cats.length) return null;
  return (
    <section className="py-16 md:py-28 bg-white">
      <div className="container mx-auto px-5 md:px-10 mb-8 md:mb-12 flex items-end justify-between">
        <div>
          <p className="font-english text-gray-400 text-[11px] tracking-[0.4em] uppercase mb-3">Index / Collections</p>
          <h2 className="text-4xl md:text-6xl font-english font-bold tracking-tight">Collections</h2>
        </div>
        <Link href="/categories" className="hidden md:inline-block text-xs uppercase tracking-[0.15em] border-b border-black pb-1 hover:opacity-60 transition-opacity">
          View all
        </Link>
      </div>

      <div className="flex gap-4 md:gap-6 overflow-x-auto scrollbar-hide px-5 md:px-10 pb-4 snap-x snap-mandatory">
        {cats.map((c, i) => (
          <Link
            key={c.id}
            href={`/category/${c.slug}`}
            className="group relative flex-shrink-0 w-[78vw] sm:w-[46vw] md:w-[30vw] lg:w-[24vw] snap-start"
          >
            <div className="relative aspect-square overflow-hidden bg-[#f4f3f1]">
              {c.image?.sourceUrl && (
                <Image
                  src={c.image.sourceUrl}
                  alt={c.name}
                  fill
                  className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  sizes="(max-width: 768px) 78vw, 24vw"
                  quality={82}
                />
              )}
              <span className="absolute top-4 left-4 font-english text-white/90 text-sm tracking-widest mix-blend-difference">
                {String(i + 1).padStart(2, '0')}
              </span>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <h3 className="text-lg md:text-xl font-medium">{c.name}</h3>
              <span className="text-gray-400 group-hover:-translate-x-1 transition-transform" aria-hidden="true">←</span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

/* ─── Asymmetric editorial feature ─── */
function FeatureSplit() {
  return (
    <section className="py-6 md:py-16 bg-white">
      <div className="container mx-auto px-5 md:px-10">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-0 items-center">
          <div className="md:col-span-7 relative">
            <div className="relative aspect-[4/5] md:aspect-[3/4] overflow-hidden bg-[#f4f3f1]">
              <Image src="/images/homepage/custom-furniture.jpg" alt="התאמה אישית" fill className="object-cover" sizes="(max-width:768px) 100vw, 55vw" />
            </div>
          </div>
          <div className="md:col-span-5 md:-mr-16 relative z-10">
            <div className="bg-black text-white p-8 md:p-14">
              <p className="font-english text-white/40 text-[11px] tracking-[0.4em] uppercase mb-5">Bespoke</p>
              <h2 className="text-3xl md:text-5xl font-light leading-tight mb-6">
                מעוצב <span className="font-bold">בדיוק</span><br />בשבילכם
              </h2>
              <p className="text-white/60 leading-relaxed mb-8">
                מידות, גימור, בדים וצבעים — כל פרט נבחר יחד איתכם. ליווי מעצב מהתכנון ועד ההתקנה בבית.
              </p>
              <Link
                href="/contact"
                className="group inline-flex items-center gap-3 border border-white/40 hover:border-white px-8 py-4 text-sm tracking-[0.15em] uppercase transition-colors"
              >
                <span>לתיאום ייעוץ</span>
                <span className="group-hover:-translate-x-1 transition-transform" aria-hidden="true">←</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Products — numbered editorial row ─── */
async function ProductsEditorial() {
  const products = await getProductsWithSwatches({ per_page: 6, orderby: 'popularity' });
  if (!products.length) return null;
  return (
    <section className="py-16 md:py-28 bg-[#f7f6f4]">
      <div className="container mx-auto px-5 md:px-10 mb-8 md:mb-12 flex items-end justify-between">
        <div>
          <p className="font-english text-gray-400 text-[11px] tracking-[0.4em] uppercase mb-3">Selected</p>
          <h2 className="text-4xl md:text-6xl font-english font-bold tracking-tight">Bestsellers</h2>
        </div>
        <Link href="/categories" className="hidden md:inline-block text-xs uppercase tracking-[0.15em] border-b border-black pb-1 hover:opacity-60 transition-opacity">
          Shop all
        </Link>
      </div>
      <div className="flex gap-5 md:gap-8 overflow-x-auto scrollbar-hide px-5 md:px-10 pb-4 snap-x">
        {products.map((p, i) => (
          <Link key={p.id} href={`/product/${p.slug}`} className="group flex-shrink-0 w-[68vw] sm:w-[40vw] md:w-[26vw] lg:w-[20vw] snap-start">
            <div className="relative aspect-square overflow-hidden bg-white mb-4">
              {p.image && (
                <Image src={p.image.sourceUrl} alt={p.name} fill className="object-cover transition-transform duration-700 group-hover:scale-105" sizes="(max-width:768px) 68vw, 20vw" quality={78} />
              )}
              <span className="absolute top-4 left-4 font-english text-black/70 text-sm tracking-widest">{String(i + 1).padStart(2, '0')}</span>
              {p.onSale && <span className="absolute top-0 right-0 bg-black text-white text-[11px] font-english tracking-[0.15em] px-3 py-1.5">SALE</span>}
            </div>
            <h3 className="font-medium text-base line-clamp-1 group-hover:text-gray-500 transition-colors">{p.name}</h3>
            <div className="flex items-center gap-3 mt-1">
              {p.onSale && p.regularPrice && <span className="text-gray-400 line-through text-sm">{p.regularPrice}</span>}
              <span className="font-bold text-lg">{p.price}</span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

/* ─── Big statement ─── */
function BigStatement() {
  return (
    <section className="relative bg-black text-white py-24 md:py-40 overflow-hidden">
      <div className="container mx-auto px-5 md:px-10 text-center">
        <p className="font-english text-white/40 text-[11px] tracking-[0.45em] uppercase mb-8">Crafted to order</p>
        <h2 className="text-[13vw] md:text-[9vw] font-english font-bold leading-[0.85] tracking-tighter">
          FORM<span className="text-white/30"> · </span>FUNCTION
        </h2>
        <p className="mt-8 text-white/70 text-lg md:text-xl font-light max-w-xl mx-auto">
          עיצוב שמשלב אסתטיקה נקייה עם ריהוט שנבנה להחזיק שנים.
        </p>
      </div>
    </section>
  );
}

/* ─── Newsletter ─── */
function Newsletter() {
  return (
    <section className="py-20 md:py-28 bg-white">
      <div className="container mx-auto px-5 md:px-10">
        <div className="border border-black p-10 md:p-16 text-center">
          <p className="font-english text-gray-400 text-[11px] tracking-[0.4em] uppercase mb-4">Join the list</p>
          <h2 className="text-3xl md:text-5xl font-light mb-4 tracking-tight">הישארו <span className="font-bold">מעודכנים</span></h2>
          <p className="text-gray-500 mb-8 max-w-md mx-auto">עדכונים על קולקציות חדשות ומבצעים בלעדיים ישירות לוואטסאפ</p>
          <div className="max-w-md mx-auto">
            <WhatsAppSubscribeForm />
          </div>
        </div>
      </div>
    </section>
  );
}

export default async function HomePreview() {
  return (
    <div className="flex flex-col">
      <HeroEditorial />
      <Marquee />
      <CategoriesGallery />
      <FeatureSplit />
      <ProductsEditorial />
      <BigStatement />
      <Newsletter />
    </div>
  );
}
