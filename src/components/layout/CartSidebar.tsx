'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Minus, Plus, Trash2, ShoppingBag, X } from 'lucide-react';
import { useCartStore } from '@/lib/store/cart';

export function CartSidebar() {
  const { items, isOpen, closeCart, updateQuantity, removeItem, getTotal, isHydrated } = useCartStore();

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS',
      minimumFractionDigits: 0,
    }).format(price);
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
                      >
                        <Trash2 className="h-4 w-4 text-gray-400 hover:text-red-500" />
                      </button>
                    </div>
                    
                    {item.variation && (
                      <p className="text-xs text-gray-500 mt-1">
                        {item.variation.attributes.map((attr) => attr.value).join(' • ')}
                      </p>
                    )}
                    
                    <div className="flex items-center justify-between mt-auto pt-2">
                      {/* Quantity Controls */}
                      <div className="flex items-center border border-gray-300 rounded-md">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1, item.variation?.id)}
                          className="w-9 h-9 flex items-center justify-center hover:bg-gray-100 transition-colors active:bg-gray-200"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1, item.variation?.id)}
                          className="w-9 h-9 flex items-center justify-center hover:bg-gray-100 transition-colors active:bg-gray-200"
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

            {/* Cart Footer */}
            <div className="border-t p-4 space-y-3 bg-white shrink-0 pb-safe">
              {/* Subtotal */}
              <div className="flex justify-between items-center">
                <span className="text-gray-600">סה״כ ביניים</span>
                <span className="font-bold text-lg">{formatPrice(getTotal())}</span>
              </div>
              
              {/* Free shipping notice */}
              <div className="bg-green-50 text-green-700 text-sm p-2.5 rounded-md text-center">
                🚚 משלוח חינם לכל הארץ!
              </div>
              
              {/* Checkout Button - Link to Next.js checkout page */}
              <Link 
                href="/checkout"
                onClick={closeCart}
                className="block w-full py-3.5 bg-black text-white text-center font-medium rounded-md hover:bg-gray-800 transition-colors active:scale-[0.98]"
              >
                מעבר לתשלום
              </Link>
              
              {/* Continue Shopping */}
              <button 
                onClick={closeCart}
                className="w-full py-3 border border-gray-300 text-center font-medium rounded-md hover:bg-gray-50 transition-colors active:scale-[0.98]"
              >
                המשך לקנות
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
