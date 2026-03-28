'use client';

import { useState, useCallback } from 'react';
import { FilterableProductGrid } from './FilterableProductGrid';
import type { Product } from '@/lib/types';

interface CategoryProductGridProps {
  initialProducts: Product[];
  categorySlug: string;
  totalProducts: number;
  perPage: number;
}

export function CategoryProductGrid({ initialProducts, categorySlug, totalProducts, perPage }: CategoryProductGridProps) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const hasMore = products.length < totalProducts;

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    try {
      const nextPage = page + 1;
      const res = await fetch(`/api/products/category/${encodeURIComponent(categorySlug)}?page=${nextPage}&per_page=${perPage}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      if (data.products?.length) {
        setProducts(prev => [...prev, ...data.products]);
        setPage(nextPage);
      }
    } catch (error) {
      console.error('Error loading more products:', error);
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, page, categorySlug, perPage]);

  return (
    <>
      <FilterableProductGrid products={products} />
      
      {hasMore && (
        <div className="flex justify-center mt-8">
          <button
            onClick={loadMore}
            disabled={loading}
            className="px-8 py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 font-medium"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                טוען...
              </span>
            ) : (
              `הצג עוד מוצרים (${products.length} מתוך ${totalProducts})`
            )}
          </button>
        </div>
      )}
    </>
  );
}
