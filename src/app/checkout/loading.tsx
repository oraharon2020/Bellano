import { Skeleton } from '@/components/ui/skeleton';

// Segment-level Suspense boundary: the checkout page is a client component
// using useSearchParams(), which requires a boundary to prerender.
// (The root loading.tsx was removed so crawlable routes can emit real 404s.)
export default function Loading() {
  return (
    <div className="container mx-auto px-4 py-8">
      <Skeleton className="h-8 w-48 mb-6" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <Skeleton className="h-40 w-full rounded-lg" />
          <Skeleton className="h-40 w-full rounded-lg" />
        </div>
        <Skeleton className="h-80 w-full rounded-lg" />
      </div>
    </div>
  );
}
