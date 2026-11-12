import {
  SystemSettings,
  Division,
  Tournament,
  Team,
  Player,
  SquadEditRecord,
  RegistrationApplication,
  MatchFixture,
  DisciplinaryAction,
  NewsItem,
  StoreProduct,
  StoreOrder,
  NotificationItem,
  AdminUser,
  AuditLog,
  SupportTicket,
  AISubsystemInfo,
  RegulationArticle,
  RosterPlayer,
  AIConfig,
  AdminPermissions,
  MatchStats,
  MembershipSettings,
  MembershipRecord,
  SubscriptionPayment,
  SubscriptionPaymentMethod,
  PlayerTransferRecord,
} from '../types';

const ADMIN_TOKEN_KEY = 'ioef_admin_token';

export function getAdminToken(): string | null {
  try {
    return sessionStorage.getItem(ADMIN_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAdminToken(token: string | null): void {
  try {
    if (token) {
      sessionStorage.setItem(ADMIN_TOKEN_KEY, token);
    } else {
      sessionStorage.removeItem(ADMIN_TOKEN_KEY);
    }
  } catch {
    // ignore storage errors
  }
}

function authHeaders(extra?: Record<string, string>): Record<string, string> {
  const token = getAdminToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(extra || {}),
  };
}

async function handleJson<T>(res: Response): Promise<T> {
  if (res.status === 401) {
    setAdminToken(null);
  }
  const text = await res.text();
  let data: any = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { error: text };
  }
  if (!res.ok) {
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  return data as T;
}

export const api = {
  // Admin Authentication (RFC 7519 JWT HS256)
  async adminLogin(
    username: string,
    password: string
  ): Promise<{ success: boolean; token: string; tokenType?: string; expiresIn?: number; admin: AdminUser; jwtClaims?: any }> {
    const res = await fetch('/api/auth/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await handleJson<{
      success: boolean;
      token: string;
      tokenType?: string;
      expiresIn?: number;
      admin: AdminUser;
      jwtClaims?: any;
    }>(res);
    if (data.token) setAdminToken(data.token);
    return data;
  },

  async adminLogout(): Promise<void> {
    try {
      await fetch('/api/auth/admin/logout', {
        method: 'POST',
        headers: authHeaders(),
      });
    } finally {
      setAdminToken(null);
    }
  },

  async adminMe(): Promise<{ success: boolean; admin: AdminUser; jwtClaims?: any; roleMatrix?: any } | null> {
    const token = getAdminToken();
    if (!token) return null;
    try {
      const res = await fetch('/api/auth/admin/me', { headers: authHeaders() });
      if (!res.ok) {
        setAdminToken(null);
        return null;
      }
      return await res.json();
    } catch {
      return null;
    }
  },

  async getRbacMatrix(): Promise<{ success: boolean; roleMatrix: any }> {
    const res = await fetch('/api/auth/rbac-matrix', { headers: authHeaders() });
    return handleJson<{ success: boolean; roleMatrix: any }>(res);
  },

  // Settings & AI Runtime Config
  async getSettings(): Promise<SystemSettings> {
    const res = await fetch('/api/settings');
    return handleJson<SystemSettings>(res);
  },

  async updateSettings(settings: Partial<SystemSettings>): Promise<SystemSettings> {
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({ settings }),
    });
    const data = await handleJson<{ success: boolean; settings: SystemSettings }>(res);
    return data.settings;
  },

  async updateAiConfig(config: Partial<AIConfig>): Promise<AIConfig> {
    const res = await fetch('/api/ai/config', {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(config),
    });
    const data = await handleJson<{ success: boolean; aiConfig: AIConfig }>(res);
    return data.aiConfig;
  },

  // Divisions & Tournaments
  async getDivisions(): Promise<Division[]> {
    const res = await fetch('/api/divisions');
    return handleJson<Division[]>(res);
  },

  async getTournaments(divisionId?: string): Promise<Tournament[]> {
    const url = divisionId ? `/api/tournaments?divisionId=${encodeURIComponent(divisionId)}` : '/api/tournaments';
    const res = await fetch(url);
    return handleJson<Tournament[]>(res);
  },

  async updateTournament(id: string, partial: Partial<Tournament>): Promise<Tournament> {
    const res = await fetch(`/api/tournaments/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(partial),
    });
    const data = await handleJson<{ success: boolean; tournament: Tournament }>(res);
    return data.tournament;
  },

  // Teams & Standings
  async getTeams(tournamentId?: string, divisionId?: string): Promise<Team[]> {
    const params = new URLSearchParams();
    if (tournamentId) params.append('tournamentId', tournamentId);
    if (divisionId) params.append('divisionId', divisionId);
    const res = await fetch(`/api/teams?${params.toString()}`);
    return handleJson<Team[]>(res);
  },

  async updateTeamRoster(teamId: string, roster: RosterPlayer[]): Promise<Team> {
    const res = await fetch(`/api/teams/${encodeURIComponent(teamId)}/roster`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({ roster }),
    });
    const data = await handleJson<{ success: boolean; team: Team }>(res);
    return data.team;
  },

  // Players
  async getPlayers(divisionId?: string): Promise<Player[]> {
    const url = divisionId ? `/api/players?divisionId=${encodeURIComponent(divisionId)}` : '/api/players';
    const res = await fetch(url, { headers: authHeaders() });
    return handleJson<Player[]>(res);
  },

  async getPlayer(id: string): Promise<{ player: Player; edits: SquadEditRecord[] }> {
    const res = await fetch(`/api/players/${encodeURIComponent(id)}`, { headers: authHeaders() });
    return handleJson<{ player: Player; edits: SquadEditRecord[] }>(res);
  },

  async modifySquad(
    playerId: string,
    payload: {
      newRating: number;
      newImageUrl: string;
      formation?: string;
      notes?: string;
      newRoster?: RosterPlayer[];
    }
  ): Promise<{ success: boolean; message?: string; error?: string; player?: Player }> {
    const res = await fetch(`/api/players/${encodeURIComponent(playerId)}/squad`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.json();
  },

  async setSquadLock(playerId: string, locked: boolean): Promise<{ success: boolean; locked: boolean }> {
    const res = await fetch(`/api/players/${encodeURIComponent(playerId)}/unlock-squad`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ locked }),
    });
    return handleJson<{ success: boolean; locked: boolean }>(res);
  },

  // Registrations
  async getRegistrations(status?: string, divisionId?: string): Promise<RegistrationApplication[]> {
    const params = new URLSearchParams();
    if (status && status !== 'all') params.append('status', status);
    if (divisionId) params.append('divisionId', divisionId);
    const res = await fetch(`/api/registrations?${params.toString()}`, { headers: authHeaders() });
    return handleJson<RegistrationApplication[]>(res);
  },

  async checkRegistration(
    whatsapp?: string,
    gamerTag?: string
  ): Promise<{
    exists: boolean;
    reason?: string;
    existingPlayer?: Player;
    existingRegistration?: RegistrationApplication;
  }> {
    const params = new URLSearchParams();
    if (whatsapp) params.append('whatsapp', whatsapp);
    if (gamerTag) params.append('gamerTag', gamerTag);
    const res = await fetch(`/api/registrations/check?${params.toString()}`);
    return handleJson(res);
  },

  async submitRegistration(data: any): Promise<{ success: boolean; registration?: RegistrationApplication; error?: string }> {
    const res = await fetch('/api/registrations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async updateRegistrationStatus(
    id: string,
    status: 'approved' | 'rejected' | 'needs_review',
    notes?: string
  ): Promise<{ success: boolean; registration: RegistrationApplication }> {
    const res = await fetch(`/api/registrations/${encodeURIComponent(id)}/status`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({ status, notes }),
    });
    return handleJson(res);
  },

  // Fixtures
  async getFixtures(tournamentId?: string, status?: string, divisionId?: string): Promise<MatchFixture[]> {
    const params = new URLSearchParams();
    if (tournamentId) params.append('tournamentId', tournamentId);
    if (status) params.append('status', status);
    if (divisionId) params.append('divisionId', divisionId);
    const res = await fetch(`/api/fixtures?${params.toString()}`);
    return handleJson<MatchFixture[]>(res);
  },

  async createFixture(payload: {
    tournamentId: string;
    divisionId?: string;
    roundName: string;
    homeTeamId: string;
    awayTeamId: string;
    matchDate: string;
    matchTime: string;
    assignedReferee?: string;
    streamUrl?: string;
  }): Promise<{ success: boolean; fixture: MatchFixture }> {
    const res = await fetch('/api/fixtures', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });
    return handleJson(res);
  },

  async recordMatchResult(data: {
    fixtureId: string;
    homeScore: number;
    awayScore: number;
    events?: any[];
    stats?: MatchStats;
    resultScreenshotUrl?: string;
    aiResultAudit?: MatchFixture['aiResultAudit'];
  }): Promise<{ success: boolean }> {
    const res = await fetch('/api/fixtures/result', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(data),
    });
    return handleJson<{ success: boolean }>(res);
  },

  // Disciplinary
  async getDisciplinary(divisionId?: string): Promise<DisciplinaryAction[]> {
    const url = divisionId ? `/api/disciplinary?divisionId=${encodeURIComponent(divisionId)}` : '/api/disciplinary';
    const res = await fetch(url);
    return handleJson<DisciplinaryAction[]>(res);
  },

  async addDisciplinary(data: any): Promise<{ success: boolean; action: DisciplinaryAction }> {
    const res = await fetch('/api/disciplinary', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(data),
    });
    return handleJson(res);
  },

  // News
  async getNews(divisionId?: string): Promise<NewsItem[]> {
    const url = divisionId ? `/api/news?divisionId=${encodeURIComponent(divisionId)}` : '/api/news';
    const res = await fetch(url);
    return handleJson<NewsItem[]>(res);
  },

  async addNews(data: any): Promise<{ success: boolean; news: NewsItem }> {
    const res = await fetch('/api/news', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(data),
    });
    return handleJson(res);
  },

  // Dynamic Regulations CMS
  async getRules(): Promise<RegulationArticle[]> {
    const res = await fetch('/api/rules');
    return handleJson<RegulationArticle[]>(res);
  },

  async updateRules(articles: RegulationArticle[]): Promise<{ success: boolean; articles: RegulationArticle[] }> {
    const res = await fetch('/api/rules', {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({ articles }),
    });
    return handleJson(res);
  },

  // Store
  async getStoreProducts(): Promise<StoreProduct[]> {
    const res = await fetch('/api/store/products');
    return handleJson<StoreProduct[]>(res);
  },

  async getOrders(): Promise<StoreOrder[]> {
    const res = await fetch('/api/store/orders', { headers: authHeaders() });
    return handleJson<StoreOrder[]>(res);
  },

  async createOrder(data: any): Promise<{ success: boolean; order: StoreOrder }> {
    const res = await fetch('/api/store/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleJson(res);
  },

  async updateOrderStatus(orderId: string, status: string): Promise<{ success: boolean }> {
    const res = await fetch(`/api/store/orders/${encodeURIComponent(orderId)}/status`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({ status }),
    });
    return handleJson(res);
  },

  // Notifications
  async getNotifications(recipientId?: string, divisionId?: string): Promise<NotificationItem[]> {
    const params = new URLSearchParams();
    if (recipientId) params.append('recipientId', recipientId);
    if (divisionId) params.append('divisionId', divisionId);
    const res = await fetch(`/api/notifications?${params.toString()}`);
    return handleJson<NotificationItem[]>(res);
  },

  async markNotificationRead(id: string): Promise<{ success: boolean }> {
    const res = await fetch(`/api/notifications/${encodeURIComponent(id)}/read`, { method: 'PUT' });
    return handleJson(res);
  },

  async sendMatchReminder(phone: string, message: string): Promise<{ success: boolean; deliveredVia: string; detail: string }> {
    const res = await fetch('/api/notifications/remind', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ phone, message }),
    });
    return handleJson(res);
  },

  // Audit Logs & Admins RBAC
  async getAuditLogs(): Promise<AuditLog[]> {
    const res = await fetch('/api/audit-logs', { headers: authHeaders() });
    return handleJson<AuditLog[]>(res);
  },

  async getAdmins(): Promise<AdminUser[]> {
    const res = await fetch('/api/admins', { headers: authHeaders() });
    return handleJson<AdminUser[]>(res);
  },

  async createAdminUser(payload: {
    name: string;
    username: string;
    password: string;
    email?: string;
    role: 'director' | 'organizer';
    assignedDivisionId?: string;
    permissions?: Partial<AdminPermissions>;
  }): Promise<{ success: boolean; admin: AdminUser }> {
    const res = await fetch('/api/admins', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });
    return handleJson(res);
  },

  async resetAdminPassword(adminId: string, password: string): Promise<{ success: boolean }> {
    const res = await fetch(`/api/admins/${encodeURIComponent(adminId)}/password`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ password }),
    });
    return handleJson(res);
  },

  async deleteAdminUser(adminId: string): Promise<{ success: boolean }> {
    const res = await fetch(`/api/admins/${encodeURIComponent(adminId)}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    return handleJson(res);
  },

  async updateAdminPermissions(
    adminId: string,
    payload: { permissions?: Partial<AdminPermissions>; assignedDivisionId?: string; active?: boolean }
  ): Promise<{ success: boolean; admin: AdminUser }> {
    const res = await fetch(`/api/admins/${encodeURIComponent(adminId)}/permissions`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });
    return handleJson(res);
  },

  // AI Gemini Server APIs
  async analyzeSquadImage(imageBase64: string, requestedTier: 1 | 2 = 1, mimeType?: string): Promise<any> {
    const res = await fetch('/api/ai/analyze-squad', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64, requestedTier, mimeType }),
    });
    return handleJson(res);
  },

  async queryAdminAssistant(
    query: string,
    context?: string,
    history?: Array<{ role: 'user' | 'model'; text: string }>
  ): Promise<{
    success: boolean;
    answer: string;
    routedSubsystem?: string;
    proposedAction?: { type: 'publish_news' | 'run_duplicate_scan' | 'unlock_squad'; summary: string; payload?: any };
  }> {
    const res = await fetch('/api/ai/admin-assistant', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ query, context, history }),
    });
    return handleJson(res);
  },

  async predictMatch(
    homeTeamName: string,
    homeRating: number,
    awayTeamName: string,
    awayRating: number,
    tournamentName?: string
  ): Promise<any> {
    const res = await fetch('/api/ai/predict-match', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ homeTeamName, homeRating, awayTeamName, awayRating, tournamentName }),
    });
    return handleJson(res);
  },

  async generatePressReport(
    homeTeamName: string,
    awayTeamName: string,
    homeScore: number,
    awayScore: number,
    roundName: string,
    scorersSummary?: string
  ): Promise<any> {
    const res = await fetch('/api/ai/generate-press-report', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ homeTeamName, awayTeamName, homeScore, awayScore, roundName, scorersSummary }),
    });
    return handleJson(res);
  },

  async detectDuplicates(): Promise<any> {
    const res = await fetch('/api/ai/detect-duplicates', { headers: authHeaders() });
    return handleJson(res);
  },

  async getAISubsystems(): Promise<{ success: boolean; subsystems: AISubsystemInfo[]; queueStats: any }> {
    const res = await fetch('/api/ai/subsystems');
    return handleJson(res);
  },

  async preCheckRegistration(payload: any): Promise<any> {
    const res = await fetch('/api/ai/pre-check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleJson(res);
  },

  async getTeamHealth(teamId: string): Promise<any> {
    const res = await fetch(`/api/ai/team-health/${encodeURIComponent(teamId)}`);
    return handleJson(res);
  },

  async getPlayerAssessment(playerId: string): Promise<any> {
    const res = await fetch(`/api/ai/player-assess/${encodeURIComponent(playerId)}`);
    return handleJson(res);
  },

  async getTournamentAnalysis(tournamentId?: string): Promise<any> {
    const url = tournamentId ? `/api/ai/tournament-analysis?tournamentId=${encodeURIComponent(tournamentId)}` : '/api/ai/tournament-analysis';
    const res = await fetch(url);
    return handleJson(res);
  },

  async verifyMatchResult(payload: {
    fixtureId?: string;
    homeTeamName?: string;
    awayTeamName?: string;
    homeScore?: number;
    awayScore?: number;
    screenshotBase64?: string;
    mimeType?: string;
  }): Promise<any> {
    const res = await fetch('/api/ai/verify-result', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });
    return handleJson(res);
  },

  async getPowerRankings(): Promise<any> {
    const res = await fetch('/api/ai/power-rankings');
    return handleJson(res);
  },

  async getRulesSanctionAdvice(violationType: string, isRepeat: boolean = false): Promise<any> {
    const res = await fetch('/api/ai/rules-sanction', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ violationType, isRepeat }),
    });
    return handleJson(res);
  },

  // Support Tickets API
  async getSupportTickets(status?: string): Promise<SupportTicket[]> {
    const url = status ? `/api/support/tickets?status=${encodeURIComponent(status)}` : '/api/support/tickets';
    const res = await fetch(url, { headers: authHeaders() });
    return handleJson<SupportTicket[]>(res);
  },

  async submitSupportTicket(payload: {
    senderName: string;
    senderContact: string;
    ticketSubject: string;
    ticketDetails: string;
    divisionId?: string;
  }): Promise<{ success: boolean; ticket: SupportTicket }> {
    const res = await fetch('/api/support/tickets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleJson(res);
  },

  async resolveSupportTicket(id: string, status: string, resolutionNotes: string): Promise<{ success: boolean }> {
    const res = await fetch(`/api/support/tickets/${encodeURIComponent(id)}/resolve`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({ status, resolutionNotes }),
    });
    return handleJson(res);
  },

  // System Concurrency & Health
  async getSystemHealth(): Promise<any> {
    const res = await fetch('/api/system/health');
    return handleJson(res);
  },

  async getBackups(): Promise<any> {
    const res = await fetch('/api/system/backups', { headers: authHeaders() });
    return handleJson(res);
  },

  async createBackup(): Promise<any> {
    const res = await fetch('/api/system/backups/create', {
      method: 'POST',
      headers: authHeaders(),
    });
    return handleJson(res);
  },

  async restoreBackup(filename: string): Promise<any> {
    const res = await fetch('/api/system/backups/restore', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ filename }),
    });
    return handleJson(res);
  },

  // Digital Membership Cards & Public QR Verification
  async verifyMembership(tokenOrCode: string): Promise<any> {
    const res = await fetch(`/api/verify/${encodeURIComponent(tokenOrCode)}`);
    return res.json();
  },

  async getPlayerCareerDossier(playerId: string): Promise<{
    success: boolean;
    player: Player;
    membership: MembershipRecord | null;
    transfers: PlayerTransferRecord[];
    fixtures: MatchFixture[];
    disciplinary: DisciplinaryAction[];
    squadEdits: SquadEditRecord[];
    payments: SubscriptionPayment[];
  }> {
    const res = await fetch(`/api/players/${encodeURIComponent(playerId)}/career`, { headers: authHeaders() });
    return handleJson(res);
  },

  async updatePlayerPhoto(playerId: string, photoUrl: string): Promise<{ success: boolean; photoUrl: string }> {
    const res = await fetch(`/api/players/${encodeURIComponent(playerId)}/photo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ photoUrl }),
    });
    return handleJson(res);
  },

  async getMembershipSettings(): Promise<MembershipSettings> {
    const res = await fetch('/api/memberships/settings');
    return handleJson(res);
  },

  async updateMembershipSettings(partial: Partial<MembershipSettings>): Promise<{ success: boolean; membershipSettings: MembershipSettings }> {
    const res = await fetch('/api/memberships/settings', {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(partial),
    });
    return handleJson(res);
  },

  async getMemberships(status?: string, divisionId?: string): Promise<MembershipRecord[]> {
    const params = new URLSearchParams();
    if (status && status !== 'all') params.append('status', status);
    if (divisionId) params.append('divisionId', divisionId);
    const res = await fetch(`/api/memberships?${params.toString()}`, { headers: authHeaders() });
    return handleJson(res);
  },

  async issueMembership(playerId: string): Promise<{ success: boolean; membership: MembershipRecord }> {
    const res = await fetch('/api/memberships/issue', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ playerId }),
    });
    return handleJson(res);
  },

  async reissueMembershipCard(membershipId: string, reason?: string): Promise<{ success: boolean; membership: MembershipRecord }> {
    const res = await fetch(`/api/memberships/${encodeURIComponent(membershipId)}/reissue`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ reason }),
    });
    return handleJson(res);
  },

  async revokeMembershipCard(membershipId: string, reason: string): Promise<{ success: boolean; membership: MembershipRecord }> {
    const res = await fetch(`/api/memberships/${encodeURIComponent(membershipId)}/revoke`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ reason }),
    });
    return handleJson(res);
  },

  async updateMembershipStatus(
    membershipId: string,
    action: 'suspend' | 'activate' | 'extend',
    options?: { extendDays?: number; reason?: string }
  ): Promise<{ success: boolean; membership: MembershipRecord }> {
    const res = await fetch(`/api/memberships/${encodeURIComponent(membershipId)}/status`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({ action, ...(options || {}) }),
    });
    return handleJson(res);
  },

  async runExpiringAlerts(): Promise<{ success: boolean; alertedCount: number; alertedNumbers: string[] }> {
    const res = await fetch('/api/memberships/check-expirations', {
      method: 'POST',
      headers: authHeaders(),
    });
    return handleJson(res);
  },

  async submitSubscriptionPayment(payload: {
    playerId: string;
    paymentMethod: SubscriptionPaymentMethod;
    amount: number;
    senderReference: string;
    transactionRef: string;
    proofImageUrl?: string;
    season?: string;
  }): Promise<{ success: boolean; payment: SubscriptionPayment }> {
    const res = await fetch('/api/payments/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleJson(res);
  },

  async getPayments(status?: string, divisionId?: string): Promise<SubscriptionPayment[]> {
    const params = new URLSearchParams();
    if (status && status !== 'all') params.append('status', status);
    if (divisionId) params.append('divisionId', divisionId);
    const res = await fetch(`/api/payments?${params.toString()}`, { headers: authHeaders() });
    return handleJson(res);
  },

  async reviewPayment(
    paymentId: string,
    decision: 'approved' | 'rejected',
    notes?: string
  ): Promise<{ success: boolean; payment: SubscriptionPayment; membership?: MembershipRecord }> {
    const res = await fetch(`/api/payments/${encodeURIComponent(paymentId)}/review`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({ decision, notes }),
    });
    return handleJson(res);
  },

  async transferPlayerClub(
    playerId: string,
    toTeamId: string,
    notes?: string
  ): Promise<{ success: boolean; player: Player; transfer: PlayerTransferRecord }> {
    const res = await fetch(`/api/players/${encodeURIComponent(playerId)}/transfer`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ toTeamId, notes }),
    });
    return handleJson(res);
  },

  async getMembershipAuditReport(divisionId?: string): Promise<{ success: boolean; report: any }> {
    const url = divisionId ? `/api/ai/membership-audit?divisionId=${encodeURIComponent(divisionId)}` : '/api/ai/membership-audit';
    const res = await fetch(url, { headers: authHeaders() });
    return handleJson(res);
  },
};
