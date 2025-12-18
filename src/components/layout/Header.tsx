'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { Search, ShoppingBag, Menu, Phone, User, Heart, X, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCartStore } from '@/lib/store/cart';
import { useWishlistStore } from '@/lib/store/wishlist';
import { CartSidebar } from './CartSidebar';
import { SearchModal } from '@/components/search/SearchModal';

const categories = [
  { name: 'שולחנות סלון', slug: 'living-room-tables' },
  { name: 'מזנונים לסלון', slug: 'living-room-sideboards' },
  { name: 'קומודות', slug: 'dresser' },
  { name: 'קונסולות', slug: 'consoles' },
  { name: 'שידות לילה', slug: 'bedside-tables' },
  { name: 'כורסאות', slug: 'designed-armchairs' },
  { name: 'פינות אוכל', slug: 'dining' },
  { name: 'מראות', slug: 'mirrors' },
  { name: 'ספריות', slug: 'libraries' },
  { name: 'מיטות', slug: 'beds' },
];

const infoLinks = [
  { name: 'אודותינו', href: '/page/about-us' },
  { name: 'צרו קשר', href: '/contact' },
  { name: 'שאלות נפוצות', href: '/faq' },
];

export function Header() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { getItemCount, toggleCart, isHydrated } = useCartStore();
  const wishlistStore = useWishlistStore();
  const itemCount = isHydrated ? getItemCount() : 0;
  const wishlistCount = wishlistStore.isHydrated ? wishlistStore.getItemCount() : 0;

  return (
    <>
      {/* Top Bar */}
      <div className="bg-primary text-primary-foreground text-center py-2 text-sm">
        משלוח חינם עד הבית 🚚
      </div>

      {/* Main Header */}
      <header className="sticky top-0 z-40 bg-background border-b">
        <div className="container mx-auto px-4">
          <div className="relative flex items-center justify-between h-16 md:h-20">
            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu className="h-6 w-6" />
            </button>

            {/* Logo - centered on mobile */}
            <Link href="/" className="flex-shrink-0 absolute left-1/2 -translate-x-1/2 md:static md:translate-x-0">
              <Image
                src="https://bellano.co.il/wp-content/uploads/2024/06/Bellano-שחור-על-רקע-שקוף.png"
                alt="בלאנו - רהיטי מעצבים"
                width={120}
                height={40}
                className="h-10 md:h-12 w-auto"
                priority
              />
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-6">
              {categories.slice(0, 7).map((category) => (
                <Link
                  key={category.slug}
                  href={`/category/${category.slug}`}
                  className="text-sm hover:text-primary transition-colors whitespace-nowrap"
                >
                  {category.name}
                </Link>
              ))}
              <Link
                href="/categories"
                className="text-sm font-medium text-primary hover:underline"
              >
                כל הקטגוריות
              </Link>
            </nav>

            {/* Actions */}
            <div className="flex items-center gap-2 md:gap-4">
              {/* Search */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSearchOpen(true)}
              >
                <Search className="h-5 w-5" />
              </Button>

              {/* Wishlist */}
              <Link href="/wishlist">
                <Button variant="ghost" size="icon" className="hidden md:flex relative">
                  <Heart className="h-5 w-5" />
                  {wishlistCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {wishlistCount}
                    </span>
                  )}
                </Button>
              </Link>

              {/* Cart */}
              <Button
                variant="ghost"
                size="icon"
                className="relative"
                onClick={toggleCart}
              >
                <ShoppingBag className="h-5 w-5" />
                {itemCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {itemCount}
                  </span>
                )}
              </Button>

              {/* Phone */}
              <a
                href="tel:03-5566696"
                className="hidden md:flex items-center gap-2 text-sm font-medium"
              >
                <Phone className="h-4 w-4" />
                03-5566696
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <>
          {/* Overlay */}
          <div 
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setMobileMenuOpen(false)}
          />
          
          {/* Menu Panel */}
          <div className="fixed top-0 right-0 h-full w-full max-w-xs bg-white z-50 shadow-xl flex flex-col animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <Link href="/" onClick={() => setMobileMenuOpen(false)}>
                <Image
                  src="https://bellano.co.il/wp-content/uploads/2024/06/Bellano-שחור-על-רקע-שקוף.png"
                  alt="בלאנו - רהיטי מעצבים"
                  width={100}
                  height={33}
                  className="h-8 w-auto"
                />
              </Link>
              <button 
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Menu Content */}
            <div className="flex-1 overflow-auto">
              {/* Categories */}
              <div className="p-4">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">קטגוריות</p>
                <nav className="space-y-1">
                  {categories.map((category) => (
                    <Link
                      key={category.slug}
                      href={`/category/${category.slug}`}
                      className="flex items-center justify-between py-3 px-3 rounded-lg hover:bg-gray-50 transition-colors group"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <span className="font-medium">{category.name}</span>
                      <ChevronLeft className="w-4 h-4 text-gray-400 group-hover:text-black transition-colors" />
                    </Link>
                  ))}
                </nav>
              </div>
              
              {/* Divider */}
              <div className="h-2 bg-gray-100" />
              
              {/* Info Links */}
              <div className="p-4">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">מידע</p>
                <nav className="space-y-1">
                  {infoLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="flex items-center justify-between py-3 px-3 rounded-lg hover:bg-gray-50 transition-colors group"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <span className="font-medium">{link.name}</span>
                      <ChevronLeft className="w-4 h-4 text-gray-400 group-hover:text-black transition-colors" />
                    </Link>
                  ))}
                </nav>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t p-4 space-y-3 bg-gray-50">
              <a 
                href="tel:03-5566696"
                className="flex items-center justify-center gap-2 py-3 bg-black text-white rounded-lg font-medium"
              >
                <Phone className="w-4 h-4" />
                03-5566696
              </a>
              <a 
                href="https://wa.me/97235566696"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 py-3 border border-gray-300 rounded-lg font-medium hover:bg-white transition-colors"
              >
                וואטסאפ
              </a>
            </div>
          </div>
        </>
      )}

      {/* Cart Sidebar */}
      <CartSidebar />

      {/* Search Modal */}
      <SearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
