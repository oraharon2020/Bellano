'use client';

import { useState, useMemo } from 'react';
import { SlidersHorizontal, X, ChevronDown } from 'lucide-react';
import { ProductCard } from './ProductCard';
import type { Product } from '@/lib/types';

type SortOption = 'default' | 'price-low' | 'price-high' | 'newest' | 'on-sale';

interface FilterableProductGridProps {
  products: Product[];
}

function parsePrice(priceStr: string | undefined): number {
  if (!priceStr) return 0;
  // Remove currency symbols, commas, spaces — keep digits and dots
  const cleaned = priceStr.replace(/[^\d.]/g, '');
  return parseFloat(cleaned) || 0;
}

function getPriceRange(products: Product[]): { min: number; max: number } {
  const prices = products.map(p => {
    const sale = parsePrice(p.salePrice);
    const regular = parsePrice(p.price);
    return sale > 0 ? sale : regular;
  }).filter(p => p > 0);
  
  if (prices.length === 0) return { min: 0, max: 10000 };
  return { min: Math.floor(Math.min(...prices)), max: Math.ceil(Math.max(...prices)) };
}

// Price range presets in ILS
const PRICE_RANGES = [
  { label: 'עד ₪1,000', min: 0, max: 1000 },
  { label: '₪1,000 - ₪2,000', min: 1000, max: 2000 },
  { label: '₪2,000 - ₪4,000', min: 2000, max: 4000 },
  { label: '₪4,000 - ₪6,000', min: 4000, max: 6000 },
  { label: '₪6,000 - ₪10,000', min: 6000, max: 10000 },
  { label: 'מעל ₪10,000', min: 10000, max: Infinity },
];

