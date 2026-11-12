import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import {
  Division,
  MembershipRecord,
  MembershipSettings,
  MembershipStatus,
  Player,
  SubscriptionPayment,
  Team,
} from '../types';
import {
  CreditCard,
  ShieldCheck,
  RefreshCw,
  Ban,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowLeftRight,
  Bell,
  Loader2,
  Sparkles,
  CalendarPlus,
  PauseCircle,
  PlayCircle,
  Eye,
  Lock,
} from 'lucide-react';
import { useToast } from '../context/ToastContext';

interface AdminMembershipPanelProps {
  isPresident: boolean;
  players: Player[];
  teams: Team[];
  divisions: Division[];
  onRefreshAll: () => void;
}

const MEM_STATUS_LABELS: Record<MembershipStatus, { text: string; cls: string }> = {
  free: { text: 'مجاني (الموسم 1)', cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
  active: { text: 'نشط مدفوع', cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
  pending_payment: { text: 'في انتظار الدفع', cls: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
  pending_review: { text: 'بانتظار المراجعة', cls: 'bg-sky-500/15 text-sky-300 border-sky-500/30' },
  expired: { text: 'منتهي', cls: 'bg-rose-500/15 text-rose-300 border-rose-500/30' },
  suspended: { text: 'موقوف', cls: 'bg-rose-600/20 text-rose-300 border-rose-500/40' },
};

export const AdminMembershipPanel: React.FC<AdminMembershipPanelProps> = ({
  isPresident,
  players,
  teams,
  divisions,
  onRefreshAll,
}) => {
  const { addToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [memberships, setMemberships] = useState<MembershipRecord[]>([]);
  const [payments, setPayments] = useState<SubscriptionPayment[]>([]);
  const [memSettings, setMemSettings] = useState<MembershipSettings | null>(null);
  const [auditReport, setAuditReport] = useState<any>(null);
  const [loadingAudit, setLoadingAudit] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');

  // President Pricing Settings Form
  const [freeFirstSeason, setFreeFirstSeason] = useState(true);
  const [renewalFee, setRenewalFee] = useState(5);
  const [currency, setCurrency] = useState('USD');
  const [feeEffectiveSeason, setFeeEffectiveSeason] = useState('2027/2028');
  const [feeEffectiveDate, setFeeEffectiveDate] = useState('2027-08-01');
  const [durationDays, setDurationDays] = useState(365);
  const [graceDays, setGraceDays] = useState(30);
  const [renewalsEnabled, setRenewalsEnabled] = useState(false);
  const [vodafoneCashNumber, setVodafoneCashNumber] = useState('');
  const [instaPayAddress, setInstaPayAddress] = useState('');
  const [savingPricing, setSavingPricing] = useState(false);

  // Club Transfer Form
  const [transferPlayerId, setTransferPlayerId] = useState(players[0]?.id || '');
  const [transferTeamId, setTransferTeamId] = useState('');
  const [transferNotes, setTransferNotes] = useState('');
  const [transferring, setTransferring] = useState(false);

  // Inline Action Modals
  const [revokeTarget, setRevokeTarget] = useState<MembershipRecord | null>(null);
  const [revokeReason, setRevokeReason] = useState('');
  const [proofPreview, setProofPreview] = useState<SubscriptionPayment | null>(null);
  const [rejectPayTarget, setRejectPayTarget] = useState<SubscriptionPayment | null>(null);
  const [rejectPayReason, setRejectPayReason] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [mems, pays, ms] = await Promise.all([
        api.getMemberships(),
        api.getPayments(),
        api.getMembershipSettings(),
      ]);
      setMemberships(mems);
      setPayments(pays);
      setMemSettings(ms);

      setFreeFirstSeason(ms.freeFirstSeason);
      setRenewalFee(ms.renewalFee);
      setCurrency(ms.currency);
      setFeeEffectiveSeason(ms.feeEffectiveSeason);
      setFeeEffectiveDate(ms.feeEffectiveDate);
      setDurationDays(ms.membershipDurationDays);
      setGraceDays(ms.gracePeriodDays);
      setRenewalsEnabled(ms.renewalsEnabled);
      setVodafoneCashNumber(ms.vodafoneCashNumber);
      setInstaPayAddress(ms.instaPayAddress);
    } catch (err: any) {
      addToast({ type: 'disciplinary', title: 'خطأ في التحميل', message: err?.message || 'تعذر جلب بيانات العضويات.', badge: 'النظام' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  useEffect(() => {
    if (players.length > 0 && !players.some((p) => p.id === transferPlayerId)) {
      setTransferPlayerId(players[0].id);
    }
  }, [players]);

  const availableTransferTeams = teams.filter(
    (t) => t.registrationStatus === 'available' || !t.playerId
  );

  useEffect(() => {
    if (availableTransferTeams.length > 0 && !availableTransferTeams.some((t) => t.id === transferTeamId)) {
      setTransferTeamId(availableTransferTeams[0].id);
    }
  }, [teams]);

  const handleSavePricing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPresident) return;
    setSavingPricing(true);
    try {
      const res = await api.updateMembershipSettings({
        freeFirstSeason,
        renewalFee: Number(renewalFee),
        currency,
        feeEffectiveSeason,
        feeEffectiveDate,
        membershipDurationDays: Number(durationDays),
        gracePeriodDays: Number(graceDays),
        renewalsEnabled,
        vodafoneCashNumber,
        instaPayAddress,
      });
      setMemSettings(res.membershipSettings);
      addToast({
        type: 'system',
        title: 'تم تحديث سياسة الاشتراكات',
        message: `رسوم التجديد للموسم ${feeEffectiveSeason}: ${renewalFee} ${currency}.`,
        badge: 'قرار رئاسي',
      });
      onRefreshAll();
    } catch (err: any) {
      addToast({ type: 'disciplinary', title: 'خطأ', message: err?.message || 'تعذر حفظ التسعير.', badge: 'خطأ' });
    } finally {
      setSavingPricing(false);
    }
  };

  const handleReissueCard = async (memId: string) => {
    setBusyId(memId);
    try {
      await api.reissueMembershipCard(memId, 'إعادة إصدار بطاقة وتحديث رمز التحقق QR');
      addToast({ type: 'system', title: 'تم إعادة إصدار البطاقة', message: 'تم توليد رمز QR جديد وإبطال الرمز السابق فوراً.', badge: 'العضوية' });
      await loadData();
      onRefreshAll();
    } catch (err: any) {
      addToast({ type: 'disciplinary', title: 'فشل الإجراء', message: err?.message || 'حدث خطأ.', badge: 'خطأ' });
    } finally {
      setBusyId(null);
    }
  };

  const handleConfirmRevoke = async () => {
    if (!revokeTarget || !revokeReason.trim()) return;
    setBusyId(revokeTarget.id);
    try {
      await api.revokeMembershipCard(revokeTarget.id, revokeReason.trim());
      setRevokeTarget(null);
      setRevokeReason('');
      addToast({ type: 'disciplinary', title: 'تم إلغاء البطاقة الرقمية', message: 'تم إيقاف صلاحية البطاقة ورمز QR الخاص بها فوراً.', badge: 'العضوية' });
      await loadData();
      onRefreshAll();
    } catch (err: any) {
      addToast({ type: 'disciplinary', title: 'خطأ', message: err?.message || 'تعذر الإلغاء.', badge: 'خطأ' });
    } finally {
      setBusyId(null);
    }
  };

  const handleStatusAction = async (memId: string, action: 'suspend' | 'activate' | 'extend') => {
    setBusyId(memId);
    try {
      await api.updateMembershipStatus(memId, action, action === 'extend' ? { extendDays: 365 } : undefined);
      addToast({
        type: 'system',
        title: action === 'suspend' ? 'تم تعليق العضوية' : action === 'extend' ? 'تم التمديد 365 يوماً' : 'تم تنشيط العضوية',
        message: 'تم تحديث حالة العضوية وإرسال إشعار للاعب.',
        badge: 'العضوية',
      });
      await loadData();
      onRefreshAll();
    } catch (err: any) {
      addToast({ type: 'disciplinary', title: 'خطأ', message: err?.message || 'تعذر تنفيذ الإجراء.', badge: 'خطأ' });
    } finally {
      setBusyId(null);
    }
  };

  const handleReviewPayment = async (payId: string, decision: 'approved' | 'rejected', notes?: string) => {
    setBusyId(payId);
    try {
      await api.reviewPayment(payId, decision, notes);
      addToast({
        type: decision === 'approved' ? 'system' : 'disciplinary',
        title: decision === 'approved' ? 'تم اعتماد الدفع وتجديد العضوية' : 'تم رفض إثبات الدفع',
        message: decision === 'approved' ? 'تم تفعيل اشتراك اللاعب وإصدار الإيصال المعتمد.' : 'تم إشعار اللاعب بسبب الرفض.',
        badge: 'المراجعة المالية',
      });
      await loadData();
      onRefreshAll();
    } catch (err: any) {
      addToast({ type: 'disciplinary', title: 'تعذر المراجعة', message: err?.message || 'حدث خطأ.', badge: 'خطأ' });
    } finally {
      setBusyId(null);
    }
  };

  const handleRunExpiringAlerts = async () => {
    setBusyId('expiring_scan');
    try {
      const res = await api.runExpiringAlerts();
      addToast({
        type: 'system',
        title: 'فحص الانتهاء المبكر للعضويات',
        message:
          res.alertedCount > 0
            ? `تم إرسال تذكير تجديد لـ ${res.alertedCount} عضو (${res.alertedNumbers.join('، ')}).`
            : 'لا توجد بطاقات قريبة الانتهاء تستحق التذكير حالياً.',
        badge: 'الإشعارات',
      });
      onRefreshAll();
    } catch (err: any) {
      addToast({ type: 'disciplinary', title: 'خطأ', message: err?.message || 'فشل الفحص.', badge: 'خطأ' });
    } finally {
      setBusyId(null);
    }
  };

  const handleExecuteTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferPlayerId || !transferTeamId) return;
    setTransferring(true);
    try {
      const res = await api.transferPlayerClub(transferPlayerId, transferTeamId, transferNotes || 'انتقال رسمي معتمد');
      addToast({
        type: 'system',
        title: 'تم اعتماد انتقال اللاعب بنجاح',
        message: `انتقل ${res.player.fullName} إلى ${res.transfer.toTeamName} مع احتفاظه برقمه الدائم (${res.transfer.playerCode}).`,
        badge: 'شؤون اللاعبين',
      });
      setTransferNotes('');
      await loadData();
      onRefreshAll();
    } catch (err: any) {
      addToast({ type: 'disciplinary', title: 'تعذر الانتقال', message: err?.message || 'حدث خطأ.', badge: 'خطأ' });
    } finally {
      setTransferring(false);
    }
  };

  const handleRunAiAudit = async () => {
    setLoadingAudit(true);
    try {
      const res = await api.getMembershipAuditReport();
      if (res.success && res.report) setAuditReport(res.report);
    } catch (err: any) {
      addToast({ type: 'disciplinary', title: 'تعذر تشغيل التدقيق', message: err?.message || 'حدث خطأ.', badge: 'AI Audit' });
    } finally {
      setLoadingAudit(false);
    }
  };

  const filteredMemberships =
    statusFilter === 'all' ? memberships : memberships.filter((m) => m.status === statusFilter);
  const filteredPayments =
    paymentFilter === 'all' ? payments : payments.filter((p) => p.status === paymentFilter);

  if (loading) {
    return (
      <div className="py-12 text-center text-slate-400 text-xs">
        <Loader2 className="w-6 h-6 animate-spin text-amber-400 mx-auto mb-2" />
        <span>جاري تحميل سجلات العضويات الرقمية والاشتراكات...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Top KPI Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
          <div className="text-xs text-slate-400">البطاقات الرقمية المصدرة</div>
          <div className="text-2xl font-black font-mono text-amber-400 mt-1 tabular-nums">{memberships.length}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            نشط/مجاني: {memberships.filter((m) => m.status === 'free' || m.status === 'active').length}
          </div>
        </div>
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
          <div className="text-xs text-slate-400">إيصالات بانتظار المراجعة</div>
          <div className="text-2xl font-black font-mono text-sky-400 mt-1 tabular-nums">
            {payments.filter((p) => p.status === 'pending_review').length}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">تتطلب مطابقة إثبات الدفع يدوياً</div>
        </div>
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
          <div className="text-xs text-slate-400">عضويات منتهية أو موقوفة</div>
          <div className="text-2xl font-black font-mono text-rose-400 mt-1 tabular-nums">
            {memberships.filter((m) => m.status === 'expired' || m.status === 'suspended' || m.cardStatus === 'revoked').length}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">السجل الرياضي محفوظ بالكامل دائماً</div>
        </div>
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
          <div className="text-xs text-slate-400">بوابة Visa الآلية (API)</div>
          <div className={`text-sm font-black mt-2 ${memSettings?.visaGatewayConfigured ? 'text-emerald-400' : 'text-amber-400'}`}>
            {memSettings?.visaGatewayConfigured ? 'مفعلة بمفتاح الربط' : 'غير مفعلة (تتطلب Paymob/Stripe)'}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">فودافون كاش وإنستا باي يعملان بالمراجعة</div>
        </div>
      </div>

      {/* 1. President-Only Renewal Fee & Subscription Governance Settings */}
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <CreditCard className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="text-sm font-black text-white">سياسة العضويات ورسوم التجديد الموسمية</h3>
              <p className="text-[11px] text-slate-400">
                الموسم الأول مجاني بالكامل؛ يحدد رئيس الاتحاد لاحقاً الرسوم الرمزية وتاريخ سريانها من هنا.
              </p>
            </div>
          </div>
          {!isPresident && (
            <span className="text-[11px] px-2.5 py-1 rounded-md bg-slate-950 border border-slate-800 text-amber-300 flex items-center gap-1 font-bold">
              <Lock className="w-3.5 h-3.5" />
              <span>التعديل حصري لرئيس الاتحاد</span>
            </span>
          )}
        </div>

        <form onSubmit={handleSavePricing} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <label className="flex items-center gap-2.5 p-3 bg-slate-950 border border-slate-800 rounded-xl cursor-pointer">
            <input
              type="checkbox"
              disabled={!isPresident}
              checked={freeFirstSeason}
              onChange={(e) => setFreeFirstSeason(e.target.checked)}
              className="w-4 h-4 text-amber-500 rounded"
            />
            <span className="font-bold text-white">الموسم الأول مجاني بالكامل</span>
          </label>

          <label className="flex items-center gap-2.5 p-3 bg-slate-950 border border-slate-800 rounded-xl cursor-pointer">
            <input
              type="checkbox"
              disabled={!isPresident}
              checked={renewalsEnabled}
              onChange={(e) => setRenewalsEnabled(e.target.checked)}
              className="w-4 h-4 text-amber-500 rounded"
            />
            <span className="font-bold text-white">تفعيل تحصيل تجديد الموسم القادم</span>
          </label>

          <div>
            <label className="block text-slate-400 mb-1">رسوم التجديد الرمزية</label>
            <div className="flex gap-1.5">
              <input
                type="number"
                min={0}
                step="0.5"
                disabled={!isPresident}
                value={renewalFee}
                onChange={(e) => setRenewalFee(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
              />
              <select
                disabled={!isPresident}
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-2 text-amber-400 font-mono"
              >
                <option value="USD">USD</option>
                <option value="EGP">EGP</option>
                <option value="SAR">SAR</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-400 mb-1">الموسم وتاريخ تطبيق الرسوم</label>
            <div className="flex gap-1.5">
              <input
                type="text"
                disabled={!isPresident}
                value={feeEffectiveSeason}
                onChange={(e) => setFeeEffectiveSeason(e.target.value)}
                className="w-28 bg-slate-950 border border-slate-700 rounded-lg px-2 py-2 text-white font-mono"
              />
              <input
                type="date"
                disabled={!isPresident}
                value={feeEffectiveDate}
                onChange={(e) => setFeeEffectiveDate(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-2 py-2 text-white font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-400 mb-1">رقم محفظة Vodafone Cash الرسمي</label>
            <input
              type="text"
              dir="ltr"
              disabled={!isPresident}
              value={vodafoneCashNumber}
              onChange={(e) => setVodafoneCashNumber(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1">عنوان InstaPay الرسمي (IPA)</label>
            <input
              type="text"
              dir="ltr"
              disabled={!isPresident}
              value={instaPayAddress}
              onChange={(e) => setInstaPayAddress(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1">مدة الصلاحية / السماح (يوم)</label>
            <div className="flex gap-1.5">
              <input
                type="number"
                disabled={!isPresident}
                value={durationDays}
                onChange={(e) => setDurationDays(Number(e.target.value))}
                className="w-1/2 bg-slate-950 border border-slate-700 rounded-lg px-2 py-2 text-white font-mono"
              />
              <input
                type="number"
                disabled={!isPresident}
                value={graceDays}
                onChange={(e) => setGraceDays(Number(e.target.value))}
                className="w-1/2 bg-slate-950 border border-slate-700 rounded-lg px-2 py-2 text-white font-mono"
              />
            </div>
          </div>

          {isPresident && (
            <div className="flex items-end">
              <button
                type="submit"
                disabled={savingPricing}
                className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl transition-colors"
              >
                {savingPricing ? 'جاري الحفظ...' : 'اعتماد إعدادات الاشتراك'}
              </button>
            </div>
          )}
        </form>
      </div>

      {/* 2. Digital Membership Cards Registry & Lifecycle Controls */}
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h3 className="text-sm font-black text-white">سجل بطاقات العضوية الرقمية ({filteredMemberships.length})</h3>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
            >
              <option value="all">جميع الحالات</option>
              <option value="free">مجاني (الموسم 1)</option>
              <option value="active">نشط مدفوع</option>
              <option value="pending_payment">بانتظار الدفع</option>
              <option value="pending_review">قيد المراجعة</option>
              <option value="expired">منتهي</option>
              <option value="suspended">موقوف</option>
            </select>

            <button
              type="button"
              onClick={handleRunExpiringAlerts}
              disabled={busyId === 'expiring_scan'}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-amber-300 flex items-center gap-1.5"
            >
              {busyId === 'expiring_scan' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bell className="w-3.5 h-3.5" />}
              <span>تنبيه العضويات قريبة الانتهاء</span>
            </button>
          </div>
        </div>

        {filteredMemberships.length === 0 ? (
          <div className="py-10 text-center text-xs text-slate-500">
            لا توجد بطاقات عضوية في هذه الفئة بعد. يتم إصدار البطاقة تلقائياً بمجرد اعتماد تسجيل أي لاعب.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="border-b border-slate-800 text-slate-400">
                <tr>
                  <th className="py-2.5 px-3">رقم العضوية · الكود الدائم</th>
                  <th className="py-2.5 px-3">اللاعب والنادي</th>
                  <th className="py-2.5 px-3">الحالة</th>
                  <th className="py-2.5 px-3">الانتهاء</th>
                  <th className="py-2.5 px-3">إجراءات البطاقة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredMemberships.map((mem) => {
                  const p = players.find((pl) => pl.id === mem.playerId);
                  const st = MEM_STATUS_LABELS[mem.status] || MEM_STATUS_LABELS.active;
                  return (
                    <tr key={mem.id} className="hover:bg-slate-950/60">
                      <td className="py-3 px-3 font-mono">
                        <div className="font-bold text-amber-300">{mem.membershipNumber}</div>
                        <div className="text-[11px] text-emerald-300">{mem.playerCode} · v{mem.cardVersion}</div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-white">{p?.fullName || mem.playerId}</div>
                        <div className="text-[11px] text-slate-400">{mem.teamName} · الدرجة {mem.divisionTier}</div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex flex-col items-start gap-1">
                          <span className={`px-2 py-0.5 rounded border text-[10px] font-bold ${st.cls}`}>{st.text}</span>
                          {mem.cardStatus === 'revoked' && (
                            <span className="px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-500/40 text-[10px] font-bold">
                              بطاقة QR ملغاة
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] text-slate-300 tabular-nums">
                        {mem.expiresAt.split('T')[0]}
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <button
                            type="button"
                            disabled={busyId === mem.id}
                            onClick={() => handleReissueCard(mem.id)}
                            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold flex items-center gap-1"
                            title="إعادة إصدار QR جديد وإلغاء القديم"
                          >
                            <RefreshCw className="w-3 h-3" />
                            <span>إعادة إصدار QR</span>
                          </button>

                          {mem.cardStatus !== 'revoked' && (
                            <button
                              type="button"
                              onClick={() => {
                                setRevokeTarget(mem);
                                setRevokeReason('');
                              }}
                              className="px-2.5 py-1 rounded bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 font-bold flex items-center gap-1 border border-rose-500/30"
                            >
                              <Ban className="w-3 h-3" />
                              <span>إلغاء البطاقة</span>
                            </button>
                          )}

                          {mem.status === 'suspended' ? (
                            <button
                              type="button"
                              disabled={busyId === mem.id}
                              onClick={() => handleStatusAction(mem.id, 'activate')}
                              className="px-2.5 py-1 rounded bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 font-bold flex items-center gap-1 border border-emerald-500/30"
                            >
                              <PlayCircle className="w-3 h-3" />
                              <span>تفعيل</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={busyId === mem.id}
                              onClick={() => handleStatusAction(mem.id, 'suspend')}
                              className="px-2.5 py-1 rounded bg-slate-950 hover:bg-rose-950/50 text-slate-300 hover:text-rose-300 font-bold flex items-center gap-1 border border-slate-800"
                            >
                              <PauseCircle className="w-3 h-3" />
                              <span>تعليق</span>
                            </button>
                          )}

                          <button
                            type="button"
                            disabled={busyId === mem.id}
                            onClick={() => handleStatusAction(mem.id, 'extend')}
                            className="px-2.5 py-1 rounded bg-sky-950/60 hover:bg-sky-900/60 text-sky-300 font-bold flex items-center gap-1 border border-sky-500/30"
                          >
                            <CalendarPlus className="w-3 h-3" />
                            <span>+سنة</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 3. Payment Proofs Verification Queue */}
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-amber-400" />
            <h3 className="text-sm font-black text-white">مراجعة طلبات الدفع وإيصالات التجديد ({filteredPayments.length})</h3>
          </div>
          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
          >
            <option value="all">جميع الإيصالات</option>
            <option value="pending_review">بانتظار المراجعة</option>
            <option value="approved">معتمدة</option>
            <option value="rejected">مرفوضة</option>
          </select>
        </div>

        {filteredPayments.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500">لا توجد عمليات دفع مقدمة حالياً.</div>
        ) : (
          <div className="space-y-3">
            {filteredPayments.map((pay) => (
              <div key={pay.id} className="p-4 bg-slate-950 border border-slate-800 rounded-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4 text-xs">
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-black text-amber-400">{pay.receiptNumber}</span>
                    <span className="font-bold text-white">{pay.playerName}</span>
                    <span className="font-mono text-emerald-300">({pay.playerCode})</span>
                    <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 font-mono text-[10px]">
                      {pay.paymentMethod}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        pay.status === 'approved'
                          ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                          : pay.status === 'rejected'
                          ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                          : 'bg-sky-500/15 text-sky-300 border-sky-500/30'
                      }`}
                    >
                      {pay.status === 'approved' ? 'معتمد' : pay.status === 'rejected' ? 'مرفوض' : 'بانتظار المراجعة'}
                    </span>
                  </div>
                  <div className="text-slate-400 font-mono text-[11px]">
                    المبلغ: <strong className="text-white">{pay.amount} {pay.currency}</strong> · المرسل: {pay.senderReference} · رقم العملية: {pay.transactionRef}
                  </div>
                  {pay.fraudFlags?.length > 0 && (
                    <div className="p-2 rounded-lg bg-amber-950/40 border border-amber-500/40 text-amber-300 text-[11px] flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>تنبيه تدقيق آلي: {pay.fraudFlags.join(' | ')}</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {pay.proofImageUrl && (
                    <button
                      type="button"
                      onClick={() => setProofPreview(pay)}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5 text-amber-400" />
                      <span>معاينة الإيصال</span>
                    </button>
                  )}

                  {pay.status === 'pending_review' && (
                    <>
                      <button
                        type="button"
                        disabled={busyId === pay.id}
                        onClick={() => handleReviewPayment(pay.id, 'approved')}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>اعتماد وتفعيل</span>
                      </button>
                      <button
                        type="button"
                        disabled={busyId === pay.id}
                        onClick={() => {
                          setRejectPayTarget(pay);
                          setRejectPayReason('');
                        }}
                        className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold flex items-center gap-1"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>رفض</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. Transfers & AI Membership Audit Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Club Transfer Panel */}
        <form onSubmit={handleExecuteTransfer} className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-4 text-xs">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <ArrowLeftRight className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="text-sm font-black text-white">نقل لاعب رسمي إلى نادٍ آخر</h3>
              <p className="text-[11px] text-slate-400">يحتفظ اللاعب بنفس رقم اللاعب الدائم ورقم العضوية دون أي تغيير.</p>
            </div>
          </div>

          {players.length === 0 ? (
            <div className="py-6 text-center text-slate-500">لا يوجد لاعبون معتمدون للنقل بعد.</div>
          ) : (
            <>
              <div>
                <label className="block text-slate-300 font-bold mb-1">اختر اللاعب المعتمد:</label>
                <select
                  value={transferPlayerId}
                  onChange={(e) => setTransferPlayerId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                >
                  {players.map((p) => (
                    <option key={p.id} value={p.id}>
                      [{p.playerCode}] {p.fullName} — النادي الحالي: {p.teamName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">النادي الجديد المتاح ({availableTransferTeams.length}):</label>
                <select
                  value={transferTeamId}
                  onChange={(e) => setTransferTeamId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                >
                  {availableTransferTeams.map((t) => {
                    const d = divisions.find((dv) => dv.id === t.divisionId);
                    return (
                      <option key={t.id} value={t.id}>
                        {t.name} ({d?.code} · الدرجة {t.divisionTier})
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">ملاحظات القرار الإداري:</label>
                <input
                  type="text"
                  value={transferNotes}
                  onChange={(e) => setTransferNotes(e.target.value)}
                  placeholder="انتقال رسمي خلال فترة الانتقالات..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <button
                type="submit"
                disabled={transferring || !transferPlayerId || !transferTeamId}
                className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl transition-colors disabled:opacity-50"
              >
                {transferring ? 'جاري اعتماد الانتقال...' : 'اعتماد الانتقال وحفظ السجل الدائم'}
              </button>
            </>
          )}
        </form>

        {/* AI Membership Audit Panel */}
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-4 text-xs">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <div>
                <h3 className="text-sm font-black text-white">تقرير التدقيق الذكي للعضويات والمالية</h3>
                <p className="text-[11px] text-slate-400">استكشاف الإيصالات المشتبه بها وقرب انتهاء العضويات دون اتخاذ قرار آلي.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleRunAiAudit}
              disabled={loadingAudit}
              className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black flex items-center gap-1.5"
            >
              {loadingAudit ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              <span>تشغيل التدقيق</span>
            </button>
          </div>

          {!auditReport ? (
            <div className="py-8 text-center text-slate-500">
              اضغط على "تشغيل التدقيق" للحصول على ملخص إحصائي فوري وتنبيهات المراجع أو الإيصالات المتطابقة.
            </div>
          ) : (
            <div className="space-y-3">
              <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl whitespace-pre-line leading-relaxed text-slate-200">
                {auditReport.narrativeReport}
              </div>
              {auditReport.expiringSoon?.length > 0 && (
                <div className="p-3 bg-amber-950/30 border border-amber-500/30 rounded-xl space-y-1">
                  <div className="font-bold text-amber-300">عضويات تنتهي خلال 30 يوماً:</div>
                  {auditReport.expiringSoon.map((ex: any) => (
                    <div key={ex.membershipId} className="text-[11px] text-slate-300 font-mono">
                      • {ex.playerName} ({ex.membershipNumber}) — متبقي {ex.daysLeft} يوم
                    </div>
                  ))}
                </div>
              )}
              <div className="text-[10px] text-slate-500">{auditReport.governanceNote}</div>
            </div>
          )}
        </div>
      </div>

      {/* Inline Modals */}
      {revokeTarget && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-500/40 rounded-2xl max-w-md w-full p-6 space-y-4 text-xs shadow-2xl">
            <h3 className="text-base font-black text-white">إلغاء صلاحية البطاقة: {revokeTarget.membershipNumber}</h3>
            <p className="text-slate-400">سيتم إبطال رمز التحقق QR فوراً عند المسح مع حفظ سجل اللاعب الرياضي:</p>
            <textarea
              rows={3}
              value={revokeReason}
              onChange={(e) => setRevokeReason(e.target.value)}
              placeholder="اكتب سبب الإلغاء الرسمي..."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setRevokeTarget(null)} className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 font-bold">
                تراجع
              </button>
              <button
                disabled={!revokeReason.trim() || busyId === revokeTarget.id}
                onClick={handleConfirmRevoke}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-black disabled:opacity-40"
              >
                تأكيد الإلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {rejectPayTarget && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-500/40 rounded-2xl max-w-md w-full p-6 space-y-4 text-xs shadow-2xl">
            <h3 className="text-base font-black text-white">رفض إثبات الدفع: {rejectPayTarget.receiptNumber}</h3>
            <textarea
              rows={3}
              value={rejectPayReason}
              onChange={(e) => setRejectPayReason(e.target.value)}
              placeholder="سبب الرفض (مثال: المرجع غير مطابق لكشف الحساب)..."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setRejectPayTarget(null)} className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 font-bold">
                إلغاء
              </button>
              <button
                disabled={!rejectPayReason.trim() || busyId === rejectPayTarget.id}
                onClick={async () => {
                  const id = rejectPayTarget.id;
                  const r = rejectPayReason.trim();
                  setRejectPayTarget(null);
                  await handleReviewPayment(id, 'rejected', r);
                }}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-black disabled:opacity-40"
              >
                تأكيد الرفض
              </button>
            </div>
          </div>
        </div>
      )}

      {proofPreview && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-5 space-y-4 text-xs shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="font-black text-white">معاينة إثبات التحويل ({proofPreview.receiptNumber})</h3>
              <button onClick={() => setProofPreview(null)} className="text-slate-400 hover:text-white font-bold">
                إغلاق
              </button>
            </div>
            {proofPreview.proofImageUrl && (
              <img
                src={proofPreview.proofImageUrl}
                alt="إثبات التحويل"
                className="w-full max-h-96 object-contain rounded-xl bg-slate-950 border border-slate-800"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};
