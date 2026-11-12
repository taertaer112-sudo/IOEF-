import React, { useState, useEffect, useMemo } from 'react';
import {
  Shield,
  Users,
  Trophy,
  Calendar,
  Sparkles,
  Settings,
  Lock,
  Unlock,
  AlertTriangle,
  ShoppingBag,
  FileText,
  History,
  Check,
  X,
  CheckCircle2,
  Send,
  Plus,
  RefreshCw,
  Loader2,
  Cpu,
  Activity,
  LifeBuoy,
  HardDriveDownload,
  RotateCcw,
  LogOut,
  KeyRound,
  UserCog,
  BookOpen,
  Camera,
  Bell,
  Trash2,
  CreditCard,
} from 'lucide-react';
import {
  SystemSettings,
  RegistrationApplication,
  Player,
  Team,
  MatchFixture,
  Tournament,
  Division,
  DisciplinaryAction,
  NewsItem,
  StoreOrder,
  AuditLog,
  AdminUser,
  AdminPermissions,
  SupportTicket,
  AISubsystemInfo,
  RegulationArticle,
  GeminiModelAlias,
  RosterPlayer,
} from '../types';
import { api, getAdminToken } from '../services/api';
import { useToast } from '../context/ToastContext';
import { AdminMembershipPanel } from '../components/AdminMembershipPanel';

interface AdminDashboardProps {
  settings: SystemSettings;
  divisions: Division[];
  tournaments: Tournament[];
  teams: Team[];
  players: Player[];
  fixtures: MatchFixture[];
  news: NewsItem[];
  disciplinary: DisciplinaryAction[];
  regulations: RegulationArticle[];
  onRefreshAll: () => void;
}

const MODEL_OPTIONS: Array<{ value: GeminiModelAlias; label: string; note: string }> = [
  { value: 'gemini-4-hydrogen', label: 'Gemini 4 Hydrogen (الافتراضي المعتمد)', note: 'أحدث نموذج للرؤية والتحليل النصي' },
  { value: 'gemini-4-argon', label: 'Gemini 4 Argon (تحليل متقدم)', note: 'دقة عالية للتدقيق المركب' },
  { value: 'gemini-4-carbon', label: 'Gemini 4 Carbon (فائق السرعة)', note: 'مناسب للعمليات عالية الكثافة' },
  { value: 'gemini-3.1-flash-lite', label: 'Gemini 3.1 Flash Lite (خفيف)', note: 'استجابة اقتصادية سريعة' },
];

const PERMISSION_LABELS: Array<{ key: keyof AdminPermissions; label: string }> = [
  { key: 'manageRegistrations', label: 'مراجعة طلبات التسجيل والأندية' },
  { key: 'manageSquadLocks', label: 'فتح وقفل تعديل التشكيلات' },
  { key: 'manageMatchesAndResults', label: 'جدولة المباريات وتثبيت النتائج' },
  { key: 'manageTournamentsAndRules', label: 'تعديل البطولات واللوائح التنظيمية' },
  { key: 'manageDiscipline', label: 'إصدار العقوبات والانضباط' },
  { key: 'manageNewsAndStore', label: 'الأخبار وطلبات المتجر' },
  { key: 'manageSettingsAndAI', label: 'إعدادات النظام ونماذج الذكاء الاصطناعي' },
  { key: 'manageBackups', label: 'النسخ الاحتياطية والاستعادة' },
  { key: 'manageAdmins', label: 'إدارة حسابات وصلاحيات المشرفين' },
];

const ROLE_AR_LABELS: Record<AdminUser['role'], string> = {
  president: 'رئيس الاتحاد',
  director: 'مدير الاتحاد',
  organizer: 'المنظم',
};

const ROLE_CEILING_MAP: Record<AdminUser['role'], AdminPermissions> = {
  president: {
    manageRegistrations: true,
    manageSquadLocks: true,
    manageMatchesAndResults: true,
    manageTournamentsAndRules: true,
    manageDiscipline: true,
    manageNewsAndStore: true,
    manageSettingsAndAI: true,
    manageBackups: true,
    manageAdmins: true,
  },
  director: {
    manageRegistrations: true,
    manageSquadLocks: true,
    manageMatchesAndResults: true,
    manageTournamentsAndRules: true,
    manageDiscipline: true,
    manageNewsAndStore: true,
    manageSettingsAndAI: false,
    manageBackups: true,
    manageAdmins: false,
  },
  organizer: {
    manageRegistrations: true,
    manageSquadLocks: false,
    manageMatchesAndResults: true,
    manageTournamentsAndRules: false,
    manageDiscipline: false,
    manageNewsAndStore: false,
    manageSettingsAndAI: false,
    manageBackups: false,
    manageAdmins: false,
  },
};

interface DecodedJwtClaims {
  sub?: string;
  username?: string;
  name?: string;
  role?: AdminUser['role'];
  roleAr?: string;
  assignedDivisionId?: string | null;
  exp?: number;
  iss?: string;
  aud?: string;
  jti?: string;
}

