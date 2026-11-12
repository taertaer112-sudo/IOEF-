import React, { useState, useEffect, useMemo } from 'react';
import {
  Check,
  Sparkles,
  AlertCircle,
  ShieldCheck,
  ArrowLeft,
  ArrowRight,
  Smartphone,
  Trophy,
  Loader2,
  Camera,
  Lock,
  ExternalLink,
  Info,
  Share2,
  Plus,
  Trash2,
  ArrowDownCircle,
  User,
  QrCode,
} from 'lucide-react';
import {
  Division,
  SystemSettings,
  Team,
  RosterPlayer,
  SocialVerificationProof,
} from '../types';
import { api } from '../services/api';
import { TacticalPitchView } from '../components/TacticalPitchView';
import {
  DIVISION_EMBLEMS,
  LeagueBadge,
  ClubCrestBadge,
} from '../components/OfficialEmblems';
import {
  getClubsByDivisionAndTier,
  RealClub,
  OFFICIAL_REAL_CLUBS,
} from '../data/officialClubs';
import { useToast } from '../context/ToastContext';

interface RegistrationPageProps {
  divisions: Division[];
  teams: Team[];
  settings: SystemSettings;
  initialSelection?: {
    divisionId?: string;
    tier?: 1 | 2;
    realClubId?: string;
  };
  onRegisteredSuccess: () => void;
  onNavigateToProfile?: () => void;
  onNavigateToFixtures?: () => void;
  onNavigateToSupport?: () => void;
}

const POSITIONS = ['GK', 'CB', 'LB', 'RB', 'DMF', 'CMF', 'AMF', 'LWF', 'RWF', 'SS', 'CF'];

