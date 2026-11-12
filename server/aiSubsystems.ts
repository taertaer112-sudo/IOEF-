import { db } from './db';
import { aiTaskQueue } from './concurrency';
import { analyzeMatchResultImage, getActiveGeminiModel } from './gemini';

export interface AISubsystemInfo {
  id: string;
  nameAr: string;
  nameEn: string;
  category: 'vision' | 'nlp' | 'analytics' | 'governance' | 'orchestrator';
  status: 'operational' | 'busy' | 'degraded';
  model: string;
  requestsCount: number;
  avgLatencyMs: number;
  lastActive: string;
  descriptionAr: string;
}

const subsystemsStats: Map<string, { count: number; totalLatency: number; lastActive: string }> = new Map([
  ['ai_registration', { count: 0, totalLatency: 0, lastActive: new Date().toISOString() }],
  ['ai_squad_scanner', { count: 0, totalLatency: 0, lastActive: new Date().toISOString() }],
  ['ai_team_manager', { count: 0, totalLatency: 0, lastActive: new Date().toISOString() }],
  ['ai_player_manager', { count: 0, totalLatency: 0, lastActive: new Date().toISOString() }],
  ['ai_tournament_manager', { count: 0, totalLatency: 0, lastActive: new Date().toISOString() }],
  ['ai_match_manager', { count: 0, totalLatency: 0, lastActive: new Date().toISOString() }],
  ['ai_match_result_scanner', { count: 0, totalLatency: 0, lastActive: new Date().toISOString() }],
  ['ai_statistics', { count: 0, totalLatency: 0, lastActive: new Date().toISOString() }],
  ['ai_rules_discipline', { count: 0, totalLatency: 0, lastActive: new Date().toISOString() }],
  ['ai_notifications', { count: 0, totalLatency: 0, lastActive: new Date().toISOString() }],
  ['ai_membership_audit', { count: 0, totalLatency: 0, lastActive: new Date().toISOString() }],
  ['ai_central_assistant', { count: 0, totalLatency: 0, lastActive: new Date().toISOString() }],
]);

export function recordSubsystemMetric(id: string, latencyMs: number) {
  const stat = subsystemsStats.get(id) || { count: 0, totalLatency: 0, lastActive: new Date().toISOString() };
  stat.count++;
  stat.totalLatency += Math.max(1, latencyMs);
  stat.lastActive = new Date().toISOString();
  subsystemsStats.set(id, stat);
}

