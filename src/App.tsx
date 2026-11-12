import React, { useState, useEffect } from 'react';
import { api } from './services/api';
import {
  SystemSettings,
  Division,
  Tournament,
  Team,
  Player,
  MatchFixture,
  NewsItem,
  DisciplinaryAction,
  StoreProduct,
  NotificationItem,
  RegulationArticle,
} from './types';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { NotificationsModal } from './components/NotificationsModal';
import { ClubProfileModal } from './components/ClubProfileModal';
import { MatchDetailModal } from './components/MatchDetailModal';
import { MatchSimulatorModal } from './components/MatchSimulatorModal';
import { HomePage } from './pages/HomePage';
import { AboutPage } from './pages/AboutPage';
import { DivisionsPage } from './pages/DivisionsPage';
import { FixturesPage } from './pages/FixturesPage';
import { StandingsPage } from './pages/StandingsPage';
import { RegistrationPage } from './pages/RegistrationPage';
import { PlayerProfilePage } from './pages/PlayerProfilePage';
import { NewsPage } from './pages/NewsPage';
import { StorePage } from './pages/StorePage';
import { RulesPage } from './pages/RulesPage';
import { SupportPage } from './pages/SupportPage';
import { AdminDashboard } from './pages/AdminDashboard';
import { Loader2 } from 'lucide-react';
import { ToastProvider } from './context/ToastContext';
import { MatchTicker } from './components/MatchTicker';
import { updatePageSeo } from './utils/seo';
import { CardVerifyPage } from './pages/CardVerifyPage';

interface AppContentProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  verifyToken: string;
  setVerifyToken: (token: string) => void;
}

function getInitialFederationFromUrl(): string | null {
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get('federation');
  } catch {
    return null;
  }
}

function getInitialVerifyTokenFromUrl(): string {
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get('verify') || '';
  } catch {
    return '';
  }
}

