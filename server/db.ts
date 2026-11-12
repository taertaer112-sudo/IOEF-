import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  SystemSettings,
  MembershipSettings,
  Division,
  Tournament,
  Team,
  Player,
  PlayerSeasonHistory,
  PlayerTransferRecord,
  MembershipRecord,
  MembershipStatus,
  SubscriptionPayment,
  SubscriptionPaymentMethod,
  SquadEditRecord,
  RegistrationApplication,
  MatchFixture,
  DisciplinaryAction,
  NewsItem,
  RegulationArticle,
  StoreProduct,
  StoreOrder,
  NotificationItem,
  AdminUser,
  AdminPermissions,
  AuditLog,
  SupportTicket,
  RosterPlayer,
  MatchStats
} from './types';
import { OFFICIAL_REAL_CLUBS, RealClub } from '../src/data/officialClubs';
import { appCache, backupManager } from './concurrency';
import { registerAdminLookup, enforceRoleCapabilities } from './auth';

const DATA_DIR = path.resolve(process.cwd(), 'server/data');
const DATA_FILE = path.join(DATA_DIR, 'ioef_data.json');
const SCHEMA_VERSION = '2026.3';

export interface DatabaseCounters {
  playerSeq: number;
  membershipSeq: number;
  clubSeq: number;
  receiptSeq: number;
}

export interface DatabaseState {
  schemaVersion: string;
  counters?: DatabaseCounters;
  settings: SystemSettings;
  divisions: Division[];
  tournaments: Tournament[];
  teams: Team[];
  players: Player[];
  memberships: MembershipRecord[];
  payments: SubscriptionPayment[];
  transfers: PlayerTransferRecord[];
  squadEdits: SquadEditRecord[];
  registrations: RegistrationApplication[];
  fixtures: MatchFixture[];
  disciplinary: DisciplinaryAction[];
  news: NewsItem[];
  regulations: RegulationArticle[];
  storeProducts: StoreProduct[];
  orders: StoreOrder[];
  notifications: NotificationItem[];
  adminUsers: AdminUser[];
  auditLogs: AuditLog[];
  supportTickets: SupportTicket[];
}

// 1. Six Independent National Federations
const defaultDivisions: Division[] = [
  {
    id: 'div_eng',
    code: 'ENG',
    nameAr: 'الاتحاد الإنجليزي للرياضات الإلكترونية',
    nameEn: 'England Esports Federation',
    country: 'إنجلترا',
    flag: 'ENG',
    description: 'دوري المحترفين الإنجليزي الإلكتروني (Premier League & Championship) وكأس الاتحاد والدرع الخيرية التابع لـ IOEF.'
  },
  {
    id: 'div_esp',
    code: 'ESP',
    nameAr: 'الاتحاد الإسباني للرياضات الإلكترونية',
    nameEn: 'Spain Esports Federation',
    country: 'إسبانيا',
    flag: 'ESP',
    description: 'المنافسات الرسمية لأندية الليغا الإسبانية النخبة (La Liga EA Sports & Hypermotion) وكأس الملك والسوبر الإسباني.'
  },
  {
    id: 'div_ita',
    code: 'ITA',
    nameAr: 'الاتحاد الإيطالي للرياضات الإلكترونية',
    nameEn: 'Italy Esports Federation',
    country: 'إيطاليا',
    flag: 'ITA',
    description: 'الكالتشيو الإيطالي الإلكتروني المعتمد رسمياً (Serie A & Serie B) وكأس إيطاليا والسوبر الإيطالي.'
  },
  {
    id: 'div_ger',
    code: 'GER',
    nameAr: 'الاتحاد الألماني للرياضات الإلكترونية',
    nameEn: 'Germany Esports Federation',
    country: 'ألمانيا',
    flag: 'GER',
    description: 'بطولات النخبة والسرعة التكتيكية للأندية الألمانية (Bundesliga & 2. Bundesliga) وكأس ألمانيا والسوبر.'
  },
  {
    id: 'div_fra',
    code: 'FRA',
    nameAr: 'الاتحاد الفرنسي للرياضات الإلكترونية',
    nameEn: 'France Esports Federation',
    country: 'فرنسا',
    flag: 'FRA',
    description: 'الدوري الفرنسي للمحترفين الإلكتروني (Ligue 1 & Ligue 2) وكأس فرنسا وكأس الأبطال.'
  },
  {
    id: 'div_ksa',
    code: 'KSA',
    nameAr: 'الاتحاد السعودي للرياضات الإلكترونية',
    nameEn: 'Saudi Arabia Esports Federation',
    country: 'المملكة العربية السعودية',
    flag: 'KSA',
    description: 'دوري روشن السعودي للمحترفين ودوري يلو وكأس خادم الحرمين الشريفين وكأس السوبر السعودي.'
  }
];

const isVisaEnvConfigured = (): boolean =>
  Boolean(process.env.PAYMOB_API_KEY || process.env.STRIPE_SECRET_KEY || process.env.VISA_MERCHANT_ID);

const defaultMembershipSettings: MembershipSettings = {
  freeFirstSeason: true,
  renewalFee: 5,
  currency: 'USD',
  feeEffectiveSeason: '2027/2028',
  feeEffectiveDate: '2027-08-01',
  membershipDurationDays: 365,
  gracePeriodDays: 30,
  renewalsEnabled: false,
  vodafoneCashNumber: process.env.VODAFONE_CASH_NUMBER || '01000000000 (يُضبط من لوحة رئيس الاتحاد)',
  instaPayAddress: process.env.INSTAPAY_ADDRESS || 'ioef@instapay (يُضبط من لوحة رئيس الاتحاد)',
  visaGatewayConfigured: isVisaEnvConfigured()
};

const defaultSettings: SystemSettings = {
  firstDivisionMinRating: 3220,
  secondDivisionMinRating: 3150,
  allowRegistration: true,
  whatsappApiEnabled: !!process.env.WHATSAPP_WEBHOOK_URL,
  whatsappWebhookUrl: process.env.WHATSAPP_WEBHOOK_URL || '',
  federationOfficialPhone: '+966 50 847 2901',
  federationOfficialEmail: 'competitions@ioef.org',
  maintenanceMode: false,
  aiConfig: {
    activeModel: 'gemini-4-hydrogen',
    enableSquadVision: true,
    enableResultVision: true,
    enableCentralAssistant: true
  },
  socialChannels: {
    whatsappChannelName: 'قناة الاتحاد الدولي IOEF الرسمية على واتساب',
    whatsappChannelUrl: 'https://whatsapp.com/channel/ioef-official',
    tiktokHandle: '@IOEF.Official',
    tiktokUrl: 'https://www.tiktok.com/@ioef.official',
    facebookPageName: 'الاتحاد الدولي للرياضات الإلكترونية - IOEF',
    facebookUrl: 'https://www.facebook.com/IOEF.Official'
  },
  membershipSettings: { ...defaultMembershipSettings }
};

const defaultScoring = { winPoints: 3, drawPoints: 1, lossPoints: 0 };

// 2. Official Tournaments for Season 2026/2027 (All 24 National + 3 International)
const defaultTournaments: Tournament[] = [
  // England
  {
    id: 'tour_eng_d1',
    divisionId: 'div_eng',
    nameAr: 'الدوري الإنجليزي الممتاز - الدرجة الأولى (Premier League)',
    nameEn: 'England Premier Division 1',
    category: 'first_division',
    season: '2026/2027',
    status: 'ongoing',
    teamsCount: 20,
    trophyName: 'كأس الدوري الإنجليزي الممتاز',
    rulesSummary: 'سقف التشكيلة المعتمد: 3220+. يتأهل الأول والثاني لدوري أبطال أوروبا، ويهبط أصحاب المراكز الأخيرة إلى الدرجة الثانية.',
    scoringRules: { ...defaultScoring },
    championsHistory: []
  },
  {
    id: 'tour_eng_d2',
    divisionId: 'div_eng',
    nameAr: 'دوري التشامبيونشيب الإنجليزي - الدرجة الثانية (Championship)',
    nameEn: 'England Championship Division 2',
    category: 'second_division',
    season: '2026/2027',
    status: 'ongoing',
    teamsCount: 24,
    trophyName: 'درع التشامبيونشيب',
    rulesSummary: 'سقف التشكيلة المعتمد: 3150+. صعود مباشر لصاحبي المركزين الأول والثاني إلى الدوري الممتاز.',
    scoringRules: { ...defaultScoring },
    championsHistory: []
  },
  {
    id: 'tour_eng_cup',
    divisionId: 'div_eng',
    nameAr: 'كأس الاتحاد الإنجليزي الإلكتروني (FA Cup)',
    nameEn: 'England FA Esports Cup',
    category: 'division_cup',
    season: '2026/2027',
    status: 'ongoing',
    teamsCount: 44,
    trophyName: 'كأس الاتحاد الإنجليزي التاريخي',
    rulesSummary: 'نظام خروج المغلوب يجمع أندية الدرجتين الأولى والثانية.',
    championsHistory: []
  },
  {
    id: 'tour_eng_super',
    divisionId: 'div_eng',
    nameAr: 'كأس السوبر الإنجليزي (Community Shield)',
    nameEn: 'England Super Shield',
    category: 'division_super_cup',
    season: '2026/2027',
    status: 'upcoming',
    teamsCount: 2,
    trophyName: 'درع المجتمع الإنجليزي',
    rulesSummary: 'مواجهة فاصلة تجمع بطل الدوري الإنجليزي وبطل الكأس.',
    championsHistory: []
  },

  // Spain
  {
    id: 'tour_esp_d1',
    divisionId: 'div_esp',
    nameAr: 'الدوري الإسباني - الدرجة الأولى (La Liga EA Sports)',
    nameEn: 'Spain La Liga EA Sports',
    category: 'first_division',
    season: '2026/2027',
    status: 'ongoing',
    teamsCount: 20,
    trophyName: 'كأس الليغا الإسبانية',
    rulesSummary: 'الحد الأدنى لقوة التشكيلة: 3220+. تأهل المتصدر والوصيف لدوري أبطال أوروبا الإلكتروني.',
    scoringRules: { ...defaultScoring },
    championsHistory: []
  },
  {
    id: 'tour_esp_d2',
    divisionId: 'div_esp',
    nameAr: 'الدوري الإسباني - الدرجة الثانية (La Liga Hypermotion)',
    nameEn: 'Spain La Liga Hypermotion',
    category: 'second_division',
    season: '2026/2027',
    status: 'ongoing',
    teamsCount: 22,
    trophyName: 'درع هايبرموشن الإسباني',
    rulesSummary: 'الحد الأدنى لقوة التشكيلة: 3150+. صعود مباشر لأصحاب الصدارة إلى الدرجة الأولى.',
    scoringRules: { ...defaultScoring },
    championsHistory: []
  },
  {
    id: 'tour_esp_cup',
    divisionId: 'div_esp',
    nameAr: 'كأس ملك إسبانيا الإلكتروني (Copa Del Rey)',
    nameEn: 'Copa Del Rey Esports',
    category: 'division_cup',
    season: '2026/2027',
    status: 'ongoing',
    teamsCount: 42,
    trophyName: 'كأس الملك المعتمدة',
    rulesSummary: 'أدوار إقصائية بنظام الذهاب والإياب حتى الدور النهائي.',
    championsHistory: []
  },
  {
    id: 'tour_esp_super',
    divisionId: 'div_esp',
    nameAr: 'كأس السوبر الإسباني الإلكتروني (Supercopa)',
    nameEn: 'Supercopa de España Esports',
    category: 'division_super_cup',
    season: '2026/2027',
    status: 'upcoming',
    teamsCount: 4,
    trophyName: 'كأس السوبر الإسباني',
    rulesSummary: 'مربع ذهبي يجمع بطلي الدوري والكأس ووصيفيهما.',
    championsHistory: []
  },

  // Italy
  {
    id: 'tour_ita_d1',
    divisionId: 'div_ita',
    nameAr: 'الدوري الإيطالي - الدرجة الأولى (Serie A)',
    nameEn: 'Italy Serie A TIM',
    category: 'first_division',
    season: '2026/2027',
    status: 'ongoing',
    teamsCount: 20,
    trophyName: 'كأس الاسكوديتو الإيطالي',
    rulesSummary: 'سقف التشكيلة المعتمد: 3220+. تنافس نخبوي بين كبار أندية الكالتشيو.',
    scoringRules: { ...defaultScoring },
    championsHistory: []
  },
  {
    id: 'tour_ita_d2',
    divisionId: 'div_ita',
    nameAr: 'الدوري الإيطالي - الدرجة الثانية (Serie B)',
    nameEn: 'Italy Serie B',
    category: 'second_division',
    season: '2026/2027',
    status: 'ongoing',
    teamsCount: 20,
    trophyName: 'درع السيري بي الإيطالي',
    rulesSummary: 'سقف التشكيلة المعتمد: 3150+. صعود مباشر للبطل والوصيف.',
    scoringRules: { ...defaultScoring },
    championsHistory: []
  },
  {
    id: 'tour_ita_cup',
    divisionId: 'div_ita',
    nameAr: 'كأس إيطاليا الإلكترونية (Coppa Italia)',
    nameEn: 'Coppa Italia Esports',
    category: 'division_cup',
    season: '2026/2027',
    status: 'ongoing',
    teamsCount: 40,
    trophyName: 'كأس إيطاليا الرسمية',
    rulesSummary: 'بطولة خروج المغلوب لكافة الأندية الإيطالية المسجلة.',
    championsHistory: []
  },
  {
    id: 'tour_ita_super',
    divisionId: 'div_ita',
    nameAr: 'كأس السوبر الإيطالي (Supercoppa Italiana)',
    nameEn: 'Supercoppa Italiana',
    category: 'division_super_cup',
    season: '2026/2027',
    status: 'upcoming',
    teamsCount: 2,
    trophyName: 'كأس السوبر الإيطالي',
    rulesSummary: 'مواجهة فاصلة على اللقب بين بطل الدوري وبطل الكأس.',
    championsHistory: []
  },

  // Germany
  {
    id: 'tour_ger_d1',
    divisionId: 'div_ger',
    nameAr: 'الدوري الألماني - الدرجة الأولى (Bundesliga)',
    nameEn: 'Germany Bundesliga',
    category: 'first_division',
    season: '2026/2027',
    status: 'ongoing',
    teamsCount: 18,
    trophyName: 'درع البوندسليغا الألماني (Meisterschale)',
    rulesSummary: 'سقف التشكيلة المعتمد: 3220+. منافسة النخبة في الدوري الألماني.',
    scoringRules: { ...defaultScoring },
    championsHistory: []
  },
  {
    id: 'tour_ger_d2',
    divisionId: 'div_ger',
    nameAr: 'الدوري الألماني - الدرجة الثانية (2. Bundesliga)',
    nameEn: 'Germany 2. Bundesliga',
    category: 'second_division',
    season: '2026/2027',
    status: 'ongoing',
    teamsCount: 18,
    trophyName: 'درع الدرجة الثانية الألمانية',
    rulesSummary: 'سقف التشكيلة المعتمد: 3150+. تنافس شرس على بطاقتي الصعود.',
    scoringRules: { ...defaultScoring },
    championsHistory: []
  },
  {
    id: 'tour_ger_cup',
    divisionId: 'div_ger',
    nameAr: 'كأس ألمانيا الإلكترونية (DFB-Pokal)',
    nameEn: 'DFB-Pokal Esports',
    category: 'division_cup',
    season: '2026/2027',
    status: 'ongoing',
    teamsCount: 36,
    trophyName: 'كأس دي إف بي بوكال',
    rulesSummary: 'كأس وطنية ممتدة لجميع الدرجات بنظام الإقصاء الفردي.',
    championsHistory: []
  },
  {
    id: 'tour_ger_super',
    divisionId: 'div_ger',
    nameAr: 'كأس السوبر الألماني (DFL-Supercup)',
    nameEn: 'DFL-Supercup Esports',
    category: 'division_super_cup',
    season: '2026/2027',
    status: 'upcoming',
    teamsCount: 2,
    trophyName: 'كأس السوبر الألماني',
    rulesSummary: 'مباراة افتتاحية تجمع بطلي الدوري والكأس الألمانيين.',
    championsHistory: []
  },

  // France
  {
    id: 'tour_fra_d1',
    divisionId: 'div_fra',
    nameAr: 'الدوري الفرنسي - الدرجة الأولى (Ligue 1)',
    nameEn: 'France Ligue 1 McDonald\'s',
    category: 'first_division',
    season: '2026/2027',
    status: 'ongoing',
    teamsCount: 18,
    trophyName: 'كأس هيكساغونال الفرنسية (Hexagoal)',
    rulesSummary: 'سقف التشكيلة المعتمد: 3220+. أفضل 18 نادياً فرنسياً محترفاً.',
    scoringRules: { ...defaultScoring },
    championsHistory: []
  },
  {
    id: 'tour_fra_d2',
    divisionId: 'div_fra',
    nameAr: 'الدوري الفرنسي - الدرجة الثانية (Ligue 2)',
    nameEn: 'France Ligue 2 BKT',
    category: 'second_division',
    season: '2026/2027',
    status: 'ongoing',
    teamsCount: 18,
    trophyName: 'درع الدوري الفرنسي 2',
    rulesSummary: 'سقف التشكيلة المعتمد: 3150+. صعود مباشر لأصحاب الصدارة.',
    scoringRules: { ...defaultScoring },
    championsHistory: []
  },
  {
    id: 'tour_fra_cup',
    divisionId: 'div_fra',
    nameAr: 'كأس فرنسا الإلكترونية (Coupe de France)',
    nameEn: 'Coupe de France Esports',
    category: 'division_cup',
    season: '2026/2027',
    status: 'ongoing',
    teamsCount: 36,
    trophyName: 'كأس فرنسا التاريخية',
    rulesSummary: 'منافسة شاملة لكافة الأندية الفرنسية بنظام الإقصاء.',
    championsHistory: []
  },
  {
    id: 'tour_fra_super',
    divisionId: 'div_fra',
    nameAr: 'كأس السوبر الفرنسي (Trophée des Champions)',
    nameEn: 'French Trophée des Champions',
    category: 'division_super_cup',
    season: '2026/2027',
    status: 'upcoming',
    teamsCount: 2,
    trophyName: 'كأس الأبطال الفرنسي',
    rulesSummary: 'مواجهة فاصلة بين بطلي الدوري والكأس.',
    championsHistory: []
  },

  // Saudi Arabia
  {
    id: 'tour_ksa_d1',
    divisionId: 'div_ksa',
    nameAr: 'دوري روشن السعودي - الدرجة الأولى (RSL D1)',
    nameEn: 'Roshn Saudi League Esports',
    category: 'first_division',
    season: '2026/2027',
    status: 'ongoing',
    teamsCount: 18,
    trophyName: 'كأس دوري روشن السعودي',
    rulesSummary: 'سقف التشكيلة المعتمد: 3220+. النخبة الأولى مع تأهل مباشر للمسابقات الدولية.',
    scoringRules: { ...defaultScoring },
    championsHistory: []
  },
  {
    id: 'tour_ksa_d2',
    divisionId: 'div_ksa',
    nameAr: 'دوري يلو السعودي - الدرجة الثانية (Yelo D2)',
    nameEn: 'Yelo League Esports',
    category: 'second_division',
    season: '2026/2027',
    status: 'ongoing',
    teamsCount: 18,
    trophyName: 'درع دوري يلو السعودي',
    rulesSummary: 'سقف التشكيلة المعتمد: 3150+. صعود مباشر للمركزين الأول والثاني لدوري روشن.',
    scoringRules: { ...defaultScoring },
    championsHistory: []
  },
  {
    id: 'tour_ksa_cup',
    divisionId: 'div_ksa',
    nameAr: 'كأس الملك السعودي الإلكتروني (King Cup)',
    nameEn: 'King Cup of Champions Esports',
    category: 'division_cup',
    season: '2026/2027',
    status: 'ongoing',
    teamsCount: 36,
    trophyName: 'كأس خادم الحرمين الشريفين',
    rulesSummary: 'كأس خروج المغلوب بمشاركة أندية دوري روشن ودوري يلو.',
    championsHistory: []
  },
  {
    id: 'tour_ksa_super',
    divisionId: 'div_ksa',
    nameAr: 'كأس السوبر السعودي الإلكتروني (Saudi Super Cup)',
    nameEn: 'Saudi Super Cup Esports',
    category: 'division_super_cup',
    season: '2026/2027',
    status: 'upcoming',
    teamsCount: 4,
    trophyName: 'كأس السوبر السعودي',
    rulesSummary: 'بطولة السوبر بين أبطال الدوري والكأس.',
    championsHistory: []
  },

  // International Tournaments (Cross-Federation)
  {
    id: 'tour_intl_ucl',
    nameAr: 'دوري أبطال أوروبا الإلكتروني (IOEF Champions League)',
    nameEn: 'IOEF Champions League',
    category: 'champions_league',
    season: '2026/2027',
    status: 'upcoming',
    teamsCount: 16,
    trophyName: 'كأس دوري أبطال IOEF',
    rulesSummary: 'أفضل فريقين من دوريات الدرجة الأولى الستة يتنافسون على اللقب القاري الأعرق عالمياً.',
    scoringRules: { ...defaultScoring },
    championsHistory: []
  },
  {
    id: 'tour_intl_uel',
    nameAr: 'الدوري الأوروبي الإلكتروني (IOEF Europa League)',
    nameEn: 'IOEF Europa League',
    category: 'europa_league',
    season: '2026/2027',
    status: 'upcoming',
    teamsCount: 16,
    trophyName: 'كأس الدوري الأوروبي',
    rulesSummary: 'الفرق أصحاب المراكز الثالث والرابع وأبطال الكؤوس الوطنية.',
    scoringRules: { ...defaultScoring },
    championsHistory: []
  },
  {
    id: 'tour_intl_super',
    nameAr: 'كأس السوبر الدولي (IOEF International Super Cup)',
    nameEn: 'IOEF International Super Cup',
    category: 'international_super_cup',
    season: '2026/2027',
    status: 'upcoming',
    teamsCount: 2,
    trophyName: 'كأس السوبر العالمي للاتحاد الدولي',
    rulesSummary: 'الموقعة العالمية الكبرى بين بطل دوري الأبطال وبطل الدوري الأوروبي.',
    championsHistory: []
  }
];