export function getAllAISubsystems(): AISubsystemInfo[] {
  const isOnline = !!process.env.GEMINI_API_KEY;
  const activeModel = getActiveGeminiModel();
  const settings = db.getSettings();

  const catalog = [
    {
      id: 'ai_registration',
      nameAr: 'نظام التدقيق الأولي للتسجيل',
      nameEn: 'AI Registration',
      category: 'governance' as const,
      descriptionAr: 'فحص أهلية اللاعب، كشف تكرار رقم الواتساب ومعرف اللاعب، والتحقق من توفر النادي.'
    },
    {
      id: 'ai_squad_scanner',
      nameAr: 'ماسح صور التشكيلات البصري',
      nameEn: 'AI Squad Scanner',
      category: 'vision' as const,
      descriptionAr: 'رؤية حاسوبية لاستخراج قوة التشكيلة والخطة وقائمة لاعبي التشكيلة من سكرين شوت eFootball.',
      disabled: settings.aiConfig?.enableSquadVision === false
    },
    {
      id: 'ai_team_manager',
      nameAr: 'نظام إدارة وتقييم الأندية والفرق',
      nameEn: 'AI Team Manager',
      category: 'analytics' as const,
      descriptionAr: 'تحليل توازن الفريق ومطابقة شروط الدرجة الأولى والثانية.'
    },
    {
      id: 'ai_player_manager',
      nameAr: 'نظام إدارة سجلات اللاعبين وقفل القوائم',
      nameEn: 'AI Player Manager',
      category: 'governance' as const,
      descriptionAr: 'متابعة السجل التنافسي للاعب وفرض سياسة التعديل الوحيد وقفل التشكيلة.'
    },
    {
      id: 'ai_tournament_manager',
      nameAr: 'نظام إدارة البطولات والمسارات التنافسية',
      nameEn: 'AI Tournament Manager',
      category: 'governance' as const,
      descriptionAr: 'حساب مسارات التأهل القاري، مصفوفة الصعود والهبوط، وكسر التعادلات التلقائي.'
    },
    {
      id: 'ai_match_manager',
      nameAr: 'محاكي المباريات والمحلل التكتيكي',
      nameEn: 'AI Match Manager',
      category: 'analytics' as const,
      descriptionAr: 'محاكاة المواجهات القادمة وحساب نسب الفوز والتعادل والصراعات الحاسمة.'
    },
    {
      id: 'ai_match_result_scanner',
      nameAr: 'مدقق نتائج المباريات وكشف التلاعب',
      nameEn: 'AI Match Result Scanner',
      category: 'vision' as const,
      descriptionAr: 'قراءة بصرية للقطة شاشة نهاية المباراة لاستخراج النتيجة والإحصائيات ومطابقة الفريقين.',
      disabled: settings.aiConfig?.enableResultVision === false
    },
    {
      id: 'ai_statistics',
      nameAr: 'محرك الإحصائيات المتقدمة وتصنيف القوة',
      nameEn: 'AI Statistics',
      category: 'analytics' as const,
      descriptionAr: 'احتساب تصنيف القوة الديناميكي وترتيب الأندية عبر الاتحادات الوطنية.'
    },
    {
      id: 'ai_rules_discipline',
      nameAr: 'نظام الانضباط والتحكيم التلقائي',
      nameEn: 'AI Rules & Discipline',
      category: 'governance' as const,
      descriptionAr: 'تطبيق لوائح الاتحاد واقتراح العقوبات المناسبة على المخالفات والطعون.'
    },
    {
      id: 'ai_notifications',
      nameAr: 'محرك الإشعارات والبيانات الصحفية',
      nameEn: 'AI Notifications',
      category: 'nlp' as const,
      descriptionAr: 'توليد البيانات الصحفية الرسمية بعد المباريات وتنبيهات الجولات والعضويات.'
    },
    {
      id: 'ai_membership_audit',
      nameAr: 'محرك تدقيق العضويات والاشتراكات وكشف التلاعب المالي',
      nameEn: 'AI Membership & Payment Auditor',
      category: 'governance' as const,
      descriptionAr: 'تلخيص إحصاءات البطاقات الرقمية ورصد المراجع المكررة أو الإيصالات المشتبه بها للمراجعة البشرية وتنبيه العضويات قريبة الانتهاء.'
    },
    {
      id: 'ai_central_assistant',
      nameAr: 'المساعد الذكي المركزي للأمانة العامة',
      nameEn: 'AI Central Assistant',
      category: 'orchestrator' as const,
      descriptionAr: 'مساعد محادثة ذكي يوجّه الاستفسارات الإدارية ويقترح إجراءات معتمدة بالموافقة الصريحة.',
      disabled: settings.aiConfig?.enableCentralAssistant === false
    }
  ];

  return catalog.map((item) => {
    const stat = subsystemsStats.get(item.id) || { count: 0, totalLatency: 0, lastActive: new Date().toISOString() };
    const avgLatency = stat.count > 0 ? Math.round(stat.totalLatency / stat.count) : 0;

    return {
      id: item.id,
      nameAr: item.nameAr,
      nameEn: item.nameEn,
      category: item.category,
      status: item.disabled ? 'degraded' : 'operational',
      model: isOnline && !item.disabled ? activeModel : 'IOEF-Deterministic-Fallback',
      requestsCount: stat.count,
      avgLatencyMs: avgLatency,
      lastActive: stat.lastActive,
      descriptionAr: item.descriptionAr
    };
  });
}

// 1. AI REGISTRATION ENGINE (Strict User Uniqueness + Real Club Availability Check)
export async function aiPreCheckRegistration(data: {
  fullName: string;
  gamerTag: string;
  whatsapp: string;
  divisionId: string;
  requestedTier: 1 | 2;
  realClubId?: string;
}): Promise<{
  passed: boolean;
  score: number;
  warnings: string[];
  recommendation: string;
}> {
  const startTime = Date.now();
  const warnings: string[] = [];

  const dup = db.checkDuplicateRegistration(data.whatsapp || '', data.gamerTag || '');
  if (dup.exists && dup.reason) {
    warnings.push(dup.reason);
  }

  if (data.realClubId) {
    const team = db
      .getState()
      .teams.find(
        (t) =>
          t.realClubId === data.realClubId &&
          t.divisionId === data.divisionId &&
          t.divisionTier === data.requestedTier
      );
    if (team && (team.registrationStatus !== 'available' || !!team.playerId)) {
      warnings.push(`نادي (${team.name}) محجوز أو معتمد لمتسابق آخر في هذا الموسم.`);
    }
  }

  const passed = warnings.length === 0;
  recordSubsystemMetric('ai_registration', Date.now() - startTime);

  return {
    passed,
    score: passed ? 0.99 : 0.35,
    warnings,
    recommendation: passed
      ? 'جميع معايير الهوية وتوفر النادي متوافقة تماماً وجاهزة لرفع التشكيلة.'
      : 'يرجى معالجة الملاحظات المسجلة أعلاه قبل استكمال التسجيل.'
  };
}