export function FilterableProductGrid({ products }: FilterableProductGridProps) {
  const [sortBy, setSortBy] = useState<SortOption>('default');
  const [selectedPriceRange, setSelectedPriceRange] = useState<number | null>(null);
  const [showOnSaleOnly, setShowOnSaleOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Get actual price range from products
  const priceRange = useMemo(() => getPriceRange(products), [products]);
  
  // Determine which price range presets are relevant
  const relevantRanges = useMemo(() => {
    return PRICE_RANGES.filter(range => {
      // Show range if any products fall in it
      return products.some(p => {
        const price = parsePrice(p.salePrice) || parsePrice(p.price);
        return price >= range.min && price < range.max;
      });
    });
  }, [products]);

  const hasOnSaleProducts = useMemo(() => products.some(p => p.onSale), [products]);

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    let result = [...products];

    // Price range filter
    if (selectedPriceRange !== null) {
      const range = PRICE_RANGES[selectedPriceRange];
      if (range) {
        result = result.filter(p => {
          const price = parsePrice(p.salePrice) || parsePrice(p.price);
          return price >= range.min && price < range.max;
        });
      }
    }

    // Sale filter
    if (showOnSaleOnly) {
      result = result.filter(p => p.onSale);
    }

    // Sort
    switch (sortBy) {
      case 'price-low':
        result.sort((a, b) => {
          const priceA = parsePrice(a.salePrice) || parsePrice(a.price);
          const priceB = parsePrice(b.salePrice) || parsePrice(b.price);
          return priceA - priceB;
        });
        break;
      case 'price-high':
        result.sort((a, b) => {
          const priceA = parsePrice(a.salePrice) || parsePrice(a.price);
          const priceB = parsePrice(b.salePrice) || parsePrice(b.price);
          return priceB - priceA;
        });
        break;
      case 'newest':
        // Products are usually returned in newest-first from WooCommerce by default
        // Keep original order but reversed if needed
        result.reverse();
        break;
      case 'on-sale':
        result.sort((a, b) => (b.onSale ? 1 : 0) - (a.onSale ? 1 : 0));
        break;
      default:
        // Keep original order
        break;
    }

    return result;
  }, [products, sortBy, selectedPriceRange, showOnSaleOnly]);

  const activeFilterCount = (selectedPriceRange !== null ? 1 : 0) + (showOnSaleOnly ? 1 : 0);

  const clearAllFilters = () => {
    setSelectedPriceRange(null);
    setShowOnSaleOnly(false);
    setSortBy('default');
  };

  return (
    <div>
      {/* Toolbar — Sort + Filter Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <p className="text-sm text-muted-foreground">
            {filteredProducts.length} מוצרים
            {filteredProducts.length !== products.length && (
              <span className="text-xs"> (מתוך {products.length})</span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-3 py-2 text-sm border rounded-lg transition-colors ${
              showFilters || activeFilterCount > 0
                ? 'border-black bg-black text-white'
                : 'border-gray-200 hover:border-gray-300 bg-white'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>סינון</span>
            {activeFilterCount > 0 && (
              <span className="bg-white text-black text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* Sort Dropdown */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="appearance-none pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-white hover:border-gray-300 cursor-pointer focus:outline-none focus:ring-2 focus:ring-black/10"
            >
              <option value="default">מיון: ברירת מחדל</option>
              <option value="price-low">מחיר: נמוך לגבוה</option>
              <option value="price-high">מחיר: גבוה לנמוך</option>
              <option value="newest">חדשים ביותר</option>
              {hasOnSaleProducts && <option value="on-sale">מבצעים קודם</option>}
            </select>
            <ChevronDown className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-100 animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-sm">סינון מוצרים</h3>
            {activeFilterCount > 0 && (
              <button
                onClick={clearAllFilters}
                className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
              >
                <X className="w-3 h-3" />
                נקה הכל
              </button>
            )}
          </div>

          {/* Price Range */}
          <div className="mb-3">
            <p className="text-xs text-muted-foreground mb-2 font-medium">טווח מחירים</p>
            <div className="flex flex-wrap gap-2">
              {relevantRanges.map((range, idx) => {
                const originalIdx = PRICE_RANGES.indexOf(range);
                return (
                  <button
                    key={idx}
                    onClick={() => setSelectedPriceRange(
                      selectedPriceRange === originalIdx ? null : originalIdx
                    )}
                    className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                      selectedPriceRange === originalIdx
                        ? 'bg-black text-white border-black'
                        : 'bg-white border-gray-200 hover:border-gray-300 text-gray-700'
                    }`}
                  >
                    {range.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* On Sale Toggle */}
          {hasOnSaleProducts && (
            <div>
              <button
                onClick={() => setShowOnSaleOnly(!showOnSaleOnly)}
                className={`px-3 py-1.5 text-xs rounded-full border transition-colors flex items-center gap-1 ${
                  showOnSaleOnly
                    ? 'bg-red-500 text-white border-red-500'
                    : 'bg-white border-gray-200 hover:border-gray-300 text-gray-700'
                }`}
              >
                🏷️ מבצעים בלבד
              </button>
            </div>
          )}
        </div>
      )}

      {/* Active Filters Tags */}
      {activeFilterCount > 0 && !showFilters && (
        <div className="flex flex-wrap gap-2 mb-4">
          {selectedPriceRange !== null && (
            <span className="inline-flex items-center gap-1 px-3 py-1 text-xs bg-gray-100 rounded-full">
              {PRICE_RANGES[selectedPriceRange].label}
              <button onClick={() => setSelectedPriceRange(null)} className="hover:text-red-500">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {showOnSaleOnly && (
            <span className="inline-flex items-center gap-1 px-3 py-1 text-xs bg-red-50 text-red-600 rounded-full">
              🏷️ מבצעים
              <button onClick={() => setShowOnSaleOnly(false)} className="hover:text-red-800">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
        </div>
      )}

      {/* Products Grid */}
      {filteredProducts.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-3">לא נמצאו מוצרים עם הסינון הנוכחי</p>
          <button
            onClick={clearAllFilters}
            className="text-sm text-primary hover:underline"
          >
            הסר את כל הסינונים
          </button>
        </div>
      )}
    </div>
  );
}
