'use client';

import { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Heart } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useWishlistStore } from '@/lib/store/wishlist';
import type { Product, ProductVariation } from '@/lib/types';

// Color mapping for visual display (fallback when no image)
const colorMap: Record<string, string> = {
  'לבן': '#FFFFFF',
  'לבן מט': '#F8F8F8',
  'שחור': '#000000',
  'שחור מט': '#1a1a1a',
  'אפור': '#808080',
  'אפור מט': '#6b6b6b',
  'אגוז': '#5D4037',
  'אגוז אמריקאי': '#6D4C41',
  'אלון': '#C4A35A',
  'אלון טבעי': '#D4B896',
  'אבן': '#B8B5A8',
  'עץ טבעי': '#DEB887',
  'טבעי': '#E8DCC4',
  'וונגה': '#3E2723',
  'אפור בטון': '#9E9E9E',
  'כחול': '#3B82F6',
  'ירוק': '#22C55E',
  'אדום': '#EF4444',
  'ורוד': '#EC4899',
  'סגול': '#8B5CF6',
  'צהוב': '#EAB308',
  'כתום': '#F97316',
  'בז\'': '#D4C4B0',
  'קרם': '#FFFDD0',
  'חום': '#8B4513',
};

// Get color value for display
const getColorStyle = (colorName: string): React.CSSProperties => {
  const lowerName = colorName.toLowerCase();
  
  for (const [key, value] of Object.entries(colorMap)) {
    if (lowerName.includes(key.toLowerCase())) {
      return { backgroundColor: value };
    }
  }
  
  return { 
    background: 'linear-gradient(135deg, #DEB887 50%, #8B7355 50%)' 
  };
};

interface ProductCardProps {
  product: Product;
}

// Client-side cache for variation images (shared across all ProductCard instances)
const variationImageCache = new Map<string, string | null>();
const pendingFetches = new Map<string, Promise<string | null>>();

