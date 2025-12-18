import Image from 'next/image';
import Link from 'next/link';
import { getCategories } from '@/lib/woocommerce/api';

export const metadata = {
  title: 'כל הקטגוריות | בלאנו - רהיטי מעצבים',
  description: 'צפו בכל הקטגוריות של רהיטי בלאנו - מזנונים, שולחנות, קומודות, כורסאות ועוד',
};

export default async function CategoriesPage() {
  // Fetch real categories from WooCommerce
  const wooCategories = await getCategories({ per_page: 100, hide_empty: true });
  
  // Filter out "uncategorized" category only
  const mainCategories = wooCategories.filter(
    cat => cat.slug !== 'uncategorized' && cat.count > 0
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="container mx-auto px-4 py-8 md:py-12">
        {/* Breadcrumb */}
        <nav className="text-sm text-muted-foreground mb-8">
          <Link href="/" className="hover:text-primary transition-colors">דף הבית</Link>
          <span className="mx-2">/</span>
          <span className="text-foreground">כל הקטגוריות</span>
        </nav>

        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-5xl font-bold mb-4">כל הקטגוריות</h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            גלו את מגוון הקטגוריות שלנו ומצאו את הרהיט המושלם לביתכם
          </p>
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {mainCategories.map((category) => (
            <Link 
              key={category.id} 
              href={`/category/${category.slug}`}
              className="group block"
            >
              <div className="relative aspect-[4/3] rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500">
                {/* Image */}
                {category.image?.src ? (
                  <Image
                    src={category.image.src}
                    alt={category.image.alt || category.name}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-110"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary/30 via-primary/20 to-primary/10 flex items-center justify-center">
                    <span className="text-primary/40 text-7xl font-bold">
                      {category.name.charAt(0)}
                    </span>
                  </div>
                )}
                
                {/* Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent group-hover:from-black/70 transition-all duration-500" />
                
                {/* Content */}
                <div className="absolute inset-0 flex flex-col justify-end p-6">
                  <h2 className="text-white text-xl md:text-2xl font-bold mb-2 transform group-hover:translate-y-[-4px] transition-transform duration-300">
                    {category.name}
                  </h2>
                  {category.count > 0 && (
                    <p className="text-white/80 text-sm">
                      {category.count} מוצרים
                    </p>
                  )}
                  <div className="mt-4 flex items-center text-white/90 text-sm font-medium opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                    <span>צפה בקטגוריה</span>
                    <svg className="w-4 h-4 mr-2 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="mt-16 text-center">
          <p className="text-muted-foreground mb-4">לא מצאתם מה שחיפשתם?</p>
          <Link 
            href="/contact" 
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-full hover:bg-primary/90 transition-colors font-medium"
          >
            צרו איתנו קשר
            <svg className="w-4 h-4 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
}