function AppContent({ currentTab, setCurrentTab, verifyToken, setVerifyToken }: AppContentProps) {
  const [notificationsOpen, setNotificationsOpen] = useState<boolean>(false);
  const [activeFederationId, setActiveFederationId] = useState<string | null>(getInitialFederationFromUrl);
  const [selectedClub, setSelectedClub] = useState<Team | null>(null);
  const [selectedMatchDetail, setSelectedMatchDetail] = useState<MatchFixture | null>(null);
  const [simulatorFixture, setSimulatorFixture] = useState<MatchFixture | null>(null);
  const [prefilledClubReg, setPrefilledClubReg] = useState<{
    divisionId: string;
    tier: 1 | 2;
    realClubId: string;
  } | null>(null);

  // Core Public Data States (admin-sensitive lists are fetched inside AdminDashboard after login)
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [fixtures, setFixtures] = useState<MatchFixture[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [disciplinary, setDisciplinary] = useState<DisciplinaryAction[]>([]);
  const [storeProducts, setStoreProducts] = useState<StoreProduct[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [regulations, setRegulations] = useState<RegulationArticle[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const loadData = async () => {
    try {
      const [s, divs, tours, tms, plys, fixs, nws, disc, prods, notifs, regs] = await Promise.all([
        api.getSettings(),
        api.getDivisions(),
        api.getTournaments(),
        api.getTeams(),
        api.getPlayers(),
        api.getFixtures(),
        api.getNews(),
        api.getDisciplinary(),
        api.getStoreProducts(),
        api.getNotifications(),
        api.getRules(),
      ]);

      setSettings(s);
      setDivisions(divs);
      setTournaments(tours);
      setTeams(tms);
      setPlayers(plys);
      setFixtures(fixs);
      setNews(nws);
      setDisciplinary(disc);
      setStoreProducts(prods);
      setNotifications(notifs);
      setRegulations(regs);
    } catch (err) {
      console.error('Failed to load federation data from server:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSelectFederation = (divisionId: string | null) => {
    setActiveFederationId(divisionId);
    try {
      const url = new URL(window.location.href);
      if (divisionId) {
        url.searchParams.set('federation', divisionId);
      } else {
        url.searchParams.delete('federation');
      }
      window.history.replaceState({}, '', url.toString());
    } catch {
      // ignore history errors
    }
  };

  // Dynamic SEO & Title handling reflecting current page and isolated federation portal
  useEffect(() => {
    const activeDiv = activeFederationId ? divisions.find((d) => d.id === activeFederationId) : null;
    const fedSuffix = activeDiv ? ` | بوابة ${activeDiv.nameAr}` : '';

    switch (currentTab) {
      case 'home':
        updatePageSeo({
          title: `${activeDiv ? activeDiv.nameAr : 'الرئيسية'} | الاتحاد الدولي للرياضات الإلكترونية IOEF`,
          description:
            'المنصة الرسمية المعتمدة للاتحاد الدولي للرياضات الإلكترونية IOEF لتنظيم بطولات eFootball والدوريات الوطنية الستة والتحقق الذكي من التشكيلات.',
          canonicalPath: activeFederationId ? `/?federation=${activeFederationId}` : '/',
        });
        break;
      case 'divisions':
        updatePageSeo({
          title: `الاتحادات الوطنية والدوريات (الدرجة 1 و2)${fedSuffix} | IOEF`,
          description:
            'الدوريات الرسمية المعتمدة: دوري روشن السعودي، الدوري الإنجليزي الممتاز، لا ليغا، الدوري الإيطالي، الدوري الألماني، والدوري الفرنسي بنظام الصعود والكؤوس.',
          canonicalPath: '/?tab=divisions',
        });
        break;
      case 'fixtures':
        updatePageSeo({
          title: `مركز المباريات والنتائج${fedSuffix} | IOEF`,
          description: 'جدول المباريات والنتائج الحية والبطولات المعتمدة في منصة الاتحاد الدولي للرياضات الإلكترونية.',
          canonicalPath: '/?tab=fixtures',
        });
        break;
      case 'standings':
        updatePageSeo({
          title: `جدول الترتيب وقائمة الأندية${fedSuffix} | IOEF`,
          description: 'الترتيب الرسمي لأندية الدرجة الأولى والثانية ومراكز التأهل القاري في بطولات IOEF.',
          canonicalPath: '/?tab=standings',
        });
        break;
      case 'register':
        updatePageSeo({
          title: `التسجيل الرسمي للأندية واللاعبين${fedSuffix} | IOEF`,
          description: 'سجل الآن في بطولات الاتحاد الدولي، اختر ناديك المعتمد، وارفع صورة التشكيلة للتحقق الفوري.',
          canonicalPath: '/?tab=register',
        });
        break;
      case 'profile':
        updatePageSeo({
          title: `الملف الشخصي والعضوية الرقمية للاعب${fedSuffix} | IOEF`,
          description: 'بطاقة العضوية الرقمية ورمز QR، السجل الرياضي الدائم، الاشتراكات والتجديد، والتشكيلة المعتمدة في IOEF.',
          canonicalPath: '/?tab=profile',
        });
        break;
      case 'verify':
        updatePageSeo({
          title: 'التحقق الرسمي من بطاقة العضوية الرقمية QR | IOEF',
          description: 'بوابة التحقق الفوري من صحة بطاقات العضوية الإلكترونية ورموز QR الصادرة عن الاتحاد الدولي IOEF.',
          canonicalPath: '/?tab=verify',
        });
        break;
      case 'news':
        updatePageSeo({
          title: `المركز الإعلامي والبيانات الرسمية${fedSuffix} | IOEF`,
          description: 'آخر الأخبار والبلاغات الصحفية الصادرة عن الاتحاد الدولي والاتحادات الوطنية.',
          canonicalPath: '/?tab=news',
        });
        break;
      case 'store':
        updatePageSeo({
          title: 'المتجر الرسمي للاتحاد | IOEF Store',
          description: 'المتجر المعتمد للاتحاد الدولي للرياضات الإلكترونية.',
          canonicalPath: '/?tab=store',
        });
        break;
      case 'rules':
        updatePageSeo({
          title: 'الدستور واللوائح التنظيمية | IOEF',
          description: 'اللوائح الفنية والتنظيمية وقواعد اللعب النظيف ونظام الصعود والهبوط المعتمدة من مجلس إدارة IOEF.',
          canonicalPath: '/?tab=rules',
        });
        break;
      case 'support':
        updatePageSeo({
          title: 'مركز الدعم الفني والطعون | IOEF Support',
          description: 'قناة تقديم الشكاوى والطعون التحكيمية الرسمية ومتابعة حالة التذاكر.',
          canonicalPath: '/?tab=support',
        });
        break;
      case 'admin':
        updatePageSeo({
          title: 'بوابة الأمانة العامة والإدارة المركزية | IOEF Admin',
          description: 'نظام الإدارة والتحكم المركزي للاتحاد الدولي للرياضات الإلكترونية.',
          canonicalPath: '/?tab=admin',
        });
        break;
      case 'about':
        updatePageSeo({
          title: 'عن الاتحاد الدولي والهيكل التنظيمي | IOEF',
          description: 'التعريف بالاتحاد الدولي للرياضات الإلكترونية عبر الإنترنت وهيكل الحوكمة الدولي.',
          canonicalPath: '/?tab=about',
        });
        break;
      default:
        updatePageSeo({
          title: 'الاتحاد الدولي للرياضات الإلكترونية IOEF',
          description: 'المنصة الرسمية المعتمدة للاتحاد الدولي للرياضات الإلكترونية IOEF.',
          canonicalPath: '/',
        });
    }
  }, [currentTab, activeFederationId, divisions]);

  const handleMarkNotificationRead = async (id: string) => {
    try {
      await api.markNotificationRead(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    } catch (e) {
      console.error(e);
    }
  };

  const unreadNotifsCount = notifications.filter((n) => !n.read).length;

  const simHomeTeam = simulatorFixture ? teams.find((t) => t.id === simulatorFixture.homeTeamId) || null : null;
  const simAwayTeam = simulatorFixture ? teams.find((t) => t.id === simulatorFixture.awayTeamId) || null : null;
  const simTournament = simulatorFixture ? tournaments.find((t) => t.id === simulatorFixture.tournamentId) || null : null;

  if (loading || !settings) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-300 space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700 flex items-center justify-center text-slate-950 font-black text-xl shadow-xl animate-pulse">
          IOEF
        </div>
        <div className="text-sm font-semibold text-white">الاتحاد الدولي للرياضات الإلكترونية عبر الإنترنت</div>
        <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
          <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
          <span>جاري تحميل بيانات المنصة الرسمية والربط السحابي...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-amber-500/20 selection:text-amber-300">
      <Header
        currentTab={currentTab}
        setCurrentTab={(tab) => {
          setCurrentTab(tab);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        divisions={divisions}
        activeFederationId={activeFederationId}
        onSelectFederation={handleSelectFederation}
        notifications={notifications}
        unreadNotifsCount={unreadNotifsCount}
        onOpenNotifications={() => setNotificationsOpen(true)}
      />

      <MatchTicker
        fixtures={fixtures}
        teams={teams}
        tournaments={tournaments}
        activeFederationId={activeFederationId}
        onSelectFixture={(fix) => setSelectedMatchDetail(fix)}
        onGoToRegister={() => {
          setCurrentTab('register');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

      <main className="flex-1">
        {currentTab === 'home' && (
          <HomePage
            setCurrentTab={(tab) => {
              setCurrentTab(tab);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            divisions={divisions}
            tournaments={tournaments}
            fixtures={fixtures}
            teams={teams}
            news={news}
            activeFederationId={activeFederationId}
            onEnterFederation={(divId) => {
              handleSelectFederation(divId);
              setCurrentTab('divisions');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onOpenClub={setSelectedClub}
            onOpenMatch={setSelectedMatchDetail}
          />
        )}

        {currentTab === 'about' && <AboutPage />}

        {currentTab === 'divisions' && (
          <DivisionsPage
            divisions={divisions}
            tournaments={tournaments}
            teams={teams}
            setCurrentTab={setCurrentTab}
            activeFederationId={activeFederationId}
            onSelectFederation={handleSelectFederation}
            onOpenClub={setSelectedClub}
          />
        )}

        {currentTab === 'fixtures' && (
          <FixturesPage
            fixtures={fixtures}
            tournaments={tournaments}
            teams={teams}
            activeFederationId={activeFederationId}
            onOpenClub={setSelectedClub}
            onOpenMatch={setSelectedMatchDetail}
          />
        )}

        {currentTab === 'standings' && (
          <StandingsPage
            teams={teams}
            tournaments={tournaments}
            divisions={divisions}
            activeFederationId={activeFederationId}
            onOpenClub={setSelectedClub}
          />
        )}

        {currentTab === 'news' && <NewsPage news={news} divisions={divisions} activeFederationId={activeFederationId} />}

        {currentTab === 'register' && (
          <RegistrationPage
            divisions={divisions}
            teams={teams}
            settings={settings}
            initialSelection={prefilledClubReg || (activeFederationId ? { divisionId: activeFederationId } : undefined)}
            onRegisteredSuccess={loadData}
            onNavigateToProfile={() => setCurrentTab('profile')}
            onNavigateToFixtures={() => setCurrentTab('fixtures')}
            onNavigateToSupport={() => setCurrentTab('support')}
          />
        )}

        {currentTab === 'profile' && (
          <PlayerProfilePage
            players={players}
            divisions={divisions}
            onPlayerUpdated={loadData}
            onVerifyCard={(token) => {
              setVerifyToken(token);
              setCurrentTab('verify');
              try {
                const url = new URL(window.location.href);
                url.searchParams.set('verify', token);
                window.history.replaceState({}, '', url.toString());
              } catch {
                // ignore history errors
              }
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}

        {currentTab === 'verify' && (
          <CardVerifyPage
            initialToken={verifyToken}
            onBackHome={() => {
              setVerifyToken('');
              setCurrentTab('home');
              try {
                const url = new URL(window.location.href);
                url.searchParams.delete('verify');
                window.history.replaceState({}, '', url.toString());
              } catch {
                // ignore history errors
              }
            }}
          />
        )}

        {currentTab === 'store' && <StorePage products={storeProducts} onOrderCreated={loadData} />}

        {currentTab === 'rules' && <RulesPage articles={regulations} />}

        {currentTab === 'support' && <SupportPage divisions={divisions} activeFederationId={activeFederationId} />}

        {currentTab === 'admin' && (
          <AdminDashboard
            settings={settings}
            divisions={divisions}
            tournaments={tournaments}
            teams={teams}
            players={players}
            fixtures={fixtures}
            news={news}
            disciplinary={disciplinary}
            regulations={regulations}
            onRefreshAll={loadData}
          />
        )}
      </main>

      <Footer
        setCurrentTab={(tab) => {
          setCurrentTab(tab);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

      <NotificationsModal
        isOpen={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        notifications={notifications}
        onMarkRead={handleMarkNotificationRead}
        onNavigate={(tab) => {
          setNotificationsOpen(false);
          setCurrentTab(tab);
        }}
      />

      <ClubProfileModal
        club={selectedClub}
        onClose={() => setSelectedClub(null)}
        divisions={divisions}
        tournaments={tournaments}
        onRegisterClub={(divisionId, tier, realClubId) => {
          setPrefilledClubReg({ divisionId, tier, realClubId });
          setCurrentTab('register');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

      <MatchDetailModal
        fixture={selectedMatchDetail}
        onClose={() => setSelectedMatchDetail(null)}
        teams={teams}
        tournaments={tournaments}
        onOpenClub={(club) => {
          setSelectedMatchDetail(null);
          setSelectedClub(club);
        }}
        onOpenSimulator={(fix) => setSimulatorFixture(fix)}
      />

      <MatchSimulatorModal
        isOpen={!!simulatorFixture}
        onClose={() => setSimulatorFixture(null)}
        fixture={simulatorFixture}
        homeTeam={simHomeTeam}
        awayTeam={simAwayTeam}
        tournament={simTournament}
      />
    </div>
  );
}

export default function App() {
  const initialVerify = getInitialVerifyTokenFromUrl();
  const [verifyToken, setVerifyToken] = useState<string>(initialVerify);
  const [currentTab, setCurrentTab] = useState<string>(initialVerify ? 'verify' : 'home');

  return (
    <ToastProvider
      onNavigateTab={(tab) => {
        setCurrentTab(tab);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }}
    >
      <AppContent
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        verifyToken={verifyToken}
        setVerifyToken={setVerifyToken}
      />
    </ToastProvider>
  );
}
