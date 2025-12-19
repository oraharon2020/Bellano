import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-200 mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">
          הדף לא נמצא
        </h2>
        <p className="text-gray-600 mb-8 max-w-md mx-auto">
          מצטערים, הדף שחיפשת לא קיים או שהועבר למיקום אחר.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link 
            href="/"
            className="bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-800 transition-colors"
          >
            חזרה לדף הבית
          </Link>
          <Link 
            href="/categories"
            className="border border-gray-300 px-6 py-3 rounded-lg hover:bg-gray-50 transition-colors"
          >
            לכל הקטגוריות
          </Link>
        </div>
        
        {/* Quick Links */}
        <div className="mt-12 pt-8 border-t border-gray-200">
          <p className="text-sm text-gray-500 mb-4">אולי תמצאו מה שחיפשתם כאן:</p>
          <div className="flex flex-wrap justify-center gap-4 text-sm">
            <Link href="/category/living-room-sideboards" className="text-gray-600 hover:text-black">
              מזנונים
            </Link>
            <Link href="/category/living-room-tables" className="text-gray-600 hover:text-black">
              שולחנות סלון
            </Link>
            <Link href="/category/designed-armchairs" className="text-gray-600 hover:text-black">
              כורסאות
            </Link>
            <Link href="/category/beds" className="text-gray-600 hover:text-black">
              מיטות
            </Link>
            <Link href="/contact" className="text-gray-600 hover:text-black">
              צור קשר
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
