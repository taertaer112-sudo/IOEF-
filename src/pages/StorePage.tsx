import React, { useState } from 'react';
import { StoreProduct, StoreOrder } from '../types';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import {
  ShoppingBag,
  ShieldCheck,
  Check,
  CheckCircle2,
  Loader2,
} from 'lucide-react';

interface StorePageProps {
  products: StoreProduct[];
  onOrderCreated: () => void;
}

export const StorePage: React.FC<StorePageProps> = ({ products, onOrderCreated }) => {
  const { addToast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedProduct, setSelectedProduct] = useState<StoreProduct | null>(null);

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'bank_transfer' | 'apple_pay' | 'stc_pay' | 'direct_broker'>('bank_transfer');
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [lastCreatedOrder, setLastCreatedOrder] = useState<StoreOrder | null>(null);
  const [sessionOrders, setSessionOrders] = useState<StoreOrder[]>([]);

  const [trackQuery, setTrackQuery] = useState('');
  const [trackedOrder, setTrackedOrder] = useState<StoreOrder | null>(null);
  const [trackSearched, setTrackSearched] = useState(false);

  const filteredProducts = products.filter((p) => {
    if (selectedCategory === 'all') return true;
    return p.category === selectedCategory;
  });

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;

    if (!customerName.trim() || !customerPhone.trim()) {
      setFormError('الرجاء إدخال الاسم الكامل ورقم الهاتف لإتمام الطلب.');
      return;
    }

    setFormError(null);
    setSubmittingOrder(true);
    try {
      const res = await api.createOrder({
        productId: selectedProduct.id,
        productTitle: selectedProduct.titleAr,
        customerName,
        customerPhone,
        customerEmail,
        shippingAddress: shippingAddress || 'تسليم رقمي / شحن رسمي',
        totalPrice: selectedProduct.price,
        currency: selectedProduct.currency,
        paymentMethod,
      });

      if (res.success && res.order) {
        setLastCreatedOrder(res.order);
        setSessionOrders((prev) => [res.order, ...prev]);
        setSelectedProduct(null);
        setCustomerName('');
        setCustomerPhone('');
        setCustomerEmail('');
        setShippingAddress('');
        addToast({
          type: 'system',
          title: 'تم تسجيل طلبك الرسمي بنجاح',
          message: `رقم الطلب: ${res.order.orderNumber}`,
        });
        onOrderCreated();
      }
    } catch (err: any) {
      setFormError(err?.message || 'تعذر إرسال الطلب، يرجى المحاولة لاحقاً.');
    } finally {
      setSubmittingOrder(false);
    }
  };

  const handleTrackOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackQuery.trim()) return;
    const found = sessionOrders.find((o) => o.orderNumber.toLowerCase() === trackQuery.trim().toLowerCase());
    setTrackedOrder(found || null);
    setTrackSearched(true);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-1">المتجر الرسمي والخدمات المعتمدة</div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">IOEF Official Store</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            الأطقم الرسمية المعتمدة للمسابقات، جوازات الموسم الإلكترونية، وخدمات الوساطة الموثقة.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-lg text-xs font-semibold">
          {[
            { id: 'all', label: 'كافة المنتجات' },
            { id: 'apparel', label: 'الأطقم الرسمية' },
            { id: 'hardware', label: 'عتاد اللاعبين' },
            { id: 'digital_pass', label: 'جواز الموسم' },
            { id: 'services', label: 'خدمات الوساطة' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                selectedCategory === cat.id ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-5 bg-slate-900/60 border border-slate-800 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-white text-xs sm:text-sm">نظام الوسطاء المعتمدين لدى الاتحاد الدولي</h3>
            <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">
              تتم جميع المعاملات عبر قنوات معتمدة رسمياً ومضمونة لضمان حقوق اللاعبين.
            </p>
          </div>
        </div>
        <div className="text-xs text-slate-400 font-mono">ضمان متابعة من الأمانة العامة</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProducts.map((prod) => (
          <div
            key={prod.id}
            className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden hover:border-slate-700 transition-all flex flex-col justify-between group"
          >
            <div>
              <div className="relative h-52 bg-slate-950 overflow-hidden">
                <img
                  src={prod.imageUrl}
                  alt={prod.titleAr}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                {prod.isOfficial && (
                  <span className="absolute top-3 right-3 text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500 text-slate-950 shadow">
                    معتمد رسمياً
                  </span>
                )}
              </div>

              <div className="p-5 space-y-3">
                <div className="text-[11px] font-mono text-amber-400 font-semibold">
                  {prod.category === 'apparel'
                    ? 'أطقم وملابس'
                    : prod.category === 'hardware'
                    ? 'هاردوير وعتاد'
                    : prod.category === 'digital_pass'
                    ? 'جواز رقمي'
                    : 'وساطة وتحكيم'}
                </div>
                <h3 className="text-sm font-bold text-white leading-snug line-clamp-2">{prod.titleAr}</h3>
                <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{prod.description}</p>
                <ul className="space-y-1 text-[11px] text-slate-300 pt-2 border-t border-slate-800/80">
                  {prod.features.slice(0, 3).map((feat, i) => (
                    <li key={i} className="flex items-center gap-1.5">
                      <Check className="w-3 h-3 text-amber-400 shrink-0" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="p-5 pt-0 mt-3 border-t border-slate-800/80 flex items-center justify-between">
              <div>
                <div className="text-[10px] text-slate-500">السعر الرسمي</div>
                <div className="text-base font-extrabold text-white font-mono">
                  {prod.price} <span className="text-xs text-amber-400">{prod.currency}</span>
                </div>
              </div>
              <button
                onClick={() => {
                  setFormError(null);
                  setSelectedProduct(prod);
                }}
                className="px-4 py-2 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 text-slate-950 font-bold text-xs rounded-lg transition-all shadow-sm"
              >
                طلب الشراء
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Order Tracking */}
      <div className="p-6 sm:p-8 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
        <div>
          <h3 className="text-base font-bold text-white">متابعة حالة طلبك المسجل</h3>
          <p className="text-xs text-slate-400">أدخل رقم الطلب الصادر لك في هذه الجلسة (مثال: IOEF-123456) للتحقق من تفاصيله.</p>
        </div>
        <form onSubmit={handleTrackOrder} className="flex flex-col sm:flex-row gap-3 max-w-lg">
          <input
            type="text"
            placeholder="أدخل رقم الطلب: IOEF-XXXXXX"
            value={trackQuery}
            onChange={(e) => setTrackQuery(e.target.value)}
            className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-xs text-white uppercase font-mono placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
          <button type="submit" className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold">
            استعلام
          </button>
        </form>

        {trackSearched && (
          <div className="pt-2">
            {trackedOrder ? (
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-xs space-y-2 max-w-lg">
                <div className="flex justify-between">
                  <span className="text-slate-400">رقم الطلب:</span>
                  <span className="font-mono font-bold text-amber-400">{trackedOrder.orderNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">المنتج:</span>
                  <span className="font-bold text-white">{trackedOrder.productTitle}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">حالة الطلب:</span>
                  <span className="font-bold text-emerald-400 font-mono">{trackedOrder.status}</span>
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-400">
                لم يتم العثور على طلب بهذا الرقم في هذه الجلسة. لمتابعة طلبات سابقة يرجى التواصل مع الدعم الفني برقم الطلب.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Purchase Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setSelectedProduct(null)}
              className="absolute top-4 left-4 text-slate-400 hover:text-white text-xs px-2.5 py-1 bg-slate-800 rounded"
            >
              إلغاء
            </button>

            <div className="border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">تقديم طلب شراء رسمي</h3>
              <div className="text-xs text-amber-400 mt-1 font-semibold">{selectedProduct.titleAr}</div>
              <div className="text-sm font-mono font-bold text-white mt-1">
                القيمة: {selectedProduct.price} {selectedProduct.currency}
              </div>
            </div>

            <form onSubmit={handleCreateOrder} className="space-y-3 text-xs">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 font-bold">
                  {formError}
                </div>
              )}
              <div>
                <label className="block text-slate-300 mb-1 font-semibold">الاسم الكامل للمستلم *</label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="مثال: فيصل العتيبي"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-semibold">رقم الهاتف / الواتساب للتنسيق *</label>
                <input
                  type="tel"
                  required
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="+966 50 123 4567"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-semibold">البريد الإلكتروني للإشعار</label>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="player@example.com"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-semibold">عنوان الشحن أو التسليم الرقمي</label>
                <textarea
                  rows={2}
                  value={shippingAddress}
                  onChange={(e) => setShippingAddress(e.target.value)}
                  placeholder="المدينة، أو التسليم الرقمي..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-semibold">طريقة الدفع المعتمدة:</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white font-semibold"
                >
                  <option value="bank_transfer">تحويل بنكي رسمي إلى حساب الاتحاد المعتمد</option>
                  <option value="apple_pay">Apple Pay / مدى</option>
                  <option value="stc_pay">STC Pay</option>
                  <option value="direct_broker">الوساطة المباشرة المعتمدة</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={submittingOrder}
                className="w-full py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 text-slate-950 font-bold rounded-lg text-xs transition-colors flex items-center justify-center gap-2"
              >
                {submittingOrder ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingBag className="w-4 h-4" />}
                <span>تأكيد طلب الشراء</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {lastCreatedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-emerald-500/40 rounded-2xl max-w-md w-full p-6 text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">تم تسجيل طلب الشراء بنجاح!</h3>
            <div className="text-xs text-slate-300">
              رقم الطلب الخاص بك: <strong className="text-amber-400 font-mono text-sm block mt-1">{lastCreatedOrder.orderNumber}</strong>
            </div>
            <button
              onClick={() => setLastCreatedOrder(null)}
              className="px-6 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition-colors"
            >
              تم الحفظ والمتابعة
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
