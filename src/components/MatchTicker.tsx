import React from 'react';
import { MatchFixture, Team, Tournament } from '../types';
import { Trophy, Calendar } from 'lucide-react';
import { ClubCrestBadge } from './OfficialEmblems';

interface MatchTickerProps {
  fixtures: MatchFixture[];
  teams: Team[];
  tournaments: Tournament[];
  activeFederationId?: string | null;
  onSelectFixture: (fixture: MatchFixture) => void;
  onGoToRegister?: () => void;
}

export const MatchTicker: React.FC<MatchTickerProps> = ({
  fixtures,
  teams,
  tournaments,
  activeFederationId,
  onSelectFixture,
  onGoToRegister,
}) => {
  const getTeam = (teamId: string) => {
    return (
      teams.find((t) => t.id === teamId) || {
        id: teamId,
        name: 'نادي رسمي',
        shortName: 'FC',
        color: '#1E3A8A',
        secondaryColor: '#F59E0B',
      }
    );
  };

  const getTournamentCode = (tourId: string) => {
    const t = tournaments.find((tour) => tour.id === tourId);
    if (!t) return 'IOEF';
    if (t.category === 'first_division') return 'D1';
    if (t.category === 'second_division') return 'D2';
    if (t.category === 'champions_league') return 'UCL';
    return 'CUP';
  };

  const scopedFixtures = activeFederationId
    ? fixtures.filter((f) => f.divisionId === activeFederationId)
    : fixtures;

  const displayFixtures = [...scopedFixtures]
    .sort((a, b) => {
      if (a.status === 'live' && b.status !== 'live') return -1;
      if (b.status === 'live' && a.status !== 'live') return 1;
      return 0;
    })
    .slice(0, 8);

  return (
    <div className="bg-slate-950 border-b border-slate-800/80 select-none overflow-hidden">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2 flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 shrink-0 border-l border-slate-800 pl-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-400 font-black font-mono text-[10px]">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
            <span>MATCH CENTER</span>
          </div>
        </div>

        {displayFixtures.length === 0 ? (
          <div className="flex-1 flex items-center justify-between gap-3 text-[11px] text-slate-300 overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-2 whitespace-nowrap">
              <Calendar className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>
                موسم 2026/2027 — باب القيد والتسجيل مفتوح الآن لـ {teams.length || 234} نادياً رسمياً، وستظهر هنا المباريات فور جدولتها.
              </span>
            </div>
            {onGoToRegister && (
              <button
                onClick={onGoToRegister}
                className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 font-bold border border-amber-500/30 transition-colors"
              >
                <Trophy className="w-3 h-3" />
                <span>احجز ناديك</span>
              </button>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-0.5 scroll-smooth">
            {displayFixtures.map((fixture) => {
              const home = getTeam(fixture.homeTeamId);
              const away = getTeam(fixture.awayTeamId);
              const isLive = fixture.status === 'live';
              const isFinished = fixture.status === 'finished';

              return (
                <button
                  key={fixture.id}
                  onClick={() => onSelectFixture(fixture)}
                  className={`flex items-center gap-3 px-3 py-1.5 rounded-xl border shrink-0 transition-all text-right hover:border-amber-500/60 ${
                    isLive
                      ? 'bg-rose-950/30 border-rose-500/40 shadow-sm'
                      : 'bg-slate-900/70 border-slate-800 hover:bg-slate-900'
                  }`}
                >
                  <span className="text-[9px] font-mono font-black text-slate-400 px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800">
                    {getTournamentCode(fixture.tournamentId)}
                  </span>

                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black text-white">{home.shortName}</span>
                    <ClubCrestBadge
                      shortName={home.shortName}
                      name={home.name}
                      primaryColor={home.color}
                      secondaryColor={home.secondaryColor}
                      size="sm"
                      className="w-5 h-5 text-[8px] rounded-md"
                    />
                  </div>

                  <div className="px-2 py-0.5 rounded bg-slate-950 font-mono font-black text-xs min-w-[36px] text-center border border-slate-800">
                    {isLive || isFinished ? (
                      <span className={isLive ? 'text-rose-400' : 'text-amber-400'}>
                        {fixture.homeScore}:{fixture.awayScore}
                      </span>
                    ) : (
                      <span className="text-slate-500 text-[10px]">{fixture.matchTime}</span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <ClubCrestBadge
                      shortName={away.shortName}
                      name={away.name}
                      primaryColor={away.color}
                      secondaryColor={away.secondaryColor}
                      size="sm"
                      className="w-5 h-5 text-[8px] rounded-md"
                    />
                    <span className="text-xs font-black text-white">{away.shortName}</span>
                  </div>

                  {isLive && <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping"></span>}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
