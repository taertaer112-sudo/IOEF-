import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { jsPDF } from 'jspdf';
import { Division, MembershipRecord, MembershipStatus, Player } from '../types';
import { OFFICIAL_REAL_CLUBS } from '../data/officialClubs';
import { ClubCrestBadge, DIVISION_EMBLEMS } from './OfficialEmblems';
import { Download, Printer, QrCode, ShieldCheck, CheckCircle2, AlertTriangle, XCircle, Clock, Loader2 } from 'lucide-react';
import { useToast } from '../context/ToastContext';

interface MembershipCardProps {
  player: Player;
  membership: MembershipRecord;
  division?: Division;
  onVerifyCard?: (token: string) => void;
  compact?: boolean;
}

const STATUS_META: Record<MembershipStatus, { label: string; badgeClass: string }> = {
  free: {
    label: 'مجانية · الموسم الأول',
    badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
  },
  active: {
    label: 'نشطة ومعتمدة',
    badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
  },
  pending_payment: {
    label: 'بانتظار الدفع',
    badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-500/40',
  },
  pending_review: {
    label: 'قيد المراجعة المالية',
    badgeClass: 'bg-sky-500/15 text-sky-300 border-sky-500/40',
  },
  expired: {
    label: 'منتهية الصلاحية',
    badgeClass: 'bg-rose-500/15 text-rose-300 border-rose-500/40',
  },
  suspended: {
    label: 'موقوفة إدارياً',
    badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/50',
  },
};