// 2. AI SQUAD SCANNER (Queued for high concurrency resilience)
export async function runAISquadScanner(
  base64Data: string,
  mimeType: string = 'image/jpeg',
  requestedTier: 1 | 2 = 1
) {
  const startTime = Date.now();
  return aiTaskQueue.enqueue(async () => {
    try {
      const { analyzeSquadImage } = await import('./gemini');
      const result = await analyzeSquadImage(base64Data, mimeType, requestedTier);
      recordSubsystemMetric('ai_squad_scanner', Date.now() - startTime);
      return result;
    } catch (err) {
      recordSubsystemMetric('ai_squad_scanner', Date.now() - startTime);
      throw err;
    }
  }, 'SquadScannerJob', 10);
}

// 3. AI TEAM MANAGER
export async function aiEvaluateTeamHealth(teamId: string) {
  const startTime = Date.now();
  const dbState = db.getState();
  const team = dbState.teams.find((t) => t.id === teamId);
  const settings = dbState.settings;

  const minReq = team?.divisionTier === 1 ? settings.firstDivisionMinRating : settings.secondDivisionMinRating;
  const rating = team?.rating || minReq;
  const compliance = rating >= minReq;

  const diff = rating - minReq;
  let overallHealth: 'excellent' | 'balanced' | 'needs_reinforcement' = 'balanced';
  if (diff >= 20) overallHealth = 'excellent';
  else if (diff < 0) overallHealth = 'needs_reinforcement';

  recordSubsystemMetric('ai_team_manager', Date.now() - startTime);

  return {
    overallHealth,
    tacticalDepthScore: Math.min(99, Math.max(70, Math.round(rating / 33))),
    suggestedFocus: compliance
      ? 'الفريق مستوفٍ لمعايير القوة الرسمية وتوزيع المراكز.'
      : 'يرجى رفع قوة التشكيلة لتفادي عدم استيفاء شروط الدرجة.',
    tierCompliance: compliance
  };
}

// 4. AI PLAYER MANAGER
export async function aiAssessPlayerProfile(playerId: string) {
  const startTime = Date.now();
  const dbState = db.getState();
  const player = dbState.players.find((p) => p.id === playerId);
  const discActions = dbState.disciplinary.filter((d) => d.playerId === playerId);

  const penaltyPoints = discActions.reduce((acc, curr) => acc + (curr.pointsDeducted || 0), 0);
  const fairPlayRating = Math.max(0, 100 - penaltyPoints * 10 - discActions.length * 5);

  recordSubsystemMetric('ai_player_manager', Date.now() - startTime);

  return {
    formIndex: 90,
    fairPlayRating,
    canUnlockSquad: !player?.squadEditLocked || discActions.length === 0,
    disciplinarySummary:
      discActions.length === 0
        ? 'سجل اللاعب ناصع بدون أي عقوبات انضباطية.'
        : `مسجل بحق اللاعب ${discActions.length} إجراءات انضباطية بخصم إجمالي ${penaltyPoints} نقطة.`
  };
}

// 5. AI TOURNAMENT MANAGER
export async function aiAnalyzeTournamentStandings(tournamentId: string) {
  const startTime = Date.now();
  const dbState = db.getState();
  const teams = db.getTeams(tournamentId || undefined);

  const favorite = teams[0]?.name || 'لم يُحدد بعد';
  const uclQualifiers = teams.slice(0, 2).map((t) => t.name);
  const dangerZone = teams.slice(-2).map((t) => t.name);
  const promotionCandidates = teams.slice(0, 2).map((t) => t.name);

  recordSubsystemMetric('ai_tournament_manager', Date.now() - startTime);

  return {
    championshipFavorite: favorite,
    promotionContenders: promotionCandidates,
    relegationDangerZone: dangerZone,
    championsLeagueQualifiers: uclQualifiers,
    analysisNote: dbState.fixtures.length === 0
      ? 'الموسم 2026/2027 في مرحلة الافتتاح واستقبال التسجيلات قبل انطلاق الجولات.'
      : 'تحليل الترتيب يستند إلى النقاط وفارق الأهداف المعتمدة رسمياً.'
  };
}

