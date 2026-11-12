import { GoogleGenAI, Type } from '@google/genai';
import { db } from './db';
import { GeminiModelAlias, RosterPlayer } from './types';

// Ensure User-Agent is set as required by Gemini integration guidelines
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

const VALID_MODELS: GeminiModelAlias[] = [
  'gemini-4-hydrogen',
  'gemini-4-argon',
  'gemini-4-carbon',
  'gemini-3.1-flash-lite',
];

export function getActiveGeminiModel(): GeminiModelAlias {
  const configured = db.getSettings()?.aiConfig?.activeModel;
  if (configured && VALID_MODELS.includes(configured)) {
    return configured;
  }
  return 'gemini-4-hydrogen';
}

export interface SquadAnalysisResult {
  squadRating: number;
  formation: string;
  identifiedPlayers: string[];
  extractedRoster: RosterPlayer[];
  recommendedTier: 1 | 2;
  passedRequirements: boolean;
  needsHumanReview: boolean;
  reasoning: string;
  confidenceScore: number;
  usedFallback?: boolean;
}

export interface MatchPredictionResult {
  homeWinProb: number;
  drawProb: number;
  awayWinProb: number;
  predictedScore: string;
  tacticalAdvantage: string;
  keyDuel: string;
  analysisSummary: string;
}

export interface MatchResultVisionAudit {
  plausible: boolean;
  anomaliesDetected: boolean;
  extractedHomeScore: number;
  extractedAwayScore: number;
  detectedHomeTeam: string;
  detectedAwayTeam: string;
  homePossession?: number;
  awayPossession?: number;
  homeShots?: number;
  awayShots?: number;
  teamsMatched: boolean;
  confidence: number;
  auditRemarks: string;
}

export interface AssistantProposedAction {
  type: 'publish_news' | 'run_duplicate_scan' | 'update_thresholds';
  label: string;
  summary: string;
  payload: Record<string, any>;
}

export interface AdminAssistantResponse {
  answer: string;
  routedSubsystem: string;
  proposedAction?: AssistantProposedAction;
}

/**
 * Server-side AI Squad Screenshot Vision Analyzer (Configurable Gemini Model)
 */
