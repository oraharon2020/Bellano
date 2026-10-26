'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Phone, Mail, Clock, Instagram, Facebook, LogIn, LogOut, User } from 'lucide-react';
import { siteConfig } from '@/config/site';
import { useAdminStore } from '@/lib/store/admin';
import { useWhatsAppLead } from '@/lib/whatsapp-lead';

const categories = [
  { name: 'מזנונים לסלון', slug: 'living-room-sideboards' },
  { name: 'שולחנות סלון', slug: 'living-room-tables' },
  { name: 'קונסולות', slug: 'consoles' },
  { name: 'שידות לילה', slug: 'bedside-tables' },
  { name: 'כורסאות', slug: 'designed-armchairs' },
  { name: 'קומודות', slug: 'dresser' },
  { name: 'שולחנות איפור', slug: 'makeup-tables' },
];

const links = [
  { name: 'שאלות נפוצות', href: '/faq' },
  { name: 'אודותינו', href: '/page/about-us' },
  { name: 'צרו קשר', href: '/contact' },
  { name: 'תקנון', href: '/page/privacy-policy' },
];

export function Footer() {
  const { isAdmin, adminName, openLoginModal, logout } = useAdminStore();
  const whatsappLead = useWhatsAppLead();
  
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
                <a href={`tel:${siteConfig.phoneClean}`} className="hover:text-black text-gray-600">
                  📞 {siteConfig.phone}
                </a>
              </li>
              <li>
                <a href={whatsappLead.href} onClick={whatsappLead.onClick} className="hover:text-black text-gray-600">
                  💬 וואטסאפ
                </a>
              </li>
              <li>
                <a href={`mailto:${siteConfig.email}`} className="hover:text-black text-gray-600">
                  ✉️ {siteConfig.email}
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
              <li>
                <Link
                  href="/categories"
                  className="text-primary font-medium hover:text-primary/80"
                >
                  כל הקטגוריות ←
                </Link>
              </li>
            </ul>
          </div>

          {/* Social & Logo */}
          <div className="text-center md:text-right">
            <h4 className="font-bold text-sm md:text-base mb-3 md:mb-4">עקבו אחרינו</h4>
            <div className="flex gap-3 mb-4 justify-center md:justify-start">
              <a
                href={siteConfig.social.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white p-2 rounded-full hover:bg-black hover:text-white transition-colors"
              >
                <Instagram className="h-5 w-5" />
              </a>
              <a
                href={siteConfig.social.facebook}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white p-2 rounded-full hover:bg-black hover:text-white transition-colors"
              >
                <Facebook className="h-5 w-5" />
              </a>
            </div>
            <div className="mt-4 flex justify-center md:justify-start">
              <Image
                src={siteConfig.logo.wordpressUrl}
                alt={siteConfig.fullName}
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
        <div className="container mx-auto px-4 py-4 flex flex-col md:flex-row items-center justify-between gap-2">
          <span className="text-xs text-gray-500">
            כל הזכויות שמורות ל{siteConfig.name} © {new Date().getFullYear()}
          </span>
          
          {/* Admin Login/Logout Button */}
          {isAdmin ? (
            <button
              onClick={logout}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors"
            >
              <User className="w-3.5 h-3.5" />
              <span>{adminName}</span>
              <LogOut className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={openLoginModal}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>כניסת נציגים</span>
            </button>
          )}
        </div>
      </div>
    </footer>
  );
}