// 6. AI MATCH RESULT SCANNER (Queued Vision OCR + Plausibility)
export async function aiVerifyMatchResult(data: {
  fixtureId?: string;
  homeTeamName?: string;
  awayTeamName?: string;
  homeScore?: number;
  awayScore?: number;
  screenshotBase64?: string;
  mimeType?: string;
}) {
  const startTime = Date.now();
  return aiTaskQueue.enqueue(async () => {
    let homeName = data.homeTeamName || 'المستضيف';
    let awayName = data.awayTeamName || 'الضيف';
    if (data.fixtureId) {
      const state = db.getState();
      const fix = state.fixtures.find((f) => f.id === data.fixtureId);
      if (fix) {
        homeName = state.teams.find((t) => t.id === fix.homeTeamId)?.name || homeName;
        awayName = state.teams.find((t) => t.id === fix.awayTeamId)?.name || awayName;
      }
    }

    const res = await analyzeMatchResultImage({
      homeTeamName: homeName,
      awayTeamName: awayName,
      submittedHomeScore: data.homeScore,
      submittedAwayScore: data.awayScore,
      screenshotBase64: data.screenshotBase64,
      mimeType: data.mimeType
    });

    recordSubsystemMetric('ai_match_result_scanner', Date.now() - startTime);
    return res;
  }, 'MatchResultScannerJob', 9);
}

// 7. AI STATISTICS & POWER RANKINGS
export async function aiGeneratePowerRankings() {
  const startTime = Date.now();
  const dbState = db.getState();

  const sorted = [...dbState.teams]
    .sort((a, b) => (b.points * 3 + b.goalsFor - b.goalsAgainst) - (a.points * 3 + a.goalsFor - a.goalsAgainst))
    .slice(0, 10);

  const rankings = sorted.map((t, idx) => {
    const div = dbState.divisions.find((d) => d.id === t.divisionId);
    return {
      teamName: t.name,
      divisionCode: div?.code || 'IOEF',
      powerScore: Math.round(t.rating * 0.7 + t.points * 12 + t.goalsFor * 4),
      trend: (idx === 0 || idx === 1 ? 'up' : idx > 7 ? 'down' : 'steady') as 'up' | 'down' | 'steady'
    };
  });

  recordSubsystemMetric('ai_statistics', Date.now() - startTime);
  return rankings;
}

// 8. AI RULES & DISCIPLINE SANCTION ADVISOR
export async function aiAdviseDisciplinarySanction(violationType: string, isRepeat: boolean) {
  const startTime = Date.now();

  let deduction = 0;
  let matches = 0;
  let article = 'الباب الخامس - الروح الرياضية والالتزام';
  let penaltyText = 'إنذار رسمي أول';

  switch (violationType) {
    case 'illegal_squad_rating':
    case 'illegal_squad':
      deduction = isRepeat ? 3 : 0;
      matches = isRepeat ? 2 : 0;
      article = 'الباب الأول - عدم مطابقة سقف القوة';
      penaltyText = isRepeat ? 'إلغاء النتيجة وخصم 3 نقاط وإيقاف مباراتين' : 'إلغاء نتيجة المباراة وإنذار أول';
      break;
    case 'connection_tampering':
      deduction = isRepeat ? 6 : 3;
      matches = isRepeat ? 5 : 2;
      article = 'الباب الخامس - التلاعب بالاتصال أو النتائج';
      penaltyText = isRepeat ? 'حظر دائم من بطولات الاتحاد' : 'خصم 3 نقاط وإيقاف مباراتين';
      break;
    case 'toxic_behavior':
      deduction = isRepeat ? 1 : 0;
      matches = isRepeat ? 3 : 1;
      article = 'الباب الخامس - السلوك غير الرياضي';
      penaltyText = isRepeat ? 'إيقاف 3 مباريات متتالية' : 'إنذار مشدد وإيقاف لمباراة واحدة';
      break;
    default:
      penaltyText = 'إنذار تنبيهي وفق اللائحة العامة';
  }

  recordSubsystemMetric('ai_rules_discipline', Date.now() - startTime);

  return {
    recommendedPenalty: penaltyText,
    pointsDeduction: deduction,
    suspensionMatches: matches,
    officialBylawArticle: article
  };
}