export const MembershipCard: React.FC<MembershipCardProps> = ({
  player,
  membership,
  division,
  onVerifyCard,
  compact = false,
}) => {
  const { addToast } = useToast();
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const verifyUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/?verify=${encodeURIComponent(membership.qrVerificationToken)}`
      : `/?verify=${encodeURIComponent(membership.qrVerificationToken)}`;

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(verifyUrl, {
      width: 320,
      margin: 1,
      color: { dark: '#040B1A', light: '#FFFFFF' },
      errorCorrectionLevel: 'M',
    })
      .then((url) => {
        if (active) setQrDataUrl(url);
      })
      .catch(() => {
        if (active) setQrDataUrl('');
      });
    return () => {
      active = false;
    };
  }, [verifyUrl]);

  const realClub = OFFICIAL_REAL_CLUBS.find((c) => c.nameAr === player.teamName || c.id === player.teamName);
  const DivEmblem = division ? DIVISION_EMBLEMS[division.id] : null;
  const isRevoked = membership.cardStatus === 'revoked';
  const statusInfo = isRevoked
    ? { label: 'بطاقة ملغاة', badgeClass: 'bg-rose-600/25 text-rose-300 border-rose-500/60' }
    : STATUS_META[membership.status] || STATUS_META.active;

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString('ar-SA', { year: 'numeric', month: '2-digit', day: '2-digit' });
    } catch {
      return iso.split('T')[0];
    }
  };

  const handleDownloadPdf = async () => {
    if (downloadingPdf) return;
    setDownloadingPdf(true);
    try {
      if (document.fonts && document.fonts.ready) {
        await document.fonts.ready;
      }

      const canvas = document.createElement('canvas');
      canvas.width = 1280;
      canvas.height = 800;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas unavailable');

      // Deep Navy -> Royal Blue luxury card background
      const bgGrad = ctx.createLinearGradient(0, 0, 1280, 800);
      bgGrad.addColorStop(0, '#040B1A');
      bgGrad.addColorStop(0.55, '#0F2250');
      bgGrad.addColorStop(1, '#061129');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, 1280, 800);

      // Subtle geometric corner accents
      ctx.fillStyle = 'rgba(245, 158, 11, 0.08)';
      ctx.beginPath();
      ctx.arc(1140, 110, 260, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(30, 58, 138, 0.25)';
      ctx.beginPath();
      ctx.arc(140, 720, 240, 0, Math.PI * 2);
      ctx.fill();

      // Gold double perimeter frame
      ctx.strokeStyle = '#F59E0B';
      ctx.lineWidth = 4;
      ctx.strokeRect(24, 24, 1232, 752);
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.35)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(36, 36, 1188 + 20, 728);

      // Top Header Banner
      ctx.fillStyle = 'rgba(4, 11, 26, 0.72)';
      ctx.fillRect(36, 36, 1208, 132);
      ctx.fillStyle = '#F59E0B';
      ctx.fillRect(36, 166, 1208, 3);

      // IOEF Shield Badge top-right
      ctx.fillStyle = '#F59E0B';
      ctx.fillRect(1112, 60, 102, 82);
      ctx.fillStyle = '#040B1A';
      ctx.font = '900 32px Montserrat, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('IOEF', 1163, 102);

      // Header Titles (RTL right aligned)
      ctx.textAlign = 'right';
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '800 30px Cairo, sans-serif';
      ctx.fillText('الاتحاد الدولي للرياضات الإلكترونية عبر الإنترنت', 1084, 88);
      ctx.fillStyle = '#F59E0B';
      ctx.font = '700 18px Montserrat, sans-serif';
      ctx.fillText('INTERNATIONAL ONLINE ESPORTS FEDERATION · OFFICIAL PLAYER CARD', 1084, 130);

      // Status Pill top-left
      const statusTxt = isRevoked ? 'REVOKED' : membership.status.toUpperCase();
      ctx.fillStyle = isRevoked ? '#991B1B' : membership.status === 'suspended' || membership.status === 'expired' ? '#9F1239' : '#065F46';
      ctx.fillRect(66, 68, 250, 56);
      ctx.strokeStyle = isRevoked ? '#FCA5A5' : '#34D399';
      ctx.lineWidth = 2;
      ctx.strokeRect(66, 68, 250, 56);
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.font = '700 20px Montserrat, sans-serif';
      ctx.fillText(statusTxt, 191, 98);

      // Player Portrait Frame (Right side under header)
      ctx.fillStyle = '#0F172A';
      ctx.fillRect(980, 206, 224, 260);
      ctx.strokeStyle = '#F59E0B';
      ctx.lineWidth = 3;
      ctx.strokeRect(980, 206, 224, 260);

      if (player.photoUrl) {
        try {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          await new Promise<void>((resolve) => {
            img.onload = () => resolve();
            img.onerror = () => resolve();
            img.src = player.photoUrl!;
          });
          if (img.naturalWidth > 0) {
            ctx.drawImage(img, 983, 209, 218, 254);
          } else {
            ctx.fillStyle = '#F59E0B';
            ctx.font = '900 68px Montserrat, sans-serif';
            ctx.fillText(player.gamerTag.substring(0, 2).toUpperCase(), 1092, 336);
          }
        } catch {
          ctx.fillStyle = '#F59E0B';
          ctx.font = '900 68px Montserrat, sans-serif';
          ctx.fillText(player.gamerTag.substring(0, 2).toUpperCase(), 1092, 336);
        }
      } else {
        ctx.fillStyle = '#F59E0B';
        ctx.font = '900 68px Montserrat, sans-serif';
        ctx.fillText(player.gamerTag.substring(0, 2).toUpperCase(), 1092, 336);
      }

      // Main Identity Fields (Middle-Right)
      ctx.textAlign = 'right';
      ctx.fillStyle = '#94A3B8';
      ctx.font = '700 18px Cairo, sans-serif';
      ctx.fillText('اسم اللاعب المعتمد', 944, 228);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '900 34px Cairo, sans-serif';
      ctx.fillText(player.fullName, 944, 270);

      ctx.fillStyle = '#F59E0B';
      ctx.font = '700 22px Montserrat, sans-serif';
      ctx.fillText(`@${player.gamerTag}`, 944, 314);

      const drawField = (label: string, val: string, x: number, y: number, mono = false) => {
        ctx.textAlign = 'right';
        ctx.fillStyle = '#94A3B8';
        ctx.font = '600 17px Cairo, sans-serif';
        ctx.fillText(label, x, y);
        ctx.fillStyle = '#F8FAFC';
        ctx.font = mono ? '700 22px Montserrat, sans-serif' : '800 22px Cairo, sans-serif';
        ctx.fillText(val, x, y + 32);
      };

      drawField('رقم العضوية الرسمي', membership.membershipNumber, 944, 368, true);
      drawField('رقم اللاعب الدائم', membership.playerCode, 590, 368, true);
      drawField('النادي الرياضي', player.teamName, 944, 462, false);
      drawField('القسم والموسم', `الدرجة ${player.divisionTier} · ${membership.season}`, 590, 462, false);
      drawField('الاتحاد الوطني', division?.nameAr || 'الاتحاد الدولي IOEF', 944, 556, false);
      drawField('الإصدار والانتهاء', `${formatDate(membership.issuedAt)} -> ${formatDate(membership.expiresAt)}`, 590, 556, true);

      // QR Box on Left
      const currentQr = qrDataUrl || (await QRCode.toDataURL(verifyUrl, { width: 320, margin: 1 }));
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(68, 210, 246, 246);
      const qrImg = new Image();
      await new Promise<void>((resolve) => {
        qrImg.onload = () => resolve();
        qrImg.onerror = () => resolve();
        qrImg.src = currentQr;
      });
      if (qrImg.naturalWidth > 0) {
        ctx.drawImage(qrImg, 80, 222, 222, 222);
      }
      ctx.fillStyle = '#CBD5E1';
      ctx.textAlign = 'center';
      ctx.font = '700 16px Cairo, sans-serif';
      ctx.fillText('امسح للتحقق الرسمي الفوري', 191, 484);
      ctx.font = '600 14px Montserrat, sans-serif';
      ctx.fillStyle = '#94A3B8';
      ctx.fillText(`Card v${membership.cardVersion}`, 191, 512);

      // Footer strip
      ctx.fillStyle = 'rgba(4, 11, 26, 0.85)';
      ctx.fillRect(36, 680, 1208, 84);
      ctx.fillStyle = '#F59E0B';
      ctx.textAlign = 'right';
      ctx.font = '700 18px Cairo, sans-serif';
      ctx.fillText(
        membership.isFirstSeasonFree
          ? 'عضوية الموسم الأول مجانية بالكامل — الرقم الدائم للاعب ثابت عبر كافة المواسم والانتقالات'
          : 'عضوية محترفين رسمية موثقة من الأمانة العامة لـ IOEF',
        1204,
        724
      );

      const pngDataUrl = canvas.toDataURL('image/png', 1.0);
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: [140, 87.5],
      });
      pdf.addImage(pngDataUrl, 'PNG', 0, 0, 140, 87.5);
      pdf.save(`${membership.membershipNumber}.pdf`);

      addToast({
        type: 'system',
        title: 'تم تحميل بطاقة العضوية PDF',
        message: `تم حفظ البطاقة الرسمية بصيغة PDF برقم ${membership.membershipNumber}.`,
        badge: 'العضوية الرقمية',
      });
    } catch (err: any) {
      addToast({
        type: 'disciplinary',
        title: 'تعذر إنشاء ملف PDF',
        message: err?.message || 'حدث خطأ أثناء تجهيز ملف البطاقة.',
        badge: 'خطأ',
      });
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handlePrintCard = () => {
    window.print();
  };

  return (
    <div className="space-y-4">
      {/* Digital Card Container (Print-friendly) */}
      <div
        id="ioef-printable-membership-card"
        className={`relative rounded-2xl overflow-hidden border-2 ${
          isRevoked ? 'border-rose-500/60' : 'border-amber-500/50'
        } bg-gradient-to-br from-[#040B1A] via-[#0E214D] to-[#050E22] text-white shadow-2xl ${
          compact ? 'p-4' : 'p-5 sm:p-7'
        }`}
      >
        {/* Decorative Gold Top Bar */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-amber-600 via-amber-400 to-amber-600" />

        {/* Header Strip */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 font-black text-sm flex items-center justify-center shadow-lg font-mono shrink-0">
              IOEF
            </div>
            <div>
              <div className="text-xs sm:text-sm font-black text-white">
                الاتحاد الدولي للرياضات الإلكترونية عبر الإنترنت
              </div>
              <div className="text-[10px] font-mono text-amber-400 tracking-wider uppercase">
                OFFICIAL DIGITAL PLAYER MEMBERSHIP CARD
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {DivEmblem && <DivEmblem className="w-8 h-8 shrink-0" />}
            <span className={`text-[11px] font-bold px-2.5 py-1 rounded-md border ${statusInfo.badgeClass} flex items-center gap-1`}>
              {isRevoked || membership.status === 'suspended' ? (
                <XCircle className="w-3.5 h-3.5" />
              ) : membership.status === 'expired' ? (
                <AlertTriangle className="w-3.5 h-3.5" />
              ) : membership.status === 'pending_payment' || membership.status === 'pending_review' ? (
                <Clock className="w-3.5 h-3.5" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5" />
              )}
              <span>{statusInfo.label}</span>
            </span>
          </div>
        </div>

        {/* Main Card Body */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 py-5 items-center">
          {/* Photo & Primary Identity (Right/Main) */}
          <div className="md:col-span-8 flex flex-col sm:flex-row items-center sm:items-start gap-4">
            <div className="w-24 h-28 rounded-xl overflow-hidden border-2 border-amber-500/60 bg-slate-900 shrink-0 flex items-center justify-center shadow-lg">
              {player.photoUrl ? (
                <img
                  src={player.photoUrl}
                  alt={player.fullName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-2xl font-black font-mono text-amber-400">
                  {player.gamerTag.substring(0, 2).toUpperCase()}
                </span>
              )}
            </div>

            <div className="flex-1 w-full space-y-3 text-center sm:text-right">
              <div>
                <h3 className="text-lg sm:text-xl font-black text-white leading-tight">{player.fullName}</h3>
                <div className="text-xs font-mono text-amber-400 font-bold mt-0.5">@{player.gamerTag}</div>
              </div>

              <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-xs pt-1">
                <div>
                  <span className="text-[10px] text-slate-400 block">رقم العضوية الرسمي</span>
                  <span className="font-mono font-black text-amber-300 tabular-nums text-[13px]">
                    {membership.membershipNumber}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">رقم اللاعب الدائم</span>
                  <span className="font-mono font-black text-emerald-300 tabular-nums text-[13px]">
                    {membership.playerCode}
                  </span>
                </div>
                <div className="flex items-center justify-center sm:justify-start gap-2 col-span-2 sm:col-span-1">
                  {realClub && (
                    <ClubCrestBadge
                      shortName={realClub.shortName}
                      name={player.teamName}
                      primaryColor={realClub.primaryColor}
                      secondaryColor={realClub.secondaryColor}
                      size="sm"
                    />
                  )}
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block">الفريق الممثل</span>
                    <span className="font-bold text-white">{player.teamName}</span>
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">الاتحاد · القسم · الموسم</span>
                  <span className="font-bold text-slate-100">
                    {division?.code || 'IOEF'} · الدرجة {player.divisionTier} · {membership.season}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">تاريخ الإصدار</span>
                  <span className="font-mono text-slate-200 tabular-nums">{formatDate(membership.issuedAt)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">تاريخ الانتهاء</span>
                  <span className="font-mono text-slate-200 tabular-nums">{formatDate(membership.expiresAt)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* QR Code Verification Block */}
          <div className="md:col-span-4 flex flex-col items-center justify-center p-3 rounded-xl bg-white/5 border border-white/10">
            <div className="w-28 h-28 bg-white rounded-lg p-1.5 shadow-inner flex items-center justify-center">
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="QR التحقق الرسمي للعضوية" className="w-full h-full object-contain" />
              ) : (
                <QrCode className="w-12 h-12 text-slate-800" />
              )}
            </div>
            <div className="text-[10px] font-bold text-amber-300 mt-2 text-center">
              امسح الرمز للتحقق الرسمي
            </div>
            <div className="text-[9px] font-mono text-slate-400 mt-0.5">
              الإصدار v{membership.cardVersion} · بدون بيانات شخصية حساسة
            </div>
          </div>
        </div>

        {/* Revocation Alert if card was revoked */}
        {isRevoked && (
          <div className="mb-3 p-2.5 rounded-lg bg-rose-950/70 border border-rose-500/50 text-xs text-rose-200 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>تم إلغاء هذه البطاقة: {membership.revokedReason || 'قرار إداري من الاتحاد'}</span>
          </div>
        )}

        {/* Footer Micro-Guarantee */}
        <div className="pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-400">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>سجل دائم لا يتغير عند الانتقال بين الأندية أو انتهاء الموسم</span>
          </div>
          <span className="font-mono text-slate-500">{division?.nameAr}</span>
        </div>
      </div>

      {/* Action Controls (hidden on print) */}
      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <button
          type="button"
          onClick={handleDownloadPdf}
          disabled={downloadingPdf}
          className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-2 transition-colors shadow-md disabled:opacity-50"
        >
          {downloadingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          <span>تنزيل البطاقة PDF</span>
        </button>

        <button
          type="button"
          onClick={handlePrintCard}
          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 font-bold text-xs flex items-center gap-2 transition-colors"
        >
          <Printer className="w-4 h-4 text-amber-400" />
          <span>طباعة البطاقة</span>
        </button>

        {onVerifyCard && (
          <button
            type="button"
            onClick={() => onVerifyCard(membership.qrVerificationToken)}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-emerald-300 border border-emerald-500/30 font-bold text-xs flex items-center gap-2 transition-colors"
          >
            <QrCode className="w-4 h-4" />
            <span>فتح صفحة التحقق الرسمية</span>
          </button>
        )}
      </div>
    </div>
  );
};
