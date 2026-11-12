import React from 'react';
import { X, Shield, Trophy, MapPin, Calendar, Users, CheckCircle2, Lock, Clock, Award, UserPlus } from 'lucide-react';
import { Division, Team, Tournament } from '../types';
import { ClubCrestBadge, DIVISION_EMBLEMS, LeagueBadge } from './OfficialEmblems';
import { OFFICIAL_REAL_CLUBS } from '../data/officialClubs';

interface ClubProfileModalProps {
  club: Team | null;
  onClose: () => void;
  divisions: Division[];
  tournaments: Tournament[];
  onRegisterClub?: (divisionId: string, tier: 1 | 2, realClubId: string) => void;
}

export const ClubProfileModal: React.FC<ClubProfileModalProps> = ({
  club,
  onClose,
  divisions,
  tournaments,
  onRegisterClub,
}) => {
  if (!club) return null;

  const division = divisions.find((d) => d.id === club.divisionId);
  const tournament = tournaments.find((t) => t.id === club.tournamentId);
  const realClub = OFFICIAL_REAL_CLUBS.find((c) => c.id === club.realClubId || c.nameAr === club.name);
  const DivEmblem = DIVISION_EMBLEMS[club.divisionId] || DIVISION_EMBLEMS.div_ksa;

  const played = club.wins + club.draws + club.losses;
  const gd = club.goalsFor - club.goalsAgainst;
  const status = club.registrationStatus || (club.playerId ? 'approved' : 'available');
  const roster = club.roster || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full p-5 sm:p-7 space-y-6 shadow-2xl relative max-h-[92vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 left-4 text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors"
          aria-label="إغلاق"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Club Institutional Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-5 border-b border-slate-800 pb-5">
          <ClubCrestBadge
            shortName={club.shortName || realClub?.shortName || 'IOEF'}
            name={club.name}
            primaryColor={club.color || realClub?.primaryColor}
            secondaryColor={club.secondaryColor || realClub?.secondaryColor}
            size="xl"
          />

          <div className="flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              {club.clubCode && (
                <span className="px-2.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-[11px] font-mono text-amber-400">
                  {club.clubCode}
                </span>
              )}
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold border ${
                  status === 'approved'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : status === 'pending'
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                    : 'bg-sky-500/10 text-sky-400 border-sky-500/30'
                }`}
              >
                {status === 'approved' ? (
                  <>
                    <CheckCircle2 className="w-3 h-3" />
                    <span>نادي معتمد ومرتبط بلاعب</span>
                  </>
                ) : status === 'pending' ? (
                  <>
                    <Clock className="w-3 h-3" />
                    <span>قيد المراجعة</span>
                  </>
                ) : (
                  <>
                    <Shield className="w-3 h-3" />
                    <span>متاح للتسجيل الرسمي</span>
                  </>
                )}
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-white">{club.name}</h2>
            {realClub?.nameEn && (
              <div className="text-xs font-mono text-slate-400 uppercase tracking-wider">{realClub.nameEn}</div>
            )}

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 pt-1">
              {division && (
                <span className="inline-flex items-center gap-1.5">
                  <DivEmblem className="w-5 h-5" />
                  <span>{division.nameAr}</span>
                </span>
              )}
              {tournament && (
                <span className="inline-flex items-center gap-1.5">
                  <LeagueBadge divisionId={club.divisionId} tier={club.divisionTier} className="w-6 h-6" />
                  <span>{tournament.nameAr}</span>
                </span>
              )}
              {realClub?.stadiumAr && (
                <span className="inline-flex items-center gap-1 text-slate-400">
                  <MapPin className="w-3.5 h-3.5 text-amber-400" />
                  <span>{realClub.stadiumAr}</span>
                </span>
              )}
              {realClub?.founded && (
                <span className="inline-flex items-center gap-1 text-slate-400 font-mono">
                  <Calendar className="w-3.5 h-3.5 text-amber-400" />
                  <span>تأسس {realClub.founded}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Live Season Statistics */}
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5 text-center">
          <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
            <div className="text-[10px] text-slate-500">الموسم</div>
            <div className="text-sm font-black font-mono text-white mt-0.5">{club.season || '2026/2027'}</div>
          </div>
          <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
            <div className="text-[10px] text-slate-500">لعب</div>
            <div className="text-lg font-black font-mono text-white">{played}</div>
          </div>
          <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
            <div className="text-[10px] text-slate-500">فوز / تعادل / خسارة</div>
            <div className="text-sm font-black font-mono text-slate-200 mt-1">
              {club.wins} / {club.draws} / {club.losses}
            </div>
          </div>
          <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
            <div className="text-[10px] text-slate-500">له / عليه</div>
            <div className="text-sm font-black font-mono text-slate-200 mt-1">
              {club.goalsFor} : {club.goalsAgainst}
            </div>
          </div>
          <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
            <div className="text-[10px] text-slate-500">الفارق</div>
            <div className={`text-lg font-black font-mono ${gd >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {gd > 0 ? `+${gd}` : gd}
            </div>
          </div>
          <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30">
            <div className="text-[10px] text-amber-300">النقاط</div>
            <div className="text-lg font-black font-mono text-amber-400">{club.points}</div>
          </div>
        </div>

        {/* Manager & Squad Meta */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
            <div>
              <div className="text-slate-500 text-[11px]">المدير الفني / المتسابق الممثل للنادي</div>
              <div className="text-white font-bold mt-1">
                {club.managerName ? club.managerName : 'شاغر — بانتظار اعتماد متسابق رسمي'}
              </div>
            </div>
            {club.playerId ? (
              <Lock className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <Shield className="w-4 h-4 text-slate-600 shrink-0" />
            )}
          </div>
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
            <div>
              <div className="text-slate-500 text-[11px]">تصنيف التشكيلة / المعيار المعتمد</div>
              <div className="text-amber-400 font-black font-mono mt-1">
                {club.rating > 0 ? `${club.rating} OVR` : `معيار الدرجة ${club.divisionTier}`}
              </div>
            </div>
            <Award className="w-5 h-5 text-amber-400 shrink-0" />
          </div>
        </div>

        {/* Squad Roster */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-400" />
              <span>قائمة لاعبي التشكيلة المسجلة</span>
            </h3>
            <span className="text-[11px] font-mono text-slate-400">{roster.length} لاعب مسجل</span>
          </div>

          {roster.length === 0 ? (
            <div className="p-6 rounded-2xl bg-slate-950 border border-dashed border-slate-800 text-center text-xs text-slate-400">
              لم تُعتمد قائمة لاعبين لهذا النادي بعد. يتم استخراج القائمة وتثبيتها فور اعتماد تسجيل القائد وتدقيق صورة التشكيلة بالذكاء الاصطناعي.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
              {roster.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="px-2 py-0.5 rounded bg-blue-950 text-sky-300 border border-blue-800/60 font-mono text-[10px] font-bold">
                      {p.position}
                    </span>
                    <span className="text-white font-bold">{p.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-amber-400">{p.rating}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Season History */}
        {club.seasonHistory && club.seasonHistory.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span>سجل المواسم السابقة</span>
            </h4>
            <div className="space-y-1.5">
              {club.seasonHistory.map((h, i) => (
                <div key={i} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                  <span className="font-mono text-white">{h.season}</span>
                  <span className="text-slate-300 font-mono">ف {h.wins} · ت {h.draws} · خ {h.losses}</span>
                  <span className="font-mono text-amber-400">المركز #{h.rank ?? '-'} ({h.points} نقطة)</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Register CTA if available */}
        {status === 'available' && onRegisterClub && club.realClubId && (
          <div className="pt-2 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="text-xs text-slate-300">
              هذا النادي متاح حالياً لتمثيله رسمياً في موسم 2026/2027.
            </span>
            <button
              onClick={() => {
                onClose();
                onRegisterClub(club.divisionId, club.divisionTier, club.realClubId!);
              }}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs flex items-center gap-2 shadow-lg transition-all"
            >
              <UserPlus className="w-4 h-4" />
              <span>التسجيل لتمثيل {club.name}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
