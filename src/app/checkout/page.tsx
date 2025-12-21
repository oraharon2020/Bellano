'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Loader2, ShoppingBag, CreditCard, Truck, ShieldCheck, CheckCircle, Phone, Smartphone, Wallet, Trash2, Pencil, Minus, Plus, Tag } from 'lucide-react';
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

interface AppliedCoupon {
  code: string;
  discount: number;
  discountDisplay: string;
  discount_type: string;
}

type PaymentMethod = 'credit_card' | 'bit' | 'apple_pay' | 'google_pay' | 'phone_order';

export default function CheckoutPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { items, getTotal, clearCart, isHydrated, updateQuantity, removeItem } = useCartStore();
  const [step, setStep] = useState<'details' | 'payment' | 'success'>('details');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<number | null>(null);
  const [selectedPayments, setSelectedPayments] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('credit_card');
  
  // Coupon state
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const [couponError, setCouponError] = useState('');
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);
  
  // Terms agreement
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  
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

  // Load saved customer data from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('bellano_checkout_customer');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setCustomerData(prev => ({ ...prev, ...parsed }));
      } catch (e) {
        console.error('Failed to parse saved customer data');
      }
    }
  }, []);

  // Save customer data to localStorage whenever it changes
  useEffect(() => {
    // Only save if at least one field has a value
    const hasData = Object.values(customerData).some(v => v.trim() !== '');
    if (hasData) {
      localStorage.setItem('bellano_checkout_customer', JSON.stringify(customerData));
    }
  }, [customerData]);

  const [shippingMethods] = useState<ShippingMethod[]>([
    { id: 'free_shipping', title: 'משלוח חינם', cost: 0 },
  ]);
  const [selectedShipping, setSelectedShipping] = useState('free_shipping');

  // Auto-apply coupon from URL
  useEffect(() => {
    const couponFromUrl = searchParams.get('coupon');
    if (couponFromUrl && !appliedCoupon && items.length > 0) {
      setCouponCode(couponFromUrl);
      validateCoupon(couponFromUrl);
    }
  }, [searchParams, items.length]);

  const subtotal = getTotal();
  const discount = appliedCoupon?.discount || 0;
  const finalTotal = Math.max(0, subtotal - discount);

  const validateCoupon = async (code?: string) => {
    const codeToValidate = code || couponCode.trim();
    if (!codeToValidate) {
      setCouponError('נא להזין קוד קופון');
      return;
    }

    setIsValidatingCoupon(true);
    setCouponError('');

    try {
      const response = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: codeToValidate,
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
    } catch {
      setCouponError('שגיאה באימות הקופון');
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponError('');
  };

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
            // Include variation attributes
            variation_attributes: item.variation?.attributes || [],
            // Include admin fields if present
            admin_fields: item.adminFields ? {
              width: item.adminFields.width,
              depth: item.adminFields.depth,
              height: item.adminFields.height,
              additional_fee: item.adminFields.additionalFee,
              additional_fee_reason: item.adminFields.additionalFeeReason,
              discount_type: item.adminFields.discountType,
              discount_value: item.adminFields.discountValue,
              free_comments: item.adminFields.freeComments,
              uploaded_file: item.adminFields.uploadedFile,
              uploaded_file_name: item.adminFields.uploadedFileName,
              original_price: item.adminFields.originalPrice,
              final_price: item.adminFields.finalPrice,
            } : undefined,
          })),
          shipping_method: selectedShipping,
          payment_method: paymentMethod,
          // Include coupon if applied
          coupon_code: appliedCoupon?.code || null,
        }),
      });

      const orderData = await orderResponse.json();

      if (!orderData.success) {
        throw new Error(orderData.message || 'שגיאה ביצירת ההזמנה');
      }

      setOrderId(orderData.order_id);

      // If phone order - redirect to success page with phone_order flag
      if (paymentMethod === 'phone_order') {
        clearCart();
        router.push(`/checkout/success?order_id=${orderData.order_id}&type=phone_order`);
        return;
      }

      // Step 2: Get Meshulam payment URL
      // Build order description with all products
      const productNames = items.map(item => {
        let name = item.name;
        if (item.variation?.attributes && item.variation.attributes.length > 0) {
          const attrs = item.variation.attributes
            .map(attr => `${attr.name}: ${attr.value}`)
            .join(', ');
          name += ` (${attrs})`;
        }
        if (item.quantity > 1) {
          name += ` x${item.quantity}`;
        }
        return name;
      }).join(', ');
      
      // Amount to charge (with coupon discount if applied)
      const amountToCharge = appliedCoupon ? finalTotal : subtotal;
      
      // Send single item with total amount to avoid Meshulam sum mismatch issues
      const finalPaymentItems = [{
        name: productNames.length > 100 ? productNames.substring(0, 97) + '...' : productNames,
        price: amountToCharge,
        quantity: 1,
        sku: `order-${orderData.order_id}`,
      }];
      
      // For Bit, don't send installments
      const paymentsToSend = paymentMethod === 'bit' ? 1 : selectedPayments;
      
      const paymentResponse = await fetch('/api/checkout/create-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: orderData.order_id,
          amount: amountToCharge, // Use amount with discount applied
          customer: customerData,
          payments: paymentsToSend,
          items: finalPaymentItems, // Use adjusted items if coupon applied
          payment_type: paymentMethod, // Send payment type to API
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
    const isPhoneOrder = paymentMethod === 'phone_order';
    
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-md mx-auto text-center">
            <div className={`w-20 h-20 ${isPhoneOrder ? 'bg-blue-100' : 'bg-green-100'} rounded-full flex items-center justify-center mx-auto mb-6`}>
              {isPhoneOrder ? (
                <Phone className="w-10 h-10 text-blue-600" />
              ) : (
                <CheckCircle className="w-10 h-10 text-green-600" />
              )}
            </div>
            <h1 className="text-2xl font-bold mb-4">
              {isPhoneOrder ? 'ההזמנה נשלחה בהצלחה!' : 'ההזמנה התקבלה בהצלחה!'}
            </h1>
            <p className="text-gray-600 mb-2">תודה על הרכישה שלך</p>
            {orderId && (
              <p className="text-gray-600 mb-4">מספר הזמנה: <strong>{orderId}</strong></p>
            )}
            {isPhoneOrder ? (
              <div className="bg-blue-50 text-blue-700 p-4 rounded-lg mb-8 text-sm">
                <p className="font-medium mb-2">📞 נציג יצור איתך קשר בהקדם</p>
                <p>ההזמנה שלך בהמתנה לתשלום. נציג שלנו יתקשר אליך להשלמת התשלום בטלפון.</p>
              </div>
            ) : (
              <p className="text-sm text-gray-500 mb-8">
                שלחנו לך אימייל עם פרטי ההזמנה. ניצור קשר בקרוב לתיאום המשלוח.
              </p>
            )}
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
                  <div className="md:col-span-2">
                    <p className="text-xs text-gray-500">* לקבלת חשבונית על שם העסק, יש למלא את שם העסק בשדות שם פרטי ושם משפחה</p>
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

              {/* Payment Method Selection */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-bold mb-4">אמצעי תשלום</h2>
                <div className="space-y-3">
                  {/* Credit Card */}
                  <label
                    className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-colors ${
                      paymentMethod === 'credit_card'
                        ? 'border-black bg-gray-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="payment_method"
                        value="credit_card"
                        checked={paymentMethod === 'credit_card'}
                        onChange={() => setPaymentMethod('credit_card')}
                        className="w-4 h-4"
                      />
                      <CreditCard className="w-5 h-5 text-gray-500" />
                      <span>כרטיס אשראי</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <ShieldCheck className="w-4 h-4 text-green-600" />
                      <span className="text-xs text-green-600">מאובטח</span>
                    </div>
                  </label>

                  {/* Bit */}
                  <label
                    className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-colors ${
                      paymentMethod === 'bit'
                        ? 'border-black bg-gray-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="payment_method"
                        value="bit"
                        checked={paymentMethod === 'bit'}
                        onChange={() => setPaymentMethod('bit')}
                        className="w-4 h-4"
                      />
                      <div className="w-5 h-5 flex items-center justify-center">
                        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
                          <rect width="24" height="24" rx="4" fill="#3BA0FF"/>
                          <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">bit</text>
                        </svg>
                      </div>
                      <span>Bit</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <ShieldCheck className="w-4 h-4 text-green-600" />
                      <span className="text-xs text-green-600">מאובטח</span>
                    </div>
                  </label>

                  {/* Apple Pay */}
                  <label
                    className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-colors ${
                      paymentMethod === 'apple_pay'
                        ? 'border-black bg-gray-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="payment_method"
                        value="apple_pay"
                        checked={paymentMethod === 'apple_pay'}
                        onChange={() => setPaymentMethod('apple_pay')}
                        className="w-4 h-4"
                      />
                      <div className="w-5 h-5 flex items-center justify-center">
                        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                          <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                        </svg>
                      </div>
                      <span>Apple Pay</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <ShieldCheck className="w-4 h-4 text-green-600" />
                      <span className="text-xs text-green-600">מאובטח</span>
                    </div>
                  </label>

                  {/* Google Pay */}
                  <label
                    className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-colors ${
                      paymentMethod === 'google_pay'
                        ? 'border-black bg-gray-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="payment_method"
                        value="google_pay"
                        checked={paymentMethod === 'google_pay'}
                        onChange={() => setPaymentMethod('google_pay')}
                        className="w-4 h-4"
                      />
                      <div className="w-5 h-5 flex items-center justify-center">
                        <svg viewBox="0 0 24 24" className="w-5 h-5">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                      </div>
                      <span>Google Pay</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <ShieldCheck className="w-4 h-4 text-green-600" />
                      <span className="text-xs text-green-600">מאובטח</span>
                    </div>
                  </label>
                  
                  {/* Phone Order */}
                  <label
                    className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-colors ${
                      paymentMethod === 'phone_order'
                        ? 'border-black bg-gray-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="payment_method"
                        value="phone_order"
                        checked={paymentMethod === 'phone_order'}
                        onChange={() => setPaymentMethod('phone_order')}
                        className="w-4 h-4"
                      />
                      <Phone className="w-5 h-5 text-gray-500" />
                      <span>תשלום דרך נציג</span>
                    </div>
                  </label>
                  
                  {paymentMethod === 'phone_order' && (
                    <div className="bg-blue-50 text-blue-700 text-sm p-3 rounded-lg">
                      📞 נציג שלנו יצור איתך קשר בהקדם להשלמת התשלום
                    </div>
                  )}
                </div>
              </div>

              {/* Payment Options - Only show for credit card and Apple Pay */}
              {(paymentMethod === 'credit_card' || paymentMethod === 'apple_pay') && (
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h2 className="text-lg font-bold mb-1">מספר תשלומים</h2>
                  <p className="text-sm text-green-600 mb-4">✓ ללא ריבית על כל התשלומים</p>
                  
                  {/* Quick Options */}
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    {[
                      { num: 1, label: 'תשלום אחד', sublabel: formatPrice(getTotal()) },
                      { num: 3, label: '3 תשלומים', sublabel: formatPrice(getTotal() / 3) + ' לחודש' },
                      { num: 6, label: '6 תשלומים', sublabel: formatPrice(getTotal() / 6) + ' לחודש' },
                    ].map(({ num, label, sublabel }) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setSelectedPayments(num)}
                        className={`p-4 border-2 rounded-xl transition-all text-center ${
                          selectedPayments === num
                            ? 'border-primary bg-primary/5 shadow-sm'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <div className={`font-bold text-lg ${selectedPayments === num ? 'text-primary' : 'text-gray-900'}`}>
                          {label}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">{sublabel}</div>
                      </button>
                    ))}
                  </div>
                  
                  {/* Custom Selection Dropdown */}
                  <div className="relative">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      או בחר מספר תשלומים אחר:
                    </label>
                    <select
                      value={selectedPayments}
                      onChange={(e) => setSelectedPayments(Number(e.target.value))}
                      className="w-full p-3 border border-gray-200 rounded-lg bg-white appearance-none cursor-pointer hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((num) => (
                        <option key={num} value={num}>
                          {num === 1 
                            ? 'תשלום אחד' 
                            : `${num} תשלומים ללא ריבית - ${formatPrice(getTotal() / num)} לחודש`
                          }
                        </option>
                      ))}
                    </select>
                    <div className="absolute left-3 top-[calc(50%+10px)] -translate-y-1/2 pointer-events-none">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                  
                  {/* Selected Summary */}
                  {selectedPayments > 1 && (
                    <div className="mt-4 p-3 bg-gray-50 rounded-lg flex items-center justify-between">
                      <span className="text-gray-600">סה״כ לחודש:</span>
                      <span className="text-lg font-bold text-primary">{formatPrice(getTotal() / selectedPayments)}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-sm p-6 sticky top-24">
                <h2 className="text-lg font-bold mb-4">סיכום הזמנה</h2>
                
                {/* Cart Items */}
                <div className="space-y-4 mb-4 max-h-96 overflow-auto">
                  {items.map((item) => (
                    <div key={item.id + (item.variation?.id || '')} className="border rounded-lg p-3">
                      <div className="flex gap-3">
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
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="text-sm font-medium line-clamp-2">{item.name}</h4>
                            <button
                              type="button"
                              onClick={() => removeItem(item.id, item.variation?.id)}
                              className="text-gray-400 hover:text-red-500 transition-colors p-1"
                              title="הסר מוצר"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          {item.variation && (
                            <p className="text-xs text-gray-500">
                              {item.variation.attributes.map((attr) => attr.value).join(' • ')}
                            </p>
                          )}
                          {item.adminFields && (
                            item.adminFields.width || 
                            item.adminFields.depth || 
                            item.adminFields.height || 
                            item.adminFields.freeComments || 
                            item.adminFields.uploadedFile
                          ) && (
                            <div className="text-xs text-blue-600 mt-1 space-y-0.5 bg-blue-50 p-2 rounded">
                              {/* Dimensions */}
                              {(item.adminFields.width || item.adminFields.depth || item.adminFields.height) && (
                                <p className="text-blue-700">
                                  📐 {[
                                    item.adminFields.width && `ר: ${item.adminFields.width}`,
                                    item.adminFields.depth && `ע: ${item.adminFields.depth}`,
                                    item.adminFields.height && `ג: ${item.adminFields.height}`
                                  ].filter(Boolean).join(' / ')}
                                </p>
                              )}
                              {item.adminFields.freeComments && <p>📝 {item.adminFields.freeComments}</p>}
                              {item.adminFields.uploadedFileName && (
                                <a 
                                  href={item.adminFields.uploadedFile} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:underline block"
                                >
                                  📎 {item.adminFields.uploadedFileName}
                                </a>
                              )}
                            </div>
                          )}
                          
                          {/* Quantity Control */}
                          <div className="flex items-center justify-between mt-2">
                            <div className="flex items-center gap-2 border rounded">
                              <button
                                type="button"
                                onClick={() => updateQuantity(item.id, item.quantity - 1, item.variation?.id)}
                                className="p-1 hover:bg-gray-100 transition-colors"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="text-sm w-6 text-center">{item.quantity}</span>
                              <button
                                type="button"
                                onClick={() => updateQuantity(item.id, item.quantity + 1, item.variation?.id)}
                                className="p-1 hover:bg-gray-100 transition-colors"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                            <p className="text-sm font-bold">{item.price}</p>
                          </div>
                          
                          {/* Edit Link */}
                          <Link
                            href={`/product/${item.slug}`}
                            className="text-xs text-primary hover:underline inline-flex items-center gap-1 mt-2"
                          >
                            <Pencil className="w-3 h-3" />
                            ערוך מוצר
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Coupon Section */}
                <div className="border-t pt-4 mb-4">
                  {!appliedCoupon ? (
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Tag className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          value={couponCode}
                          onChange={(e) => setCouponCode(e.target.value)}
                          placeholder="קוד קופון"
                          className="w-full pr-10 pl-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), validateCoupon())}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => validateCoupon()}
                        disabled={isValidatingCoupon}
                        className="px-4 py-2 bg-gray-100 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                      >
                        {isValidatingCoupon ? <Loader2 className="w-4 h-4 animate-spin" /> : 'החל'}
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between bg-green-50 p-3 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Tag className="w-4 h-4 text-green-600" />
                        <span className="text-sm text-green-700 font-medium">
                          {appliedCoupon.code} ({appliedCoupon.discountDisplay})
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={removeCoupon}
                        className="text-red-500 hover:text-red-600 text-sm"
                      >
                        הסר
                      </button>
                    </div>
                  )}
                  {couponError && (
                    <p className="text-red-500 text-xs mt-2">{couponError}</p>
                  )}
                </div>

                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between text-gray-600">
                    <span>סה״כ מוצרים</span>
                    <span>{formatPrice(subtotal)}</span>
                  </div>
                  {appliedCoupon && (
                    <div className="flex justify-between text-green-600">
                      <span>הנחה ({appliedCoupon.code})</span>
                      <span>-{formatPrice(discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-gray-600">
                    <span>משלוח</span>
                    <span className="text-green-600">חינם</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between font-bold text-lg">
                    <span>סה״כ לתשלום</span>
                    <span>{formatPrice(finalTotal)}</span>
                  </div>
                </div>

                {/* Terms Agreement Checkbox */}
                <div className="mt-4 pt-4 border-t">
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={agreedToTerms}
                      onChange={(e) => setAgreedToTerms(e.target.checked)}
                      className="mt-1 w-4 h-4 rounded border-gray-300 text-black focus:ring-black cursor-pointer"
                      required
                    />
                    <span className="text-sm text-gray-600 group-hover:text-gray-800">
                      קראתי ואני מסכים/ה ל
                      <Link 
                        href="/page/privacy-policy" 
                        target="_blank"
                        className="text-black underline hover:no-underline mx-1"
                      >
                        תקנון האתר ומדיניות הפרטיות
                      </Link>
                    </span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !agreedToTerms}
                  className="w-full mt-4 py-4 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      מעבד...
                    </>
                  ) : paymentMethod === 'phone_order' ? (
                    <>
                      <Phone className="w-5 h-5" />
                      שליחת הזמנה
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-5 h-5" />
                      המשך לתשלום מאובטח
                    </>
                  )}
                </button>

                <div className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-500">
                  {paymentMethod === 'phone_order' ? (
                    <span>נציג יצור קשר להשלמת התשלום</span>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>תשלום מאובטח SSL</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
