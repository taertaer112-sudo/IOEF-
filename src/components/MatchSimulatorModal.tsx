import React, { useState, useEffect } from 'react';
import { MatchFixture, Team, Tournament } from '../types';
import { api } from '../services/api';
import { Sparkles, Trophy, Shield, X, Loader2, ArrowUpRight, MessageCircle } from 'lucide-react';
import { ClubCrestBadge } from './OfficialEmblems';
import { OFFICIAL_REAL_CLUBS } from '../data/officialClubs';

interface MatchSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  fixture: MatchFixture | null;
  homeTeam: Team | null;
  awayTeam: Team | null;
  tournament?: Tournament | null;
}

export const MatchSimulatorModal: React.FC<MatchSimulatorModalProps> = ({
  isOpen,
  onClose,
  fixture,
  homeTeam,
  awayTeam,
  tournament
}) => {
  const [loading, setLoading] = useState(false);
  const [prediction, setPrediction] = useState<{
    predictedScore: string;
    homeWinProb: number;
    drawProb: number;
    awayWinProb: number;
    keyDuel: string;
    tacticalInsight: string;
    recommendedStrategy: string;
  } | null>(null);

  useEffect(() => {
    if (isOpen && fixture && homeTeam && awayTeam) {
      loadPrediction();
    } else {
      setPrediction(null);
    }
  }, [isOpen, fixture?.id]);

  const loadPrediction = async () => {
    if (!homeTeam || !awayTeam) return;
    setLoading(true);
    try {
      const res = await api.predictMatch(
        homeTeam.name,
        Number(homeTeam.rating),
        awayTeam.name,
        Number(awayTeam.rating),
        tournament?.nameAr || 'المسابقات الرسمية'
      );
      if (res.success && res.prediction) {
        setPrediction(res.prediction);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !fixture || !homeTeam || !awayTeam) return null;

  const homeReal = OFFICIAL_REAL_CLUBS.find(c => c.id === homeTeam.realClubId || c.nameAr === homeTeam.name);
  const awayReal = OFFICIAL_REAL_CLUBS.find(c => c.id === awayTeam.realClubId || c.nameAr === awayTeam.name);

  // WhatsApp Pre-match broadcast generator link (zero emojis)
  const matchWaText = encodeURIComponent(
    `[IOEF - الاتحاد الدولي للرياضات الإلكترونية]\n` +
    `مباراة رسمية: *${homeTeam.name}* ضد *${awayTeam.name}*\n` +
    `المسابقة: ${tournament?.nameAr || fixture.roundName}\n` +
    `الموعد: ${fixture.matchDate} الساعة ${fixture.matchTime} GMT\n` +
    `التوقع التكتيكي بالذكاء الاصطناعي: ${prediction?.predictedScore || 'مواجهة متقاربة'}\n` +
    `يرجى من قائدي الفريقين التواجد في الغرفة الرسمية قبل الموعد بـ 15 دقيقة.`
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-5 sm:p-8 space-y-6 shadow-2xl relative max-h-[92vh] overflow-y-auto">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 left-5 text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="space-y-1.5 border-b border-slate-800 pb-4">
          <div className="inline-flex items-center gap-1.5 text-xs text-amber-400 font-bold px-3 py-1 bg-amber-500/10 border border-amber-500/30 rounded-full">
            <Sparkles className="w-3.5 h-3.5" />
            <span>محاكي الذكاء الاصطناعي التكتيكي 2026/2027</span>
          </div>
          <h3 className="text-lg sm:text-xl font-black text-white">التحليل التكتيكي وسيناريو المواجهة</h3>
          <div className="text-xs text-slate-400">
            {tournament?.nameAr} · {fixture.roundName}
          </div>
        </div>

        {/* Head-to-Head Clash Banner */}
        <div className="grid grid-cols-12 items-center gap-3 p-4 bg-slate-950 rounded-2xl border border-slate-800 shadow-inner">
          <div className="col-span-5 text-right flex items-center justify-end gap-3">
            <div>
              <div className="text-xs sm:text-sm font-black text-white leading-tight">{homeTeam.name}</div>
              <div className="text-[10px] text-amber-400 font-mono mt-0.5">تقييم: {homeTeam.rating}</div>
            </div>
            <ClubCrestBadge
              shortName={homeTeam.shortName}
              name={homeTeam.name}
              primaryColor={homeTeam.color || homeReal?.primaryColor}
              secondaryColor={homeTeam.secondaryColor || homeReal?.secondaryColor}
              size="sm"
            />
          </div>

          <div className="col-span-2 text-center font-mono font-black text-slate-500 text-xs sm:text-sm">
            VS
          </div>

          <div className="col-span-5 text-left flex items-center justify-start gap-3">
            <ClubCrestBadge
              shortName={awayTeam.shortName}
              name={awayTeam.name}
              primaryColor={awayTeam.color || awayReal?.primaryColor}
              secondaryColor={awayTeam.secondaryColor || awayReal?.secondaryColor}
              size="sm"
            />
            <div>
              <div className="text-xs sm:text-sm font-black text-white leading-tight">{awayTeam.name}</div>
              <div className="text-[10px] text-sky-400 font-mono mt-0.5">تقييم: {awayTeam.rating}</div>
            </div>
          </div>
        </div>

        {/* Loading Spinner */}
        {loading ? (
          <div className="py-12 text-center text-slate-400 space-y-3">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-amber-400" />
            <div className="text-xs font-bold text-white">جاري تحليل بيانات الفريقين والعمق التكتيكي...</div>
            <p className="text-[11px] text-slate-500">يقوم محرك Gemini 3.8 Flash بمقارنة التشكيلات وسجلات المواجهات</p>
          </div>
        ) : prediction ? (
          <div className="space-y-5 text-xs">
            
            {/* Win Probability Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-slate-300 font-bold font-mono">
                <span className="text-emerald-400">فوز {homeTeam.name} ({prediction.homeWinProb}%)</span>
                <span className="text-slate-400">تعادل ({prediction.drawProb}%)</span>
                <span className="text-sky-400">فوز {awayTeam.name} ({prediction.awayWinProb}%)</span>
              </div>
              <div className="w-full h-3 rounded-full overflow-hidden bg-slate-950 flex border border-slate-800">
                <div style={{ width: `${prediction.homeWinProb}%` }} className="bg-emerald-500 h-full"></div>
                <div style={{ width: `${prediction.drawProb}%` }} className="bg-slate-600 h-full"></div>
                <div style={{ width: `${prediction.awayWinProb}%` }} className="bg-sky-500 h-full"></div>
              </div>
            </div>

            {/* Predicted Result & Key Duel */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-500 block mb-1">النتيجة المتوقعة سينمائياً:</span>
                <span className="text-lg font-black font-mono text-amber-400">{prediction.predictedScore}</span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-500 block mb-1">صراع المباراة الحاسم:</span>
                <span className="text-xs font-bold text-white line-clamp-2">{prediction.keyDuel}</span>
              </div>
            </div>

            {/* Tactical Insight */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
              <span className="font-bold text-amber-400 block">التحليل التكتيكي للذكاء الاصطناعي:</span>
              <p className="text-slate-300 leading-relaxed text-xs">
                {prediction.tacticalInsight}
              </p>
            </div>

            {/* Recommended Strategy */}
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
              <span className="font-bold text-emerald-400 block">نصيحة غرفة العمليات:</span>
              <p className="text-slate-400 leading-relaxed text-[11px]">
                {prediction.recommendedStrategy}
              </p>
            </div>

            {/* Coordinator WhatsApp Share */}
            <div className="pt-2">
              <a
                href={`https://wa.me/?text=${matchWaText}`}
                target="_blank"
                rel="noreferrer"
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg flex items-center justify-center gap-2 transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                <span>مشاركة تقرير التنسيق الرسمي مع قادة الفريقين عبر واتساب</span>
              </a>
            </div>

          </div>
        ) : null}

      </div>
    </div>
  );
};