export async function analyzeSquadImage(
  base64Data: string,
  mimeType: string = 'image/jpeg',
  requestedTier: 1 | 2 = 1
): Promise<SquadAnalysisResult> {
  const settings = db.getSettings();
  const firstDivMin = settings.firstDivisionMinRating; // 3220
  const secondDivMin = settings.secondDivisionMinRating; // 3150
  const activeModel = getActiveGeminiModel();
  const visionEnabled = settings.aiConfig?.enableSquadVision !== false;

  const isLocalDemoPlaceholder = base64Data.startsWith('/src/assets/') || base64Data.startsWith('/assets/');
  const cleanBase64 = base64Data.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, '');

  const fallbackRoster: RosterPlayer[] = [
    { id: 'rp_1', name: 'G. Donnarumma', position: 'GK', rating: 100 },
    { id: 'rp_2', name: 'V. van Dijk', position: 'CB', rating: 101 },
    { id: 'rp_3', name: 'W. Saliba', position: 'CB', rating: 100 },
    { id: 'rp_4', name: 'T. Hernández', position: 'LB', rating: 99 },
    { id: 'rp_5', name: 'A. Hakimi', position: 'RB', rating: 99 },
    { id: 'rp_6', name: 'Rodri', position: 'DMF', rating: 101 },
    { id: 'rp_7', name: 'J. Bellingham', position: 'CMF', rating: 102 },
    { id: 'rp_8', name: 'K. De Bruyne', position: 'AMF', rating: 102 },
    { id: 'rp_9', name: 'Vinicius Jr', position: 'LWF', rating: 103 },
    { id: 'rp_10', name: 'L. Messi', position: 'RWF', rating: 104 },
    { id: 'rp_11', name: 'K. Mbappé', position: 'CF', rating: 104 },
  ];

  if (!process.env.GEMINI_API_KEY || !visionEnabled || isLocalDemoPlaceholder) {
    const simulatedRating = requestedTier === 1 ? 3228 : 3168;
    const recTier: 1 | 2 = simulatedRating >= firstDivMin ? 1 : 2;
    const passed = requestedTier === 1 ? simulatedRating >= firstDivMin : simulatedRating >= secondDivMin;
    return {
      squadRating: simulatedRating,
      formation: '4-2-1-3',
      identifiedPlayers: fallbackRoster.map((p) => `${p.name} (${p.rating})`),
      extractedRoster: fallbackRoster,
      recommendedTier: recTier,
      passedRequirements: passed,
      needsHumanReview: isLocalDemoPlaceholder || !process.env.GEMINI_API_KEY,
      reasoning: !process.env.GEMINI_API_KEY
        ? `تم تشغيل المحرك البديل لعدم توفر GEMINI_API_KEY: التقييم التقديري ${simulatedRating} نقطة، وأُحيل الطلب للمراجعة البشرية من لجنة المسابقات.`
        : 'تم استخدام الصورة المرجعية الافتراضية؛ يُنصح برفع لقطة شاشة فعلية من لعبة eFootball لاستخراج القائمة الدقيقة وتوثيقها.',
      confidenceScore: 0.78,
      usedFallback: true,
    };
  }

  try {
    const promptText = `
أنت الآن المحكم الفني المعتمد للاتحاد الدولي للرياضات الإلكترونية عبر الإنترنت (IOEF) المتخصص في تدقيق تشكيلات eFootball Mobile موسم 2026/2027.
قم بتحليل صورة تشكيلة eFootball المرفقة بدقة واستخراج البيانات التالية بصيغة JSON:
1. إجمالي تقييم قوة الفريق (squadRating / Team Strength) الموضح في الشاشة (عادة بين 2800 و 3400).
2. الخطة التكتيكية المتبعة (formation مثل 4-2-1-3 أو 4-3-3).
3. قائمة اللاعبين الظاهرين في التشكيلة (extractedRoster) حيث يحتوي كل عنصر على: name (الاسم)، position (المركز مثل GK/CB/LB/RB/DMF/CMF/AMF/LWF/RWF/CF)، rating (التقييم الرقمي).
4. ملاحظة تنظيمية حاسمة: تكرار أسماء لاعبي كرة القدم داخل اللعبة (مثل مبابي أو ميسي أو هالاند) بين الفرق المختلفة مسموح به 100% ولا يُعد مخالفة أبداً. ركّز فقط على قراءة القوة واللاعبين والخطة.
5. المقارنة مع معايير الاتحاد الدولي IOEF:
   - الدرجة الأولى: الحد الأدنى لقوة التشكيلة = ${firstDivMin}.
   - الدرجة الثانية: الحد الأدنى لقوة التشكيلة = ${secondDivMin}.
6. حدد recommendedTier (1 إذا كانت القوة >= ${firstDivMin}، وإلا 2).
7. حدد passedRequirements (هل التقييم يطابق الدرجة المطلوبة ${requestedTier}؟).
8. إذا كانت الصورة غير واضحة أو غير متعلقة باللعبة، ضع needsHumanReview = true.
9. اكتب توضيحاً رسمياً باللغة العربية (reasoning).
`;

    const response = await ai.models.generateContent({
      model: activeModel,
      contents: [
        {
          inlineData: {
            mimeType,
            data: cleanBase64,
          },
        },
        {
          text: promptText,
        },
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            squadRating: { type: Type.INTEGER },
            formation: { type: Type.STRING },
            extractedRoster: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  position: { type: Type.STRING },
                  rating: { type: Type.INTEGER },
                },
                required: ['name', 'position', 'rating'],
              },
            },
            recommendedTier: { type: Type.INTEGER },
            passedRequirements: { type: Type.BOOLEAN },
            needsHumanReview: { type: Type.BOOLEAN },
            reasoning: { type: Type.STRING },
            confidenceScore: { type: Type.NUMBER },
          },
          required: ['squadRating', 'formation', 'recommendedTier', 'passedRequirements', 'reasoning'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    const squadRating = Number(parsed.squadRating) || (requestedTier === 1 ? firstDivMin : secondDivMin);
    const recommendedTier: 1 | 2 = squadRating >= firstDivMin ? 1 : 2;
    const passed = requestedTier === 1 ? squadRating >= firstDivMin : squadRating >= secondDivMin;
    const rawRoster: any[] = Array.isArray(parsed.extractedRoster) ? parsed.extractedRoster : [];
    const extractedRoster: RosterPlayer[] =
      rawRoster.length > 0
        ? rawRoster.map((p, i) => ({
            id: `rp_${Date.now()}_${i}`,
            name: String(p.name || `لاعب ${i + 1}`),
            position: String(p.position || 'MF'),
            rating: Number(p.rating) || 95,
          }))
        : fallbackRoster;

    return {
      squadRating,
      formation: parsed.formation || '4-2-1-3',
      identifiedPlayers: extractedRoster.map((p) => `${p.name} (${p.rating})`),
      extractedRoster,
      recommendedTier,
      passedRequirements: passed,
      needsHumanReview: Boolean(parsed.needsHumanReview) || !passed,
      reasoning:
        parsed.reasoning ||
        `تم تحليل التشكيلة عبر ${activeModel}. القوة الإجمالية: ${squadRating}.`,
      confidenceScore: Number(parsed.confidenceScore) || 0.92,
      usedFallback: false,
    };
  } catch (error) {
    console.error('Gemini Squad Vision analysis error:', error);
    const fallbackRating = requestedTier === 1 ? firstDivMin : secondDivMin;
    return {
      squadRating: fallbackRating,
      formation: '4-3-3',
      identifiedPlayers: fallbackRoster.map((p) => `${p.name} (${p.rating})`),
      extractedRoster: fallbackRoster,
      recommendedTier: requestedTier,
      passedRequirements: false,
      needsHumanReview: true,
      reasoning:
        'تعذر إتمام القراءة البصرية الآلية للصورة الحالية؛ تم تحويل الطلب للمراجعة البشرية المباشرة وإتاحة مراجعة الأسماء يدوياً.',
      confidenceScore: 0.65,
      usedFallback: true,
    };
  }
}

