import React, { useState, useEffect } from 'react';
import { Team, Tournament, Division } from '../types';
import { updatePageSeo } from '../utils/seo';
import { Trophy, ArrowUpRight, ArrowDownRight, Filter, CheckCircle2, Clock } from 'lucide-react';
import { ClubCrestBadge, LeagueBadge } from '../components/OfficialEmblems';
import { OFFICIAL_REAL_CLUBS } from '../data/officialClubs';

interface StandingsPageProps {
  teams: Team[];
  tournaments: Tournament[];
  divisions: Division[];
  activeFederationId?: string | null;
  onOpenClub?: (club: Team) => void;
}

export const StandingsPage: React.FC<StandingsPageProps> = ({
  teams,
  tournaments,
  activeFederationId,
  onOpenClub,
}) => {
  const scopedTournaments = activeFederationId
    ? tournaments.filter((t) => (!t.divisionId || t.divisionId === activeFederationId) && (t.category === 'first_division' || t.category === 'second_division'))
    : tournaments.filter((t) => t.category === 'first_division' || t.category === 'second_division');

  const [selectedTournamentId, setSelectedTournamentId] = useState<string>(scopedTournaments[0]?.id || 'tour_ksa_d1');

  useEffect(() => {
    if (scopedTournaments.length > 0 && !scopedTournaments.some((t) => t.id === selectedTournamentId)) {
      setSelectedTournamentId(scopedTournaments[0].id);
    }
  }, [activeFederationId, scopedTournaments]);

  const activeTournament = tournaments.find((t) => t.id === selectedTournamentId) || scopedTournaments[0];
  const tournamentTeams = teams
    .filter((t) => t.tournamentId === selectedTournamentId)
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      const diffB = b.goalsFor - b.goalsAgainst;
      const diffA = a.goalsFor - a.goalsAgainst;
      if (diffB !== diffA) return diffB - diffA;
      if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
      return a.name.localeCompare(b.name, 'ar');
    });

  const isFirstDivision = activeTournament?.category === 'first_division';
  const isSecondDivision = activeTournament?.category === 'second_division';

  useEffect(() => {
    const tourName = activeTournament?.nameAr || 'البطولة الرسمية';
    updatePageSeo({
      title: `ترتيب فرق ${tourName} ومراكز الصعود والهبوط | الاتحاد الدولي IOEF`,
      description: `جدول الترتيب الرسمي لـ ${tourName}، النقاط، فارق الأهداف، مراكز التتويج، ومناطق الصعود والهبوط في بطولات IOEF.`,
      canonicalPath: `/?tab=standings&tournament=${selectedTournamentId}`,
    });
  }, [selectedTournamentId, activeTournament]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <Trophy className="w-3.5 h-3.5" />
            <span>نظام النقاط والمعايير التنافسية الرسمية</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">جدول ترتيب الأندية والمسابقات المعتمدة</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1.5 max-w-2xl leading-relaxed">
            اضغط على اسم أي نادٍ لعرض ملفه الرسمي وقائمة لاعبيه المسجلين. يتحدث الترتيب تلقائياً فور اعتماد نتائج المباريات.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={selectedTournamentId}
            onChange={(e) => setSelectedTournamentId(e.target.value)}
            className="w-full sm:w-auto bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-amber-500 shadow-md"
          >
            {scopedTournaments.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nameAr} ({t.season})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* League Information Ribbon */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 border border-slate-800 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg">
        <div className="flex items-center gap-3">
          <LeagueBadge
            divisionId={activeTournament?.divisionId}
            tier={isSecondDivision ? 2 : 1}
            category={activeTournament?.category}
            className="w-12 h-12"
          />
          <div>
            <span className="font-black text-white text-sm sm:text-base block">{activeTournament?.nameAr}</span>
            <span className="text-xs text-slate-400 font-mono">موسم {activeTournament?.season} · نظام النقاط ({activeTournament?.scoringRules?.winPoints ?? 3}/{activeTournament?.scoringRules?.drawPoints ?? 1}/{activeTournament?.scoringRules?.lossPoints ?? 0})</span>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono border-t sm:border-t-0 sm:border-r border-slate-800 pt-3 sm:pt-0 sm:pr-4 w-full sm:w-auto justify-between sm:justify-start">
          <div>
            <span className="text-slate-500 text-[10px] block">سقف التقييم</span>
            <strong className="text-amber-400 font-bold">{isFirstDivision ? '3,220+' : '3,150+'}</strong>
          </div>
          <span className="text-slate-700">|</span>
          <div>
            <span className="text-slate-500 text-[10px] block">الأندية</span>
            <strong className="text-white font-bold">{tournamentTeams.length}</strong>
          </div>
          <span className="text-slate-700">|</span>
          <div>
            <span className="text-slate-500 text-[10px] block">الحسم</span>
            <strong className="text-emerald-400 font-bold">فارق الأهداف</strong>
          </div>
        </div>
      </div>

      {/* Standings Table Container */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
        {/* Mobile View */}
        <div className="block md:hidden divide-y divide-slate-800/80">
          {tournamentTeams.map((team, index) => {
            const played = team.wins + team.draws + team.losses;
            const goalDiff = team.goalsFor - team.goalsAgainst;
            const realClub = OFFICIAL_REAL_CLUBS.find((c) => c.id === team.realClubId || c.nameAr === team.name);

            return (
              <button
                key={team.id}
                onClick={() => onOpenClub?.(team)}
                className="w-full text-right p-4 space-y-3 hover:bg-slate-800/40 transition-colors block"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-lg bg-slate-950 font-black text-xs flex items-center justify-center text-slate-400 font-mono">
                      {index + 1}
                    </span>
                    <ClubCrestBadge
                      shortName={team.shortName}
                      name={team.name}
                      primaryColor={team.color || realClub?.primaryColor}
                      secondaryColor={team.secondaryColor || realClub?.secondaryColor}
                      size="sm"
                    />
                    <div>
                      <span className="font-black text-white text-sm block">{team.name}</span>
                      <span className="text-[10px] text-slate-400">
                        {team.managerName ? `القائد: ${team.managerName}` : 'شاغر للتسجيل'}
                      </span>
                    </div>
                  </div>
                  <div className="text-center">
                    <span className="text-[10px] text-slate-400 block font-sans">النقاط</span>
                    <span className="text-lg font-black text-amber-400 font-mono leading-none">{team.points}</span>
                  </div>
                </div>

                <div className="grid grid-cols-5 gap-2 text-center text-xs font-mono bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/80">
                  <div>
                    <span className="text-[9px] text-slate-500 block font-sans">لعب</span>
                    <span className="text-slate-300 font-bold">{played}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-emerald-500 block font-sans">فاز</span>
                    <span className="text-emerald-400 font-bold">{team.wins}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-500 block font-sans">تعادل</span>
                    <span className="text-slate-400 font-bold">{team.draws}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-rose-500 block font-sans">خسر</span>
                    <span className="text-rose-400 font-bold">{team.losses}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-500 block font-sans">الفارق</span>
                    <span className="text-slate-200 font-bold">{goalDiff > 0 ? `+${goalDiff}` : goalDiff}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase font-mono text-[11px] border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4 text-center w-14">#</th>
                <th className="py-3.5 px-4">النادي الرسمي</th>
                <th className="py-3.5 px-4 text-center">حالة القيد</th>
                <th className="py-3.5 px-4 text-center">لعب</th>
                <th className="py-3.5 px-4 text-center">فاز</th>
                <th className="py-3.5 px-4 text-center">تعادل</th>
                <th className="py-3.5 px-4 text-center">خسر</th>
                <th className="py-3.5 px-4 text-center">له</th>
                <th className="py-3.5 px-4 text-center">عليه</th>
                <th className="py-3.5 px-4 text-center">الفارق</th>
                <th className="py-3.5 px-4 text-center font-bold text-amber-400">النقاط</th>
                <th className="py-3.5 px-4 text-center">المنطقة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 font-mono">
              {tournamentTeams.map((team, index) => {
                const played = team.wins + team.draws + team.losses;
                const goalDiff = team.goalsFor - team.goalsAgainst;
                const realClub = OFFICIAL_REAL_CLUBS.find((c) => c.id === team.realClubId || c.nameAr === team.name);
                const regStatus = team.registrationStatus || (team.playerId ? 'approved' : 'available');

                let zoneStyle = '';
                let zoneBadge = null;

                if (isFirstDivision) {
                  if (index < 2) {
                    zoneStyle = 'bg-amber-500/5';
                    zoneBadge = (
                      <span className="text-[10px] text-amber-400 font-sans font-bold flex items-center justify-center gap-1">
                        <Trophy className="w-3 h-3" />
                        <span>دوري الأبطال</span>
                      </span>
                    );
                  } else if (index >= tournamentTeams.length - 2 && tournamentTeams.length > 3) {
                    zoneStyle = 'bg-rose-500/5';
                    zoneBadge = (
                      <span className="text-[10px] text-rose-400 font-sans font-bold flex items-center justify-center gap-1">
                        <ArrowDownRight className="w-3 h-3" />
                        <span>هبوط للدرجة 2</span>
                      </span>
                    );
                  }
                } else if (isSecondDivision && index < 2) {
                  zoneStyle = 'bg-emerald-500/5';
                  zoneBadge = (
                    <span className="text-[10px] text-emerald-400 font-sans font-bold flex items-center justify-center gap-1">
                      <ArrowUpRight className="w-3 h-3" />
                      <span>صعود مباشر</span>
                    </span>
                  );
                }

                return (
                  <tr
                    key={team.id}
                    onClick={() => onOpenClub?.(team)}
                    className={`hover:bg-slate-800/60 transition-colors cursor-pointer ${zoneStyle}`}
                  >
                    <td className="py-4 px-4 text-center font-bold text-slate-400">{index + 1}</td>
                    <td className="py-4 px-4 font-sans font-bold text-white flex items-center gap-3">
                      <ClubCrestBadge
                        shortName={team.shortName}
                        name={team.name}
                        primaryColor={team.color || realClub?.primaryColor}
                        secondaryColor={team.secondaryColor || realClub?.secondaryColor}
                        size="sm"
                      />
                      <div>
                        <span className="font-black text-white block text-xs hover:text-amber-400 transition-colors">{team.name}</span>
                        <span className="text-[10px] font-mono text-slate-400 font-normal">
                          {team.managerName ? `القائد: ${team.managerName}` : realClub?.nameEn || team.shortName}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center font-sans">
                      {regStatus === 'approved' ? (
                        <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-bold">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>معتمد</span>
                        </span>
                      ) : regStatus === 'pending' ? (
                        <span className="inline-flex items-center gap-1 text-[10px] text-amber-400 font-bold">
                          <Clock className="w-3 h-3" />
                          <span>قيد المراجعة</span>
                        </span>
                      ) : (
                        <span className="text-[10px] text-sky-400 font-bold">متاح</span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-center text-slate-300">{played}</td>
                    <td className="py-4 px-4 text-center text-emerald-400 font-bold">{team.wins}</td>
                    <td className="py-4 px-4 text-center text-slate-400">{team.draws}</td>
                    <td className="py-4 px-4 text-center text-rose-400">{team.losses}</td>
                    <td className="py-4 px-4 text-center text-slate-300">{team.goalsFor}</td>
                    <td className="py-4 px-4 text-center text-slate-400">{team.goalsAgainst}</td>
                    <td className="py-4 px-4 text-center font-bold text-slate-200">{goalDiff > 0 ? `+${goalDiff}` : goalDiff}</td>
                    <td className="py-4 px-4 text-center font-black text-base text-amber-400">{team.points}</td>
                    <td className="py-4 px-4 text-center">{zoneBadge || <span className="text-slate-600">-</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legend */}
      <div className="p-4 sm:p-5 bg-slate-950 border border-slate-800 rounded-2xl flex flex-wrap items-center gap-6 text-xs text-slate-400">
        <span className="font-bold text-white">المؤشرات الرسمية:</span>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-amber-400"></span>
          <span>تأهل للمسابقات القارية الكبرى (المراكز الأولى)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-emerald-400"></span>
          <span>منطقة الصعود المباشر إلى دوري الدرجة الأولى</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-rose-400"></span>
          <span>منطقة الهبوط التلقائي إلى دوري الدرجة الثانية</span>
        </div>
      </div>
    </div>
  );
};
