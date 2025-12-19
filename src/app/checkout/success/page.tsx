'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { CheckCircle, Loader2, ArrowRight, Package, Truck, Phone, Mail, ShoppingBag } from 'lucide-react';
import { siteConfig, getWhatsAppLink } from '@/config/site';

interface OrderItem {
  name: string;
  quantity: number;
  price: string;
  image?: string;
}

interface OrderData {
  id: string;
  status: string;
  total: string;
  currency: string;
  items: OrderItem[];
  billing: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
  };
}

function SuccessContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('order_id');
  const orderType = searchParams.get('type'); // 'phone_order' for phone orders
  const isPhoneOrder = orderType === 'phone_order';
  const [orderStatus, setOrderStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [orderData, setOrderData] = useState<OrderData | null>(null);
  const [trackingFired, setTrackingFired] = useState(false);

  // Fire tracking events
  useEffect(() => {
    if (orderStatus === 'success' && orderData && !trackingFired) {
      setTrackingFired(true);
      
      const totalValue = parseFloat(orderData.total) || 0;
      const eventType = isPhoneOrder ? 'Lead' : 'Purchase'; // Phone orders are leads until paid
      
      // Facebook Pixel - Purchase or Lead Event
      if (typeof window !== 'undefined' && (window as any).fbq) {
        (window as any).fbq('track', eventType, {
          value: totalValue,
          currency: 'ILS',
          content_type: 'product',
          content_ids: orderData.items.map((_, i) => `item_${i}`),
          num_items: orderData.items.reduce((sum, item) => sum + item.quantity, 0),
          order_id: orderData.id,
        });
        console.log(`Facebook ${eventType} event fired:`, totalValue);
      }

      // Google Ads - Conversion (for both - phone orders are still valuable leads)
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', 'conversion', {
          send_to: `${siteConfig.analytics.googleAds}/${isPhoneOrder ? 'lead' : 'purchase'}`,
          value: totalValue,
          currency: 'ILS',
          transaction_id: orderData.id,
        });
        console.log('Google Ads conversion fired:', totalValue, isPhoneOrder ? '(lead)' : '(purchase)');
      }

      // Google Analytics 4 - Purchase or generate_lead
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', isPhoneOrder ? 'generate_lead' : 'purchase', {
          transaction_id: orderData.id,
          value: totalValue,
          currency: 'ILS',
          items: orderData.items.map((item, index) => ({
            item_id: `item_${index}`,
            item_name: item.name,
            quantity: item.quantity,
            price: parseFloat(item.price.replace(/[^\d.]/g, '')) || 0,
          })),
        });
        console.log(`GA4 ${isPhoneOrder ? 'generate_lead' : 'purchase'} event fired:`, totalValue);
      }
    }
  }, [orderStatus, orderData, trackingFired]);

  useEffect(() => {
    // Clear cart from localStorage
    localStorage.removeItem('cart-storage');
    
    // Verify order status and get order data
    const checkOrder = async () => {
      if (!orderId) {
        setOrderStatus('error');
        return;
      }

      try {
        const response = await fetch(`/api/checkout/order-status?order_id=${orderId}&include_details=true`);
        const data = await response.json();
        
        if (data.success && (data.status === 'processing' || data.status === 'completed' || data.status === 'on-hold')) {
          setOrderStatus('success');
          if (data.order) {
            setOrderData(data.order);
          }
        } else {
          // Wait a bit and check again - payment might still be processing
          setTimeout(async () => {
            const retryResponse = await fetch(`/api/checkout/order-status?order_id=${orderId}&include_details=true`);
            const retryData = await retryResponse.json();
            setOrderStatus('success'); // Show success anyway - webhook might be delayed
            if (retryData.order) {
              setOrderData(retryData.order);
            }
          }, 2000);
        }
      } catch {
        setOrderStatus('success'); // Show success - we got here from payment page
      }
    };

    checkOrder();
  }, [orderId]);

  if (orderStatus === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-16 h-16 animate-spin text-green-500 mx-auto mb-4" />
          <p className="text-gray-600 text-lg">מאמת את התשלום...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white">
      {/* Confetti Effect */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute animate-confetti"
            style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${3 + Math.random() * 2}s`,
            }}
          >
            <div
              className="w-3 h-3 rounded-sm"
              style={{
                backgroundColor: ['#10B981', '#3B82F6', '#F59E0B', '#EC4899', '#8B5CF6'][Math.floor(Math.random() * 5)],
                transform: `rotate(${Math.random() * 360}deg)`,
              }}
            />
          </div>
        ))}
      </div>

      <div className="container mx-auto px-4 py-8 md:py-16 relative">
        <div className="max-w-2xl mx-auto">
          {/* Success Header */}
          <div className="text-center mb-8">
            {/* Animated Success Icon */}
            <div className="relative w-32 h-32 mx-auto mb-6">
              <div className={`absolute inset-0 ${isPhoneOrder ? 'bg-blue-200' : 'bg-green-200'} rounded-full animate-ping opacity-20`} />
              <div className={`absolute inset-0 ${isPhoneOrder ? 'bg-blue-100' : 'bg-green-100'} rounded-full flex items-center justify-center`}>
                {isPhoneOrder ? (
                  <Phone className="w-16 h-16 text-blue-600" />
                ) : (
                  <CheckCircle className="w-16 h-16 text-green-600" />
                )}
              </div>
            </div>

            <h1 className="text-3xl md:text-4xl font-bold mb-3 text-gray-900">
              {isPhoneOrder ? 'ההזמנה נשלחה בהצלחה! 📞' : 'ההזמנה בוצעה בהצלחה! 🎉'}
            </h1>
            <p className="text-lg text-gray-600">
              תודה שבחרת ב{siteConfig.name}!
            </p>
          </div>

          {/* Phone Order Notice */}
          {isPhoneOrder && (
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 mb-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Phone className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-bold text-blue-900 mb-2">נציג יצור איתך קשר בהקדם</h3>
                  <p className="text-blue-700 text-sm">
                    ההזמנה שלך נשמרה במערכת והיא ממתינה לתשלום. נציג שלנו יתקשר אליך בשעות הפעילות להשלמת התשלום בטלפון.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Order Number Card */}
          {orderId && (
            <div className={`bg-white rounded-2xl shadow-lg p-6 mb-6 border ${isPhoneOrder ? 'border-blue-100' : 'border-green-100'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 ${isPhoneOrder ? 'bg-blue-100' : 'bg-green-100'} rounded-full flex items-center justify-center`}>
                    <Package className={`w-6 h-6 ${isPhoneOrder ? 'text-blue-600' : 'text-green-600'}`} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">מספר הזמנה</p>
                    <p className="text-2xl font-bold text-gray-900">{orderId}</p>
                  </div>
                </div>
                {orderData && (
                  <div className="text-left">
                    <p className="text-sm text-gray-500">{isPhoneOrder ? 'סה״כ לתשלום' : 'סה״כ שולם'}</p>
                    <p className="text-2xl font-bold text-green-600">₪{parseFloat(orderData.total).toLocaleString()}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Order Items */}
          {orderData && orderData.items.length > 0 && (
            <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 border border-gray-100">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                <ShoppingBag className="w-5 h-5" />
                המוצרים שלך
              </h3>
              <div className="space-y-4">
                {orderData.items.map((item, index) => (
                  <div key={index} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                    {item.image && (
                      <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                        <Image
                          src={item.image}
                          alt={item.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{item.name}</p>
                      <p className="text-sm text-gray-500">כמות: {item.quantity}</p>
                    </div>
                    <p className="font-bold text-gray-900">{item.price}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Timeline / What's Next */}
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 border border-gray-100">
            <h3 className="font-bold text-lg mb-6">מה קורה עכשיו?</h3>
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute right-[23px] top-0 bottom-0 w-0.5 bg-gray-200" />
              
              <div className="space-y-6">
                {/* Step 1 - Different for phone orders */}
                {isPhoneOrder ? (
                  <div className="flex gap-4 relative">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center z-10 flex-shrink-0">
                      <Phone className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="pt-2">
                      <p className="font-semibold text-gray-900">נציג יתקשר אליך</p>
                      <p className="text-sm text-gray-500">נציג {siteConfig.name} יצור איתך קשר להשלמת התשלום בטלפון</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-4 relative">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center z-10 flex-shrink-0">
                      <Mail className="w-5 h-5 text-green-600" />
                    </div>
                    <div className="pt-2">
                      <p className="font-semibold text-gray-900">אישור נשלח במייל</p>
                      <p className="text-sm text-gray-500">קיבלת אימייל עם פרטי ההזמנה המלאים</p>
                    </div>
                  </div>
                )}

                {/* Step 2 */}
                <div className="flex gap-4 relative">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center z-10 flex-shrink-0">
                    {isPhoneOrder ? <Mail className="w-5 h-5 text-blue-600" /> : <Phone className="w-5 h-5 text-blue-600" />}
                  </div>
                  <div className="pt-2">
                    <p className="font-semibold text-gray-900">{isPhoneOrder ? 'תקבל אישור במייל' : 'ניצור איתך קשר'}</p>
                    <p className="text-sm text-gray-500">
                      {isPhoneOrder 
                        ? 'לאחר התשלום תקבל אימייל אישור עם פרטי ההזמנה' 
                        : `צוות ${siteConfig.name} יתאם איתך את פרטי המשלוח`}
                    </p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex gap-4 relative">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center z-10 flex-shrink-0">
                    <Truck className="w-5 h-5 text-purple-600" />
                  </div>
                  <div className="pt-2">
                    <p className="font-semibold text-gray-900">משלוח עד הבית</p>
                    <p className="text-sm text-gray-500">הריהוט יגיע אליך מורכב ומוכן לשימוש</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 mb-8">
            <Link 
              href="/"
              className="flex-1 inline-flex items-center justify-center gap-2 px-8 py-4 bg-black text-white rounded-xl font-medium hover:bg-gray-800 transition-colors"
            >
              המשך לקנות
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link 
              href="/categories"
              className="flex-1 inline-flex items-center justify-center gap-2 px-8 py-4 border-2 border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
            >
              צפה בקטלוג
            </Link>
          </div>

          {/* Contact Card */}
          <div className="bg-gray-900 text-white rounded-2xl p-6 text-center">
            <p className="mb-2">יש לך שאלות? אנחנו כאן בשבילך!</p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <a 
                href={`tel:${siteConfig.phone}`} 
                className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
              >
                <Phone className="w-4 h-4" />
                <span dir="ltr">{siteConfig.phone}</span>
              </a>
              <a 
                href={getWhatsAppLink()} 
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                וואטסאפ
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* CSS for confetti animation */}
      <style jsx>{`
        @keyframes confetti {
          0% {
            transform: translateY(-100vh) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
        .animate-confetti {
          animation: confetti 4s linear infinite;
        }
      `}</style>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex items-center justify-center">
        <Loader2 className="w-16 h-16 animate-spin text-green-500" />
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}
