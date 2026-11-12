import React, { useState, useEffect } from 'react';
import { Division, Tournament, Team } from '../types';
import { updatePageSeo } from '../utils/seo';
import {
  Trophy,
  Shield,
  ArrowUpRight,
  ArrowDownRight,
  Award,
  Calendar,
  Layers,
  Building2,
  BookOpen,
  Flame,
  CheckCircle2,
  Clock,
  UserPlus,
} from 'lucide-react';
import { DIVISION_EMBLEMS, LeagueBadge, ClubCrestBadge } from '../components/OfficialEmblems';
import { OFFICIAL_REAL_CLUBS } from '../data/officialClubs';

interface DivisionsPageProps {
  divisions: Division[];
  tournaments: Tournament[];
  teams: Team[];
  setCurrentTab: (tab: string) => void;
  activeFederationId?: string | null;
  onSelectFederation?: (divisionId: string | null) => void;
  onOpenClub?: (club: Team) => void;
}

type DivisionSubTab = 'tier1' | 'tier2' | 'cup' | 'supercup' | 'clubs' | 'regulations';

export const DivisionsPage: React.FC<DivisionsPageProps> = ({
  divisions,
  tournaments,
  teams,
  setCurrentTab,
  activeFederationId,
  onSelectFederation,
  onOpenClub,
}) => {
  const [selectedDivisionId, setSelectedDivisionId] = useState<string>(activeFederationId || 'div_ksa');
  const [viewScope, setViewScope] = useState<'local' | 'international'>('local');
  const [activeSubTab, setActiveSubTab] = useState<DivisionSubTab>('tier1');

  useEffect(() => {
    if (activeFederationId) {
      setSelectedDivisionId(activeFederationId);
      setViewScope('local');
    }
  }, [activeFederationId]);

  const activeDivision = divisions.find((d) => d.id === selectedDivisionId) || divisions[0];
  const ActiveDivisionEmblem = activeDivision ? DIVISION_EMBLEMS[activeDivision.id] : null;

  const localTournaments = tournaments.filter((t) => t.divisionId === selectedDivisionId);
  const internationalTournaments = tournaments.filter((t) => !t.divisionId);

  const tier1Tour = localTournaments.find((t) => t.category === 'first_division');
  const tier2Tour = localTournaments.find((t) => t.category === 'second_division');
  const cupTour = localTournaments.find((t) => t.category === 'division_cup');
  const superCupTour = localTournaments.find((t) => t.category === 'division_super_cup');

  const divisionTeams = teams.filter((t) => t.divisionId === selectedDivisionId);
  const tier1Teams = divisionTeams.filter((t) => t.divisionTier === 1);
  const tier2Teams = divisionTeams.filter((t) => t.divisionTier === 2);

  const officialClubsForDivision = OFFICIAL_REAL_CLUBS.filter((c) => c.divisionId === selectedDivisionId);

  useEffect(() => {
    if (viewScope === 'international') {
      updatePageSeo({
        title: 'البطولات الدولية والقارية الكبرى | دوري أبطال أوروبا | IOEF',
        description: 'البطولات القارية الكبرى للاتحاد الدولي: دوري أبطال أوروبا، الدوري الأوروبي، وكأس السوبر الدولي لنخبة أندية العالم.',
        canonicalPath: '/?tab=divisions&scope=international',
      });
      return;
    }

    const divisionName = activeDivision?.nameAr || 'الاتحاد الوطني';
    let tournamentName = '';
    if (activeSubTab === 'tier1') tournamentName = tier1Tour?.nameAr || 'دوري الدرجة الأولى';
    else if (activeSubTab === 'tier2') tournamentName = tier2Tour?.nameAr || 'دوري الدرجة الثانية';
    else if (activeSubTab === 'cup') tournamentName = cupTour?.nameAr || 'كأس القسم';
    else if (activeSubTab === 'supercup') tournamentName = superCupTour?.nameAr || 'كأس السوبر';
    else if (activeSubTab === 'clubs') tournamentName = 'الأندية والفرق الرسمية';
    else if (activeSubTab === 'regulations') tournamentName = 'لوائح ونظام الصعود والهبوط';

    updatePageSeo({
      title: `${tournamentName} - ${divisionName} | الاتحاد الدولي IOEF`,
      description: `متابعة ${tournamentName} التابع لـ ${divisionName}، نظام الصعود والهبوط، وقائمة الأندية العالمية الرسمية المشاركة في منافسات eFootball.`,
      canonicalPath: `/?tab=divisions&division=${selectedDivisionId}&sub=${activeSubTab}`,
    });
  }, [viewScope, selectedDivisionId, activeSubTab, activeDivision, tier1Tour, tier2Tour, cupTour, superCupTour]);

  const handleSelectDivision = (divId: string) => {
    setSelectedDivisionId(divId);
    onSelectFederation?.(divId);
  };

  const renderStatusBadge = (team: Team) => {
    const st = team.registrationStatus || (team.playerId ? 'approved' : 'available');
    if (st === 'approved') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
          <CheckCircle2 className="w-3 h-3" />
          <span>معتمد</span>
        </span>
      );
    }
    if (st === 'pending') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
          <Clock className="w-3 h-3" />
          <span>قيد المراجعة</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/30">
        <UserPlus className="w-3 h-3" />
        <span>متاح للتسجيل</span>
      </span>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8 animate-fadeIn">
      {/* Page Executive Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-6 border-b border-slate-800">
        <div>
          <div className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-2 flex items-center gap-2">
            <Shield className="w-4 h-4 text-amber-500" />
            <span>البنية التنافسية الرسمية المعتمدة عالمياً</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-tight">
            الاتحادات الوطنية والأقسام الرسمية
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-2 max-w-3xl leading-relaxed">
            تنظيم هيكلي مؤسسي مستقل لكل اتحاد وطني. يضم الاتحاد الدولي 6 اتحادات وطنية، يدير كل منها 4 بطولات رسمية مستقلة بنظام الصعود والهبوط وبمشاركة القوائم الكاملة للأندية الرسمية في الدرجتين الأولى والثانية ({teams.length || 234} نادياً).
          </p>
        </div>

        <div className="flex items-center gap-1.5 p-1.5 bg-slate-900 border border-slate-800 rounded-2xl shrink-0 self-start lg:self-auto shadow-inner">
          <button
            onClick={() => setViewScope('local')}
            className={`px-5 py-2.5 text-xs font-black rounded-xl transition-all ${
              viewScope === 'local'
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-lg shadow-amber-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            الاتحادات الوطنية (6 دول)
          </button>
          <button
            onClick={() => setViewScope('international')}
            className={`px-5 py-2.5 text-xs font-black rounded-xl transition-all ${
              viewScope === 'international'
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-lg shadow-amber-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            البطولات الدولية القارية
          </button>
        </div>
      </div>

      {viewScope === 'local' ? (
        <div className="space-y-8">
          {/* Country / Division Horizontal Selector Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {divisions.map((div) => {
              const isSelected = div.id === selectedDivisionId;
              const DivisionEmblem = DIVISION_EMBLEMS[div.id];

              return (
                <button
                  key={div.id}
                  onClick={() => handleSelectDivision(div.id)}
                  className={`relative p-3.5 rounded-2xl border text-right transition-all flex items-center gap-3 group ${
                    isSelected
                      ? 'bg-gradient-to-b from-slate-800 to-slate-900 border-amber-500 shadow-xl ring-2 ring-amber-500/30'
                      : 'bg-slate-950/70 border-slate-800/80 text-slate-400 hover:border-slate-700 hover:bg-slate-900/60'
                  }`}
                >
                  {DivisionEmblem ? (
                    <DivisionEmblem className="w-10 h-10 shrink-0 transition-transform group-hover:scale-105" />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-slate-800 text-amber-400 font-black text-sm flex items-center justify-center">
                      {div.code}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className={`text-xs font-black truncate ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                      {div.nameAr}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono tracking-wider">
                      {div.code} · {div.country}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Institutional Federation Banner */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-slate-800 p-6 sm:p-8 shadow-2xl">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
              <div className="flex items-center gap-5">
                {ActiveDivisionEmblem ? (
                  <ActiveDivisionEmblem className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 drop-shadow-2xl" />
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-black text-xl">
                    {activeDivision.code}
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[10px] font-black font-mono">
                      بوابة اتحاد وطني مستقل
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">كود الاتحاد: {activeDivision.code}</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-white">{activeDivision.nameAr}</h2>
                  <div className="text-xs text-slate-400 mt-0.5 font-mono">
                    {activeDivision.nameEn} · {activeDivision.country}
                  </div>
                  <p className="text-xs text-slate-300 mt-2 max-w-2xl leading-relaxed">{activeDivision.description}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 sm:gap-6 border-t lg:border-t-0 lg:border-r border-slate-800 pt-4 lg:pt-0 lg:pr-8 w-full lg:w-auto">
                <div className="bg-slate-900/60 p-3 rounded-2xl border border-slate-800/80 text-center">
                  <div className="text-[10px] text-slate-400 font-bold">الدرجة الأولى</div>
                  <div className="text-amber-400 font-black text-base font-mono">3,220+</div>
                  <div className="text-[9px] text-slate-500 mt-0.5">معيار القوة</div>
                </div>
                <div className="bg-slate-900/60 p-3 rounded-2xl border border-slate-800/80 text-center">
                  <div className="text-[10px] text-slate-400 font-bold">الدرجة الثانية</div>
                  <div className="text-sky-400 font-black text-base font-mono">3,150+</div>
                  <div className="text-[9px] text-slate-500 mt-0.5">معيار القوة</div>
                </div>
                <div className="bg-slate-900/60 p-3 rounded-2xl border border-slate-800/80 text-center">
                  <div className="text-[10px] text-slate-400 font-bold">الأندية المعتمدة</div>
                  <div className="text-emerald-400 font-black text-base font-mono">{officialClubsForDivision.length} نادياً</div>
                  <div className="text-[9px] text-slate-500 mt-0.5">{tier1Teams.length} أولى · {tier2Teams.length} ثانية</div>
                </div>
              </div>
            </div>
          </div>

          {/* Sub-Navigation Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar border-b border-slate-800 pb-2">
            <button
              onClick={() => setActiveSubTab('tier1')}
              className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 shrink-0 ${
                activeSubTab === 'tier1' ? 'bg-amber-500 text-slate-950 shadow-md' : 'bg-slate-900/80 text-slate-400 hover:text-white'
              }`}
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>دوري الدرجة الأولى</span>
            </button>

            <button
              onClick={() => setActiveSubTab('tier2')}
              className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 shrink-0 ${
                activeSubTab === 'tier2' ? 'bg-sky-500 text-slate-950 shadow-md' : 'bg-slate-900/80 text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>دوري الدرجة الثانية</span>
            </button>

            <button
              onClick={() => setActiveSubTab('cup')}
              className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 shrink-0 ${
                activeSubTab === 'cup' ? 'bg-amber-500 text-slate-950 shadow-md' : 'bg-slate-900/80 text-slate-400 hover:text-white'
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              <span>كأس القسم الوطني</span>
            </button>

            <button
              onClick={() => setActiveSubTab('supercup')}
              className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 shrink-0 ${
                activeSubTab === 'supercup' ? 'bg-amber-500 text-slate-950 shadow-md' : 'bg-slate-900/80 text-slate-400 hover:text-white'
              }`}
            >
              <Flame className="w-3.5 h-3.5" />
              <span>كأس السوبر</span>
            </button>

            <button
              onClick={() => setActiveSubTab('clubs')}
              className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 shrink-0 ${
                activeSubTab === 'clubs' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'bg-slate-900/80 text-slate-400 hover:text-white'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>دليل الأندية المعتمدة ({officialClubsForDivision.length} نادياً)</span>
            </button>

            <button
              onClick={() => setActiveSubTab('regulations')}
              className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 shrink-0 ${
                activeSubTab === 'regulations' ? 'bg-indigo-500 text-white shadow-md' : 'bg-slate-900/80 text-slate-400 hover:text-white'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>لوائح الصعود والهبوط</span>
            </button>
          </div>

          {/* Sub-Tab 1: TIER 1 */}
          {activeSubTab === 'tier1' && (
            <div className="space-y-6">
              <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xl">
                <div className="flex items-center gap-5">
                  <LeagueBadge divisionId={activeDivision.id} tier={1} category="first_division" className="w-16 h-16" />
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-black uppercase font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
                        الدوري الممتاز · الدرجة الأولى
                      </span>
                      <span className="text-xs text-slate-400 font-mono">موسم {tier1Tour?.season || '2026/2027'}</span>
                    </div>
                    <h3 className="text-xl sm:text-2xl font-black text-white">{tier1Tour?.nameAr || 'دوري الدرجة الأولى'}</h3>
                    <p className="text-xs text-slate-300 mt-1 max-w-xl leading-relaxed">{tier1Tour?.rulesSummary}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                  <button
                    onClick={() => setCurrentTab('standings')}
                    className="flex-1 md:flex-initial px-5 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black text-xs hover:from-amber-400 hover:to-amber-500 transition-all flex items-center justify-center gap-2 shadow-lg"
                  >
                    <Trophy className="w-4 h-4" />
                    <span>جدول الترتيب الكامل</span>
                  </button>
                  <button
                    onClick={() => setCurrentTab('fixtures')}
                    className="flex-1 md:flex-initial px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-all flex items-center justify-center gap-2 border border-slate-700"
                  >
                    <Calendar className="w-4 h-4 text-amber-400" />
                    <span>جدول المباريات</span>
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-black text-white flex items-center gap-2">
                    <span>الأندية الرسمية في الدرجة الأولى</span>
                    <span className="text-xs text-amber-400 font-mono">({tier1Teams.length} أندية)</span>
                  </h4>
                  <span className="text-[11px] text-slate-400 font-mono">اضغط على أي نادٍ لفتح ملف النادي والقائمة</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {tier1Teams.map((team, idx) => {
                    const realClub = OFFICIAL_REAL_CLUBS.find((c) => c.id === team.realClubId || c.nameAr === team.name);
                    return (
                      <button
                        key={team.id}
                        onClick={() => onOpenClub?.(team)}
                        className="text-right bg-slate-950/80 border border-slate-800 rounded-2xl p-4 hover:border-amber-500/60 transition-all flex flex-col justify-between group shadow-md"
                      >
                        <div className="flex items-start justify-between gap-3 mb-3 w-full">
                          <ClubCrestBadge
                            shortName={team.shortName}
                            name={team.name}
                            primaryColor={team.color || realClub?.primaryColor}
                            secondaryColor={team.secondaryColor || realClub?.secondaryColor}
                            size="md"
                            className="shadow-md group-hover:scale-105 transition-transform"
                          />
                          <div className="flex flex-col items-end gap-1">
                            <span className="text-[10px] font-black font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
                              #{idx + 1}
                            </span>
                            {renderStatusBadge(team)}
                          </div>
                        </div>

                        <div className="w-full">
                          <h5 className="text-sm font-black text-white leading-snug group-hover:text-amber-400 transition-colors">
                            {team.name}
                          </h5>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">{realClub?.nameEn || team.shortName}</div>
                          {team.managerName && (
                            <div className="text-[11px] text-emerald-400 mt-1.5 font-bold truncate">
                              القائد: {team.managerName}
                            </div>
                          )}
                        </div>

                        <div className="w-full mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs font-mono">
                          <span className="text-slate-400">
                            القوة: <strong className="text-amber-400 font-black">{team.rating > 0 ? team.rating : '—'}</strong>
                          </span>
                          <span className="text-slate-400">
                            النقاط: <strong className="text-white font-black">{team.points}</strong>
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Sub-Tab 2: TIER 2 */}
          {activeSubTab === 'tier2' && (
            <div className="space-y-6">
              <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xl">
                <div className="flex items-center gap-5">
                  <LeagueBadge divisionId={activeDivision.id} tier={2} category="second_division" className="w-16 h-16" />
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-black uppercase font-mono px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/30">
                        دوري الدرجة الثانية · نظام الصعود المباشر
                      </span>
                      <span className="text-xs text-slate-400 font-mono">موسم {tier2Tour?.season || '2026/2027'}</span>
                    </div>
                    <h3 className="text-xl sm:text-2xl font-black text-white">{tier2Tour?.nameAr || 'دوري الدرجة الثانية'}</h3>
                    <p className="text-xs text-slate-300 mt-1 max-w-xl leading-relaxed">{tier2Tour?.rulesSummary}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                  <button
                    onClick={() => setCurrentTab('standings')}
                    className="flex-1 md:flex-initial px-5 py-3 rounded-xl bg-gradient-to-r from-sky-500 to-sky-600 text-slate-950 font-black text-xs hover:from-sky-400 hover:to-sky-500 transition-all flex items-center justify-center gap-2 shadow-lg"
                  >
                    <Trophy className="w-4 h-4" />
                    <span>جدول ترتيب الدرجة الثانية</span>
                  </button>
                  <button
                    onClick={() => setCurrentTab('fixtures')}
                    className="flex-1 md:flex-initial px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-all flex items-center justify-center gap-2 border border-slate-700"
                  >
                    <Calendar className="w-4 h-4 text-sky-400" />
                    <span>جدول المباريات</span>
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-black text-white flex items-center gap-2">
                    <span>الأندية الرسمية في الدرجة الثانية</span>
                    <span className="text-xs text-sky-400 font-mono">({tier2Teams.length} أندية)</span>
                  </h4>
                  <span className="text-[11px] text-slate-400 font-mono">سقف القوة: 3,150 إلى 3,219</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {tier2Teams.map((team, idx) => {
                    const realClub = OFFICIAL_REAL_CLUBS.find((c) => c.id === team.realClubId || c.nameAr === team.name);
                    return (
                      <button
                        key={team.id}
                        onClick={() => onOpenClub?.(team)}
                        className="text-right bg-slate-950/80 border border-slate-800 hover:border-sky-500/60 rounded-2xl p-4 transition-all flex flex-col justify-between group shadow-md"
                      >
                        <div className="flex items-start justify-between gap-3 mb-3 w-full">
                          <ClubCrestBadge
                            shortName={team.shortName}
                            name={team.name}
                            primaryColor={team.color || realClub?.primaryColor}
                            secondaryColor={team.secondaryColor || realClub?.secondaryColor}
                            size="md"
                            className="shadow-md group-hover:scale-105 transition-transform"
                          />
                          <div className="flex flex-col items-end gap-1">
                            <span className="text-[10px] font-black font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
                              #{idx + 1}
                            </span>
                            {renderStatusBadge(team)}
                          </div>
                        </div>

                        <div className="w-full">
                          <h5 className="text-sm font-black text-white leading-snug group-hover:text-sky-400 transition-colors">
                            {team.name}
                          </h5>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">{realClub?.nameEn || team.shortName}</div>
                          {team.managerName && (
                            <div className="text-[11px] text-emerald-400 mt-1.5 font-bold truncate">
                              القائد: {team.managerName}
                            </div>
                          )}
                        </div>

                        <div className="w-full mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs font-mono">
                          <span className="text-slate-400">
                            القوة: <strong className="text-sky-400 font-black">{team.rating > 0 ? team.rating : '—'}</strong>
                          </span>
                          <span className="text-slate-400">
                            النقاط: <strong className="text-white font-black">{team.points}</strong>
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Sub-Tab 3: NATIONAL CUP */}
          {activeSubTab === 'cup' && (
            <div className="space-y-6">
              <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xl">
                <div className="flex items-center gap-5">
                  <LeagueBadge divisionId={activeDivision.id} category="division_cup" className="w-16 h-16" />
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-black uppercase font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
                        كأس خروج المغلوب الرسمي
                      </span>
                      <span className="text-xs text-slate-400 font-mono">موسم {cupTour?.season || '2026/2027'}</span>
                    </div>
                    <h3 className="text-xl sm:text-2xl font-black text-white">{cupTour?.nameAr || 'كأس الاتحاد الوطني'}</h3>
                    <p className="text-xs text-slate-300 mt-1 max-w-xl leading-relaxed">{cupTour?.rulesSummary}</p>
                  </div>
                </div>

                <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 text-xs font-mono space-y-1.5 min-w-[200px]">
                  <div className="text-slate-400 flex justify-between">
                    <span>نظام البطولة:</span>
                    <strong className="text-white">خروج مغلوب</strong>
                  </div>
                  <div className="text-slate-400 flex justify-between">
                    <span>عدد الفرق:</span>
                    <strong className="text-amber-400">{officialClubsForDivision.length} نادياً</strong>
                  </div>
                  <div className="text-slate-400 flex justify-between">
                    <span>كأس البطولة:</span>
                    <strong className="text-emerald-400 truncate">{cupTour?.trophyName || 'كأس القسم'}</strong>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 space-y-3">
                  <div className="text-xs font-black text-amber-400 font-mono">الأدوار التمهيدية وثمن النهائي</div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    مواجهات إقصائية مباشرة تجمع أندية الدرجة الأولى مع أندية الدرجة الثانية.
                  </p>
                  <div className="text-[11px] text-slate-500 font-mono">قرعة رسمية لكل اتحاد</div>
                </div>
                <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 space-y-3">
                  <div className="text-xs font-black text-amber-400 font-mono">الدور ربع النهائي</div>
                  <p className="text-xs text-slate-400 leading-relaxed">صعود الفرق الثمانية الفائزة للمنافسة على بطاقات نصف النهائي.</p>
                  <div className="text-[11px] text-slate-500 font-mono">4 مباريات</div>
                </div>
                <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 space-y-3">
                  <div className="text-xs font-black text-amber-400 font-mono">الدور نصف النهائي</div>
                  <p className="text-xs text-slate-400 leading-relaxed">تحديد طرفي المباراة النهائية لكأس الاتحاد الوطني.</p>
                  <div className="text-[11px] text-slate-500 font-mono">مباراتان رسميتان</div>
                </div>
                <div className="bg-slate-950/80 border border-amber-500/40 rounded-2xl p-5 space-y-3">
                  <div className="text-xs font-black text-amber-300 font-mono flex items-center gap-1.5">
                    <Trophy className="w-3.5 h-3.5 text-amber-400" />
                    <span>المباراة النهائية</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">تتويج البطل وحجز مقعد السوبر الرسمي.</p>
                  <div className="text-[11px] text-amber-400 font-mono font-bold">بطل الكأس الرسمي</div>
                </div>
              </div>
            </div>
          )}

          {/* Sub-Tab 4: SUPER CUP */}
          {activeSubTab === 'supercup' && (
            <div className="space-y-6">
              <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xl">
                <div className="flex items-center gap-5">
                  <LeagueBadge divisionId={activeDivision.id} category="division_super_cup" className="w-16 h-16" />
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-black uppercase font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
                        مباراة السوبر للموسم 2026/2027
                      </span>
                      <span className="text-xs text-slate-400 font-mono">موسم {superCupTour?.season || '2026/2027'}</span>
                    </div>
                    <h3 className="text-xl sm:text-2xl font-black text-white">{superCupTour?.nameAr || 'كأس السوبر الوطني'}</h3>
                    <p className="text-xs text-slate-300 mt-1 max-w-xl leading-relaxed">{superCupTour?.rulesSummary}</p>
                  </div>
                </div>

                <button
                  onClick={() => setCurrentTab('fixtures')}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black text-xs hover:from-amber-400 hover:to-amber-500 transition-all flex items-center gap-2 shadow-lg"
                >
                  <Calendar className="w-4 h-4" />
                  <span>جدول المباريات</span>
                </button>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-3xl p-8 text-center space-y-6">
                <div className="text-xs font-mono font-bold text-amber-400 uppercase tracking-widest">
                  مواجهة أبطال الموسم 2026/2027
                </div>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-8 sm:gap-16">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-amber-500/30 flex items-center justify-center text-amber-400">
                      <Trophy className="w-8 h-8" />
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-black text-white">يُحدد بنهاية الموسم</div>
                      <div className="text-[10px] text-amber-400 font-mono">بطل دوري الدرجة الأولى</div>
                    </div>
                  </div>

                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 font-black text-xs font-mono">
                      VS
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">مباراة واحدة فاصلة</span>
                  </div>

                  <div className="flex flex-col items-center gap-3">
                    <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                      <Award className="w-8 h-8" />
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-black text-white">يُحدد بنهاية الكأس</div>
                      <div className="text-[10px] text-emerald-400 font-mono">بطل كأس الاتحاد الوطني</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Sub-Tab 5: OFFICIAL CLUBS DIRECTORY */}
          {activeSubTab === 'clubs' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                <div>
                  <h3 className="text-lg font-black text-white">دليل الأندية الرسمية الحقيقية المعتمدة</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    قائمة الـ {officialClubsForDivision.length} نادياً رسمياً في {activeDivision.nameAr} الموزعة بين الدرجتين الأولى والثانية.
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs font-mono">
                  <span className="px-3 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    الدرجة الأولى: {tier1Teams.length} نادياً
                  </span>
                  <span className="px-3 py-1 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
                    الدرجة الثانية: {tier2Teams.length} نادياً
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {officialClubsForDivision.map((club) => {
                  const isTier1 = club.tier === 1;
                  const liveTeam = divisionTeams.find((t) => t.realClubId === club.id || t.name === club.nameAr);

                  return (
                    <button
                      key={club.id}
                      onClick={() => liveTeam && onOpenClub?.(liveTeam)}
                      className="text-right bg-slate-950/80 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between hover:border-amber-500/50 transition-all shadow-md group"
                    >
                      <div className="w-full">
                        <div className="flex items-start justify-between gap-3 mb-4">
                          <ClubCrestBadge
                            shortName={club.shortName}
                            name={club.nameAr}
                            primaryColor={club.primaryColor}
                            secondaryColor={club.secondaryColor}
                            size="md"
                            className="shadow-md group-hover:scale-105 transition-transform"
                          />
                          <span
                            className={`text-[10px] font-black font-mono px-2 py-0.5 rounded-full border ${
                              isTier1
                                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                                : 'bg-sky-500/10 text-sky-400 border-sky-500/30'
                            }`}
                          >
                            {isTier1 ? 'درجة أولى' : 'درجة ثانية'}
                          </span>
                        </div>

                        <h4 className="text-sm font-black text-white group-hover:text-amber-400 transition-colors">
                          {club.nameAr}
                        </h4>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">{club.nameEn}</div>

                        <div className="mt-3 pt-3 border-t border-slate-800 space-y-1.5 text-xs text-slate-400">
                          <div className="flex items-center justify-between text-[11px]">
                            <span>الملعب الرسمي:</span>
                            <span className="text-slate-300 font-medium truncate max-w-[130px]">{club.stadiumAr}</span>
                          </div>
                          <div className="flex items-center justify-between text-[11px] font-mono">
                            <span>سنة التأسيس:</span>
                            <span className="text-white font-bold">{club.founded}</span>
                          </div>
                        </div>
                      </div>

                      <div className="w-full mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
                        <span className="text-[10px] font-mono text-slate-500">{liveTeam?.clubCode || club.shortName}</span>
                        {liveTeam && renderStatusBadge(liveTeam)}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Sub-Tab 6: PROMOTION & RELEGATION REGULATIONS */}
          {activeSubTab === 'regulations' && (
            <div className="space-y-6">
              <div className="p-6 bg-slate-900/80 border border-slate-800 rounded-3xl space-y-4">
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-indigo-400" />
                  <span>اللائحة التنظيمية لنظام الصعود والهبوط ومعايير الأهلية</span>
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">
                  تعتمد الأمانة العامة للاتحاد الدولي (IOEF) نظاماً تنظيمياً يضمن تكافؤ الفرص والجدارة الرياضية بين جميع الأندية المتنافسة في أقسامها الوطنية.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-950/90 border border-emerald-500/40 rounded-2xl p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/30">
                      <ArrowUpRight className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-emerald-400">نظام الصعود المباشر (ناديان)</h4>
                      <span className="text-[10px] text-slate-400 font-mono">المادة 14 - فقرة (أ)</span>
                    </div>
                  </div>
                  <ul className="space-y-2.5 text-xs text-slate-300 leading-relaxed list-disc list-inside">
                    <li>يصعد بطل دوري الدرجة الثانية وصاحب المركز الثاني مباشرة إلى دوري الدرجة الأولى للموسم القادم.</li>
                    <li>يشترط لصعود الفريق تحديث تشكيلة الفريق لتتجاوز سقف القوة المحدد للدرجة الأولى (3220+).</li>
                  </ul>
                </div>

                <div className="bg-slate-950/90 border border-rose-500/40 rounded-2xl p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-rose-500/10 text-rose-400 rounded-xl border border-rose-500/30">
                      <ArrowDownRight className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-rose-400">نظام الهبوط المباشر (ناديان)</h4>
                      <span className="text-[10px] text-slate-400 font-mono">المادة 15 - فقرة (ب)</span>
                    </div>
                  </div>
                  <ul className="space-y-2.5 text-xs text-slate-300 leading-relaxed list-disc list-inside">
                    <li>يهبط تلقائياً صاحبا المركزين السابع والثامن في دوري الدرجة الأولى إلى دوري الدرجة الثانية.</li>
                    <li>تطبق المعايير التلقائية لكسر التعادل (المواجهات المباشرة ثم فارق الأهداف ثم الأهداف المسجلة).</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* INTERNATIONAL CONTINENTAL COMPETITIONS VIEW */
        <div className="space-y-8 animate-fadeIn">
          <div className="p-6 bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 border border-slate-800 rounded-3xl space-y-2">
            <span className="text-xs font-mono text-amber-400 font-black px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20">
              البطولات الدولية القارية الكبرى
            </span>
            <h2 className="text-2xl font-black text-white">بطولات النخبة العالمية التابعة لـ IOEF</h2>
            <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
              تتنافس أبطال الدوريات والكؤوس الوطنية في البطولات الدولية القارية لتمثيل أنديتهم وتحقيق المجد القاري.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {internationalTournaments.map((tour) => (
              <div
                key={tour.id}
                className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between hover:border-slate-700 transition-all space-y-6 shadow-xl"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <LeagueBadge category={tour.category} className="w-14 h-14" />
                    <span className="text-xs text-amber-400 font-mono font-bold px-2.5 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20">
                      قاري رسمي
                    </span>
                  </div>
                  <h3 className="text-lg font-black text-white mb-1.5">{tour.nameAr}</h3>
                  <div className="text-xs text-slate-400 mb-3 font-mono">
                    {tour.nameEn} · موسم {tour.season}
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">{tour.rulesSummary}</p>
                </div>

                <div className="space-y-3 pt-4 border-t border-slate-800">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>كأس البطولة المعتمدة:</span>
                    <span className="font-bold text-white">{tour.trophyName}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>الأندية المتأهلة:</span>
                    <span className="font-mono font-black text-amber-400">{tour.teamsCount} نادياً</span>
                  </div>
                  <button
                    onClick={() => setCurrentTab('fixtures')}
                    className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2"
                  >
                    <Calendar className="w-4 h-4 text-amber-400" />
                    <span>استعراض مباريات البطولة</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
