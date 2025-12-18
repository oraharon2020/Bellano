import Link from 'next/link';
import Image from 'next/image';
import { Phone, Mail, Clock, Instagram, Facebook } from 'lucide-react';

const categories = [
  { name: 'מזנונים לסלון', slug: 'living-room-sideboards' },
  { name: 'שולחנות סלון', slug: 'living-room-tables' },
  { name: 'קונסולות', slug: 'consoles' },
  { name: 'שידות לילה', slug: 'bedside-tables' },
  { name: 'כורסאות', slug: 'designed-armchairs' },
  { name: 'קומודות', slug: 'dresser' },
];

const links = [
  { name: 'שאלות נפוצות', href: '/faq' },
  { name: 'אודותינו', href: '/page/about-us' },
  { name: 'צרו קשר', href: '/contact' },
  { name: 'תקנון', href: '/page/privacy-policy' },
];

export function Footer() {
  return (
    <footer className="bg-gray-100 mt-16">
      {/* Newsletter Section */}
      {/* Main Footer */}
      <div className="container mx-auto px-4 py-8 md:py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-8">
          {/* Contact Info */}
          <div className="text-center md:text-right">
            <h4 className="font-bold text-sm md:text-base mb-3 md:mb-4">יצירת קשר</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="tel:03-5566696" className="hover:text-black text-gray-600">
                  📞 03-5566696
                </a>
              </li>
              <li>
                <a href="https://wa.me/97235566696" className="hover:text-black text-gray-600">
                  💬 וואטסאפ
                </a>
              </li>
              <li>
                <a href="mailto:info@bellano.co.il" className="hover:text-black text-gray-600">
                  ✉️ info@bellano.co.il
                </a>
              </li>
              <li className="text-gray-600 text-xs md:text-sm">
                <p>🕐 א-ה: 10:00-17:00 | ו׳: 10:00-13:00</p>
              </li>
            </ul>
          </div>

          {/* Quick Links */}
          <div className="text-center md:text-right">
            <h4 className="font-bold text-sm md:text-base mb-3 md:mb-4">מידע</h4>
            <ul className="space-y-2 text-sm">
              {links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-gray-600 hover:text-black">
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Categories */}
          <div className="text-center md:text-right">
            <h4 className="font-bold text-sm md:text-base mb-3 md:mb-4">קטגוריות</h4>
            <ul className="space-y-2 text-sm">
              {categories.map((category) => (
                <li key={category.slug}>
                  <Link
                    href={`/category/${category.slug}`}
                    className="text-gray-600 hover:text-black"
                  >
                    {category.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Social & Logo */}
          <div className="text-center md:text-right">
            <h4 className="font-bold text-sm md:text-base mb-3 md:mb-4">עקבו אחרינו</h4>
            <div className="flex gap-3 mb-4 justify-center md:justify-start">
              <a
                href="https://www.instagram.com/bellano.decor/"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white p-2 rounded-full hover:bg-black hover:text-white transition-colors"
              >
                <Instagram className="h-5 w-5" />
              </a>
              <a
                href="https://www.facebook.com/bellano.decor"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white p-2 rounded-full hover:bg-black hover:text-white transition-colors"
              >
                <Facebook className="h-5 w-5" />
              </a>
            </div>
            <div className="mt-4 flex justify-center md:justify-start">
              <Image
                src="https://bellano.co.il/wp-content/uploads/2024/06/Bellano-שחור-על-רקע-שקוף.png"
                alt="בלאנו - רהיטי מעצבים"
                width={100}
                height={33}
                className="h-8 w-auto opacity-80"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Copyright */}
      <div className="border-t border-gray-200">
        <div className="container mx-auto px-4 py-4 text-center text-xs text-gray-500">
          כל הזכויות שמורות לבלאנו © {new Date().getFullYear()}
        </div>
      </div>
    </footer>
  );
}
