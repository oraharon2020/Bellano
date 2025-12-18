'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Loader2, ShoppingBag, CreditCard, Truck, ShieldCheck, CheckCircle } from 'lucide-react';
import { useCartStore } from '@/lib/store/cart';

interface ShippingMethod {
  id: string;
  title: string;
  cost: number;
}

interface CustomerData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postcode: string;
  notes: string;
}

export default function CheckoutPage() {
  const { items, getTotal, clearCart, isHydrated } = useCartStore();
  const [step, setStep] = useState<'details' | 'payment' | 'success'>('details');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<number | null>(null);
  const [selectedPayments, setSelectedPayments] = useState(1);
  
  const [customerData, setCustomerData] = useState<CustomerData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    postcode: '',
    notes: '',
  });

  const [shippingMethods] = useState<ShippingMethod[]>([
    { id: 'free_shipping', title: 'משלוח חינם', cost: 0 },
  ]);
  const [selectedShipping, setSelectedShipping] = useState('free_shipping');

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const validateForm = (): boolean => {
    if (!customerData.firstName.trim()) {
      setError('נא להזין שם פרטי');
      return false;
    }
    if (!customerData.lastName.trim()) {
      setError('נא להזין שם משפחה');
      return false;
    }
    if (!customerData.email.trim() || !customerData.email.includes('@')) {
      setError('נא להזין כתובת אימייל תקינה');
      return false;
    }
    if (!customerData.phone.trim() || customerData.phone.length < 9) {
      setError('נא להזין מספר טלפון תקין');
      return false;
    }
    if (!customerData.address.trim()) {
      setError('נא להזין כתובת');
      return false;
    }
    if (!customerData.city.trim()) {
      setError('נא להזין עיר');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) return;
    if (items.length === 0) {
      setError('הסל ריק');
      return;
    }

    setIsLoading(true);

    try {
      // Step 1: Create order in WooCommerce
      const orderResponse = await fetch('/api/checkout/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer: customerData,
          items: items.map(item => ({
            product_id: item.databaseId,
            variation_id: item.variation?.id || 0,
            quantity: item.quantity,
          })),
          shipping_method: selectedShipping,
        }),
      });

      const orderData = await orderResponse.json();

      if (!orderData.success) {
        throw new Error(orderData.message || 'שגיאה ביצירת ההזמנה');
      }

      setOrderId(orderData.order_id);

      // Step 2: Get Meshulam payment URL
      const paymentResponse = await fetch('/api/checkout/create-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: orderData.order_id,
          amount: orderData.total,
          customer: customerData,
          payments: selectedPayments,
          items: items.map(item => ({
            name: item.name,
            price: parseFloat(item.price.replace(/[^\d.]/g, '')),
            quantity: item.quantity,
            sku: item.databaseId.toString(),
          })),
        }),
      });

      const paymentData = await paymentResponse.json();

      if (!paymentData.success) {
        throw new Error(paymentData.message || 'שגיאה ביצירת התשלום');
      }

      setPaymentUrl(paymentData.payment_url);
      setStep('payment');

    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה לא צפויה');
    } finally {
      setIsLoading(false);
    }
  };

  // Poll for order status when in payment step
  useEffect(() => {
    if (step !== 'payment' || !orderId) return;

    const checkOrderStatus = async () => {
      try {
        const response = await fetch(`/api/checkout/order-status?order_id=${orderId}`);
        const data = await response.json();
        
        if (data.status === 'processing' || data.status === 'completed') {
          clearCart();
          setStep('success');
        } else if (data.status === 'failed' || data.status === 'cancelled') {
          setError('התשלום נכשל. נא לנסות שוב.');
          setStep('details');
        }
      } catch (err) {
        console.error('Error checking order status:', err);
      }
    };

    const interval = setInterval(checkOrderStatus, 3000);
    return () => clearInterval(interval);
  }, [step, orderId, clearCart]);

  if (!isHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  // Success Step
  if (step === 'success') {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-md mx-auto text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold mb-4">ההזמנה התקבלה בהצלחה!</h1>
            <p className="text-gray-600 mb-2">תודה על הרכישה שלך</p>
            {orderId && (
              <p className="text-gray-600 mb-8">מספר הזמנה: <strong>{orderId}</strong></p>
            )}
            <p className="text-sm text-gray-500 mb-8">
              שלחנו לך אימייל עם פרטי ההזמנה. ניצור קשר בקרוב לתיאום המשלוח.
            </p>
            <Link 
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
            >
              חזרה לחנות
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Payment Step (iframe)
  if (step === 'payment' && paymentUrl) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold">תשלום מאובטח</h1>
              <div className="flex items-center gap-2 text-green-600">
                <ShieldCheck className="w-5 h-5" />
                <span className="text-sm">חיבור מאובטח SSL</span>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <iframe
                src={paymentUrl}
                className="w-full h-[600px] border-0"
                allow="payment"
                title="תשלום"
              />
            </div>

            <div className="mt-4 text-center">
              <button
                onClick={() => setStep('details')}
                className="text-gray-500 hover:text-gray-700 text-sm"
              >
                ← חזרה לפרטי ההזמנה
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Empty Cart
  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-md mx-auto text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <ShoppingBag className="w-10 h-10 text-gray-400" />
            </div>
            <h1 className="text-2xl font-bold mb-4">הסל שלך ריק</h1>
            <p className="text-gray-600 mb-8">הוסף מוצרים לסל כדי להמשיך לתשלום</p>
            <Link 
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
            >
              <ArrowRight className="w-4 h-4" />
              חזרה לחנות
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Details Step (Form)
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-8">השלמת הזמנה</h1>
        
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Customer Details */}
            <div className="lg:col-span-2 space-y-6">
              {/* Contact Info */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-bold mb-4">פרטי התקשרות</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">שם פרטי *</label>
                    <input
                      type="text"
                      value={customerData.firstName}
                      onChange={(e) => setCustomerData({ ...customerData, firstName: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">שם משפחה *</label>
                    <input
                      type="text"
                      value={customerData.lastName}
                      onChange={(e) => setCustomerData({ ...customerData, lastName: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">אימייל *</label>
                    <input
                      type="email"
                      value={customerData.email}
                      onChange={(e) => setCustomerData({ ...customerData, email: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">טלפון *</label>
                    <input
                      type="tel"
                      value={customerData.phone}
                      onChange={(e) => setCustomerData({ ...customerData, phone: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                      dir="ltr"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Shipping Address */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-bold mb-4">כתובת למשלוח</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">כתובת (רחוב ומספר) *</label>
                    <input
                      type="text"
                      value={customerData.address}
                      onChange={(e) => setCustomerData({ ...customerData, address: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">עיר *</label>
                      <input
                        type="text"
                        value={customerData.city}
                        onChange={(e) => setCustomerData({ ...customerData, city: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">מיקוד</label>
                      <input
                        type="text"
                        value={customerData.postcode}
                        onChange={(e) => setCustomerData({ ...customerData, postcode: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">הערות להזמנה</label>
                    <textarea
                      value={customerData.notes}
                      onChange={(e) => setCustomerData({ ...customerData, notes: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                      rows={3}
                      placeholder="הוראות מיוחדות למשלוח, קומה, קוד כניסה..."
                    />
                  </div>
                </div>
              </div>

              {/* Shipping Method */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-bold mb-4">אופן משלוח</h2>
                <div className="space-y-3">
                  {shippingMethods.map((method) => (
                    <label
                      key={method.id}
                      className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-colors ${
                        selectedShipping === method.id
                          ? 'border-black bg-gray-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="shipping"
                          value={method.id}
                          checked={selectedShipping === method.id}
                          onChange={(e) => setSelectedShipping(e.target.value)}
                          className="w-4 h-4"
                        />
                        <Truck className="w-5 h-5 text-gray-500" />
                        <span>{method.title}</span>
                      </div>
                      <span className={method.cost === 0 ? 'text-green-600 font-medium' : ''}>
                        {method.cost === 0 ? 'חינם!' : formatPrice(method.cost)}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Payment Options */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-bold mb-4">מספר תשלומים</h2>
                <div className="flex flex-wrap gap-2">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setSelectedPayments(num)}
                      className={`px-4 py-2 border rounded-lg transition-colors ${
                        selectedPayments === num
                          ? 'border-black bg-black text-white'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {num === 1 ? 'תשלום אחד' : `${num} תשלומים`}
                    </button>
                  ))}
                </div>
                {selectedPayments > 1 && (
                  <p className="mt-3 text-sm text-gray-500">
                    {selectedPayments} תשלומים של {formatPrice(getTotal() / selectedPayments)}
                  </p>
                )}
              </div>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-sm p-6 sticky top-24">
                <h2 className="text-lg font-bold mb-4">סיכום הזמנה</h2>
                
                {/* Cart Items */}
                <div className="space-y-3 mb-4 max-h-64 overflow-auto">
                  {items.map((item) => (
                    <div key={item.id + (item.variation?.id || '')} className="flex gap-3">
                      <div className="relative w-16 h-16 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                        {item.image?.sourceUrl ? (
                          <Image
                            src={item.image.sourceUrl}
                            alt={item.name}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ShoppingBag className="w-6 h-6 text-gray-300" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium line-clamp-2">{item.name}</h4>
                        {item.variation && (
                          <p className="text-xs text-gray-500">
                            {item.variation.attributes.map((attr) => attr.value).join(' • ')}
                          </p>
                        )}
                        <p className="text-xs text-gray-500">כמות: {item.quantity}</p>
                        <p className="text-sm font-medium">{item.price}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between text-gray-600">
                    <span>סה״כ מוצרים</span>
                    <span>{formatPrice(getTotal())}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>משלוח</span>
                    <span className="text-green-600">חינם</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between font-bold text-lg">
                    <span>סה״כ לתשלום</span>
                    <span>{formatPrice(getTotal())}</span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full mt-6 py-4 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      מעבד...
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-5 h-5" />
                      המשך לתשלום מאובטח
                    </>
                  )}
                </button>

                <div className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-500">
                  <ShieldCheck className="w-4 h-4" />
                  <span>תשלום מאובטח SSL</span>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
