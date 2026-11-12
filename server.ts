import express, { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { db } from './server/db';
import {
  analyzeSquadImage,
  queryAdminAssistant,
  predictMatchSimulation,
  generateMatchPressReport,
  detectFraudulentDuplicates,
} from './server/gemini';
import {
  appCache,
  rateLimiter,
  perfMonitor,
  backupManager,
  aiTaskQueue,
} from './server/concurrency';
import {
  getAllAISubsystems,
  aiPreCheckRegistration,
  runAISquadScanner,
  aiEvaluateTeamHealth,
  aiAssessPlayerProfile,
  aiAnalyzeTournamentStandings,
  aiVerifyMatchResult,
  aiGeneratePowerRankings,
  aiAdviseDisciplinarySanction,
  aiGenerateMembershipAuditReport,
} from './server/aiSubsystems';
import {
  AuthenticatedRequest,
  checkDivisionScope,
  createJwtToken,
  getRolePolicyMatrix,
  removeAdminCredential,
  requireAdminAuth,
  requirePermission,
  requireRole,
  resolveLoginUsername,
  revokeSessionToken,
  sanitizeText,
  securityHeaders,
  setAdminCredential,
  validateImageUpload,
  verifyAdminCredential,
  verifyJwtToken,
} from './server/auth';
import { GeminiModelAlias } from './server/types';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function paginateList<T>(items: T[], req: Request): T[] {
  const pageRaw = req.query.page as string | undefined;
  const limitRaw = req.query.limit as string | undefined;
  if (!pageRaw && !limitRaw) return items;
  const page = Math.max(1, parseInt(pageRaw || '1', 10) || 1);
  const limit = Math.min(200, Math.max(1, parseInt(limitRaw || '50', 10) || 50));
  const start = (page - 1) * limit;
  return items.slice(start, start + limit);
}

function isRequestAdmin(req: Request): boolean {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  return !!verifyJwtToken(token);
}

function scrubPlayerForPublic(player: any) {
  return {
    ...player,
    whatsapp: player.whatsapp ? '***-***-' + player.whatsapp.slice(-4) : '',
    email: '',
  };
}

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  // Security & Body Parsing Middlewares
  app.use(securityHeaders);
  app.use(express.json({ limit: '25mb' }));
  app.use(express.urlencoded({ extended: true, limit: '25mb' }));

  // Performance & Latency Monitor Middleware
  app.use((_req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    perfMonitor.trackConnectionChange(1);
    res.on('finish', () => {
      perfMonitor.trackConnectionChange(-1);
      perfMonitor.recordRequest(Date.now() - start, res.statusCode >= 500);
    });
    next();
  });

  // Reusable Token-Bucket Rate Limiter
  const rateLimit = (maxTokens: number = 60, refillPerSec: number = 2) => {
    return (req: Request, res: Response, next: NextFunction) => {
      const clientIp = (req.headers['x-forwarded-for'] as string) || req.ip || 'client';
      const check = rateLimiter.checkLimit(clientIp, maxTokens, refillPerSec);
      if (!check.allowed) {
        res.status(429).json({
          error: 'تم تجاوز الحد الأقصى للطلبات المتزامنة لحماية الخادم. يرجى الانتظار ثوانٍ معدودة والمحاولة مجدداً.',
        });
        return;
      }
      next();
    };
  };

  // ==========================================
  // ADMIN AUTHENTICATION & RBAC SESSION
  // ==========================================
  app.post('/api/auth/admin/login', rateLimit(12, 0.5), (req: Request, res: Response) => {
    const rawUsername = sanitizeText(req.body.username, 64);
    const username = resolveLoginUsername(rawUsername);
    const password = typeof req.body.password === 'string' ? req.body.password : '';

    if (!username || !password) {
      res.status(400).json({ error: 'يرجى إدخال اسم المستخدم وكلمة المرور.' });
      return;
    }

    const admin = db.getAdminByUsername(username);
    if (!admin || !admin.active || !verifyAdminCredential(username, password)) {
      db.addAuditLog(rawUsername || 'مجهول', 'محاولة دخول فاشلة لبوابة الإدارة', 'AuthGate', 'فشل التحقق');
      res.status(401).json({ error: 'بيانات الدخول غير صحيحة أو الحساب الإداري معطّل.' });
      return;
    }

    const { token, claims, expiresIn } = createJwtToken(admin);
    db.addAuditLog(admin.name, 'تسجيل دخول إداري موثق (JWT HS256)', admin.role, 'بوابة الإدارة المركزية');
    res.json({
      success: true,
      token,
      tokenType: 'Bearer',
      expiresIn,
      admin,
      jwtClaims: claims,
    });
  });

  app.post('/api/auth/admin/logout', (req: Request, res: Response) => {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    if (token) revokeSessionToken(token);
    res.json({ success: true });
  });

  app.get('/api/auth/admin/me', requireAdminAuth, (req: AuthenticatedRequest, res: Response) => {
    res.json({
      success: true,
      admin: req.adminUser,
      jwtClaims: req.jwtClaims,
      roleMatrix: getRolePolicyMatrix(),
    });
  });

  app.get('/api/auth/rbac-matrix', requireAdminAuth, (_req: AuthenticatedRequest, res: Response) => {
    res.json({
      success: true,
      roleMatrix: getRolePolicyMatrix(),
    });
  });

  // ==========================================
  // SYSTEM HEALTH & CONCURRENCY METRICS
  // ==========================================
  app.get('/api/system/health', (_req: Request, res: Response) => {
    const summary = perfMonitor.getHealthSummary();
    res.json({
      success: true,
      data: summary,
    });
  });

  app.get('/api/system/backups', requireAdminAuth, requireRole('president', 'director'), requirePermission('manageBackups'), (_req: Request, res: Response) => {
    res.json({ success: true, backups: backupManager.listBackups() });
  });

  app.post('/api/system/backups/create', requireAdminAuth, requireRole('president', 'director'), requirePermission('manageBackups'), (req: AuthenticatedRequest, res: Response) => {
    const adminName = req.adminUser!.name;
    const filename = backupManager.createBackup(db.getState());
    if (filename) {
      db.addAuditLog(adminName, 'إنشاء نسخة احتياطية فورية لقاعدة البيانات', filename, 'نجاح');
      res.json({ success: true, filename });
    } else {
      res.status(500).json({ error: 'فشل إنشاء النسخة الاحتياطية.' });
    }
  });

  app.post('/api/system/backups/restore', requireAdminAuth, requireRole('president'), requirePermission('manageBackups'), (req: AuthenticatedRequest, res: Response) => {
    const filename = sanitizeText(req.body.filename, 200);
    if (!filename || filename.includes('..') || filename.includes('/')) {
      res.status(400).json({ error: 'اسم ملف النسخة الاحتياطية غير صالح.' });
      return;
    }
    const success = db.restoreFromBackup(filename);
    if (success) {
      db.addAuditLog(req.adminUser!.name, 'استعادة قاعدة البيانات من نسخة احتياطية', filename, 'نجاح الاستعادة');
      res.json({ success: true, message: 'تم استعادة قاعدة البيانات واللوائح بنجاح' });
    } else {
      res.status(500).json({ error: 'فشل استعادة النسخة الاحتياطية' });
    }
  });

  // ==========================================
  // CORE FEDERATION APIS
  // ==========================================

  // System Settings
  app.get('/api/settings', (_req: Request, res: Response) => {
    res.json(db.getSettings());
  });

  app.put('/api/settings', requireAdminAuth, requireRole('president'), requirePermission('manageSettingsAndAI'), (req: AuthenticatedRequest, res: Response) => {
    const incoming = req.body.settings || {};
    const sanitizedSettings: any = {};

    if (typeof incoming.allowRegistration === 'boolean') sanitizedSettings.allowRegistration = incoming.allowRegistration;
    if (typeof incoming.firstDivisionMinRating === 'number') {
      sanitizedSettings.firstDivisionMinRating = Math.max(1000, Math.min(5000, incoming.firstDivisionMinRating));
    }
    if (typeof incoming.secondDivisionMinRating === 'number') {
      sanitizedSettings.secondDivisionMinRating = Math.max(1000, Math.min(5000, incoming.secondDivisionMinRating));
    }
    if (typeof incoming.whatsappApiEnabled === 'boolean') sanitizedSettings.whatsappApiEnabled = incoming.whatsappApiEnabled;
    if (typeof incoming.whatsappWebhookUrl === 'string') sanitizedSettings.whatsappWebhookUrl = sanitizeText(incoming.whatsappWebhookUrl, 400);
    if (typeof incoming.federationOfficialPhone === 'string') sanitizedSettings.federationOfficialPhone = sanitizeText(incoming.federationOfficialPhone, 40);
    if (typeof incoming.federationOfficialEmail === 'string') sanitizedSettings.federationOfficialEmail = sanitizeText(incoming.federationOfficialEmail, 120);
    if (typeof incoming.maintenanceMode === 'boolean') sanitizedSettings.maintenanceMode = incoming.maintenanceMode;
    if (incoming.socialChannels && typeof incoming.socialChannels === 'object') {
      sanitizedSettings.socialChannels = {
        whatsappChannelName: sanitizeText(incoming.socialChannels.whatsappChannelName, 120),
        whatsappChannelUrl: sanitizeText(incoming.socialChannels.whatsappChannelUrl, 400),
        tiktokHandle: sanitizeText(incoming.socialChannels.tiktokHandle, 80),
        tiktokUrl: sanitizeText(incoming.socialChannels.tiktokUrl, 400),
        facebookPageName: sanitizeText(incoming.socialChannels.facebookPageName, 120),
        facebookUrl: sanitizeText(incoming.socialChannels.facebookUrl || incoming.socialChannels.facebookPageUrl, 400),
      };
    }
    if (incoming.aiConfig && typeof incoming.aiConfig === 'object') {
      const allowedModels: GeminiModelAlias[] = ['gemini-4-hydrogen', 'gemini-4-argon', 'gemini-4-carbon', 'gemini-3.1-flash-lite'];
      sanitizedSettings.aiConfig = {
        activeModel: allowedModels.includes(incoming.aiConfig.activeModel) ? incoming.aiConfig.activeModel : 'gemini-4-hydrogen',
        enableSquadVision: typeof incoming.aiConfig.enableSquadVision === 'boolean' ? incoming.aiConfig.enableSquadVision : true,
        enableResultVision: typeof incoming.aiConfig.enableResultVision === 'boolean' ? incoming.aiConfig.enableResultVision : true,
        enableCentralAssistant: typeof incoming.aiConfig.enableCentralAssistant === 'boolean' ? incoming.aiConfig.enableCentralAssistant : true,
      };
    }

    const updated = db.updateSettings(sanitizedSettings, req.adminUser!.name);
    appCache.clear();
    res.json({ success: true, settings: updated });
  });

  // Update AI Runtime Config specifically (President Exclusive)
  app.put('/api/ai/config', requireAdminAuth, requireRole('president'), requirePermission('manageSettingsAndAI'), (req: AuthenticatedRequest, res: Response) => {
    const allowedModels: GeminiModelAlias[] = ['gemini-4-hydrogen', 'gemini-4-argon', 'gemini-4-carbon', 'gemini-3.1-flash-lite'];
    const current = db.getSettings().aiConfig;
    const nextAiConfig = {
      activeModel: allowedModels.includes(req.body.activeModel) ? req.body.activeModel : current.activeModel,
      enableSquadVision: typeof req.body.enableSquadVision === 'boolean' ? req.body.enableSquadVision : current.enableSquadVision,
      enableResultVision: typeof req.body.enableResultVision === 'boolean' ? req.body.enableResultVision : current.enableResultVision,
      enableCentralAssistant: typeof req.body.enableCentralAssistant === 'boolean' ? req.body.enableCentralAssistant : current.enableCentralAssistant,
    };
    const updated = db.updateSettings({ aiConfig: nextAiConfig }, req.adminUser!.name);
    appCache.clear();
    res.json({ success: true, aiConfig: updated.aiConfig });
  });

  // Divisions & Tournaments (Cached)
  app.get('/api/divisions', (_req: Request, res: Response) => {
    const cached = appCache.get('divisions');
    if (cached) {
      res.json(cached);
      return;
    }
    const data = db.getDivisions();
    appCache.set('divisions', data, 60);
    res.json(data);
  });

  app.get('/api/tournaments', (req: Request, res: Response) => {
    const divisionId = req.query.divisionId as string | undefined;
    const cacheKey = `tournaments_${divisionId || 'all'}`;
    const cached = appCache.get(cacheKey);
    if (cached) {
      res.json(cached);
      return;
    }
    const data = db.getTournaments(divisionId);
    appCache.set(cacheKey, data, 60);
    res.json(data);
  });

  app.put('/api/tournaments/:id', requireAdminAuth, requireRole('president', 'director'), requirePermission('manageTournamentsAndRules'), (req: AuthenticatedRequest, res: Response) => {
    const tour = db.getTournaments().find((t) => t.id === req.params.id);
    if (!tour) {
      res.status(404).json({ error: 'البطولة غير موجودة.' });
      return;
    }
    if (!checkDivisionScope(req.adminUser, tour.divisionId)) {
      res.status(403).json({ error: 'ليس لديك صلاحية تعديل بطولة خارج نطاق اتحادك الوطني.' });
      return;
    }

    const partial: any = {};
    if (typeof req.body.nameAr === 'string' && req.body.nameAr.trim()) partial.nameAr = sanitizeText(req.body.nameAr, 160);
    if (typeof req.body.season === 'string' && req.body.season.trim()) partial.season = sanitizeText(req.body.season, 30);
    if (['upcoming', 'ongoing', 'completed'].includes(req.body.status)) partial.status = req.body.status;
    if (typeof req.body.trophyName === 'string' && req.body.trophyName.trim()) partial.trophyName = sanitizeText(req.body.trophyName, 120);
    if (typeof req.body.rulesSummary === 'string') partial.rulesSummary = sanitizeText(req.body.rulesSummary, 600);
    if (typeof req.body.teamsCount === 'number') partial.teamsCount = Math.max(2, Math.min(64, req.body.teamsCount));
    if (req.body.scoringRules && typeof req.body.scoringRules === 'object') {
      partial.scoringRules = {
        winPoints: Math.max(1, Math.min(10, Number(req.body.scoringRules.winPoints ?? 3))),
        drawPoints: Math.max(0, Math.min(5, Number(req.body.scoringRules.drawPoints ?? 1))),
        lossPoints: Math.max(0, Math.min(3, Number(req.body.scoringRules.lossPoints ?? 0))),
      };
    }

    const updated = db.updateTournament(req.params.id, partial, req.adminUser!.name);
    appCache.clear();
    res.json({ success: true, tournament: updated });
  });

  // Teams & Standings (Cached + Optional Pagination)
  app.get('/api/teams', (req: Request, res: Response) => {
    const tournamentId = req.query.tournamentId as string | undefined;
    const divisionId = req.query.divisionId as string | undefined;
    const cacheKey = `teams_${tournamentId || 'all'}_${divisionId || 'all'}`;
    let data = appCache.get(cacheKey) as any[] | undefined;
    if (!data) {
      data = db.getTeams(tournamentId, divisionId);
      appCache.set(cacheKey, data, 30);
    }
    res.json(paginateList(data, req));
  });

  app.put('/api/teams/:id/roster', requireAdminAuth, requireRole('president', 'director', 'organizer'), requirePermission('manageRegistrations'), (req: AuthenticatedRequest, res: Response) => {
    const team = db.getTeams().find((t) => t.id === req.params.id);
    if (!team) {
      res.status(404).json({ error: 'النادي غير موجود.' });
      return;
    }
    if (!checkDivisionScope(req.adminUser, team.divisionId)) {
      res.status(403).json({ error: 'ليس لديك صلاحية تعديل قائمة نادٍ خارج اتحادك الوطني.' });
      return;
    }
    const roster = Array.isArray(req.body.roster)
      ? req.body.roster.slice(0, 30).map((p: any, idx: number) => ({
          id: sanitizeText(p.id || `rp_${idx}`, 40),
          name: sanitizeText(p.name, 80),
          position: sanitizeText(p.position || 'CMF', 10),
          rating: Math.max(50, Math.min(115, Number(p.rating) || 95)),
          isStarter: p.isStarter !== false,
        })).filter((p: any) => p.name.length > 0)
      : [];

    const updated = db.updateTeamRoster(req.params.id, roster, req.adminUser!.name);
    appCache.clear();
    res.json({ success: true, team: updated });
  });

  // Players & Squads
  app.get('/api/players', (req: Request, res: Response) => {
    const divisionId = req.query.divisionId as string | undefined;
    const list = db.getPlayers(divisionId);
    const admin = isRequestAdmin(req);
    const output = admin ? list : list.map(scrubPlayerForPublic);
    res.json(paginateList(output, req));
  });

  app.get('/api/players/:id', (req: Request, res: Response) => {
    const player = db.getPlayerById(req.params.id);
    if (!player) {
      res.status(404).json({ error: 'Player not found' });
      return;
    }
    const edits = db.getSquadEdits(req.params.id);
    const admin = isRequestAdmin(req);
    res.json({ player: admin ? player : scrubPlayerForPublic(player), edits });
  });

  // Player modifies their squad (Rule: only once, unless unlocked by admin)
  app.post('/api/players/:id/squad', rateLimit(10, 1), (req: Request, res: Response) => {
    const { newRating, newImageUrl, formation, notes, newRoster } = req.body;
    if (!newRating || !newImageUrl) {
      res.status(400).json({ error: 'يرجى إرفاق تقييم التشكيلة وصورة الإثبات.' });
      return;
    }
    const imgCheck = validateImageUpload(newImageUrl);
    if (!imgCheck.valid) {
      res.status(400).json({ error: imgCheck.reason });
      return;
    }

    const sanitizedRoster = Array.isArray(newRoster)
      ? newRoster.slice(0, 30).map((p: any, i: number) => ({
          id: sanitizeText(p.id || `rp_${i}`, 40),
          name: sanitizeText(p.name, 80),
          position: sanitizeText(p.position || 'CMF', 10),
          rating: Math.max(50, Math.min(115, Number(p.rating) || 95)),
          isStarter: p.isStarter !== false,
        })).filter((p: any) => p.name.length > 0)
      : undefined;

    const result = db.modifyPlayerSquad(
      req.params.id,
      Number(newRating),
      newImageUrl,
      sanitizeText(formation, 20),
      sanitizeText(notes, 300),
      sanitizedRoster
    );
    if (!result.success) {
      res.status(403).json(result);
      return;
    }
    appCache.clear();
    res.json(result);
  });

  // Admin unlocks / locks squad edit for a specific player (President & Director)
  app.post('/api/players/:id/unlock-squad', requireAdminAuth, requireRole('president', 'director'), requirePermission('manageSquadLocks'), (req: AuthenticatedRequest, res: Response) => {
    const { locked } = req.body;
    const player = db.getPlayerById(req.params.id);
    if (!player) {
      res.status(404).json({ error: 'اللاعب غير موجود.' });
      return;
    }
    if (!checkDivisionScope(req.adminUser, player.divisionId)) {
      res.status(403).json({ error: 'خارج نطاق صلاحية اتحادك الوطني.' });
      return;
    }
    const success = db.setSquadEditLock(req.params.id, !!locked, req.adminUser!.name);
    if (!success) {
      res.status(404).json({ error: 'Player not found' });
      return;
    }
    res.json({ success: true, locked: !!locked });
  });

  // Player Personal Photo Update
  app.post('/api/players/:id/photo', rateLimit(10, 1), (req: Request, res: Response) => {
    const { photoUrl } = req.body;
    if (!photoUrl) {
      res.status(400).json({ error: 'يرجى إرفاق صورة اللاعب.' });
      return;
    }
    const imgCheck = validateImageUpload(photoUrl);
    if (!imgCheck.valid) {
      res.status(400).json({ error: imgCheck.reason });
      return;
    }
    const updated = db.updatePlayerPhoto(req.params.id, photoUrl);
    if (!updated) {
      res.status(404).json({ error: 'اللاعب غير موجود.' });
      return;
    }
    appCache.clear();
    res.json({ success: true, photoUrl: updated.photoUrl });
  });

  // Permanent Athlete Career Dossier (PII scrubbed for public requests)
  app.get('/api/players/:id/career', (req: Request, res: Response) => {
    const dossier = db.getPlayerCareerDossier(req.params.id, isRequestAdmin(req));
    if (!dossier) {
      res.status(404).json({ error: 'اللاعب غير موجود.' });
      return;
    }
    res.json({ success: true, ...dossier });
  });

  // ==========================================
  // PUBLIC QR CARD VERIFICATION (ZERO PII)
  // ==========================================
  app.get('/api/verify/:token', (req: Request, res: Response) => {
    const result = db.verifyMembershipToken(sanitizeText(req.params.token, 120));
    if (!result.found) {
      res.status(404).json(result);
      return;
    }
    res.json(result);
  });

  // ==========================================
  // DIGITAL MEMBERSHIPS & SUBSCRIPTIONS (PRESIDENT / DIRECTOR ONLY)
  // ==========================================
  app.get('/api/memberships/settings', (_req: Request, res: Response) => {
    res.json(db.getMembershipSettings());
  });

  app.put('/api/memberships/settings', requireAdminAuth, requireRole('president'), (req: AuthenticatedRequest, res: Response) => {
    const body = req.body || {};
    const partial: any = {};
    if (typeof body.freeFirstSeason === 'boolean') partial.freeFirstSeason = body.freeFirstSeason;
    if (typeof body.renewalFee === 'number') partial.renewalFee = Math.max(0, Math.min(5000, body.renewalFee));
    if (typeof body.currency === 'string' && body.currency.trim()) partial.currency = sanitizeText(body.currency, 10).toUpperCase();
    if (typeof body.feeEffectiveSeason === 'string' && body.feeEffectiveSeason.trim()) partial.feeEffectiveSeason = sanitizeText(body.feeEffectiveSeason, 30);
    if (typeof body.feeEffectiveDate === 'string' && body.feeEffectiveDate.trim()) partial.feeEffectiveDate = sanitizeText(body.feeEffectiveDate, 30);
    if (typeof body.membershipDurationDays === 'number') partial.membershipDurationDays = Math.max(30, Math.min(1825, body.membershipDurationDays));
    if (typeof body.gracePeriodDays === 'number') partial.gracePeriodDays = Math.max(0, Math.min(180, body.gracePeriodDays));
    if (typeof body.renewalsEnabled === 'boolean') partial.renewalsEnabled = body.renewalsEnabled;
    if (typeof body.vodafoneCashNumber === 'string') partial.vodafoneCashNumber = sanitizeText(body.vodafoneCashNumber, 80);
    if (typeof body.instaPayAddress === 'string') partial.instaPayAddress = sanitizeText(body.instaPayAddress, 120);

    const updated = db.updateMembershipSettings(partial, req.adminUser!.name);
    res.json({ success: true, membershipSettings: updated });
  });

  app.get('/api/memberships', requireAdminAuth, requireRole('president', 'director'), (req: AuthenticatedRequest, res: Response) => {
    const status = req.query.status as string | undefined;
    const divisionId = req.query.divisionId as string | undefined;
    const list = db.getMemberships(status, divisionId);
    res.json(paginateList(list, req));
  });

  app.post('/api/memberships/issue', requireAdminAuth, requireRole('president', 'director'), (req: AuthenticatedRequest, res: Response) => {
    const playerId = sanitizeText(req.body.playerId, 60);
    if (!playerId) {
      res.status(400).json({ error: 'يرجى تحديد معرف اللاعب.' });
      return;
    }
    const mem = db.issueMembershipForPlayer(playerId, req.adminUser!.name);
    if (!mem) {
      res.status(404).json({ error: 'اللاعب غير موجود.' });
      return;
    }
    res.json({ success: true, membership: mem });
  });

  app.post('/api/memberships/:id/reissue', requireAdminAuth, requireRole('president', 'director'), (req: AuthenticatedRequest, res: Response) => {
    const reason = sanitizeText(req.body.reason || '', 300);
    const mem = db.reissueMembershipCard(req.params.id, req.adminUser!.name, reason);
    if (!mem) {
      res.status(404).json({ error: 'بطاقة العضوية غير موجودة.' });
      return;
    }
    res.json({ success: true, membership: mem });
  });

  app.post('/api/memberships/:id/revoke', requireAdminAuth, requireRole('president', 'director'), (req: AuthenticatedRequest, res: Response) => {
    const reason = sanitizeText(req.body.reason || 'إلغاء البطاقة من لوحة الإدارة', 300);
    const mem = db.revokeMembershipCard(req.params.id, req.adminUser!.name, reason);
    if (!mem) {
      res.status(404).json({ error: 'بطاقة العضوية غير موجودة.' });
      return;
    }
    res.json({ success: true, membership: mem });
  });

  app.put('/api/memberships/:id/status', requireAdminAuth, requireRole('president', 'director'), (req: AuthenticatedRequest, res: Response) => {
    const action = req.body.action;
    if (!['suspend', 'activate', 'extend'].includes(action)) {
      res.status(400).json({ error: 'الإجراء المطلوب غير صالح.' });
      return;
    }
    const mem = db.updateMembershipStatus(req.params.id, action, req.adminUser!.name, {
      extendDays: req.body.extendDays ? Number(req.body.extendDays) : undefined,
      reason: sanitizeText(req.body.reason || '', 300),
    });
    if (!mem) {
      res.status(404).json({ error: 'بطاقة العضوية غير موجودة.' });
      return;
    }
    res.json({ success: true, membership: mem });
  });

  app.post('/api/memberships/check-expirations', requireAdminAuth, requireRole('president', 'director'), (req: AuthenticatedRequest, res: Response) => {
    const result = db.runExpiringMembershipAlerts(req.adminUser!.name);
    res.json({ success: true, ...result });
  });

  // ==========================================
  // SUBSCRIPTION PAYMENTS & TRANSFERS
  // ==========================================
  app.post('/api/payments/submit', rateLimit(8, 0.5), (req: Request, res: Response) => {
    const playerId = sanitizeText(req.body.playerId, 60);
    const paymentMethod = req.body.paymentMethod;
    const senderReference = sanitizeText(req.body.senderReference, 80);
    const transactionRef = sanitizeText(req.body.transactionRef, 80);
    const proofImageUrl = req.body.proofImageUrl;
    const amount = Number(req.body.amount);
    const season = sanitizeText(req.body.season || '', 30) || undefined;

    if (!playerId || !['vodafone_cash', 'instapay', 'visa'].includes(paymentMethod) || !senderReference || !transactionRef) {
      res.status(400).json({ error: 'يرجى استكمال كافة بيانات الدفع ومرجع العملية.' });
      return;
    }

    if (proofImageUrl) {
      const check = validateImageUpload(proofImageUrl);
      if (!check.valid) {
        res.status(400).json({ error: check.reason });
        return;
      }
    }

    const result = db.submitSubscriptionPayment({
      playerId,
      paymentMethod,
      amount,
      senderReference,
      transactionRef,
      proofImageUrl,
      season,
    });

    if (!result.success) {
      res.status(result.statusCode || 400).json({ error: result.error });
      return;
    }
    res.json({ success: true, payment: result.payment });
  });

  app.get('/api/payments', requireAdminAuth, requireRole('president', 'director'), (req: AuthenticatedRequest, res: Response) => {
    const status = req.query.status as string | undefined;
    const divisionId = req.query.divisionId as string | undefined;
    res.json(paginateList(db.getPayments(status, divisionId), req));
  });

  app.put('/api/payments/:id/review', requireAdminAuth, requireRole('president', 'director'), (req: AuthenticatedRequest, res: Response) => {
    const decision = req.body.decision;
    if (!['approved', 'rejected'].includes(decision)) {
      res.status(400).json({ error: 'قرار المراجعة يجب أن يكون approved أو rejected.' });
      return;
    }
    const notes = sanitizeText(req.body.notes || '', 400);
    const result = db.reviewSubscriptionPayment(req.params.id, decision, req.adminUser!.name, notes);
    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }
    res.json(result);
  });

  app.post('/api/players/:id/transfer', requireAdminAuth, requireRole('president', 'director'), (req: AuthenticatedRequest, res: Response) => {
    const toTeamId = sanitizeText(req.body.toTeamId, 80);
    const notes = sanitizeText(req.body.notes || '', 300);
    if (!toTeamId) {
      res.status(400).json({ error: 'يرجى تحديد النادي الجديد المستهدف.' });
      return;
    }
    const result = db.transferPlayerToClub(req.params.id, toTeamId, req.adminUser!.name, notes);
    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }
    appCache.clear();
    res.json(result);
  });

  // Registrations (Admin-only list; Public duplicate check & submission)
  app.get('/api/registrations', requireAdminAuth, requireRole('president', 'director', 'organizer'), requirePermission('manageRegistrations'), (req: AuthenticatedRequest, res: Response) => {
    const status = req.query.status as string | undefined;
    const requestedDiv = req.query.divisionId as string | undefined;
    const scopeDiv =
      req.adminUser?.role === 'organizer'
        ? req.adminUser.assignedDivisionId || '__none__'
        : requestedDiv;
    const list = db.getRegistrations(status, scopeDiv);
    res.json(paginateList(list, req));
  });

  app.get('/api/registrations/check', (req: Request, res: Response) => {
    const whatsapp = sanitizeText(req.query.whatsapp, 30);
    const gamerTag = sanitizeText(req.query.gamerTag, 60);
    const result = db.checkDuplicateRegistration(whatsapp, gamerTag);
    if (!result.exists) {
      res.json({ exists: false });
      return;
    }
    res.json({
      exists: true,
      reason: result.reason,
      existingPlayer: result.existingPlayer ? scrubPlayerForPublic(result.existingPlayer) : undefined,
      existingRegistration: result.existingRegistration
        ? {
            id: result.existingRegistration.id,
            fullName: result.existingRegistration.fullName,
            gamerTag: result.existingRegistration.gamerTag,
            teamName: result.existingRegistration.teamName,
            divisionId: result.existingRegistration.divisionId,
            requestedTier: result.existingRegistration.requestedTier,
            status: result.existingRegistration.status,
            createdAt: result.existingRegistration.createdAt,
          }
        : undefined,
    });
  });

  app.post('/api/registrations', rateLimit(12, 1), (req: Request, res: Response) => {
    const fullName = sanitizeText(req.body.fullName, 100);
    const gamerTag = sanitizeText(req.body.gamerTag, 60);
    const whatsapp = sanitizeText(req.body.whatsapp, 30);
    const country = sanitizeText(req.body.country || 'المملكة العربية السعودية', 80);
    const divisionId = sanitizeText(req.body.divisionId, 40);
    const realClubId = sanitizeText(req.body.realClubId, 60);
    const teamName = sanitizeText(req.body.teamName, 100);
    const squadImageUrl = req.body.squadImageUrl;
    const proofImageUrl = req.body.proofImageUrl || squadImageUrl;
    const photoUrl = req.body.photoUrl;

    if (!fullName || !gamerTag || !whatsapp || !divisionId || !teamName || !squadImageUrl) {
      res.status(400).json({ error: 'الرجاء استكمال جميع الحقول المطلوبة لطلب التسجيل واختيار ناديك الرسمي' });
      return;
    }

    const squadCheck = validateImageUpload(squadImageUrl);
    if (!squadCheck.valid) {
      res.status(400).json({ error: squadCheck.reason });
      return;
    }
    if (proofImageUrl && proofImageUrl !== squadImageUrl) {
      const proofCheck = validateImageUpload(proofImageUrl);
      if (!proofCheck.valid) {
        res.status(400).json({ error: proofCheck.reason });
        return;
      }
    }
    if (photoUrl) {
      const photoCheck = validateImageUpload(photoUrl);
      if (!photoCheck.valid) {
        res.status(400).json({ error: photoCheck.reason });
        return;
      }
    }

    const socialVerification = req.body.socialVerification
      ? {
          whatsappFollowed: !!req.body.socialVerification.whatsappFollowed,
          tiktokFollowed: !!req.body.socialVerification.tiktokFollowed,
          facebookFollowed: !!req.body.socialVerification.facebookFollowed,
          confirmedAt: new Date().toISOString(),
          method:
            (proofImageUrl && proofImageUrl !== squadImageUrl) ||
            req.body.socialVerification.method === 'self_attested_with_proof'
              ? ('self_attested_with_proof' as const)
              : ('self_attested' as const),
        }
      : undefined;

    const extractedRoster = Array.isArray(req.body.extractedRoster)
      ? req.body.extractedRoster.slice(0, 30).map((p: any, i: number) => ({
          id: sanitizeText(p.id || `rp_${i}`, 40),
          name: sanitizeText(p.name, 80),
          position: sanitizeText(p.position || 'CMF', 10),
          rating: Math.max(50, Math.min(115, Number(p.rating) || 95)),
          isStarter: p.isStarter !== false,
        })).filter((p: any) => p.name.length > 0)
      : undefined;

    const result = db.addRegistration({
      fullName,
      gamerTag,
      whatsapp,
      country,
      divisionId,
      requestedTier: Number(req.body.requestedTier) === 2 ? 2 : 1,
      realClubId,
      teamName,
      squadImageUrl,
      proofImageUrl,
      photoUrl,
      termsAccepted: !!req.body.termsAccepted,
      aiAnalysis: req.body.aiAnalysis,
      extractedRoster,
      socialVerification,
    });

    if (!result.success) {
      res.status(409).json({ error: result.error });
      return;
    }

    appCache.clear();
    res.json({ success: true, registration: result.registration });
  });

  app.put('/api/registrations/:id/status', requireAdminAuth, requireRole('president', 'director', 'organizer'), requirePermission('manageRegistrations'), (req: AuthenticatedRequest, res: Response) => {
    const { status, notes } = req.body;
    if (!['approved', 'rejected', 'needs_review'].includes(status)) {
      res.status(400).json({ error: 'حالة المراجعة غير صالحة.' });
      return;
    }

    const existing = db.getRegistrations().find((r) => r.id === req.params.id);
    if (!existing) {
      res.status(404).json({ error: 'طلب التسجيل غير موجود.' });
      return;
    }
    if (!checkDivisionScope(req.adminUser, existing.divisionId)) {
      res.status(403).json({ error: 'هذا الطلب يتبع اتحاداً وطنياً خارج نطاق صلاحياتك.' });
      return;
    }

    const updated = db.updateRegistrationStatus(req.params.id, status, req.adminUser!.name, sanitizeText(notes, 400));
    appCache.clear();
    res.json({ success: true, registration: updated });
  });

  // Fixtures & Match Results
  app.get('/api/fixtures', (req: Request, res: Response) => {
    const tournamentId = req.query.tournamentId as string | undefined;
    const status = req.query.status as string | undefined;
    const divisionId = req.query.divisionId as string | undefined;
    const list = db.getFixtures(tournamentId, status, divisionId);
    res.json(paginateList(list, req));
  });

  app.post('/api/fixtures', requireAdminAuth, requireRole('president', 'director', 'organizer'), requirePermission('manageMatchesAndResults'), (req: AuthenticatedRequest, res: Response) => {
    const tournamentId = sanitizeText(req.body.tournamentId, 60);
    const divisionId = sanitizeText(req.body.divisionId, 40) || undefined;
    const roundName = sanitizeText(req.body.roundName, 80);
    const homeTeamId = sanitizeText(req.body.homeTeamId, 60);
    const awayTeamId = sanitizeText(req.body.awayTeamId, 60);
    const matchDate = sanitizeText(req.body.matchDate, 30);
    const matchTime = sanitizeText(req.body.matchTime, 20);
    const assignedReferee = sanitizeText(req.body.assignedReferee, 80);
    const streamUrl = sanitizeText(req.body.streamUrl, 300) || undefined;

    if (!tournamentId || !roundName || !homeTeamId || !awayTeamId || !matchDate || !matchTime) {
      res.status(400).json({ error: 'يرجى استكمال كافة بيانات جدولة المباراة.' });
      return;
    }

    const tour = db.getTournaments().find((t) => t.id === tournamentId);
    if (!tour) {
      res.status(404).json({ error: 'البطولة المحددة غير موجودة.' });
      return;
    }
    if (!checkDivisionScope(req.adminUser, divisionId || tour.divisionId)) {
      res.status(403).json({ error: 'لا يمكنك جدولة مباراة خارج نطاق اتحادك الوطني.' });
      return;
    }

    const result = db.createFixture(
      {
        tournamentId,
        divisionId: divisionId || tour.divisionId,
        roundName,
        homeTeamId,
        awayTeamId,
        matchDate,
        matchTime,
        assignedReferee: assignedReferee || req.adminUser!.name,
        streamUrl,
      },
      req.adminUser!.name
    );

    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }
    appCache.clear();
    res.json({ success: true, fixture: result.fixture });
  });

  app.post('/api/fixtures/result', requireAdminAuth, requireRole('president', 'director', 'organizer'), requirePermission('manageMatchesAndResults'), rateLimit(20, 2), (req: AuthenticatedRequest, res: Response) => {
    const { fixtureId, homeScore, awayScore, events, stats, resultScreenshotUrl, aiResultAudit } = req.body;
    if (!fixtureId || homeScore === undefined || awayScore === undefined) {
      res.status(400).json({ error: 'يرجى إدخال النتيجة كاملة.' });
      return;
    }

    const fixture = db.getFixtures().find((f) => f.id === fixtureId);
    if (!fixture) {
      res.status(404).json({ error: 'المباراة غير موجودة.' });
      return;
    }
    if (!checkDivisionScope(req.adminUser, fixture.divisionId)) {
      res.status(403).json({ error: 'لا تملك صلاحية رصد نتائج خارج اتحادك الوطني.' });
      return;
    }

    if (resultScreenshotUrl) {
      const check = validateImageUpload(resultScreenshotUrl);
      if (!check.valid) {
        res.status(400).json({ error: check.reason });
        return;
      }
    }

    const success = db.recordMatchResult(
      fixtureId,
      Math.max(0, Number(homeScore)),
      Math.max(0, Number(awayScore)),
      req.adminUser!.name,
      events,
      { stats, resultScreenshotUrl, aiResultAudit }
    );

    if (!success) {
      res.status(404).json({ error: 'Fixture not found' });
      return;
    }
    appCache.clear();
    res.json({ success: true });
  });

  // Disciplinary Actions
  app.get('/api/disciplinary', (req: Request, res: Response) => {
    const divisionId = req.query.divisionId as string | undefined;
    res.json(db.getDisciplinary(divisionId));
  });

  app.post('/api/disciplinary', requireAdminAuth, requireRole('president', 'director'), requirePermission('manageDiscipline'), (req: AuthenticatedRequest, res: Response) => {
    const playerId = sanitizeText(req.body.playerId, 60);
    const teamId = sanitizeText(req.body.teamId, 60) || undefined;
    const divisionId = sanitizeText(req.body.divisionId, 40) || undefined;
    const description = sanitizeText(req.body.description, 500);
    if (!playerId || !description) {
      res.status(400).json({ error: 'Missing disciplinary details' });
      return;
    }

    const created = db.addDisciplinaryAction(
      {
        playerId,
        teamId,
        divisionId,
        violationType: req.body.violationType || 'fair_play',
        severity: req.body.severity || 'warning',
        pointsDeducted: req.body.pointsDeducted ? Number(req.body.pointsDeducted) : undefined,
        suspensionMatches: req.body.suspensionMatches ? Number(req.body.suspensionMatches) : undefined,
        description,
        issuedBy: req.adminUser!.name,
        status: 'active',
      },
      req.adminUser!.name
    );

    appCache.clear();
    res.json({ success: true, action: created });
  });

  // News CMS
  app.get('/api/news', (req: Request, res: Response) => {
    const divisionId = req.query.divisionId as string | undefined;
    const cacheKey = `news_${divisionId || 'all'}`;
    const cached = appCache.get(cacheKey);
    if (cached) {
      res.json(cached);
      return;
    }
    const data = db.getNews(divisionId);
    appCache.set(cacheKey, data, 60);
    res.json(data);
  });

  app.post('/api/news', requireAdminAuth, requireRole('president', 'director'), requirePermission('manageNewsAndStore'), (req: AuthenticatedRequest, res: Response) => {
    const title = sanitizeText(req.body.title, 200);
    const summary = sanitizeText(req.body.summary || title, 400);
    const content = sanitizeText(req.body.content, 4000);
    const divisionId = sanitizeText(req.body.divisionId, 40) || undefined;
    const imageUrl = req.body.imageUrl || '/src/assets/images/ioef_hero_championship_1794337420029.jpg';

    if (!title || !content) {
      res.status(400).json({ error: 'يرجى إدخال عنوان ومحتوى الخبر.' });
      return;
    }

    const imgCheck = validateImageUpload(imageUrl);
    if (!imgCheck.valid) {
      res.status(400).json({ error: imgCheck.reason });
      return;
    }

    const created = db.addNews(
      {
        divisionId,
        title,
        summary,
        content,
        category: req.body.category || 'announcement',
        imageUrl,
        author: req.adminUser!.name,
        isImportant: !!req.body.isImportant,
      },
      req.adminUser!.name
    );

    appCache.clear();
    res.json({ success: true, news: created });
  });

  // Dynamic Regulations CMS
  app.get('/api/rules', (_req: Request, res: Response) => {
    res.json(db.getRegulations());
  });

  app.put('/api/rules', requireAdminAuth, requireRole('president', 'director'), requirePermission('manageTournamentsAndRules'), (req: AuthenticatedRequest, res: Response) => {
    const allowedCategories = ['technical', 'registration', 'matches', 'discipline', 'promotion'];
    const articles = Array.isArray(req.body.articles)
      ? req.body.articles.map((a: any, idx: number) => ({
          id: sanitizeText(a.id || `reg_${idx + 1}`, 40),
          chapterNumber: sanitizeText(a.chapterNumber || `الباب ${idx + 1}`, 40),
          titleAr: sanitizeText(a.titleAr || a.title, 180),
          subtitleAr: sanitizeText(a.subtitleAr || a.summary || '', 240),
          category: allowedCategories.includes(a.category) ? a.category : 'technical',
          content: sanitizeText(a.content || '', 3000),
          updatedAt: new Date().toISOString().split('T')[0],
        })).filter((a: any) => a.titleAr.length > 0 && a.content.length > 0)
      : [];

    const updated = db.updateRegulations(articles, req.adminUser!.name);
    res.json({ success: true, articles: updated });
  });

  // Store & Orders
  app.get('/api/store/products', (_req: Request, res: Response) => {
    res.json(db.getStoreProducts());
  });

  app.get('/api/store/orders', requireAdminAuth, requireRole('president', 'director'), requirePermission('manageNewsAndStore'), (_req: Request, res: Response) => {
    res.json(db.getOrders());
  });

  app.post('/api/store/orders', rateLimit(15, 1), (req: Request, res: Response) => {
    const productId = sanitizeText(req.body.productId, 60);
    const productTitle = sanitizeText(req.body.productTitle, 180);
    const customerName = sanitizeText(req.body.customerName, 100);
    const customerPhone = sanitizeText(req.body.customerPhone, 30);
    const customerEmail = sanitizeText(req.body.customerEmail || '', 120);
    const shippingAddress = sanitizeText(req.body.shippingAddress || 'تسليم رقمي / شحن مباشر', 240);

    if (!productId || !customerName || !customerPhone || !req.body.totalPrice) {
      res.status(400).json({ error: 'يرجى استكمال كافة الحقول المطلوبة لإتمام الطلب.' });
      return;
    }

    const created = db.createOrder({
      productId,
      productTitle,
      customerName,
      customerPhone,
      customerEmail,
      shippingAddress,
      totalPrice: Number(req.body.totalPrice),
      currency: sanitizeText(req.body.currency || 'USD', 10),
      paymentMethod: req.body.paymentMethod || 'bank_transfer',
    });

    res.json({ success: true, order: created });
  });

  app.put('/api/store/orders/:id/status', requireAdminAuth, requireRole('president', 'director'), requirePermission('manageNewsAndStore'), (req: AuthenticatedRequest, res: Response) => {
    const status = req.body.status;
    if (!['pending', 'processing', 'shipped', 'completed', 'cancelled'].includes(status)) {
      res.status(400).json({ error: 'حالة الطلب غير صالحة.' });
      return;
    }
    const success = db.updateOrderStatus(req.params.id, status, req.adminUser!.name);
    if (!success) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }
    res.json({ success: true });
  });

  // Support Tickets API
  app.get('/api/support/tickets', requireAdminAuth, requireRole('president', 'director', 'organizer'), requirePermission('manageRegistrations'), (req: AuthenticatedRequest, res: Response) => {
    const status = req.query.status as string | undefined;
    const scopeDiv =
      req.adminUser?.role === 'organizer'
        ? req.adminUser.assignedDivisionId || '__none__'
        : undefined;
    res.json(db.getSupportTickets(status, scopeDiv));
  });

  app.post('/api/support/tickets', rateLimit(10, 1), (req: Request, res: Response) => {
    const senderName = sanitizeText(req.body.senderName, 100);
    const senderContact = sanitizeText(req.body.senderContact, 80);
    const allowedSubjects = ['match_dispute', 'registration_inquiry', 'squad_appeal', 'general'] as const;
    const rawSubject = sanitizeText(req.body.ticketSubject || 'general', 60);
    const ticketSubject = (allowedSubjects as readonly string[]).includes(rawSubject)
      ? (rawSubject as (typeof allowedSubjects)[number])
      : 'general';
    const ticketDetails = sanitizeText(req.body.ticketDetails, 2000);
    const divisionId = sanitizeText(req.body.divisionId, 40) || undefined;

    if (!senderName || !senderContact || !ticketDetails) {
      res.status(400).json({ error: 'Missing required ticket fields' });
      return;
    }

    const created = db.addSupportTicket({
      divisionId,
      senderName,
      senderContact,
      ticketSubject,
      ticketDetails,
    });

    res.json({ success: true, ticket: created });
  });

  app.put('/api/support/tickets/:id/resolve', requireAdminAuth, requireRole('president', 'director', 'organizer'), requirePermission('manageRegistrations'), (req: AuthenticatedRequest, res: Response) => {
    const ticket = db.getSupportTicketById(req.params.id);
    if (!ticket) {
      res.status(404).json({ error: 'التذكرة غير موجودة.' });
      return;
    }
    if (!checkDivisionScope(req.adminUser, ticket.divisionId)) {
      res.status(403).json({ error: 'هذه التذكرة تابعة لاتحاد وطني خارج نطاق صلاحيتك.' });
      return;
    }
    const status = req.body.status || 'resolved';
    const resolutionNotes = sanitizeText(req.body.resolutionNotes || 'تمت المعالجة', 600);
    const success = db.updateSupportTicket(req.params.id, status, resolutionNotes, req.adminUser!.name);
    if (!success) {
      res.status(404).json({ error: 'Ticket not found' });
      return;
    }
    res.json({ success: true });
  });

  // Notifications & Reminder Dispatch
  app.get('/api/notifications', (req: Request, res: Response) => {
    const recipientId = req.query.recipientId as string | undefined;
    const divisionId = req.query.divisionId as string | undefined;
    res.json(db.getNotifications(recipientId, divisionId));
  });

  app.put('/api/notifications/:id/read', (req: Request, res: Response) => {
    const success = db.markNotificationRead(req.params.id);
    res.json({ success });
  });

  app.post('/api/notifications/remind', requireAdminAuth, requireRole('president', 'director', 'organizer'), requirePermission('manageMatchesAndResults'), async (req: AuthenticatedRequest, res: Response) => {
    const phone = sanitizeText(req.body.phone, 30);
    const message = sanitizeText(req.body.message, 500);
    if (!phone || !message) {
      res.status(400).json({ error: 'يرجى تحديد رقم الهاتف ونص التذكير.' });
      return;
    }
    const delivery = await db.dispatchWhatsAppNotification(phone, message);
    db.addAuditLog(req.adminUser!.name, 'إرسال تذكير مباراة / إشعار', phone, delivery.detail);
    res.json({ success: true, ...delivery });
  });

  // Audit Logs & Admin Users RBAC (Strictly separated by Role)
  app.get('/api/audit-logs', requireAdminAuth, requireRole('president', 'director'), (_req: Request, res: Response) => {
    res.json(db.getAuditLogs());
  });

  app.get('/api/admins', requireAdminAuth, requireRole('president'), requirePermission('manageAdmins'), (_req: Request, res: Response) => {
    res.json(db.getAdminUsers());
  });

  app.post('/api/admins', requireAdminAuth, requireRole('president'), requirePermission('manageAdmins'), (req: AuthenticatedRequest, res: Response) => {
    const username = sanitizeText(req.body.username, 40).toLowerCase();
    const name = sanitizeText(req.body.name, 100);
    const email = sanitizeText(req.body.email || '', 120);
    const password = typeof req.body.password === 'string' ? req.body.password.trim() : '';
    const role = req.body.role === 'director' ? 'director' : req.body.role === 'organizer' ? 'organizer' : null;
    const assignedDivisionId = sanitizeText(req.body.assignedDivisionId || '', 40) || undefined;

    if (!name || !username || !role) {
      res.status(400).json({ error: 'يرجى إدخال الاسم الكامل، اسم المستخدم، وتحديد الدور (مدير الاتحاد أو منظم).' });
      return;
    }
    if (password.length < 6) {
      res.status(400).json({ error: 'يجب أن لا تقل كلمة المرور عن 6 أحرف أو أرقام.' });
      return;
    }

    const result = db.createAdminUser(
      {
        username,
        name,
        email,
        role,
        assignedDivisionId,
        permissions: req.body.permissions,
      },
      req.adminUser!.name
    );

    if (!result.success || !result.admin) {
      res.status(400).json({ error: result.error || 'تعذر تسجيل الحساب الإداري.' });
      return;
    }

    setAdminCredential(result.admin.username, password);
    res.json({ success: true, admin: result.admin });
  });

  app.post('/api/admins/:id/password', requireAdminAuth, requireRole('president'), requirePermission('manageAdmins'), (req: AuthenticatedRequest, res: Response) => {
    const target = db.getAdminUsers().find((a) => a.id === req.params.id);
    if (!target) {
      res.status(404).json({ error: 'حساب المشرف غير موجود.' });
      return;
    }
    const newPassword = typeof req.body.password === 'string' ? req.body.password.trim() : '';
    if (newPassword.length < 6) {
      res.status(400).json({ error: 'كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل.' });
      return;
    }
    setAdminCredential(target.username, newPassword);
    db.addAuditLog(req.adminUser!.name, 'تحديث كلمة مرور حساب إداري', target.name, 'تم التشفير والحفظ');
    res.json({ success: true });
  });

  app.delete('/api/admins/:id', requireAdminAuth, requireRole('president'), requirePermission('manageAdmins'), (req: AuthenticatedRequest, res: Response) => {
    const target = db.getAdminUsers().find((a) => a.id === req.params.id);
    if (!target) {
      res.status(404).json({ error: 'حساب المشرف غير موجود.' });
      return;
    }
    const result = db.deleteAdminUser(req.params.id, req.adminUser!.name);
    if (!result.success) {
      res.status(403).json({ error: result.error || 'لا يمكن حذف هذا الحساب.' });
      return;
    }
    removeAdminCredential(target.username);
    res.json({ success: true });
  });

  app.put('/api/admins/:id/permissions', requireAdminAuth, requireRole('president'), requirePermission('manageAdmins'), (req: AuthenticatedRequest, res: Response) => {
    const target = db.getAdminUsers().find((a) => a.id === req.params.id);
    if (!target) {
      res.status(404).json({ error: 'حساب المشرف غير موجود.' });
      return;
    }
    if (target.role === 'president') {
      res.status(403).json({ error: 'لا يمكن تعطيل أو تقليص صلاحيات رئيس الاتحاد السيادية.' });
      return;
    }
    const updated = db.updateAdminPermissions(
      req.params.id,
      {
        permissions: req.body.permissions,
        assignedDivisionId: req.body.assignedDivisionId,
        active: typeof req.body.active === 'boolean' ? req.body.active : undefined,
      },
      req.adminUser!.name
    );
    if (!updated) {
      res.status(404).json({ error: 'حساب المشرف غير موجود.' });
      return;
    }
    res.json({ success: true, admin: updated });
  });

  // ==========================================
  // ALL 11 AI SUBSYSTEMS ENDPOINTS (GEMINI & ENGINES)
  // ==========================================

  app.get('/api/ai/subsystems', (_req: Request, res: Response) => {
    res.json({
      success: true,
      subsystems: getAllAISubsystems(),
      queueStats: aiTaskQueue.getStats(),
    });
  });

  app.post('/api/ai/pre-check', rateLimit(20, 2), async (req: Request, res: Response) => {
    try {
      const evaluation = await aiPreCheckRegistration(req.body);
      res.json({ success: true, evaluation });
    } catch (err: any) {
      res.status(500).json({ error: 'Pre-check failed', details: err?.message });
    }
  });

  app.post('/api/ai/analyze-squad', rateLimit(15, 1), async (req: Request, res: Response) => {
    try {
      const { imageBase64, mimeType, requestedTier } = req.body;
      if (!imageBase64) {
        res.status(400).json({ error: 'Missing imageBase64 payload' });
        return;
      }
      const imgCheck = validateImageUpload(imageBase64.startsWith('data:') ? imageBase64 : `data:${mimeType || 'image/jpeg'};base64,${imageBase64}`);
      if (!imgCheck.valid) {
        res.status(400).json({ error: imgCheck.reason });
        return;
      }

      const result = await runAISquadScanner(
        imageBase64,
        mimeType || 'image/jpeg',
        requestedTier ? (Number(requestedTier) as 1 | 2) : 1
      );

      res.json({ success: true, data: result });
    } catch (error: any) {
      console.error('Error in /api/ai/analyze-squad:', error);
      res.status(500).json({ error: 'Failed to analyze squad screenshot', details: error?.message });
    }
  });

  app.get('/api/ai/team-health/:teamId', async (req: Request, res: Response) => {
    try {
      const evaluation = await aiEvaluateTeamHealth(req.params.teamId);
      res.json({ success: true, evaluation });
    } catch (err: any) {
      res.status(500).json({ error: 'Team health evaluation failed', details: err?.message });
    }
  });

  app.get('/api/ai/player-assess/:playerId', async (req: Request, res: Response) => {
    try {
      const assessment = await aiAssessPlayerProfile(req.params.playerId);
      res.json({ success: true, assessment });
    } catch (err: any) {
      res.status(500).json({ error: 'Player assessment failed', details: err?.message });
    }
  });

  app.get('/api/ai/tournament-analysis', async (req: Request, res: Response) => {
    try {
      const tourId = (req.query.tournamentId as string) || '';
      const analysis = await aiAnalyzeTournamentStandings(tourId);
      res.json({ success: true, analysis });
    } catch (err: any) {
      res.status(500).json({ error: 'Tournament analysis failed', details: err?.message });
    }
  });

  app.post('/api/ai/predict-match', rateLimit(20, 2), async (req: Request, res: Response) => {
    try {
      const { homeTeamName, homeRating, awayTeamName, awayRating, tournamentName } = req.body;
      if (!homeTeamName || !awayTeamName) {
        res.status(400).json({ error: 'Missing team parameters' });
        return;
      }

      const prediction = await predictMatchSimulation(
        sanitizeText(homeTeamName, 100),
        Number(homeRating) || 3200,
        sanitizeText(awayTeamName, 100),
        Number(awayRating) || 3200,
        sanitizeText(tournamentName || 'دوري النخبة', 120)
      );
      res.json({ success: true, prediction });
    } catch (error: any) {
      console.error('Error in /api/ai/predict-match:', error);
      res.status(500).json({ error: 'Failed to predict match', details: error?.message });
    }
  });

  app.post('/api/ai/verify-result', requireAdminAuth, requireRole('president', 'director', 'organizer'), requirePermission('manageMatchesAndResults'), rateLimit(20, 2), async (req: Request, res: Response) => {
    try {
      const { screenshotBase64, mimeType } = req.body;
      if (screenshotBase64) {
        const imgCheck = validateImageUpload(
          screenshotBase64.startsWith('data:') ? screenshotBase64 : `data:${mimeType || 'image/jpeg'};base64,${screenshotBase64}`
        );
        if (!imgCheck.valid) {
          res.status(400).json({ error: imgCheck.reason });
          return;
        }
      }
      const verification = await aiVerifyMatchResult(req.body);
      res.json({ success: true, verification });
    } catch (err: any) {
      res.status(500).json({ error: 'Result verification failed', details: err?.message });
    }
  });

  app.get('/api/ai/power-rankings', async (_req: Request, res: Response) => {
    try {
      const rankings = await aiGeneratePowerRankings();
      res.json({ success: true, rankings });
    } catch (err: any) {
      res.status(500).json({ error: 'Power rankings failed', details: err?.message });
    }
  });

  app.post('/api/ai/rules-sanction', requireAdminAuth, requireRole('president', 'director'), requirePermission('manageDiscipline'), async (req: Request, res: Response) => {
    try {
      const { violationType, isRepeat } = req.body;
      const advice = await aiAdviseDisciplinarySanction(violationType || 'illegal_squad_rating', !!isRepeat);
      res.json({ success: true, advice });
    } catch (err: any) {
      res.status(500).json({ error: 'Disciplinary advice failed', details: err?.message });
    }
  });

  app.post('/api/ai/generate-press-report', requireAdminAuth, requireRole('president', 'director'), requirePermission('manageNewsAndStore'), rateLimit(15, 1), async (req: Request, res: Response) => {
    try {
      const { homeTeamName, awayTeamName, homeScore, awayScore, roundName, scorersSummary } = req.body;
      const report = await generateMatchPressReport(
        sanitizeText(homeTeamName, 100),
        sanitizeText(awayTeamName, 100),
        Number(homeScore),
        Number(awayScore),
        sanitizeText(roundName || 'الجولة الرسمية', 100),
        sanitizeText(scorersSummary || '', 300)
      );
      res.json({ success: true, report });
    } catch (error: any) {
      console.error('Error in /api/ai/generate-press-report:', error);
      res.status(500).json({ error: 'Failed to generate press report', details: error?.message });
    }
  });

  app.post('/api/ai/admin-assistant', requireAdminAuth, requireRole('president', 'director', 'organizer'), rateLimit(20, 2), async (req: Request, res: Response) => {
    try {
      const query = sanitizeText(req.body.query, 1500);
      const context = sanitizeText(req.body.context || '', 2000);
      const history = Array.isArray(req.body.history)
        ? req.body.history.slice(-8).map((h: any) => ({
            role: h.role === 'model' ? 'model' : 'user',
            text: sanitizeText(h.text, 1000),
          }))
        : [];
      if (!query) {
        res.status(400).json({ error: 'Missing query prompt' });
        return;
      }

      const result = await queryAdminAssistant(query, context, history as any);
      res.json({
        success: true,
        answer: result.answer,
        routedSubsystem: result.routedSubsystem,
        proposedAction: result.proposedAction,
      });
    } catch (error: any) {
      console.error('Error in /api/ai/admin-assistant:', error);
      res.status(500).json({ error: 'Failed to generate assistant response', details: error?.message });
    }
  });

  app.get('/api/ai/detect-duplicates', requireAdminAuth, requireRole('president', 'director'), requirePermission('manageRegistrations'), async (_req: Request, res: Response) => {
    try {
      const result = await detectFraudulentDuplicates();
      res.json({ success: true, data: result });
    } catch (error: any) {
      console.error('Error in /api/ai/detect-duplicates:', error);
      res.status(500).json({ error: 'Failed to scan duplicates', details: error?.message });
    }
  });

  app.get('/api/ai/membership-audit', requireAdminAuth, requireRole('president', 'director'), async (req: Request, res: Response) => {
    try {
      const divisionId = req.query.divisionId as string | undefined;
      const report = await aiGenerateMembershipAuditReport(divisionId);
      res.json({ success: true, report });
    } catch (error: any) {
      console.error('Error in /api/ai/membership-audit:', error);
      res.status(500).json({ error: 'Failed to run membership audit', details: error?.message });
    }
  });

  // ==========================================
  // VITE DEV SERVER / STATIC ASSETS
  // ==========================================
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`IOEF Enterprise Platform running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server start error:', err);
  process.exit(1);
});
