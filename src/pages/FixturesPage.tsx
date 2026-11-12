import React, { useState, useEffect } from 'react';
import { MatchFixture, Tournament, Team } from '../types';
import { updatePageSeo } from '../utils/seo';
import { Calendar, Video, Search, Filter, Clock, Sparkles, Shield, Eye } from 'lucide-react';
import { MatchSimulatorModal } from '../components/MatchSimulatorModal';
import { ClubCrestBadge } from '../components/OfficialEmblems';
import { OFFICIAL_REAL_CLUBS } from '../data/officialClubs';

interface FixturesPageProps {
  fixtures: MatchFixture[];
  tournaments: Tournament[];
  teams: Team[];
  activeFederationId?: string | null;
  onOpenClub?: (club: Team) => void;
  onOpenMatch?: (fixture: MatchFixture) => void;
}

export const FixturesPage: React.FC<FixturesPageProps> = ({
  fixtures,
  tournaments,
  teams,
  activeFederationId,
  onOpenClub,
  onOpenMatch,
}) => {
  const [filterTournament, setFilterTournament] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'all' | 'scheduled' | 'finished'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedFixture, setSelectedFixture] = useState<MatchFixture | null>(null);
  const [simulatorOpen, setSimulatorOpen] = useState<boolean>(false);

  const scopedTournaments = activeFederationId
    ? tournaments.filter((t) => !t.divisionId || t.divisionId === activeFederationId)
    : tournaments;

  const baseFixtures = activeFederationId
    ? fixtures.filter((f) => f.divisionId === activeFederationId || !f.divisionId)
    : fixtures;

  useEffect(() => {
    setFilterTournament('all');
  }, [activeFederationId]);

  useEffect(() => {
    if (filterTournament === 'all') {
      updatePageSeo({
        title: 'مركز المباريات والنتائج المباشرة للبطولات الكبرى | IOEF',
        description: 'جدول المباريات والنتائج الحية للبطولات المعتمدة في منصة الاتحاد الدولي IOEF.',
        canonicalPath: '/?tab=fixtures',
      });
    } else {
      const tour = tournaments.find((t) => t.id === filterTournament);
      const tourName = tour?.nameAr || 'البطولة الرسمية';
      updatePageSeo({
        title: `مباريات ونتائج ${tourName} | الاتحاد الدولي IOEF`,
        description: `جدول المباريات والمواعيد والنتائج اللحظية لـ ${tourName}.`,
        canonicalPath: `/?tab=fixtures&tournament=${filterTournament}`,
      });
    }
  }, [filterTournament, tournaments]);

  const getTeam = (teamId: string): Team => {
    const found = teams.find((t) => t.id === teamId);
    if (found) return found;
    return {
      id: teamId,
      divisionId: 'div_ksa',
      tournamentId: 'tour_ksa_d1',
      name: 'نادي معتمد',
      shortName: 'FC',
      logo: 'FC',
      color: '#1E3A8A',
      secondaryColor: '#F59E0B',
      playerId: '',
      divisionTier: 1,
      rating: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      points: 0,
    };
  };

  const getTournamentName = (tourId: string) => {
    return tournaments.find((t) => t.id === tourId)?.nameAr || 'بطولة رسمية';
  };

  const filteredFixtures = baseFixtures.filter((f) => {
    if (filterTournament !== 'all' && f.tournamentId !== filterTournament) return false;
    if (activeTab === 'scheduled' && f.status !== 'scheduled') return false;
    if (activeTab === 'finished' && f.status !== 'finished') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const home = getTeam(f.homeTeamId).name.toLowerCase();
      const away = getTeam(f.awayTeamId).name.toLowerCase();
      const round = f.roundName.toLowerCase();
      return home.includes(q) || away.includes(q) || round.includes(q);
    }
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            <span>لجنة المسابقات والجدولة الدولية</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">جدول المباريات والنتائج المعتمدة</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1.5 max-w-2xl leading-relaxed">
            مواعيد الجولات، تفاصيل المواجهات والحكام المعتمدين، سجل الأهداف والإحصائيات، ومحاكي السيناريوهات التكتيكية بالذكاء الاصطناعي.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-xl shrink-0">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3.5 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'all' ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            الكل ({baseFixtures.length})
          </button>
          <button
            onClick={() => setActiveTab('scheduled')}
            className={`px-3.5 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'scheduled' ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            القادمة ({baseFixtures.filter((f) => f.status === 'scheduled').length})
          </button>
          <button
            onClick={() => setActiveTab('finished')}
            className={`px-3.5 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'finished' ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            النتائج ({baseFixtures.filter((f) => f.status === 'finished').length})
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-slate-900/80 border border-slate-800 rounded-2xl shadow-lg">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <span className="text-xs text-slate-400 shrink-0">البطولة:</span>
          <select
            value={filterTournament}
            onChange={(e) => setFilterTournament(e.target.value)}
            className="w-full sm:w-auto bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs font-bold text-white focus:outline-none focus:border-amber-500"
          >
            <option value="all">جميع البطولات والمسابقات</option>
            {scopedTournaments.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nameAr}
              </option>
            ))}
          </select>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
          <input
            type="text"
            placeholder="بحث عن نادٍ أو جولة..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl pr-10 pl-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>

      {/* Match Cards List */}
      <div className="space-y-4">
        {filteredFixtures.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs bg-slate-900/40 rounded-2xl border border-slate-800/80 space-y-2">
            <Calendar className="w-8 h-8 text-amber-400 mx-auto" />
            <div className="font-bold text-white text-sm">لا توجد مباريات مجدولة أو منتهية في هذا القسم حالياً</div>
            <p className="text-slate-500">ستُدرج الجولات الرسمية لموسم 2026/2027 فور اعتماد قوائم اللاعبين وجدولة المباريات من لوحة الإدارة.</p>
          </div>
        ) : (
          filteredFixtures.map((fixture) => {
            const home = getTeam(fixture.homeTeamId);
            const away = getTeam(fixture.awayTeamId);
            const isFinished = fixture.status === 'finished';
            const isLive = fixture.status === 'live';

            const homeReal = OFFICIAL_REAL_CLUBS.find((c) => c.id === home.realClubId || c.nameAr === home.name);
            const awayReal = OFFICIAL_REAL_CLUBS.find((c) => c.id === away.realClubId || c.nameAr === away.name);

            return (
              <div
                key={fixture.id}
                className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-6 hover:border-slate-700 transition-all space-y-4 shadow-xl"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs border-b border-slate-800/80 pb-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-amber-400 font-black">{getTournamentName(fixture.tournamentId)}</span>
                    <span aria-hidden="true" className="text-slate-600">·</span>
                    <span className="text-slate-300 font-medium">{fixture.roundName}</span>
                    {fixture.assignedReferee && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                        <Shield className="w-3 h-3" />
                        <span>الحكم: {fixture.assignedReferee}</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-slate-400 font-mono text-[11px]">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      <span>{fixture.matchDate}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span>{fixture.matchTime} GMT</span>
                    </div>
                    {isLive ? (
                      <span className="px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-400 font-bold border border-rose-500/30 flex items-center gap-1 animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                        <span>مباشر الآن</span>
                      </span>
                    ) : isFinished ? (
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">
                        مكتملة
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 font-bold border border-amber-500/20">
                        مجدولة
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 items-center gap-4 py-2">
                  <button
                    onClick={() => onOpenClub?.(home)}
                    className="sm:col-span-5 flex items-center justify-between sm:justify-end gap-3 text-right hover:opacity-90"
                  >
                    <div className="order-2 sm:order-1">
                      <div className="text-sm sm:text-base font-black text-white hover:text-amber-400 transition-colors">
                        {home.name}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        {homeReal?.nameEn || home.shortName} · تقييم {home.rating > 0 ? home.rating : '—'}
                      </div>
                    </div>
                    <div className="order-1 sm:order-2 shrink-0">
                      <ClubCrestBadge
                        shortName={home.shortName}
                        name={home.name}
                        primaryColor={home.color || homeReal?.primaryColor}
                        secondaryColor={home.secondaryColor || homeReal?.secondaryColor}
                        size="md"
                      />
                    </div>
                  </button>

                  <div className="sm:col-span-2 text-center py-2 sm:py-0">
                    <button
                      onClick={() => onOpenMatch?.(fixture)}
                      className="inline-block px-4 py-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl shadow-inner transition-colors"
                    >
                      {isFinished || isLive ? (
                        <div className="text-lg sm:text-2xl font-mono font-black text-amber-400 tracking-widest">
                          {fixture.homeScore} : {fixture.awayScore}
                        </div>
                      ) : (
                        <div className="text-xs font-black text-slate-400 font-mono">VS</div>
                      )}
                    </button>
                  </div>

                  <button
                    onClick={() => onOpenClub?.(away)}
                    className="sm:col-span-5 flex items-center justify-between sm:justify-start gap-3 text-left hover:opacity-90"
                  >
                    <div className="shrink-0">
                      <ClubCrestBadge
                        shortName={away.shortName}
                        name={away.name}
                        primaryColor={away.color || awayReal?.primaryColor}
                        secondaryColor={away.secondaryColor || awayReal?.secondaryColor}
                        size="md"
                      />
                    </div>
                    <div>
                      <div className="text-sm sm:text-base font-black text-white hover:text-amber-400 transition-colors">
                        {away.name}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        {awayReal?.nameEn || away.shortName} · تقييم {away.rating > 0 ? away.rating : '—'}
                      </div>
                    </div>
                  </button>
                </div>

                {fixture.events && fixture.events.length > 0 && (
                  <div className="pt-3 border-t border-slate-800/60 flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-[11px] text-slate-500 font-bold">سجل الأحداث الرسمي:</span>
                    {fixture.events.map((ev, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-0.5 bg-slate-950 border border-slate-800 rounded-md text-slate-300 font-mono text-[11px]"
                      >
                        د {ev.minute}&apos; {ev.player}
                      </span>
                    ))}
                  </div>
                )}

                <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onOpenMatch?.(fixture)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors font-bold text-xs"
                    >
                      <Eye className="w-3.5 h-3.5 text-amber-400" />
                      <span>صفحة تفاصيل المباراة</span>
                    </button>
                    {fixture.streamUrl && (
                      <a
                        href={fixture.streamUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors font-medium text-xs"
                      >
                        <Video className="w-3.5 h-3.5 text-rose-500" />
                        <span>البث المباشر</span>
                      </a>
                    )}
                  </div>

                  <button
                    onClick={() => {
                      setSelectedFixture(fixture);
                      setSimulatorOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500/20 to-amber-500/10 hover:from-amber-500/30 hover:to-amber-500/20 text-amber-400 border border-amber-500/40 text-xs font-bold transition-all shadow-sm"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>محاكاة وتوقع النتيجة (AI Simulator)</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {selectedFixture && (
        <MatchSimulatorModal
          isOpen={simulatorOpen}
          onClose={() => {
            setSimulatorOpen(false);
            setSelectedFixture(null);
          }}
          fixture={selectedFixture}
          homeTeam={teams.find((t) => t.id === selectedFixture.homeTeamId) || null}
          awayTeam={teams.find((t) => t.id === selectedFixture.awayTeamId) || null}
          tournament={tournaments.find((t) => t.id === selectedFixture.tournamentId) || null}
        />
      )}
    </div>
  );
};
