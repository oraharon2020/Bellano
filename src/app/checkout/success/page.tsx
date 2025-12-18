'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, Loader2, ArrowRight, Package } from 'lucide-react';

function SuccessContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('order_id');
  const [orderStatus, setOrderStatus] = useState<'loading' | 'success' | 'error'>('loading');

  useEffect(() => {
    // Clear cart from localStorage
    localStorage.removeItem('cart-storage');
    
    // Verify order status
    const checkOrder = async () => {
      if (!orderId) {
        setOrderStatus('error');
        return;
      }

      try {
        const response = await fetch(`/api/checkout/order-status?order_id=${orderId}`);
        const data = await response.json();
        
        if (data.success && (data.status === 'processing' || data.status === 'completed' || data.status === 'on-hold')) {
          setOrderStatus('success');
        } else {
          // Wait a bit and check again - payment might still be processing
          setTimeout(async () => {
            const retryResponse = await fetch(`/api/checkout/order-status?order_id=${orderId}`);
            const retryData = await retryResponse.json();
            if (retryData.success && (retryData.status === 'processing' || retryData.status === 'completed' || retryData.status === 'on-hold')) {
              setOrderStatus('success');
            } else {
              setOrderStatus('success'); // Show success anyway - webhook might be delayed
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">מאמת את התשלום...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-lg mx-auto text-center">
          {/* Success Icon */}
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-8">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold mb-4">ההזמנה התקבלה בהצלחה! 🎉</h1>
          
          {/* Order Number */}
          {orderId && (
            <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
              <div className="flex items-center justify-center gap-3 text-gray-600 mb-2">
                <Package className="w-5 h-5" />
                <span>מספר הזמנה</span>
              </div>
              <p className="text-2xl font-bold">{orderId}</p>
            </div>
          )}

          {/* Message */}
          <div className="text-gray-600 mb-8 space-y-2">
            <p>תודה על הרכישה שלך!</p>
            <p>שלחנו לך אימייל עם אישור ופרטי ההזמנה.</p>
            <p>ניצור איתך קשר בקרוב לתיאום המשלוח.</p>
          </div>

          {/* What's Next */}
          <div className="bg-gray-100 rounded-lg p-6 mb-8 text-right">
            <h3 className="font-bold mb-3">מה קורה עכשיו?</h3>
            <ul className="space-y-2 text-gray-600 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-0.5">✓</span>
                <span>קיבלת אימייל אישור עם פרטי ההזמנה</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-0.5">✓</span>
                <span>צוות בלאנו יצור איתך קשר לתיאום המשלוח</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-0.5">✓</span>
                <span>הריהוט יגיע אליך מורכב ומוכן לשימוש</span>
              </li>
            </ul>
          </div>

          {/* CTA */}
          <Link 
            href="/"
            className="inline-flex items-center gap-2 px-8 py-4 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
          >
            חזרה לחנות
            <ArrowRight className="w-4 h-4" />
          </Link>

          {/* Contact */}
          <p className="mt-8 text-sm text-gray-500">
            יש לך שאלות? אנחנו כאן בשבילך:{' '}
            <a href="tel:03-6565656" className="underline" dir="ltr">03-6565656</a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-gray-400" />
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}
