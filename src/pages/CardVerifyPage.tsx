import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import {
  ShieldCheck,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Loader2,
  QrCode,
  ArrowRight,
  User,
} from 'lucide-react';
import { ClubCrestBadge, DIVISION_EMBLEMS } from '../components/OfficialEmblems';
import { OFFICIAL_REAL_CLUBS } from '../data/officialClubs';

interface CardVerifyPageProps {
  initialToken?: string;
  onBackHome: () => void;
}

export const CardVerifyPage: React.FC<CardVerifyPageProps> = ({ initialToken = '', onBackHome }) => {
  const [queryInput, setQueryInput] = useState(initialToken);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [searched, setSearched] = useState(false);

  const performVerify = async (tokenOrCode: string) => {
    const clean = tokenOrCode.trim();
    if (!clean) return;
    setLoading(true);
    setSearched(true);
    try {
      const res = await api.verifyMembership(clean);
      setResult(res);
    } catch {
      setResult({ found: false, valid: false, effectiveStatus: 'not_found' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialToken) {
      setQueryInput(initialToken);
      void performVerify(initialToken);
    }
  }, [initialToken]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void performVerify(queryInput);
  };

  const formatDate = (iso?: string) => {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleDateString('ar-SA', { year: 'numeric', month: '2-digit', day: '2-digit' });
    } catch {
      return iso.split('T')[0];
    }
  };

  const renderVerdictBanner = () => {
    if (!result || !result.found) {
      return (
        <div className="p-6 rounded-2xl bg-rose-950/40 border border-rose-500/40 flex items-center gap-4">
          <XCircle className="w-10 h-10 text-rose-400 shrink-0" />
          <div>
            <h2 className="text-lg font-black text-white">رمز التحقق غير موجود أو غير معتمد</h2>
            <p className="text-xs text-rose-200 mt-1">
              لم يتم العثور على بطاقة عضوية مطابقة لهذا الرمز في سجلات الاتحاد الدولي IOEF. تأكد من مسح أحدث نسخة من بطاقة اللاعب.
            </p>
          </div>
        </div>
      );
    }

    switch (result.effectiveStatus) {
      case 'valid':
        return (
          <div className="p-6 rounded-2xl bg-emerald-950/40 border border-emerald-500/50 flex items-center gap-4">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 shrink-0" />
            <div>
              <h2 className="text-lg font-black text-white">عضوية رسمية صالحة ومعتمدة</h2>
              <p className="text-xs text-emerald-200 mt-1">
                هذه البطاقة سارية المفعول وصادرة رسمياً من الأمانة العامة للاتحاد الدولي للرياضات الإلكترونية IOEF.
              </p>
            </div>
          </div>
        );
      case 'revoked':
        return (
          <div className="p-6 rounded-2xl bg-rose-950/50 border border-rose-500/60 flex items-center gap-4">
            <XCircle className="w-10 h-10 text-rose-400 shrink-0" />
            <div>
              <h2 className="text-lg font-black text-white">هذه البطاقة ملغاة ولا يعتد بها</h2>
              <p className="text-xs text-rose-200 mt-1">
                {result.membership?.revokedReason || 'تم إلغاء هذا الإصدار من البطاقة أو استبداله بإصدار أحدث من قِبل إدارة الاتحاد.'}
              </p>
            </div>
          </div>
        );
      case 'suspended':
        return (
          <div className="p-6 rounded-2xl bg-rose-950/40 border border-rose-500/50 flex items-center gap-4">
            <AlertTriangle className="w-10 h-10 text-rose-400 shrink-0" />
            <div>
              <h2 className="text-lg font-black text-white">العضوية موقوفة مؤقتاً</h2>
              <p className="text-xs text-rose-200 mt-1">
                حساب العضوية معلق إدارياً أو انضباطياً ولا يمكن استخدامه في المنافسات حتى تفعيل الإدارة.
              </p>
            </div>
          </div>
        );
      case 'expired':
        return (
          <div className="p-6 rounded-2xl bg-amber-950/40 border border-amber-500/50 flex items-center gap-4">
            <AlertTriangle className="w-10 h-10 text-amber-400 shrink-0" />
            <div>
              <h2 className="text-lg font-black text-white">صلاحية العضوية منتهية</h2>
              <p className="text-xs text-amber-200 mt-1">
                انتهت الفترة الزمنية لهذه البطاقة. يحتفظ اللاعب برقمه الدائم وسجله الرياضي ويمكنه التقديم للتجديد من ملفه الشخصي.
              </p>
            </div>
          </div>
        );
      default:
        return (
          <div className="p-6 rounded-2xl bg-sky-950/40 border border-sky-500/40 flex items-center gap-4">
            <Clock className="w-10 h-10 text-sky-400 shrink-0" />
            <div>
              <h2 className="text-lg font-black text-white">بانتظار الدفع أو الاعتماد المالي</h2>
              <p className="text-xs text-sky-200 mt-1">
                طلب تجديد العضوية قيد المعالجة أو بانتظار سداد الرسوم وتأكيد الإدارة.
              </p>
            </div>
          </div>
        );
    }
  };

  const clubMeta = result?.player
    ? OFFICIAL_REAL_CLUBS.find((c) => c.nameAr === result.player.teamName)
    : undefined;
  const DivEmblem = result?.player?.divisionId ? DIVISION_EMBLEMS[result.player.divisionId] : null;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div>
          <div className="text-xs font-bold text-amber-400 flex items-center gap-1.5 mb-1">
            <QrCode className="w-4 h-4" />
            <span>بوابة التحقق الرسمي من بطاقات العضوية</span>
          </div>
          <h1 className="text-2xl font-black text-white">التحقق من صحة البطاقة الرقمية IOEF</h1>
        </div>

        <button
          type="button"
          onClick={onBackHome}
          className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-300 flex items-center gap-1.5"
        >
          <ArrowRight className="w-4 h-4 text-amber-400" />
          <span>العودة للمنصة</span>
        </button>
      </div>

      {/* Lookup Search Form */}
      <form onSubmit={handleSubmit} className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
        <label className="block text-xs font-bold text-slate-300">
          أدخل رمز التحقق (Token) أو رقم العضوية (IOEF-M-2026-...) أو كود اللاعب الدائم (IOEF-P-...):
        </label>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            dir="ltr"
            value={queryInput}
            onChange={(e) => setQueryInput(e.target.value)}
            placeholder="IOEF-M-2026-000001 أو IOEF-P-000001"
            className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
          />
          <button
            type="submit"
            disabled={loading || !queryInput.trim()}
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            <span>تحقق الآن</span>
          </button>
        </div>
      </form>

      {/* Verification Output */}
      {loading ? (
        <div className="py-12 text-center text-slate-400 text-xs">
          <Loader2 className="w-7 h-7 animate-spin text-amber-400 mx-auto mb-2" />
          <span>جاري الاستعلام من سجل العضويات المعتمد...</span>
        </div>
      ) : (
        searched &&
        result && (
          <div className="space-y-5">
            {renderVerdictBanner()}

            {result.found && result.player && result.membership && (
              <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-5 shadow-xl">
                <div className="flex flex-col sm:flex-row items-center gap-4 pb-4 border-b border-slate-800">
                  <div className="w-20 h-24 rounded-xl overflow-hidden border-2 border-amber-500/40 bg-slate-950 flex items-center justify-center shrink-0">
                    {result.player.photoUrl ? (
                      <img src={result.player.photoUrl} alt={result.player.fullName} className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-8 h-8 text-amber-400" />
                    )}
                  </div>

                  <div className="flex-1 text-center sm:text-right">
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                      <h3 className="text-xl font-black text-white">{result.player.fullName}</h3>
                      <span className="text-xs font-mono font-bold text-amber-400">@{result.player.gamerTag}</span>
                    </div>
                    <div className="flex items-center justify-center sm:justify-start gap-2 mt-2">
                      {DivEmblem && <DivEmblem className="w-6 h-6" />}
                      <span className="text-xs text-slate-300 font-bold">{result.player.divisionNameAr}</span>
                    </div>
                  </div>

                  {clubMeta && (
                    <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 px-3 py-2 rounded-xl">
                      <ClubCrestBadge
                        shortName={clubMeta.shortName}
                        name={result.player.teamName}
                        primaryColor={clubMeta.primaryColor}
                        secondaryColor={clubMeta.secondaryColor}
                        size="md"
                      />
                      <div className="text-right">
                        <div className="text-[10px] text-slate-400">الفريق</div>
                        <div className="text-xs font-black text-white">{result.player.teamName}</div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                    <span className="text-[10px] text-slate-400 block mb-1">رقم العضوية الرسمي</span>
                    <span className="font-mono font-black text-amber-300 tabular-nums">{result.membership.membershipNumber}</span>
                  </div>
                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                    <span className="text-[10px] text-slate-400 block mb-1">كود اللاعب الدائم</span>
                    <span className="font-mono font-black text-emerald-300 tabular-nums">{result.player.playerCode}</span>
                  </div>
                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                    <span className="text-[10px] text-slate-400 block mb-1">الدرجة والموسم</span>
                    <span className="font-bold text-white">الدرجة {result.player.divisionTier} · {result.membership.season}</span>
                  </div>
                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                    <span className="text-[10px] text-slate-400 block mb-1">تاريخ الإصدار</span>
                    <span className="font-mono text-slate-200 tabular-nums">{formatDate(result.membership.issuedAt)}</span>
                  </div>
                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                    <span className="text-[10px] text-slate-400 block mb-1">تاريخ الانتهاء</span>
                    <span className="font-mono text-slate-200 tabular-nums">{formatDate(result.membership.expiresAt)}</span>
                  </div>
                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                    <span className="text-[10px] text-slate-400 block mb-1">إصدار البطاقة</span>
                    <span className="font-mono text-slate-200 tabular-nums">v{result.membership.cardVersion}</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-[11px] text-slate-400 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>لأغراض الخصوصية والأمان، تعرض هذه البوابة البيانات الرياضية وحالة العضوية الرسمية فقط دون كشف أي بيانات اتصال شخصية.</span>
                </div>
              </div>
            )}
          </div>
        )
      )}
    </div>
  );
};
