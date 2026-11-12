import React, { useState, useEffect, useMemo } from 'react';
import {
  Player,
  SquadEditRecord,
  Division,
  RosterPlayer,
  MembershipRecord,
  MembershipSettings,
  PlayerTransferRecord,
  MatchFixture,
  DisciplinaryAction,
  SubscriptionPayment,
  SubscriptionPaymentMethod,
} from '../types';
import { api } from '../services/api';
import {
  User,
  Shield,
  Lock,
  Unlock,
  Camera,
  Sparkles,
  History,
  CheckCircle2,
  AlertCircle,
  Loader2,
  LayoutGrid,
  Image as ImageIcon,
  Users,
  Plus,
  Trash2,
  Send,
  QrCode,
  CreditCard,
  Award,
  ArrowLeftRight,
  Trophy,
  Clock,
  Receipt,
  AlertTriangle,
} from 'lucide-react';
import { TacticalPitchView } from '../components/TacticalPitchView';
import { ClubCrestBadge } from '../components/OfficialEmblems';
import { OFFICIAL_REAL_CLUBS } from '../data/officialClubs';
import { MembershipCard } from '../components/MembershipCard';
import { useToast } from '../context/ToastContext';

interface PlayerProfilePageProps {
  players: Player[];
  divisions: Division[];
  onPlayerUpdated: () => void;
  onVerifyCard?: (token: string) => void;
}

type ProfileSectionTab = 'card' | 'squad' | 'career' | 'subscription';

const POSITIONS = ['GK', 'CB', 'LB', 'RB', 'DMF', 'CMF', 'AMF', 'LWF', 'RWF', 'SS', 'CF'];

const PAYMENT_METHOD_AR: Record<SubscriptionPaymentMethod, string> = {
  vodafone_cash: 'فودافون كاش (Vodafone Cash)',
  instapay: 'إنستا باي (InstaPay)',
  visa: 'بطاقة فيزا (Visa)',
};