export function ProductCard({ product }: ProductCardProps) {
  const { toggleItem, isInWishlist, isHydrated } = useWishlistStore();
  const isWishlisted = isHydrated && isInWishlist(product.id);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [variationImage, setVariationImage] = useState<string | null>(null);
  const [isLoadingImage, setIsLoadingImage] = useState(false);
  
  // Get unique colors from variations (deduplicate by colorName)
  const uniqueColors = useMemo(() => {
    const variations = product.variations || [];
    const seenColors = new Set<string>();
    const unique: ProductVariation[] = [];
    
    for (const v of variations) {
      const colorName = v.colorName?.trim();
      if (colorName && !seenColors.has(colorName)) {
        seenColors.add(colorName);
        unique.push(v);
      }
    }
    
    return unique;
  }, [product.variations]);
  
  // Fetch variation image (with cache)
  const fetchVariationImage = async (colorName: string): Promise<string | null> => {
    const cacheKey = `${product.databaseId}-${colorName}`;
    
    // Check cache first
    if (variationImageCache.has(cacheKey)) {
      return variationImageCache.get(cacheKey) || null;
    }
    
    // Check if already fetching
    if (pendingFetches.has(cacheKey)) {
      return pendingFetches.get(cacheKey)!;
    }
    
    // Start fetch
    const fetchPromise = (async () => {
      try {
        const response = await fetch(`/api/variation-image?productId=${product.databaseId}&colorName=${encodeURIComponent(colorName)}`);
        const data = await response.json();
        const image = data.image || null;
        variationImageCache.set(cacheKey, image);
        return image;
      } catch {
        variationImageCache.set(cacheKey, null);
        return null;
      } finally {
        pendingFetches.delete(cacheKey);
      }
    })();
    
    pendingFetches.set(cacheKey, fetchPromise);
    return fetchPromise;
  };
  
  // Prefetch all colors when card becomes visible (for mobile)
  const cardRef = useRef<HTMLDivElement>(null);
  const hasPrefetched = useRef(false);
  
  const prefetchAllColors = useCallback(() => {
    if (hasPrefetched.current) return;
    hasPrefetched.current = true;
    
    // Prefetch first 4 colors (the ones visible on mobile)
    uniqueColors.slice(0, 4).forEach(v => {
      if (v.colorName) {
        fetchVariationImage(v.colorName);
      }
    });
  }, [uniqueColors, fetchVariationImage]);
  
  useEffect(() => {
    const card = cardRef.current;
    if (!card || uniqueColors.length === 0) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          // Small delay to not block initial render
          setTimeout(prefetchAllColors, 200);
          observer.disconnect();
        }
      },
      { rootMargin: '100px' } // Start prefetching before fully visible
    );
    
    observer.observe(card);
    return () => observer.disconnect();
  }, [prefetchAllColors, uniqueColors.length]);
  
  // Prefetch on hover (for desktop)
  const handleColorHover = (colorName: string) => {
    fetchVariationImage(colorName);
  };
  
  // Handle color click
  const handleColorClick = async (colorName: string) => {
    if (selectedColor === colorName) {
      setSelectedColor(null);
      setVariationImage(null);
      return;
    }
    
    setSelectedColor(colorName);
    
    const cacheKey = `${product.databaseId}-${colorName}`;
    if (variationImageCache.has(cacheKey)) {
      // Already cached - instant switch
      setVariationImage(variationImageCache.get(cacheKey) || null);
    } else {
      // Not cached yet - show loading
      setIsLoadingImage(true);
      const image = await fetchVariationImage(colorName);
      setVariationImage(image);
      setIsLoadingImage(false);
    }
  };
  
  // Fallback to color options from attributes if no variations
  const colorAttribute = product.attributes?.nodes?.find(
    attr => attr.name === 'צבע' || attr.name === 'color' || attr.name.toLowerCase().includes('color')
  );
  const colorOptions = colorAttribute?.options || [];
  
  // Use unique colors from variations if available
  const hasColors = uniqueColors.length > 0;

  const wishlistItem = {
    id: product.id,
    databaseId: product.databaseId,
    name: product.name,
    slug: product.slug,
    price: product.price,
    regularPrice: product.regularPrice,
    salePrice: product.salePrice,
    onSale: product.onSale,
    image: product.image,
  };
  
  const hasDiscount = product.onSale && product.regularPrice && product.salePrice;
  
  // Calculate discount percentage
  const discountPercentage = hasDiscount
    ? Math.round(
        ((parseFloat(product.regularPrice!.replace(/[^\d.]/g, '')) -
          parseFloat(product.salePrice!.replace(/[^\d.]/g, ''))) /
          parseFloat(product.regularPrice!.replace(/[^\d.]/g, ''))) *
          100
      )
    : 0;

  // Get display image - use variation image if loaded
  const displayImage = variationImage || product.image?.sourceUrl;
  const displayImageAlt = product.image?.altText || product.name;

  return (
    <div ref={cardRef} className="group">
      {/* Image Container */}
      <div className="relative aspect-square bg-gray-50 rounded-lg overflow-hidden mb-3">
        <Link href={`/product/${product.slug}`}>
          {displayImage ? (
            <Image
              src={displayImage}
              alt={displayImageAlt}
              fill
              className={`object-cover transition-all duration-300 group-hover:scale-105 ${isLoadingImage ? 'opacity-50' : ''}`}
              sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
              priority={false}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              אין תמונה
            </div>
          )}
        </Link>
        
        {/* Loading indicator */}
        {isLoadingImage && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/50">
            <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Discount Badge */}
        {hasDiscount && discountPercentage > 0 && (
          <Badge className="absolute top-3 right-3 bg-red-500 hover:bg-red-500 text-white px-3 py-1 rounded-full text-sm font-medium">
            {discountPercentage}%-
          </Badge>
        )}

        {/* Wishlist Button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute bottom-3 left-3 bg-transparent hover:bg-transparent p-0"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleItem(wishlistItem);
          }}
        >
          <Heart 
            className={`h-6 w-6 transition-colors ${
              isWishlisted 
                ? 'fill-red-500 text-red-500' 
                : 'text-gray-400 hover:text-gray-600'
            }`} 
          />
        </Button>
      </div>

      {/* Product Info */}
      <div className="text-center space-y-2">
        {/* Product Name */}
        <Link href={`/product/${product.slug}`}>
          <h3 className="font-medium text-base hover:text-primary transition-colors line-clamp-2">
            {product.name}
          </h3>
        </Link>

        {/* Price */}
        <div className="flex items-center justify-center gap-2">
          <span className="text-sm text-muted-foreground">החל מ-₪</span>
          <span className="font-bold text-lg">
            {product.price.replace('₪', '').trim()}
          </span>
        </div>

        {/* Available Colors - click to change product image */}
        {hasColors ? (
          <div className="flex items-center justify-center gap-2 pt-3 flex-wrap">
            {/* Show 4 on mobile, 6 on desktop */}
            {uniqueColors.slice(0, 6).map((variation, index) => {
              // Use swatchImage for the circle
              const swatchImageUrl = variation.swatchImage || variation.image?.sourceUrl;
              const hasSwatchImage = !!swatchImageUrl;
              const isSelected = selectedColor === variation.colorName;
              
              return (
                <button
                  key={variation.id}
                  onClick={() => handleColorClick(variation.colorName || '')}
                  onMouseEnter={() => handleColorHover(variation.colorName || '')}
                  disabled={isLoadingImage}
                  className={`relative rounded-full overflow-hidden border shadow-sm cursor-pointer transition-all ${
                    isSelected 
                      ? 'ring-2 ring-black ring-offset-1 border-black' 
                      : 'border-gray-200 hover:border-gray-400'
                  } ${index >= 4 ? 'hidden md:block' : ''} ${isLoadingImage ? 'opacity-50' : ''}`}
                  title={variation.colorName || ''}
                  style={{ width: 28, height: 28 }}
                >
                  {hasSwatchImage ? (
                    <Image
                      src={swatchImageUrl}
                      alt={variation.colorName || ''}
                      fill
                      className="object-cover"
                      sizes="28px"
                    />
                  ) : (
                    <div 
                      className="w-full h-full"
                      style={getColorStyle(variation.colorName || '')}
                    />
                  )}
                </button>
              );
            })}
            {/* Show +X count - different for mobile vs desktop */}
            {uniqueColors.length > 4 && (
              <span className="text-xs text-muted-foreground font-medium ml-1 md:hidden">
                +{uniqueColors.length - 4}
              </span>
            )}
            {uniqueColors.length > 6 && (
              <span className="text-xs text-muted-foreground font-medium ml-1 hidden md:inline">
                +{uniqueColors.length - 6}
              </span>
            )}
          </div>
        ) : colorOptions.length > 0 ? (
          // Fallback to color attributes
          <div className="flex items-center justify-center gap-2 pt-3">
            {colorOptions.slice(0, 5).map((color, index) => (
              <div
                key={index}
                className="w-7 h-7 rounded-full border border-gray-200 shadow-sm"
                style={getColorStyle(color)}
                title={color}
              />
            ))}
            {colorOptions.length > 5 && (
              <span className="text-xs text-muted-foreground font-medium">+{colorOptions.length - 5}</span>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
