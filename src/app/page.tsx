import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Truck, ShieldCheck, CreditCard, Headphones } from 'lucide-react';
import { CachedCategoryGrid, CachedProductGrid } from '@/components/home/CachedGrids';
import { HeroBanner } from '@/components/home/HeroBanner';

const features = [
  {
    icon: Truck,
    title: 'משלוח חינם',
    description: 'משלוח חינם לכל הארץ',
  },
  {
    icon: ShieldCheck,
    title: 'אחריות שנה',
    description: 'אחריות מלאה על כל המוצרים',
  },
  {
    icon: CreditCard,
    title: '12 תשלומים',
    description: 'ללא ריבית',
  },
  {
    icon: Headphones,
    title: 'שירות לקוחות',
    description: 'זמינים עבורכם בכל שאלה',
  },
];

export default function HomePage() {
  return (
    <div className="flex flex-col">
      {/* Hero Banner - Edit in /src/config/banners.ts */}
      <HeroBanner />

      {/* Features */}
      <section className="py-8 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {features.map((feature) => (
              <div key={feature.title} className="flex flex-col items-center text-center">
                <feature.icon className="h-8 w-8 text-primary mb-2" />
                <h3 className="font-semibold">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories - Client side with browser cache */}
      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4">
          <CachedCategoryGrid />
        </div>
      </section>

      {/* Best Sellers - Client side with browser cache */}
      <section className="py-12 md:py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <CachedProductGrid />
          <div className="text-center mt-8">
            <Button variant="outline" size="lg" asChild>
              <Link href="/categories">לכל המוצרים</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Style Comparison Section */}
      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">
            הסטייל שלכם זה
            <br />
            <span className="text-primary">עץ אגוז אמריקאי או אלון טבעי?</span>
          </h2>
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <div className="relative aspect-[4/3] rounded-lg overflow-hidden group cursor-pointer">
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10" />
              <div className="absolute bottom-4 right-4 z-20 text-white font-bold text-xl">
                אגוז אמריקאי
              </div>
              <div className="w-full h-full bg-[#5D4E37]" />
            </div>
            <div className="relative aspect-[4/3] rounded-lg overflow-hidden group cursor-pointer">
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10" />
              <div className="absolute bottom-4 right-4 z-20 text-white font-bold text-xl">
                אלון טבעי
              </div>
              <div className="w-full h-full bg-[#C4A77D]" />
            </div>
          </div>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="py-12 md:py-16 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            למה לבחור בבלאנו?
          </h2>
          <p className="text-lg opacity-90 max-w-2xl mx-auto">
            אנחנו מייצרים רהיטים איכותיים בישראל, עם תשומת לב לכל פרט.
            כל המוצרים שלנו מגיעים עם אחריות מלאה ומשלוח חינם עד הבית.
          </p>
        </div>
      </section>
    </div>
  );
}
