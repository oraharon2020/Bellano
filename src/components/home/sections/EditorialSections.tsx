import Link from 'next/link';

/**
 * Full-bleed typographic statement — pure black, oversized light headline with a
 * faint watermark word behind it. The "wow" beat of the page.
 */
export function EditorialBand() {
  return (
    <section className="relative bg-[#0a0a0a] text-white py-24 md:py-40 overflow-hidden">
      {/* Faint oversized watermark */}
      <span
        aria-hidden="true"
        className="pointer-events-none select-none absolute inset-0 flex items-center justify-center font-english font-bold text-white/[0.04] text-[28vw] leading-none tracking-tighter"
      >
        BELLANO
      </span>

      <div className="relative container mx-auto px-5 md:px-8 text-center">
        <div className="flex items-center justify-center gap-3 mb-8">
          <span className="h-px w-10 bg-white/40" aria-hidden="true" />
          <p className="font-english text-[11px] tracking-[0.45em] uppercase text-white/70">Crafted to order · Since 2009</p>
          <span className="h-px w-10 bg-white/40" aria-hidden="true" />
        </div>

        <h2 className="text-4xl md:text-7xl font-light leading-[1.12] tracking-tight max-w-4xl mx-auto">
          כל רהיט הוא <span className="font-bold">יצירה</span> —
          <br className="hidden md:block" /> מעוצב, מיוצר ומותאם <span className="font-english italic">בדיוק</span> עבורכם.
        </h2>

        <div className="mt-12 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/categories"
            className="group inline-flex items-center gap-3 bg-white text-black hover:bg-transparent hover:text-white border border-white px-9 py-4 text-sm tracking-[0.15em] uppercase font-medium transition-all duration-300"
          >
            <span>גלו את הקולקציה</span>
            <span className="group-hover:-translate-x-1 transition-transform" aria-hidden="true">←</span>
          </Link>
          <Link
            href="/about"
            className="text-sm tracking-[0.15em] uppercase text-white/70 hover:text-white border-b border-white/30 hover:border-white pb-1 transition-colors"
          >
            הסיפור שלנו
          </Link>
        </div>
      </div>
    </section>
  );
}

/**
 * Social proof — the oversized rating figure plus a factual trust row.
 * (Real customer reviews are rendered separately by <GoogleReviews />.)
 */
export function SocialProof() {
  const trust = [
    { big: '∞', label: 'משלוח חינם', sub: 'עד הבית, על כל הארץ' },
    { big: '12', label: 'תשלומים', sub: 'ללא ריבית' },
    { big: '1', label: 'שנת אחריות', sub: 'מלאה על כל מוצר' },
    { big: '15+', label: 'שנות ניסיון', sub: 'בייצור והתאמה אישית' },
  ];

  return (
    <section className="bg-[#f7f6f4] py-20 md:py-28">
      <div className="container mx-auto px-5 md:px-8">
        <div className="text-center mb-14 md:mb-20">
          <p aria-hidden="true" className="font-english text-[110px] md:text-[190px] leading-none font-bold text-black/[0.07] select-none">
            5.0
          </p>
          <div className="-mt-6 md:-mt-14 relative">
            <p className="text-yellow-500 text-xl tracking-[0.3em] mb-2" aria-hidden="true">★★★★★</p>
            <p className="text-xl md:text-2xl font-bold">דירוג מושלם בגוגל</p>
            <p className="text-gray-500 text-sm mt-2">מבוסס על 42 ביקורות של לקוחות אמיתיים</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-gray-200 border border-gray-200">
          {trust.map((t) => (
            <div key={t.label} className="bg-[#f7f6f4] px-6 py-8 text-center">
              <p className="font-english text-4xl md:text-5xl font-bold leading-none mb-3">{t.big}</p>
              <p className="font-medium text-sm">{t.label}</p>
              <p className="text-gray-500 text-xs mt-1">{t.sub}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const FAQS = [
  {
    question: 'תוך כמה זמן אקבל את הרהיט?',
    answer:
      'זמני האספקה נעים בין 12-26 ימי עסקים, בהתאם לסוג המוצר והזמינות במלאי. מוצרים בהתאמה אישית עשויים לדרוש זמן ייצור ארוך יותר. נציג שירות יצור אתכם קשר לתיאום מועד אספקה נוח.',
  },
  {
    question: 'האם המשלוח באמת חינם?',
    answer:
      'כן! משלוח חינם עד הבית על כל המוצרים. ההובלה כוללת הכנסה לבית עד לקומה השלישית ללא מעלית, או לכל קומה עם מעלית. נציג יתאם אתכם מועד אספקה נוח מראש.',
  },
  {
    question: 'אפשר להזמין רהיט במידות ובצבע שלי?',
    answer:
      'בהחלט. אנחנו מתמחים בהתאמה אישית של כל פריט - מידות, צבעים, בדים ופרטים קטנים שעושים את ההבדל. הצוות המקצועי שלנו ילווה אתכם משלב התכנון ועד להתקנה בבית.',
  },
  {
    question: 'מה כוללת האחריות?',
    answer: 'שנה אחריות מלאה על המוצר מיום הקנייה. האחריות מכסה פגמים במבנה ובייצור.',
  },
  {
    question: 'איך אפשר לשלם?',
    answer:
      'תשלום מאובטח בכרטיס אשראי עד 12 תשלומים ללא ריבית, תשלום בביט או בהעברה בנקאית. כל התשלומים מאובטחים בתקן PCI DSS.',
  },
];

export function FaqSection() {
  return (
    <section className="py-16 md:py-24 bg-white">
      <div className="container mx-auto px-5 md:px-8 max-w-3xl">
        <div className="text-center mb-10 md:mb-14">
          <p className="font-english text-gray-400 text-[11px] tracking-[0.4em] uppercase mb-3">FAQ</p>
          <h2 className="text-3xl md:text-5xl font-light tracking-tight">השאלות <span className="font-bold">שלכם</span></h2>
        </div>

        <div className="divide-y divide-gray-200 border-y border-gray-200">
          {FAQS.map((faq) => (
            <details key={faq.question} className="group">
              <summary className="flex items-center justify-between cursor-pointer list-none py-5 md:py-6 font-medium text-base md:text-lg [&::-webkit-details-marker]:hidden">
                <span>{faq.question}</span>
                <span className="text-gray-400 text-2xl leading-none transition-transform duration-200 group-open:rotate-45" aria-hidden="true">+</span>
              </summary>
              <p className="pb-6 text-gray-600 leading-relaxed">{faq.answer}</p>
            </details>
          ))}
        </div>

        <div className="text-center mt-10">
          <Link
            href="/faq"
            className="inline-block border border-gray-300 hover:border-black px-8 py-3 text-xs tracking-[0.15em] uppercase transition-colors"
          >
            לכל השאלות והתשובות
          </Link>
        </div>
      </div>
    </section>
  );
}
