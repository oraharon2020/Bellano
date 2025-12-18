'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Heart, Minus, Plus, Truck, ShieldCheck, CreditCard, ChevronDown, ChevronLeft, ChevronRight, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useCartStore } from '@/lib/store/cart';
import { useWishlistStore } from '@/lib/store/wishlist';
import { AdminProductFields } from '@/components/product/AdminProductFields';
import { ProductVideo } from '@/components/product/ProductVideo';

// Color mapping for visual display
const colorMap: Record<string, string> = {
  'לבן': '#FFFFFF',
  'לבן מט': '#FFFFFF',
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
  'שמנת': '#FFFDD0',
  'בז\'': '#F5F5DC',
  'חום': '#8B4513',
  'זהב': '#FFD700',
  'כסף': '#C0C0C0',
  'ברונזה': '#CD7F32',
};

// Get color style
const getColorStyle = (colorName: string): React.CSSProperties => {
  const lowerName = colorName.toLowerCase();
  
  for (const [key, value] of Object.entries(colorMap)) {
    if (lowerName.includes(key.toLowerCase())) {
      return { backgroundColor: value };
    }
  }
  
  // Default gradient for unknown colors
  return { 
    background: 'linear-gradient(135deg, #DEB887 50%, #8B7355 50%)' 
  };
};

// Check if attribute is a color attribute
const isColorAttribute = (attrName: string): boolean => {
  const colorKeywords = ['צבע', 'color', 'colour', 'גוון'];
  return colorKeywords.some(keyword => attrName.toLowerCase().includes(keyword.toLowerCase()));
};