// Clean Pre-Launch Seed: All 234 Real Official Clubs start at 0-0-0 and 'available'
function generateCleanOfficialTeams(): Team[] {
  return OFFICIAL_REAL_CLUBS.map((club: RealClub, index: number) => {
    const divCode = club.divisionId.replace('div_', '');
    const tournamentId = club.tier === 1 ? `tour_${divCode}_d1` : `tour_${divCode}_d2`;
    const clubCode = `IOEF-C-${String(index + 1).padStart(6, '0')}`;

    return {
      id: `team_${club.id}`,
      clubCode,
      divisionId: club.divisionId,
      tournamentId,
      realClubId: club.id,
      name: club.nameAr,
      shortName: club.shortName,
      logo: club.shortName,
      color: club.primaryColor,
      secondaryColor: club.secondaryColor,
      playerId: '',
      managerName: '',
      registrationStatus: 'available',
      divisionTier: club.tier,
      rating: club.tier === 1 ? 3220 : 3150,
      wins: 0,
      draws: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      points: 0,
      roster: [],
      season: '2026/2027',
      seasonHistory: []
    };
  });
}

const defaultRegulations: RegulationArticle[] = [
  {
    id: 'reg_art_1',
    chapterNumber: '01',
    titleAr: 'الباب الأول: معايير قوة التشكيلات والدرجات',
    subtitleAr: 'الضوابط الفنية المعتمدة لموسم 2026/2027',
    category: 'technical',
    content: '1. دوري الدرجة الأولى (First Division): الحد الأدنى الإلزامي لقوة التشكيلة هو 3,220 نقطة.\n2. دوري الدرجة الثانية (Second Division): الحد الأدنى لقوة التشكيلة هو 3,150 نقطة.\n3. في حال عدم استيفاء قوة التشكيلة لشرط الدرجة الأولى، يحق للاعب التحويل التلقائي لدوري الدرجة الثانية أو استكمال تدعيم التشكيلة.',
    updatedAt: '2026-11-01'
  },
  {
    id: 'reg_art_2',
    chapterNumber: '02',
    titleAr: 'الباب الثاني: قيد اللاعبين والأندية وتكرار بطاقات اللعبة',
    subtitleAr: 'التمييز بين المستخدم البشري ولاعبي اللعبة',
    category: 'registration',
    content: '1. يُمنع منعاً باتاً تسجيل الشخص الواحد أكثر من مرة برقم واتساب أو معرف GamerTag مختلف.\n2. النادي الرسمي يُحجز لمدير واحد فقط في كل موسم.\n3. تكرار أسماء لاعبي كرة القدم الافتراضيين داخل تشكيلات الأندية (مثل مبابي، ميسي، هالاند) مسموح به نظاماً ولا يُعد مخالفة.',
    updatedAt: '2026-11-01'
  },
  {
    id: 'reg_art_3',
    chapterNumber: '03',
    titleAr: 'الباب الثالث: تعديل التشكيلة والقفل التلقائي',
    subtitleAr: 'استقرار قوائم الفرق طوال الموسم',
    category: 'technical',
    content: '1. يحق لكل لاعب مسجل تعديل تشكيلته مرة واحدة فقط بعد التسجيل عبر لوحة ملفه الشخصي.\n2. بمجرد تنفيذ التعديل الأول، تُقفل صلاحية التعديل تلقائياً مع حفظ سجل النسخة السابقة.\n3. لا يُعاد فتح التعديل إلا بموافقة صريحة من مدير أو رئيس الاتحاد عبر نظام التذاكر.',
    updatedAt: '2026-11-01'
  },
  {
    id: 'reg_art_4',
    chapterNumber: '04',
    titleAr: 'الباب الرابع: الصعود والهبوط والتأهل القاري',
    subtitleAr: 'هيكل المنافسة في الاتحادات الوطنية الستة',
    category: 'promotion',
    content: '1. يتأهل المتصدر والوصيف من الدرجة الأولى إلى دوري أبطال أوروبا IOEF.\n2. يهبط صاحبا المركزين الأخيرين في الدرجة الأولى مباشرة إلى الدرجة الثانية.\n3. يصعد المتصدر والوصيف في الدرجة الثانية مباشرة إلى الدرجة الأولى.',
    updatedAt: '2026-11-01'
  },
  {
    id: 'reg_art_5',
    chapterNumber: '05',
    titleAr: 'الباب الخامس: المواعيد والتحكيم ولوائح الانضباط',
    subtitleAr: 'حماية النزاهة واللعب النظيف',
    category: 'discipline',
    content: '1. فترة السماح القصوى لدخول غرفة المباراة 15 دقيقة من التوقيت الرسمي.\n2. التلاعب بالشبكة أو تقديم لقطات شاشة مزيفة لنتائج المباريات يعرض الحساب للإيقاف الفوري وخصم النقاط أو الشطب الدائم.\n3. يتم التحقق من لقطات النتائج عبر لجنة المنظمين والمدقق الذكي للنتائج.',
    updatedAt: '2026-11-01'
  }
];

const defaultNews: NewsItem[] = [
  {
    id: 'news_launch_2026',
    title: 'الاتحاد الدولي IOEF يفتتح باب التسجيل الرسمي لموسم 2026/2027 عبر الاتحادات الستة',
    summary: `إطلاق النظام المحدث للتسجيل الذكي، القوائم المعتمدة لـ ${OFFICIAL_REAL_CLUBS.length} نادياً حقيقياً في الدرجتين الأولى والثانية، ومعايير القوة 3220+ للأولى و3150+ للثانية.`,
    content: 'يعلن المجلس التنفيذي للاتحاد الدولي للرياضات الإلكترونية عبر الإنترنت (IOEF) عن افتتاح البوابة الرسمية لقيد اللاعبين والأندية للموسم التنافسي 2026/2027 في كافة الاتحادات الوطنية الستة (الإنجليزي، الإسباني، الإيطالي، الألماني، الفرنسي، والسعودي). تم تفعيل نظام التحقق التلقائي من التشكيلات واستخراج القوائم بالرؤية الحاسوبية، مع حظر التسجيل المتعدد وتخصيص بوابة مستقلة لكل اتحاد.',
    category: 'announcement',
    imageUrl: '/src/assets/images/ioef_hero_championship_1794337420029.jpg',
    publishedAt: new Date().toISOString().split('T')[0],
    author: 'الأمانة العامة للاتحاد الدولي IOEF',
    isImportant: true
  },
  {
    id: 'news_rules_2026',
    title: 'تعميم لجنة المسابقات: تفعيل التحقق البصري لنتائج المباريات ونظام التعديل الواحد للتشكيلة',
    summary: 'إلزام الأندية بتثبيت قوائمها المعتمدة وتوضيح لوائح السماح بتكرار لاعبي eFootball بين الأندية المختلفة.',
    content: 'أقرت لجنة المسابقات الدولية آلية التحقق البصري لنتائج المباريات واستخراج الإحصائيات قبل اعتمادها في جداول الترتيب، كما تؤكد اللجنة أن تشابه بطاقات لاعبي كرة القدم داخل تشكيلات الفرق المنافسة أمر مسموح به نظاماً، بينما يقتصر منع التكرار على حسابات اللاعبين المشاركين وأرقامهم ومعرفاتهم الرسمية.',
    category: 'technical',
    imageUrl: '/src/assets/images/efootball_squad_tactics_1794337420067.jpg',
    publishedAt: new Date().toISOString().split('T')[0],
    author: 'لجنة المسابقات الدولية',
    isImportant: false
  }
];