/**
 * AI Match Result Screenshot Vision Verifier (Gemini Vision OCR)
 */
export async function analyzeMatchResultImage(params: {
  homeTeamName: string;
  awayTeamName: string;
  submittedHomeScore?: number;
  submittedAwayScore?: number;
  screenshotBase64?: string;
  mimeType?: string;
}): Promise<MatchResultVisionAudit> {
  const settings = db.getSettings();
  const activeModel = getActiveGeminiModel();
  const submittedH = Number(params.submittedHomeScore ?? 0);
  const submittedA = Number(params.submittedAwayScore ?? 0);

  // Heuristic sanity check baseline
  const basicPlausible =
    submittedH >= 0 && submittedA >= 0 && submittedH + submittedA <= 14;

  if (
    !params.screenshotBase64 ||
    !process.env.GEMINI_API_KEY ||
    settings.aiConfig?.enableResultVision === false
  ) {
    return {
      plausible: basicPlausible,
      anomaliesDetected: !basicPlausible,
      extractedHomeScore: submittedH,
      extractedAwayScore: submittedA,
      detectedHomeTeam: params.homeTeamName,
      detectedAwayTeam: params.awayTeamName,
      teamsMatched: true,
      confidence: params.screenshotBase64 ? 0.72 : 0.9,
      auditRemarks: !params.screenshotBase64
        ? basicPlausible
          ? 'تم التحقق الإحصائي من النتيجة المدخلة وهي ضمن النطاق الطبيعي.'
          : 'تنبيه: النتيجة المسجلة غير معتادة وتتطلب مراجعة حكم المباراة.'
        : 'تم استلام لقطة الشاشة، ونظراً لغياب GEMINI_API_KEY يعتمد التدقيق على مطابقة المنظم البشري.',
    };
  }

  try {
    const cleanBase64 = params.screenshotBase64.replace(
      /^data:image\/[a-zA-Z0-9+.-]+;base64,/,
      ''
    );
    const mimeType = params.mimeType || 'image/jpeg';

    const response = await ai.models.generateContent({
      model: activeModel,
      contents: [
        { inlineData: { mimeType, data: cleanBase64 } },
        {
          text: `
أنت مدقق نتائج المباريات الرسمي في الاتحاد الدولي IOEF.
حلل لقطة شاشة نهاية المباراة المرفقة وقارنها ببيانات المواجهة الرسمية التالية:
- الفريق المضيف المتوقع: ${params.homeTeamName}
- الفريق الضيف المتوقع: ${params.awayTeamName}
- النتيجة المدخلة للمقارنة (إن وجدت): ${submittedH} - ${submittedA}

استخرج بصيغة JSON:
- extractedHomeScore (أهداف المضيف)
- extractedAwayScore (أهداف الضيف)
- detectedHomeTeam (اسم الفريق المضيف الظاهر في الصورة)
- detectedAwayTeam (اسم الفريق الضيف الظاهر في الصورة)
- homePossession, awayPossession, homeShots, awayShots (إحصائيات الاستحواذ والتسديد إن ظهرت)
- teamsMatched (boolean: هل الفريقان يطابقان المواجهة؟)
- anomaliesDetected (boolean: هل يوجد تلاعب أو اختلاف مع النتيجة المدخلة؟)
- confidence (0..1)
- auditRemarks (تقرير تدقيق باللغة العربية)
`,
        },
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            extractedHomeScore: { type: Type.INTEGER },
            extractedAwayScore: { type: Type.INTEGER },
            detectedHomeTeam: { type: Type.STRING },
            detectedAwayTeam: { type: Type.STRING },
            homePossession: { type: Type.INTEGER },
            awayPossession: { type: Type.INTEGER },
            homeShots: { type: Type.INTEGER },
            awayShots: { type: Type.INTEGER },
            teamsMatched: { type: Type.BOOLEAN },
            anomaliesDetected: { type: Type.BOOLEAN },
            confidence: { type: Type.NUMBER },
            auditRemarks: { type: Type.STRING },
          },
          required: ['extractedHomeScore', 'extractedAwayScore', 'teamsMatched', 'anomaliesDetected', 'auditRemarks'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    const extH = Number(parsed.extractedHomeScore ?? submittedH);
    const extA = Number(parsed.extractedAwayScore ?? submittedA);
    const anomalies = Boolean(parsed.anomaliesDetected) || !parsed.teamsMatched;

    return {
      plausible: !anomalies && extH >= 0 && extA >= 0 && extH + extA <= 16,
      anomaliesDetected: anomalies,
      extractedHomeScore: extH,
      extractedAwayScore: extA,
      detectedHomeTeam: parsed.detectedHomeTeam || params.homeTeamName,
      detectedAwayTeam: parsed.detectedAwayTeam || params.awayTeamName,
      homePossession: parsed.homePossession ? Number(parsed.homePossession) : undefined,
      awayPossession: parsed.awayPossession ? Number(parsed.awayPossession) : undefined,
      homeShots: parsed.homeShots ? Number(parsed.homeShots) : undefined,
      awayShots: parsed.awayShots ? Number(parsed.awayShots) : undefined,
      teamsMatched: parsed.teamsMatched !== false,
      confidence: Number(parsed.confidence) || 0.91,
      auditRemarks:
        parsed.auditRemarks ||
        `تمت قراءة النتيجة (${extH} - ${extA}) عبر ${activeModel}. بانتظار اعتماد المنظم النهائي.`,
    };
  } catch (err) {
    console.error('Gemini Match Result Vision error:', err);
    return {
      plausible: basicPlausible,
      anomaliesDetected: !basicPlausible,
      extractedHomeScore: submittedH,
      extractedAwayScore: submittedA,
      detectedHomeTeam: params.homeTeamName,
      detectedAwayTeam: params.awayTeamName,
      teamsMatched: true,
      confidence: 0.6,
      auditRemarks:
        'تعذر تحليل صورة النتيجة آلياً، يرجى من المنظم مطابقة النتيجة يدوياً من الصورة قبل الاعتماد.',
    };
  }
}

/**
 * 2026/2027 Advanced Match Outcome & Tactical Simulator
 */
export async function predictMatchSimulation(
  homeTeamName: string,
  homeRating: number,
  awayTeamName: string,
  awayRating: number,
  tournamentName: string
): Promise<MatchPredictionResult> {
  if (!process.env.GEMINI_API_KEY) {
    const diff = homeRating - awayRating;
    const homeProb = Math.min(75, Math.max(20, Math.round(45 + diff * 0.4)));
    const drawProb = 25;
    const awayProb = Math.max(10, 100 - homeProb - drawProb);
    return {
      homeWinProb: homeProb,
      drawProb,
      awayWinProb: awayProb,
      predictedScore: homeRating >= awayRating ? '2 - 1' : '1 - 2',
      tacticalAdvantage: `تفوق نسبي في التوازن التكتيكي وسرعة التحولات لصالح ${homeRating >= awayRating ? homeTeamName : awayTeamName}.`,
      keyDuel: 'صراع خط الوسط والضغط العالي في الثلث الأخير.',
      analysisSummary: `مواجهة رسمية مرتقبة في ${tournamentName} بناءً على تقييم القوة المسجل للفريقين.`,
    };
  }

  try {
    const response = await ai.models.generateContent({
      model: getActiveGeminiModel(),
      contents: `
أنت الآن المحلل التكتيكي الذكي ومحاكي مباريات الرياضات الإلكترونية التابع لـ IOEF لموسم 2026/2027.
قم بتحليل المواجهة القادمة في ${tournamentName}:
- الفريق المضيف: ${homeTeamName} (تقييم القوة: ${homeRating})
- الفريق الضيف: ${awayTeamName} (تقييم القوة: ${awayRating})

قدم تحليلاً تكتيكياً احتماليا بصيغة JSON يتضمن:
homeWinProb, drawProb, awayWinProb (مجموعها 100), predictedScore, tacticalAdvantage, keyDuel, analysisSummary.
      `,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            homeWinProb: { type: Type.INTEGER },
            drawProb: { type: Type.INTEGER },
            awayWinProb: { type: Type.INTEGER },
            predictedScore: { type: Type.STRING },
            tacticalAdvantage: { type: Type.STRING },
            keyDuel: { type: Type.STRING },
            analysisSummary: { type: Type.STRING },
          },
          required: [
            'homeWinProb',
            'drawProb',
            'awayWinProb',
            'predictedScore',
            'tacticalAdvantage',
            'keyDuel',
            'analysisSummary',
          ],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return {
      homeWinProb: Number(parsed.homeWinProb) || 45,
      drawProb: Number(parsed.drawProb) || 28,
      awayWinProb: Number(parsed.awayWinProb) || 27,
      predictedScore: parsed.predictedScore || '2 - 1',
      tacticalAdvantage: parsed.tacticalAdvantage || 'أفضلية في الاستحواذ وسرعة الارتداد.',
      keyDuel: parsed.keyDuel || 'صراع منطقة العمليات وبناء الهجمات.',
      analysisSummary: parsed.analysisSummary || 'مباراة حافلة بالندية التكتيكية.',
    };
  } catch (err) {
    console.error('Match prediction error:', err);
    return {
      homeWinProb: 45,
      drawProb: 30,
      awayWinProb: 25,
      predictedScore: '1 - 0',
      tacticalAdvantage: 'استقرار التشكيلة والانضباط الدفاعي.',
      keyDuel: 'حراسة المرمى والكرات الثابتة.',
      analysisSummary: 'مواجهة متقاربة تعتمد على استغلال المساحات.',
    };
  }
}

/**
 * 2026/2027 Automated Press Match Report Generator
 */
export async function generateMatchPressReport(
  homeTeamName: string,
  awayTeamName: string,
  homeScore: number,
  awayScore: number,
  roundName: string,
  scorersSummary: string
): Promise<string> {
  if (!process.env.GEMINI_API_KEY) {
    return `بيان المركز الإعلامي لـ IOEF: انتهت مواجهة ${homeTeamName} ضد ${awayTeamName} ضمن ${roundName} بنتيجة (${homeScore} - ${awayScore}). ${scorersSummary ? `أبرز المسجلين: ${scorersSummary}.` : ''} تم رصد النتيجة رسمياً وتحديث جدول الترتيب.`;
  }

  try {
    const response = await ai.models.generateContent({
      model: getActiveGeminiModel(),
      contents: `
اكتب تقريراً صحفياً رسمياً بأسلوب إعلامي رياضي رفيع لصالح المركز الإعلامي للاتحاد الدولي للرياضات الإلكترونية (IOEF):
- المباراة: ${homeTeamName} (${homeScore}) ضد ${awayTeamName} (${awayScore})
- المسابقة والجولة: ${roundName}
- أحداث المواجهة ومسجلو الأهداف: ${scorersSummary || 'أداء تكتيكي متوازن'}
      `,
    });

    return response.text || 'تم إعداد التقرير بنجاح.';
  } catch (err) {
    console.error('Error generating press report:', err);
    return `تقرير المباراة: انتهت مواجهة ${homeTeamName} ضد ${awayTeamName} بنتيجة ${homeScore} - ${awayScore} ضمن ${roundName}.`;
  }
}

/**
 * 2026/2027 AI Duplicate & Multi-Account Fraud Detector Scanner
 * Note: Strictly checks REAL USER identities (WhatsApp & GamerTag) — in-game football players may repeat freely.
 */
export async function detectFraudulentDuplicates(): Promise<{
  flaggedCount: number;
  report: string;
  flaggedRegistrations: Array<{ id: string; name: string; reason: string }>;
}> {
  const registrations = db.getRegistrations();
  const seenPhones = new Map<string, string>();
  const seenGamerTags = new Map<string, string>();
  const flagged: Array<{ id: string; name: string; reason: string }> = [];

  for (const reg of registrations) {
    if (reg.status === 'rejected') continue;
    const cleanPhone = reg.whatsapp.replace(/[^0-9]/g, '');
    const cleanTag = reg.gamerTag.trim().toLowerCase();

    if (cleanPhone && seenPhones.has(cleanPhone)) {
      flagged.push({
        id: reg.id,
        name: reg.fullName,
        reason: `تطابق رقم الواتساب مع طلب سابق (${seenPhones.get(cleanPhone)})`,
      });
    } else if (cleanPhone) {
      seenPhones.set(cleanPhone, reg.fullName);
    }

    if (cleanTag && seenGamerTags.has(cleanTag)) {
      flagged.push({
        id: reg.id,
        name: reg.fullName,
        reason: `تطابق معرف اللعبة (GamerTag) مع طلب مسجل سابقاً`,
      });
    } else if (cleanTag) {
      seenGamerTags.set(cleanTag, reg.fullName);
    }
  }

  const reportText =
    flagged.length === 0
      ? `تم فحص (${registrations.length}) طلب تسجيل بنجاح: لا توجد أي حسابات مكررة أو تكرار في أرقام الواتساب أو معرفات اللاعبين. (ملاحظة: تكرار أسماء لاعبي كرة القدم الافتراضيين داخل التشكيلات مسموح نظاماً ولا يُعد مخالفة).`
      : `تم رصد ${flagged.length} حالات اشتباه بتكرار أرقام الواتساب أو معرفات اللاعبين. يرجى المراجعة قبل الاعتماد.`;

  return {
    flaggedCount: flagged.length,
    report: reportText,
    flaggedRegistrations: flagged,
  };
}

/**
 * Server-side Central AI Assistant with Multi-Turn Memory, Subsystem Routing & Approval-Gated Actions
 */
export async function queryAdminAssistant(
  query: string,
  context?: string,
  history: Array<{ role: 'user' | 'assistant'; text: string }> = []
): Promise<AdminAssistantResponse> {
  const lower = query.toLowerCase();

  // Route to appropriate IOEF AI subsystem
  let routedSubsystem = 'ai_central_assistant';
  if (lower.includes('عضوية') || lower.includes('بطاقة') || lower.includes('اشتراك') || lower.includes('دفع') || lower.includes('تجديد')) {
    routedSubsystem = 'ai_membership_audit';
  } else if (lower.includes('تكرار') || lower.includes('احتيال') || lower.includes('تسجيل')) {
    routedSubsystem = 'ai_registration';
  } else if (lower.includes('مباراة') || lower.includes('نتيجة') || lower.includes('جدول')) {
    routedSubsystem = 'ai_match_manager';
  } else if (lower.includes('عقوبة') || lower.includes('لائحة') || lower.includes('انضباط')) {
    routedSubsystem = 'ai_rules_discipline';
  } else if (lower.includes('إعلان') || lower.includes('بيان') || lower.includes('خبر')) {
    routedSubsystem = 'ai_notifications';
  }

  // Detect action-oriented requests that must require explicit admin approval
  let proposedAction: AssistantProposedAction | undefined;
  if (lower.includes('انشر') || lower.includes('صياغة إعلان') || lower.includes('بيان رسمي')) {
    proposedAction = {
      type: 'publish_news',
      label: 'إرسال المسودة إلى محرر الأخبار الرسمية',
      summary: 'تحويل النص الصادر إلى مسودة خبر عاجل بانتظار اعتمادك للنشر العام.',
      payload: {
        title: 'بيان رسمي صادر عن الأمانة العامة للاتحاد الدولي IOEF',
        category: 'announcement',
      },
    };
  } else if (lower.includes('فحص التكرار') || lower.includes('كشف التكرار')) {
    proposedAction = {
      type: 'run_duplicate_scan',
      label: 'تشغيل فحص التكرار والأهلية الآن',
      summary: 'تشغيل محرك كشف التكرار في أرقام الواتساب ومعرفات اللاعبين.',
      payload: {},
    };
  }

  const dbState = db.getState();
  const approvedTeamsCount = dbState.teams.filter((t) => t.registrationStatus === 'approved').length;
  const pendingRegsCount = dbState.registrations.filter((r) => r.status === 'pending').length;
  const memberships = db.getMemberships();
  const payments = db.getPayments();
  const pendingPaymentsCount = payments.filter((p) => p.status === 'pending_review').length;
  const flaggedPaymentsCount = payments.filter((p) => (p.fraudFlags?.length || 0) > 0 && p.status === 'pending_review').length;
  const ms = db.getMembershipSettings();

  // Direct player / card dossier search match
  const matchedPlayer = dbState.players.find(
    (p) =>
      (p.playerCode && lower.includes(p.playerCode.toLowerCase())) ||
      (p.gamerTag && p.gamerTag.length > 2 && lower.includes(p.gamerTag.toLowerCase())) ||
      (p.fullName && p.fullName.length > 3 && query.includes(p.fullName))
  );
  const matchedMem = matchedPlayer
    ? memberships.find((m) => m.playerId === matchedPlayer.id)
    : memberships.find((m) => lower.includes(m.membershipNumber.toLowerCase()));

  const playerLookupNote = matchedPlayer
    ? `\n• نتيجة البحث المباشر في سجل اللاعبين: ${matchedPlayer.fullName} | كود اللاعب: ${matchedPlayer.playerCode || '-'} | النادي: ${matchedPlayer.teamName} | رقم العضوية: ${matchedMem?.membershipNumber || 'غير مصدرة'} | حالة العضوية: ${matchedMem?.status || '-'}`
    : '';

  if (!process.env.GEMINI_API_KEY || dbState.settings.aiConfig?.enableCentralAssistant === false) {
    return {
      routedSubsystem,
      proposedAction,
      answer: `ملخص الحالة الحية (الوضع التشغيلي الاحتياطي لعدم توفر GEMINI_API_KEY):
• إجمالي الأندية المعتمدة في الموسم 2026/2027: ${approvedTeamsCount} من أصل ${dbState.teams.length} نادياً.
• اللاعبون المسجلون: ${dbState.players.length} لاعباً | بطاقات العضوية المصدرة: ${memberships.length}.
• طلبات التسجيل المعلقة: ${pendingRegsCount} | إيصالات الدفع قيد المراجعة: ${pendingPaymentsCount} (الموسومة للتدقيق: ${flaggedPaymentsCount}).
• سياسة الاشتراك الحالية: الموسم الأول مجاني (${ms.freeFirstSeason ? 'مفعل' : 'غير مفعل'}) | رسوم التجديد المقترحة للموسم القادم: ${ms.renewalFee} ${ms.currency}.
• المباريات المسجلة: ${dbState.fixtures.length} مباراة.
• سقف القوة المعتمد: الدرجة الأولى ${dbState.settings.firstDivisionMinRating}+ | الدرجة الثانية ${dbState.settings.secondDivisionMinRating}+.${playerLookupNote}
لتفعيل الإجابات التحليلية الكاملة من نموذج (${getActiveGeminiModel()})، يرجى إضافة GEMINI_API_KEY في إعدادات الأسرار السحابية.`,
    };
  }

  const summaryContext = `
بيانات منصة الاتحاد الدولي IOEF الفعلية لموسم 2026/2027:
- النموذج النشط: ${getActiveGeminiModel()}
- عدد الأندية الرسمية: ${dbState.teams.length} (المحجوزة والمعتمدة حالياً: ${approvedTeamsCount})
- عدد اللاعبين النشطين: ${dbState.players.length}
- بطاقات العضوية الرقمية المصدرة: ${memberships.length} (نشط/مجاني: ${memberships.filter((m) => m.status === 'free' || m.status === 'active').length} | قيد المراجعة: ${memberships.filter((m) => m.status === 'pending_review').length} | منتهي: ${memberships.filter((m) => m.status === 'expired').length} | موقوف: ${memberships.filter((m) => m.status === 'suspended').length})
- إيصالات التجديد قيد المراجعة: ${pendingPaymentsCount} (حالات اشتباه للتدقيق اليدوي: ${flaggedPaymentsCount})
- الانتقالات المعتمدة: ${(dbState.transfers || []).length}
- سياسة التجديد: الموسم الأول مجاني=${ms.freeFirstSeason} | رسوم التجديد التالية: ${ms.renewalFee} ${ms.currency}
- طلبات التسجيل المعلقة: ${pendingRegsCount}
- المباريات: ${dbState.fixtures.length} (المكتملة: ${dbState.fixtures.filter((f) => f.status === 'finished').length})
- العقوبات النشطة: ${dbState.disciplinary.length}
- معايير التقييم: الدرجة الأولى >= ${dbState.settings.firstDivisionMinRating} | الدرجة الثانية >= ${dbState.settings.secondDivisionMinRating}${playerLookupNote}
`;

  const historyText = history
    .slice(-6)
    .map((h) => `${h.role === 'user' ? 'المسؤول' : 'المساعد'}: ${h.text}`)
    .join('\n');

  try {
    const response = await ai.models.generateContent({
      model: getActiveGeminiModel(),
      contents: `
أنت المساعد الذكي المركزي لإدارة الاتحاد الدولي للرياضات الإلكترونية عبر الإنترنت (IOEF Central AI 2026/2027).
أجب بدقة وبلغة عربية مؤسسية فخمة بناءً فقط على البيانات الحقيقية التالية دون اختلاق نتائج أو لاعبين غير موجودين، ولا تصدر أي قرار مالي تلقائي لأن جميع عمليات الاعتماد المالي بيد الإدارة فقط:
${summaryContext}
${context ? `سياق إضافي من لوحة التحكم: ${context}` : ''}
${historyText ? `سياق المحادثة السابقة:\n${historyText}` : ''}

طلب الإدارة الحالي:
${query}
      `,
    });

    if (proposedAction && proposedAction.type === 'publish_news' && response.text) {
      proposedAction.payload.content = response.text;
    }

    return {
      answer: response.text || 'تمت معالجة الطلب بنجاح.',
      routedSubsystem,
      proposedAction,
    };
  } catch (error) {
    console.error('Gemini Admin Assistant error:', error);
    return {
      routedSubsystem,
      answer: 'حدث خطأ أثناء الاتصال بمحرك Gemini المركزي. يرجى المحاولة مجدداً أو فحص صلاحية المفتاح.',
    };
  }
}
