'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
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
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);

  const loadMore = useCallback(async () => {
    if (loadingRef.current || !hasMore) return;
    loadingRef.current = true;
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
      loadingRef.current = false;
      setLoading(false);
    }
  }, [hasMore, page, categorySlug, perPage]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { rootMargin: '400px' }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore]);

  return (
    <>
      <FilterableProductGrid products={products} />
      
      {hasMore && (
        <div ref={sentinelRef} className="flex justify-center items-center py-10">
          {loading && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span>טוען מוצרים...</span>
            </div>
          )}
        </div>
      )}
    </>
  );
}