// 9. AI MEMBERSHIP & PAYMENT FRAUD AUDITOR (Advisory Only — Never Auto-Approves or Auto-Suspends)
export async function aiGenerateMembershipAuditReport(divisionId?: string) {
  const startTime = Date.now();
  const memberships = db.getMemberships(undefined, divisionId);
  const payments = db.getPayments(undefined, divisionId);
  const transfers = (db.getState().transfers || []).filter(
    (t) => !divisionId || t.fromDivisionId === divisionId || t.toDivisionId === divisionId
  );

  const now = Date.now();
  const in30Days = now + 30 * 86400000;

  const expiringSoon = memberships
    .filter((m) => (m.status === 'free' || m.status === 'active') && new Date(m.expiresAt).getTime() > now && new Date(m.expiresAt).getTime() <= in30Days)
    .map((m) => {
      const player = db.getPlayerById(m.playerId);
      const daysLeft = Math.max(1, Math.ceil((new Date(m.expiresAt).getTime() - now) / 86400000));
      return {
        membershipId: m.id,
        membershipNumber: m.membershipNumber,
        playerCode: m.playerCode,
        playerName: player?.fullName || m.playerCode,
        teamName: m.teamName,
        expiresAt: m.expiresAt,
        daysLeft
      };
    });

  const flaggedPayments = payments
    .filter((p) => (p.fraudFlags?.length || 0) > 0)
    .map((p) => ({
      paymentId: p.id,
      receiptNumber: p.receiptNumber,
      playerName: p.playerName,
      playerCode: p.playerCode,
      paymentMethod: p.paymentMethod,
      amount: p.amount,
      currency: p.currency,
      status: p.status,
      fraudFlags: p.fraudFlags
    }));

  const summary = {
    totalMemberships: memberships.length,
    freeCount: memberships.filter((m) => m.status === 'free').length,
    activeCount: memberships.filter((m) => m.status === 'active').length,
    pendingPaymentCount: memberships.filter((m) => m.status === 'pending_payment').length,
    pendingReviewCount: memberships.filter((m) => m.status === 'pending_review').length,
    expiredCount: memberships.filter((m) => m.status === 'expired').length,
    suspendedCount: memberships.filter((m) => m.status === 'suspended').length,
    revokedCount: memberships.filter((m) => m.cardStatus === 'revoked').length,
    expiringSoonCount: expiringSoon.length,
    totalTransfers: transfers.length,
    totalPaymentsSubmitted: payments.length,
    pendingPaymentsCount: payments.filter((p) => p.status === 'pending_review').length,
    flaggedPaymentsCount: flaggedPayments.length,
    approvedRevenue: payments.filter((p) => p.status === 'approved').reduce((acc, p) => acc + Number(p.amount || 0), 0)
  };

  const narrativeReport = [
    `تقرير التدقيق الذكي للعضويات والاشتراكات — إجمالي البطاقات المصدرة: ${summary.totalMemberships}.`,
    `توزيع الحالات: مجاني (الموسم الأول) ${summary.freeCount} | نشط مدفوع ${summary.activeCount} | قيد المراجعة ${summary.pendingReviewCount} | منتهي ${summary.expiredCount} | موقوف ${summary.suspendedCount} | بطاقات ملغاة ${summary.revokedCount}.`,
    summary.expiringSoonCount > 0
      ? `تنبيه تجديد: توجد ${summary.expiringSoonCount} بطاقات تنتهي خلال 30 يوماً وتستحق إرسال تذكير تلقائي.`
      : 'لا توجد بطاقات قريبة الانتهاء خلال الـ 30 يوماً القادمة.',
    flaggedPayments.length > 0
      ? `تحذير تدقيق مالي: تم رصد ${flaggedPayments.length} إيصال دفع يحمل مؤشرات تحتاج لمطابقة يدوية من الإدارة (لا يتم اتخاذ أي رفض أو اعتماد تلقائي).`
      : 'سجل التحويلات المقدم نظيف من المراجع المكررة أو تطابق الصور.'
  ].join('\n');

  recordSubsystemMetric('ai_membership_audit', Date.now() - startTime);

  return {
    generatedAt: new Date().toISOString(),
    summary,
    expiringSoon,
    flaggedPayments,
    narrativeReport,
    governanceNote: 'جميع قرارات اعتماد المدفوعات أو إيقاف العضويات تخضع للموافقة البشرية المباشرة من رئيس أو مدير الاتحاد ولا تُنفذ آلياً.'
  };
}