function decodeJwtClaims(token: string | null): DecodedJwtClaims | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const jsonStr = new TextDecoder().decode(bytes);
    return JSON.parse(jsonStr) as DecodedJwtClaims;
  } catch {
    return null;
  }
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  settings,
  divisions,
  tournaments,
  teams,
  players,
  fixtures,
  news,
  disciplinary,
  regulations,
  onRefreshAll,
}) => {
  const { addToast } = useToast();

  // Authentication Gate State (RFC 7519 JWT HS256)
  const [authChecking, setAuthChecking] = useState(true);
  const [currentAdmin, setCurrentAdmin] = useState<AdminUser | null>(null);
  const [jwtClaims, setJwtClaims] = useState<DecodedJwtClaims | null>(null);
  const [roleMatrix, setRoleMatrix] = useState<Record<string, any> | null>(null);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);

  const [activeTab, setActiveTab] = useState<string>('overview');

  // President Admin Creation / Password Reset / Delete State
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminUsername, setNewAdminUsername] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminRole, setNewAdminRole] = useState<'organizer' | 'director'>('organizer');
  const [newAdminDivisionId, setNewAdminDivisionId] = useState(divisions[0]?.id || 'div_ksa');
  const [newAdminPerms, setNewAdminPerms] = useState<Partial<AdminPermissions>>({
    manageMatchesAndResults: true,
    manageRegistrations: false,
  });
  const [creatingAdmin, setCreatingAdmin] = useState(false);
  const [createAdminError, setCreateAdminError] = useState('');
  const [passwordResetTarget, setPasswordResetTarget] = useState<AdminUser | null>(null);
  const [newResetPassword, setNewResetPassword] = useState('');
  const [savingResetPassword, setSavingResetPassword] = useState(false);
  const [deleteAdminTarget, setDeleteAdminTarget] = useState<AdminUser | null>(null);
  const [deletingAdmin, setDeletingAdmin] = useState(false);

  // Protected Admin Data State (fetched only after authentication)
  const [registrations, setRegistrations] = useState<RegistrationApplication[]>([]);
  const [orders, setOrders] = useState<StoreOrder[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
  const [aiSubsystems, setAiSubsystems] = useState<AISubsystemInfo[]>([]);
  const [queueStats, setQueueStats] = useState<any>(null);
  const [systemHealth, setSystemHealth] = useState<any>(null);
  const [backups, setBackups] = useState<any[]>([]);

  // Registration Review & Inline Rejection Modal
  const [regFilter, setRegFilter] = useState<string>('all');
  const [loadingRegs, setLoadingRegs] = useState<boolean>(false);
  const [rejectTarget, setRejectTarget] = useState<RegistrationApplication | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('');
  const [duplicateScanResult, setDuplicateScanResult] = useState<{
    flaggedCount: number;
    report: string;
    flaggedRegistrations: Array<{ id: string; name: string; reason: string }>;
  } | null>(null);
  const [scanningDuplicates, setScanningDuplicates] = useState<boolean>(false);

  // Central AI Assistant (Multi-turn + Confirmation Action)
  const [aiPrompt, setAiPrompt] = useState<string>('');
  const [aiChatMessages, setAiChatMessages] = useState<
    Array<{
      sender: 'admin' | 'ai';
      text: string;
      time: string;
      routedSubsystem?: string;
      proposedAction?: { type: string; summary: string; payload?: any };
    }>
  >([
    {
      sender: 'ai',
      text: 'مرحباً بك في المساعد الذكي المركزي للاتحاد الدولي IOEF. يمكنك السؤال عن إحصائيات التسجيل والفرق، طلب صياغة بيان رسمي، أو طلب فحص التكرارات.',
      time: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [aiGenerating, setAiGenerating] = useState<boolean>(false);

  // Players & Team Roster Editor
  const [editingTeamRoster, setEditingTeamRoster] = useState<Team | null>(null);
  const [rosterDraft, setRosterDraft] = useState<RosterPlayer[]>([]);
  const [savingRoster, setSavingRoster] = useState(false);

  // Match Scheduler + Result OCR + Score Recording + Reminder
  const [schedTournamentId, setSchedTournamentId] = useState<string>(tournaments[0]?.id || '');
  const [schedRoundName, setSchedRoundName] = useState<string>('الجولة الأولى');
  const [schedHomeTeamId, setSchedHomeTeamId] = useState<string>('');
  const [schedAwayTeamId, setSchedAwayTeamId] = useState<string>('');
  const [schedDate, setSchedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [schedTime, setSchedTime] = useState<string>('21:00');
  const [schedReferee, setSchedReferee] = useState<string>('');
  const [creatingFixture, setCreatingFixture] = useState(false);

  const [selectedFixtureId, setSelectedFixtureId] = useState<string>('');
  const [homeScoreInput, setHomeScoreInput] = useState<number>(0);
  const [awayScoreInput, setAwayScoreInput] = useState<number>(0);
  const [scorerInput, setScorerInput] = useState<string>('');
  const [minuteInput, setMinuteInput] = useState<number>(45);
  const [resultScreenshot, setResultScreenshot] = useState<string>('');
  const [ocrAuditResult, setOcrAuditResult] = useState<MatchFixture['aiResultAudit'] | undefined>(undefined);
  const [verifyingResultOcr, setVerifyingResultOcr] = useState(false);
  const [recordingScore, setRecordingScore] = useState(false);
  const [generatingReportForId, setGeneratingReportForId] = useState<string | null>(null);

  const [reminderPhone, setReminderPhone] = useState('');
  const [reminderMsg, setReminderMsg] = useState('');
  const [sendingReminder, setSendingReminder] = useState(false);

  // Tournaments & Dynamic Rules CMS
  const [editingTournamentId, setEditingTournamentId] = useState<string>(tournaments[0]?.id || '');
  const [tourNameAr, setTourNameAr] = useState('');
  const [tourSeason, setTourSeason] = useState('2026/2027');
  const [tourStatus, setTourStatus] = useState<'upcoming' | 'ongoing' | 'completed'>('ongoing');
  const [tourTrophy, setTourTrophy] = useState('');
  const [tourRulesSummary, setTourRulesSummary] = useState('');
  const [tourWinPts, setTourWinPts] = useState(3);
  const [tourDrawPts, setTourDrawPts] = useState(1);
  const [tourLossPts, setTourLossPts] = useState(0);
  const [savingTour, setSavingTour] = useState(false);

  const [rulesDraft, setRulesDraft] = useState<RegulationArticle[]>(regulations);
  const [savingRules, setSavingRules] = useState(false);

  // Disciplinary
  const [discPlayerId, setDiscPlayerId] = useState<string>(players[0]?.id || '');
  const [discViolation, setDiscViolation] = useState<DisciplinaryAction['violationType']>('fair_play');
  const [discSeverity, setDiscSeverity] = useState<DisciplinaryAction['severity']>('warning');
  const [discPoints, setDiscPoints] = useState<number>(0);
  const [discDesc, setDiscDesc] = useState<string>('');
  const [submittingDisc, setSubmittingDisc] = useState(false);

  // News CMS
  const [newsDivisionId, setNewsDivisionId] = useState<string>('');
  const [newsTitle, setNewsTitle] = useState('');
  const [newsCategory, setNewsCategory] = useState<NewsItem['category']>('announcement');
  const [newsContent, setNewsContent] = useState('');
  const [newsIsImportant, setNewsIsImportant] = useState(false);
  const [publishingNews, setPublishingNews] = useState(false);

  // Support Tickets
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [ticketResolutionNotes, setTicketResolutionNotes] = useState('');
  const [resolvingTicket, setResolvingTicket] = useState(false);

  // Backups & Inline Restore Confirm Modal
  const [creatingBackup, setCreatingBackup] = useState(false);
  const [restoringBackup, setRestoringBackup] = useState(false);
  const [confirmRestoreFilename, setConfirmRestoreFilename] = useState<string | null>(null);

  // Settings, AI Model Selector & Social Channels
  const [firstMinRating, setFirstMinRating] = useState(settings.firstDivisionMinRating);
  const [secondMinRating, setSecondMinRating] = useState(settings.secondDivisionMinRating);
  const [allowRegToggle, setAllowRegToggle] = useState(settings.allowRegistration);
  const [whatsappApiEnabled, setWhatsappApiEnabled] = useState(settings.whatsappApiEnabled);
  const [whatsappWebhookUrl, setWhatsappWebhookUrl] = useState(settings.whatsappWebhookUrl || '');
  const [waChannelName, setWaChannelName] = useState(settings.socialChannels?.whatsappChannelName || '');
  const [waChannelUrl, setWaChannelUrl] = useState(settings.socialChannels?.whatsappChannelUrl || '');
  const [tiktokHandle, setTiktokHandle] = useState(settings.socialChannels?.tiktokHandle || '');
  const [tiktokUrl, setTiktokUrl] = useState(settings.socialChannels?.tiktokUrl || '');
  const [fbPageName, setFbPageName] = useState(settings.socialChannels?.facebookPageName || '');
  const [fbUrl, setFbUrl] = useState(settings.socialChannels?.facebookUrl || '');
  const [activeAiModel, setActiveAiModel] = useState<GeminiModelAlias>(
    settings.aiConfig?.activeModel || 'gemini-4-hydrogen'
  );
  const [enableSquadVision, setEnableSquadVision] = useState(settings.aiConfig?.enableSquadVision !== false);
  const [enableResultVision, setEnableResultVision] = useState(settings.aiConfig?.enableResultVision !== false);
  const [enableCentralAssistant, setEnableCentralAssistant] = useState(
    settings.aiConfig?.enableCentralAssistant !== false
  );
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    setRulesDraft(regulations);
  }, [regulations]);

  useEffect(() => {
    if (players.length > 0 && !discPlayerId) setDiscPlayerId(players[0].id);
  }, [players, discPlayerId]);

  useEffect(() => {
    const t = tournaments.find((item) => item.id === editingTournamentId);
    if (t) {
      setTourNameAr(t.nameAr);
      setTourSeason(t.season);
      setTourStatus(t.status);
      setTourTrophy(t.trophyName);
      setTourRulesSummary(t.rulesSummary);
      setTourWinPts(t.scoringRules?.winPoints ?? 3);
      setTourDrawPts(t.scoringRules?.drawPoints ?? 1);
      setTourLossPts(t.scoringRules?.lossPoints ?? 0);
    }
  }, [editingTournamentId, tournaments]);

  // Verify stored JWT session on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await api.adminMe();
        if (res?.success && res.admin) {
          setCurrentAdmin(res.admin);
          if (res.jwtClaims) setJwtClaims(res.jwtClaims);
          if (res.roleMatrix) setRoleMatrix(res.roleMatrix);
        }
      } finally {
        setAuthChecking(false);
      }
    })();
  }, []);

  const scopeDivisionId =
    currentAdmin?.role === 'organizer' && currentAdmin.assignedDivisionId
      ? currentAdmin.assignedDivisionId
      : undefined;

  const scopedTeams = useMemo(
    () => (scopeDivisionId ? teams.filter((t) => t.divisionId === scopeDivisionId) : teams),
    [teams, scopeDivisionId]
  );
  const scopedPlayers = useMemo(
    () => (scopeDivisionId ? players.filter((p) => p.divisionId === scopeDivisionId) : players),
    [players, scopeDivisionId]
  );
  const scopedFixtures = useMemo(
    () => (scopeDivisionId ? fixtures.filter((f) => f.divisionId === scopeDivisionId) : fixtures),
    [fixtures, scopeDivisionId]
  );
  const scopedTournaments = useMemo(
    () =>
      scopeDivisionId
        ? tournaments.filter((t) => !t.divisionId || t.divisionId === scopeDivisionId)
        : tournaments,
    [tournaments, scopeDivisionId]
  );

  // Sync scheduler tournament default for organizer
  useEffect(() => {
    if (scopedTournaments.length > 0 && !scopedTournaments.some((t) => t.id === schedTournamentId)) {
      setSchedTournamentId(scopedTournaments[0].id);
    }
    if (scopedTournaments.length > 0 && !scopedTournaments.some((t) => t.id === editingTournamentId)) {
      setEditingTournamentId(scopedTournaments[0].id);
    }
  }, [scopedTournaments]);

  // Role extracted directly from the active JWT token
  const decodedTokenClaims = decodeJwtClaims(getAdminToken()) || jwtClaims;
  const jwtRole: AdminUser['role'] | null =
    decodedTokenClaims?.role || currentAdmin?.role || null;

  // Enforce strict default tab for Organizer extracted from JWT
  useEffect(() => {
    if (currentAdmin && jwtRole === 'organizer' && activeTab !== 'scores') {
      setActiveTab('scores');
    }
  }, [currentAdmin, jwtRole, activeTab]);

  const fetchProtectedAdminData = async () => {
    if (!currentAdmin) return;
    const effectiveRole = decodeJwtClaims(getAdminToken())?.role || jwtClaims?.role || currentAdmin.role;
    // Organizer ONLY operates in Match & Results Management section
    if (effectiveRole === 'organizer') {
      return;
    }

    const perms = currentAdmin.permissions;
    const isPresident = effectiveRole === 'president';
    const isDirectorOrPresident = effectiveRole === 'president' || effectiveRole === 'director';
    const tasks: Promise<void>[] = [];

    if (perms.manageRegistrations) {
      setLoadingRegs(true);
      tasks.push(
        api
          .getRegistrations(regFilter, scopeDivisionId)
          .then(setRegistrations)
          .catch(() => {})
          .finally(() => setLoadingRegs(false))
      );
      tasks.push(api.getSupportTickets().then(setSupportTickets).catch(() => {}));
    }
    if (isDirectorOrPresident && perms.manageNewsAndStore) {
      tasks.push(api.getOrders().then(setOrders).catch(() => {}));
    }
    if (isDirectorOrPresident) {
      tasks.push(api.getAuditLogs().then(setAuditLogs).catch(() => {}));
    }
    if (isPresident && perms.manageAdmins) {
      tasks.push(api.getAdmins().then(setAdmins).catch(() => {}));
    }
    tasks.push(
      api
        .getAISubsystems()
        .then((res) => {
          if (res.success) {
            setAiSubsystems(res.subsystems);
            setQueueStats(res.queueStats);
          }
        })
        .catch(() => {})
    );
    tasks.push(
      api
        .getSystemHealth()
        .then((res) => {
          if (res.success) setSystemHealth(res.data);
        })
        .catch(() => {})
    );
    if (isDirectorOrPresident && perms.manageBackups) {
      tasks.push(
        api
          .getBackups()
          .then((res) => {
            if (res.success) setBackups(res.backups);
          })
          .catch(() => {})
      );
    }

    await Promise.all(tasks);
  };

  useEffect(() => {
    if (currentAdmin) {
      void fetchProtectedAdminData();
    }
  }, [currentAdmin, regFilter]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginUsername.trim() || !loginPassword || loggingIn) return;
    setLoggingIn(true);
    setLoginError('');
    try {
      const res = await api.adminLogin(loginUsername.trim(), loginPassword);
      const tokenClaims: DecodedJwtClaims | null = decodeJwtClaims(res.token || getAdminToken()) || res.jwtClaims || null;
      const resolvedJwtRole: AdminUser['role'] = tokenClaims?.role || res.admin.role;

      setCurrentAdmin(res.admin);
      if (tokenClaims) setJwtClaims(tokenClaims);
      void api.getRbacMatrix().then((m) => {
        if (m.success && m.roleMatrix) setRoleMatrix(m.roleMatrix);
      }).catch(() => {});
      setLoginPassword('');
      setActiveTab(resolvedJwtRole === 'organizer' ? 'scores' : 'overview');
      onRefreshAll();
      addToast({
        type: 'system',
        title: 'تم التحقق عبر JWT بنجاح',
        message: `أهلاً بك ${res.admin.name} (${ROLE_AR_LABELS[resolvedJwtRole]}) في بوابة الأمانة العامة لـ IOEF.`,
        badge: 'JWT HS256',
      });
    } catch (err: any) {
      setLoginError(err?.message || 'بيانات الدخول غير صحيحة.');
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await api.adminLogout();
    setCurrentAdmin(null);
    setJwtClaims(null);
    setRoleMatrix(null);
    setRegistrations([]);
    setOrders([]);
    setAuditLogs([]);
    setAdmins([]);
    setSupportTickets([]);
    setBackups([]);
  };

  const handleCreateAdminUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (creatingAdmin) return;
    setCreateAdminError('');
    if (!newAdminName.trim() || !newAdminUsername.trim() || newAdminPassword.trim().length < 6) {
      setCreateAdminError('يرجى إدخال الاسم الكامل، اسم المستخدم بالإنجليزية، وكلمة مرور من 6 أحرف على الأقل.');
      return;
    }
    if (newAdminRole === 'organizer' && !newAdminDivisionId) {
      setCreateAdminError('يجب تحديد الاتحاد الوطني المخصص لحساب المنظم.');
      return;
    }

    setCreatingAdmin(true);
    try {
      const res = await api.createAdminUser({
        name: newAdminName.trim(),
        username: newAdminUsername.trim().toLowerCase(),
        password: newAdminPassword.trim(),
        email: newAdminEmail.trim() || undefined,
        role: newAdminRole,
        assignedDivisionId: newAdminRole === 'organizer' ? newAdminDivisionId : undefined,
        permissions: newAdminPerms,
      });
      if (res.success && res.admin) {
        addToast({
          type: 'system',
          title: 'تم تسجيل المسؤول الإداري بنجاح',
          message: `تم اعتماد حساب ${res.admin.name} (@${res.admin.username}) بدور ${ROLE_AR_LABELS[res.admin.role]}.`,
          badge: 'RBAC',
        });
        setNewAdminName('');
        setNewAdminUsername('');
        setNewAdminPassword('');
        setNewAdminEmail('');
        void fetchProtectedAdminData();
      }
    } catch (err: any) {
      setCreateAdminError(err?.message || 'تعذر تسجيل الحساب الجديد.');
    } finally {
      setCreatingAdmin(false);
    }
  };

  const handleConfirmResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordResetTarget || newResetPassword.trim().length < 6 || savingResetPassword) return;
    setSavingResetPassword(true);
    try {
      await api.resetAdminPassword(passwordResetTarget.id, newResetPassword.trim());
      addToast({
        type: 'system',
        title: 'تم تحديث كلمة المرور',
        message: `تم تحديث كلمة مرور الحساب (${passwordResetTarget.name}) بنجاح.`,
        badge: 'الأمان',
      });
      setPasswordResetTarget(null);
      setNewResetPassword('');
    } catch (err: any) {
      addToast({
        type: 'disciplinary',
        title: 'خطأ في التحديث',
        message: err?.message || 'تعذر تغيير كلمة المرور.',
        badge: 'خطأ',
      });
    } finally {
      setSavingResetPassword(false);
    }
  };

  const handleConfirmDeleteAdmin = async () => {
    if (!deleteAdminTarget || deletingAdmin) return;
    setDeletingAdmin(true);
    try {
      await api.deleteAdminUser(deleteAdminTarget.id);
      addToast({
        type: 'system',
        title: 'تم حذف الحساب الإداري',
        message: `تم إزالة حساب ${deleteAdminTarget.name} وإلغاء صلاحياته.`,
        badge: 'RBAC',
      });
      setDeleteAdminTarget(null);
      void fetchProtectedAdminData();
    } catch (err: any) {
      addToast({
        type: 'disciplinary',
        title: 'تعذر الحذف',
        message: err?.message || 'حدث خطأ أثناء حذف الحساب.',
        badge: 'خطأ',
      });
    } finally {
      setDeletingAdmin(false);
    }
  };

  // =========================================================================
  // ADMIN LOGIN GATE UI (when not authenticated)
  // =========================================================================
  if (authChecking) {
    return (
      <div className="py-24 text-center text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-amber-500 mb-3" />
        <span className="text-xs">جاري التحقق من جلسة الأمانة العامة...</span>
      </div>
    );
  }

  if (!currentAdmin) {
    return (
      <div className="max-w-md mx-auto px-4 py-16">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto">
              <KeyRound className="w-7 h-7" />
            </div>
            <h1 className="text-xl font-black text-white">بوابة الإدارة والأمانة العامة (IOEF)</h1>
            <p className="text-xs text-slate-400 leading-relaxed">
              تسجيل الدخول مخصص لرئيس الاتحاد، مدير الاتحاد، ومنظمي الاتحادات الوطنية المعتمدين فقط.
            </p>
          </div>

          {loginError && (
            <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-xs text-rose-200 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-300 font-bold mb-1.5">
                اسم المستخدم الإداري (أو Islam Mohamed لرئيس الاتحاد)
              </label>
              <input
                type="text"
                required
                dir="ltr"
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                placeholder="Islam Mohamed / president / username"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white font-mono focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-bold mb-1.5">كلمة المرور</label>
              <input
                type="password"
                required
                dir="ltr"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white font-mono focus:outline-none focus:border-amber-500"
              />
            </div>

            <button
              type="submit"
              disabled={loggingIn}
              className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
            >
              {loggingIn ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
              <span>دخول موثق لبوابة الإدارة</span>
            </button>
          </form>
        </div>
      </div>
    );
  }

  const perms = currentAdmin.permissions;
  const scopedDivisionName = scopeDivisionId
    ? divisions.find((d) => d.id === scopeDivisionId)?.nameAr
    : null;

  // =========================================================================
  // ACTION HANDLERS
  // =========================================================================
  const handleReviewRegistration = async (
    id: string,
    status: 'approved' | 'rejected' | 'needs_review',
    notes?: string
  ) => {
    try {
      await api.updateRegistrationStatus(id, status, notes);
      await fetchProtectedAdminData();
      onRefreshAll();
      addToast({
        type: 'registration',
        title: status === 'approved' ? 'اعتماد قيد رسمي' : status === 'rejected' ? 'رفض طلب قيد' : 'إحالة للتدقيق',
        message: notes || `تم تحديث قرار الأمانة العامة بواسطة ${currentAdmin.name}`,
        badge: 'الأمانة العامة',
      });
    } catch (e: any) {
      addToast({ type: 'disciplinary', title: 'تعذر التنفيذ', message: e?.message || 'حدث خطأ.', badge: 'خطأ' });
    }
  };

  const handleToggleSquadLock = async (playerId: string, currentLocked: boolean) => {
    if (!perms.manageSquadLocks) {
      addToast({
        type: 'disciplinary',
        title: 'صلاحية محصورة',
        message: 'فتح أو قفل التشكيلات متاح للمخولين بهذه الصلاحية فقط.',
        badge: 'أمن النظام',
      });
      return;
    }
    try {
      await api.setSquadLock(playerId, !currentLocked);
      onRefreshAll();
      addToast({
        type: 'system',
        title: currentLocked ? 'تم فتح التعديل للاعب' : 'تم قفل التشكيلة',
        message: `تم تحديث حالة القفل بواسطة ${currentAdmin.name}.`,
        badge: 'إدارة التشكيلات',
      });
    } catch (e: any) {
      addToast({ type: 'disciplinary', title: 'خطأ', message: e?.message || 'تعذر تنفيذ الإجراء.', badge: 'خطأ' });
    }
  };

  const handleSaveTeamRoster = async () => {
    if (!editingTeamRoster) return;
    setSavingRoster(true);
    try {
      await api.updateTeamRoster(
        editingTeamRoster.id,
        rosterDraft.filter((r) => r.name.trim().length > 0)
      );
      setEditingTeamRoster(null);
      onRefreshAll();
      addToast({ type: 'system', title: 'تحديث قائمة النادي', message: 'تم حفظ القائمة في قاعدة البيانات.', badge: 'الأندية' });
    } catch (e: any) {
      addToast({ type: 'disciplinary', title: 'خطأ', message: e?.message || 'تعذر الحفظ.', badge: 'خطأ' });
    } finally {
      setSavingRoster(false);
    }
  };

  const handleSendAiPrompt = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!aiPrompt.trim() || aiGenerating) return;
    const userText = aiPrompt.trim();
    setAiPrompt('');
    const historyPayload = aiChatMessages.slice(-6).map((m) => ({
      role: (m.sender === 'admin' ? 'user' : 'model') as 'user' | 'model',
      text: m.text,
    }));
    setAiChatMessages((prev) => [
      ...prev,
      { sender: 'admin', text: userText, time: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) },
    ]);
    setAiGenerating(true);
    try {
      const res = await api.queryAdminAssistant(
        userText,
        `المسؤول: ${currentAdmin.name} (${currentAdmin.role})${scopedDivisionName ? ` | الاتحاد: ${scopedDivisionName}` : ''}`,
        historyPayload
      );
      setAiChatMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: res.answer,
          routedSubsystem: res.routedSubsystem,
          proposedAction: res.proposedAction,
          time: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } catch (err: any) {
      setAiChatMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: err?.message || 'حدث خطأ أثناء معالجة الطلب عبر محرك الذكاء الاصطناعي.',
          time: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setAiGenerating(false);
    }
  };

  const handleExecuteProposedAiAction = async (action: { type: string; payload?: any }) => {
    if (action.type === 'publish_news') {
      setNewsTitle(action.payload?.title || 'بيان رسمي صادر عن الأمانة العامة IOEF');
      setNewsContent(action.payload?.content || '');
      setNewsCategory('announcement');
      setNewsIsImportant(true);
      setActiveTab('news_cms');
      addToast({ type: 'system', title: 'نقل المسودة للمراجعة', message: 'يمكنك مراجعة النص واعتماد النشر من قسم الأخبار.', badge: 'المركز الإعلامي' });
    } else if (action.type === 'run_duplicate_scan') {
      setActiveTab('registrations');
      await handleRunDuplicateScanner();
    }
  };

  const handleCreateFixture = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schedTournamentId || !schedHomeTeamId || !schedAwayTeamId) return;
    setCreatingFixture(true);
    try {
      await api.createFixture({
        tournamentId: schedTournamentId,
        divisionId: scopeDivisionId || tournaments.find((t) => t.id === schedTournamentId)?.divisionId,
        roundName: schedRoundName,
        homeTeamId: schedHomeTeamId,
        awayTeamId: schedAwayTeamId,
        matchDate: schedDate,
        matchTime: schedTime,
        assignedReferee: schedReferee || currentAdmin.name,
      });
      onRefreshAll();
      addToast({
        type: 'match_result',
        title: 'تمت جدولة المباراة بنجاح',
        message: `تمت إضافة المواجهة وتعيين الحكم (${schedReferee || currentAdmin.name}).`,
        badge: 'لجنة المسابقات',
      });
    } catch (err: any) {
      addToast({ type: 'disciplinary', title: 'تعذر الجدولة', message: err?.message || 'حدث خطأ.', badge: 'خطأ' });
    } finally {
      setCreatingFixture(false);
    }
  };

  const handleResultScreenshotUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 8 * 1024 * 1024) {
      addToast({ type: 'disciplinary', title: 'ملف غير صالح', message: 'يرجى اختيار صورة JPG/PNG/WEBP بحجم أقل من 8MB.', badge: 'تنبيه' });
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setResultScreenshot(reader.result as string);
      setOcrAuditResult(undefined);
    };
    reader.readAsDataURL(file);
  };

  const handleRunResultOcr = async () => {
    if (!selectedFixtureId || !resultScreenshot) {
      addToast({ type: 'disciplinary', title: 'تنبيه', message: 'اختر المباراة وارفع لقطة شاشة النتيجة أولاً.', badge: 'مكتب التحكيم' });
      return;
    }
    setVerifyingResultOcr(true);
    try {
      const targetMatch = fixtures.find((f) => f.id === selectedFixtureId);
      const home = teams.find((t) => t.id === targetMatch?.homeTeamId)?.name;
      const away = teams.find((t) => t.id === targetMatch?.awayTeamId)?.name;
      const res = await api.verifyMatchResult({
        fixtureId: selectedFixtureId,
        homeTeamName: home,
        awayTeamName: away,
        homeScore: homeScoreInput,
        awayScore: awayScoreInput,
        screenshotBase64: resultScreenshot,
      });
      if (res.success && res.verification) {
        const v = res.verification;
        setHomeScoreInput(Number(v.extractedHomeScore ?? homeScoreInput));
        setAwayScoreInput(Number(v.extractedAwayScore ?? awayScoreInput));
        setOcrAuditResult({
          extractedHomeScore: Number(v.extractedHomeScore ?? 0),
          extractedAwayScore: Number(v.extractedAwayScore ?? 0),
          teamsMatched: v.teamsMatched !== false,
          confidence: Number(v.confidence ?? 0.8),
          remarks: v.auditRemarks || '',
        });
        addToast({
          type: 'system',
          title: 'اكتمل التدقيق البصري للنتيجة (OCR)',
          message: `النتيجة المقروءة: ${v.extractedHomeScore} - ${v.extractedAwayScore}. راجعها ثم انقر اعتماد.`,
          badge: 'التحكيم الذكي',
        });
      }
    } catch (e: any) {
      addToast({ type: 'disciplinary', title: 'فشل فحص الصورة', message: e?.message || 'حدث خطأ.', badge: 'خطأ' });
    } finally {
      setVerifyingResultOcr(false);
    }
  };

  const handleRecordMatchScore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFixtureId) return;
    setRecordingScore(true);
    try {
      const events = scorerInput
        ? [{ minute: minuteInput, type: 'goal' as const, team: 'home' as const, player: scorerInput }]
        : undefined;
      await api.recordMatchResult({
        fixtureId: selectedFixtureId,
        homeScore: homeScoreInput,
        awayScore: awayScoreInput,
        events,
        resultScreenshotUrl: resultScreenshot || undefined,
        aiResultAudit: ocrAuditResult,
      });
      addToast({
        type: 'match_result',
        title: 'تم اعتماد النتيجة الرسمية',
        message: 'تم تثبيت النتيجة واحتساب النقاط وتحديث جدول الترتيب تلقائياً.',
        badge: 'اعتماد رسمي',
        actionLabel: 'جدول الترتيب',
        actionTab: 'standings',
      });
      setSelectedFixtureId('');
      setScorerInput('');
      setResultScreenshot('');
      setOcrAuditResult(undefined);
      onRefreshAll();
      void fetchProtectedAdminData();
    } catch (err: any) {
      addToast({ type: 'disciplinary', title: 'تعذر حفظ النتيجة', message: err?.message || 'حدث خطأ.', badge: 'خطأ' });
    } finally {
      setRecordingScore(false);
    }
  };

  const handleSendMatchReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reminderPhone.trim() || !reminderMsg.trim()) return;
    setSendingReminder(true);
    try {
      const res = await api.sendMatchReminder(reminderPhone.trim(), reminderMsg.trim());
      addToast({
        type: 'system',
        title: res.deliveredVia === 'whatsapp_webhook' ? 'تم إرسال رسالة واتساب' : 'تم حفظ التذكير داخلياً',
        message: res.detail,
        badge: 'التنبيهات',
      });
      setReminderMsg('');
    } catch (e: any) {
      addToast({ type: 'disciplinary', title: 'فشل الإرسال', message: e?.message || 'حدث خطأ.', badge: 'خطأ' });
    } finally {
      setSendingReminder(false);
    }
  };

  const handleSaveTournament = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTournamentId) return;
    setSavingTour(true);
    try {
      await api.updateTournament(editingTournamentId, {
        nameAr: tourNameAr,
        season: tourSeason,
        status: tourStatus,
        trophyName: tourTrophy,
        rulesSummary: tourRulesSummary,
        scoringRules: {
          winPoints: Number(tourWinPts),
          drawPoints: Number(tourDrawPts),
          lossPoints: Number(tourLossPts),
        },
      });
      onRefreshAll();
      addToast({ type: 'system', title: 'تحديث بيانات البطولة', message: 'تم حفظ إعدادات البطولة ونظام النقاط.', badge: 'المسابقات' });
    } catch (e: any) {
      addToast({ type: 'disciplinary', title: 'خطأ', message: e?.message || 'تعذر الحفظ.', badge: 'خطأ' });
    } finally {
      setSavingTour(false);
    }
  };

  const handleSaveRegulations = async () => {
    setSavingRules(true);
    try {
      await api.updateRules(rulesDraft);
      onRefreshAll();
      addToast({ type: 'system', title: 'تحديث الدستور واللوائح', message: 'تم حفظ التعديلات ونشرها في صفحة اللوائح.', badge: 'اللائحة' });
    } catch (e: any) {
      addToast({ type: 'disciplinary', title: 'خطأ', message: e?.message || 'تعذر تحديث اللوائح.', badge: 'خطأ' });
    } finally {
      setSavingRules(false);
    }
  };

  const handleSaveSettingsAndAI = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      await api.updateSettings({
        firstDivisionMinRating: Number(firstMinRating),
        secondDivisionMinRating: Number(secondMinRating),
        allowRegistration: allowRegToggle,
        whatsappApiEnabled,
        whatsappWebhookUrl,
        socialChannels: {
          whatsappChannelName: waChannelName,
          whatsappChannelUrl: waChannelUrl,
          tiktokHandle,
          tiktokUrl,
          facebookPageName: fbPageName,
          facebookUrl: fbUrl,
        },
      });
      await api.updateAiConfig({
        activeModel: activeAiModel,
        enableSquadVision,
        enableResultVision,
        enableCentralAssistant,
      });
      onRefreshAll();
      addToast({
        type: 'system',
        title: 'تم تحديث إعدادات المنصة والذكاء الاصطناعي',
        message: `النموذج النشط حالياً: ${activeAiModel}`,
        badge: 'المكتب التنفيذي',
      });
    } catch (err: any) {
      addToast({ type: 'disciplinary', title: 'خطأ', message: err?.message || 'تعذر حفظ الإعدادات.', badge: 'خطأ' });
    } finally {
      setSavingSettings(false);
    }
  };

  const handleRunDuplicateScanner = async () => {
    setScanningDuplicates(true);
    try {
      const res = await api.detectDuplicates();
      if (res.success && res.data) setDuplicateScanResult(res.data);
    } catch (err: any) {
      addToast({ type: 'disciplinary', title: 'خطأ', message: err?.message || 'فشل الفحص.', badge: 'خطأ' });
    } finally {
      setScanningDuplicates(false);
    }
  };

  const handleGenerateMatchReport = async (f: MatchFixture) => {
    const home = teams.find((t) => t.id === f.homeTeamId)?.name || 'المستضيف';
    const away = teams.find((t) => t.id === f.awayTeamId)?.name || 'الضيف';
    const scorersSummary = f.events?.map((e) => `${e.player} (${e.minute}')`).join(', ') || '';
    setGeneratingReportForId(f.id);
    try {
      const res = await api.generatePressReport(home, away, f.homeScore ?? 0, f.awayScore ?? 0, f.roundName, scorersSummary);
      if (res.success && res.report) {
        setNewsTitle(`تقرير رسمي: ${home} ضد ${away} (${f.homeScore} - ${f.awayScore})`);
        setNewsContent(res.report);
        setNewsDivisionId(f.divisionId || '');
        setNewsCategory('tournament');
        setActiveTab('news_cms');
        addToast({ type: 'breaking_news', title: 'تم توليد التقرير الصحفي', message: 'نُقل إلى محرر الأخبار للمراجعة.', badge: 'المركز الإعلامي' });
      }
    } finally {
      setGeneratingReportForId(null);
    }
  };

  const handleCreateBackup = async () => {
    setCreatingBackup(true);
    try {
      const res = await api.createBackup();
      if (res.success) {
        addToast({ type: 'system', title: 'نسخة احتياطية جديدة', message: res.filename, badge: 'أمان النظام' });
        void fetchProtectedAdminData();
      }
    } finally {
      setCreatingBackup(false);
    }
  };

  const handleConfirmRestoreBackup = async () => {
    if (!confirmRestoreFilename) return;
    setRestoringBackup(true);
    try {
      const res = await api.restoreBackup(confirmRestoreFilename);
      if (res.success) {
        setConfirmRestoreFilename(null);
        addToast({ type: 'system', title: 'تمت الاستعادة بنجاح', message: 'تم استرجاع جميع السجلات واللوائح.', badge: 'النظام' });
        onRefreshAll();
        void fetchProtectedAdminData();
      }
    } finally {
      setRestoringBackup(false);
    }
  };

  const effectiveRole: AdminUser['role'] = jwtRole || currentAdmin.role;
  const isPresident = effectiveRole === 'president';
  const isOrganizer = effectiveRole === 'organizer';
  const isDirectorOrPresident = effectiveRole === 'president' || effectiveRole === 'director';

  const availableTabs = isOrganizer
    ? [
        {
          id: 'scores',
          label: 'الجدولة والمباريات والنتائج',
          icon: Calendar,
          show: true,
        },
      ]
    : [
        { id: 'overview', label: 'الإحصائيات العامة', icon: Trophy, show: true },
        { id: 'ai_assistant', label: 'الذكاء الاصطناعي المركزي', icon: Sparkles, show: true },
        { id: 'ai_subsystems', label: 'الأنظمة الـ 11 للذكاء الاصطناعي', icon: Cpu, show: true },
        {
          id: 'registrations',
          label: `مراجعة التسجيلات (${registrations.filter((r) => r.status === 'pending').length})`,
          icon: Users,
          show: isPresident || perms.manageRegistrations,
        },
        {
          id: 'players',
          label: 'اللاعبون وقوائم الأندية',
          icon: Shield,
          show: isPresident || perms.manageSquadLocks || perms.manageRegistrations,
        },
        {
          id: 'memberships',
          label: 'العضويات والاشتراكات QR',
          icon: CreditCard,
          show: isDirectorOrPresident,
        },
        {
          id: 'scores',
          label: 'الجدولة والمباريات والنتائج',
          icon: Calendar,
          show: isPresident || perms.manageMatchesAndResults,
        },
        {
          id: 'tournaments_rules',
          label: 'البطولات واللوائح التنظيمية',
          icon: BookOpen,
          show: isPresident || perms.manageTournamentsAndRules,
        },
        {
          id: 'disciplinary',
          label: 'العقوبات والانضباط',
          icon: AlertTriangle,
          show: isPresident || perms.manageDiscipline,
        },
        {
          id: 'support_tickets',
          label: `الدعم والطعون (${supportTickets.filter((t) => t.status !== 'resolved').length})`,
          icon: LifeBuoy,
          show: isPresident || perms.manageRegistrations,
        },
        {
          id: 'news_cms',
          label: 'الأخبار والإعلانات',
          icon: FileText,
          show: isPresident || perms.manageNewsAndStore,
        },
        {
          id: 'store_orders',
          label: `طلبات المتجر (${orders.length})`,
          icon: ShoppingBag,
          show: isPresident || perms.manageNewsAndStore,
        },
        {
          id: 'admins_rbac',
          label: 'إدارة المنظمين والمديرين (RBAC)',
          icon: UserCog,
          show: isPresident,
        },
        {
          id: 'system_resilience',
          label: 'الأداء والنسخ الاحتياطية',
          icon: Activity,
          show: isPresident || perms.manageBackups,
        },
        {
          id: 'settings',
          label: 'الإعدادات ونموذج AI',
          icon: Settings,
          show: isPresident,
        },
        {
          id: 'audit_logs',
          label: 'سجل النشاطات',
          icon: History,
          show: isDirectorOrPresident,
        },
      ].filter((t) => t.show);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Admin Command Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-extrabold text-white">لوحة الإدارة المركزية (IOEF Control Portal)</h1>
              <span className="text-[10px] px-2.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">
                {ROLE_AR_LABELS[currentAdmin.role]} ({currentAdmin.role.toUpperCase()})
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 font-bold border border-amber-500/20">
                JWT HS256
              </span>
              {scopedDivisionName ? (
                <span className="text-[10px] px-2 py-0.5 rounded bg-sky-500/10 text-sky-300 font-bold border border-sky-500/20">
                  نطاق مقيد: {scopedDivisionName}
                </span>
              ) : (
                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-bold border border-slate-700">
                  النطاق: جميع الاتحادات الستة
                </span>
              )}
            </div>
            <div className="text-xs text-slate-400 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
              <span>المسؤول الموثق: <strong className="text-white">{currentAdmin.name}</strong></span>
              <span>· النموذج النشط: <span className="font-mono text-amber-400">{settings.aiConfig?.activeModel || 'gemini-4-hydrogen'}</span></span>
              {jwtClaims?.exp && (
                <span>
                  · انتهاء الجلسة: <span className="font-mono text-slate-300">{new Date(jwtClaims.exp * 1000).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="px-4 py-2 rounded-xl bg-slate-950 hover:bg-rose-950/50 border border-slate-800 hover:border-rose-500/40 text-xs font-bold text-slate-300 hover:text-rose-300 flex items-center gap-2 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>تسجيل الخروج وإلغاء JWT</span>
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-800 text-xs font-semibold">
        {availableTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl border whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-slate-800 border-amber-500 text-amber-400 shadow-md font-bold'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
              <div className="text-xs text-slate-400">الأندية المعتمدة في النطاق</div>
              <div className="text-3xl font-mono font-extrabold text-amber-400">{scopedTeams.length}</div>
              <div className="text-[11px] text-slate-500">محجوزة حالياً: {scopedTeams.filter((t) => t.registrationStatus === 'approved').length}</div>
            </div>
            <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
              <div className="text-xs text-slate-400">طلبات التسجيل المعلقة</div>
              <div className="text-3xl font-mono font-extrabold text-rose-400">
                {registrations.filter((r) => r.status === 'pending').length}
              </div>
              <div className="text-[11px] text-slate-500">تتطلب المراجعة البشرية</div>
            </div>
            <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
              <div className="text-xs text-slate-400">المباريات المسجلة</div>
              <div className="text-3xl font-mono font-extrabold text-emerald-400">{scopedFixtures.length}</div>
              <div className="text-[11px] text-slate-500">
                المكتملة: {scopedFixtures.filter((f) => f.status === 'finished').length}
              </div>
            </div>
            <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
              <div className="text-xs text-slate-400">اللاعبون المعتمدون</div>
              <div className="text-3xl font-mono font-extrabold text-sky-400">{scopedPlayers.length}</div>
              <div className="text-[11px] text-slate-500">موسم 2026/2027</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-white text-sm">أحدث طلبات التسجيل</h3>
                {perms.manageRegistrations && (
                  <button onClick={() => setActiveTab('registrations')} className="text-xs text-amber-400 hover:text-amber-300">
                    فتح قائمة المراجعة
                  </button>
                )}
              </div>
              {registrations.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">لا توجد طلبات تسجيل مسجلة حتى الآن.</div>
              ) : (
                <div className="space-y-2">
                  {registrations.slice(0, 4).map((r) => (
                    <div key={r.id} className="p-3 bg-slate-950 border border-slate-800 rounded-lg flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-white">{r.fullName} ({r.teamName})</div>
                        <div className="text-slate-400 text-[11px]">الدرجة {r.requestedTier}</div>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-amber-400">
                        {r.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-white text-sm">أحدث النشاطات الإدارية</h3>
                <button onClick={() => setActiveTab('audit_logs')} className="text-xs text-amber-400 hover:text-amber-300">
                  سجل العمليات الكامل
                </button>
              </div>
              {auditLogs.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">لا توجد سجلات بعد.</div>
              ) : (
                <div className="space-y-2">
                  {auditLogs.slice(0, 4).map((log) => (
                    <div key={log.id} className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs space-y-1">
                      <div className="flex justify-between text-slate-400 text-[11px] font-mono">
                        <span>{log.adminName}</span>
                        <span>{new Date(log.timestamp).toLocaleTimeString('ar-SA')}</span>
                      </div>
                      <div className="font-bold text-white">{log.action}: {log.target}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB: CENTRAL AI ASSISTANT */}
      {activeTab === 'ai_assistant' && (
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">المساعد الذكي المركزي (IOEF Central AI)</h3>
                <p className="text-xs text-slate-400 font-mono">
                  Model: {settings.aiConfig?.activeModel || 'gemini-4-hydrogen'} · Server-Side
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {[
              'ما وضع التسجيلات والأندية المتاحة حالياً؟',
              'صياغة إعلان رسمي بفتح باب القيد لموسم 2026/2027',
              'قم بفحص التكرارات في طلبات التسجيل',
            ].map((q, i) => (
              <button
                key={i}
                onClick={() => setAiPrompt(q)}
                className="px-3 py-1 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-lg text-xs"
              >
                {q}
              </button>
            ))}
          </div>

          <div className="h-96 bg-slate-950 border border-slate-800 rounded-xl p-4 overflow-y-auto space-y-4 text-xs">
            {aiChatMessages.map((msg, i) => (
              <div key={i} className={`flex flex-col ${msg.sender === 'admin' ? 'items-start' : 'items-end'}`}>
                <div className="text-[10px] text-slate-500 mb-1 font-mono">
                  {msg.sender === 'admin' ? currentAdmin.name : `IOEF AI (${msg.routedSubsystem || 'central'})`} · {msg.time}
                </div>
                <div
                  className={`p-3.5 rounded-xl max-w-2xl leading-relaxed whitespace-pre-wrap space-y-3 ${
                    msg.sender === 'admin'
                      ? 'bg-amber-500/15 border border-amber-500/30 text-amber-200'
                      : 'bg-slate-900 border border-slate-800 text-slate-200'
                  }`}
                >
                  <div>{msg.text}</div>
                  {msg.proposedAction && (
                    <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-3">
                      <span className="text-[11px] text-amber-300">{msg.proposedAction.summary}</span>
                      <button
                        type="button"
                        onClick={() => handleExecuteProposedAiAction(msg.proposedAction!)}
                        className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-[11px] shrink-0"
                      >
                        تأكيد وتنفيذ الإجراء المقترح
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {aiGenerating && (
              <div className="flex items-center gap-2 text-xs text-amber-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>جاري المعالجة عبر الخادم...</span>
              </div>
            )}
          </div>

          <form onSubmit={handleSendAiPrompt} className="flex gap-2">
            <input
              type="text"
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="اكتب استفسارك الإداري هنا..."
              className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
            />
            <button
              type="submit"
              disabled={aiGenerating || !aiPrompt.trim()}
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2 disabled:opacity-40"
            >
              <span>إرسال</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}

      {/* TAB: AI SUBSYSTEMS */}
      {activeTab === 'ai_subsystems' && (
        <div className="space-y-6">
          <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-black text-white">برج مراقبة أنظمة الذكاء الاصطناعي الـ 11</h3>
              <p className="text-xs text-slate-400 mt-1 font-mono">
                Active Model: {settings.aiConfig?.activeModel || 'gemini-4-hydrogen'}
              </p>
            </div>
            <button
              onClick={() => void fetchProtectedAdminData()}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 border border-slate-700"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>تحديث</span>
            </button>
          </div>
          {queueStats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
                <div className="text-slate-400">المهام النشطة</div>
                <div className="text-lg font-black text-amber-400">{queueStats.activeCount}</div>
              </div>
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
                <div className="text-slate-400">الانتظار</div>
                <div className="text-lg font-black text-sky-400">{queueStats.queuedCount}</div>
              </div>
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
                <div className="text-slate-400">المنجزة</div>
                <div className="text-lg font-black text-emerald-400">{queueStats.totalExecuted}</div>
              </div>
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
                <div className="text-slate-400">الحد المتزامن</div>
                <div className="text-lg font-black text-white">{queueStats.maxConcurrent}</div>
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {aiSubsystems.map((sub, idx) => (
              <div key={sub.id} className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-2">
                <div className="flex justify-between items-center text-[10px] font-mono">
                  <span className="text-slate-400">0{idx + 1} · {sub.nameEn}</span>
                  <span className="text-emerald-400 font-bold">{sub.status}</span>
                </div>
                <h4 className="text-sm font-black text-white">{sub.nameAr}</h4>
                <p className="text-xs text-slate-400">{sub.descriptionAr}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB: REGISTRATIONS REVIEW */}
      {activeTab === 'registrations' && perms.manageRegistrations && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-white">مراجعة طلبات القيد والتحقق</h3>
              <p className="text-xs text-slate-400">تدقيق إثباتات المتابعة، فحص التشكيلة، واعتماد أو رفض القيد.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleRunDuplicateScanner}
                disabled={scanningDuplicates}
                className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-amber-500 text-slate-950 hover:bg-amber-400 flex items-center gap-1.5"
              >
                {scanningDuplicates ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                <span>فحص التكرارات</span>
              </button>
              <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg">
                {['all', 'pending', 'needs_review', 'approved', 'rejected'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setRegFilter(st)}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md ${
                      regFilter === st ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {st === 'all' ? 'الكل' : st === 'pending' ? 'معلق' : st === 'needs_review' ? 'تدقيق' : st === 'approved' ? 'معتمد' : 'مرفوض'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {duplicateScanResult && (
            <div className="p-4 rounded-xl bg-slate-900 border border-amber-500/40 text-xs space-y-2">
              <div className="font-bold text-amber-400">نتائج فحص التكرار: {duplicateScanResult.flaggedCount === 0 ? 'سليم' : `${duplicateScanResult.flaggedCount} اشتباه`}</div>
              <p className="text-slate-300">{duplicateScanResult.report}</p>
            </div>
          )}

          {loadingRegs ? (
            <div className="py-12 text-center text-xs text-slate-400">جاري تحميل الطلبات...</div>
          ) : registrations.length === 0 ? (
            <div className="py-16 text-center text-slate-500 text-xs bg-slate-900/40 rounded-xl border border-slate-800">
              لا توجد طلبات تسجيل في هذه القائمة.
            </div>
          ) : (
            <div className="space-y-4">
              {registrations.map((reg) => (
                <div key={reg.id} className="p-5 bg-slate-900 border border-slate-800 rounded-xl space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3 text-xs">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="font-extrabold text-white text-sm">{reg.fullName}</span>
                      <span className="text-amber-400 font-mono">({reg.gamerTag})</span>
                      <span className="text-slate-400">النادي: <strong className="text-white">{reg.teamName}</strong></span>
                      <span className="text-slate-400 font-mono" dir="ltr">{reg.whatsapp}</span>
                    </div>
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded bg-slate-800 text-amber-400">{reg.status}</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                    <div className="md:col-span-4 space-y-2">
                      <img src={reg.squadImageUrl} alt="التشكيلة" className="w-full h-40 object-cover rounded-lg border border-slate-800" />
                      {reg.socialVerification && (
                        <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] flex flex-wrap gap-2">
                          <span className={reg.socialVerification.whatsappFollowed ? 'text-emerald-400' : 'text-rose-400'}>
                            واتساب: {reg.socialVerification.whatsappFollowed ? 'مؤكد' : 'لا'}
                          </span>
                          <span className={reg.socialVerification.tiktokFollowed ? 'text-emerald-400' : 'text-rose-400'}>
                            تيك توك: {reg.socialVerification.tiktokFollowed ? 'مؤكد' : 'لا'}
                          </span>
                          <span className={reg.socialVerification.facebookFollowed ? 'text-emerald-400' : 'text-rose-400'}>
                            فيسبوك: {reg.socialVerification.facebookFollowed ? 'مؤكد' : 'لا'}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="md:col-span-8 space-y-3 text-xs">
                      {reg.aiAnalysis && (
                        <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-1.5">
                          <div className="flex justify-between font-bold text-amber-400">
                            <span>تقرير الفحص الذكي</span>
                            <span className="font-mono">القوة: {reg.aiAnalysis.squadRating} | الدرجة {reg.requestedTier}</span>
                          </div>
                          <p className="text-slate-300 text-[11px]">{reg.aiAnalysis.reasoning}</p>
                        </div>
                      )}

                      {reg.extractedRoster && reg.extractedRoster.length > 0 && (
                        <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                          <div className="text-[11px] font-bold text-slate-400 mb-1.5">
                            القائمة المستخرجة ({reg.extractedRoster.length} لاعب):
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {reg.extractedRoster.map((rp) => (
                              <span key={rp.id} className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] font-mono text-slate-200">
                                {rp.position} · {rp.name} ({rp.rating})
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {(reg.status === 'pending' || reg.status === 'needs_review') && (
                        <div className="flex flex-wrap items-center gap-2 pt-2">
                          <button
                            onClick={() => handleReviewRegistration(reg.id, 'approved', 'مستوفي للشروط والمتطلبات الرسمية')}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg flex items-center gap-1.5"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>اعتماد القيد</span>
                          </button>
                          <button
                            onClick={() => handleReviewRegistration(reg.id, 'needs_review', 'محال لمزيد من التحقق')}
                            className="px-4 py-2 bg-amber-600/80 hover:bg-amber-600 text-white font-bold rounded-lg"
                          >
                            إحالة للتدقيق
                          </button>
                          <button
                            onClick={() => {
                              setRejectTarget(reg);
                              setRejectReason('');
                            }}
                            className="px-4 py-2 bg-rose-600/80 hover:bg-rose-600 text-white font-bold rounded-lg flex items-center gap-1.5"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>رفض الطلب</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB: PLAYERS & CLUB ROSTERS */}
      {activeTab === 'players' && (
        <div className="space-y-8">
          <div className="space-y-4">
            <h3 className="text-base font-bold text-white">إدارة اللاعبين وقفل التشكيلات ({scopedPlayers.length})</h3>
            {scopedPlayers.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500 bg-slate-900/40 rounded-xl border border-slate-800">
                لا يوجد لاعبون معتمدون حالياً.
              </div>
            ) : (
              <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-950 text-slate-400 font-mono text-[11px] border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">الكود</th>
                      <th className="py-3 px-4">اللاعب</th>
                      <th className="py-3 px-4">النادي</th>
                      <th className="py-3 px-4 text-center">الدرجة</th>
                      <th className="py-3 px-4 text-center">التقييم</th>
                      <th className="py-3 px-4 text-center">التعديل</th>
                      <th className="py-3 px-4 text-center">الإجراء</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {scopedPlayers.map((p) => {
                      const isLocked = p.squadEditLocked || p.squadEditCount >= 1;
                      return (
                        <tr key={p.id} className="hover:bg-slate-800/40">
                          <td className="py-3 px-4 font-mono text-emerald-400">{p.playerCode || p.id}</td>
                          <td className="py-3 px-4 font-bold text-white">{p.fullName} ({p.gamerTag})</td>
                          <td className="py-3 px-4 text-slate-300">{p.teamName}</td>
                          <td className="py-3 px-4 text-center font-mono">الدرجة {p.divisionTier}</td>
                          <td className="py-3 px-4 text-center font-mono font-bold text-amber-400">{p.squadRating}</td>
                          <td className="py-3 px-4 text-center font-mono">{p.squadEditCount}/1</td>
                          <td className="py-3 px-4 text-center">
                            {perms.manageSquadLocks && (
                              <button
                                onClick={() => handleToggleSquadLock(p.id, isLocked)}
                                className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 inline-flex items-center gap-1"
                              >
                                {isLocked ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                                <span>{isLocked ? 'فتح التعديل' : 'قفل'}</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Club Rosters Quick Editor */}
          <div className="space-y-4">
            <h3 className="text-base font-bold text-white">إدارة قوائم الأندية الرسمية ({scopedTeams.length})</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {scopedTeams.slice(0, 24).map((t) => (
                <div key={t.id} className="p-4 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-white">{t.name}</div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      {t.clubCode} · قائمة: {t.roster?.length || 0} لاعب
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setEditingTeamRoster(t);
                      setRosterDraft(t.roster ? [...t.roster] : []);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold"
                  >
                    تعديل القائمة
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB: MATCH SCHEDULER, RESULT OCR & REMINDERS */}
      {activeTab === 'scores' && perms.manageMatchesAndResults && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Schedule New Match */}
            <div className="lg:col-span-6 p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
              <h3 className="font-bold text-white text-sm border-b border-slate-800 pb-2">
                جدولة مباراة جديدة وتعيين الحكم / المنظم
              </h3>
              <form onSubmit={handleCreateFixture} className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-300 mb-1">البطولة:</label>
                  <select
                    value={schedTournamentId}
                    onChange={(e) => setSchedTournamentId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
                  >
                    {scopedTournaments.map((t) => (
                      <option key={t.id} value={t.id}>{t.nameAr}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 mb-1">النادي المستضيف:</label>
                    <select
                      value={schedHomeTeamId}
                      onChange={(e) => setSchedHomeTeamId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
                    >
                      <option value="">-- اختر المستضيف --</option>
                      {scopedTeams.map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-300 mb-1">النادي الضيف:</label>
                    <select
                      value={schedAwayTeamId}
                      onChange={(e) => setSchedAwayTeamId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
                    >
                      <option value="">-- اختر الضيف --</option>
                      {scopedTeams.map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-300 mb-1">الجولة:</label>
                    <input
                      type="text"
                      value={schedRoundName}
                      onChange={(e) => setSchedRoundName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 mb-1">التاريخ:</label>
                    <input
                      type="date"
                      value={schedDate}
                      onChange={(e) => setSchedDate(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 mb-1">الوقت:</label>
                    <input
                      type="time"
                      value={schedTime}
                      onChange={(e) => setSchedTime(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1">الحكم / المنظم المشرف:</label>
                  <input
                    type="text"
                    value={schedReferee}
                    onChange={(e) => setSchedReferee(e.target.value)}
                    placeholder={currentAdmin.name}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
                  />
                </div>

                <button
                  type="submit"
                  disabled={creatingFixture || !schedHomeTeamId || !schedAwayTeamId}
                  className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-lg disabled:opacity-50"
                >
                  {creatingFixture ? 'جاري الجدولة...' : 'جدولة المباراة ونشر الموعد'}
                </button>
              </form>
            </div>

            {/* Record Result + AI OCR */}
            <div className="lg:col-span-6 p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
              <h3 className="font-bold text-white text-sm border-b border-slate-800 pb-2">
                رصد النتيجة وتدقيق لقطة الشاشة عبر الذكاء الاصطناعي
              </h3>
              <form onSubmit={handleRecordMatchScore} className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-300 mb-1">المباراة:</label>
                  <select
                    value={selectedFixtureId}
                    onChange={(e) => setSelectedFixtureId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
                  >
                    <option value="">-- اختر المباراة --</option>
                    {scopedFixtures.map((f) => {
                      const home = teams.find((t) => t.id === f.homeTeamId)?.name || 'مستضيف';
                      const away = teams.find((t) => t.id === f.awayTeamId)?.name || 'ضيف';
                      return (
                        <option key={f.id} value={f.id}>
                          {f.roundName}: {home} ضد {away} ({f.matchDate})
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                  <label className="block text-slate-300 font-semibold">رفع لقطة شاشة النتيجة للتحقق الآلي (اختياري):</label>
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="cursor-pointer px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-white font-bold inline-flex items-center gap-1.5">
                      <Camera className="w-3.5 h-3.5 text-amber-400" />
                      <span>اختر لقطة النتيجة</span>
                      <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleResultScreenshotUpload} className="hidden" />
                    </label>
                    {resultScreenshot && (
                      <button
                        type="button"
                        onClick={handleRunResultOcr}
                        disabled={verifyingResultOcr}
                        className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-lg inline-flex items-center gap-1.5"
                      >
                        {verifyingResultOcr ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                        <span>تدقيق OCR عبر AI</span>
                      </button>
                    )}
                  </div>
                  {ocrAuditResult && (
                    <div className="text-[11px] text-emerald-300 bg-emerald-950/30 p-2 rounded border border-emerald-500/30">
                      {ocrAuditResult.remarks} (الثقة: {Math.round(ocrAuditResult.confidence * 100)}%)
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 mb-1">أهداف المستضيف:</label>
                    <input
                      type="number"
                      min="0"
                      value={homeScoreInput}
                      onChange={(e) => setHomeScoreInput(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white font-mono text-center font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 mb-1">أهداف الضيف:</label>
                    <input
                      type="number"
                      min="0"
                      value={awayScoreInput}
                      onChange={(e) => setAwayScoreInput(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white font-mono text-center font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="مسجل الهدف (اختياري)"
                    value={scorerInput}
                    onChange={(e) => setScorerInput(e.target.value)}
                    className="bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
                  />
                  <input
                    type="number"
                    placeholder="الدقيقة"
                    value={minuteInput}
                    onChange={(e) => setMinuteInput(Number(e.target.value))}
                    className="bg-slate-950 border border-slate-700 rounded-lg p-2 text-white font-mono"
                  />
                </div>

                <button
                  type="submit"
                  disabled={recordingScore || !selectedFixtureId}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg disabled:opacity-50"
                >
                  اعتماد النتيجة وتحديث جدول الترتيب
                </button>
              </form>
            </div>
          </div>

          {/* Reminder Dispatcher + Fixtures List */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-3 text-xs">
              <h4 className="font-bold text-white flex items-center gap-2">
                <Bell className="w-4 h-4 text-amber-400" />
                <span>إرسال تذكير بموعد المباراة (WhatsApp / داخلي)</span>
              </h4>
              <form onSubmit={handleSendMatchReminder} className="space-y-3">
                <input
                  type="tel"
                  dir="ltr"
                  value={reminderPhone}
                  onChange={(e) => setReminderPhone(e.target.value)}
                  placeholder="+966501234567"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white font-mono"
                />
                <textarea
                  rows={2}
                  value={reminderMsg}
                  onChange={(e) => setReminderMsg(e.target.value)}
                  placeholder="تذكير: موعد مباراتك الرسمية في الدوري اليوم الساعة 21:00..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white"
                />
                <button
                  type="submit"
                  disabled={sendingReminder}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold rounded-lg border border-slate-700"
                >
                  {sendingReminder ? 'جاري الإرسال...' : 'إرسال التذكير الآن'}
                </button>
              </form>
            </div>

            <div className="lg:col-span-7 p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
              <h4 className="font-bold text-white text-sm">المباريات المسجلة ({scopedFixtures.length})</h4>
              {scopedFixtures.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-500">لا توجد مباريات مجدولة بعد.</div>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {scopedFixtures.map((f) => {
                    const home = teams.find((t) => t.id === f.homeTeamId)?.name || 'مستضيف';
                    const away = teams.find((t) => t.id === f.awayTeamId)?.name || 'ضيف';
                    return (
                      <div key={f.id} className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between text-xs">
                        <div>
                          <div className="font-bold text-white">{home} ضد {away}</div>
                          <div className="text-[11px] text-slate-500">{f.roundName} · {f.matchDate} {f.matchTime} · الحكم: {f.assignedReferee}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          {f.status === 'finished' ? (
                            <>
                              <button
                                onClick={() => handleGenerateMatchReport(f)}
                                disabled={generatingReportForId === f.id}
                                className="px-2 py-1 bg-amber-500/10 text-amber-400 rounded text-[11px]"
                              >
                                تقرير AI
                              </button>
                              <span className="font-mono font-bold text-amber-400">{f.homeScore} : {f.awayScore}</span>
                            </>
                          ) : (
                            <span className="text-slate-400 font-mono">مجدولة</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB: TOURNAMENTS, SCORING & DYNAMIC REGULATIONS CMS */}
      {activeTab === 'tournaments_rules' && perms.manageTournamentsAndRules && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-5 p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
            <h3 className="font-bold text-white text-sm border-b border-slate-800 pb-2">تعديل البطولات ونظام النقاط</h3>
            <form onSubmit={handleSaveTournament} className="space-y-3 text-xs">
              <select
                value={editingTournamentId}
                onChange={(e) => setEditingTournamentId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
              >
                {scopedTournaments.map((t) => (
                  <option key={t.id} value={t.id}>{t.nameAr}</option>
                ))}
              </select>
              <input
                type="text"
                value={tourNameAr}
                onChange={(e) => setTourNameAr(e.target.value)}
                placeholder="اسم البطولة"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={tourSeason}
                  onChange={(e) => setTourSeason(e.target.value)}
                  placeholder="الموسم"
                  className="bg-slate-950 border border-slate-700 rounded-lg p-2 text-white font-mono"
                />
                <select
                  value={tourStatus}
                  onChange={(e) => setTourStatus(e.target.value as any)}
                  className="bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
                >
                  <option value="upcoming">قادمة</option>
                  <option value="ongoing">جارية</option>
                  <option value="completed">مكتملة</option>
                </select>
              </div>
              <input
                type="text"
                value={tourTrophy}
                onChange={(e) => setTourTrophy(e.target.value)}
                placeholder="اسم الكأس / الدرع"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
              />
              <textarea
                rows={2}
                value={tourRulesSummary}
                onChange={(e) => setTourRulesSummary(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
              />
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400">نقاط الفوز</label>
                  <input type="number" value={tourWinPts} onChange={(e) => setTourWinPts(Number(e.target.value))} className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-white font-mono" />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400">نقاط التعادل</label>
                  <input type="number" value={tourDrawPts} onChange={(e) => setTourDrawPts(Number(e.target.value))} className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-white font-mono" />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400">نقاط الخسارة</label>
                  <input type="number" value={tourLossPts} onChange={(e) => setTourLossPts(Number(e.target.value))} className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-white font-mono" />
                </div>
              </div>
              <button type="submit" disabled={savingTour} className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-lg">
                {savingTour ? 'جاري الحفظ...' : 'حفظ تعديلات البطولة'}
              </button>
            </form>
          </div>

          <div className="lg:col-span-7 p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="font-bold text-white text-sm">محرر اللوائح التنظيمية والدستور ({rulesDraft.length} أبواب)</h3>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setRulesDraft((prev) => [
                      ...prev,
                      {
                        id: `reg_${Date.now()}`,
                        chapterNumber: `الباب ${prev.length + 1}`,
                        titleAr: 'باب تنظيمي جديد',
                        subtitleAr: 'مادة تنظيمية',
                        category: 'technical',
                        content: '',
                        updatedAt: new Date().toISOString().split('T')[0],
                      },
                    ])
                  }
                  className="px-3 py-1.5 bg-slate-800 text-amber-400 rounded-lg text-xs font-bold flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>إضافة باب</span>
                </button>
                <button
                  type="button"
                  onClick={handleSaveRegulations}
                  disabled={savingRules}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold"
                >
                  {savingRules ? 'جاري النشر...' : 'حفظ ونشر اللوائح'}
                </button>
              </div>
            </div>

            <div className="space-y-3 max-h-[540px] overflow-y-auto pr-1 text-xs">
              {rulesDraft.map((art, idx) => (
                <div key={art.id} className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={art.chapterNumber}
                      onChange={(e) =>
                        setRulesDraft((prev) => prev.map((a, i) => (i === idx ? { ...a, chapterNumber: e.target.value } : a)))
                      }
                      className="w-24 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-amber-400 font-bold"
                    />
                    <input
                      type="text"
                      value={art.titleAr}
                      onChange={(e) =>
                        setRulesDraft((prev) => prev.map((a, i) => (i === idx ? { ...a, titleAr: e.target.value } : a)))
                      }
                      className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white font-bold"
                    />
                    <button
                      type="button"
                      onClick={() => setRulesDraft((prev) => prev.filter((_, i) => i !== idx))}
                      className="p-1.5 text-rose-400 hover:text-rose-300"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <textarea
                    rows={3}
                    value={art.content}
                    onChange={(e) =>
                      setRulesDraft((prev) => prev.map((a, i) => (i === idx ? { ...a, content: e.target.value } : a)))
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-slate-300 leading-relaxed"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB: DISCIPLINARY */}
      {activeTab === 'disciplinary' && perms.manageDiscipline && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-5 p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
            <h3 className="font-bold text-white text-sm border-b border-slate-800 pb-2">إصدار عقوبة انضباطية رسمية</h3>
            {scopedPlayers.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">لا يوجد لاعبون معتمدون لإصدار عقوبات بحقهم.</div>
            ) : (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setSubmittingDisc(true);
                  try {
                    const team = teams.find((t) => t.playerId === discPlayerId);
                    await api.addDisciplinary({
                      playerId: discPlayerId,
                      teamId: team?.id,
                      divisionId: team?.divisionId || scopeDivisionId,
                      violationType: discViolation,
                      severity: discSeverity,
                      pointsDeducted: Number(discPoints),
                      description: discDesc,
                    });
                    setDiscDesc('');
                    onRefreshAll();
                    addToast({ type: 'disciplinary', title: 'تم إصدار العقوبة', message: 'تم التطبيق وتحديث الترتيب.', badge: 'الانضباط' });
                  } finally {
                    setSubmittingDisc(false);
                  }
                }}
                className="space-y-3 text-xs"
              >
                <select value={discPlayerId} onChange={(e) => setDiscPlayerId(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white">
                  {scopedPlayers.map((p) => (
                    <option key={p.id} value={p.id}>{p.fullName} ({p.teamName})</option>
                  ))}
                </select>
                <select value={discViolation} onChange={(e) => setDiscViolation(e.target.value as any)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white">
                  <option value="fair_play">مخالفة الروح الرياضية</option>
                  <option value="match_absence">الغياب عن المباراة</option>
                  <option value="illegal_squad">تشكيلة غير مطابقة</option>
                  <option value="connection_tampering">التلاعب بالاتصال</option>
                </select>
                <div className="grid grid-cols-2 gap-2">
                  <select value={discSeverity} onChange={(e) => setDiscSeverity(e.target.value as any)} className="bg-slate-950 border border-slate-700 rounded-lg p-2 text-white">
                    <option value="warning">إنذار</option>
                    <option value="points_deduction">خصم نقاط</option>
                    <option value="suspension">إيقاف</option>
                    <option value="permanent_ban">حظر دائم</option>
                  </select>
                  <input type="number" min="0" max="15" value={discPoints} onChange={(e) => setDiscPoints(Number(e.target.value))} className="bg-slate-950 border border-slate-700 rounded-lg p-2 text-white font-mono" />
                </div>
                <textarea rows={3} value={discDesc} onChange={(e) => setDiscDesc(e.target.value)} placeholder="حيثيات القرار..." className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white" />
                <button type="submit" disabled={submittingDisc || !discDesc.trim()} className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg disabled:opacity-40">
                  إصدار العقوبة وتطبيقها
                </button>
              </form>
            )}
          </div>

          <div className="lg:col-span-7 space-y-3">
            <h4 className="font-bold text-white text-xs">سجل القرارات الانضباطية ({disciplinary.length})</h4>
            {disciplinary.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500 bg-slate-900/40 rounded-xl border border-slate-800">لا توجد عقوبات مسجلة.</div>
            ) : (
              disciplinary.map((d) => (
                <div key={d.id} className="p-4 bg-slate-900 border border-slate-800 rounded-xl text-xs space-y-1">
                  <div className="flex justify-between font-bold text-white">
                    <span>{players.find((p) => p.id === d.playerId)?.fullName || d.playerId}</span>
                    <span className="text-rose-400 font-mono">{d.severity}</span>
                  </div>
                  <p className="text-slate-300">{d.description}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB: SUPPORT TICKETS */}
      {activeTab === 'support_tickets' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 bg-slate-950 text-xs font-bold text-white">التذاكر ({supportTickets.length})</div>
            {supportTickets.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">لا توجد تذاكر مسجلة.</div>
            ) : (
              <div className="divide-y divide-slate-800 max-h-96 overflow-y-auto">
                {supportTickets.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => {
                      setSelectedTicket(t);
                      setTicketResolutionNotes(t.resolutionNotes || '');
                    }}
                    className={`p-4 cursor-pointer text-xs ${selectedTicket?.id === t.id ? 'bg-slate-800' : 'hover:bg-slate-800/40'}`}
                  >
                    <div className="flex justify-between font-mono text-[10px] text-slate-400">
                      <span>{t.id}</span>
                      <span className="text-amber-400">{t.status}</span>
                    </div>
                    <div className="font-bold text-white mt-1">{t.senderName}</div>
                    <p className="text-slate-300 line-clamp-2 mt-1">{t.ticketDetails}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 text-xs">
            <h4 className="font-bold text-white border-b border-slate-800 pb-2">معالجة التذكرة</h4>
            {selectedTicket ? (
              <div className="space-y-3">
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                  <div className="font-bold text-white">{selectedTicket.senderName}</div>
                  <div className="font-mono text-slate-400">{selectedTicket.senderContact}</div>
                  <p className="text-slate-300 pt-2">{selectedTicket.ticketDetails}</p>
                </div>
                <textarea
                  rows={3}
                  value={ticketResolutionNotes}
                  onChange={(e) => setTicketResolutionNotes(e.target.value)}
                  placeholder="نص القرار الرسمي..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                />
                <button
                  disabled={resolvingTicket}
                  onClick={async () => {
                    setResolvingTicket(true);
                    try {
                      await api.resolveSupportTicket(selectedTicket.id, 'resolved', ticketResolutionNotes || 'تمت المعالجة');
                      setSelectedTicket(null);
                      void fetchProtectedAdminData();
                      addToast({ type: 'system', title: 'تم إغلاق التذكرة', message: 'تم حفظ القرار.', badge: 'الدعم' });
                    } finally {
                      setResolvingTicket(false);
                    }
                  }}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl"
                >
                  اعتماد الحل وإغلاق التذكرة
                </button>
              </div>
            ) : (
              <div className="py-12 text-center text-slate-500">اختر تذكرة للمعالجة.</div>
            )}
          </div>
        </div>
      )}

      {/* TAB: NEWS CMS */}
      {activeTab === 'news_cms' && perms.manageNewsAndStore && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-6 p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-4 text-xs">
            <h3 className="font-bold text-white text-sm border-b border-slate-800 pb-2">نشر خبر أو بيان رسمي</h3>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setPublishingNews(true);
                try {
                  await api.addNews({
                    divisionId: scopeDivisionId || newsDivisionId || undefined,
                    title: newsTitle,
                    content: newsContent,
                    category: newsCategory,
                    isImportant: newsIsImportant,
                  });
                  setNewsTitle('');
                  setNewsContent('');
                  onRefreshAll();
                  addToast({ type: 'breaking_news', title: 'تم النشر', message: newsTitle, badge: 'المركز الإعلامي' });
                } finally {
                  setPublishingNews(false);
                }
              }}
              className="space-y-3"
            >
              {!scopeDivisionId && (
                <select value={newsDivisionId} onChange={(e) => setNewsDivisionId(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white">
                  <option value="">إعلان دولي عام (IOEF Global)</option>
                  {divisions.map((d) => (
                    <option key={d.id} value={d.id}>{d.nameAr}</option>
                  ))}
                </select>
              )}
              <input
                type="text"
                required
                value={newsTitle}
                onChange={(e) => setNewsTitle(e.target.value)}
                placeholder="عنوان البيان..."
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white"
              />
              <select value={newsCategory} onChange={(e) => setNewsCategory(e.target.value as any)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white">
                <option value="announcement">إعلان رسمي</option>
                <option value="tournament">بطولات</option>
                <option value="press_release">بيان صحفي</option>
                <option value="technical">لائحة فنية</option>
                <option value="disciplinary">قرار انضباطي</option>
              </select>
              <textarea
                rows={5}
                required
                value={newsContent}
                onChange={(e) => setNewsContent(e.target.value)}
                placeholder="نص الخبر..."
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white"
              />
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={newsIsImportant} onChange={(e) => setNewsIsImportant(e.target.checked)} className="rounded text-amber-500" />
                <span className="text-slate-300">خبر عاجل</span>
              </label>
              <button type="submit" disabled={publishingNews} className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-lg">
                نشر في المنصة الرسمية
              </button>
            </form>
          </div>

          <div className="lg:col-span-6 space-y-3">
            <h4 className="font-bold text-white text-xs">الأخبار المنشورة ({news.length})</h4>
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {news.map((n) => (
                <div key={n.id} className="p-4 bg-slate-900 border border-slate-800 rounded-xl text-xs space-y-1">
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span className="text-amber-400 font-bold">{n.category}</span>
                    <span className="font-mono">{n.publishedAt}</span>
                  </div>
                  <div className="font-bold text-white">{n.title}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB: STORE ORDERS */}
      {activeTab === 'store_orders' && perms.manageNewsAndStore && (
        <div className="space-y-4">
          <h3 className="font-bold text-white text-sm">طلبات المتجر الرسمي ({orders.length})</h3>
          {orders.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500 bg-slate-900/40 rounded-xl border border-slate-800">لا توجد طلبات مسجلة.</div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-950 text-slate-400 font-mono text-[11px] border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">الطلب</th>
                    <th className="py-3 px-4">المنتج</th>
                    <th className="py-3 px-4">العميل</th>
                    <th className="py-3 px-4">المبلغ</th>
                    <th className="py-3 px-4">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {orders.map((ord) => (
                    <tr key={ord.id}>
                      <td className="py-3 px-4 font-mono text-amber-400">{ord.orderNumber}</td>
                      <td className="py-3 px-4 text-white">{ord.productTitle}</td>
                      <td className="py-3 px-4 text-slate-300">{ord.customerName} ({ord.customerPhone})</td>
                      <td className="py-3 px-4 font-mono text-white">{ord.totalPrice} {ord.currency}</td>
                      <td className="py-3 px-4">
                        <select
                          value={ord.status}
                          onChange={async (e) => {
                            await api.updateOrderStatus(ord.id, e.target.value);
                            void fetchProtectedAdminData();
                          }}
                          className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white"
                        >
                          <option value="pending">pending</option>
                          <option value="processing">processing</option>
                          <option value="shipped">shipped</option>
                          <option value="completed">completed</option>
                          <option value="cancelled">cancelled</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB: ADMINS & RBAC PERMISSIONS */}
      {activeTab === 'admins_rbac' && isPresident && (
        <div className="space-y-6">
          <div>
            <h3 className="text-base font-bold text-white">إدارة وتسجيل المنظمين ومدير الاتحاد (JWT RBAC Matrix)</h3>
            <p className="text-xs text-slate-400">
              يستطيع رئيس الاتحاد تسجيل حسابات رسمية جديدة للمنظمين ومديري الاتحاد وتحديد اتحاداتهم الوطنية وصلاحياتهم بدقة دون تداخل.
            </p>
          </div>

          {roleMatrix && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              {(['president', 'director', 'organizer'] as const).map((rKey) => {
                const info = roleMatrix[rKey];
                if (!info) return null;
                return (
                  <div key={rKey} className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-amber-400">{info.labelAr}</span>
                      <span className="font-mono text-[10px] text-slate-500 uppercase">{info.role}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">{info.scopeAr}</p>
                  </div>
                );
              })}
            </div>
          )}

          {/* Create & Register New Director / Organizer Form */}
          <form onSubmit={handleCreateAdminUser} className="p-5 sm:p-6 bg-slate-900 border border-amber-500/30 rounded-2xl space-y-4 text-xs shadow-lg">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h4 className="font-black text-white text-sm">تسجيل مسؤول إداري جديد (منظم / مدير اتحاد)</h4>
                <p className="text-[11px] text-slate-400">سيتمكن المسؤول فور إنشائه من تسجيل الدخول باستخدام اسم المستخدم وكلمة المرور المحددة هنا.</p>
              </div>
              <span className="text-[10px] px-2.5 py-1 rounded bg-amber-500/10 text-amber-400 font-bold border border-amber-500/20">
                صلاحية رئيس الاتحاد
              </span>
            </div>

            {createAdminError && (
              <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-200 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{createAdminError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-slate-300 font-bold mb-1">الاسم الكامل للمسؤول:</label>
                <input
                  type="text"
                  required
                  value={newAdminName}
                  onChange={(e) => setNewAdminName(e.target.value)}
                  placeholder="مثال: أحمد السالم"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-bold mb-1">الدور الوظيفي:</label>
                <select
                  value={newAdminRole}
                  onChange={(e) => {
                    const nextRole = e.target.value === 'director' ? 'director' : 'organizer';
                    setNewAdminRole(nextRole);
                    setNewAdminPerms(
                      nextRole === 'director'
                        ? {
                            manageRegistrations: true,
                            manageSquadLocks: true,
                            manageMatchesAndResults: true,
                            manageTournamentsAndRules: true,
                            manageDiscipline: true,
                            manageNewsAndStore: true,
                            manageBackups: true,
                          }
                        : {
                            manageMatchesAndResults: true,
                            manageRegistrations: false,
                          }
                    );
                  }}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white font-bold"
                >
                  <option value="organizer">المنظم (إدارة المباريات والنتائج)</option>
                  <option value="director">مدير الاتحاد (إدارة تنفيذية شاملة)</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-300 font-bold mb-1">النطاق / الاتحاد الوطني:</label>
                <select
                  value={newAdminRole === 'organizer' ? newAdminDivisionId : ''}
                  disabled={newAdminRole === 'director'}
                  onChange={(e) => setNewAdminDivisionId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white disabled:opacity-50"
                >
                  {newAdminRole === 'director' && <option value="">كافة الاتحادات الستة (دولي)</option>}
                  {divisions.map((d) => (
                    <option key={d.id} value={d.id}>{d.nameAr}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-slate-300 font-bold mb-1">اسم المستخدم للدخول (بالإنجليزية):</label>
                <input
                  type="text"
                  required
                  dir="ltr"
                  value={newAdminUsername}
                  onChange={(e) => setNewAdminUsername(e.target.value)}
                  placeholder="ahmed_ksa"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-bold mb-1">كلمة المرور المبدئية (6 أحرف+):</label>
                <input
                  type="password"
                  required
                  dir="ltr"
                  value={newAdminPassword}
                  onChange={(e) => setNewAdminPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-bold mb-1">البريد الإلكتروني (اختياري):</label>
                <input
                  type="email"
                  dir="ltr"
                  value={newAdminEmail}
                  onChange={(e) => setNewAdminEmail(e.target.value)}
                  placeholder="organizer@ioef.org"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white font-mono"
                />
              </div>
            </div>

            <div>
              <div className="text-[11px] font-bold text-slate-300 mb-2">تحديد الصلاحيات التفصيلية ضمن سقف الدور المختار:</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {PERMISSION_LABELS.map((pl) => {
                  const allowedByRole = ROLE_CEILING_MAP[newAdminRole][pl.key];
                  return (
                    <label
                      key={pl.key}
                      className={`flex items-center justify-between gap-2 p-2.5 rounded-lg bg-slate-950 border border-slate-800 ${
                        !allowedByRole ? 'opacity-45 cursor-not-allowed' : 'cursor-pointer hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          disabled={!allowedByRole}
                          checked={!!(allowedByRole && newAdminPerms[pl.key])}
                          onChange={(e) =>
                            setNewAdminPerms((prev) => ({ ...prev, [pl.key]: e.target.checked }))
                          }
                        />
                        <span className="text-slate-300">{pl.label}</span>
                      </div>
                      {!allowedByRole && <span className="text-[9px] text-rose-400 font-bold">خارج سقف الدور</span>}
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={creatingAdmin}
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs flex items-center gap-2 disabled:opacity-50"
              >
                {creatingAdmin ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                <span>اعتماد وتسجيل الحساب الإداري</span>
              </button>
            </div>
          </form>

          <div className="space-y-4">
            {admins.map((adm) => {
              const isPresRow = adm.role === 'president';
              const roleCeiling = ROLE_CEILING_MAP[adm.role];
              return (
                <div key={adm.id} className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-4 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
                    <div>
                      <div className="font-bold text-white text-sm flex items-center gap-2">
                        <span>{adm.name}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-amber-400 font-bold">
                          {ROLE_AR_LABELS[adm.role]}
                        </span>
                      </div>
                      <div className="font-mono text-slate-400">@{adm.username} · {adm.email} · Role: {adm.role}</div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2.5">
                      <select
                        value={adm.assignedDivisionId || ''}
                        disabled={isPresRow}
                        onChange={async (e) => {
                          await api.updateAdminPermissions(adm.id, { assignedDivisionId: e.target.value });
                          void fetchProtectedAdminData();
                          addToast({ type: 'system', title: 'تحديث النطاق', message: `تم تحديث نطاق ${adm.name}.`, badge: 'RBAC' });
                        }}
                        className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white disabled:opacity-50"
                      >
                        <option value="">كافة الاتحادات (دولي)</option>
                        {divisions.map((d) => (
                          <option key={d.id} value={d.id}>{d.nameAr}</option>
                        ))}
                      </select>
                      <label className={`flex items-center gap-1.5 ${isPresRow ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}>
                        <input
                          type="checkbox"
                          checked={adm.active}
                          disabled={isPresRow}
                          onChange={async (e) => {
                            await api.updateAdminPermissions(adm.id, { active: e.target.checked });
                            void fetchProtectedAdminData();
                          }}
                        />
                        <span className="text-emerald-400 font-bold">{adm.active ? 'نشط' : 'معطل'}</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setPasswordResetTarget(adm);
                          setNewResetPassword('');
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-700 text-amber-400 font-bold flex items-center gap-1"
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                        <span>تغيير كلمة المرور</span>
                      </button>
                      {!isPresRow && (
                        <button
                          type="button"
                          onClick={() => setDeleteAdminTarget(adm)}
                          className="px-2.5 py-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-950/70 border border-rose-500/30 text-rose-300 font-bold flex items-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>حذف</span>
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {PERMISSION_LABELS.map((pl) => {
                      const allowedByRole = roleCeiling[pl.key];
                      const disabled = isPresRow || !allowedByRole;
                      return (
                        <label
                          key={pl.key}
                          className={`flex items-center justify-between gap-2 p-2.5 rounded-lg bg-slate-950 border border-slate-800 ${
                            disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              disabled={disabled}
                              checked={!!adm.permissions?.[pl.key]}
                              onChange={async (e) => {
                                await api.updateAdminPermissions(adm.id, {
                                  permissions: { [pl.key]: e.target.checked },
                                });
                                void fetchProtectedAdminData();
                              }}
                            />
                            <span className="text-slate-300">{pl.label}</span>
                          </div>
                          {!allowedByRole && (
                            <span className="text-[9px] text-rose-400 font-bold">خارج سقف الدور</span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB: SYSTEM RESILIENCE & BACKUPS */}
      {activeTab === 'system_resilience' && isDirectorOrPresident && perms.manageBackups && (
        <div className="space-y-6">
          <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-black text-white">الأداء والنسخ الاحتياطية الفورية</h3>
              <p className="text-xs text-slate-400">مراقبة حية لذاكرة الخادم وزمن الاستجابة وحفظ نسخ قاعدة البيانات.</p>
            </div>
            <button
              onClick={handleCreateBackup}
              disabled={creatingBackup}
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs flex items-center gap-2"
            >
              {creatingBackup ? <Loader2 className="w-4 h-4 animate-spin" /> : <HardDriveDownload className="w-4 h-4" />}
              <span>إنشاء نسخة احتياطية الآن</span>
            </button>
          </div>

          {systemHealth && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
                <div className="text-slate-400">زمن التشغيل</div>
                <div className="text-lg font-black text-white">{systemHealth.uptimeSeconds}s</div>
              </div>
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
                <div className="text-slate-400">متوسط الاستجابة</div>
                <div className="text-lg font-black text-amber-400">{systemHealth.averageLatencyMs} ms</div>
              </div>
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
                <div className="text-slate-400">الذاكرة (Heap)</div>
                <div className="text-lg font-black text-sky-400">{systemHealth.memory?.heapUsedMb} MB</div>
              </div>
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
                <div className="text-slate-400">معدل الأخطاء</div>
                <div className="text-lg font-black text-emerald-400">{systemHealth.errorRatePercent}%</div>
              </div>
            </div>
          )}

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-950 text-slate-400 font-mono text-[11px] border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">اسم الملف</th>
                  <th className="py-3 px-4">التاريخ</th>
                  <th className="py-3 px-4">الحجم</th>
                  <th className="py-3 px-4 text-center">استعادة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {backups.map((b) => (
                  <tr key={b.filename} className="font-mono text-[11px]">
                    <td className="py-3 px-4 text-white font-bold">{b.filename}</td>
                    <td className="py-3 px-4 text-slate-400">{new Date(b.createdAt).toLocaleString('ar-SA')}</td>
                    <td className="py-3 px-4 text-amber-400">{(b.sizeBytes / 1024).toFixed(1)} KB</td>
                    <td className="py-3 px-4 text-center">
                      {isPresident ? (
                        <button
                          onClick={() => setConfirmRestoreFilename(b.filename)}
                          disabled={restoringBackup}
                          className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-lg inline-flex items-center gap-1"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>استعادة</span>
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-500">حصري لرئيس الاتحاد</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB: SETTINGS, AI MODEL CONFIG & SOCIAL CHANNELS */}
      {activeTab === 'settings' && perms.manageSettingsAndAI && (
        <form onSubmit={handleSaveSettingsAndAI} className="max-w-3xl space-y-6 text-xs">
          <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
            <h3 className="font-bold text-white text-base border-b border-slate-800 pb-2">معايير القوة والتسجيل</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-300 mb-1">حد الدرجة الأولى:</label>
                <input
                  type="number"
                  value={firstMinRating}
                  onChange={(e) => setFirstMinRating(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-300 mb-1">حد الدرجة الثانية:</label>
                <input
                  type="number"
                  value={secondMinRating}
                  onChange={(e) => setSecondMinRating(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white font-mono"
                />
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={allowRegToggle} onChange={(e) => setAllowRegToggle(e.target.checked)} />
              <span className="font-bold text-white">إتاحة استقبال طلبات تسجيل اللاعبين</span>
            </label>
          </div>

          <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
            <h3 className="font-bold text-white text-base border-b border-slate-800 pb-2">إدارة نماذج Gemini AI أثناء التشغيل</h3>
            <div className="space-y-2">
              {MODEL_OPTIONS.map((opt) => (
                <label key={opt.value} className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer">
                  <div className="flex items-center gap-2.5">
                    <input
                      type="radio"
                      name="aiModel"
                      checked={activeAiModel === opt.value}
                      onChange={() => setActiveAiModel(opt.value)}
                    />
                    <div>
                      <div className="font-bold text-white">{opt.label}</div>
                      <div className="text-[11px] text-slate-400">{opt.note}</div>
                    </div>
                  </div>
                  <span className="font-mono text-amber-400">{opt.value}</span>
                </label>
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2">
              <label className="flex items-center gap-2 p-2.5 bg-slate-950 border border-slate-800 rounded-lg cursor-pointer">
                <input type="checkbox" checked={enableSquadVision} onChange={(e) => setEnableSquadVision(e.target.checked)} />
                <span className="text-slate-200">تحليل صور التشكيلات</span>
              </label>
              <label className="flex items-center gap-2 p-2.5 bg-slate-950 border border-slate-800 rounded-lg cursor-pointer">
                <input type="checkbox" checked={enableResultVision} onChange={(e) => setEnableResultVision(e.target.checked)} />
                <span className="text-slate-200">فحص صور النتائج</span>
              </label>
              <label className="flex items-center gap-2 p-2.5 bg-slate-950 border border-slate-800 rounded-lg cursor-pointer">
                <input type="checkbox" checked={enableCentralAssistant} onChange={(e) => setEnableCentralAssistant(e.target.checked)} />
                <span className="text-slate-200">المساعد المركزي</span>
              </label>
            </div>
          </div>

          <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
            <h3 className="font-bold text-white text-base border-b border-slate-800 pb-2">روابط القنوات الرسمية و WhatsApp Webhook</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input type="text" value={waChannelName} onChange={(e) => setWaChannelName(e.target.value)} placeholder="اسم قناة الواتساب" className="bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white" />
              <input type="url" dir="ltr" value={waChannelUrl} onChange={(e) => setWaChannelUrl(e.target.value)} placeholder="https://whatsapp.com/channel/..." className="bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white font-mono" />
              <input type="text" value={tiktokHandle} onChange={(e) => setTiktokHandle(e.target.value)} placeholder="@IOEF.Official" className="bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white font-mono" />
              <input type="url" dir="ltr" value={tiktokUrl} onChange={(e) => setTiktokUrl(e.target.value)} placeholder="https://www.tiktok.com/..." className="bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white font-mono" />
              <input type="text" value={fbPageName} onChange={(e) => setFbPageName(e.target.value)} placeholder="اسم صفحة فيسبوك" className="bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white" />
              <input type="url" dir="ltr" value={fbUrl} onChange={(e) => setFbUrl(e.target.value)} placeholder="https://www.facebook.com/..." className="bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white font-mono" />
            </div>
            <div className="pt-2 space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={whatsappApiEnabled} onChange={(e) => setWhatsappApiEnabled(e.target.checked)} />
                <span className="font-bold text-white">تفعيل الإرسال عبر Meta WhatsApp Webhook</span>
              </label>
              <input
                type="url"
                dir="ltr"
                value={whatsappWebhookUrl}
                onChange={(e) => setWhatsappWebhookUrl(e.target.value)}
                placeholder="https://graph.facebook.com/v20.0/..."
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white font-mono"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={savingSettings}
            className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl flex items-center gap-2"
          >
            {savingSettings ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            <span>حفظ كافة الإعدادات وإعدادات AI</span>
          </button>
        </form>
      )}

      {/* TAB: AUDIT LOGS */}
      {activeTab === 'audit_logs' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-950 text-slate-400 font-mono text-[11px] border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">الوقت</th>
                <th className="py-3 px-4">المسؤول</th>
                <th className="py-3 px-4">الإجراء</th>
                <th className="py-3 px-4">الهدف</th>
                <th className="py-3 px-4">التفاصيل</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {auditLogs.map((log) => (
                <tr key={log.id} className="text-[11px]">
                  <td className="py-3 px-4 font-mono text-slate-500">{new Date(log.timestamp).toLocaleString('ar-SA')}</td>
                  <td className="py-3 px-4 font-bold text-amber-400">{log.adminName}</td>
                  <td className="py-3 px-4 text-white">{log.action}</td>
                  <td className="py-3 px-4 text-slate-300">{log.target}</td>
                  <td className="py-3 px-4 text-slate-400">{log.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB: MEMBERSHIPS, QR CARDS, SUBSCRIPTIONS & TRANSFERS (Director/President Only) */}
      {activeTab === 'memberships' && isDirectorOrPresident && (
        <AdminMembershipPanel
          isPresident={isPresident}
          players={players}
          teams={teams}
          divisions={divisions}
          onRefreshAll={onRefreshAll}
        />
      )}

      {/* =====================================================================
          INLINE MODALS (REPLACING ALL BROWSER DIALOGS)
      ====================================================================== */}
      {/* Reject Registration Reason Modal */}
      {rejectTarget && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 text-xs shadow-2xl">
            <h3 className="text-base font-black text-white">رفض طلب القيد: {rejectTarget.fullName}</h3>
            <p className="text-slate-400">أدخل سبب الرفض الرسمي ليظهر في سجل القرارات ويتم إشعار المتقدم به، كما سيُتاح النادي تلقائياً للتسجيل مجدداً:</p>
            <textarea
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="مثال: لقطة شاشة التشكيلة غير مطابقة لمتطلبات الدرجة..."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRejectTarget(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 font-bold"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={!rejectReason.trim()}
                onClick={async () => {
                  const id = rejectTarget.id;
                  const reason = rejectReason.trim();
                  setRejectTarget(null);
                  await handleReviewRegistration(id, 'rejected', reason);
                }}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold disabled:opacity-40"
              >
                تأكيد الرفض
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Restore Backup Confirmation Modal */}
      {confirmRestoreFilename && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-500/40 rounded-2xl max-w-md w-full p-6 space-y-4 text-xs shadow-2xl">
            <h3 className="text-base font-black text-white">تأكيد استعادة النسخة الاحتياطية</h3>
            <p className="text-slate-300 leading-relaxed">
              هل أنت متأكد من استعادة قاعدة البيانات من الملف <span className="font-mono text-amber-400">{confirmRestoreFilename}</span>؟ سيتم استبدال البيانات الحالية بمحتوى النسخة المحددة.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmRestoreFilename(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 font-bold"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={restoringBackup}
                onClick={handleConfirmRestoreBackup}
                className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black"
              >
                {restoringBackup ? 'جاري الاستعادة...' : 'تأكيد الاستعادة الفورية'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Club Roster Modal */}
      {editingTeamRoster && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 text-xs shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-sm font-black text-white">قائمة لاعبي نادي: {editingTeamRoster.name}</h3>
              <button
                type="button"
                onClick={() =>
                  setRosterDraft((prev) => [...prev, { id: `rp_${Date.now()}_${prev.length}`, name: '', position: 'CMF', rating: 96 }])
                }
                className="text-amber-400 font-bold flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة لاعب</span>
              </button>
            </div>
            <div className="max-h-72 overflow-y-auto space-y-2">
              {rosterDraft.map((rp, idx) => (
                <div key={rp.id} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={rp.name}
                    onChange={(e) =>
                      setRosterDraft((prev) => prev.map((r, i) => (i === idx ? { ...r, name: e.target.value } : r)))
                    }
                    placeholder="اسم اللاعب"
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                  />
                  <input
                    type="text"
                    value={rp.position}
                    onChange={(e) =>
                      setRosterDraft((prev) => prev.map((r, i) => (i === idx ? { ...r, position: e.target.value } : r)))
                    }
                    className="w-16 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-amber-400 font-mono text-center"
                  />
                  <input
                    type="number"
                    value={rp.rating}
                    onChange={(e) =>
                      setRosterDraft((prev) => prev.map((r, i) => (i === idx ? { ...r, rating: Number(e.target.value) } : r)))
                    }
                    className="w-16 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-white font-mono text-center"
                  />
                  <button
                    type="button"
                    onClick={() => setRosterDraft((prev) => prev.filter((_, i) => i !== idx))}
                    className="p-1 text-rose-400"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button onClick={() => setEditingTeamRoster(null)} className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 font-bold">
                إغلاق
              </button>
              <button
                onClick={handleSaveTeamRoster}
                disabled={savingRoster}
                className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black"
              >
                {savingRoster ? 'جاري الحفظ...' : 'حفظ القائمة'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inline Password Reset Modal */}
      {passwordResetTarget && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleConfirmResetPassword} className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 text-xs shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-sm font-black text-white">تغيير كلمة المرور: {passwordResetTarget.name}</h3>
              <button type="button" onClick={() => setPasswordResetTarget(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div>
              <label className="block text-slate-300 font-bold mb-1.5">كلمة المرور الجديدة (6 أحرف أو أرقام على الأقل):</label>
              <input
                type="password"
                required
                minLength={6}
                dir="ltr"
                value={newResetPassword}
                onChange={(e) => setNewResetPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-mono"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button type="button" onClick={() => setPasswordResetTarget(null)} className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 font-bold">
                إلغاء
              </button>
              <button
                type="submit"
                disabled={savingResetPassword || newResetPassword.trim().length < 6}
                className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black disabled:opacity-50"
              >
                {savingResetPassword ? 'جاري التحديث...' : 'حفظ كلمة المرور'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Inline Delete Admin Confirmation Modal */}
      {deleteAdminTarget && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-500/40 rounded-2xl max-w-md w-full p-6 space-y-4 text-xs shadow-2xl">
            <div className="flex items-center gap-2 text-rose-400 font-black text-sm">
              <AlertTriangle className="w-5 h-5" />
              <span>تأكيد حذف الحساب الإداري</span>
            </div>
            <p className="text-slate-300 leading-relaxed">
              هل أنت متأكد من حذف حساب <strong className="text-white">{deleteAdminTarget.name}</strong> (@{deleteAdminTarget.username})؟ لن يتمكن من تسجيل الدخول بعد الحذف.
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button type="button" onClick={() => setDeleteAdminTarget(null)} className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 font-bold">
                تراجع
              </button>
              <button
                type="button"
                disabled={deletingAdmin}
                onClick={handleConfirmDeleteAdmin}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-black disabled:opacity-50"
              >
                {deletingAdmin ? 'جاري الحذف...' : 'تأكيد الحذف'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
