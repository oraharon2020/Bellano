import Link from 'next/link';
import Image from 'next/image';
import { siteConfig } from '@/config/site';
import { WhatsAppSubscribeForm } from '@/components/home/WhatsAppSubscribeForm';

/**
 * Custom-made split — editorial image on one side, benefits on the other.
 * Swap the image at /public/images/homepage/custom-furniture.jpg.
 */
export function CustomFurnitureSection() {
  const features = [
    { icon: '⟡', title: 'מידות מותאמות', text: 'לכל חלל ודרישה' },
    { icon: '◐', title: 'בחירת גימור', text: 'עצים, בדים וצבעים' },
    { icon: '✎', title: 'ליווי מעצב', text: 'מהתכנון עד הבית' },
    { icon: '✦', title: 'ייצור בישראל', text: 'בקרת איכות מלאה' },
  ];

  return (
    <section className="py-20 md:py-28 bg-white">
      <div className="container mx-auto px-5 md:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          <div className="relative order-1">
            <div className="aspect-[4/5] md:aspect-[4/3] relative overflow-hidden bg-[#f4f3f1]">
              <Image
                src="/images/homepage/custom-furniture.jpg"
                alt="התאמה אישית"
                fill
                className="object-cover hover:scale-105 transition-transform duration-[900ms]"
                sizes="(max-width: 1024px) 100vw, 600px"
              />
            </div>
            <div className="absolute -bottom-5 right-5 md:-right-6 bg-black text-white px-7 py-6">
              <p className="font-english text-4xl md:text-5xl font-bold leading-none">15+</p>
              <p className="text-xs mt-2 tracking-wide">שנות ניסיון</p>
            </div>
          </div>

          <div className="order-2 lg:pr-6">
            <p className="font-english text-gray-400 text-[11px] tracking-[0.4em] uppercase mb-4">Custom Made</p>
            <h2 className="text-3xl md:text-5xl font-light mb-6 leading-tight tracking-tight">
              מומחים <span className="font-bold">בהתאמה אישית</span>
            </h2>
            <p className="text-gray-600 text-lg leading-relaxed mb-10 max-w-xl">
              כל לקוח הוא ייחודי, וכך גם הריהוט שלו. אנחנו מתמחים בהתאמה אישית של כל פריט — מידות, צבעים, בדים ופרטים
              קטנים שעושים את ההבדל. הצוות המקצועי שלנו ילווה אתכם משלב התכנון ועד להתקנה בבית.
            </p>

            <div className="grid grid-cols-2 gap-x-6 gap-y-7 mb-10">
              {features.map((f) => (
                <div key={f.title} className="flex items-start gap-3">
                  <span className="w-10 h-10 border border-gray-200 flex items-center justify-center flex-shrink-0 text-lg" aria-hidden="true">
                    {f.icon}
                  </span>
                  <div>
                    <h4 className="font-bold text-sm mb-1">{f.title}</h4>
                    <p className="text-gray-500 text-xs">{f.text}</p>
                  </div>
                </div>
              ))}
            </div>

            <Link
              href="/contact"
              className="group inline-flex items-center gap-3 bg-black text-white hover:bg-transparent hover:text-black border border-black px-9 py-4 text-sm tracking-[0.15em] uppercase font-medium transition-all duration-300"
            >
              <span>לתיאום פגישת ייעוץ</span>
              <span className="group-hover:-translate-x-1 transition-transform" aria-hidden="true">←</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * Instagram strip — static grid, replace files in /public/images/instagram/.
 */
export function InstagramSection() {
  const images = ['/images/instagram/1.jpg', '/images/instagram/2.jpg', '/images/instagram/3.jpg', '/images/instagram/4.jpg', '/images/instagram/5.jpg', '/images/instagram/6.jpg'];
  const handle = siteConfig.social.instagramHandle;

  return (
    <section className="py-16 md:py-24 bg-white">
      <div className="container mx-auto px-5 md:px-8 mb-10">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between">
          <div>
            <p className="font-english text-gray-400 text-[11px] tracking-[0.4em] uppercase mb-3">@{handle.toUpperCase()}</p>
            <h2 className="text-3xl md:text-5xl font-light tracking-tight">הבית שלכם <span className="font-bold">עם בלאנו</span></h2>
          </div>
          <a
            href={`https://instagram.com/${handle}`}
            target="_blank"
            rel="noopener noreferrer"
            className="group mt-4 md:mt-0 inline-flex items-center gap-2 text-sm text-gray-500 hover:text-black transition-colors"
          >
            <span className="uppercase tracking-[0.15em] text-xs border-b border-gray-300 group-hover:border-black pb-1">עקבו אחרינו</span>
            <span className="group-hover:-translate-x-1 transition-transform" aria-hidden="true">←</span>
          </a>
        </div>
      </div>

      <div className="grid grid-cols-3 md:grid-cols-6 gap-1 md:gap-2">
        {images.map((src, i) => (
          <a
            key={src}
            href={`https://instagram.com/${handle}`}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative aspect-square overflow-hidden bg-[#f4f3f1]"
          >
            <Image
              src={src}
              alt={`בלאנו באינסטגרם ${i + 1}`}
              fill
              className="object-cover transition-transform duration-700 group-hover:scale-105"
              sizes="(max-width: 768px) 33vw, 16vw"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
          </a>
        ))}
      </div>
    </section>
  );
}

/**
 * Newsletter — black WhatsApp opt-in.
 */
export function NewsletterSection() {
  return (
    <section className="py-20 md:py-28 bg-[#0a0a0a] text-white relative overflow-hidden">
      <div className="absolute inset-0 opacity-[0.06]">
        <div
          className="absolute inset-0"
          style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '42px 42px' }}
        />
      </div>
      <div className="container mx-auto px-5 md:px-8 relative">
        <div className="max-w-2xl mx-auto text-center">
          <p className="font-english text-white/40 text-[11px] tracking-[0.4em] uppercase mb-4">Stay Updated</p>
          <h2 className="text-3xl md:text-5xl font-light mb-4 tracking-tight">
            הישארו <span className="font-bold">מעודכנים</span>
          </h2>
          <p className="text-white/60 mb-10 text-lg">קבלו עדכונים על מוצרים חדשים ומבצעים בלעדיים ישירות לוואטסאפ</p>
          <WhatsAppSubscribeForm />
          <p className="text-white/30 text-xs mt-6">לא נשלח ספאם. ניתן לבטל בכל עת.</p>
        </div>
      </div>
    </section>
  );
}