// Component for safely rendering HTML content (client-only)
function HtmlContent({ html, className }: { html: string; className?: string }) {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  if (!mounted) {
    // Return plain text version during SSR
    const plainText = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    return <p className={className}>{plainText}</p>;
  }
  
  return (
    <div 
      className={className}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

interface WooVariation {
  id: number;
  price: string;
  regular_price: string;
  sale_price: string;
  on_sale: boolean;
  attributes: { name: string; option: string }[];
  image: { src: string; alt: string };
}

interface ProductAttribute {
  name: string;
  options: string[];
}

interface FAQItem {
  question: string;
  answer: string;
}

interface ProductVideoData {
  url: string;
  thumbnail: string | null;
  type: 'file' | 'youtube';
  youtubeId: string | null;
}

interface ProductPageClientProps {
  product: {
    id: string;
    databaseId: number;
    name: string;
    slug: string;
    description: string;
    shortDescription?: string;
    price: string;
    regularPrice?: string;
    salePrice?: string;
    onSale: boolean;
    image?: { sourceUrl: string; altText?: string };
    galleryImages?: { sourceUrl: string; altText?: string }[];
    attributes?: {
      nodes: ProductAttribute[];
    };
  };
  variations?: WooVariation[];
  faqs?: FAQItem[];
  video?: ProductVideoData | null;
}

export function ProductPageClient({ product, variations = [], faqs = [], video = null }: ProductPageClientProps) {
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [selectedAttributes, setSelectedAttributes] = useState<Record<string, string>>({});
  const thumbnailsRef = useRef<HTMLDivElement>(null);
  
  // Admin fields state
  const [adminPrice, setAdminPrice] = useState<number | null>(null);
  const [adminFieldsData, setAdminFieldsData] = useState<any>(null);

  const { addItem } = useCartStore();
  const { toggleItem, isInWishlist, isHydrated: wishlistHydrated } = useWishlistStore();
  const isWishlisted = wishlistHydrated && isInWishlist(product.id);

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

  // Extract unique attributes - merge from product attributes AND variations
  const attributes = useMemo(() => {
    const attrMap = new Map<string, Set<string>>();
    
    // First, add attributes from product definition (this includes ALL attribute options)
    if (product.attributes?.nodes) {
      product.attributes.nodes.forEach(attr => {
        if (!attrMap.has(attr.name)) {
          attrMap.set(attr.name, new Set());
        }
        attr.options.forEach(opt => attrMap.get(attr.name)!.add(opt));
      });
    }
    
    // Then supplement/override with attributes from actual variations
    if (variations.length > 0) {
      variations.forEach(variation => {
        variation.attributes.forEach(attr => {
          // Normalize attribute name (remove "pa_" prefix if exists)
          const normalizedName = attr.name.replace(/^pa_/, '');
          
          // Find matching attribute in our map (case-insensitive)
          let matchedKey = Array.from(attrMap.keys()).find(
            key => key.toLowerCase() === normalizedName.toLowerCase() || 
                   key.toLowerCase() === attr.name.toLowerCase()
          );
          
          if (!matchedKey) {
            matchedKey = attr.name;
            attrMap.set(matchedKey, new Set());
          }
          
          attrMap.get(matchedKey)!.add(attr.option);
        });
      });
    }
    
    return Array.from(attrMap.entries()).map(([name, options]) => ({
      name,
      options: Array.from(options),
    }));
  }, [variations, product.attributes]);

  // Initialize selected attributes
  useEffect(() => {
    if (attributes.length > 0 && Object.keys(selectedAttributes).length === 0) {
      const initial: Record<string, string> = {};
      attributes.forEach(attr => {
        if (attr.options.length > 0) {
          initial[attr.name] = attr.options[0];
        }
      });
      setSelectedAttributes(initial);
    }
  }, [attributes, selectedAttributes]);

  // Find matching variation based on selected attributes
  const selectedVariation = useMemo(() => {
    if (!variations.length) return null;
    
    return variations.find(variation => {
      return variation.attributes.every(attr => {
        // Try to match with normalized names
        const normalizedName = attr.name.replace(/^pa_/, '');
        const matchedValue = selectedAttributes[attr.name] || 
                            selectedAttributes[normalizedName] ||
                            Object.entries(selectedAttributes).find(
                              ([key]) => key.toLowerCase() === normalizedName.toLowerCase()
                            )?.[1];
        return matchedValue === attr.option;
      });
    });
  }, [variations, selectedAttributes]);

  // Get current price (from variation or product)
  const currentPrice = selectedVariation 
    ? `${selectedVariation.price} ₪` 
    : product.price;
  
  const currentRegularPrice = selectedVariation?.regular_price 
    ? `${selectedVariation.regular_price} ₪` 
    : product.regularPrice;

  // Build gallery images including variation images - memoize to prevent recreation
  const allImages = useMemo(() => {
    const galleryImages = product.galleryImages || [];
    const variationImages = variations
      .filter(v => v.image?.src)
      .map(v => ({ sourceUrl: v.image.src, altText: v.image.alt }));
    
    const images = product.image 
      ? [product.image, ...galleryImages, ...variationImages.filter(vi => 
          !galleryImages.some(gi => gi.sourceUrl === vi.sourceUrl) && 
          vi.sourceUrl !== product.image?.sourceUrl
        )]
      : [...galleryImages, ...variationImages];
    
    return images;
  }, [product.image, product.galleryImages, variations]);

  // Update main image when variation changes - only if user hasn't manually selected
  const [manualImageSelect, setManualImageSelect] = useState(false);
  
  useEffect(() => {
    if (selectedVariation?.image?.src && !manualImageSelect) {
      const variationImageIndex = allImages.findIndex(
        img => img.sourceUrl === selectedVariation.image.src
      );
      if (variationImageIndex !== -1) {
        setSelectedImage(variationImageIndex);
      }
    }
  }, [selectedVariation, allImages, manualImageSelect]);

  // Reset manual select when attributes change
  useEffect(() => {
    setManualImageSelect(false);
  }, [selectedAttributes]);

  // Handle thumbnail click
  const handleThumbnailClick = (index: number) => {
    setSelectedImage(index);
    setManualImageSelect(true);
  };

  const handleAddToCart = () => {
    const variationName = Object.entries(selectedAttributes)
      .map(([key, value]) => `${key}: ${value}`)
      .join(' / ');
    
    // Use admin price if set, otherwise use regular price
    const finalPrice = adminPrice !== null ? `${adminPrice} ₪` : currentPrice;
    
    addItem({
      id: product.id,
      databaseId: product.databaseId,
      name: product.name,
      slug: product.slug,
      price: finalPrice,
      image: selectedVariation?.image 
        ? { sourceUrl: selectedVariation.image.src, altText: selectedVariation.image.alt }
        : product.image,
      variation: selectedVariation ? {
        id: selectedVariation.id,
        name: variationName || 'ללא וריאציה',
        attributes: Object.entries(selectedAttributes).map(([name, value]) => ({ name, value })),
      } : undefined,
      // Include admin fields data if present
      adminFields: adminFieldsData ? {
        width: adminFieldsData.width,
        depth: adminFieldsData.depth,
        height: adminFieldsData.height,
        additionalFee: adminFieldsData.additionalFee,
        additionalFeeReason: adminFieldsData.additionalFeeReason,
        discountType: adminFieldsData.discountType,
        discountValue: adminFieldsData.discountValue,
        freeComments: adminFieldsData.freeComments,
        uploadedFile: adminFieldsData.uploadedFile,
        uploadedFileName: adminFieldsData.uploadedFileName,
        originalPrice: currentPrice,
        finalPrice: finalPrice,
      } : undefined,
    }, quantity);
  };

  const hasDiscount = (selectedVariation?.on_sale || product.onSale) && currentRegularPrice;
  const discountPercentage = hasDiscount && currentRegularPrice
    ? Math.round(
        ((parseFloat(currentRegularPrice.replace(/[^\d.]/g, '')) -
          parseFloat(currentPrice.replace(/[^\d.]/g, ''))) /
          parseFloat(currentRegularPrice.replace(/[^\d.]/g, ''))) *
          100
      )
    : 0;

  const [activeTab, setActiveTab] = useState<'description' | 'specs'>('description');

  return (
    <div className="bg-white">
      {/* Breadcrumb */}
      <div className="border-b">
        <div className="container mx-auto px-4 py-3">
          <nav className="text-xs text-gray-500 flex items-center gap-1.5">
            <Link href="/" className="hover:text-black">דף הבית</Link>
            <span>/</span>
            <Link href="/categories" className="hover:text-black">קטגוריות</Link>
            <span>/</span>
            <span className="text-gray-900">{product.name}</span>
          </nav>
        </div>
      </div>

      {/* Main Product Section */}
      <div className="container mx-auto px-4 py-4 md:py-6 lg:py-10">
        <div className="flex flex-col lg:grid lg:grid-cols-2 gap-6 md:gap-8 lg:gap-16">
          
          {/* Image Gallery */}
          <div>
            {/* Main Image - Square, no background, rounded corners */}
            <div className="relative aspect-square rounded-2xl overflow-hidden mb-3 md:mb-4">
              {allImages[selectedImage]?.sourceUrl && (
                <Image
                  src={allImages[selectedImage].sourceUrl}
                  alt={allImages[selectedImage].altText || product.name}
                  fill
                  className="object-contain"
                  priority
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              )}
              {hasDiscount && discountPercentage > 0 && (
                <span className="absolute top-3 right-3 bg-red-500 text-white text-xs px-2 py-1 rounded">
                  -{discountPercentage}%
                </span>
              )}
            </div>

            {/* Thumbnails Slider */}
            {allImages.length > 1 && (
              <div className="relative group">
                {/* Right Arrow - scrolls right (shows more from right side) */}
                <button
                  onClick={() => {
                    if (thumbnailsRef.current) {
                      thumbnailsRef.current.scrollBy({ left: 200, behavior: 'smooth' });
                    }
                  }}
                  className="absolute -right-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white hover:bg-gray-100 rounded-full shadow-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                
                {/* Left Arrow - scrolls left (shows more from left side) */}
                <button
                  onClick={() => {
                    if (thumbnailsRef.current) {
                      thumbnailsRef.current.scrollBy({ left: -200, behavior: 'smooth' });
                    }
                  }}
                  className="absolute -left-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white hover:bg-gray-100 rounded-full shadow-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {/* Thumbnails Container - touch friendly */}
                <div 
                  ref={thumbnailsRef}
                  className="flex flex-row-reverse gap-2 overflow-x-auto scrollbar-hide px-2 py-2 scroll-smooth touch-pan-x"
                  style={{ 
                    scrollbarWidth: 'none', 
                    msOverflowStyle: 'none',
                    WebkitOverflowScrolling: 'touch'
                  }}
                >
                  {allImages.map((img, index) => (
                    <button
                      key={`thumb-${index}-${img.sourceUrl}`}
                      type="button"
                      onClick={() => handleThumbnailClick(index)}
                      className={`relative aspect-square w-16 md:w-20 flex-shrink-0 rounded-xl overflow-hidden transition-all cursor-pointer ${
                        selectedImage === index 
                          ? 'ring-2 ring-black ring-offset-1' 
                          : 'hover:ring-2 hover:ring-gray-300 hover:ring-offset-1'
                      }`}
                    >
                      {img.sourceUrl && (
                        <Image
                          src={img.sourceUrl}
                          alt={img.altText || `תמונה ${index + 1}`}
                          fill
                          className="object-contain pointer-events-none"
                          sizes="80px"
                          draggable={false}
                        />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Product Info */}
          <div>
            {/* Title */}
            <h1 className="text-lg md:text-xl lg:text-2xl font-medium text-gray-900 mb-1 md:mb-2">
              {product.name}
            </h1>
            
            <p className="text-xs text-gray-400 mb-3 md:mb-4">מק״ט: {product.databaseId}</p>

            {/* Price */}
            <div className="flex items-baseline gap-2 mb-3 md:mb-4">
              <span className="text-xl md:text-2xl font-semibold">{currentPrice}</span>
              {hasDiscount && currentRegularPrice && (
                <span className="text-sm text-gray-400 line-through">{currentRegularPrice}</span>
              )}
            </div>

            {/* Short Description */}
            <HtmlContent 
              html={product.shortDescription || ''}
              className="text-sm text-gray-600 leading-relaxed mb-4 md:mb-6 hidden md:block"
            />

            {/* Variations */}
            <div className="space-y-4 md:space-y-5 mb-4 md:mb-6">
              {attributes.map((attr) => {
                const isColor = isColorAttribute(attr.name);
                
                return (
                  <div key={attr.name}>
                    <label className="block text-xs font-medium text-gray-700 mb-2">
                      {attr.name}: {selectedAttributes[attr.name] || ''}
                    </label>
                    
                    {isColor ? (
                      <div className="flex flex-wrap gap-2">
                        {attr.options.map((option) => (
                          <button
                            key={option}
                            onClick={() => setSelectedAttributes(prev => ({ ...prev, [attr.name]: option }))}
                            className={`w-8 h-8 rounded-full transition ${
                              selectedAttributes[attr.name] === option
                                ? 'ring-2 ring-offset-1 ring-black'
                                : 'ring-1 ring-gray-300 hover:ring-gray-400'
                            }`}
                            style={getColorStyle(option)}
                            title={option}
                          />
                        ))}
                      </div>
                    ) : (
                      <select
                        value={selectedAttributes[attr.name] || ''}
                        onChange={(e) => setSelectedAttributes(prev => ({ ...prev, [attr.name]: e.target.value }))}
                        className="w-full max-w-xs text-sm border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-black"
                      >
                        {attr.options.map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Admin Fields - Only visible to admins/sales reps */}
            <AdminProductFields
              basePrice={parseFloat(product.price?.replace(/[^\d.]/g, '') || '0')}
              variationPrice={selectedVariation ? parseFloat(selectedVariation.price || '0') : undefined}
              onPriceChange={(newPrice, data) => {
                setAdminPrice(newPrice);
                setAdminFieldsData(data);
              }}
            />

            {/* Add to Cart */}
            <div className="flex items-center gap-2 md:gap-3 mb-4 md:mb-6">
              {/* Quantity */}
              <div className="flex items-center border border-gray-300 rounded">
                <button
                  className="w-8 h-8 md:w-9 md:h-9 flex items-center justify-center text-gray-500 hover:text-black"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                >
                  <Minus className="w-3 h-3 md:w-3.5 md:h-3.5" />
                </button>
                <span className="w-8 md:w-10 text-center text-sm">{quantity}</span>
                <button
                  className="w-8 h-8 md:w-9 md:h-9 flex items-center justify-center text-gray-500 hover:text-black"
                  onClick={() => setQuantity(quantity + 1)}
                >
                  <Plus className="w-3 h-3 md:w-3.5 md:h-3.5" />
                </button>
              </div>

              {/* Add to Cart Button */}
              <Button 
                className="flex-1 h-10 md:h-9 text-sm bg-black hover:bg-gray-800"
                onClick={handleAddToCart}
              >
                הוספה לסל
              </Button>

              {/* Wishlist */}
              <button 
                className={`w-10 h-10 md:w-9 md:h-9 flex items-center justify-center border rounded transition-colors ${
                  isWishlisted 
                    ? 'border-red-500 bg-red-50' 
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                onClick={() => toggleItem(wishlistItem)}
              >
                <Heart className={`w-4 h-4 transition-colors ${
                  isWishlisted 
                    ? 'fill-red-500 text-red-500' 
                    : 'text-gray-500'
                }`} />
              </button>
            </div>

            {/* Info badges */}
            <div className="flex flex-wrap items-center gap-4 md:gap-6 text-xs text-gray-500 py-3 md:py-4 border-t border-gray-100">
              <div className="flex items-center gap-1.5">
                <Truck className="w-4 h-4" />
                <span>משלוח חינם</span>
              </div>
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" />
                <span>אחריות שנה</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CreditCard className="w-4 h-4" />
                <span>עד 12 תשלומים</span>
              </div>
            </div>

            {/* FAQ Section - Below info badges */}
            {faqs && faqs.length > 0 && (
              <div className="pt-4 border-t border-gray-100">
                <div className="space-y-2">
                  {faqs.map((faq, index) => (
                    <div 
                      key={index}
                      className="border border-gray-200 rounded-lg overflow-hidden"
                    >
                      <button
                        className="w-full flex items-center justify-between p-3 text-right hover:bg-gray-50 transition-colors"
                        onClick={() => setOpenFaq(openFaq === index ? null : index)}
                      >
                        <span className="font-medium text-sm">{faq.question}</span>
                        <ChevronDown 
                          className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${
                            openFaq === index ? 'rotate-180' : ''
                          }`}
                        />
                      </button>
                      
                      {openFaq === index && (
                        <div className="px-3 pb-3 text-sm text-gray-600 leading-relaxed border-t border-gray-100 pt-3">
                          {faq.answer}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-8 md:mt-12 border-t pt-6 md:pt-8">
          <div className={`flex flex-col-reverse ${video ? 'lg:flex-row lg:gap-8' : ''}`}>
            {/* Video Section - Left side on desktop */}
            {video && (
              <div className="lg:w-1/3 mt-6 lg:mt-0">
                <h3 className="text-sm font-medium text-gray-900 mb-3">סרטון המוצר</h3>
                <ProductVideo video={video} productName={product.name} />
              </div>
            )}

            {/* Description/Specs Section */}
            <div className={`${video ? 'lg:w-2/3' : 'w-full'}`}>
              <div className="flex gap-4 md:gap-6 border-b mb-4 md:mb-6">
                <button 
                  onClick={() => setActiveTab('description')}
                  className={`pb-3 text-sm transition ${
                    activeTab === 'description' 
                      ? 'text-black border-b-2 border-black font-medium' 
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  תיאור המוצר
                </button>
                <button 
                  onClick={() => setActiveTab('specs')}
                  className={`pb-3 text-sm transition ${
                    activeTab === 'specs' 
                      ? 'text-black border-b-2 border-black font-medium' 
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  מפרט טכני
                </button>
              </div>
              
              <div className="max-w-3xl">
                {activeTab === 'description' ? (
                  <HtmlContent 
                    html={product.description || ''}
                    className="text-sm text-gray-600 leading-relaxed"
                  />
                ) : (
                  <div className="text-sm">
                    <table className="w-full">
                      <tbody>
                        {attributes.map(attr => (
                          <tr key={attr.name} className="border-b border-gray-100">
                            <td className="py-2.5 text-gray-500 w-1/3">{attr.name}</td>
                            <td className="py-2.5">{selectedAttributes[attr.name] || attr.options[0]}</td>
                          </tr>
                        ))}
                        <tr className="border-b border-gray-100">
                          <td className="py-2.5 text-gray-500">ייצור</td>
                          <td className="py-2.5">ישראל</td>
                        </tr>
                        <tr className="border-b border-gray-100">
                          <td className="py-2.5 text-gray-500">אחריות</td>
                          <td className="py-2.5">שנה</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
// Force deploy