const defaultStoreProducts: StoreProduct[] = [
  {
    id: 'prod_1',
    titleAr: 'قميص المنافسات الرسمي لـ IOEF - الإصدار التنافسي 2026',
    category: 'apparel',
    price: 65,
    currency: 'USD',
    imageUrl: '/src/assets/images/ioef_store_merchandise_1794337421474.jpg',
    description: 'القميص الرسمي المعتمد لأبطال الاتحاد الدولي، مصنوع من أنسجة رياضية عالية الجودة مع شعار IOEF الرسمي.',
    features: ['شعار IOEF مطرز بالذهب', 'أقمشة مسامية سريعة الجفاف', 'شارة الاعتماد الرسمي على الكتف'],
    stock: 140,
    isOfficial: true
  },
  {
    id: 'prod_2',
    titleAr: 'شحن كوينز eFootball الرسمي عبر الوسطاء المعتمدين (12,000 كوينز)',
    category: 'services',
    price: 99,
    currency: 'USD',
    imageUrl: '/src/assets/images/ioef_store_merchandise_1794337421474.jpg',
    description: 'خدمة شحن آمنة عبر وسطاء الاتحاد الدولي المعتمدين والموثقين لضمان حقوق المتسابقين.',
    features: ['شحن رسمي وآمن', 'إشراف مباشر من أمانة الاتحاد', 'متابعة فورية لرقم الطلب'],
    stock: 999,
    isOfficial: true,
    verifiedBroker: {
      name: 'مؤسسة السفير للوساطة والخدمات الرقمية المعتمدة',
      verified: true,
      contactWhatsApp: '+966508472901'
    }
  },
  {
    id: 'prod_3',
    titleAr: 'جواز المحترفين الموسمي (IOEF Pro Pass 2026/2027)',
    category: 'digital_pass',
    price: 35,
    currency: 'USD',
    imageUrl: '/src/assets/images/ioef_trophy_international_1794337419936.jpg',
    description: 'تذكرة العضوية الاحترافية التي تتيح أولوية الدعم الفني وتقارير الذكاء الاصطناعي التكتيكية المفصلة.',
    features: ['تحليلات AI تكتيكية لكل مباراة', 'شارات التوثيق على الملف الشخصي', 'أولوية معالجة الاستفسارات'],
    stock: 500,
    isOfficial: true
  }
];

const PRESIDENT_PERMISSIONS: AdminPermissions = {
  manageRegistrations: true,
  manageSquadLocks: true,
  manageMatchesAndResults: true,
  manageTournamentsAndRules: true,
  manageDiscipline: true,
  manageNewsAndStore: true,
  manageSettingsAndAI: true,
  manageBackups: true,
  manageAdmins: true
};

const DIRECTOR_PERMISSIONS: AdminPermissions = {
  manageRegistrations: true,
  manageSquadLocks: true,
  manageMatchesAndResults: true,
  manageTournamentsAndRules: true,
  manageDiscipline: true,
  manageNewsAndStore: true,
  manageSettingsAndAI: false,
  manageBackups: true,
  manageAdmins: false
};

const ORGANIZER_PERMISSIONS: AdminPermissions = {
  manageRegistrations: true,
  manageSquadLocks: false,
  manageMatchesAndResults: true,
  manageTournamentsAndRules: false,
  manageDiscipline: false,
  manageNewsAndStore: false,
  manageSettingsAndAI: false,
  manageBackups: false,
  manageAdmins: false
};

const defaultAdminUsers: AdminUser[] = [
  {
    id: 'admin_pres',
    username: 'president',
    name: 'Islam Mohamed',
    role: 'president',
    email: 'islammohamedhosnymohamedalghar@gmail.com',
    active: true,
    permissions: { ...PRESIDENT_PERMISSIONS }
  },
  {
    id: 'admin_dir',
    username: 'director',
    name: 'الكابتن / طلال الحربي (مدير الاتحاد)',
    role: 'director',
    email: 'director@ioef.org',
    active: true,
    permissions: { ...DIRECTOR_PERMISSIONS }
  },
  {
    id: 'admin_org',
    username: 'organizer',
    name: 'المهندس / فيصل الدوسري (منظم المسابقات)',
    role: 'organizer',
    email: 'competitions@ioef.org',
    active: true,
    assignedDivisionId: 'div_ksa',
    permissions: { ...ORGANIZER_PERMISSIONS }
  }
];

const defaultNotifications: NotificationItem[] = [
  {
    id: 'notif_launch_2026',
    type: 'system',
    title: 'إطلاق بوابة الاتحاد الدولي IOEF لموسم 2026/2027',
    message: 'المنصة الرسمية جاهزة لاستقبال تسجيلات اللاعبين والأندية في كافة الاتحادات الوطنية الستة.',
    createdAt: new Date().toISOString(),
    read: false
  }
];

const defaultAuditLogs: AuditLog[] = [
  {
    id: 'log_init_2026',
    adminName: 'النظام المركزي IOEF',
    action: 'تهيئة قاعدة بيانات موسم 2026/2027',
    target: `${OFFICIAL_REAL_CLUBS.length} نادياً رسمياً / 6 اتحادات`,
    timestamp: new Date().toISOString(),
    details: 'تصفير النتائج التجريبية وتجهيز الأندية الكاملة للتسجيل ونظام العضوية الرقمية.'
  }
];

class Database {
  private state: DatabaseState;
  private saveCount = 0;

  constructor() {
    this.state = this.loadFromDisk();
    registerAdminLookup((id) => this.state.adminUsers.find((a) => a.id === id));
  }

  private buildCleanState(): DatabaseState {
    const officialTeams = generateCleanOfficialTeams();
    return {
      schemaVersion: SCHEMA_VERSION,
      counters: {
        playerSeq: 0,
        membershipSeq: 0,
        clubSeq: officialTeams.length,
        receiptSeq: 0
      },
      settings: JSON.parse(JSON.stringify(defaultSettings)),
      divisions: JSON.parse(JSON.stringify(defaultDivisions)),
      tournaments: JSON.parse(JSON.stringify(defaultTournaments)),
      teams: officialTeams,
      players: [],
      memberships: [],
      payments: [],
      transfers: [],
      squadEdits: [],
      registrations: [],
      fixtures: [],
      disciplinary: [],
      news: JSON.parse(JSON.stringify(defaultNews)),
      regulations: JSON.parse(JSON.stringify(defaultRegulations)),
      storeProducts: JSON.parse(JSON.stringify(defaultStoreProducts)),
      orders: [],
      notifications: JSON.parse(JSON.stringify(defaultNotifications)),
      adminUsers: JSON.parse(JSON.stringify(defaultAdminUsers)),
      auditLogs: JSON.parse(JSON.stringify(defaultAuditLogs)),
      supportTickets: []
    };
  }

  private syncOfficialCatalogAndCounters(state: DatabaseState): DatabaseState {
    // 1. Ensure arrays & counters exist
    if (!Array.isArray(state.memberships)) state.memberships = [];
    if (!Array.isArray(state.payments)) state.payments = [];
    if (!Array.isArray(state.transfers)) state.transfers = [];
    if (!state.counters) {
      state.counters = {
        playerSeq: state.players?.length || 0,
        membershipSeq: state.memberships.length,
        clubSeq: Math.max(OFFICIAL_REAL_CLUBS.length, state.teams?.length || 0),
        receiptSeq: state.payments.length
      };
    }

    // 2. Ensure membershipSettings exist & Visa env status reflects runtime reality
    state.settings = {
      ...defaultSettings,
      ...(state.settings || {}),
      aiConfig: { ...defaultSettings.aiConfig, ...(state.settings?.aiConfig || {}) },
      socialChannels: { ...defaultSettings.socialChannels, ...(state.settings?.socialChannels || {}) },
      membershipSettings: {
        ...defaultMembershipSettings,
        ...(state.settings?.membershipSettings || {}),
        visaGatewayConfigured: isVisaEnvConfigured()
      }
    };

    // 3. Merge missing clubs from the complete 234 OFFICIAL_REAL_CLUBS without overwriting occupied teams
    const existingByTeamId = new Map((state.teams || []).map((t) => [t.id, t]));
    const existingByRealClubId = new Map((state.teams || []).filter((t) => t.realClubId).map((t) => [t.realClubId!, t]));
    const mergedTeams: Team[] = [...(state.teams || [])];

    OFFICIAL_REAL_CLUBS.forEach((club: RealClub) => {
      const targetTeamId = `team_${club.id}`;
      if (!existingByTeamId.has(targetTeamId) && !existingByRealClubId.has(club.id)) {
        state.counters!.clubSeq += 1;
        const divCode = club.divisionId.replace('div_', '');
        mergedTeams.push({
          id: targetTeamId,
          clubCode: `IOEF-C-${String(state.counters!.clubSeq).padStart(6, '0')}`,
          divisionId: club.divisionId,
          tournamentId: club.tier === 1 ? `tour_${divCode}_d1` : `tour_${divCode}_d2`,
          realClubId: club.id,
          name: club.nameAr,
          shortName: club.shortName,
          logo: club.shortName,
          color: club.primaryColor,
          secondaryColor: club.secondaryColor,
          playerId: '',
          managerName: '',
          registrationStatus: 'available',
          divisionTier: club.tier,
          rating: club.tier === 1 ? 3220 : 3150,
          wins: 0,
          draws: 0,
          losses: 0,
          goalsFor: 0,
          goalsAgainst: 0,
          points: 0,
          roster: [],
          season: '2026/2027',
          seasonHistory: []
        });
      }
    });
    state.teams = mergedTeams;

    // 4. Keep tournament teamsCount synchronized with official roster counts
    state.tournaments = (state.tournaments?.length ? state.tournaments : defaultTournaments).map((tour) => {
      if (tour.divisionId && (tour.category === 'first_division' || tour.category === 'second_division' || tour.category === 'division_cup')) {
        const tier = tour.category === 'first_division' ? 1 : tour.category === 'second_division' ? 2 : null;
        const count = OFFICIAL_REAL_CLUBS.filter((c) => c.divisionId === tour.divisionId && (tier === null || c.tier === tier)).length;
        if (count > 0) {
          return { ...tour, teamsCount: count };
        }
      }
      return tour;
    });

    // 5. Update launch news summary cleanly if it still mentions 96
    state.news = (state.news || []).map((item) =>
      item.id === 'news_launch_2026'
        ? {
            ...item,
            summary: `إطلاق النظام المحدث للتسجيل الذكي، القوائم المعتمدة لـ ${OFFICIAL_REAL_CLUBS.length} نادياً حقيقياً في الدرجتين الأولى والثانية، ومعايير القوة 3220+ للأولى و3150+ للثانية.`
          }
        : item
    );

    state.schemaVersion = SCHEMA_VERSION;
    return state;
  }

