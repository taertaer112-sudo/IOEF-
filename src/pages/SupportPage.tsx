import React, { useState, useEffect } from 'react';
import { Mail, Phone, MessageSquare, Send, CheckCircle2, Shield, HelpCircle, Loader2 } from 'lucide-react';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import { Division } from '../types';

interface SupportPageProps {
  divisions?: Division[];
  activeFederationId?: string | null;
}

export const SupportPage: React.FC<SupportPageProps> = ({ divisions = [], activeFederationId }) => {
  const { addToast } = useToast();
  const [senderName, setSenderName] = useState('');
  const [senderContact, setSenderContact] = useState('');
  const [divisionId, setDivisionId] = useState(activeFederationId || '');
  const [ticketSubject, setTicketSubject] = useState('match_dispute');
  const [ticketDetails, setTicketDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [ticketNumber, setTicketNumber] = useState('');

  useEffect(() => {
    if (activeFederationId) {
      setDivisionId(activeFederationId);
    }
  }, [activeFederationId]);

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!senderName.trim() || !senderContact.trim() || !ticketDetails.trim() || submitting) return;

    setSubmitting(true);
    try {
      const res = await api.submitSupportTicket({
        senderName: senderName.trim(),
        senderContact: senderContact.trim(),
        ticketSubject,
        ticketDetails: ticketDetails.trim(),
        divisionId: divisionId || undefined,
      });

      if (res.success) {
        setTicketNumber(res.ticket.id);
        setSubmitted(true);
        addToast({
          type: 'system',
          title: 'تم تسجيل التذكرة بنجاح',
          message: `تم تحويل التذكرة (${res.ticket.id}) إلى لجنة المسابقات والدعم الفني.`,
          badge: 'الدعم الفني',
        });
      }
    } catch (err) {
      console.error(err);
      addToast({
        type: 'disciplinary',
        title: 'تعذر إرسال التذكرة',
        message: 'حدث خطأ بالاتصال، يرجى إعادة المحاولة.',
        badge: 'خطأ بالشبكة',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 text-xs text-amber-400 font-semibold px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full">
          <HelpCircle className="w-3.5 h-3.5" />
          <span>مركز العناية باللاعبين والاعتراضات الرسمية</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
          التواصل والدعم الفني (IOEF Support)
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto">
          فريق الدعم الفني ولجنة التحكيم متاحون لمساعدتك في استفسارات التسجيل، حل نزاعات المباريات، وتقديم الطعون الرسمية.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        <div className="md:col-span-5 space-y-4">
          <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
            <h3 className="font-bold text-white text-sm">القنوات الرسمية المعتمدة</h3>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center gap-3">
                <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
                  <Phone className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-white">الخط الساخن ونزاعات المباريات</div>
                  <div className="text-slate-400 font-mono mt-0.5" dir="ltr">+966 50 847 2901</div>
                  <div className="text-[10px] text-emerald-400">متاح أثناء جولات المباريات الرسمية</div>
                </div>
              </div>

              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center gap-3">
                <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-white">البريد الإلكتروني للجنة المسابقات</div>
                  <div className="text-slate-400 font-mono mt-0.5">competitions@ioef.org</div>
                  <div className="text-[10px] text-slate-500">الرد خلال 12 ساعة كحد أقصى</div>
                </div>
              </div>

              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center gap-3">
                <div className="p-2 bg-sky-500/10 text-sky-400 rounded-lg">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-white">غرفة التنسيق الفني للاتحادات</div>
                  <div className="text-slate-400 mt-0.5">إحالة مباشرة إلى منظم الاتحاد الوطني المختص</div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-5 bg-slate-950 border border-slate-800 rounded-2xl space-y-2 text-xs text-slate-300">
            <h4 className="font-bold text-white flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-amber-400" />
              <span>ضوابط تقديم الاعتراض على النتائج:</span>
            </h4>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              يجب تقديم الاعتراض خلال ساعتين فقط من صافرة نهاية المباراة، مع ذكر رقم المباراة واسم الخصم ليتسنى للجنة التحكيم مراجعة البيانات قبل اعتماد الترتيب النهائي.
            </p>
          </div>
        </div>

        <div className="md:col-span-7 p-6 sm:p-8 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
          <h3 className="font-bold text-white text-base border-b border-slate-800 pb-2">
            تقديم تذكرة دعم فني أو طعن رسمي
          </h3>

          {submitted ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/20">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-bold text-white">تم استلام تذكرتك بنجاح</h4>
              {ticketNumber && (
                <div className="inline-block px-3 py-1 bg-slate-950 border border-slate-800 rounded-lg text-amber-400 font-mono text-xs font-bold">
                  رقم المتابعة: {ticketNumber}
                </div>
              )}
              <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                تم تحويل التذكرة إلى القسم المختص وسيتواصل معك مراقب الاتحاد عبر وسيلة التواصل المسجلة في أقرب وقت.
              </p>
              <button
                onClick={() => {
                  setSubmitted(false);
                  setTicketDetails('');
                  setTicketNumber('');
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white rounded-lg mt-2"
              >
                تقديم تذكرة أخرى
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmitTicket} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 mb-1 font-semibold">الاسم أو اسم النادي *</label>
                <input
                  type="text"
                  required
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  placeholder="مثال: عبدالله الشمري (نادي الهلال)"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">رقم الواتساب أو البريد الإلكتروني *</label>
                  <input
                    type="text"
                    required
                    value={senderContact}
                    onChange={(e) => setSenderContact(e.target.value)}
                    placeholder="+966 50 123 4567"
                    dir="ltr"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>

                {divisions.length > 0 && (
                  <div>
                    <label className="block text-slate-300 mb-1 font-semibold">الاتحاد الوطني المختص</label>
                    <select
                      value={divisionId}
                      onChange={(e) => setDivisionId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white font-semibold focus:outline-none focus:border-amber-500"
                    >
                      <option value="">الأمانة العامة الدولية (عام)</option>
                      {divisions.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.nameAr}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-semibold">موضوع التذكرة:</label>
                <select
                  value={ticketSubject}
                  onChange={(e) => setTicketSubject(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white font-semibold focus:outline-none focus:border-amber-500"
                >
                  <option value="match_dispute">اعتراض أو طعن على نتيجة مباراة</option>
                  <option value="squad_appeal">طلب استثنائي لفتح تعديل التشكيلة</option>
                  <option value="registration_inquiry">استفسار بخصوص طلب التسجيل</option>
                  <option value="general">استفسار عام أو دعم المتجر</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-semibold">تفاصيل الاستفسار أو الاعتراض *</label>
                <textarea
                  rows={4}
                  required
                  value={ticketDetails}
                  onChange={(e) => setTicketDetails(e.target.value)}
                  placeholder="اشرح المشكلة بالتفصيل واذكر رقم المباراة أو كود النادي إن وجد..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white leading-relaxed focus:outline-none focus:border-amber-500"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 disabled:opacity-50 text-slate-950 font-bold rounded-lg text-xs transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>جاري تسجيل التذكرة في النظام...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>إرسال التذكرة رسمياً للاتحاد</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
