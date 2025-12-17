'use client';

import { useProducts, useCategories } from '@/lib/hooks/useProducts';
import { CategoryGrid, ProductGrid } from '@/components/products';
import { Skeleton } from '@/components/ui/skeleton';

export function CachedCategoryGrid() {
  const { categories, isLoading } = useCategories(10);

  if (isLoading && categories.length === 0) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="aspect-square rounded-lg" />
        ))}
      </div>
    );
  }

  if (categories.length === 0) return null;

  return <CategoryGrid categories={categories} title="הקולקציות הנבחרות שלנו" />;
}

export function CachedProductGrid() {
  const { products, isLoading } = useProducts(8);

  if (isLoading && products.length === 0) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="aspect-square rounded-lg" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  if (products.length === 0) return null;

  return <ProductGrid products={products} title="המוצרים הנמכרים שלנו" />;
}