  private loadFromDisk(): DatabaseState {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        const parsed = JSON.parse(raw);

        // Support smooth non-destructive migration from 2026.2 -> 2026.3
        if (parsed.schemaVersion === SCHEMA_VERSION || parsed.schemaVersion === '2026.2') {
          const base = this.buildCleanState();
          const hydrated: DatabaseState = {
            ...base,
            ...parsed,
            regulations: parsed.regulations?.length ? parsed.regulations : defaultRegulations,
            adminUsers: parsed.adminUsers?.length ? parsed.adminUsers.map((a: any) => {
              const isPres = a.id === 'admin_pres' || a.role === 'president';
              return {
                ...a,
                ...(isPres ? { name: 'Islam Mohamed', email: 'islammohamedhosnymohamedalghar@gmail.com', active: true } : {}),
                permissions: enforceRoleCapabilities(
                  a.role,
                  a.permissions || (a.role === 'president' ? PRESIDENT_PERMISSIONS : a.role === 'director' ? DIRECTOR_PERMISSIONS : ORGANIZER_PERMISSIONS)
                )
              };
            }) : defaultAdminUsers
          };
          const synced = this.syncOfficialCatalogAndCounters(hydrated);
          try {
            fs.writeFileSync(DATA_FILE, JSON.stringify(synced, null, 2), 'utf-8');
          } catch (writeErr) {
            console.error('Failed persisting migrated DB:', writeErr);
          }
          return synced;
        }
      }
    } catch (err) {
      console.error('Error reading IOEF database from disk:', err);
    }

    const clean = this.buildCleanState();
    try {
      fs.writeFileSync(DATA_FILE, JSON.stringify(clean, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed writing clean initial state:', err);
    }
    return clean;
  }

  public saveToDisk() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DATA_FILE, JSON.stringify(this.state, null, 2), 'utf-8');
      appCache.clear();

      this.saveCount++;
      if (this.saveCount % 5 === 0) {
        backupManager.createBackup(this.state);
      }
    } catch (err) {
      console.error('Failed to write IOEF data to disk:', err);
    }
  }

  // Settings
  public getSettings(): SystemSettings {
    return {
      ...this.state.settings,
      membershipSettings: this.getMembershipSettings()
    };
  }

  public getMembershipSettings(): MembershipSettings {
    return {
      ...defaultMembershipSettings,
      ...(this.state.settings.membershipSettings || {}),
      visaGatewayConfigured: isVisaEnvConfigured()
    };
  }

  public updateSettings(partial: Partial<SystemSettings>, adminName: string): SystemSettings {
    this.state.settings = {
      ...this.state.settings,
      ...partial,
      aiConfig: partial.aiConfig ? { ...this.state.settings.aiConfig, ...partial.aiConfig } : this.state.settings.aiConfig,
      socialChannels: partial.socialChannels ? { ...this.state.settings.socialChannels, ...partial.socialChannels } : this.state.settings.socialChannels,
      membershipSettings: partial.membershipSettings
        ? { ...this.getMembershipSettings(), ...partial.membershipSettings, visaGatewayConfigured: isVisaEnvConfigured() }
        : this.getMembershipSettings()
    };
    this.addAuditLog(adminName, 'تحديث إعدادات النظام', 'SystemSettings', JSON.stringify(partial));
    this.saveToDisk();
    return this.getSettings();
  }

  public updateMembershipSettings(partial: Partial<MembershipSettings>, adminName: string): MembershipSettings {
    const updated: MembershipSettings = {
      ...this.getMembershipSettings(),
      ...partial,
      visaGatewayConfigured: isVisaEnvConfigured()
    };
    this.state.settings.membershipSettings = updated;
    this.addAuditLog(
      adminName,
      'تحديث إعدادات رسوم واشتراكات العضوية',
      `${updated.renewalFee} ${updated.currency}`,
      `موسم: ${updated.feeEffectiveSeason} | تفعيل التجديد: ${updated.renewalsEnabled ? 'مفعل' : 'متوقف'}`
    );
    this.saveToDisk();
    return updated;
  }

  // Divisions & Tournaments
  public getDivisions(): Division[] {
    return this.state.divisions;
  }

  public getTournaments(divisionId?: string): Tournament[] {
    if (!divisionId) return this.state.tournaments;
    return this.state.tournaments.filter((t) => !t.divisionId || t.divisionId === divisionId);
  }

  public updateTournament(id: string, partial: Partial<Tournament>, adminName: string): Tournament | null {
    const idx = this.state.tournaments.findIndex((t) => t.id === id);
    if (idx === -1) return null;
    this.state.tournaments[idx] = { ...this.state.tournaments[idx], ...partial };
    this.addAuditLog(adminName, 'تحديث إعدادات البطولة', this.state.tournaments[idx].nameAr, JSON.stringify(partial));
    this.saveToDisk();
    return this.state.tournaments[idx];
  }

  // Teams & Standings
  public getTeams(tournamentId?: string, divisionId?: string): Team[] {
    let list = [...this.state.teams];
    if (tournamentId) list = list.filter((t) => t.tournamentId === tournamentId);
    if (divisionId) list = list.filter((t) => t.divisionId === divisionId);
    return list.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      const gdB = b.goalsFor - b.goalsAgainst;
      const gdA = a.goalsFor - a.goalsAgainst;
      if (gdB !== gdA) return gdB - gdA;
      if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
      return a.name.localeCompare(b.name, 'ar');
    });
  }

  public updateTeamRoster(teamId: string, roster: RosterPlayer[], adminName: string): Team | null {
    const team = this.state.teams.find((t) => t.id === teamId);
    if (!team) return null;
    team.roster = roster;
    if (team.playerId) {
      const player = this.state.players.find((p) => p.id === team.playerId);
      if (player) player.roster = roster;
    }
    this.addAuditLog(adminName, 'تحديث قائمة لاعبي النادي', team.name, `${roster.length} لاعب في القائمة`);
    this.saveToDisk();
    return team;
  }

  // Players & Squads
  public getPlayers(divisionId?: string): Player[] {
    if (!divisionId) return this.state.players;
    return this.state.players.filter((p) => p.divisionId === divisionId);
  }

  public getPlayerById(id: string): Player | undefined {
    return this.state.players.find((p) => p.id === id);
  }

  public getSquadEdits(playerId: string): SquadEditRecord[] {
    return this.state.squadEdits.filter((s) => s.playerId === playerId);
  }

  public modifyPlayerSquad(
    playerId: string,
    newRating: number,
    newImageUrl: string,
    formation?: string,
    notes?: string,
    newRoster?: RosterPlayer[]
  ): { success: boolean; error?: string; player?: Player } {
    const player = this.state.players.find((p) => p.id === playerId);
    if (!player) {
      return { success: false, error: 'اللاعب غير موجود في السجلات' };
    }

    if (player.squadEditLocked || player.squadEditCount >= 1) {
      return {
        success: false,
        error: 'عفواً، لقد استنفدت فرصتك المسموحة لتعديل التشكيلة (تعديل واحد فقط). لا يمكن التعديل الآن إلا بعد الحصول على إذن رسمي من مدير الاتحاد.'
      };
    }

    const previousRating = player.squadRating;
    const previousImageUrl = player.squadImageUrl;

    player.squadRating = newRating;
    player.squadImageUrl = newImageUrl;
    if (formation) player.squadFormation = formation;
    if (newRoster && newRoster.length > 0) player.roster = newRoster;
    player.squadEditCount += 1;
    player.squadEditLocked = true;

    const team = this.state.teams.find((t) => t.playerId === player.id);
    if (team) {
      team.rating = newRating;
      if (newRoster && newRoster.length > 0) team.roster = newRoster;
    }

    const record: SquadEditRecord = {
      id: `edit_${Date.now()}`,
      playerId: player.id,
      changedAt: new Date().toISOString(),
      previousRating,
      newRating,
      previousImageUrl,
      newImageUrl,
      notes: notes || 'تعديل تشكيلة اللاعب الأول والنهائي المعتمد'
    };
    this.state.squadEdits.unshift(record);

    this.addAuditLog(
      'نظام التدقيق التلقائي',
      'تعديل تشكيلة لاعب وقفل التعديل',
      `${player.fullName} (${player.playerCode || player.id})`,
      `التقييم السابق: ${previousRating} -> التقييم الجديد: ${newRating}`
    );

    this.saveToDisk();
    return { success: true, player };
  }

  public setSquadEditLock(playerId: string, locked: boolean, adminName: string): boolean {
    const player = this.state.players.find((p) => p.id === playerId);
    if (!player) return false;
    player.squadEditLocked = locked;
    if (!locked) {
      player.squadEditCount = 0;
    }
    this.addAuditLog(adminName, locked ? 'قفل تعديل التشكيلة' : 'فتح تعديل التشكيلة استثنائياً', player.fullName, '');
    this.saveToDisk();
    return true;
  }

  // ==========================================
  // REGISTRATIONS & STRICT ANTI-DUPLICATE (USER ONLY)
  // ==========================================

  public checkDuplicateRegistration(whatsapp: string, gamerTag: string): {
    exists: boolean;
    reason?: string;
    existingPlayer?: Player;
    existingRegistration?: RegistrationApplication;
  } {
    const cleanPhone = whatsapp.trim().replace(/\s+/g, '');
    const cleanTag = gamerTag.trim().toLowerCase();

    if (cleanPhone) {
      const foundPlayerByPhone = this.state.players.find(
        (p) => p.whatsapp.trim().replace(/\s+/g, '') === cleanPhone
      );
      if (foundPlayerByPhone) {
        return {
          exists: true,
          reason: `رقم الهاتف (${whatsapp}) مسجل مسبقاً للاعب المعتمد: ${foundPlayerByPhone.fullName}. تمنع اللائحة العامة للاتحاد الدولي (المادة 2) التسجيل بأكثر من حساب نهائياً.`,
          existingPlayer: foundPlayerByPhone
        };
      }
    }

    if (cleanTag) {
      const foundPlayerByTag = this.state.players.find(
        (p) => p.gamerTag.trim().toLowerCase() === cleanTag
      );
      if (foundPlayerByTag) {
        return {
          exists: true,
          reason: `معرف اللاعب الإلكتروني (${gamerTag}) مسجل بالفعل باسم: ${foundPlayerByTag.fullName}.`,
          existingPlayer: foundPlayerByTag
        };
      }
    }

    if (cleanPhone) {
      const foundRegByPhone = this.state.registrations.find(
        (r) => r.whatsapp.trim().replace(/\s+/g, '') === cleanPhone && r.status !== 'rejected'
      );
      if (foundRegByPhone) {
        return {
          exists: true,
          reason: `توجد معاملة تسجيل سابقة قيد المراجعة أو الاعتماد بهذا الرقم (${whatsapp}) للاعب ${foundRegByPhone.fullName}. لا يُسمح بإعادة التقديم.`,
          existingRegistration: foundRegByPhone
        };
      }
    }

    if (cleanTag) {
      const foundRegByTag = this.state.registrations.find(
        (r) => r.gamerTag.trim().toLowerCase() === cleanTag && r.status !== 'rejected'
      );
      if (foundRegByTag) {
        return {
          exists: true,
          reason: `يوجد طلب تسجيل قائم بهذا المعرف (${gamerTag}).`,
          existingRegistration: foundRegByTag
        };
      }
    }

    return { exists: false };
  }

  public getRegistrations(status?: string, divisionId?: string): RegistrationApplication[] {
    let list = this.state.registrations;
    if (status && status !== 'all') list = list.filter((r) => r.status === status);
    if (divisionId) list = list.filter((r) => r.divisionId === divisionId);
    return list;
  }

  public addRegistration(app: Omit<RegistrationApplication, 'id' | 'createdAt' | 'status'>): {
    success: boolean;
    registration?: RegistrationApplication;
    error?: string;
  } {
    if (!this.state.settings.allowRegistration) {
      return {
        success: false,
        error: 'تم إغلاق باب التسجيل حالياً بقرار من الأمانة العامة للاتحاد الدولي.'
      };
    }

    // 1. Strict User Duplicate Check (WhatsApp + GamerTag only — in-game football players can repeat freely)
    const dup = this.checkDuplicateRegistration(app.whatsapp, app.gamerTag);
    if (dup.exists) {
      return {
        success: false,
        error: dup.reason || 'أنت مسجل بالفعل في لوائح الاتحاد الدولي IOEF - لا يُسمح بإعادة التسجيل.'
      };
    }

    // 2. Check if real club is already reserved or approved
    if (app.realClubId) {
      const targetTeam = this.state.teams.find(
        (t) =>
          t.divisionId === app.divisionId &&
          t.divisionTier === app.requestedTier &&
          t.realClubId === app.realClubId
      );
      if (targetTeam && (targetTeam.registrationStatus === 'approved' || targetTeam.registrationStatus === 'pending' || !!targetTeam.playerId)) {
        return {
          success: false,
          error: `نادي (${app.teamName}) محجوز أو معتمد مسبقاً لمتسابق آخر في هذا الدوري. يرجى اختيار نادٍ آخر متاح للتسجيل.`
        };
      }

      // Mark team temporarily as pending reservation
      if (targetTeam) {
        targetTeam.registrationStatus = 'pending';
        targetTeam.managerName = app.fullName;
      }
    }

    const newReg: RegistrationApplication = {
      ...app,
      id: `reg_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    this.state.registrations.unshift(newReg);

    this.state.notifications.unshift({
      id: `notif_${Date.now()}`,
      divisionId: app.divisionId,
      type: 'registration_status',
      title: 'طلب تسجيل رسمي جديد قيد التدقيق',
      message: `قدم اللاعب ${app.fullName} (${app.teamName}) طلباً رسمياً للانضمام إلى دوري الدرجة ${app.requestedTier}.`,
      createdAt: new Date().toISOString(),
      read: false
    });

    this.saveToDisk();
    return { success: true, registration: newReg };
  }

  private nextPlayerCode(): string {
    if (!this.state.counters) {
      this.state.counters = { playerSeq: 0, membershipSeq: 0, clubSeq: OFFICIAL_REAL_CLUBS.length, receiptSeq: 0 };
    }
    const maxExisting = this.state.players.reduce((max, p) => {
      const m = p.playerCode?.match(/IOEF-P-(\d+)/);
      return m ? Math.max(max, parseInt(m[1], 10)) : max;
    }, 0);
    const nextSeq = Math.max(this.state.counters.playerSeq + 1, maxExisting + 1);
    this.state.counters.playerSeq = nextSeq;
    return `IOEF-P-${String(nextSeq).padStart(6, '0')}`;
  }

  private nextMembershipNumber(): string {
    if (!this.state.counters) {
      this.state.counters = { playerSeq: 0, membershipSeq: 0, clubSeq: OFFICIAL_REAL_CLUBS.length, receiptSeq: 0 };
    }
    const maxExisting = (this.state.memberships || []).reduce((max, mem) => {
      const m = mem.membershipNumber?.match(/IOEF-M-\d+-(\d+)/);
      return m ? Math.max(max, parseInt(m[1], 10)) : max;
    }, 0);
    const nextSeq = Math.max(this.state.counters.membershipSeq + 1, maxExisting + 1);
    this.state.counters.membershipSeq = nextSeq;
    return `IOEF-M-2026-${String(nextSeq).padStart(6, '0')}`;
  }

  private nextReceiptNumber(): string {
    if (!this.state.counters) {
      this.state.counters = { playerSeq: 0, membershipSeq: 0, clubSeq: OFFICIAL_REAL_CLUBS.length, receiptSeq: 0 };
    }
    const maxExisting = (this.state.payments || []).reduce((max, pay) => {
      const m = pay.receiptNumber?.match(/IOEF-R-\d+-(\d+)/);
      return m ? Math.max(max, parseInt(m[1], 10)) : max;
    }, 0);
    const nextSeq = Math.max(this.state.counters.receiptSeq + 1, maxExisting + 1);
    this.state.counters.receiptSeq = nextSeq;
    return `IOEF-R-2026-${String(nextSeq).padStart(6, '0')}`;
  }

  public updatePlayerPhoto(playerId: string, photoUrl: string): Player | null {
    const player = this.state.players.find((p) => p.id === playerId);
    if (!player) return null;
    player.photoUrl = photoUrl;
    this.saveToDisk();
    return player;
  }

  public updateRegistrationStatus(
    id: string,
    status: 'approved' | 'rejected' | 'needs_review',
    adminName: string,
    notes?: string
  ): RegistrationApplication | null {
    const reg = this.state.registrations.find((r) => r.id === id);
    if (!reg) return null;

    reg.status = status;
    reg.reviewedBy = adminName;
    reg.reviewedAt = new Date().toISOString();
    if (notes) reg.adminNotes = notes;

    const targetTeam = this.state.teams.find(
      (t) =>
        t.divisionId === reg.divisionId &&
        t.divisionTier === reg.requestedTier &&
        (t.realClubId === reg.realClubId || t.name === reg.teamName)
    );

    if (status === 'rejected') {
      // Release club slot so other players can register for it
      if (targetTeam && !targetTeam.playerId) {
        targetTeam.registrationStatus = 'available';
        targetTeam.managerName = '';
      }
    }

    if (status === 'approved') {
      // Prevent double player creation if approval clicked twice
      const existingPlayer = this.state.players.find(
        (p) => p.gamerTag.toLowerCase() === reg.gamerTag.toLowerCase() ||
          p.whatsapp.replace(/\s+/g, '') === reg.whatsapp.replace(/\s+/g, '')
      );
      if (existingPlayer) {
        this.saveToDisk();
        return reg;
      }

      const playerCode = this.nextPlayerCode();
      const newPlayerId = `ply_${Date.now()}_${Math.floor(Math.random() * 100)}`;
      const rosterData: RosterPlayer[] =
        reg.extractedRoster ||
        reg.aiAnalysis?.extractedRoster ||
        [];

      const divCode = reg.divisionId.replace('div_', '');
      const tourId = reg.requestedTier === 1 ? `tour_${divCode}_d1` : `tour_${divCode}_d2`;
      const tourName = this.state.tournaments.find((t) => t.id === tourId)?.nameAr || `الدرجة ${reg.requestedTier}`;

      const initialSeasonHistory: PlayerSeasonHistory = {
        season: '2026/2027',
        teamId: targetTeam?.id,
        teamName: reg.teamName,
        divisionId: reg.divisionId,
        divisionTier: reg.requestedTier,
        tournamentName: tourName,
        matchesPlayed: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        points: 0,
        awards: []
      };

      const newPlayer: Player = {
        id: newPlayerId,
        playerCode,
        fullName: reg.fullName,
        gamerTag: reg.gamerTag,
        whatsapp: reg.whatsapp,
        email: `${reg.gamerTag.toLowerCase().replace(/[^a-z0-9_.-]/g, '')}@ioef-player.org`,
        country: reg.country,
        divisionId: reg.divisionId,
        divisionTier: reg.requestedTier,
        teamName: reg.teamName,
        photoUrl: reg.photoUrl,
        squadRating: reg.aiAnalysis?.squadRating || (reg.requestedTier === 1 ? 3220 : 3150),
        squadFormation: reg.aiAnalysis?.formation || '4-3-3',
        squadImageUrl: reg.squadImageUrl,
        proofImageUrl: reg.proofImageUrl,
        squadEditCount: 0,
        squadEditLocked: false,
        status: 'active',
        joinedAt: new Date().toISOString(),
        season: '2026/2027',
        roster: rosterData,
        awards: [],
        seasonHistory: [initialSeasonHistory]
      };
      this.state.players.push(newPlayer);

      if (targetTeam) {
        targetTeam.playerId = newPlayerId;
        targetTeam.managerName = reg.fullName;
        targetTeam.registrationStatus = 'approved';
        targetTeam.rating = newPlayer.squadRating;
        if (rosterData.length > 0) targetTeam.roster = rosterData;
      } else {
        if (!this.state.counters) this.state.counters = { playerSeq: 1, membershipSeq: 0, clubSeq: OFFICIAL_REAL_CLUBS.length, receiptSeq: 0 };
        this.state.counters.clubSeq += 1;
        this.state.teams.push({
          id: `team_${Date.now()}`,
          clubCode: `IOEF-C-${String(this.state.counters.clubSeq).padStart(6, '0')}`,
          divisionId: reg.divisionId,
          tournamentId: tourId,
          realClubId: reg.realClubId,
          name: reg.teamName,
          shortName: reg.gamerTag.substring(0, 3).toUpperCase(),
          logo: reg.gamerTag.substring(0, 3).toUpperCase(),
          color: '#1E3A8A',
          secondaryColor: '#F59E0B',
          playerId: newPlayerId,
          managerName: reg.fullName,
          registrationStatus: 'approved',
          divisionTier: reg.requestedTier,
          rating: newPlayer.squadRating,
          wins: 0,
          draws: 0,
          losses: 0,
          goalsFor: 0,
          goalsAgainst: 0,
          points: 0,
          roster: rosterData,
          season: '2026/2027',
          seasonHistory: []
        });
      }

      // Issue Official Digital Membership Card automatically (First season FREE by default)
      const membership = this.issueMembershipInternal(newPlayer, adminName, false);

      this.state.notifications.unshift({
        id: `notif_${Date.now()}_${Math.floor(Math.random() * 100)}`,
        recipientId: newPlayerId,
        divisionId: reg.divisionId,
        type: 'registration_status',
        title: `اعتماد رسمي: ${playerCode}`,
        message: `تم اعتماد تمثيلك الرسمي لنادي ${reg.teamName} في دوري الدرجة ${reg.requestedTier} بكود اللاعب الدائم ${playerCode}.`,
        createdAt: new Date().toISOString(),
        read: false
      });

      this.state.notifications.unshift({
        id: `notif_${Date.now() + 1}_${Math.floor(Math.random() * 100)}`,
        recipientId: newPlayerId,
        divisionId: reg.divisionId,
        type: 'membership_issued',
        title: `إصدار بطاقة العضوية الرقمية: ${membership.membershipNumber}`,
        message: `تم إصدار بطاقتك الرقمية الرسمية (الموسم الأول مجاني بالكامل) برمز تحقق QR معتمد.`,
        createdAt: new Date().toISOString(),
        read: false
      });

      void this.dispatchWhatsAppNotification(
        reg.whatsapp,
        `مبروك ${reg.fullName}! تم اعتماد قيدك الرسمي في الاتحاد الدولي IOEF لنادي ${reg.teamName}. كود اللاعب الدائم: ${playerCode} | رقم العضوية: ${membership.membershipNumber}.`
      );
    }

    this.addAuditLog(adminName, `تحديث حالة التسجيل (${status})`, reg.fullName, notes || '');
    this.saveToDisk();
    return reg;
  }

  // ==========================================
  // DIGITAL MEMBERSHIP CARDS & QR VERIFICATION
  // ==========================================

  private generateQrToken(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  private evaluateMembershipRecord(mem: MembershipRecord): MembershipRecord {
    const now = Date.now();
    const exp = new Date(mem.expiresAt).getTime();
    if (!Number.isNaN(exp) && exp < now && (mem.status === 'free' || mem.status === 'active')) {
      mem.status = 'expired';
      mem.updatedAt = new Date().toISOString();
    }
    return mem;
  }

  private issueMembershipInternal(player: Player, adminName: string, writeLog: boolean = true): MembershipRecord {
    if (!Array.isArray(this.state.memberships)) this.state.memberships = [];
    const ms = this.getMembershipSettings();
    const now = new Date();
    const durationDays = Math.max(30, ms.membershipDurationDays || 365);
    const graceDays = Math.max(0, ms.gracePeriodDays || 30);
    const expiresAt = new Date(now.getTime() + durationDays * 86400000);
    const graceEndsAt = new Date(expiresAt.getTime() + graceDays * 86400000);

    const existing = this.state.memberships.find((m) => m.playerId === player.id);
    if (existing) {
      existing.cardVersion += 1;
      existing.qrVerificationToken = this.generateQrToken();
      existing.cardStatus = 'active';
      existing.revokedAt = undefined;
      existing.revokedReason = undefined;
      existing.teamName = player.teamName;
      existing.divisionId = player.divisionId;
      existing.divisionTier = player.divisionTier;
      existing.updatedAt = now.toISOString();
      player.membershipId = existing.id;
      if (writeLog) {
        this.addAuditLog(adminName, 'إعادة إصدار بطاقة العضوية الرقمية', `${player.fullName} (${existing.membershipNumber})`, `الإصدار رقم v${existing.cardVersion}`);
      }
      return existing;
    }

    const membershipNumber = this.nextMembershipNumber();
    const created: MembershipRecord = {
      id: `mem_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      membershipNumber,
      playerId: player.id,
      playerCode: player.playerCode || this.nextPlayerCode(),
      divisionId: player.divisionId,
      teamName: player.teamName,
      divisionTier: player.divisionTier,
      season: player.season || '2026/2027',
      status: ms.freeFirstSeason ? 'free' : 'pending_payment',
      isFirstSeasonFree: !!ms.freeFirstSeason,
      issuedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      graceEndsAt: graceEndsAt.toISOString(),
      qrVerificationToken: this.generateQrToken(),
      cardVersion: 1,
      cardStatus: 'active',
      updatedAt: now.toISOString()
    };

    player.membershipId = created.id;
    player.playerCode = created.playerCode;
    this.state.memberships.unshift(created);
    if (writeLog) {
      this.addAuditLog(adminName, 'إصدار بطاقة عضوية رقمية رسمية', `${player.fullName} (${membershipNumber})`, `كود اللاعب: ${created.playerCode}`);
    }
    return created;
  }

  public getMemberships(status?: string, divisionId?: string): MembershipRecord[] {
    if (!Array.isArray(this.state.memberships)) this.state.memberships = [];
    let list = this.state.memberships.map((m) => this.evaluateMembershipRecord(m));
    if (status && status !== 'all') list = list.filter((m) => m.status === status);
    if (divisionId) list = list.filter((m) => m.divisionId === divisionId);
    return list;
  }

  public getMembershipById(id: string): MembershipRecord | undefined {
    const found = (this.state.memberships || []).find((m) => m.id === id);
    return found ? this.evaluateMembershipRecord(found) : undefined;
  }

  public getMembershipByPlayerId(playerId: string): MembershipRecord | undefined {
    const found = (this.state.memberships || []).find((m) => m.playerId === playerId);
    return found ? this.evaluateMembershipRecord(found) : undefined;
  }

  public issueMembershipForPlayer(playerId: string, adminName: string): MembershipRecord | null {
    const player = this.state.players.find((p) => p.id === playerId);
    if (!player) return null;
    const mem = this.issueMembershipInternal(player, adminName, true);
    this.state.notifications.unshift({
      id: `notif_${Date.now()}_${Math.floor(Math.random() * 100)}`,
      recipientId: player.id,
      divisionId: player.divisionId,
      type: mem.cardVersion > 1 ? 'card_updated' : 'membership_issued',
      title: mem.cardVersion > 1 ? `تحديث وإعادة إصدار بطاقتك (${mem.membershipNumber})` : `إصدار بطاقة العضوية (${mem.membershipNumber})`,
      message: `بطاقتك الرقمية المحدثة (النسخة v${mem.cardVersion}) جاهزة الآن للعرض والتحميل والطباعة.`,
      createdAt: new Date().toISOString(),
      read: false
    });
    this.saveToDisk();
    return mem;
  }

  public reissueMembershipCard(membershipId: string, adminName: string, reason?: string): MembershipRecord | null {
    const mem = (this.state.memberships || []).find((m) => m.id === membershipId);
    if (!mem) return null;
    const player = this.state.players.find((p) => p.id === mem.playerId);

    mem.cardVersion += 1;
    mem.qrVerificationToken = this.generateQrToken();
    mem.cardStatus = 'active';
    mem.revokedAt = undefined;
    mem.revokedReason = undefined;
    if (player) {
      mem.teamName = player.teamName;
      mem.divisionId = player.divisionId;
      mem.divisionTier = player.divisionTier;
    }
    mem.updatedAt = new Date().toISOString();

    this.state.notifications.unshift({
      id: `notif_${Date.now()}_${Math.floor(Math.random() * 100)}`,
      recipientId: mem.playerId,
      divisionId: mem.divisionId,
      type: 'card_updated',
      title: `إعادة إصدار بطاقة العضوية v${mem.cardVersion}`,
      message: `تم إصدار رمز QR جديد لبطاقتك (${mem.membershipNumber}) وإلغاء الرمز السابق فوراً.${reason ? ` السبب: ${reason}` : ''}`,
      createdAt: new Date().toISOString(),
      read: false
    });

    if (player?.whatsapp) {
      void this.dispatchWhatsAppNotification(
        player.whatsapp,
        `تنبيه IOEF: تم إعادة إصدار بطاقة عضويتك الرقمية (${mem.membershipNumber}) بالنسخة v${mem.cardVersion} وتحديث رمز التحقق QR.`
      );
    }

    this.addAuditLog(adminName, 'إعادة إصدار بطاقة وQR جديد', mem.membershipNumber, reason || `v${mem.cardVersion}`);
    this.saveToDisk();
    return mem;
  }

  public revokeMembershipCard(membershipId: string, adminName: string, reason: string): MembershipRecord | null {
    const mem = (this.state.memberships || []).find((m) => m.id === membershipId);
    if (!mem) return null;
    mem.cardStatus = 'revoked';
    mem.revokedAt = new Date().toISOString();
    mem.revokedReason = reason || 'إلغاء البطاقة بقرار إداري من أمانة الاتحاد';
    mem.updatedAt = new Date().toISOString();

    const player = this.state.players.find((p) => p.id === mem.playerId);
    this.state.notifications.unshift({
      id: `notif_${Date.now()}_${Math.floor(Math.random() * 100)}`,
      recipientId: mem.playerId,
      divisionId: mem.divisionId,
      type: 'card_updated',
      title: `إلغاء صلاحية البطاقة الرقمية (${mem.membershipNumber})`,
      message: `تم إيقاف رمز التحقق لهذه البطاقة. السبب: ${mem.revokedReason}`,
      createdAt: new Date().toISOString(),
      read: false
    });

    if (player?.whatsapp) {
      void this.dispatchWhatsAppNotification(
        player.whatsapp,
        `إشعار إداري IOEF: تم إلغاء صلاحية بطاقة العضوية (${mem.membershipNumber}). السبب: ${mem.revokedReason}`
      );
    }

    this.addAuditLog(adminName, 'إلغاء صلاحية بطاقة رقمية', mem.membershipNumber, mem.revokedReason);
    this.saveToDisk();
    return mem;
  }

  public updateMembershipStatus(
    membershipId: string,
    action: 'suspend' | 'activate' | 'extend',
    adminName: string,
    options?: { extendDays?: number; reason?: string }
  ): MembershipRecord | null {
    const mem = (this.state.memberships || []).find((m) => m.id === membershipId);
    if (!mem) return null;
    const player = this.state.players.find((p) => p.id === mem.playerId);

    if (action === 'suspend') {
      mem.status = 'suspended';
      if (player) player.status = 'suspended';
    } else if (action === 'activate') {
      mem.status = mem.isFirstSeasonFree && new Date(mem.expiresAt).getTime() > Date.now() ? 'free' : 'active';
      mem.cardStatus = 'active';
      if (player) player.status = 'active';
    } else if (action === 'extend') {
      const days = Math.max(1, Number(options?.extendDays || 365));
      const baseMs = Math.max(Date.now(), new Date(mem.expiresAt).getTime());
      const nextExp = new Date(baseMs + days * 86400000);
      mem.expiresAt = nextExp.toISOString();
      mem.graceEndsAt = new Date(nextExp.getTime() + (this.getMembershipSettings().gracePeriodDays || 30) * 86400000).toISOString();
      mem.status = mem.isFirstSeasonFree ? 'free' : 'active';
      if (player) player.status = 'active';
    }
    mem.updatedAt = new Date().toISOString();

    this.state.notifications.unshift({
      id: `notif_${Date.now()}_${Math.floor(Math.random() * 100)}`,
      recipientId: mem.playerId,
      divisionId: mem.divisionId,
      type: 'membership_status',
      title: `تحديث حالة العضوية (${mem.membershipNumber})`,
      message:
        action === 'suspend'
          ? `تم تعليق العضوية مؤقتاً.${options?.reason ? ` السبب: ${options.reason}` : ''}`
          : action === 'extend'
          ? `تم تمديد صلاحية العضوية حتى ${mem.expiresAt.split('T')[0]}.`
          : 'تم تنشيط حالة العضوية رسمياً في سجلات الاتحاد.',
      createdAt: new Date().toISOString(),
      read: false
    });

    if (player?.whatsapp) {
      void this.dispatchWhatsAppNotification(
        player.whatsapp,
        `تحديث عضوية IOEF (${mem.membershipNumber}): الحالة الحالية الآن (${mem.status}).`
      );
    }

    this.addAuditLog(adminName, `تحديث حالة العضوية (${action})`, mem.membershipNumber, options?.reason || '');
    this.saveToDisk();
    return mem;
  }

  public verifyMembershipToken(tokenOrCode: string): {
    found: boolean;
    valid: boolean;
    effectiveStatus: 'valid' | 'revoked' | 'expired' | 'suspended' | 'pending' | 'not_found';
    membership?: {
      membershipNumber: string;
      season: string;
      status: MembershipStatus;
      isFirstSeasonFree: boolean;
      issuedAt: string;
      expiresAt: string;
      graceEndsAt?: string;
      cardVersion: number;
      cardStatus: 'active' | 'revoked';
      revokedReason?: string;
    };
    player?: {
      id: string;
      fullName: string;
      gamerTag: string;
      playerCode: string;
      photoUrl?: string;
      teamName: string;
      divisionId: string;
      divisionNameAr: string;
      divisionTier: 1 | 2;
      country: string;
    };
  } {
    const clean = tokenOrCode.trim();
    if (!clean) return { found: false, valid: false, effectiveStatus: 'not_found' };

    const mem = (this.state.memberships || []).find(
      (m) =>
        m.qrVerificationToken === clean ||
        m.membershipNumber.toUpperCase() === clean.toUpperCase() ||
        m.playerCode.toUpperCase() === clean.toUpperCase()
    );
    if (!mem) return { found: false, valid: false, effectiveStatus: 'not_found' };

    this.evaluateMembershipRecord(mem);
    const player = this.state.players.find((p) => p.id === mem.playerId);
    const division = this.state.divisions.find((d) => d.id === mem.divisionId);
    const now = Date.now();
    const expired = new Date(mem.expiresAt).getTime() < now;

    let effectiveStatus: 'valid' | 'revoked' | 'expired' | 'suspended' | 'pending' = 'valid';
    if (mem.cardStatus === 'revoked') effectiveStatus = 'revoked';
    else if (mem.status === 'suspended' || player?.status === 'suspended') effectiveStatus = 'suspended';
    else if (mem.status === 'expired' || expired) effectiveStatus = 'expired';
    else if (mem.status === 'pending_payment' || mem.status === 'pending_review') effectiveStatus = 'pending';
    else effectiveStatus = 'valid';

    return {
      found: true,
      valid: effectiveStatus === 'valid',
      effectiveStatus,
      membership: {
        membershipNumber: mem.membershipNumber,
        season: mem.season,
        status: mem.status,
        isFirstSeasonFree: mem.isFirstSeasonFree,
        issuedAt: mem.issuedAt,
        expiresAt: mem.expiresAt,
        graceEndsAt: mem.graceEndsAt,
        cardVersion: mem.cardVersion,
        cardStatus: mem.cardStatus,
        revokedReason: mem.revokedReason
      },
      player: player
        ? {
            id: player.id,
            fullName: player.fullName,
            gamerTag: player.gamerTag,
            playerCode: player.playerCode || mem.playerCode,
            photoUrl: player.photoUrl,
            teamName: player.teamName,
            divisionId: player.divisionId,
            divisionNameAr: division?.nameAr || 'الاتحاد الدولي IOEF',
            divisionTier: player.divisionTier,
            country: player.country
          }
        : undefined
    };
  }

  public runExpiringMembershipAlerts(adminName: string): { alertedCount: number; alertedNumbers: string[] } {
    const now = Date.now();
    const in30Days = now + 30 * 86400000;
    const sevenDaysAgo = now - 7 * 86400000;
    const alertedNumbers: string[] = [];

    for (const mem of this.state.memberships || []) {
      this.evaluateMembershipRecord(mem);
      const exp = new Date(mem.expiresAt).getTime();
      if ((mem.status === 'free' || mem.status === 'active') && exp > now && exp <= in30Days) {
        const recentAlert = this.state.notifications.find(
          (n) =>
            n.recipientId === mem.playerId &&
            n.type === 'renewal_reminder' &&
            new Date(n.createdAt).getTime() > sevenDaysAgo
        );
        if (!recentAlert) {
          const daysLeft = Math.max(1, Math.ceil((exp - now) / 86400000));
          const player = this.state.players.find((p) => p.id === mem.playerId);
          this.state.notifications.unshift({
            id: `notif_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
            recipientId: mem.playerId,
            divisionId: mem.divisionId,
            type: 'renewal_reminder',
            title: `تذكير قرب انتهاء العضوية (${mem.membershipNumber})`,
            message: `تبقى ${daysLeft} يوماً على انتهاء صلاحية بطاقتك الرقمية. يمكنك تقديم طلب التجديد مبكراً دون فقدان سجلك الرياضي.`,
            createdAt: new Date().toISOString(),
            read: false
          });
          if (player?.whatsapp) {
            void this.dispatchWhatsAppNotification(
              player.whatsapp,
              `تذكير IOEF: تبقى ${daysLeft} يوماً على انتهاء عضويتك (${mem.membershipNumber}).`
            );
          }
          alertedNumbers.push(mem.membershipNumber);
        }
      }
    }

    if (alertedNumbers.length > 0) {
      this.addAuditLog(adminName, 'إرسال تنبيهات العضويات قريبة الانتهاء', `${alertedNumbers.length} عضو`, alertedNumbers.join(', '));
      this.saveToDisk();
    }
    return { alertedCount: alertedNumbers.length, alertedNumbers };
  }

  // ==========================================
  // SUBSCRIPTIONS & VERIFIED PAYMENT PIPELINE
  // ==========================================

  public getPayments(status?: string, divisionId?: string): SubscriptionPayment[] {
    if (!Array.isArray(this.state.payments)) this.state.payments = [];
    let list = [...this.state.payments];
    if (status && status !== 'all') list = list.filter((p) => p.status === status);
    if (divisionId) {
      const playerIds = new Set(this.state.players.filter((pl) => pl.divisionId === divisionId).map((pl) => pl.id));
      list = list.filter((p) => playerIds.has(p.playerId));
    }
    return list.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
  }

  public submitSubscriptionPayment(payload: {
    playerId: string;
    paymentMethod: SubscriptionPaymentMethod;
    amount: number;
    senderReference: string;
    transactionRef: string;
    proofImageUrl?: string;
    season?: string;
  }): { success: boolean; statusCode?: number; error?: string; payment?: SubscriptionPayment } {
    if (!Array.isArray(this.state.payments)) this.state.payments = [];
    const player = this.state.players.find((p) => p.id === payload.playerId);
    if (!player) {
      return { success: false, statusCode: 404, error: 'اللاعب غير موجود في سجلات الاتحاد.' };
    }
    let mem = this.getMembershipByPlayerId(player.id);
    if (!mem) {
      mem = this.issueMembershipInternal(player, 'النظام المركزي IOEF', false);
    }

    const ms = this.getMembershipSettings();
    if (payload.paymentMethod === 'visa' && !ms.visaGatewayConfigured && !payload.proofImageUrl) {
      return {
        success: false,
        statusCode: 400,
        error: 'بوابة الدفع الإلكتروني المباشر Visa (Paymob / Stripe) غير مفعلة بمفاتيح الربط السحابية حالياً. يرجى استخدام فودافون كاش أو إنستا باي أو إرفاق إيصال الدفع للمراجعة اليدوية.'
      };
    }

    const cleanRef = payload.transactionRef.trim().toUpperCase();
    if (!cleanRef || cleanRef.length < 4) {
      return { success: false, statusCode: 400, error: 'يرجى إدخال رقم مرجع عملية التحويل الصحيح.' };
    }

    const duplicateRef = this.state.payments.find((p) => p.transactionRef.trim().toUpperCase() === cleanRef);
    if (duplicateRef) {
      return {
        success: false,
        statusCode: 409,
        error: `رقم المرجع (${payload.transactionRef}) مستخدم بالفعل في عملية سابقة (إيصال ${duplicateRef.receiptNumber}). لا يُسمح بتكرار رقم العملية.`
      };
    }

    if ((payload.paymentMethod === 'vodafone_cash' || payload.paymentMethod === 'instapay') && !payload.proofImageUrl) {
      return { success: false, statusCode: 400, error: 'يجب إرفاق صورة إثبات التحويل (Screenshot) للمراجعة والاعتماد.' };
    }

    // Heuristic fraud detection signals (strictly advisory flags for admins)
    const fraudFlags: string[] = [];
    if (cleanRef.length < 6) {
      fraudFlags.push('رقم المرجع قصير ويتطلب مطابقة كشف المحفظة');
    }
    if (ms.renewalsEnabled && Number(payload.amount) < Number(ms.renewalFee || 0)) {
      fraudFlags.push(`المبلغ المدخل (${payload.amount}) أقل من الرسوم الرسمية (${ms.renewalFee} ${ms.currency})`);
    }
    if (payload.proofImageUrl) {
      const imgHash = crypto.createHash('sha256').update(payload.proofImageUrl).digest('hex');
      const reusedHash = this.state.payments.find(
        (p) => p.proofImageUrl && crypto.createHash('sha256').update(p.proofImageUrl).digest('hex') === imgHash
      );
      if (reusedHash) {
        fraudFlags.push(`تطابق صورة الإيصال رقمياً مع عملية سابقة (${reusedHash.receiptNumber})`);
      }
    }

    const payment: SubscriptionPayment = {
      id: `pay_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      receiptNumber: this.nextReceiptNumber(),
      playerId: player.id,
      playerCode: player.playerCode || mem.playerCode,
      playerName: player.fullName,
      membershipId: mem.id,
      season: payload.season || ms.feeEffectiveSeason || '2027/2028',
      amount: Number(payload.amount) || ms.renewalFee,
      currency: ms.currency || 'USD',
      paymentMethod: payload.paymentMethod,
      providerType: payload.paymentMethod === 'visa' && ms.visaGatewayConfigured ? 'gateway_api' : 'manual_proof',
      senderReference: payload.senderReference,
      transactionRef: cleanRef,
      proofImageUrl: payload.proofImageUrl,
      status: 'pending_review',
      fraudFlags,
      submittedAt: new Date().toISOString()
    };

    this.state.payments.unshift(payment);
    mem.status = 'pending_review';
    mem.updatedAt = new Date().toISOString();

    this.state.notifications.unshift({
      id: `notif_${Date.now()}_${Math.floor(Math.random() * 100)}`,
      recipientId: player.id,
      divisionId: player.divisionId,
      type: 'payment_status',
      title: `استلام طلب تجديد (${payment.receiptNumber})`,
      message: `تم استلام إثبات الدفع عبر ${payload.paymentMethod} بمبلغ ${payment.amount} ${payment.currency}، والطلب الآن قيد المراجعة الإدارية ولن يُفعّل إلا بعد التحقق.`,
      createdAt: new Date().toISOString(),
      read: false
    });

    this.addAuditLog(
      player.fullName,
      'تقديم إثبات دفع لتجديد الاشتراك',
      `${payment.receiptNumber} (${payment.paymentMethod})`,
      fraudFlags.length > 0 ? `تنبيهات فحص: ${fraudFlags.join(' | ')}` : `مرجع: ${cleanRef}`
    );

    this.saveToDisk();
    return { success: true, payment };
  }

  public reviewSubscriptionPayment(
    paymentId: string,
    decision: 'approved' | 'rejected',
    adminName: string,
    notes?: string
  ): { success: boolean; error?: string; payment?: SubscriptionPayment; membership?: MembershipRecord } {
    const payment = (this.state.payments || []).find((p) => p.id === paymentId);
    if (!payment) return { success: false, error: 'سجل الدفع غير موجود.' };
    if (payment.status === 'approved') {
      return { success: false, error: 'تم اعتماد عملية الدفع هذه مسبقاً ولا يمكن تعديلها.' };
    }

    const mem = (this.state.memberships || []).find((m) => m.id === payment.membershipId);
    const player = this.state.players.find((p) => p.id === payment.playerId);
    const ms = this.getMembershipSettings();

    payment.status = decision;
    payment.reviewedBy = adminName;
    payment.reviewedAt = new Date().toISOString();
    payment.reviewNotes = notes || (decision === 'approved' ? 'تم التحقق المالي واعتماد التجديد' : 'تعذر مطابقة التحويل في كشف الحساب');

    if (mem) {
      if (decision === 'approved') {
        const durationDays = Math.max(30, ms.membershipDurationDays || 365);
        const graceDays = Math.max(0, ms.gracePeriodDays || 30);
        const baseTime = Math.max(Date.now(), new Date(mem.expiresAt).getTime());
        const nextExp = new Date(baseTime + durationDays * 86400000);
        mem.status = 'active';
        mem.isFirstSeasonFree = false;
        mem.season = payment.season || mem.season;
        mem.expiresAt = nextExp.toISOString();
        mem.graceEndsAt = new Date(nextExp.getTime() + graceDays * 86400000).toISOString();
        mem.cardStatus = 'active';
        if (player) player.status = 'active';
      } else {
        const expired = new Date(mem.expiresAt).getTime() < Date.now();
        mem.status = expired ? 'expired' : mem.isFirstSeasonFree ? 'free' : 'pending_payment';
      }
      mem.updatedAt = new Date().toISOString();
    }

    this.state.notifications.unshift({
      id: `notif_${Date.now()}_${Math.floor(Math.random() * 100)}`,
      recipientId: payment.playerId,
      divisionId: player?.divisionId,
      type: 'payment_status',
      title: decision === 'approved' ? `اعتماد الدفع وتجديد العضوية (${payment.receiptNumber})` : `رفض إثبات الدفع (${payment.receiptNumber})`,
      message:
        decision === 'approved'
          ? `تم التحقق من التحويل وتفعيل اشتراكك الرسمي حتى ${mem?.expiresAt.split('T')[0] || ''}.`
          : `لم يتم اعتماد عملية الدفع. السبب: ${payment.reviewNotes}`,
      createdAt: new Date().toISOString(),
      read: false
    });

    if (player?.whatsapp) {
      void this.dispatchWhatsAppNotification(
        player.whatsapp,
        decision === 'approved'
          ? `تهانينا ${player.fullName}! تم اعتماد إيصال الدفع (${payment.receiptNumber}) وتفعيل عضويتك IOEF بنجاح.`
          : `تنبيه IOEF: تم رفض طلب الدفع (${payment.receiptNumber}). السبب: ${payment.reviewNotes}`
      );
    }

    this.addAuditLog(
      adminName,
      decision === 'approved' ? 'اعتماد إيصال دفع وتجديد عضوية' : 'رفض إيصال دفع',
      `${payment.receiptNumber} / ${payment.playerName}`,
      payment.reviewNotes
    );

    this.saveToDisk();
    return { success: true, payment, membership: mem };
  }

  // ==========================================
  // CLUB TRANSFERS & PERMANENT SPORTS CAREER
  // ==========================================

  public transferPlayerToClub(
    playerId: string,
    toTeamId: string,
    adminName: string,
    notes?: string
  ): { success: boolean; error?: string; player?: Player; transfer?: PlayerTransferRecord } {
    if (!Array.isArray(this.state.transfers)) this.state.transfers = [];
    const player = this.state.players.find((p) => p.id === playerId);
    if (!player) return { success: false, error: 'اللاعب غير موجود في السجلات.' };

    const toTeam = this.state.teams.find((t) => t.id === toTeamId);
    if (!toTeam) return { success: false, error: 'النادي المستهدف غير موجود.' };
    if (toTeam.playerId && toTeam.playerId !== player.id) {
      return { success: false, error: `النادي (${toTeam.name}) مشغول بمدير آخر (${toTeam.managerName}). يرجى اختيار نادٍ متاح.` };
    }

    const fromTeam = this.state.teams.find((t) => t.playerId === player.id);
    if (fromTeam && fromTeam.id === toTeam.id) {
      return { success: false, error: 'اللاعب يمثل هذا النادي بالفعل.' };
    }

    const transfer: PlayerTransferRecord = {
      id: `trn_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      playerId: player.id,
      playerCode: player.playerCode || '',
      fromTeamId: fromTeam?.id || '',
      fromTeamName: fromTeam?.name || player.teamName,
      toTeamId: toTeam.id,
      toTeamName: toTeam.name,
      fromDivisionId: player.divisionId,
      toDivisionId: toTeam.divisionId,
      fromTier: player.divisionTier,
      toTier: toTeam.divisionTier,
      season: player.season || '2026/2027',
      transferredAt: new Date().toISOString(),
      approvedBy: adminName,
      notes: notes || 'انتقال رسمي معتمد مع احتفاظ اللاعب برقمه الدائم'
    };

    // Free old club slot
    if (fromTeam) {
      fromTeam.playerId = '';
      fromTeam.managerName = '';
      fromTeam.registrationStatus = 'available';
    }

    // Bind new club slot
    toTeam.playerId = player.id;
    toTeam.managerName = player.fullName;
    toTeam.registrationStatus = 'approved';
    toTeam.rating = player.squadRating;
    if (player.roster && player.roster.length > 0) toTeam.roster = player.roster;

    // Update player current affiliation WITHOUT EVER changing player.playerCode
    player.teamName = toTeam.name;
    player.divisionId = toTeam.divisionId;
    player.divisionTier = toTeam.divisionTier;

    if (!Array.isArray(player.seasonHistory)) player.seasonHistory = [];
    const tourName = this.state.tournaments.find((t) => t.id === toTeam.tournamentId)?.nameAr || `الدرجة ${toTeam.divisionTier}`;
    player.seasonHistory.unshift({
      season: player.season || '2026/2027',
      teamId: toTeam.id,
      teamName: toTeam.name,
      divisionId: toTeam.divisionId,
      divisionTier: toTeam.divisionTier,
      tournamentName: tourName,
      matchesPlayed: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      points: 0,
      awards: []
    });

    // Update membership card affiliation while keeping permanent membershipNumber & playerCode
    const mem = this.getMembershipByPlayerId(player.id);
    if (mem) {
      mem.teamName = toTeam.name;
      mem.divisionId = toTeam.divisionId;
      mem.divisionTier = toTeam.divisionTier;
      mem.updatedAt = new Date().toISOString();
    }

    this.state.transfers.unshift(transfer);

    this.state.notifications.unshift({
      id: `notif_${Date.now()}_${Math.floor(Math.random() * 100)}`,
      recipientId: player.id,
      divisionId: toTeam.divisionId,
      type: 'transfer_approved',
      title: `اعتماد انتقال رسمي إلى ${toTeam.name}`,
      message: `تم انتقالك رسمياً من ${transfer.fromTeamName} إلى ${toTeam.name} مع احتفاظك الدائم بكود اللاعب ${player.playerCode} ورقم العضوية ${mem?.membershipNumber || ''}.`,
      createdAt: new Date().toISOString(),
      read: false
    });

    if (player.whatsapp) {
      void this.dispatchWhatsAppNotification(
        player.whatsapp,
        `اعتماد انتقال IOEF: تم انتقالك رسمياً إلى نادي ${toTeam.name} مع الاحتفاظ الدائم برقمك (${player.playerCode}).`
      );
    }

    this.addAuditLog(adminName, 'تنفيذ انتقال لاعب بين الأندية', `${player.fullName} (${player.playerCode})`, `${transfer.fromTeamName} -> ${toTeam.name}`);
    this.saveToDisk();
    return { success: true, player, transfer };
  }

  public getPlayerCareerDossier(playerId: string, includeSensitive: boolean) {
    const player = this.state.players.find((p) => p.id === playerId);
    if (!player) return null;

    const membership = this.getMembershipByPlayerId(player.id) || null;
    const transfers = (this.state.transfers || []).filter((t) => t.playerId === player.id);
    const teamIds = new Set<string>();
    this.state.teams.filter((t) => t.playerId === player.id).forEach((t) => teamIds.add(t.id));
    transfers.forEach((t) => {
      if (t.fromTeamId) teamIds.add(t.fromTeamId);
      if (t.toTeamId) teamIds.add(t.toTeamId);
    });
    const fixtures = this.state.fixtures.filter((f) => teamIds.has(f.homeTeamId) || teamIds.has(f.awayTeamId));
    const disciplinary = this.state.disciplinary.filter((d) => d.playerId === player.id);
    const squadEdits = this.state.squadEdits.filter((s) => s.playerId === player.id);
    const rawPayments = (this.state.payments || []).filter((p) => p.playerId === player.id);

    const payments = includeSensitive
      ? rawPayments
      : rawPayments.map((p) => ({
          id: p.id,
          receiptNumber: p.receiptNumber,
          playerId: p.playerId,
          playerCode: p.playerCode,
          playerName: p.playerName,
          membershipId: p.membershipId,
          season: p.season,
          amount: p.amount,
          currency: p.currency,
          paymentMethod: p.paymentMethod,
          providerType: p.providerType,
          senderReference: p.senderReference ? '***' + p.senderReference.slice(-4) : '',
          transactionRef: p.transactionRef ? '***' + p.transactionRef.slice(-4) : '',
          status: p.status,
          fraudFlags: [],
          submittedAt: p.submittedAt,
          reviewedAt: p.reviewedAt,
          reviewNotes: p.reviewNotes
        }));

    return {
      player: includeSensitive
        ? player
        : {
            ...player,
            whatsapp: player.whatsapp ? '***-***-' + player.whatsapp.slice(-4) : '',
            email: ''
          },
      membership,
      transfers,
      fixtures,
      disciplinary,
      squadEdits,
      payments
    };
  }

  public getState(): DatabaseState {
    return this.state;
  }

  // Fixtures & Match Management
  public getFixtures(tournamentId?: string, status?: string, divisionId?: string): MatchFixture[] {
    let list = [...this.state.fixtures];
    if (tournamentId) list = list.filter((f) => f.tournamentId === tournamentId);
    if (status) list = list.filter((f) => f.status === status);
    if (divisionId) list = list.filter((f) => f.divisionId === divisionId);
    return list;
  }

  public createFixture(
    payload: {
      tournamentId: string;
      divisionId?: string;
      roundName: string;
      homeTeamId: string;
      awayTeamId: string;
      matchDate: string;
      matchTime: string;
      assignedReferee?: string;
      streamUrl?: string;
    },
    adminName: string
  ): { success: boolean; fixture?: MatchFixture; error?: string } {
    if (payload.homeTeamId === payload.awayTeamId) {
      return { success: false, error: 'لا يمكن جدولة مباراة بين نفس النادي.' };
    }
    const tour = this.state.tournaments.find((t) => t.id === payload.tournamentId);
    if (!tour) {
      return { success: false, error: 'البطولة المحددة غير موجودة.' };
    }

    const newFixture: MatchFixture = {
      id: `fix_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      tournamentId: payload.tournamentId,
      divisionId: payload.divisionId || tour.divisionId,
      season: tour.season || '2026/2027',
      roundName: payload.roundName,
      homeTeamId: payload.homeTeamId,
      awayTeamId: payload.awayTeamId,
      status: 'scheduled',
      matchDate: payload.matchDate,
      matchTime: payload.matchTime,
      assignedReferee: payload.assignedReferee || adminName,
      streamUrl: payload.streamUrl
    };

    this.state.fixtures.unshift(newFixture);
    const homeTeam = this.state.teams.find((t) => t.id === payload.homeTeamId);
    const awayTeam = this.state.teams.find((t) => t.id === payload.awayTeamId);

    this.state.notifications.unshift({
      id: `notif_${Date.now()}`,
      divisionId: newFixture.divisionId,
      type: 'match_fixture',
      title: `مباراة مجدولة: ${homeTeam?.name || ''} ضد ${awayTeam?.name || ''}`,
      message: `تمت جدولة المواجهة في ${payload.roundName} بتاريخ ${payload.matchDate} الساعة ${payload.matchTime} تحت إشراف الحكم/المنظم ${newFixture.assignedReferee}.`,
      createdAt: new Date().toISOString(),
      read: false
    });

    this.addAuditLog(
      adminName,
      'جدولة مباراة جديدة',
      `${homeTeam?.name || payload.homeTeamId} ضد ${awayTeam?.name || payload.awayTeamId}`,
      `${tour.nameAr} - ${payload.matchDate} ${payload.matchTime}`
    );

    this.saveToDisk();
    return { success: true, fixture: newFixture };
  }

  public recordMatchResult(
    fixtureId: string,
    homeScore: number,
    awayScore: number,
    adminName: string,
    events?: any[],
    options?: {
      stats?: MatchStats;
      resultScreenshotUrl?: string;
      aiResultAudit?: MatchFixture['aiResultAudit'];
    }
  ): boolean {
    const fixture = this.state.fixtures.find((f) => f.id === fixtureId);
    if (!fixture) return false;

    const alreadyFinished = fixture.status === 'finished';
    const tour = this.state.tournaments.find((t) => t.id === fixture.tournamentId);
    const scoring = tour?.scoringRules || defaultScoring;

    const homeTeam = this.state.teams.find((t) => t.id === fixture.homeTeamId);
    const awayTeam = this.state.teams.find((t) => t.id === fixture.awayTeamId);

    const homePlayer = homeTeam?.playerId ? this.state.players.find((p) => p.id === homeTeam.playerId) : undefined;
    const awayPlayer = awayTeam?.playerId ? this.state.players.find((p) => p.id === awayTeam.playerId) : undefined;
    const matchSeason = fixture.season || '2026/2027';

    const ensureHistoryEntry = (player: Player, team: Team): PlayerSeasonHistory => {
      if (!Array.isArray(player.seasonHistory)) player.seasonHistory = [];
      let entry = player.seasonHistory.find((h) => h.season === matchSeason && (h.teamId === team.id || h.teamName === team.name));
      if (!entry) {
        entry = {
          season: matchSeason,
          teamId: team.id,
          teamName: team.name,
          divisionId: team.divisionId,
          divisionTier: team.divisionTier,
          tournamentName: tour?.nameAr,
          matchesPlayed: 0,
          wins: 0,
          draws: 0,
          losses: 0,
          goalsFor: 0,
          goalsAgainst: 0,
          points: 0,
          awards: []
        };
        player.seasonHistory.unshift(entry);
      }
      return entry;
    };

    // If editing an already-finished match, rollback previous stats first cleanly
    if (alreadyFinished && homeTeam && awayTeam && fixture.homeScore !== undefined && fixture.awayScore !== undefined) {
      const prevH = fixture.homeScore;
      const prevA = fixture.awayScore;
      homeTeam.goalsFor = Math.max(0, homeTeam.goalsFor - prevH);
      homeTeam.goalsAgainst = Math.max(0, homeTeam.goalsAgainst - prevA);
      awayTeam.goalsFor = Math.max(0, awayTeam.goalsFor - prevA);
      awayTeam.goalsAgainst = Math.max(0, awayTeam.goalsAgainst - prevH);
      if (prevH > prevA) {
        homeTeam.wins = Math.max(0, homeTeam.wins - 1);
        homeTeam.points = Math.max(0, homeTeam.points - scoring.winPoints);
        awayTeam.losses = Math.max(0, awayTeam.losses - 1);
        awayTeam.points = Math.max(0, awayTeam.points - scoring.lossPoints);
      } else if (prevA > prevH) {
        awayTeam.wins = Math.max(0, awayTeam.wins - 1);
        awayTeam.points = Math.max(0, awayTeam.points - scoring.winPoints);
        homeTeam.losses = Math.max(0, homeTeam.losses - 1);
        homeTeam.points = Math.max(0, homeTeam.points - scoring.lossPoints);
      } else {
        homeTeam.draws = Math.max(0, homeTeam.draws - 1);
        homeTeam.points = Math.max(0, homeTeam.points - scoring.drawPoints);
        awayTeam.draws = Math.max(0, awayTeam.draws - 1);
        awayTeam.points = Math.max(0, awayTeam.points - scoring.drawPoints);
      }

      if (homePlayer) {
        const hEntry = ensureHistoryEntry(homePlayer, homeTeam);
        hEntry.matchesPlayed = Math.max(0, hEntry.matchesPlayed - 1);
        hEntry.goalsFor = Math.max(0, hEntry.goalsFor - prevH);
        hEntry.goalsAgainst = Math.max(0, hEntry.goalsAgainst - prevA);
        if (prevH > prevA) {
          hEntry.wins = Math.max(0, hEntry.wins - 1);
          hEntry.points = Math.max(0, hEntry.points - scoring.winPoints);
        } else if (prevA > prevH) {
          hEntry.losses = Math.max(0, hEntry.losses - 1);
          hEntry.points = Math.max(0, hEntry.points - scoring.lossPoints);
        } else {
          hEntry.draws = Math.max(0, hEntry.draws - 1);
          hEntry.points = Math.max(0, hEntry.points - scoring.drawPoints);
        }
      }
      if (awayPlayer) {
        const aEntry = ensureHistoryEntry(awayPlayer, awayTeam);
        aEntry.matchesPlayed = Math.max(0, aEntry.matchesPlayed - 1);
        aEntry.goalsFor = Math.max(0, aEntry.goalsFor - prevA);
        aEntry.goalsAgainst = Math.max(0, aEntry.goalsAgainst - prevH);
        if (prevA > prevH) {
          aEntry.wins = Math.max(0, aEntry.wins - 1);
          aEntry.points = Math.max(0, aEntry.points - scoring.winPoints);
        } else if (prevH > prevA) {
          aEntry.losses = Math.max(0, aEntry.losses - 1);
          aEntry.points = Math.max(0, aEntry.points - scoring.lossPoints);
        } else {
          aEntry.draws = Math.max(0, aEntry.draws - 1);
          aEntry.points = Math.max(0, aEntry.points - scoring.drawPoints);
        }
      }
    }

    fixture.homeScore = homeScore;
    fixture.awayScore = awayScore;
    fixture.status = 'finished';
    if (events && Array.isArray(events)) fixture.events = events;
    if (options?.stats) fixture.stats = options.stats;
    if (options?.resultScreenshotUrl) fixture.resultScreenshotUrl = options.resultScreenshotUrl;
    if (options?.aiResultAudit) fixture.aiResultAudit = options.aiResultAudit;

    if (homeTeam && awayTeam) {
      homeTeam.goalsFor += homeScore;
      homeTeam.goalsAgainst += awayScore;
      awayTeam.goalsFor += awayScore;
      awayTeam.goalsAgainst += homeScore;

      if (homeScore > awayScore) {
        homeTeam.wins += 1;
        homeTeam.points += scoring.winPoints;
        awayTeam.losses += 1;
        awayTeam.points += scoring.lossPoints;
      } else if (awayScore > homeScore) {
        awayTeam.wins += 1;
        awayTeam.points += scoring.winPoints;
        homeTeam.losses += 1;
        homeTeam.points += scoring.lossPoints;
      } else {
        homeTeam.draws += 1;
        homeTeam.points += scoring.drawPoints;
        awayTeam.draws += 1;
        awayTeam.points += scoring.drawPoints;
      }

      if (homePlayer) {
        const hEntry = ensureHistoryEntry(homePlayer, homeTeam);
        hEntry.matchesPlayed += 1;
        hEntry.goalsFor += homeScore;
        hEntry.goalsAgainst += awayScore;
        if (homeScore > awayScore) {
          hEntry.wins += 1;
          hEntry.points += scoring.winPoints;
        } else if (awayScore > homeScore) {
          hEntry.losses += 1;
          hEntry.points += scoring.lossPoints;
        } else {
          hEntry.draws += 1;
          hEntry.points += scoring.drawPoints;
        }
      }
      if (awayPlayer) {
        const aEntry = ensureHistoryEntry(awayPlayer, awayTeam);
        aEntry.matchesPlayed += 1;
        aEntry.goalsFor += awayScore;
        aEntry.goalsAgainst += homeScore;
        if (awayScore > homeScore) {
          aEntry.wins += 1;
          aEntry.points += scoring.winPoints;
        } else if (homeScore > awayScore) {
          aEntry.losses += 1;
          aEntry.points += scoring.lossPoints;
        } else {
          aEntry.draws += 1;
          aEntry.points += scoring.drawPoints;
        }
      }
    }

    this.state.notifications.unshift({
      id: `notif_${Date.now()}`,
      divisionId: fixture.divisionId,
      type: 'result_update',
      title: `اعتماد نتيجة: ${homeTeam?.name || ''} (${homeScore} - ${awayScore}) ${awayTeam?.name || ''}`,
      message: `تم اعتماد النتيجة في ${fixture.roundName} وتحديث جدول الترتيب تلقائياً.`,
      createdAt: new Date().toISOString(),
      read: false
    });

    this.addAuditLog(
      adminName,
      'رصد وتثبيت نتيجة مباراة رسمية',
      `${homeTeam?.name || ''} ${homeScore} - ${awayScore} ${awayTeam?.name || ''}`,
      `الجولة: ${fixture.roundName}`
    );

    this.saveToDisk();
    return true;
  }

  // Disciplinary Actions
  public getDisciplinary(divisionId?: string): DisciplinaryAction[] {
    if (!divisionId) return this.state.disciplinary;
    return this.state.disciplinary.filter((d) => !d.divisionId || d.divisionId === divisionId);
  }

  public addDisciplinaryAction(action: Omit<DisciplinaryAction, 'id' | 'issuedAt'>, adminName: string): DisciplinaryAction {
    const newAction: DisciplinaryAction = {
      ...action,
      id: `disc_${Date.now()}`,
      issuedAt: new Date().toISOString()
    };
    this.state.disciplinary.unshift(newAction);

    if (action.pointsDeducted && action.teamId) {
      const team = this.state.teams.find((t) => t.id === action.teamId);
      if (team) {
        team.points = Math.max(0, team.points - action.pointsDeducted);
      }
    }

    this.addAuditLog(adminName, `إصدار عقوبة انضباطية (${action.severity})`, action.playerId, action.description);
    this.saveToDisk();
    return newAction;
  }

  // News CMS
  public getNews(divisionId?: string): NewsItem[] {
    let list = [...this.state.news];
    if (divisionId) list = list.filter((n) => !n.divisionId || n.divisionId === divisionId);
    return list.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  }

  public addNews(item: Omit<NewsItem, 'id' | 'publishedAt'>, adminName: string): NewsItem {
    const newItem: NewsItem = {
      ...item,
      id: `news_${Date.now()}`,
      publishedAt: new Date().toISOString().split('T')[0]
    };
    this.state.news.unshift(newItem);
    this.addAuditLog(adminName, 'نشر بيان رسمي / خبر', newItem.title, newItem.category);
    this.saveToDisk();
    return newItem;
  }

  // Dynamic Regulations CMS
  public getRegulations(): RegulationArticle[] {
    return this.state.regulations;
  }

  public updateRegulations(articles: RegulationArticle[], adminName: string): RegulationArticle[] {
    this.state.regulations = articles;
    this.addAuditLog(adminName, 'تحديث اللوائح التنظيمية والدستور', `${articles.length} أبواب`, 'تم الحفظ في قاعدة البيانات');
    this.saveToDisk();
    return this.state.regulations;
  }

  // Store & Orders
  public getStoreProducts(): StoreProduct[] {
    return this.state.storeProducts;
  }

  public getOrders(): StoreOrder[] {
    return [...this.state.orders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public createOrder(order: Omit<StoreOrder, 'id' | 'orderNumber' | 'createdAt' | 'status'>): StoreOrder {
    const newOrder: StoreOrder = {
      ...order,
      id: `ord_${Date.now()}`,
      orderNumber: `IOEF-${Math.floor(100000 + Math.random() * 900000)}`,
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    this.state.orders.unshift(newOrder);

    this.state.notifications.unshift({
      id: `notif_${Date.now()}`,
      type: 'system',
      title: 'طلب شراء جديد من متجر الاتحاد',
      message: `تم استلام طلب شراء جديد رقم ${newOrder.orderNumber} بمبلغ ${newOrder.totalPrice} ${newOrder.currency} للعميل ${newOrder.customerName}.`,
      createdAt: new Date().toISOString(),
      read: false
    });

    this.saveToDisk();
    return newOrder;
  }

  public updateOrderStatus(orderId: string, status: StoreOrder['status'], adminName: string): boolean {
    const order = this.state.orders.find((o) => o.id === orderId);
    if (!order) return false;
    order.status = status;
    this.addAuditLog(adminName, `تحديث حالة طلب متجر (${order.orderNumber})`, order.customerName, status);
    this.saveToDisk();
    return true;
  }

  // Notifications & WhatsApp Webhook Dispatcher
  public getNotifications(recipientId?: string, divisionId?: string): NotificationItem[] {
    let list = this.state.notifications;
    if (recipientId) list = list.filter((n) => !n.recipientId || n.recipientId === recipientId);
    if (divisionId) list = list.filter((n) => !n.divisionId || n.divisionId === divisionId);
    return list;
  }

  public markNotificationRead(id: string): boolean {
    const notif = this.state.notifications.find((n) => n.id === id);
    if (notif) {
      notif.read = true;
      this.saveToDisk();
      return true;
    }
    return false;
  }

  public async dispatchWhatsAppNotification(
    phone: string,
    messageText: string
  ): Promise<{ deliveredVia: 'whatsapp_webhook' | 'in_app_fallback'; detail: string }> {
    const { whatsappApiEnabled, whatsappWebhookUrl } = this.state.settings;
    if (whatsappApiEnabled && whatsappWebhookUrl && whatsappWebhookUrl.startsWith('https://')) {
      try {
        const res = await fetch(whatsappWebhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(process.env.WHATSAPP_API_TOKEN ? { Authorization: `Bearer ${process.env.WHATSAPP_API_TOKEN}` } : {})
          },
          body: JSON.stringify({ to: phone, text: messageText, source: 'IOEF' })
        });
        if (res.ok) {
          return { deliveredVia: 'whatsapp_webhook', detail: `تم إرسال إشعار واتساب إلى ${phone}` };
        }
      } catch (err) {
        console.warn('WhatsApp webhook dispatch fallback:', err);
      }
    }
    return {
      deliveredVia: 'in_app_fallback',
      detail: 'تم حفظ التنبيه داخلياً (يتطلب تفعيل WHATSAPP_WEBHOOK_URL للإرسال الخارجي عبر Meta WhatsApp Business API)'
    };
  }

  // Audit Logs & Admin RBAC Management
  public getAuditLogs(): AuditLog[] {
    return [...this.state.auditLogs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  public addAuditLog(adminName: string, action: string, target: string, details: string) {
    this.state.auditLogs.unshift({
      id: `log_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      adminName,
      action,
      target,
      timestamp: new Date().toISOString(),
      details
    });
    if (this.state.auditLogs.length > 200) {
      this.state.auditLogs = this.state.auditLogs.slice(0, 200);
    }
  }

  public getAdminUsers(): AdminUser[] {
    return this.state.adminUsers;
  }

  public getAdminByUsername(username: string): AdminUser | undefined {
    return this.state.adminUsers.find((a) => a.username.toLowerCase() === username.trim().toLowerCase());
  }

  public createAdminUser(
    payload: {
      username: string;
      name: string;
      email: string;
      role: 'director' | 'organizer';
      assignedDivisionId?: string;
      permissions?: Partial<AdminPermissions>;
    },
    actorName: string
  ): { success: boolean; admin?: AdminUser; error?: string } {
    const cleanUsername = payload.username.trim().toLowerCase();
    if (!cleanUsername || cleanUsername.length < 3 || !/^[a-z0-9._-]+$/.test(cleanUsername)) {
      return { success: false, error: 'اسم المستخدم يجب أن يكون بالإنجليزية (3 أحرف على الأقل بدون مسافات).' };
    }
    if (['islam', 'islammohamed', 'president'].includes(cleanUsername) || this.state.adminUsers.some((a) => a.username.toLowerCase() === cleanUsername)) {
      return { success: false, error: 'اسم المستخدم مسجل مسبقاً. يرجى اختيار اسم مستخدم آخر.' };
    }
    if (payload.role === 'organizer' && !payload.assignedDivisionId) {
      return { success: false, error: 'يجب تحديد الاتحاد الوطني المخصص لحساب المنظم.' };
    }

    const baseDefaults = payload.role === 'director' ? DIRECTOR_PERMISSIONS : ORGANIZER_PERMISSIONS;
    const mergedPermissions = enforceRoleCapabilities(
      payload.role,
      payload.permissions ? { ...baseDefaults, ...payload.permissions } : baseDefaults
    );

    const created: AdminUser = {
      id: `admin_${Date.now()}`,
      username: cleanUsername,
      name: payload.name.trim(),
      role: payload.role,
      email: payload.email.trim() || `${cleanUsername}@ioef.org`,
      active: true,
      assignedDivisionId: payload.role === 'organizer' ? payload.assignedDivisionId : payload.assignedDivisionId || undefined,
      permissions: mergedPermissions,
    };

    this.state.adminUsers.push(created);
    this.addAuditLog(actorName, 'تسجيل وإضافة مسؤول إداري رسمي', `${created.name} (@${created.username})`, created.role);
    this.saveToDisk();
    return { success: true, admin: created };
  }

  public deleteAdminUser(adminId: string, actorName: string): { success: boolean; error?: string } {
    const idx = this.state.adminUsers.findIndex((a) => a.id === adminId);
    if (idx === -1) return { success: false, error: 'حساب المشرف غير موجود.' };
    const target = this.state.adminUsers[idx];
    if (target.role === 'president') {
      return { success: false, error: 'لا يمكن حذف حساب رئيس الاتحاد.' };
    }
    this.state.adminUsers.splice(idx, 1);
    this.addAuditLog(actorName, 'حذف حساب مسؤول إداري', `${target.name} (@${target.username})`, target.role);
    this.saveToDisk();
    return { success: true };
  }

  public updateAdminPermissions(
    adminId: string,
    payload: { permissions?: Partial<AdminPermissions>; assignedDivisionId?: string; active?: boolean },
    actorName: string
  ): AdminUser | null {
    const admin = this.state.adminUsers.find((a) => a.id === adminId);
    if (!admin) return null;

    // Protect sovereign President account from self-lockout or permission stripping
    if (admin.role === 'president') {
      admin.permissions = enforceRoleCapabilities('president', PRESIDENT_PERMISSIONS);
      admin.active = true;
      admin.assignedDivisionId = undefined;
      return admin;
    }

    if (payload.permissions) {
      const merged = { ...admin.permissions, ...payload.permissions };
      admin.permissions = enforceRoleCapabilities(admin.role, merged);
    }
    if (payload.assignedDivisionId !== undefined) {
      admin.assignedDivisionId = payload.assignedDivisionId || undefined;
    }
    if (payload.active !== undefined) {
      admin.active = payload.active;
    }
    this.addAuditLog(actorName, 'تحديث صلاحيات مشرف إداري', admin.name, JSON.stringify({ role: admin.role, assignedDivisionId: admin.assignedDivisionId, active: admin.active, permissions: admin.permissions }));
    this.saveToDisk();
    return admin;
  }

  // Support Tickets
  public getSupportTicketById(id: string): SupportTicket | undefined {
    if (!this.state.supportTickets) this.state.supportTickets = [];
    return this.state.supportTickets.find((t) => t.id === id);
  }

  public getSupportTickets(status?: string, divisionId?: string): SupportTicket[] {
    if (!this.state.supportTickets) this.state.supportTickets = [];
    let list = [...this.state.supportTickets];
    if (status && status !== 'all') list = list.filter((t) => t.status === status);
    if (divisionId) list = list.filter((t) => t.divisionId === divisionId);
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public addSupportTicket(ticket: Omit<SupportTicket, 'id' | 'status' | 'createdAt'>): SupportTicket {
    if (!this.state.supportTickets) this.state.supportTickets = [];
    const newTicket: SupportTicket = {
      ...ticket,
      id: `tkt_${Date.now()}`,
      status: 'open',
      createdAt: new Date().toISOString()
    };
    this.state.supportTickets.unshift(newTicket);

    this.state.notifications.unshift({
      id: `notif_${Date.now()}`,
      divisionId: ticket.divisionId,
      type: 'system',
      title: 'تذكرة اعتراض أو دعم فني جديدة',
      message: `تم استلام تذكرة جديدة (${ticket.ticketSubject}) من اللاعب: ${ticket.senderName}.`,
      createdAt: new Date().toISOString(),
      read: false
    });

    this.saveToDisk();
    return newTicket;
  }

  public updateSupportTicket(
    id: string,
    status: SupportTicket['status'],
    resolutionNotes: string,
    adminName: string
  ): boolean {
    if (!this.state.supportTickets) this.state.supportTickets = [];
    const ticket = this.state.supportTickets.find((t) => t.id === id);
    if (!ticket) return false;

    ticket.status = status;
    ticket.resolutionNotes = resolutionNotes;
    ticket.resolvedBy = adminName;

    this.addAuditLog(adminName, `معالجة تذكرة دعم فني (${ticket.id})`, ticket.senderName, status);
    this.saveToDisk();
    return true;
  }

  public restoreFromBackup(filename: string): boolean {
    const data = backupManager.restoreBackup(filename);
    if (!data) return false;
    this.state = data;
    this.saveToDisk();
    return true;
  }
}

export const db = new Database();
