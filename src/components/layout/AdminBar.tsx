'use client';

import { useAdminStore } from '@/lib/store/admin';
import { usePathname } from 'next/navigation';
import { ExternalLink, Edit, LayoutDashboard, Package, LogOut, X, RefreshCw, Check } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';

export function AdminBar() {
  const { isAdmin, adminName, logout, currentProductId, adminToken } = useAdminStore();
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [cacheState, setCacheState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');

  useEffect(() => {
    setMounted(true);
  }, []);

  const clearCache = useCallback(async () => {
    if (!adminToken || cacheState === 'loading') return;
    setCacheState('loading');
    try {
      const res = await fetch('/api/cache', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': adminToken,
        },
        body: JSON.stringify({ path: pathname }),
      });
      setCacheState(res.ok ? 'done' : 'error');
    } catch {
      setCacheState('error');
    }
    setTimeout(() => setCacheState('idle'), 2500);
  }, [adminToken, cacheState, pathname]);

  // Add/remove body padding when admin bar is visible
  useEffect(() => {
    if (mounted && isAdmin && isVisible) {
      document.body.style.paddingTop = '40px';
    } else {
      document.body.style.paddingTop = '0px';
    }
    return () => {
      document.body.style.paddingTop = '0px';
    };
  }, [mounted, isAdmin, isVisible]);

  // Don't render on server or if not admin
  if (!mounted || !isAdmin) return null;

  // Extract product slug from URL if on product page
  const productMatch = pathname.match(/^\/product\/([^/]+)/);
  const productSlug = productMatch ? productMatch[1] : null;

  // Extract category slug from URL if on category page
  const categoryMatch = pathname.match(/^\/category\/([^/]+)/);
  const categorySlug = categoryMatch ? categoryMatch[1] : null;

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed top-2 right-2 z-[9999] bg-gray-900 text-white px-2 py-1 rounded text-xs hover:bg-gray-800 transition-colors"
      >
        Admin
      </button>
    );
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] bg-gray-900 text-white text-sm h-10 flex items-center justify-between px-4 shadow-lg">
      {/* Left side - Logo and links */}
      <div className="flex items-center gap-4">
        <span className="font-semibold text-yellow-400">⚡ Admin</span>
        
        <a
          href="https://admin.bellano.co.il/wp-admin/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 hover:text-yellow-400 transition-colors"
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>לוח בקרה</span>
          <ExternalLink className="w-3 h-3" />
        </a>

        <a
          href="https://admin.bellano.co.il/wp-admin/edit.php?post_type=product"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 hover:text-yellow-400 transition-colors"
        >
          <Package className="w-4 h-4" />
          <span>כל המוצרים</span>
          <ExternalLink className="w-3 h-3" />
        </a>

        {/* Context-specific links */}
        {productSlug && (
          <a
            href={
              currentProductId
                ? `https://admin.bellano.co.il/wp-admin/post.php?post=${currentProductId}&action=edit`
                : `https://admin.bellano.co.il/wp-admin/edit.php?post_type=product&s=${encodeURIComponent(productSlug)}`
            }
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 bg-yellow-500 text-gray-900 px-2 py-1 rounded hover:bg-yellow-400 transition-colors"
          >
            <Edit className="w-4 h-4" />
            <span>ערוך מוצר זה</span>
          </a>
        )}

        {categorySlug && (
          <a
            href={`https://admin.bellano.co.il/wp-admin/edit-tags.php?taxonomy=product_cat&post_type=product&s=${encodeURIComponent(categorySlug)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-400 transition-colors"
          >
            <Edit className="w-4 h-4" />
            <span>ערוך קטגוריה</span>
          </a>
        )}
      </div>

      {/* Right side - User info */}
      <div className="flex items-center gap-4">
        {/* Cache clear button */}
        <button
          onClick={clearCache}
          disabled={cacheState === 'loading'}
          className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors ${
            cacheState === 'done'
              ? 'bg-green-600 text-white'
              : cacheState === 'error'
              ? 'bg-red-600 text-white'
              : 'hover:text-yellow-400 text-gray-300'
          }`}
          title="ניקוי קאש של הדף הנוכחי"
        >
          {cacheState === 'done' ? (
            <Check className="w-4 h-4" />
          ) : (
            <RefreshCw className={`w-4 h-4 ${cacheState === 'loading' ? 'animate-spin' : ''}`} />
          )}
          <span>
            {cacheState === 'loading' ? 'מנקה...' : cacheState === 'done' ? 'נוקה!' : cacheState === 'error' ? 'שגיאה' : 'ניקוי קאש'}
          </span>
        </button>

        <span className="text-gray-400">
          שלום, <span className="text-white">{adminName}</span>
        </span>
        
        <button
          onClick={logout}
          className="flex items-center gap-1.5 text-red-400 hover:text-red-300 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>התנתק</span>
        </button>

        <button
          onClick={() => setIsVisible(false)}
          className="text-gray-400 hover:text-white transition-colors"
          title="הסתר סרגל"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
