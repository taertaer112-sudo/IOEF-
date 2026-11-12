import React, { useState } from 'react';
import {
  Trophy,
  Shield,
  ArrowLeft,
  Calendar,
  Sparkles,
  Globe2,
  ShoppingBag,
  CheckCircle2,
  UserPlus,
} from 'lucide-react';
import { Division, Tournament, MatchFixture, NewsItem, Team } from '../types';
import { MatchSimulatorModal } from '../components/MatchSimulatorModal';
import { DIVISION_EMBLEMS, ClubCrestBadge } from '../components/OfficialEmblems';
import { OFFICIAL_REAL_CLUBS } from '../data/officialClubs';

interface HomePageProps {
  setCurrentTab: (tab: string) => void;
  divisions: Division[];
  tournaments: Tournament[];
  fixtures: MatchFixture[];
  teams: Team[];
  news: NewsItem[];
  activeFederationId?: string | null;
  onEnterFederation?: (divisionId: string) => void;
  onOpenClub?: (club: Team) => void;
  onOpenMatch?: (fixture: MatchFixture) => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  setCurrentTab,
  divisions,
  tournaments,
  fixtures,
  teams,
  news,
  activeFederationId,
  onEnterFederation,
  onOpenClub,
  onOpenMatch,
}) => {
  const [selectedHomeFixture, setSelectedHomeFixture] = useState<MatchFixture | null>(null);
  const [homeSimulatorOpen, setHomeSimulatorOpen] = useState<boolean>(false);

  const scopedFixtures = activeFederationId
    ? fixtures.filter((f) => f.divisionId === activeFederationId)
    : fixtures;
  const scopedNews = activeFederationId
    ? news.filter((n) => !n.divisionId || n.divisionId === activeFederationId)
    : news;

  const upcomingMatches = scopedFixtures.filter((f) => f.status === 'scheduled').slice(0, 3);
  const finishedMatches = scopedFixtures.filter((f) => f.status === 'finished').slice(0, 2);

  const activeFederation = activeFederationId ? divisions.find((d) => d.id === activeFederationId) : null;
  const approvedClubsCount = teams.filter((t) => t.registrationStatus === 'approved' || !!t.playerId).length;

  const getTeam = (teamId: string): Team => {
    return (
      teams.find((t) => t.id === teamId) || {
        id: teamId,
        divisionId: 'div_ksa',
        tournamentId: 'tour_ksa_d1',
        name: 'نادي رسمي',
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
      }
    );
  };

  return (
    <div className="space-y-16 animate-fadeIn">
      {/* 1. Institutional Hero Section */}
      <section className="relative overflow-hidden border-b border-slate-800 bg-gradient-to-b from-slate-950 via-slate-900/60 to-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 lg:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-7 space-y-6">
              <div className="text-xs font-bold text-amber-400 tracking-wider flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                <span>
                  {activeFederation
                    ? `البوابة المستقلة لـ ${activeFederation.nameAr} (${activeFederation.code})`
                    : 'الهيئة المنظمة الرسمية لرياضات كرة القدم الإلكترونية عبر الإنترنت'}
                </span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white leading-tight tracking-tight" style={{ textWrap: 'balance' }}>
                {activeFederation ? activeFederation.nameAr : 'الاتحاد الدولي للرياضات الإلكترونية عبر الإنترنت (IOEF)'}
              </h1>

              <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl">
                {activeFederation
                  ? activeFederation.description
                  : 'المنصة المؤسسية الرسمية لإدارة ومتابعة بطولات eFootball في 6 اتحادات وطنية مستقلة. تنظيم دوريات الدرجة الأولى والثانية بنظام الصعود والهبوط المعتمد، وتطبيق التحكيم الذكي وتدقيق التشكيلات بالرؤية الحاسوبية لمنع التلاعب والتسجيل المتعدد.'}
              </p>

              <div className="flex flex-wrap items-center gap-3.5 pt-2">
                <button
                  onClick={() => setCurrentTab('register')}
                  className="px-6 py-3 text-xs sm:text-sm font-black text-slate-950 bg-gradient-to-r from-amber-400 to-amber-500 rounded-xl hover:from-amber-300 hover:to-amber-400 transition-all shadow-xl flex items-center gap-2"
                >
                  <Shield className="w-4 h-4" />
                  <span>تسجيل اللاعبين والأندية الرسمية</span>
                  <ArrowLeft className="w-4 h-4" />
                </button>

                <button
                  onClick={() => setCurrentTab('divisions')}
                  className="px-5 py-3 text-xs sm:text-sm font-bold text-slate-200 bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 rounded-xl transition-all"
                >
                  استعراض الاتحادات والأندية
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 pt-4 border-t border-slate-800/80">
                <span className="font-semibold text-slate-300">6 اتحادات وطنية مستقلة</span>
                <span aria-hidden="true">·</span>
                <span>الدرجة الأولى: 3220+</span>
                <span aria-hidden="true">·</span>
                <span>الدرجة الثانية: 3150 إلى 3219</span>
                <span aria-hidden="true">·</span>
                <span className="text-amber-400">حظر التسجيل المتعدد نهائياً</span>
              </div>
            </div>

            <div className="lg:col-span-5 relative">
              <div className="relative rounded-3xl overflow-hidden border border-slate-800 shadow-2xl bg-slate-900 group">
                <img
                  src="/src/assets/images/ioef_hero_championship_1794337420029.jpg"
                  alt="بطولة الاتحاد الدولي للرياضات الإلكترونية"
                  referrerPolicy="no-referrer"
                  className="w-full h-80 sm:h-96 object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent"></div>
                <div className="absolute bottom-4 right-4 left-4 p-4 rounded-2xl bg-slate-950/85 backdrop-blur-md border border-slate-800/80">
                  <div className="text-xs text-amber-400 font-bold mb-1 font-mono">الموسم التنافسي الرسمي 2026/2027</div>
                  <div className="text-sm font-black text-white">دوري الأبطال والسوبر الدولي IOEF</div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    {approvedClubsCount > 0
                      ? `${approvedClubsCount} نادي معتمد من أصل ${teams.length || 234} نادياً في القوائم الرسمية`
                      : `باب القيد مفتوح الآن لحجز الأندية الـ ${teams.length || 234} في الدوريات الوطنية`}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Operational KPIs Strip */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 bg-slate-900/60 border border-slate-800 rounded-2xl shadow-lg">
          <div className="space-y-1">
            <div className="text-2xl lg:text-3xl font-black text-amber-400 font-mono tabular-nums">6</div>
            <div className="text-xs text-slate-200 font-bold">اتحادات وطنية مستقلة</div>
            <div className="text-[11px] text-slate-500">إنجلترا، إسبانيا، إيطاليا، ألمانيا، فرنسا، السعودية</div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl lg:text-3xl font-black text-amber-400 font-mono tabular-nums">{teams.length}</div>
            <div className="text-xs text-slate-200 font-bold">نادياً رسمياً معتمداً</div>
            <div className="text-[11px] text-slate-500">القوائم الكاملة للدرجة الأولى والثانية بكل اتحاد</div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl lg:text-3xl font-black text-amber-400 font-mono tabular-nums">AI OCR</div>
            <div className="text-xs text-slate-200 font-bold">فحص التشكيلات والنتائج</div>
            <div className="text-[11px] text-slate-500">استخراج القوائم تلقائياً ومطابقة المعايير</div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl lg:text-3xl font-black text-amber-400 font-mono tabular-nums">2026/2027</div>
            <div className="text-xs text-slate-200 font-bold">الموسم الرسمي النشط</div>
            <div className="text-[11px] text-slate-500">قفل تعديل التشكيلة بعد التعديل الواحد</div>
          </div>
        </div>
      </section>

      {/* 3. The 6 Independent Member Federations */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 mb-8">
          <div>
            <div className="text-xs text-amber-400 font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" />
              <span>الهيكل التنظيمي للاتحادات المعتمدة</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              الاتحادات الوطنية الستة المستقلة لدى IOEF
            </h2>
          </div>
          <button
            onClick={() => setCurrentTab('divisions')}
            className="text-xs text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 transition-colors"
          >
            <span>استعراض كافة الأندية والبطولات</span>
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {divisions.map((div) => {
            const EmblemComponent = DIVISION_EMBLEMS[div.id];
            const isActiveFed = activeFederationId === div.id;
            const divTeams = teams.filter((t) => t.divisionId === div.id);
            const availableCount = divTeams.filter(
              (t) => t.registrationStatus === 'available' || (!t.registrationStatus && !t.playerId)
            ).length;

            return (
              <div
                key={div.id}
                className={`bg-slate-900/90 border rounded-3xl p-6 transition-all shadow-xl flex flex-col justify-between ${
                  isActiveFed ? 'border-amber-500 ring-2 ring-amber-500/20' : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-5">
                    {EmblemComponent ? (
                      <EmblemComponent className="w-12 h-12 shadow-lg" />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-slate-800 text-amber-400 font-black text-sm flex items-center justify-center">
                        {div.code}
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                        {availableCount}/{divTeams.length || 36} متاح
                      </span>
                      <span className="text-xs font-mono font-bold text-amber-400 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                        {div.code}
                      </span>
                    </div>
                  </div>

                  <h3 className="text-lg font-black text-white mb-1">{div.nameAr}</h3>
                  <div className="text-xs text-slate-400 mb-3">
                    {div.nameEn} · {div.country}
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed mb-4">{div.description}</p>

                  <div className="space-y-2 pt-3 border-t border-slate-800/80 text-xs">
                    <div className="flex items-center justify-between text-slate-300">
                      <span>دوري الدرجة الأولى (نخبة)</span>
                      <span className="text-amber-400 font-mono font-bold">3,220+</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-300">
                      <span>دوري الدرجة الثانية (تحدي)</span>
                      <span className="text-sky-400 font-mono font-bold">3,150+</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-300">
                      <span>كأس الاتحاد وكأس السوبر</span>
                      <span className="text-emerald-400 font-bold">معتمد</span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-3 border-t border-slate-800">
                  <button
                    onClick={() => (onEnterFederation ? onEnterFederation(div.id) : setCurrentTab('divisions'))}
                    className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-md"
                  >
                    <span>الدخول إلى بوابة {div.nameAr}</span>
                    <ArrowLeft className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 4. Match Center Spotlight (Scheduled & Recent) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 lg:p-8 shadow-2xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div>
              <div className="text-xs text-amber-400 font-bold mb-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                <span>مركز المباريات المباشرة والمجدولة</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">جدول المواجهات ونتائج القمة</h3>
            </div>
            <button
              onClick={() => setCurrentTab('fixtures')}
              className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors"
            >
              <span>فتح جدول المباريات الكامل</span>
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
          </div>

          {upcomingMatches.length === 0 && finishedMatches.length === 0 ? (
            <div className="p-8 rounded-2xl bg-slate-950/80 border border-dashed border-slate-800 text-center space-y-3">
              <Calendar className="w-9 h-9 text-amber-400 mx-auto" />
              <div className="text-base font-black text-white">لم تُجدول مباريات بعد — الموسم 2026/2027 في مرحلة القيد الرسمي</div>
              <p className="text-xs text-slate-400 max-w-xl mx-auto leading-relaxed">
                لا توجد أي مباريات أو نتائج تجريبية مخزنة؛ ستظهر مواجهات الجولات هنا فور اعتماد اللاعبين وجدولة المباريات من قِبل لجنة المسابقات.
              </p>
              <div className="pt-2">
                <button
                  onClick={() => setCurrentTab('register')}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>بادر بتسجيل ناديك الآن</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Upcoming Next */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-amber-400" />
                  <span>أبرز المباريات القادمة</span>
                </h4>
                {upcomingMatches.length === 0 ? (
                  <div className="p-6 rounded-2xl bg-slate-950/60 border border-slate-800 text-center text-xs text-slate-500">
                    لا توجد مباريات مجدولة قادمة حالياً.
                  </div>
                ) : (
                  upcomingMatches.map((match) => {
                    const home = getTeam(match.homeTeamId);
                    const away = getTeam(match.awayTeamId);
                    const homeReal = OFFICIAL_REAL_CLUBS.find((c) => c.id === home.realClubId || c.nameAr === home.name);
                    const awayReal = OFFICIAL_REAL_CLUBS.find((c) => c.id === away.realClubId || c.nameAr === away.name);

                    return (
                      <div
                        key={match.id}
                        className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-4 space-y-3 hover:border-slate-700 transition-colors shadow-md"
                      >
                        <div className="flex items-center justify-between gap-4">
                          <button
                            onClick={() => onOpenClub?.(home)}
                            className="flex-1 flex items-center justify-end gap-3 text-right hover:opacity-90"
                          >
                            <div>
                              <span className="text-sm font-black text-white block hover:text-amber-400 transition-colors">
                                {home.name}
                              </span>
                              <span className="text-[10px] text-slate-500 font-mono">{homeReal?.nameEn || home.shortName}</span>
                            </div>
                            <ClubCrestBadge
                              shortName={home.shortName}
                              name={home.name}
                              primaryColor={home.color || homeReal?.primaryColor}
                              secondaryColor={home.secondaryColor || homeReal?.secondaryColor}
                              size="sm"
                            />
                          </button>

                          <button
                            onClick={() => onOpenMatch?.(match)}
                            className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-center shrink-0 transition-colors"
                          >
                            <div className="text-xs font-mono font-black text-amber-400">{match.matchTime}</div>
                            <div className="text-[10px] text-slate-500 font-mono">{match.matchDate}</div>
                          </button>

                          <button
                            onClick={() => onOpenClub?.(away)}
                            className="flex-1 flex items-center justify-start gap-3 text-left hover:opacity-90"
                          >
                            <ClubCrestBadge
                              shortName={away.shortName}
                              name={away.name}
                              primaryColor={away.color || awayReal?.primaryColor}
                              secondaryColor={away.secondaryColor || awayReal?.secondaryColor}
                              size="sm"
                            />
                            <div>
                              <span className="text-sm font-black text-white block hover:text-amber-400 transition-colors">
                                {away.name}
                              </span>
                              <span className="text-[10px] text-slate-500 font-mono">{awayReal?.nameEn || away.shortName}</span>
                            </div>
                          </button>
                        </div>

                        <div className="pt-2.5 border-t border-slate-800/60 flex items-center justify-between text-xs">
                          <button
                            onClick={() => onOpenMatch?.(match)}
                            className="text-[11px] text-slate-400 hover:text-white font-medium"
                          >
                            {match.roundName} · تفاصيل المباراة
                          </button>
                          <button
                            onClick={() => {
                              setSelectedHomeFixture(match);
                              setHomeSimulatorOpen(true);
                            }}
                            className="px-3 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[11px] font-bold flex items-center gap-1.5 transition-colors"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>محاكاة وتوقع AI</span>
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Recent Results */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  <span>آخر النتائج المعتمدة</span>
                </h4>
                {finishedMatches.length === 0 ? (
                  <div className="p-6 rounded-2xl bg-slate-950/60 border border-slate-800 text-center text-xs text-slate-500">
                    لا توجد نتائج معتمدة بعد.
                  </div>
                ) : (
                  finishedMatches.map((match) => {
                    const home = getTeam(match.homeTeamId);
                    const away = getTeam(match.awayTeamId);
                    const homeReal = OFFICIAL_REAL_CLUBS.find((c) => c.id === home.realClubId || c.nameAr === home.name);
                    const awayReal = OFFICIAL_REAL_CLUBS.find((c) => c.id === away.realClubId || c.nameAr === away.name);

                    return (
                      <div
                        key={match.id}
                        className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-4 flex items-center justify-between gap-4 shadow-md"
                      >
                        <button
                          onClick={() => onOpenClub?.(home)}
                          className="flex-1 flex items-center justify-end gap-3 text-right hover:opacity-90"
                        >
                          <div>
                            <span className="text-sm font-black text-white block hover:text-amber-400">{home.name}</span>
                            <span className="text-[10px] text-slate-500 font-mono">{homeReal?.nameEn || home.shortName}</span>
                          </div>
                          <ClubCrestBadge
                            shortName={home.shortName}
                            name={home.name}
                            primaryColor={home.color || homeReal?.primaryColor}
                            secondaryColor={home.secondaryColor || homeReal?.secondaryColor}
                            size="sm"
                          />
                        </button>

                        <button
                          onClick={() => onOpenMatch?.(match)}
                          className="px-4 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-xl text-center shrink-0 transition-colors"
                        >
                          <div className="text-base font-mono font-black text-amber-400 tracking-wider">
                            {match.homeScore} : {match.awayScore}
                          </div>
                          <div className="text-[10px] text-emerald-400 font-bold mt-0.5">نتيجة معتمدة</div>
                        </button>

                        <button
                          onClick={() => onOpenClub?.(away)}
                          className="flex-1 flex items-center justify-start gap-3 text-left hover:opacity-90"
                        >
                          <ClubCrestBadge
                            shortName={away.shortName}
                            name={away.name}
                            primaryColor={away.color || awayReal?.primaryColor}
                            secondaryColor={away.secondaryColor || awayReal?.secondaryColor}
                            size="sm"
                          />
                          <div>
                            <span className="text-sm font-black text-white block hover:text-amber-400">{away.name}</span>
                            <span className="text-[10px] text-slate-500 font-mono">{awayReal?.nameEn || away.shortName}</span>
                          </div>
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 5. Central AI Squad Scanner Showcase */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border border-slate-800 rounded-3xl p-6 lg:p-10 shadow-2xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-6 space-y-4">
              <div className="inline-flex items-center gap-1.5 text-xs text-amber-400 font-bold px-3 py-1 bg-amber-500/10 border border-amber-500/30 rounded-full">
                <Sparkles className="w-3.5 h-3.5" />
                <span>محرك التحكيم الرقمي والرؤية الحاسوبية 2026/2027</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                فحص التشكيلات الذكي وضمان تكافؤ الفرص
              </h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                تقنية حصرية تمكن الاتحاد من قراءة لقطة تشكيلة eFootball Mobile فورياً، واستخراج قائمة اللاعبين والتقييم والخطط لمطابقتها بشروط الدرجة المطلوبة (3220+ للأولى و3150+ للثانية) مع التحويل الذكي التلقائي.
              </p>

              <ul className="space-y-2 text-xs text-slate-300 pt-2">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>استخراج قائمة اللاعبين ومراكزهم من صورة التشكيلة</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>التحويل الفوري إلى الدرجة الثانية إذا كانت القوة بين 3150 و3219</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>منع تكرار حسابات المستخدمين مع حرية تشابه لاعبي كرة القدم بين الأندية</span>
                </li>
              </ul>

              <div className="pt-3">
                <button
                  onClick={() => setCurrentTab('register')}
                  className="px-5 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black rounded-xl hover:from-amber-400 hover:to-amber-500 transition-all text-xs flex items-center gap-2 shadow-lg"
                >
                  <span>جرب فحص تشكيلتك الآن أثناء التسجيل</span>
                  <ArrowLeft className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="relative rounded-2xl overflow-hidden border border-slate-800 shadow-2xl bg-slate-950 aspect-[4/3]">
                <img
                  src="/src/assets/images/efootball_squad_tactics_1794337420067.jpg"
                  alt="لوحة فحص التشكيلة الذكية"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Official IOEF Store Showcase */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="text-xs text-amber-400 font-bold mb-1 flex items-center gap-1.5">
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>المتجر الرسمي والوسطاء المعتمدون</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">منتجات وخدمات IOEF الحصرية</h3>
          </div>
          <button
            onClick={() => setCurrentTab('store')}
            className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors"
          >
            <span>زيارة متجر الاتحاد وتقديم طلب</span>
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="rounded-2xl overflow-hidden border border-slate-800 bg-slate-900 flex flex-col shadow-xl">
            <img
              src="/src/assets/images/ioef_store_merchandise_1794337421474.jpg"
              alt="طقم الاتحاد المعتمد"
              referrerPolicy="no-referrer"
              className="w-full h-48 object-cover"
            />
            <div className="p-5 flex-1 flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-mono text-amber-400 font-bold">الأطقم الرسمية المعتمدة</span>
                <h4 className="text-base font-black text-white mt-1">قميص المنافسات الرسمي IOEF 2026</h4>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  القميص الرسمي بنسخة الذهب المعتمدة، مع شارة التوثيق الرسمية على الكتف.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
                <span className="text-sm font-black text-white font-mono">65 USD</span>
                <button
                  onClick={() => setCurrentTab('store')}
                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white rounded-lg transition-colors"
                >
                  طلب الشراء
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-2xl overflow-hidden border border-slate-800 bg-slate-900 flex flex-col shadow-xl">
            <img
              src="/src/assets/images/efootball_squad_tactics_1794337420067.jpg"
              alt="شحن كوينز رسمي"
              referrerPolicy="no-referrer"
              className="w-full h-48 object-cover"
            />
            <div className="p-5 flex-1 flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-mono text-emerald-400 font-bold">وساطة معتمدة</span>
                <h4 className="text-base font-black text-white mt-1">شحن كوينز eFootball رسمي (12,000 كوينز)</h4>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  خدمة شحن آمنة عبر وسطاء الاتحاد المعتمدين والموثقين بالمتابعة الإدارية.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
                <span className="text-sm font-black text-white font-mono">99 USD</span>
                <button
                  onClick={() => setCurrentTab('store')}
                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white rounded-lg transition-colors"
                >
                  طلب الشراء
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-2xl overflow-hidden border border-slate-800 bg-slate-900 flex flex-col shadow-xl">
            <img
              src="/src/assets/images/ioef_trophy_international_1794337419936.jpg"
              alt="كأس الاتحاد الدولي"
              referrerPolicy="no-referrer"
              className="w-full h-48 object-cover"
            />
            <div className="p-5 flex-1 flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-mono text-amber-400 font-bold">جواز الموسم والخدمات</span>
                <h4 className="text-base font-black text-white mt-1">جواز المحترفين الموسمي 2026/2027</h4>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  تقارير الذكاء الاصطناعي التكتيكية المفصلة وأولوية معالجة الاستفسارات.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
                <span className="text-sm font-black text-white font-mono">35 USD</span>
                <button
                  onClick={() => setCurrentTab('store')}
                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white rounded-lg transition-colors"
                >
                  طلب الشراء
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Official News & Bulletins */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="text-xs text-amber-400 font-bold mb-1 flex items-center gap-1.5">
              <Globe2 className="w-3.5 h-3.5" />
              <span>المركز الإعلامي والبيانات الرسمية</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">أحدث أخبار وبيانات الاتحاد الدولي</h3>
          </div>
          <button
            onClick={() => setCurrentTab('news')}
            className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors"
          >
            <span>جميع الأخبار والبيانات الصحفية</span>
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {scopedNews.slice(0, 3).map((item) => (
            <article
              key={item.id}
              className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden hover:border-slate-700 transition-colors flex flex-col shadow-xl"
            >
              <img
                src={item.imageUrl}
                alt={item.title}
                referrerPolicy="no-referrer"
                className="w-full h-44 object-cover"
              />
              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
                    <span className="text-amber-400 font-bold">
                      {item.category === 'announcement' ? 'إعلان رسمي' : item.category === 'technical' ? 'لائحة فنية' : 'بيان صحفي'}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">{item.publishedAt}</span>
                  </div>
                  <h4 className="text-sm font-black text-white line-clamp-2 leading-snug">{item.title}</h4>
                  <p className="text-xs text-slate-400 mt-2 line-clamp-2 leading-relaxed">{item.summary}</p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-800/80 text-xs text-slate-500">المصدر: {item.author}</div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <MatchSimulatorModal
        isOpen={homeSimulatorOpen}
        onClose={() => {
          setHomeSimulatorOpen(false);
          setSelectedHomeFixture(null);
        }}
        fixture={selectedHomeFixture}
        homeTeam={selectedHomeFixture ? teams.find((t) => t.id === selectedHomeFixture.homeTeamId) || null : null}
        awayTeam={selectedHomeFixture ? teams.find((t) => t.id === selectedHomeFixture.awayTeamId) || null : null}
        tournament={selectedHomeFixture ? tournaments.find((t) => t.id === selectedHomeFixture.tournamentId) || null : null}
      />
    </div>
  );
};
