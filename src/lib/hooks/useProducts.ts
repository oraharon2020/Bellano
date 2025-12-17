'use client';

import useSWR from 'swr';

// Fetcher that calls our API routes
const fetcher = (url: string) => fetch(url).then(res => res.json());

// Custom hook for products with browser caching
export function useProducts(limit = 8) {
  const { data, error, isLoading } = useSWR(
    `/api/products?limit=${limit}`,
    fetcher,
    {
      revalidateOnFocus: false,      // Don't refetch on tab focus
      revalidateIfStale: false,       // Use cache even if stale
      dedupingInterval: 600000,       // 10 minutes deduplication
      keepPreviousData: true,         // Show old data while loading new
    }
  );

  return {
    products: data?.products || [],
    isLoading,
    error,
  };
}

// Custom hook for categories with browser caching
export function useCategories(limit = 10) {
  const { data, error, isLoading } = useSWR(
    `/api/categories?limit=${limit}`,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateIfStale: false,
      dedupingInterval: 600000,
      keepPreviousData: true,
    }
  );

  return {
    categories: data?.categories || [],
    isLoading,
    error,
  };
}
