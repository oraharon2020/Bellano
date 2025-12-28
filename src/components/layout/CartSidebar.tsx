'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Minus, Plus, Trash2, ShoppingBag, X, FileText, Ruler, Tag, Loader2, Sparkles, ChevronDown } from 'lucide-react';
import { useCartStore } from '@/lib/store/cart';

interface AppliedCoupon {
  code: string;
  discount: number;
  discountDisplay: string;
  discount_type: string;
}

export function CartSidebar() {
  const { items, isOpen, closeCart, updateQuantity, removeItem, getTotal, isHydrated } = useCartStore();
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const [couponError, setCouponError] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [showCouponInput, setShowCouponInput] = useState(false);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS',
      minimumFractionDigits: 0,
    }).format(price);
  };

  // Calculate bundle savings
  const bundleSavings = items.reduce((total, item) => {
    if (item.bundleDiscount && item.originalPrice) {
      const originalNum = parseInt(item.originalPrice.replace(/[^\d]/g, '')) || 0;
      const currentNum = parseInt(item.price.replace(/[^\d]/g, '')) || 0;
      return total + (originalNum - currentNum) * item.quantity;
    }
    return total;
  }, 0);

  const subtotal = getTotal();
  const discount = appliedCoupon?.discount || 0;
  const finalTotal = Math.max(0, subtotal - discount);

  const validateCoupon = async () => {
    if (!couponCode.trim()) {
      setCouponError('נא להזין קוד קופון');
      return;
    }

    setIsValidating(true);
    setCouponError('');

    try {
      const response = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: couponCode.trim(),
          cart_total: subtotal,
          product_ids: items.map(item => item.databaseId),
        }),
      });

      const data = await response.json();

      if (data.success) {
        setAppliedCoupon({
          code: data.coupon.code,
          discount: data.discount,
          discountDisplay: data.discountDisplay,
          discount_type: data.coupon.discount_type,
        });
        setCouponCode('');
        setCouponError('');
      } else {
        setCouponError(data.message);
      }
    } catch (error) {
      setCouponError('שגיאה באימות הקופון');
    } finally {
      setIsValidating(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponError('');
  };

  if (!isHydrated || !isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/50 z-40 transition-opacity"
        onClick={closeCart}
      />
      
      {/* Sidebar */}
      <div className="fixed top-0 left-0 h-full w-full sm:max-w-md bg-white z-50 shadow-xl flex flex-col animate-in slide-in-from-left duration-300">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b shrink-0">
          <button 
            onClick={closeCart}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors active:scale-95"
            aria-label="סגור עגלת קניות"
          >
            <X className="w-5 h-5" />
          </button>
          <h2 className="font-bold text-lg">סל הקניות ({items.length})</h2>
        </div>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center">
              <ShoppingBag className="w-10 h-10 text-gray-400" />
            </div>
            <p className="text-gray-500 text-center">הסל שלך ריק</p>
            <button 
              onClick={closeCart}
              className="px-6 py-3 bg-black text-white rounded-md hover:bg-gray-800 transition-colors active:scale-95"
            >
              המשך לקנות
            </button>
          </div>
        ) : (
          <>
            {/* Cart Items */}
            <div className="flex-1 overflow-auto p-3 sm:p-4 space-y-3">
              {items.map((item) => (
                <div 
                  key={item.id + (item.variation?.id || '')} 
                  className="flex gap-3 p-3 bg-gray-50 rounded-lg"
                >
                  {/* Product Image */}
                  <div className="relative w-20 h-20 sm:w-24 sm:h-24 bg-white rounded-md overflow-hidden flex-shrink-0 border border-gray-200">
                    {item.image?.sourceUrl ? (
                      <Image
                        src={item.image.sourceUrl}
                        alt={item.image.altText || item.name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ShoppingBag className="w-8 h-8 text-gray-300" />
                      </div>
                    )}
                  </div>

                  {/* Product Details */}
                  <div className="flex-1 min-w-0 flex flex-col">
                    <div className="flex justify-between items-start gap-2">
                      <h4 className="font-medium text-sm leading-tight line-clamp-2">{item.name}</h4>
                      <button
                        onClick={() => removeItem(item.id, item.variation?.id)}
                        className="p-1.5 hover:bg-gray-200 rounded transition-colors flex-shrink-0 active:scale-95"
                        aria-label={`הסר ${item.name} מהעגלה`}
                      >
                        <Trash2 className="h-4 w-4 text-gray-400 hover:text-red-500" />
                      </button>
                    </div>
                    
                    {item.variation && (
                      <p className="text-xs text-gray-500 mt-1">
                        {item.variation.attributes.map((attr) => attr.value).join(' • ')}
                      </p>
                    )}
                    
                    {/* Bundle Discount Badge */}
                    {item.bundleDiscount && item.bundleDiscount > 0 && (
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 text-[10px] font-semibold px-1.5 py-0.5 rounded">
                          <Sparkles className="w-3 h-3" />
                          {item.bundleDiscount}% הנחת באנדל
                        </span>
                        {item.originalPrice && (
                          <span className="text-[10px] text-gray-400 line-through">{item.originalPrice}</span>
                        )}
                      </div>
                    )}
                    
                    {/* Tambour Color - show separately above admin fields */}
                    {item.adminFields?.tambourColor && (
                      <p className="text-xs text-gray-600 mt-1">
                        צבע טמבור: {item.adminFields.tambourColor}
                        {item.adminFields.tambourPrice && (
                          <span className="text-gray-400"> (+{item.adminFields.tambourPrice}₪)</span>
                        )}
                      </p>
                    )}
                    
                    {/* Admin Fields Display - only show if there's actual content */}
                    {item.adminFields && (
                      item.adminFields.width || 
                      item.adminFields.depth || 
                      item.adminFields.height || 
                      item.adminFields.freeComments || 
                      item.adminFields.uploadedFile
                    ) && (
                      <div className="mt-2 text-xs space-y-1 bg-blue-50 p-2 rounded">
                        {/* Dimensions */}
                        {(item.adminFields.width || item.adminFields.depth || item.adminFields.height) && (
                          <div className="flex items-center gap-1 text-blue-700">
                            <Ruler className="w-3 h-3" />
                            <span>
                              {[
                                item.adminFields.width && `ר: ${item.adminFields.width}`,
                                item.adminFields.depth && `ע: ${item.adminFields.depth}`,
                                item.adminFields.height && `ג: ${item.adminFields.height}`
                              ].filter(Boolean).join(' / ')}
                            </span>
                          </div>
                        )}
                        {/* Comments */}
                        {item.adminFields.freeComments && (
                          <p className="text-blue-600">📝 {item.adminFields.freeComments}</p>
                        )}
                        {/* Uploaded File */}
                        {item.adminFields.uploadedFile && (
                          <a 
                            href={item.adminFields.uploadedFile} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-blue-600 hover:underline"
                          >
                            <FileText className="w-3 h-3" />
                            {item.adminFields.uploadedFileName || 'צפה בשרטוט'}
                          </a>
                        )}
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between mt-auto pt-2">
                      {/* Quantity Controls */}
                      <div className="flex items-center border border-gray-300 rounded-md" role="group" aria-label="כמות">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1, item.variation?.id)}
                          className="w-11 h-11 flex items-center justify-center hover:bg-gray-100 transition-colors active:bg-gray-200"
                          aria-label="הפחת כמות"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="w-8 text-center text-sm font-medium" aria-live="polite">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1, item.variation?.id)}
                          className="w-11 h-11 flex items-center justify-center hover:bg-gray-100 transition-colors active:bg-gray-200"
                          aria-label="הוסף כמות"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                      
                      <span className="font-bold text-sm">{item.price}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Cart Footer - Compact */}
            <div className="border-t px-3 py-2 space-y-1.5 bg-white shrink-0 pb-safe">
              {/* Coupon Section - Collapsible */}
              {!appliedCoupon ? (
                <div>
                  <button
                    onClick={() => setShowCouponInput(!showCouponInput)}
                    className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors py-1"
                  >
                    <Tag className="w-3 h-3" />
                    <span>יש לך קוד קופון?</span>
                    <ChevronDown className={`w-3 h-3 transition-transform ${showCouponInput ? 'rotate-180' : ''}`} />
                  </button>
                  {showCouponInput && (
                    <div className="flex gap-1.5 mt-1">
                      <input
                        type="text"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value)}
                        placeholder="הזן קוד"
                        className="flex-1 px-2 py-1.5 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-black"
                        onKeyDown={(e) => e.key === 'Enter' && validateCoupon()}
                      />
                      <button
                        onClick={validateCoupon}
                        disabled={isValidating}
                        className="px-3 py-1.5 bg-gray-100 text-xs font-medium rounded hover:bg-gray-200 transition-colors disabled:opacity-50"
                      >
                        {isValidating ? <Loader2 className="w-3 h-3 animate-spin" /> : 'החל'}
                      </button>
                    </div>
                  )}
                  {couponError && <p className="text-red-500 text-[10px] mt-0.5">{couponError}</p>}
                </div>
              ) : (
                <div className="flex items-center justify-between bg-green-50 px-2 py-1.5 rounded text-xs">
                  <div className="flex items-center gap-1.5">
                    <Tag className="w-3 h-3 text-green-600" />
                    <span className="text-green-700">{appliedCoupon.code} ({appliedCoupon.discountDisplay})</span>
                  </div>
                  <button onClick={removeCoupon} className="text-red-500 hover:text-red-600 text-[10px]">הסר</button>
                </div>
              )}

              {/* Price Summary - Compact */}
              <div className="space-y-0.5 text-xs">
                {bundleSavings > 0 && (
                  <>
                    <div className="flex justify-between text-gray-400">
                      <span>מחיר מלא</span>
                      <span className="line-through">{formatPrice(subtotal + bundleSavings)}</span>
                    </div>
                    <div className="flex justify-between text-amber-600">
                      <span className="flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        הנחת באנדל
                      </span>
                      <span>-{formatPrice(bundleSavings)}</span>
                    </div>
                  </>
                )}
                
                {appliedCoupon && (
                  <div className="flex justify-between text-green-600">
                    <span>הנחת קופון</span>
                    <span>-{formatPrice(discount)}</span>
                  </div>
                )}
              </div>

              {/* Total + Shipping */}
              <div className="flex justify-between items-center pt-1.5 border-t">
                <div>
                  <span className="font-bold text-sm">{formatPrice(finalTotal)}</span>
                  <span className="text-[10px] text-green-600 mr-1.5">+ משלוח חינם 🚚</span>
                </div>
              </div>
              
              {/* Buttons - Stacked */}
              <div className="space-y-2 pt-1">
                <Link 
                  href={`/checkout${appliedCoupon ? `?coupon=${appliedCoupon.code}` : ''}`}
                  onClick={closeCart}
                  className="block w-full py-3 bg-black text-white text-center text-sm font-medium rounded-md hover:bg-gray-800 transition-colors active:scale-[0.98]"
                >
                  לתשלום
                </Link>
                <button 
                  onClick={closeCart}
                  className="w-full py-2.5 border border-gray-300 text-center text-sm font-medium rounded-md hover:bg-gray-50 transition-colors active:scale-[0.98]"
                >
                  המשך לקנות
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
