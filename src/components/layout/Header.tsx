'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { Search, ShoppingBag, Menu, Phone, Heart, X, ChevronLeft, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCartStore } from '@/lib/store/cart';
import { useWishlistStore } from '@/lib/store/wishlist';
import { CartSidebar } from './CartSidebar';
import { SearchModal } from '@/components/search/SearchModal';
import { siteConfig } from '@/config/site';

const { navigation } = siteConfig;

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
              aria-label="פתח תפריט"
            >
              <Menu className="h-6 w-6" />
            </button>

            {/* Logo - centered on mobile */}
            <Link href="/" className="flex-shrink-0 absolute left-1/2 -translate-x-1/2 md:static md:translate-x-0">
              <Image
                src={siteConfig.logo.wordpressUrl}
                alt={siteConfig.fullName}
                width={120}
                height={40}
                className="h-10 md:h-12 w-auto"
                priority
              />
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-1">
              {navigation.main.map((item) => (
                <div key={item.name} className="relative group">
                  {'children' in item && item.children ? (
                    // Dropdown menu
                    <>
                      <button className="flex items-center gap-1 px-3 py-2 text-sm hover:text-primary transition-colors whitespace-nowrap">
                        {item.name}
                        <ChevronDown className="w-3.5 h-3.5 transition-transform group-hover:rotate-180" />
                      </button>
                      <div className="absolute top-full right-0 pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                        <div className="bg-white border rounded-lg shadow-lg py-2 min-w-[180px]">
                          {item.children.map((child) => (
                            <Link
                              key={child.slug}
                              href={`/category/${child.slug}`}
                              className="block px-4 py-2 text-sm hover:bg-gray-50 hover:text-primary transition-colors"
                            >
                              {child.name}
                            </Link>
                          ))}
                        </div>
                      </div>
                    </>
                  ) : (
                    // Direct link (like Sale)
                    <Link
                      href={'slug' in item && item.slug ? `/category/${item.slug}` : ('href' in item ? item.href : '/')}
                      className={`px-3 py-2 text-sm transition-colors whitespace-nowrap ${
                        'highlight' in item && item.highlight 
                          ? 'text-red-600 font-semibold hover:text-red-700' 
                          : 'hover:text-primary'
                      }`}
                    >
                      {item.name}
                    </Link>
                  )}
                </div>
              ))}
              <Link
                href="/categories"
                className="px-3 py-2 text-sm text-primary font-medium hover:underline"
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
                aria-label="חיפוש"
              >
                <Search className="h-5 w-5" />
              </Button>

              {/* Wishlist */}
              <Link href="/wishlist" aria-label={`מועדפים${wishlistCount > 0 ? ` (${wishlistCount})` : ''}`}>
                <Button variant="ghost" size="icon" className="hidden md:flex relative" aria-label="מועדפים">
                  <Heart className="h-5 w-5" />
                  {wishlistCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center" aria-hidden="true">
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
                aria-label={`עגלת קניות${itemCount > 0 ? ` (${itemCount} פריטים)` : ''}`}
              >
                <ShoppingBag className="h-5 w-5" />
                {itemCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center" aria-hidden="true">
                    {itemCount}
                  </span>
                )}
              </Button>

              {/* Phone */}
              <a
                href={`tel:${siteConfig.phoneClean}`}
                className="hidden md:flex items-center gap-2 text-sm font-medium"
              >
                <Phone className="h-4 w-4" />
                {siteConfig.phone}
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
                  src={siteConfig.logo.wordpressUrl}
                  alt={siteConfig.fullName}
                  width={100}
                  height={33}
                  className="h-8 w-auto"
                />
              </Link>
              <button 
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                aria-label="סגור תפריט"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Menu Content */}
            <div className="flex-1 overflow-auto">
              {/* Main Navigation with Sections */}
              {navigation.main.map((section) => (
                'children' in section && section.children ? (
                  <div key={section.name} className="border-b">
                    <div className="p-4">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">{section.name}</p>
                      <nav className="space-y-1">
                        {section.children.map((item) => (
                          <Link
                            key={item.slug}
                            href={`/category/${item.slug}`}
                            className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-gray-50 transition-colors group"
                            onClick={() => setMobileMenuOpen(false)}
                          >
                            <span className="font-medium">{item.name}</span>
                            <ChevronLeft className="w-4 h-4 text-gray-400 group-hover:text-black transition-colors" />
                          </Link>
                        ))}
                      </nav>
                    </div>
                  </div>
                ) : (
                  <Link
                    key={section.name}
                    href={'slug' in section && section.slug ? `/category/${section.slug}` : ('href' in section ? section.href : '/')}
                    className={`flex items-center justify-between py-3 px-4 border-b transition-colors ${
                      'highlight' in section && section.highlight ? 'bg-red-50 text-red-600 font-semibold' : 'hover:bg-gray-50'
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <span className="font-medium">{section.name}</span>
                    <ChevronLeft className="w-4 h-4" />
                  </Link>
                )
              ))}
              
              {/* All Categories Link */}
              <Link
                href="/categories"
                className="flex items-center justify-between py-3 px-4 border-b bg-gray-50 transition-colors hover:bg-gray-100"
                onClick={() => setMobileMenuOpen(false)}
              >
                <span className="font-semibold text-primary">כל הקטגוריות</span>
                <ChevronLeft className="w-4 h-4 text-primary" />
              </Link>
              
              {/* Info Links */}
              <div className="p-4">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">מידע</p>
                <nav className="space-y-1">
                  {navigation.info.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-gray-50 transition-colors group"
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