const PAYMENT_STATUS_AR: Record<SubscriptionPayment['status'], { text: string; cls: string }> = {
  pending_review: { text: 'بانتظار مراجعة الإدارة', cls: 'bg-sky-500/15 text-sky-300 border-sky-500/30' },
  approved: { text: 'معتمد ومفعل', cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
  rejected: { text: 'مرفوض', cls: 'bg-rose-500/15 text-rose-300 border-rose-500/30' },
};

export const PlayerProfilePage: React.FC<PlayerProfilePageProps> = ({
  players,
  divisions,
  onPlayerUpdated,
  onVerifyCard,
}) => {
  const { addToast } = useToast();
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>(players[0]?.id || '');
  const [activeProfileTab, setActiveProfileTab] = useState<ProfileSectionTab>('card');

  const [player, setPlayer] = useState<Player | null>(null);
  const [membership, setMembership] = useState<MembershipRecord | null>(null);
  const [memSettings, setMemSettings] = useState<MembershipSettings | null>(null);
  const [transfers, setTransfers] = useState<PlayerTransferRecord[]>([]);
  const [playerFixtures, setPlayerFixtures] = useState<MatchFixture[]>([]);
  const [playerDisciplinary, setPlayerDisciplinary] = useState<DisciplinaryAction[]>([]);
  const [payments, setPayments] = useState<SubscriptionPayment[]>([]);
  const [edits, setEdits] = useState<SquadEditRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // Portrait upload
  const [uploadingPhoto, setUploadingPhoto] = useState<boolean>(false);

  // Edit Squad Form State
  const [showEditForm, setShowEditForm] = useState<boolean>(false);
  const [newRating, setNewRating] = useState<number>(3220);
  const [newFormation, setNewFormation] = useState<string>('4-2-1-3');
  const [newImageUrl, setNewImageUrl] = useState<string>('');
  const [newRoster, setNewRoster] = useState<RosterPlayer[]>([]);
  const [editNotes, setEditNotes] = useState<string>('');
  const [savingEdit, setSavingEdit] = useState<boolean>(false);
  const [editMessage, setEditMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [analyzingAi, setAnalyzingAi] = useState<boolean>(false);

  // Unlock Appeal Modal State
  const [showUnlockAppeal, setShowUnlockAppeal] = useState<boolean>(false);
  const [appealReason, setAppealReason] = useState<string>('');
  const [submittingAppeal, setSubmittingAppeal] = useState<boolean>(false);
  const [squadDisplayMode, setSquadDisplayMode] = useState<'pitch' | 'roster' | 'screenshot'>('pitch');

  // Subscription Renewal Payment Form State
  const [payMethod, setPayMethod] = useState<SubscriptionPaymentMethod>('vodafone_cash');
  const [paySenderRef, setPaySenderRef] = useState<string>('');
  const [payTxRef, setPayTxRef] = useState<string>('');
  const [payProofUrl, setPayProofUrl] = useState<string>('');
  const [paySeason, setPaySeason] = useState<string>('2027/2028');
  const [submittingPayment, setSubmittingPayment] = useState<boolean>(false);
  const [paymentMessage, setPaymentMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (players.length > 0 && !players.some((p) => p.id === selectedPlayerId)) {
      setSelectedPlayerId(players[0].id);
    } else if (players.length === 0) {
      setSelectedPlayerId('');
      setPlayer(null);
      setMembership(null);
    }
  }, [players, selectedPlayerId]);

  const loadPlayerData = async (id: string) => {
    if (!id) return;
    setLoading(true);
    try {
      const [dossier, settingsRes] = await Promise.all([
        api.getPlayerCareerDossier(id),
        api.getMembershipSettings().catch(() => null),
      ]);
      if (dossier?.player) {
        setPlayer(dossier.player);
        setMembership(dossier.membership || null);
        setTransfers(dossier.transfers || []);
        setPlayerFixtures(dossier.fixtures || []);
        setPlayerDisciplinary(dossier.disciplinary || []);
        setEdits(dossier.squadEdits || []);
        setPayments(dossier.payments || []);
        setNewRating(dossier.player.squadRating);
        setNewFormation(dossier.player.squadFormation || '4-3-3');
        setNewImageUrl(dossier.player.squadImageUrl || '');
        setNewRoster(dossier.player.roster ? [...dossier.player.roster] : []);
      }
      if (settingsRes) {
        setMemSettings(settingsRes);
        if (settingsRes.feeEffectiveSeason) setPaySeason(settingsRes.feeEffectiveSeason);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedPlayerId) {
      loadPlayerData(selectedPlayerId);
    }
  }, [selectedPlayerId]);

  const handlePlayerPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !player) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      addToast({ type: 'disciplinary', title: 'صيغة غير مدعومة', message: 'يرجى رفع صورة بصيغة JPG أو PNG أو WEBP.', badge: 'تنبيه' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      addToast({ type: 'disciplinary', title: 'حجم الصورة كبير', message: 'الحد الأقصى للصورة الشخصية هو 5 ميجابايت.', badge: 'تنبيه' });
      return;
    }
    setUploadingPhoto(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const b64 = reader.result as string;
        const res = await api.updatePlayerPhoto(player.id, b64);
        if (res.success) {
          addToast({
            type: 'system',
            title: 'تم تحديث الصورة الشخصية',
            message: 'تم ربط الصورة ببطاقة العضوية الرقمية ورمز QR بنجاح.',
            badge: 'العضوية',
          });
          await loadPlayerData(player.id);
          onPlayerUpdated();
        }
      } catch (err: any) {
        addToast({ type: 'disciplinary', title: 'تعذر تحديث الصورة', message: err?.message || 'حدث خطأ', badge: 'خطأ' });
      } finally {
        setUploadingPhoto(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setEditMessage({ type: 'error', text: 'يرجى رفع صورة صالحة بصيغة JPG أو PNG أو WEBP.' });
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setEditMessage({ type: 'error', text: 'حجم الصورة يتجاوز الحد المسموح (8 ميجابايت).' });
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setNewImageUrl(reader.result as string);
      setEditMessage(null);
    };
    reader.readAsDataURL(file);
  };

  const handlePaymentProofUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setPaymentMessage({ type: 'error', text: 'يرجى رفع صورة إيصال صالحة بصيغة JPG أو PNG أو WEBP.' });
      return;
    }
    if (file.size > 6 * 1024 * 1024) {
      setPaymentMessage({ type: 'error', text: 'حجم صورة الإيصال يتجاوز 6 ميجابايت.' });
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setPayProofUrl(reader.result as string);
      setPaymentMessage(null);
    };
    reader.readAsDataURL(file);
  };

  const handleAiScanInProfile = async () => {
    if (!newImageUrl) {
      setEditMessage({ type: 'error', text: 'يرجى رفع لقطة شاشة التشكيلة الجديدة أولاً.' });
      return;
    }
    setAnalyzingAi(true);
    setEditMessage(null);
    try {
      const res = await api.analyzeSquadImage(newImageUrl, player?.divisionTier || 1);
      if (res.success && res.data) {
        setNewRating(res.data.squadRating);
        if (res.data.formation) setNewFormation(res.data.formation);
        if (Array.isArray(res.data.extractedRoster) && res.data.extractedRoster.length > 0) {
          setNewRoster(res.data.extractedRoster);
        }
        setEditMessage({
          type: 'success',
          text: `تم استخراج قوة التشكيلة (${res.data.squadRating}) وقائمة اللاعبين تلقائياً. يمكنك مراجعتها قبل الحفظ.`,
        });
      }
    } catch (e: any) {
      setEditMessage({ type: 'error', text: e?.message || 'تعذر تحليل الصورة عبر الذكاء الاصطناعي.' });
    } finally {
      setAnalyzingAi(false);
    }
  };

  const handleUpdateRosterRow = (idx: number, field: keyof RosterPlayer, value: string | number) => {
    setNewRoster((prev) =>
      prev.map((row, i) => (i === idx ? { ...row, [field]: field === 'rating' ? Number(value) : value } : row))
    );
  };

  const handleAddRosterRow = () => {
    setNewRoster((prev) => [
      ...prev,
      { id: `rp_${Date.now()}_${prev.length}`, name: '', position: 'CMF', rating: 95 },
    ]);
  };

  const handleRemoveRosterRow = (idx: number) => {
    setNewRoster((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSaveSquadModification = async () => {
    if (!player) return;
    if (!newImageUrl) {
      setEditMessage({ type: 'error', text: 'يرجى إرفاق صورة التشكيلة المعتمدة.' });
      return;
    }
    setSavingEdit(true);
    setEditMessage(null);

    try {
      const cleanedRoster = newRoster.filter((r) => r.name.trim().length > 0);
      const res = await api.modifySquad(player.id, {
        newRating: Number(newRating),
        newImageUrl,
        formation: newFormation,
        notes: editNotes || 'تحديث التشكيلة التكتيكية',
        newRoster: cleanedRoster.length > 0 ? cleanedRoster : undefined,
      });

      if (res.success) {
        setEditMessage({ type: 'success', text: res.message || 'تم تحديث التشكيلة وقفله نهائياً.' });
        addToast({
          type: 'system',
          title: 'تم تحديث التشكيلة',
          message: 'تم حفظ التشكيلة الجديدة وتطبيق قفل التعديل التلقائي للموسم.',
          badge: 'ملف اللاعب',
        });
        setShowEditForm(false);
        await loadPlayerData(player.id);
        onPlayerUpdated();
      } else {
        setEditMessage({ type: 'error', text: res.error || res.message || 'تعذر حفظ التعديل.' });
      }
    } catch (err: any) {
      setEditMessage({ type: 'error', text: err?.message || 'تعذر تعديل التشكيلة، يرجى المحاولة لاحقاً.' });
    } finally {
      setSavingEdit(false);
    }
  };

  const handleSubmitUnlockAppeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!player || !appealReason.trim() || submittingAppeal) return;
    setSubmittingAppeal(true);
    try {
      const res = await api.submitSupportTicket({
        senderName: `${player.fullName} (${player.teamName})`,
        senderContact: player.playerCode || player.gamerTag,
        divisionId: player.divisionId,
        ticketSubject: 'squad_appeal',
        ticketDetails: `طلب استثناء لفتح تعديل التشكيلة للاعب ${player.gamerTag} (الكود: ${player.playerCode || player.id}): ${appealReason.trim()}`,
      });
      if (res.success) {
        addToast({
          type: 'system',
          title: 'تم رفع طلب الاستثناء بنجاح',
          message: `تم قيد الطلب برقم (${res.ticket.id}) وإحالته إلى مدير الاتحاد لمراجعته.`,
          badge: 'لجنة المسابقات',
        });
        setAppealReason('');
        setShowUnlockAppeal(false);
      }
    } catch (err: any) {
      addToast({
        type: 'disciplinary',
        title: 'تعذر إرسال الطلب',
        message: err?.message || 'حدث خطأ أثناء رفع طلب الاستثناء.',
        badge: 'تنبيه',
      });
    } finally {
      setSubmittingAppeal(false);
    }
  };

  const handleSubmitRenewalPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!player) return;
    setPaymentMessage(null);
    if (!paySenderRef.trim() || !payTxRef.trim()) {
      setPaymentMessage({ type: 'error', text: 'يرجى إدخال بيانات المرسل ورقم العملية المرجعي.' });
      return;
    }
    if (!payProofUrl) {
      setPaymentMessage({ type: 'error', text: 'يرجى إرفاق صورة إيصال التحويل أو إثبات الدفع للمراجعة الرسمية.' });
      return;
    }

    setSubmittingPayment(true);
    try {
      const renewalAmount = memSettings?.renewalFee ?? 0;
      const res = await api.submitSubscriptionPayment({
        playerId: player.id,
        paymentMethod: payMethod,
        amount: renewalAmount,
        senderReference: paySenderRef.trim(),
        transactionRef: payTxRef.trim(),
        proofImageUrl: payProofUrl,
        season: paySeason,
      });

      if (res.success) {
        setPaymentMessage({
          type: 'success',
          text: `تم استلام طلب التجديد برقم إيصال (${res.payment.receiptNumber}) وهو الآن قيد المراجعة والاعتماد المالي من الإدارة.`,
        });
        addToast({
          type: 'system',
          title: 'تم إرسال إثبات الدفع بنجاح',
          message: `الإيصال ${res.payment.receiptNumber} بانتظار المراجعة والتحقق قبل تفعيل التجديد.`,
          badge: 'الاشتراكات',
        });
        setPaySenderRef('');
        setPayTxRef('');
        setPayProofUrl('');
        await loadPlayerData(player.id);
      }
    } catch (err: any) {
      setPaymentMessage({
        type: 'error',
        text: err?.message || 'تعذر تسجيل طلب الدفع، تأكد من عدم تكرار رقم العملية.',
      });
    } finally {
      setSubmittingPayment(false);
    }
  };

  const careerStats = useMemo(() => {
    const history = player?.seasonHistory || [];
    const totals = history.reduce(
      (acc, h) => ({
        matchesPlayed: acc.matchesPlayed + (h.matchesPlayed || 0),
        wins: acc.wins + (h.wins || 0),
        draws: acc.draws + (h.draws || 0),
        losses: acc.losses + (h.losses || 0),
        goalsFor: acc.goalsFor + (h.goalsFor || 0),
        goalsAgainst: acc.goalsAgainst + (h.goalsAgainst || 0),
        points: acc.points + (h.points || 0),
        awards: [...acc.awards, ...(h.awards || [])],
      }),
      { matchesPlayed: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, points: 0, awards: [] as string[] }
    );
    return totals;
  }, [player]);

  const daysRemaining = useMemo(() => {
    if (!membership?.expiresAt) return null;
    const diff = new Date(membership.expiresAt).getTime() - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }, [membership]);

  if (players.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="p-8 sm:p-12 bg-slate-900 border border-slate-800 rounded-2xl text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto">
            <User className="w-8 h-8" />
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white">
            سجل اللاعبين والعضويات الرقمية لموسم 2026/2027
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-lg mx-auto leading-relaxed">
            لا يوجد لاعبون معتمدون في قاعدة البيانات بعد. بمجرد تقديم اللاعبين طلبات القيد واعتمادها من الأمانة العامة، ستصدر تلقائياً بطاقة العضوية الرقمية برمز QR، وكود القيد الدائم، والسجل الرياضي الكامل لكل لاعب.
          </p>
        </div>
      </div>
    );
  }

  if (!player && loading) {
    return (
      <div className="py-20 text-center text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-amber-500 mb-2" />
        <span>جاري تحميل الملف الرياضي وبطاقة العضوية للاعب...</span>
      </div>
    );
  }

  const division = divisions.find((d) => d.id === player?.divisionId);
  const isLocked = player?.squadEditLocked || (player?.squadEditCount || 0) >= 1;
  const realClub = player ? OFFICIAL_REAL_CLUBS.find((c) => c.nameAr === player.teamName) : undefined;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8 animate-fadeIn">
      {/* Header & Player Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800 no-print">
        <div>
          <div className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-1">
            الهوية الرياضية الرقمية والملف الدائم
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            بطاقة اللاعب والعضوية والسجل الرياضي
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">عرض ملف لاعب:</span>
          <select
            value={selectedPlayerId}
            onChange={(e) => setSelectedPlayerId(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-amber-500 max-w-xs"
          >
            {players.map((p) => (
              <option key={p.id} value={p.id}>
                {p.playerCode ? `[${p.playerCode}] ` : ''}{p.fullName} ({p.gamerTag}) - {p.teamName}
              </option>
            ))}
          </select>
        </div>
      </div>

      {player && (
        <>
          {/* Athlete Overview Header Card */}
          <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xl no-print">
            <div className="flex items-center gap-4">
              {player.photoUrl ? (
                <img
                  src={player.photoUrl}
                  alt={player.fullName}
                  className="w-16 h-16 rounded-2xl object-cover border-2 border-amber-500/60 shadow-lg shrink-0"
                />
              ) : realClub ? (
                <ClubCrestBadge
                  shortName={realClub.shortName}
                  name={player.teamName}
                  primaryColor={realClub.primaryColor}
                  secondaryColor={realClub.secondaryColor}
                  size="lg"
                />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 text-slate-950 font-black text-xl flex items-center justify-center shadow-lg font-mono">
                  {player.gamerTag.substring(0, 2).toUpperCase()}
                </div>
              )}

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-black text-white">{player.fullName}</h2>
                  <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                    {player.gamerTag}
                  </span>
                  {player.playerCode && (
                    <span className="text-[11px] font-mono font-bold text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      ID دائم: {player.playerCode}
                    </span>
                  )}
                  {membership && (
                    <span className="text-[11px] font-mono font-bold text-sky-300 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">
                      عضوية: {membership.membershipNumber}
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-400 mt-1.5">
                  النادي الحالي: <strong className="text-white">{player.teamName}</strong> · الاتحاد:{' '}
                  <span className="text-amber-400">{division?.nameAr}</span> · الدرجة {player.divisionTier}
                </div>
                <div className="text-[11px] text-slate-500 mt-1 font-mono">
                  تاريخ القيد الدائم: {new Date(player.joinedAt).toLocaleDateString('ar-SA')} · الموسم: {player.season || '2026/2027'}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 md:border-r border-slate-800 pt-4 md:pt-0 md:pr-6">
              <label className="cursor-pointer inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-amber-400 transition-colors">
                {uploadingPhoto ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
                <span>{player.photoUrl ? 'تحديث صورة البطاقة' : 'رفع صورة شخصية'}</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handlePlayerPhotoUpload}
                  className="hidden"
                />
              </label>

              <div className="text-right md:text-left">
                <div className="text-[11px] text-slate-400">سقف التشكيلة</div>
                <div className="text-lg font-black text-amber-400 font-mono">{player.squadRating}</div>
              </div>
            </div>
          </div>

          {/* 4 Sub-Tabs Bar */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar border-b border-slate-800 pb-2 no-print">
            <button
              onClick={() => setActiveProfileTab('card')}
              className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 shrink-0 ${
                activeProfileTab === 'card'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <QrCode className="w-4 h-4" />
              <span>البطاقة الرقمية QR</span>
            </button>

            <button
              onClick={() => setActiveProfileTab('squad')}
              className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 shrink-0 ${
                activeProfileTab === 'squad'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <Shield className="w-4 h-4" />
              <span>التشكيلة والقائمة</span>
            </button>

            <button
              onClick={() => setActiveProfileTab('career')}
              className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 shrink-0 ${
                activeProfileTab === 'career'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <Trophy className="w-4 h-4" />
              <span>السجل الرياضي والانتقالات</span>
            </button>

            <button
              onClick={() => setActiveProfileTab('subscription')}
              className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 shrink-0 ${
                activeProfileTab === 'subscription'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              <span>الاشتراكات والتجديد</span>
            </button>
          </div>

          {/* ================================================================
              TAB 1: DIGITAL MEMBERSHIP CARD + QR
          ================================================================ */}
          {activeProfileTab === 'card' && (
            <div className="space-y-6">
              {membership ? (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                  <div className="lg:col-span-8">
                    <MembershipCard
                      player={player}
                      membership={membership}
                      division={division}
                      onVerifyCard={onVerifyCard}
                    />
                  </div>

                  <div className="lg:col-span-4 space-y-4 no-print">
                    <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 text-xs">
                      <div className="font-black text-white text-sm flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>تفاصيل البطاقة الرسمية الدائمة</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-slate-800">
                        <span className="text-slate-400">رقم اللاعب الدائم:</span>
                        <span className="font-mono font-bold text-emerald-400">{player.playerCode || player.id}</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-slate-800">
                        <span className="text-slate-400">رقم العضوية:</span>
                        <span className="font-mono font-bold text-amber-400">{membership.membershipNumber}</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-slate-800">
                        <span className="text-slate-400">حالة البطاقة:</span>
                        <span className={membership.cardStatus === 'active' ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                          {membership.cardStatus === 'active' ? 'سارية ومعتمدة' : 'ملغاة'}
                        </span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-slate-800">
                        <span className="text-slate-400">تاريخ الانتهاء:</span>
                        <span className="font-mono text-white">
                          {new Date(membership.expiresAt).toLocaleDateString('ar-SA')}
                        </span>
                      </div>
                      {daysRemaining !== null && (
                        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-2">
                          <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                          <span className="text-slate-300">
                            {daysRemaining > 0
                              ? `متبقي ${daysRemaining} يوماً حتى موعد التجديد القادم.`
                              : 'انتهت مدة الصلاحية الحالية ويلزم التجديد لاستئناف المشاركات الرسمية.'}
                          </span>
                        </div>
                      )}
                      <p className="text-[11px] text-slate-400 leading-relaxed pt-1">
                        لا يتغير رقم اللاعب الدائم ({player.playerCode}) عند الانتقال بين الأندية أو بين المواسم. كما أن رمز QR لا يحتوي على أي أرقام اتصال شخصية لحماية خصوصيتك.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-3">
                  <QrCode className="w-10 h-10 text-amber-400 mx-auto" />
                  <div className="text-sm font-black text-white">جاري تجهيز بطاقة العضوية الرقمية</div>
                  <p className="text-xs text-slate-400">
                    تصدر البطاقة تلقائياً بمجرد اعتماد الأمانة العامة لقيد اللاعب، أو يمكن لرئيس/مدير الاتحاد إصدارها من لوحة الإدارة.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ================================================================
              TAB 2: EXISTING SQUAD / ROSTER / EDIT LOCK / AUDIT
          ================================================================ */}
          {activeProfileTab === 'squad' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-7 space-y-6">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-bold text-white text-sm">التشكيلة والقائمة المعتمدة في النظام</h3>

                    <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg">
                      <button
                        onClick={() => setSquadDisplayMode('pitch')}
                        className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 ${
                          squadDisplayMode === 'pitch'
                            ? 'bg-amber-500 text-slate-950 font-bold'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <LayoutGrid className="w-3.5 h-3.5" />
                        <span>الملعب التكتيكي</span>
                      </button>
                      <button
                        onClick={() => setSquadDisplayMode('roster')}
                        className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 ${
                          squadDisplayMode === 'roster'
                            ? 'bg-amber-500 text-slate-950 font-bold'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <Users className="w-3.5 h-3.5" />
                        <span>أسماء القائمة ({player.roster?.length || 0})</span>
                      </button>
                      <button
                        onClick={() => setSquadDisplayMode('screenshot')}
                        className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 ${
                          squadDisplayMode === 'screenshot'
                            ? 'bg-amber-500 text-slate-950 font-bold'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <ImageIcon className="w-3.5 h-3.5" />
                        <span>لقطة الشاشة</span>
                      </button>
                    </div>
                  </div>

                  {squadDisplayMode === 'pitch' && (
                    <TacticalPitchView
                      formation={player.squadFormation}
                      squadRating={player.squadRating}
                      teamName={player.teamName}
                    />
                  )}

                  {squadDisplayMode === 'roster' && (
                    <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2 text-xs">
                        <span className="font-bold text-white">قائمة اللاعبين المسجلين داخل التشكيلة</span>
                        <span className="font-mono text-amber-400">{player.squadFormation}</span>
                      </div>
                      {player.roster && player.roster.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {player.roster.map((rp) => (
                            <div
                              key={rp.id}
                              className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between text-xs"
                            >
                              <div className="flex items-center gap-2.5">
                                <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 font-mono text-[10px] text-amber-400 font-bold">
                                  {rp.position}
                                </span>
                                <span className="font-bold text-white">{rp.name}</span>
                              </div>
                              <span className="font-mono font-bold text-emerald-400">{rp.rating}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="py-8 text-center text-xs text-slate-500">
                          لم يتم إدراج قائمة لاعبين تفصيلية لهذا الفريق بعد.
                        </div>
                      )}
                    </div>
                  )}

                  {squadDisplayMode === 'screenshot' && (
                    <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                        <div className="flex items-center gap-2">
                          <Shield className="w-4 h-4 text-amber-400" />
                          <h3 className="font-bold text-white text-sm">لقطة شاشة eFootball Mobile المعتمدة</h3>
                        </div>
                        <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                          معتمدة
                        </span>
                      </div>

                      <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-slate-950">
                        <img
                          src={player.squadImageUrl}
                          alt="التشكيلة الرسمية"
                          referrerPolicy="no-referrer"
                          className="w-full h-80 object-cover"
                        />
                        <div className="absolute bottom-3 right-3 left-3 p-3 bg-slate-950/85 backdrop-blur-sm rounded-lg border border-slate-800 flex items-center justify-between text-xs">
                          <div>
                            <span className="text-slate-400">الخطة التكتيكية: </span>
                            <strong className="text-white font-mono">{player.squadFormation}</strong>
                          </div>
                          <div>
                            <span className="text-slate-400">التقييم المسجل: </span>
                            <strong className="text-amber-400 font-mono text-sm">{player.squadRating}</strong>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="lg:col-span-5 space-y-6">
                <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {isLocked ? <Lock className="w-5 h-5 text-rose-400" /> : <Unlock className="w-5 h-5 text-emerald-400" />}
                      <h3 className="font-bold text-white text-sm">صلاحية تعديل التشكيلة</h3>
                    </div>
                    <span
                      className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
                        isLocked
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      }`}
                    >
                      {isLocked ? 'التشكيلة مقفلة' : 'متاح للتعديل (مرة واحدة)'}
                    </span>
                  </div>

                  <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl text-xs space-y-2 text-slate-300 leading-relaxed">
                    <div className="font-semibold text-white">اللائحة الرسمية لتعديل التشكيلة:</div>
                    <p>
                      يحق لكل لاعب تعديل تشكيلته <strong className="text-amber-400">مرة واحدة فقط</strong> طوال الموسم لضمان استقرار المنافسات.
                    </p>
                    <p>
                      بعد استنفاد فرصة التعديل الأولى يتم قفل التعديل تلقائياً ولا يُفتح إلا بقرار استثنائي من مدير الاتحاد.
                    </p>
                    <div className="pt-1 text-slate-400 font-mono text-[11px]">
                      مرات التعديل السابقة: <span className="text-white font-bold">{player.squadEditCount} / 1</span>
                    </div>
                  </div>

                  {!isLocked ? (
                    <button
                      onClick={() => setShowEditForm(true)}
                      className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs transition-colors flex items-center justify-center gap-2 shadow-sm"
                    >
                      <Camera className="w-4 h-4" />
                      <span>تعديل التشكيلة ورفع اللقطة الجديدة</span>
                    </button>
                  ) : (
                    <div className="space-y-3">
                      <div className="p-3 bg-rose-950/20 border border-rose-500/30 rounded-lg text-xs text-rose-300 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>لقد استنفدت فرص التعديل. يتطلب أي تغيير جديد موافقة مدير الاتحاد.</span>
                      </div>

                      {!showUnlockAppeal ? (
                        <button
                          onClick={() => setShowUnlockAppeal(true)}
                          className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-2"
                        >
                          <span>تقديم طلب استثناء لمدير الاتحاد لفتح التعديل</span>
                        </button>
                      ) : (
                        <form onSubmit={handleSubmitUnlockAppeal} className="p-4 bg-slate-950 border border-slate-700 rounded-xl space-y-3">
                          <label className="block text-xs font-bold text-white">سبب طلب فتح تعديل التشكيلة:</label>
                          <textarea
                            rows={3}
                            required
                            value={appealReason}
                            onChange={(e) => setAppealReason(e.target.value)}
                            placeholder="اشرح الظرف الفني أو التعديلات المطلوبة..."
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-white"
                          />
                          <div className="flex gap-2">
                            <button
                              type="submit"
                              disabled={submittingAppeal}
                              className="flex-1 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs flex items-center justify-center gap-1.5"
                            >
                              {submittingAppeal ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                              <span>إرسال الطلب رسمياً</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setShowUnlockAppeal(false)}
                              className="px-3 py-2 bg-slate-800 text-slate-300 rounded-lg text-xs"
                            >
                              إلغاء
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
                  )}
                </div>

                {showEditForm && (
                  <div className="p-5 bg-slate-950 border border-amber-500/40 rounded-2xl space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <h4 className="font-bold text-white text-xs">نافذة تعديل التشكيلة (الفرصة الوحيدة المتاحة)</h4>
                      <button onClick={() => setShowEditForm(false)} className="text-xs text-slate-400 hover:text-white">
                        إلغاء
                      </button>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs text-slate-300 mb-1">صورة التشكيلة الجديدة:</label>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          onChange={handleImageUpload}
                          className="w-full text-xs text-slate-400 file:mr-0 file:ml-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-white hover:file:bg-slate-700"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-slate-300 mb-1">تقييم القوة الإجمالي:</label>
                          <input
                            type="number"
                            value={newRating}
                            onChange={(e) => setNewRating(Number(e.target.value))}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-slate-300 mb-1">الرسم التكتيكي:</label>
                          <input
                            type="text"
                            value={newFormation}
                            onChange={(e) => setNewFormation(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono"
                          />
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleAiScanInProfile}
                        disabled={analyzingAi}
                        className="w-full py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-400 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5"
                      >
                        {analyzingAi ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                        <span>فحص الصورة واستخراج القوة والقائمة عبر AI</span>
                      </button>

                      {/* Editable Roster Table */}
                      <div className="space-y-2 border-t border-slate-800 pt-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-300">تعديل قائمة اللاعبين ({newRoster.length}):</span>
                          <button
                            type="button"
                            onClick={handleAddRosterRow}
                            className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1 font-bold"
                          >
                            <Plus className="w-3 h-3" />
                            <span>إضافة لاعب</span>
                          </button>
                        </div>
                        <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                          {newRoster.map((rp, idx) => (
                            <div key={rp.id} className="flex items-center gap-1.5 text-xs">
                              <input
                                type="text"
                                value={rp.name}
                                onChange={(e) => handleUpdateRosterRow(idx, 'name', e.target.value)}
                                placeholder="اسم اللاعب"
                                className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white"
                              />
                              <select
                                value={rp.position}
                                onChange={(e) => handleUpdateRosterRow(idx, 'position', e.target.value)}
                                className="bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-amber-400 font-mono"
                              >
                                {POSITIONS.map((pos) => (
                                  <option key={pos} value={pos}>{pos}</option>
                                ))}
                              </select>
                              <input
                                type="number"
                                value={rp.rating}
                                onChange={(e) => handleUpdateRosterRow(idx, 'rating', e.target.value)}
                                className="w-14 bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-white font-mono text-center"
                              />
                              <button
                                type="button"
                                onClick={() => handleRemoveRosterRow(idx)}
                                className="p-1 text-rose-400 hover:text-rose-300"
                                aria-label="حذف لاعب"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs text-slate-300 mb-1">سبب التعديل / ملاحظات:</label>
                        <textarea
                          rows={2}
                          value={editNotes}
                          onChange={(e) => setEditNotes(e.target.value)}
                          placeholder="مثال: تحديث خط الهجوم وتعديل الخطة إلى 4-2-1-3"
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-white placeholder-slate-500"
                        />
                      </div>

                      {editMessage && (
                        <div
                          className={`p-2.5 rounded-lg text-xs ${
                            editMessage.type === 'success'
                              ? 'bg-emerald-950/30 text-emerald-300 border border-emerald-500/30'
                              : 'bg-rose-950/30 text-rose-300 border border-rose-500/30'
                          }`}
                        >
                          {editMessage.text}
                        </div>
                      )}

                      <button
                        type="button"
                        disabled={savingEdit}
                        onClick={handleSaveSquadModification}
                        className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                      >
                        {savingEdit ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                        <span>تأكيد التعديل وقفل التشكيلة نهائياً</span>
                      </button>
                    </div>
                  </div>
                )}

                <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
                  <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                    <History className="w-4 h-4 text-amber-400" />
                    <h3 className="font-bold text-white text-xs">سجل تعديلات التشكيلة (Audit History)</h3>
                  </div>

                  {edits.length === 0 ? (
                    <div className="py-6 text-center text-slate-500 text-xs">
                      لا توجد تعديلات سابقة مسجلة على هذه التشكيلة.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {edits.map((edit) => (
                        <div
                          key={edit.id}
                          className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs space-y-1.5"
                        >
                          <div className="flex items-center justify-between text-slate-400 font-mono text-[11px]">
                            <span>{new Date(edit.changedAt).toLocaleString('ar-SA')}</span>
                            <span className="text-amber-400 font-bold">
                              {edit.previousRating} إلى {edit.newRating}
                            </span>
                          </div>
                          <div className="text-slate-300 text-[11px]">{edit.notes}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ================================================================
              TAB 3: PERMANENT SPORTS CAREER RECORD & TRANSFERS
          ================================================================ */}
          {activeProfileTab === 'career' && (
            <div className="space-y-6">
              {/* Career Lifetime KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
                  <div className="text-[11px] text-slate-400">المباريات الملعوبة</div>
                  <div className="text-2xl font-black text-white font-mono mt-1">{careerStats.matchesPlayed}</div>
                </div>
                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
                  <div className="text-[11px] text-slate-400">الانتصارات</div>
                  <div className="text-2xl font-black text-emerald-400 font-mono mt-1">{careerStats.wins}</div>
                </div>
                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
                  <div className="text-[11px] text-slate-400">التعادل / الخسارة</div>
                  <div className="text-2xl font-black text-amber-400 font-mono mt-1">
                    {careerStats.draws} / {careerStats.losses}
                  </div>
                </div>
                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
                  <div className="text-[11px] text-slate-400">الأهداف المسجلة</div>
                  <div className="text-2xl font-black text-sky-400 font-mono mt-1">{careerStats.goalsFor}</div>
                </div>
                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
                  <div className="text-[11px] text-slate-400">إجمالي النقاط</div>
                  <div className="text-2xl font-black text-white font-mono mt-1">{careerStats.points}</div>
                </div>
                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
                  <div className="text-[11px] text-slate-400">سجل الانتقالات</div>
                  <div className="text-2xl font-black text-amber-400 font-mono mt-1">{transfers.length}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Season History */}
                <div className="lg:col-span-7 p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-amber-400" />
                      <h3 className="text-sm font-black text-white">السجل التنافسي عبر المواسم</h3>
                    </div>
                    <span className="text-[11px] text-slate-400">سجل دائم لا يُحذف عند انتهاء الاشتراك</span>
                  </div>

                  {(!player.seasonHistory || player.seasonHistory.length === 0) ? (
                    <div className="py-8 text-center text-xs text-slate-500">
                      لا توجد مباريات رسمية مسجلة في المواسم حتى الآن. سيُحدَّث السجل تلقائياً مع أول مباراة رسمية.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-right text-xs">
                        <thead className="bg-slate-950 text-slate-400 font-mono text-[11px] border-b border-slate-800">
                          <tr>
                            <th className="py-2.5 px-3">الموسم</th>
                            <th className="py-2.5 px-3">النادي</th>
                            <th className="py-2.5 px-3">لعب</th>
                            <th className="py-2.5 px-3">ف-ت-خ</th>
                            <th className="py-2.5 px-3">له/عليه</th>
                            <th className="py-2.5 px-3">نقاط</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                          {player.seasonHistory.map((h, i) => (
                            <tr key={`${h.season}_${i}`}>
                              <td className="py-2.5 px-3 font-mono font-bold text-amber-400">{h.season}</td>
                              <td className="py-2.5 px-3 font-bold text-white">{h.teamName}</td>
                              <td className="py-2.5 px-3 font-mono text-slate-300">{h.matchesPlayed}</td>
                              <td className="py-2.5 px-3 font-mono text-slate-300">
                                {h.wins}-{h.draws}-{h.losses}
                              </td>
                              <td className="py-2.5 px-3 font-mono text-slate-300">
                                {h.goalsFor}/{h.goalsAgainst}
                              </td>
                              <td className="py-2.5 px-3 font-mono font-black text-emerald-400">{h.points}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Player Awards */}
                  {((player.awards && player.awards.length > 0) || careerStats.awards.length > 0) && (
                    <div className="pt-3 border-t border-slate-800 space-y-2">
                      <div className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                        <Award className="w-4 h-4" />
                        <span>الألقاب والجوائز الفردية</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {[...(player.awards || []), ...careerStats.awards].map((aw, idx) => (
                          <span
                            key={idx}
                            className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold"
                          >
                            {aw}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Club Transfers & Disciplinary */}
                <div className="lg:col-span-5 space-y-6">
                  <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
                    <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                      <ArrowLeftRight className="w-4 h-4 text-sky-400" />
                      <h3 className="text-sm font-black text-white">سجل الانتقالات بين الأندية</h3>
                    </div>

                    {transfers.length === 0 ? (
                      <div className="py-6 text-center text-xs text-slate-500">
                        يمثل اللاعب ناديه الحالي ({player.teamName}) منذ اعتماده في الاتحاد.
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {transfers.map((tr) => (
                          <div key={tr.id} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-white">
                                {tr.fromTeamName} ← {tr.toTeamName}
                              </span>
                              <span className="font-mono text-[10px] text-amber-400">{tr.season}</span>
                            </div>
                            <div className="text-[11px] text-slate-400">
                              بتاريخ {new Date(tr.transferredAt).toLocaleDateString('ar-SA')} · اعتماد: {tr.approvedBy}
                            </div>
                            {tr.notes && <div className="text-[11px] text-slate-500">{tr.notes}</div>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Disciplinary Record */}
                  <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
                    <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                      <AlertTriangle className="w-4 h-4 text-rose-400" />
                      <h3 className="text-sm font-black text-white">السجل الانضباطي ({playerDisciplinary.length})</h3>
                    </div>

                    {playerDisciplinary.length === 0 ? (
                      <div className="py-5 text-center text-xs text-emerald-400 font-bold">
                        سجل انضباطي نظيف تماماً — لا توجد مخالفات أو عقوبات مسجلة.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {playerDisciplinary.map((d) => (
                          <div key={d.id} className="p-3 rounded-xl bg-rose-950/15 border border-rose-500/30 text-xs space-y-1">
                            <div className="flex items-center justify-between font-bold text-rose-300">
                              <span>{d.type}</span>
                              <span className="font-mono text-[10px]">{new Date(d.issuedAt).toLocaleDateString('ar-SA')}</span>
                            </div>
                            <p className="text-slate-300 text-[11px]">{d.reason}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Player Match Fixtures */}
              <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="text-sm font-black text-white">سجل المباريات الرسمية للاعب ({playerFixtures.length})</h3>
                </div>
                {playerFixtures.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-500">
                    لم تُجدول أو تُلعب مباريات لهذا اللاعب بعد.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {playerFixtures.slice(0, 12).map((fix) => (
                      <div key={fix.id} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                        <div>
                          <div className="text-[10px] font-mono text-amber-400">{fix.roundName} · {fix.matchDate}</div>
                          <div className="font-bold text-white mt-0.5">
                            {fix.homeTeamId} × {fix.awayTeamId}
                          </div>
                        </div>
                        <div className="font-mono font-black text-sm text-emerald-400">
                          {fix.status === 'finished' ? `${fix.homeScore} : ${fix.awayScore}` : fix.matchTime}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ================================================================
              TAB 4: SUBSCRIPTIONS, RENEWALS & PAYMENT RECEIPTS
          ================================================================ */}
          {activeProfileTab === 'subscription' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-5 space-y-6">
                <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <h3 className="text-sm font-black text-white">حالة الاشتراك والرسوم</h3>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                      {membership?.isFirstSeasonFree ? 'الموسم الأول مجاني 100%' : 'عضوية موسمية'}
                    </span>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-400">سياسة الموسم الحالي:</span>
                      <strong className="text-emerald-400">
                        {memSettings?.freeFirstSeason ? 'مجاني بالكامل بدون أي رسوم' : `${memSettings?.renewalFee || 0} ${memSettings?.currency || 'EGP'}`}
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">رسوم التجديد للموسم التالي:</span>
                      <strong className="text-amber-400 font-mono">
                        {memSettings && memSettings.renewalFee > 0
                          ? `${memSettings.renewalFee} ${memSettings.currency}`
                          : 'تُحدد لاحقاً بواسطة رئيس الاتحاد'}
                      </strong>
                    </div>
                    {memSettings?.feeEffectiveDate && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">تاريخ بدء تطبيق التجديد:</span>
                        <span className="font-mono text-white">{memSettings.feeEffectiveDate}</span>
                      </div>
                    )}
                  </div>

                  {/* Submit Renewal / Proof Form */}
                  <form onSubmit={handleSubmitRenewalPayment} className="space-y-4 pt-2">
                    <div className="text-xs font-black text-white">إرسال إثبات دفع للتجديد ({paySeason})</div>

                    <div className="grid grid-cols-3 gap-2">
                      {(['vodafone_cash', 'instapay', 'visa'] as SubscriptionPaymentMethod[]).map((method) => (
                        <button
                          key={method}
                          type="button"
                          onClick={() => setPayMethod(method)}
                          className={`p-2.5 rounded-xl border text-[11px] font-bold text-center transition-all ${
                            payMethod === method
                              ? 'bg-amber-500/15 border-amber-500 text-amber-300'
                              : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          {method === 'vodafone_cash' ? 'Vodafone Cash' : method === 'instapay' ? 'InstaPay' : 'Visa Card'}
                        </button>
                      ))}
                    </div>

                    {/* Channel Instructions */}
                    <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-300 space-y-1">
                      {payMethod === 'vodafone_cash' && (
                        <>
                          <div className="font-bold text-amber-400">التحويل عبر فودافون كاش (Vodafone Cash)</div>
                          <div>
                            رقم المحفظة الرسمي: <strong className="font-mono text-white">{memSettings?.vodafoneCashNumber || 'يُحدد من الإدارة'}</strong>
                          </div>
                        </>
                      )}
                      {payMethod === 'instapay' && (
                        <>
                          <div className="font-bold text-amber-400">التحويل عبر إنستا باي (InstaPay)</div>
                          <div>
                            عنوان الدفع (IPA): <strong className="font-mono text-white" dir="ltr">{memSettings?.instaPayAddress || 'يُحدد من الإدارة'}</strong>
                          </div>
                        </>
                      )}
                      {payMethod === 'visa' && (
                        <>
                          <div className="font-bold text-sky-400">الدفع عبر بطاقة Visa</div>
                          <div>
                            {memSettings?.visaGatewayConfigured
                              ? 'بوابة الدفع الإلكتروني مفعلة، أرفق الرقم المرجعي وإيصال العملية للتحقق الفوري.'
                              : 'بوابة Visa المباشرة قيد الربط البرمجي مع المزود التجاري (Paymob/Stripe). لا يتم اعتماد أي عملية قبل مراجعة الإيصال والتحقق اليدوي من الإدارة.'}
                          </div>
                        </>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="block text-slate-300 font-bold mb-1">
                          {payMethod === 'vodafone_cash'
                            ? 'رقم المحفظة المحول منها'
                            : payMethod === 'instapay'
                            ? 'حساب إنستا باي المرسل'
                            : 'آخر 4 أرقام / مرجع البطاقة'}
                        </label>
                        <input
                          type="text"
                          required
                          dir="ltr"
                          value={paySenderRef}
                          onChange={(e) => setPaySenderRef(e.target.value)}
                          placeholder={payMethod === 'vodafone_cash' ? '010XXXXXXXX' : 'account@instapay'}
                          className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-300 font-bold mb-1">رقم العملية المرجعي (Transaction Ref)</label>
                        <input
                          type="text"
                          required
                          dir="ltr"
                          value={payTxRef}
                          onChange={(e) => setPayTxRef(e.target.value)}
                          placeholder="TX-9948201"
                          className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs text-slate-300 font-bold mb-1.5">إرفاق صورة إثبات التحويل / الإيصال *</label>
                      <label className="cursor-pointer w-full p-3 rounded-xl bg-slate-950 border border-dashed border-slate-700 hover:border-amber-500/50 flex items-center justify-center gap-2 text-xs text-amber-400 font-bold">
                        <Camera className="w-4 h-4" />
                        <span>{payProofUrl ? 'تم إرفاق صورة الإيصال (انقر للتغيير)' : 'اختيار صورة إيصال التحويل من الجهاز'}</span>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          onChange={handlePaymentProofUpload}
                          className="hidden"
                        />
                      </label>
                      {payProofUrl && (
                        <img src={payProofUrl} alt="معاينة الإيصال" className="mt-2 h-28 rounded-lg object-contain border border-slate-800 mx-auto" />
                      )}
                    </div>

                    {paymentMessage && (
                      <div
                        className={`p-3 rounded-xl text-xs ${
                          paymentMessage.type === 'success'
                            ? 'bg-emerald-950/30 text-emerald-300 border border-emerald-500/30'
                            : 'bg-rose-950/30 text-rose-300 border border-rose-500/30'
                        }`}
                      >
                        {paymentMessage.text}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={submittingPayment}
                      className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {submittingPayment ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      <span>إرسال إثبات الدفع للمراجعة الرسمية</span>
                    </button>
                  </form>
                </div>
              </div>

              {/* Receipts & Payments Ledger */}
              <div className="lg:col-span-7 p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-amber-400" />
                    <h3 className="text-sm font-black text-white">سجل المدفوعات وإيصالات التجديد</h3>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">{payments.length} عملية</span>
                </div>

                {payments.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-500 space-y-2">
                    <CreditCard className="w-8 h-8 text-slate-600 mx-auto" />
                    <div>لا توجد عمليات دفع مسجلة حتى الآن. الموسم الأول 2026/2027 مجاني بالكامل.</div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {payments.map((pay) => {
                      const st = PAYMENT_STATUS_AR[pay.status];
                      return (
                        <div key={pay.id} className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-2">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-mono font-black text-amber-400">{pay.receiptNumber}</span>
                            <span className={`px-2.5 py-0.5 rounded-full border text-[10px] font-bold ${st.cls}`}>
                              {st.text}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                            <div>
                              <span className="text-slate-500 block">الوسيلة</span>
                              <span className="text-white font-bold">{PAYMENT_METHOD_AR[pay.paymentMethod]}</span>
                            </div>
                            <div>
                              <span className="text-slate-500 block">الموسم</span>
                              <span className="font-mono text-white">{pay.season}</span>
                            </div>
                            <div>
                              <span className="text-slate-500 block">المرجع</span>
                              <span className="font-mono text-slate-300">{pay.transactionRef}</span>
                            </div>
                            <div>
                              <span className="text-slate-500 block">التاريخ</span>
                              <span className="font-mono text-slate-300">
                                {new Date(pay.submittedAt).toLocaleDateString('ar-SA')}
                              </span>
                            </div>
                          </div>
                          {pay.reviewNotes && (
                            <div className="text-[11px] text-slate-400 border-t border-slate-800/80 pt-1.5">
                              ملاحظة الإدارة: {pay.reviewNotes}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