export const RegistrationPage: React.FC<RegistrationPageProps> = ({
  divisions,
  teams,
  settings,
  initialSelection,
  onRegisteredSuccess,
  onNavigateToProfile,
  onNavigateToFixtures,
  onNavigateToSupport,
}) => {
  const { addToast } = useToast();
  const [currentStep, setCurrentStep] = useState<number>(1);
  const totalSteps = 9;

  const [existingRecord, setExistingRecord] = useState<{
    fullName: string;
    gamerTag: string;
    whatsapp: string;
    teamName: string;
    divisionId: string;
    requestedTier: 1 | 2;
    realClubId?: string;
    registeredAt: string;
    status: string;
  } | null>(null);

  // Stages 1-4: Official Social Channels Verification
  const [whatsappFollowed, setWhatsappFollowed] = useState(false);
  const [tiktokFollowed, setTiktokFollowed] = useState(false);
  const [facebookFollowed, setFacebookFollowed] = useState(false);
  const [proofImageBase64, setProofImageBase64] = useState<string>('');
  const [proofPreviewUrl, setProofPreviewUrl] = useState<string>('');

  // Stages 5-6: Federation, Identity, Tier & Official Club
  const [selectedDivisionId, setSelectedDivisionId] = useState(
    initialSelection?.divisionId || divisions[0]?.id || 'div_ksa'
  );
  const [fullName, setFullName] = useState('');
  const [gamerTag, setGamerTag] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [requestedTier, setRequestedTier] = useState<1 | 2>(initialSelection?.tier || 1);
  const [selectedClub, setSelectedClub] = useState<RealClub | null>(null);

  // Stages 7-8: Squad Screenshot & Editable AI Extracted Roster
  const [squadImageBase64, setSquadImageBase64] = useState<string>('');
  const [squadPreviewUrl, setSquadPreviewUrl] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState<{
    squadRating: number;
    formation: string;
    identifiedPlayers: string[];
    extractedRoster: RosterPlayer[];
    recommendedTier: 1 | 2;
    passedRequirements: boolean;
    needsHumanReview: boolean;
    reasoning: string;
    confidenceScore: number;
  } | null>(null);
  const [editableRoster, setEditableRoster] = useState<RosterPlayer[]>([]);

  // Stage 9: Submit
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkingDuplicate, setCheckingDuplicate] = useState(false);
  const [submissionComplete, setSubmissionComplete] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const firstDivThreshold = settings.firstDivisionMinRating || 3220;
  const secondDivThreshold = settings.secondDivisionMinRating || 3150;
  const social = settings.socialChannels || {
    whatsappChannelName: 'قناة الاتحاد الدولي IOEF الرسمية على واتساب',
    whatsappChannelUrl: 'https://whatsapp.com/channel/ioef-official',
    tiktokHandle: '@IOEF.Official',
    tiktokUrl: 'https://www.tiktok.com/@ioef.official',
    facebookPageName: 'الاتحاد الدولي للرياضات الإلكترونية - IOEF',
    facebookUrl: 'https://www.facebook.com/IOEF.Official',
  };

  // Apply initialSelection from Club Modal or active federation portal
  useEffect(() => {
    if (initialSelection?.divisionId) setSelectedDivisionId(initialSelection.divisionId);
    if (initialSelection?.tier) setRequestedTier(initialSelection.tier);
    if (initialSelection?.realClubId) {
      const club = OFFICIAL_REAL_CLUBS.find((c) => c.id === initialSelection.realClubId);
      if (club) {
        setSelectedDivisionId(club.divisionId);
        setRequestedTier(club.tier);
        setSelectedClub(club);
      }
    }
  }, [initialSelection]);

  // Restore lock or draft on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('ioef_player_accreditation');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.gamerTag) {
          setExistingRecord(parsed);
          return;
        }
      }
      const draft = localStorage.getItem('ioef_reg_draft_v2');
      if (draft) {
        const d = JSON.parse(draft);
        if (d.fullName) setFullName(d.fullName);
        if (d.gamerTag) setGamerTag(d.gamerTag);
        if (d.whatsapp) setWhatsapp(d.whatsapp);
        if (!initialSelection?.divisionId && d.selectedDivisionId) setSelectedDivisionId(d.selectedDivisionId);
        if (!initialSelection?.tier && d.requestedTier) setRequestedTier(d.requestedTier);
        if (typeof d.whatsappFollowed === 'boolean') setWhatsappFollowed(d.whatsappFollowed);
        if (typeof d.tiktokFollowed === 'boolean') setTiktokFollowed(d.tiktokFollowed);
        if (typeof d.facebookFollowed === 'boolean') setFacebookFollowed(d.facebookFollowed);
      }
    } catch {
      // ignore storage read errors
    }
  }, []);

  useEffect(() => {
    if (!submissionComplete && !existingRecord) {
      try {
        localStorage.setItem(
          'ioef_reg_draft_v2',
          JSON.stringify({
            fullName,
            gamerTag,
            whatsapp,
            selectedDivisionId,
            requestedTier,
            whatsappFollowed,
            tiktokFollowed,
            facebookFollowed,
          })
        );
      } catch {
        // ignore quota errors
      }
    }
  }, [
    fullName,
    gamerTag,
    whatsapp,
    selectedDivisionId,
    requestedTier,
    whatsappFollowed,
    tiktokFollowed,
    facebookFollowed,
    submissionComplete,
    existingRecord,
  ]);

  // Map real clubs with live backend availability status
  const clubsWithStatus = useMemo(() => {
    const list = getClubsByDivisionAndTier(selectedDivisionId, requestedTier);
    return list.map((club) => {
      const dbTeam = teams.find(
        (t) =>
          t.divisionId === selectedDivisionId &&
          t.divisionTier === requestedTier &&
          (t.realClubId === club.id || t.name === club.nameAr)
      );
      const status: 'available' | 'pending' | 'approved' =
        dbTeam?.registrationStatus || (dbTeam?.playerId ? 'approved' : 'available');
      return { club, status, dbTeam };
    });
  }, [selectedDivisionId, requestedTier, teams]);

  // Ensure selectedClub stays valid & available
  useEffect(() => {
    const currentEntry = selectedClub
      ? clubsWithStatus.find((c) => c.club.id === selectedClub.id)
      : undefined;
    if (!currentEntry || currentEntry.status !== 'available') {
      const firstAvail = clubsWithStatus.find((c) => c.status === 'available');
      setSelectedClub(firstAvail ? firstAvail.club : null);
    }
  }, [clubsWithStatus, selectedClub]);

  const validateAndReadImage = (file: File, onLoaded: (base64: string) => void) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setErrorMessage('صيغة الصورة غير مدعومة. يرجى رفع ملف JPG أو PNG أو WEBP.');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setErrorMessage('حجم الصورة يتجاوز الحد الأقصى المسموح (8 ميجابايت).');
      return;
    }
    setErrorMessage('');
    const reader = new FileReader();
    reader.onloadend = () => onLoaded(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSquadImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    validateAndReadImage(file, (b64) => {
      setSquadImageBase64(b64);
      setSquadPreviewUrl(b64);
      setAiResult(null);
      setEditableRoster([]);
    });
  };

  const handleProofImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    validateAndReadImage(file, (b64) => {
      setProofImageBase64(b64);
      setProofPreviewUrl(b64);
    });
  };

  const handlePlayerPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    validateAndReadImage(file, (b64) => {
      setPhotoUrl(b64);
    });
  };

  const runAiSquadAnalysis = async () => {
    if (!squadPreviewUrl) {
      setErrorMessage('يرجى رفع لقطة شاشة لتشكيلة فريقك أولاً.');
      return;
    }
    setIsAnalyzing(true);
    setErrorMessage('');
    try {
      const imagePayload = squadImageBase64 || squadPreviewUrl;
      const res = await api.analyzeSquadImage(imagePayload, requestedTier);
      if (res.success && res.data) {
        setAiResult(res.data);
        setEditableRoster(
          Array.isArray(res.data.extractedRoster) ? res.data.extractedRoster : []
        );
      } else {
        setErrorMessage('تعذر تحليل الصورة آلياً، سيتم إحالة التشكيلة لمراجعة اللجنة الفنية.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'حدث خطأ أثناء الاتصال بمحرك الفحص الذكي.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAutoSwitchToTier2 = () => {
    setRequestedTier(2);
    const tier2Clubs = getClubsByDivisionAndTier(selectedDivisionId, 2);
    const availTier2 = tier2Clubs.find((club) => {
      const dbTeam = teams.find(
        (t) =>
          t.divisionId === selectedDivisionId &&
          t.divisionTier === 2 &&
          (t.realClubId === club.id || t.name === club.nameAr)
      );
      return (dbTeam?.registrationStatus || 'available') === 'available' && !dbTeam?.playerId;
    });
    if (availTier2) {
      setSelectedClub(availTier2);
    }
    if (aiResult) {
      setAiResult({
        ...aiResult,
        passedRequirements: aiResult.squadRating >= secondDivThreshold,
        recommendedTier: 2,
      });
    }
    addToast({
      type: 'system',
      title: 'تم تحويل الطلب إلى الدرجة الثانية',
      message: availTier2
        ? `تم تحويل الدرجة إلى الثانية واختيار نادي ${availTier2.nameAr} المتاح. يمكنك مراجعة النادي في الخطوة 6 أو متابعة التسجيل.`
        : 'تم التحويل للدرجة الثانية. يرجى مراجعة قائمة الأندية المتاحة في الخطوة 6.',
      badge: 'توجيه ذكي',
    });
  };

  const handleNextStep = async () => {
    setErrorMessage('');
    if (currentStep === 5) {
      setCheckingDuplicate(true);
      try {
        const dup = await api.checkRegistration(whatsapp.trim(), gamerTag.trim());
        if (dup.exists) {
          setErrorMessage(
            dup.reason ||
              'يوجد قيد مسبق مسجل بهذا الرقم أو المعرف في لوائح IOEF. لا يُسمح بتعدد التسجيل.'
          );
          setCheckingDuplicate(false);
          return;
        }
      } catch {
        // continue if offline check fails; server enforces on POST anyway
      } finally {
        setCheckingDuplicate(false);
      }
    }
    setCurrentStep((prev) => Math.min(totalSteps, prev + 1));
  };

  const handleSubmitRegistration = async () => {
    if (!settings.allowRegistration) {
      setErrorMessage('تم تعليق استقبال طلبات التسجيل مؤقتاً بقرار من إدارة الاتحاد.');
      return;
    }
    if (!termsAccepted) {
      setErrorMessage('يجب الموافقة على ميثاق الشرف ولوائح الاتحاد للمتابعة.');
      return;
    }
    if (!selectedClub) {
      setErrorMessage('يجب اختيار نادٍ رسمي متاح في الدوري المحدد.');
      return;
    }
    if (!squadPreviewUrl) {
      setErrorMessage('يرجى إرفاق صورة التشكيلة المعتمدة.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const dupCheck = await api.checkRegistration(whatsapp.trim(), gamerTag.trim());
      if (dupCheck.exists) {
        setErrorMessage(
          dupCheck.reason || 'أنت مسجل بالفعل في لوائح الاتحاد الدولي IOEF - لا يُسمح بإعادة التسجيل.'
        );
        setIsSubmitting(false);
        return;
      }

      const socialVerification: SocialVerificationProof = {
        whatsappFollowed,
        tiktokFollowed,
        facebookFollowed,
        confirmedAt: new Date().toISOString(),
        method: proofImageBase64 ? 'self_attested_with_proof' : 'self_attested',
      };

      const cleanedRoster = editableRoster.filter((p) => p.name.trim().length > 0);

      const res = await api.submitRegistration({
        fullName: fullName.trim(),
        gamerTag: gamerTag.trim(),
        whatsapp: whatsapp.trim(),
        country: divisions.find((d) => d.id === selectedDivisionId)?.country || 'السعودية',
        divisionId: selectedDivisionId,
        requestedTier,
        realClubId: selectedClub.id,
        teamName: selectedClub.nameAr,
        squadImageUrl: squadPreviewUrl,
        proofImageUrl: proofPreviewUrl || squadPreviewUrl,
        photoUrl: photoUrl || undefined,
        termsAccepted,
        socialVerification,
        extractedRoster: cleanedRoster,
        aiAnalysis: aiResult
          ? {
              squadRating: aiResult.squadRating,
              formation: aiResult.formation,
              identifiedPlayers: cleanedRoster.map((p) => `${p.name} (${p.rating})`),
              extractedRoster: cleanedRoster,
              recommendedTier: aiResult.recommendedTier,
              passedRequirements: aiResult.passedRequirements,
              needsHumanReview: aiResult.needsHumanReview,
              reasoning: aiResult.reasoning,
              analyzedAt: new Date().toISOString(),
            }
          : undefined,
      });

      if (res.success) {
        const record = {
          fullName: fullName.trim(),
          gamerTag: gamerTag.trim(),
          whatsapp: whatsapp.trim(),
          teamName: selectedClub.nameAr,
          divisionId: selectedDivisionId,
          requestedTier,
          realClubId: selectedClub.id,
          registeredAt: new Date().toISOString(),
          status: 'قيد المراجعة من الأمانة العامة',
        };
        localStorage.setItem('ioef_player_accreditation', JSON.stringify(record));
        localStorage.removeItem('ioef_reg_draft_v2');
        setExistingRecord(record);
        setSubmissionComplete(true);
        addToast({
          type: 'registration',
          title: 'تم استلام طلب القيد الرسمي',
          message: `تم حجز نادي ${selectedClub.nameAr} بصفة مبدئية وإحالة الطلب للأمانة العامة للاعتماد.`,
          badge: 'التسجيل الرسمي',
        });
        onRegisteredSuccess();
      } else {
        setErrorMessage(res.error || 'حدث خطأ أثناء إرسال طلب التسجيل.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'تعذر إرسال الطلب للخادم.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return whatsappFollowed;
      case 2:
        return tiktokFollowed;
      case 3:
        return facebookFollowed;
      case 4:
        return whatsappFollowed && tiktokFollowed && facebookFollowed;
      case 5:
        return !!selectedDivisionId && fullName.trim().length >= 3 && gamerTag.trim().length >= 2 && whatsapp.trim().length >= 8;
      case 6:
        return !!selectedClub;
      case 7:
        return !!squadPreviewUrl;
      case 8:
        return !!aiResult;
      case 9:
        return termsAccepted;
      default:
        return true;
    }
  };

  const stepsTitles = [
    'متابعة قناة الواتساب الرسمية',
    'متابعة حساب تيك توك الرسمي',
    'متابعة صفحة فيسبوك الرسمية',
    'توثيق المتابعة وإرفاق الإثبات',
    'اختيار الاتحاد والهوية الرقمية',
    'اختيار الدرجة والنادي الرسمي',
    'رفع صورة التشكيلة المعتمدة',
    'فحص AI ومراجعة قائمة اللاعبين',
    'الإقرار والاعتماد النهائي',
  ];

  // =========================================================================
  // LOCKED / ALREADY REGISTERED VIEW
  // =========================================================================
  if (existingRecord) {
    const registeredDiv = divisions.find((d) => d.id === existingRecord.divisionId);
    const registeredClub = OFFICIAL_REAL_CLUBS.find(
      (c) => c.id === existingRecord.realClubId || c.nameAr === existingRecord.teamName
    );
    const DivisionEmblem = registeredDiv ? DIVISION_EMBLEMS[registeredDiv.id] : null;

    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 animate-fadeIn">
        <div className="relative rounded-2xl bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border border-amber-500/50 p-6 sm:p-8 shadow-2xl overflow-hidden">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pb-6 border-b border-slate-800">
            <div className="flex items-center gap-4 text-center sm:text-right">
              {DivisionEmblem ? (
                <DivisionEmblem className="w-16 h-16 shrink-0 shadow-xl" />
              ) : (
                <div className="w-16 h-16 rounded-xl bg-amber-500/10 border border-amber-500/40 flex items-center justify-center text-amber-400 font-black">
                  IOEF
                </div>
              )}
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold mb-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>بطاقة قيد موسم 2026/2027</span>
                </div>
                <h1 className="text-xl sm:text-2xl font-black text-white">
                  طلب القيد مسجل ومقفل برقمك ومعرفك
                </h1>
                <p className="text-xs text-slate-400 mt-0.5">
                  وفقاً للوائح IOEF، يُحظر التسجيل المتعدد برقم الواتساب أو معرف اللعبة أو عبر هذا المتصفح.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-6 border-b border-slate-800">
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2 text-xs">
              <span className="font-semibold text-slate-400 block">بيانات المتقدم:</span>
              <div className="flex justify-between">
                <span className="text-slate-400">الاسم الكامل:</span>
                <span className="font-bold text-white">{existingRecord.fullName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">معرف اللعبة:</span>
                <span className="font-bold text-amber-400 font-mono">{existingRecord.gamerTag}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">رقم الواتساب:</span>
                <span className="font-mono text-slate-300" dir="ltr">{existingRecord.whatsapp}</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
              <span className="text-xs font-semibold text-slate-400 block">النادي والدوري المختار:</span>
              <div className="flex items-center gap-3">
                {registeredClub && (
                  <ClubCrestBadge
                    shortName={registeredClub.shortName}
                    name={registeredClub.nameAr}
                    primaryColor={registeredClub.primaryColor}
                    secondaryColor={registeredClub.secondaryColor}
                    size="md"
                  />
                )}
                <div>
                  <div className="text-sm font-black text-white">{existingRecord.teamName}</div>
                  <div className="text-xs text-slate-400">
                    {registeredDiv?.nameAr} - الدرجة {existingRecord.requestedTier}
                  </div>
                </div>
              </div>
              <div className="text-[11px] text-amber-400 font-bold pt-1">{existingRecord.status}</div>
              <div className="mt-2 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-300 flex items-center gap-1.5">
                <QrCode className="w-3.5 h-3.5 shrink-0" />
                <span>تصدر بطاقة العضوية الرقمية + رمز QR للموسم الأول مجاناً تلقائياً عند اعتماد الطلب.</span>
              </div>
            </div>
          </div>

          <div className="pt-6 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Lock className="w-4 h-4 text-amber-400 shrink-0" />
              <span>التسجيل متاح لمرة واحدة فقط لكل لاعب لضمان النزاهة وتكافؤ الفرص.</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {onNavigateToProfile && (
                <button
                  onClick={onNavigateToProfile}
                  className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-2"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>ملف اللاعب</span>
                </button>
              )}
              {onNavigateToFixtures && (
                <button
                  onClick={onNavigateToFixtures}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs border border-slate-700 flex items-center gap-2"
                >
                  <Trophy className="w-4 h-4 text-amber-400" />
                  <span>المباريات</span>
                </button>
              )}
              {onNavigateToSupport && (
                <button
                  onClick={onNavigateToSupport}
                  className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-medium text-xs border border-slate-800"
                >
                  الدعم الفني والطعون
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8 animate-fadeIn">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 text-xs text-amber-400 font-bold px-3 py-1 bg-amber-500/10 border border-amber-500/30 rounded-full">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>بوابة القيد والاعتماد الرسمي لموسم 2026/2027 (9 مراحل إلزامية)</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          تسجيل اللاعبين والأندية الرسمية (IOEF Official Registration)
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 max-w-2xl mx-auto leading-relaxed">
          استكمل مراحل التحقق الاجتماعي، واختر اتحادك الوطني وناديك الرسمي، وافحص تشكيلتك عبر الذكاء الاصطناعي قبل القيد النهائي.
        </p>
      </div>

      {!settings.allowRegistration && (
        <div className="p-4 rounded-xl bg-rose-950/50 border border-rose-500/40 flex items-center gap-3 text-rose-200 text-xs">
          <Lock className="w-5 h-5 text-rose-400 shrink-0" />
          <span>باب التسجيل مغلق مؤقتاً بقرار إداري من الأمانة العامة لـ IOEF.</span>
        </div>
      )}

      {/* Progress Indicator */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs mb-3">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md bg-amber-500/20 text-amber-400 font-black font-mono">
              المرحلة {currentStep} / {totalSteps}
            </span>
            <span className="text-white font-bold">{stepsTitles[currentStep - 1]}</span>
          </div>
          <span className="text-slate-500 text-[11px]">ميثاق IOEF المعتمد</span>
        </div>

        <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-800/80 p-0.5">
          <div
            className="bg-gradient-to-r from-amber-600 via-amber-500 to-amber-400 h-full rounded-full transition-all duration-300"
            style={{ width: `${(currentStep / totalSteps) * 100}%` }}
          />
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-950/60 border border-red-500/50 flex items-start gap-3 text-red-200 text-xs">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold block">تنبيه تنظيمي:</span>
            <span>{errorMessage}</span>
          </div>
        </div>
      )}

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-8 shadow-xl space-y-6">
        {/* STAGE 1: WhatsApp Channel */}
        {currentStep === 1 && (
          <div className="space-y-5">
            <div className="border-b border-slate-800 pb-3">
              <h3 className="text-base font-black text-white">1. الانضمام إلى قناة الواتساب الرسمية للاتحاد</h3>
              <p className="text-xs text-slate-400 mt-1">
                تنشر الأمانة العامة عبر قناة الواتساب جداول المباريات الرسمية وروابط القرعة والقرارات التحكيمية العاجلة.
              </p>
            </div>

            <div className="p-5 bg-slate-950 border border-emerald-500/30 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Smartphone className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-sm font-black text-white">{social.whatsappChannelName}</div>
                  <div className="text-xs text-slate-400 font-mono" dir="ltr">{social.whatsappChannelUrl}</div>
                </div>
              </div>
              <a
                href={social.whatsappChannelUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl inline-flex items-center justify-center gap-2 shrink-0"
              >
                <span>فتح قناة الواتساب</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            <label className="flex items-center gap-3 p-4 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer hover:border-amber-500/40">
              <input
                type="checkbox"
                checked={whatsappFollowed}
                onChange={(e) => setWhatsappFollowed(e.target.checked)}
                className="w-4 h-4 rounded text-amber-500 bg-slate-900 border-slate-700"
              />
              <span className="text-xs font-bold text-white">أؤكد متابعة قناة الواتساب الرسمية للاتحاد الدولي IOEF</span>
            </label>
          </div>
        )}

        {/* STAGE 2: TikTok Account */}
        {currentStep === 2 && (
          <div className="space-y-5">
            <div className="border-b border-slate-800 pb-3">
              <h3 className="text-base font-black text-white">2. متابعة حساب تيك توك الرسمي للاتحاد</h3>
              <p className="text-xs text-slate-400 mt-1">
                تابع ملخصات الأهداف واللقطات الرسمية لبطولات الاتحاد الدولي عبر حساب TikTok المعتمد.
              </p>
            </div>

            <div className="p-5 bg-slate-950 border border-slate-700 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Share2 className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-sm font-black text-white">حساب TikTok الرسمي ({social.tiktokHandle})</div>
                  <div className="text-xs text-slate-400 font-mono" dir="ltr">{social.tiktokUrl}</div>
                </div>
              </div>
              <a
                href={social.tiktokUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl inline-flex items-center justify-center gap-2 border border-slate-600 shrink-0"
              >
                <span>فتح حساب TikTok</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            <label className="flex items-center gap-3 p-4 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer hover:border-amber-500/40">
              <input
                type="checkbox"
                checked={tiktokFollowed}
                onChange={(e) => setTiktokFollowed(e.target.checked)}
                className="w-4 h-4 rounded text-amber-500 bg-slate-900 border-slate-700"
              />
              <span className="text-xs font-bold text-white">أؤكد متابعة حساب TikTok الرسمي ({social.tiktokHandle})</span>
            </label>
          </div>
        )}

        {/* STAGE 3: Facebook Page */}
        {currentStep === 3 && (
          <div className="space-y-5">
            <div className="border-b border-slate-800 pb-3">
              <h3 className="text-base font-black text-white">3. متابعة صفحة فيسبوك الرسمية للاتحاد</h3>
              <p className="text-xs text-slate-400 mt-1">
                تُنشر البيانات الصحفية الكاملة ونتائج الترتيب العام عبر صفحة فيسبوك الرسمية لـ IOEF.
              </p>
            </div>

            <div className="p-5 bg-slate-950 border border-sky-500/30 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
                  <Share2 className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-sm font-black text-white">{social.facebookPageName}</div>
                  <div className="text-xs text-slate-400 font-mono" dir="ltr">{social.facebookUrl}</div>
                </div>
              </div>
              <a
                href={social.facebookUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl inline-flex items-center justify-center gap-2 shrink-0"
              >
                <span>فتح صفحة فيسبوك</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            <label className="flex items-center gap-3 p-4 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer hover:border-amber-500/40">
              <input
                type="checkbox"
                checked={facebookFollowed}
                onChange={(e) => setFacebookFollowed(e.target.checked)}
                className="w-4 h-4 rounded text-amber-500 bg-slate-900 border-slate-700"
              />
              <span className="text-xs font-bold text-white">أؤكد متابعة صفحة فيسبوك الرسمية للاتحاد</span>
            </label>
          </div>
        )}

        {/* STAGE 4: Social Verification Summary & Optional Proof */}
        {currentStep === 4 && (
          <div className="space-y-5">
            <div className="border-b border-slate-800 pb-3">
              <h3 className="text-base font-black text-white">4. توثيق متابعة المنصات الرسمية وإرفاق الإثبات</h3>
              <p className="text-xs text-slate-400 mt-1">
                ملخص تأكيدات المتابعة المحفوظة في طلب القيد للمراجعة الإدارية. يمكنك إرفاق لقطة شاشة داعمة لسرعة الاعتماد.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              {[
                { label: 'قناة الواتساب', ok: whatsappFollowed },
                { label: 'حساب TikTok', ok: tiktokFollowed },
                { label: 'صفحة Facebook', ok: facebookFollowed },
              ].map((item, i) => (
                <div
                  key={i}
                  className={`p-3.5 rounded-xl border flex items-center justify-between ${
                    item.ok ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  <span className="font-bold">{item.label}</span>
                  <span>{item.ok ? 'مؤكد' : 'غير مؤكد'}</span>
                </div>
              ))}
            </div>

            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
              <label className="block text-xs font-bold text-slate-300">
                إرفاق لقطة شاشة لإثبات المتابعة (اختياري لكنه يسرّع المراجعة البشرية):
              </label>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleProofImageChange}
                className="w-full text-xs text-slate-400 file:mr-0 file:ml-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-slate-800 file:text-white hover:file:bg-slate-700"
              />
              {proofPreviewUrl && (
                <img
                  src={proofPreviewUrl}
                  alt="معاينة إثبات المتابعة"
                  className="w-full max-h-52 object-contain rounded-xl border border-slate-800 bg-slate-900"
                />
              )}
              <div className="flex items-start gap-2 text-[11px] text-slate-400">
                <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  تنويه تقني: لا توفر منصات WhatsApp وTikTok وFacebook واجهات برمجية مفتوحة للتحقق الآلي من قائمة متابعي الصفحات، لذا يُعتمد إقرارك المباشر مع مراجعة اللقطة المرفقة من قبل مراقب الأمانة العامة.
                </span>
              </div>
            </div>
          </div>
        )}

        {/* STAGE 5: National Federation & Digital Identity */}
        {currentStep === 5 && (
          <div className="space-y-6">
            <div className="border-b border-slate-800 pb-3">
              <h3 className="text-base font-black text-white">5. اختيار الاتحاد الوطني والبيانات الشخصية</h3>
              <p className="text-xs text-slate-400 mt-1">
                اختر الاتحاد الوطني الذي ستنافس فيه وأدخل بياناتك الرسمية التي لا يمكن تكرارها في النظام.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {divisions.map((div) => {
                const isSelected = selectedDivisionId === div.id;
                const EmblemComponent = DIVISION_EMBLEMS[div.id];
                return (
                  <button
                    key={div.id}
                    type="button"
                    onClick={() => setSelectedDivisionId(div.id)}
                    className={`p-3.5 rounded-2xl border text-right transition-all flex items-center gap-3 ${
                      isSelected
                        ? 'bg-slate-800 border-amber-500 ring-1 ring-amber-500/50'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    {EmblemComponent && <EmblemComponent className="w-9 h-9 shrink-0" />}
                    <div className="min-w-0">
                      <div className="text-xs font-black text-white truncate">{div.nameAr}</div>
                      <div className="text-[10px] text-slate-400">{div.country}</div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">الاسم الكامل *</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="مثال: عبدالله محمد الشمري"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">معرف اللعبة (GamerTag) *</label>
                <input
                  type="text"
                  value={gamerTag}
                  onChange={(e) => setGamerTag(e.target.value)}
                  placeholder="مثال: KSA_Pro_99"
                  dir="ltr"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">رقم الواتساب بالمفتاح الدولي *</label>
                <input
                  type="tel"
                  dir="ltr"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="+966 50 123 4567"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Optional Portrait for Digital Membership Card */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                {photoUrl ? (
                  <img src={photoUrl} alt="صورة اللاعب" className="w-14 h-14 rounded-xl object-cover border border-amber-500/50" />
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center text-amber-400">
                    <User className="w-6 h-6" />
                  </div>
                )}
                <div>
                  <div className="text-xs font-bold text-white">صورة بطاقة العضوية الرقمية (اختيارية)</div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    تظهر صورتك الشخصية في بطاقة IOEF الرقمية وعند التحقق عبر QR Code (وإلا سيتم عرض الحروف الأولى تلقائياً).
                  </p>
                </div>
              </div>
              <label className="cursor-pointer shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-amber-400">
                <Camera className="w-3.5 h-3.5" />
                <span>{photoUrl ? 'تغيير الصورة' : 'رفع صورة شخصية'}</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handlePlayerPhotoChange}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        )}

        {/* STAGE 6: Tier & Live Club Availability */}
        {currentStep === 6 && (
          <div className="space-y-6">
            <div className="border-b border-slate-800 pb-3">
              <h3 className="text-base font-black text-white">6. اختيار الدرجة والنادي الرسمي الحقيقي</h3>
              <p className="text-xs text-slate-400 mt-1">
                تظهر أدناه حالة كل نادٍ في الوقت الفعلي. لا يمكن اختيار الأندية المحجوزة أو التي لديها طلب قيد المراجعة.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setRequestedTier(1)}
                className={`p-4 rounded-2xl border text-right transition-all flex items-center gap-3 ${
                  requestedTier === 1
                    ? 'bg-slate-800 border-amber-500 ring-1 ring-amber-500/50'
                    : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                }`}
              >
                <LeagueBadge divisionId={selectedDivisionId} tier={1} className="w-11 h-11 shrink-0" />
                <div>
                  <div className="text-xs font-black text-white">دوري الدرجة الأولى</div>
                  <div className="text-[11px] text-amber-400 font-bold">الحد الأدنى للتشكيلة: {firstDivThreshold}+</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setRequestedTier(2)}
                className={`p-4 rounded-2xl border text-right transition-all flex items-center gap-3 ${
                  requestedTier === 2
                    ? 'bg-slate-800 border-amber-500 ring-1 ring-amber-500/50'
                    : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                }`}
              >
                <LeagueBadge divisionId={selectedDivisionId} tier={2} className="w-11 h-11 shrink-0" />
                <div>
                  <div className="text-xs font-black text-white">دوري الدرجة الثانية</div>
                  <div className="text-[11px] text-sky-400 font-bold">الحد الأدنى للتشكيلة: {secondDivThreshold}+</div>
                </div>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 max-h-[360px] overflow-y-auto pr-1">
              {clubsWithStatus.map(({ club, status }) => {
                const isAvailable = status === 'available';
                const isSelected = selectedClub?.id === club.id;
                return (
                  <button
                    key={club.id}
                    type="button"
                    disabled={!isAvailable}
                    onClick={() => isAvailable && setSelectedClub(club)}
                    className={`p-3.5 rounded-2xl border text-right transition-all flex flex-col justify-between gap-2.5 ${
                      !isAvailable
                        ? 'bg-slate-950/40 border-slate-800/60 opacity-50 cursor-not-allowed'
                        : isSelected
                        ? 'bg-slate-800 border-amber-500 ring-2 ring-amber-500/40'
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <ClubCrestBadge
                        shortName={club.shortName}
                        name={club.nameAr}
                        primaryColor={club.primaryColor}
                        secondaryColor={club.secondaryColor}
                        size="md"
                      />
                      <span
                        className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                          status === 'available'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : status === 'pending'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        {status === 'available' ? 'متاح للتسجيل' : status === 'pending' ? 'قيد المراجعة' : 'معتمد'}
                      </span>
                    </div>
                    <div>
                      <div className="text-xs font-black text-white">{club.nameAr}</div>
                      <div className="text-[10px] text-slate-400 truncate">{club.nameEn}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* STAGE 7: Squad Screenshot Upload */}
        {currentStep === 7 && (
          <div className="space-y-5">
            <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-white">7. رفع لقطة شاشة التشكيلة من eFootball</h3>
                <p className="text-xs text-slate-400 mt-1">
                  ارفع صورة واضحة تظهر رقم قوة الفريق (Team Strength) وأسماء اللاعبين في الخطة.
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-amber-400 px-3 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30">
                الشرط: {requestedTier === 1 ? firstDivThreshold : secondDivThreshold}+
              </span>
            </div>

            <div className="relative rounded-2xl overflow-hidden border-2 border-dashed border-slate-700 bg-slate-950 min-h-[260px] flex flex-col items-center justify-center p-6 text-center">
              {squadPreviewUrl ? (
                <img
                  src={squadPreviewUrl}
                  alt="معاينة التشكيلة"
                  className="max-h-72 rounded-xl object-contain mb-4 border border-slate-800"
                />
              ) : (
                <div className="space-y-2 mb-4">
                  <Camera className="w-10 h-10 text-amber-400 mx-auto" />
                  <p className="text-xs text-slate-300 font-bold">اختر صورة التشكيلة (JPG, PNG, WEBP — بحد أقصى 8MB)</p>
                </div>
              )}

              <label className="cursor-pointer inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition-all">
                <Camera className="w-4 h-4" />
                <span>{squadPreviewUrl ? 'تغيير صورة التشكيلة' : 'اختيار صورة التشكيلة من الجهاز'}</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleSquadImageChange}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        )}

        {/* STAGE 8: AI Analysis, Editable Extracted Roster & Smart Tier 2 Redirect */}
        {currentStep === 8 && (
          <div className="space-y-6">
            <div className="border-b border-slate-800 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-black text-white">8. تحليل التشكيلة بالذكاء الاصطناعي وقائمة اللاعبين</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  يقرأ المحرك قوة الفريق وأسماء اللاعبين، ويمكنك تعديل أو تأكيد أسماء اللاعبين بحرية (مسموح بتكرار أسماء نجوم اللعبة بين الأندية).
                </p>
              </div>
              <button
                type="button"
                disabled={isAnalyzing}
                onClick={runAiSquadAnalysis}
                className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-2 shrink-0 disabled:opacity-50"
              >
                {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                <span>{aiResult ? 'إعادة فحص الصورة' : 'تشغيل فحص AI للتشكيلة'}</span>
              </button>
            </div>

            {aiResult ? (
              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-slate-400 block">قوة التشكيلة المقروءة</span>
                    <span className="text-xl font-black text-amber-400 font-mono">{aiResult.squadRating}</span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-slate-400 block">الخطة التكتيكية</span>
                    <span className="text-xl font-black text-white font-mono">{aiResult.formation}</span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-slate-400 block">حالة الملاءمة</span>
                    <span
                      className={`text-sm font-black ${
                        aiResult.passedRequirements ? 'text-emerald-400' : 'text-amber-400'
                      }`}
                    >
                      {aiResult.passedRequirements ? `مستوفٍ للدرجة ${requestedTier}` : 'أقل من سقف الدرجة المطلوبة'}
                    </span>
                  </div>
                </div>

                {/* Smart Redirect to Tier 2 when Tier 1 fails but fits Tier 2 */}
                {requestedTier === 1 && !aiResult.passedRequirements && aiResult.squadRating >= secondDivThreshold && (
                  <div className="p-4 rounded-xl bg-sky-950/30 border border-sky-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
                    <div className="space-y-1">
                      <div className="font-black text-sky-300">توجيه ذكي إلى دوري الدرجة الثانية</div>
                      <p className="text-slate-300 leading-relaxed">
                        قوة تشكيلتك ({aiResult.squadRating}) تقل عن الحد الأدنى للدرجة الأولى ({firstDivThreshold}+)، لكنها تطابق معايير دوري الدرجة الثانية ({secondDivThreshold}+).
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleAutoSwitchToTier2}
                      className="px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-xs inline-flex items-center gap-1.5 shrink-0"
                    >
                      <ArrowDownCircle className="w-4 h-4" />
                      <span>تحويل طلبي تلقائياً إلى دوري الدرجة الثانية</span>
                    </button>
                  </div>
                )}

                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 leading-relaxed">
                  {aiResult.reasoning}
                </div>

                {/* Editable Roster List */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  <div className="lg:col-span-6 p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">قائمة اللاعبين المستخرجة (قابلة للتعديل)</span>
                      <button
                        type="button"
                        onClick={() =>
                          setEditableRoster((prev) => [
                            ...prev,
                            { id: `rp_${Date.now()}_${prev.length}`, name: '', position: 'CMF', rating: 95 },
                          ])
                        }
                        className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 font-bold"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>إضافة لاعب</span>
                      </button>
                    </div>
                    <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                      {editableRoster.map((rp, idx) => (
                        <div key={rp.id} className="flex items-center gap-2 text-xs">
                          <input
                            type="text"
                            value={rp.name}
                            onChange={(e) =>
                              setEditableRoster((prev) =>
                                prev.map((row, i) => (i === idx ? { ...row, name: e.target.value } : row))
                              )
                            }
                            placeholder="اسم اللاعب"
                            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                          />
                          <select
                            value={rp.position}
                            onChange={(e) =>
                              setEditableRoster((prev) =>
                                prev.map((row, i) => (i === idx ? { ...row, position: e.target.value } : row))
                              )
                            }
                            className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-amber-400 font-mono"
                          >
                            {POSITIONS.map((pos) => (
                              <option key={pos} value={pos}>{pos}</option>
                            ))}
                          </select>
                          <input
                            type="number"
                            value={rp.rating}
                            onChange={(e) =>
                              setEditableRoster((prev) =>
                                prev.map((row, i) => (i === idx ? { ...row, rating: Number(e.target.value) } : row))
                              )
                            }
                            className="w-16 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-white font-mono text-center"
                          />
                          <button
                            type="button"
                            onClick={() => setEditableRoster((prev) => prev.filter((_, i) => i !== idx))}
                            className="p-1.5 text-rose-400 hover:text-rose-300"
                            aria-label="حذف"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="lg:col-span-6">
                    <TacticalPitchView
                      formation={aiResult.formation || '4-3-3'}
                      squadRating={aiResult.squadRating}
                      teamName={selectedClub?.nameAr || 'تشكيلة الفريق'}
                      teamShortName={selectedClub?.shortName || 'IOEF'}
                      primaryColor={selectedClub?.primaryColor || '#1E3A8A'}
                      secondaryColor={selectedClub?.secondaryColor || '#F59E0B'}
                      interactive={false}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-10 rounded-2xl bg-slate-950 border border-dashed border-slate-800 text-center space-y-3">
                <Sparkles className="w-10 h-10 text-amber-400 mx-auto" />
                <div className="text-sm font-bold text-white">جاهز لتحليل لقطة الشاشة</div>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  انقر على زر "تشغيل فحص AI للتشكيلة" لقراءة التقييم واللاعبين وتجهيز ملف القيد للمرحلة الأخيرة.
                </p>
              </div>
            )}
          </div>
        )}

        {/* STAGE 9: Final Review & Submission */}
        {currentStep === 9 && (
          <div className="space-y-5">
            <div className="border-b border-slate-800 pb-3">
              <h3 className="text-base font-black text-white">9. المراجعة النهائية والإقرار الرسمي</h3>
              <p className="text-xs text-slate-400 mt-1">
                راجع كافة بيانات القيد وتأكد من صحتها قبل الإرسال النهائي وقفل التسجيل لهذا الحساب.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 text-xs space-y-2.5">
              <div className="flex justify-between border-b border-slate-800/80 pb-2">
                <span className="text-slate-400">اللاعب والمعرف:</span>
                <span className="font-bold text-white">{fullName} ({gamerTag})</span>
              </div>
              <div className="flex justify-between border-b border-slate-800/80 pb-2">
                <span className="text-slate-400">الاتحاد والدوري:</span>
                <span className="font-bold text-white">
                  {divisions.find((d) => d.id === selectedDivisionId)?.nameAr} - الدرجة {requestedTier}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-800/80 pb-2">
                <span className="text-slate-400">النادي الرسمي المختار:</span>
                <span className="font-bold text-amber-400">{selectedClub?.nameAr}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800/80 pb-2">
                <span className="text-slate-400">قوة التشكيلة وقائمة اللاعبين:</span>
                <span className="font-mono font-bold text-emerald-400">
                  {aiResult?.squadRating || '-'} ({editableRoster.filter((r) => r.name.trim()).length} لاعب)
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-800/80 pb-2">
                <span className="text-slate-400">توثيق المتابعة (واتساب / تيك توك / فيسبوك):</span>
                <span className="font-bold text-emerald-400">مكتمل ومؤكد</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">رسوم العضوية الرقمية (الموسم الأول):</span>
                <span className="font-bold text-emerald-400">مجانية بالكامل (إصدار فوري مع QR بعد الاعتماد)</span>
              </div>
            </div>

            <label className="flex items-start gap-3 p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                className="mt-1 w-4 h-4 rounded text-amber-500 bg-slate-900 border-slate-700"
              />
              <span className="text-xs text-slate-300 leading-relaxed">
                أقر بصحة كافة البيانات المرفقة وأتعهد بالالتزام بميثاق الشرف الرياضي وسقف التقييمات المعتمد (الدرجة الأولى {firstDivThreshold}+ / الدرجة الثانية {secondDivThreshold}+). كما أقر بعلمي بأن <strong>التسجيل نهائي ومقيد برقم الواتساب ومعرف اللعبة ولا يُسمح بالتسجيل المتعدد</strong>.
              </span>
            </label>
          </div>
        )}

        {/* Navigation Footer */}
        <div className="flex items-center justify-between pt-6 border-t border-slate-800">
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={() => {
                setErrorMessage('');
                setCurrentStep((prev) => prev - 1);
              }}
              className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-2 transition-all"
            >
              <ArrowRight className="w-4 h-4" />
              <span>السابق</span>
            </button>
          ) : (
            <div />
          )}

          {currentStep < totalSteps ? (
            <button
              type="button"
              disabled={!canProceed() || checkingDuplicate}
              onClick={handleNextStep}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-md flex items-center gap-2 transition-all disabled:opacity-40"
            >
              {checkingDuplicate ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>جارِ التحقق...</span>
                </>
              ) : (
                <>
                  <span>المتابعة للمرحلة التالية</span>
                  <ArrowLeft className="w-4 h-4" />
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              disabled={!termsAccepted || isSubmitting || !settings.allowRegistration}
              onClick={handleSubmitRegistration}
              className="px-8 py-3 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-slate-950 font-black text-xs shadow-xl flex items-center gap-2 transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>جارِ إرسال واعتماد الطلب...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>إرسال طلب القيد النهائي وقفل الحساب</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
