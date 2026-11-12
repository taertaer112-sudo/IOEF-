import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { Request, Response, NextFunction } from 'express';
import { AdminPermissions, AdminUser } from './types';

const SECRET_FILE = path.resolve(process.cwd(), 'server/data/.session_secret');
const JWT_ISSUER = 'ioef.org';
const JWT_AUDIENCE = 'ioef-admin-api';
const JWT_TTL_SECONDS = 12 * 60 * 60; // 12 hours

function loadOrCreateSecret(): string {
  if (process.env.IOEF_AUTH_SECRET && process.env.IOEF_AUTH_SECRET.length >= 16) {
    return process.env.IOEF_AUTH_SECRET;
  }
  try {
    const dir = path.dirname(SECRET_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (fs.existsSync(SECRET_FILE)) {
      const s = fs.readFileSync(SECRET_FILE, 'utf-8').trim();
      if (s.length >= 32) return s;
    }
    const generated = crypto.randomBytes(32).toString('hex');
    fs.writeFileSync(SECRET_FILE, generated, { encoding: 'utf-8', mode: 0o600 });
    return generated;
  } catch {
    return crypto.randomBytes(32).toString('hex');
  }
}

const SESSION_SECRET = loadOrCreateSecret();

// ==========================================
// ROLE-BASED ACCESS CONTROL (RBAC) POLICY
// ==========================================
export type AdminRole = AdminUser['role'];

export const ROLE_LABELS_AR: Record<AdminRole, string> = {
  president: 'رئيس الاتحاد',
  director: 'مدير الاتحاد',
  organizer: 'المنظم',
};

/**
 * Maximum non-overlapping capability ceiling for each official IOEF role.
 * Guarantees strict separation of duties even if database permissions are altered.
 */
export const ROLE_CAPABILITY_CEILING: Record<AdminRole, AdminPermissions> = {
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
    manageSettingsAndAI: false, // Exclusive to President
    manageBackups: true, // Snapshot creation only; restore is exclusive to President
    manageAdmins: false, // Exclusive to President
  },
  organizer: {
    manageRegistrations: true, // Scoped strictly to assignedDivisionId
    manageSquadLocks: false, // Exclusive to Director & President
    manageMatchesAndResults: true, // Scoped strictly to assignedDivisionId
    manageTournamentsAndRules: false, // Exclusive to Director & President
    manageDiscipline: false, // Exclusive to Director & President
    manageNewsAndStore: false, // Exclusive to Director & President
    manageSettingsAndAI: false, // Exclusive to President
    manageBackups: false, // Exclusive to Director & President
    manageAdmins: false, // Exclusive to President
  },
};

export function enforceRoleCapabilities(
  role: AdminRole,
  requested: Partial<AdminPermissions> | undefined
): AdminPermissions {
  const ceiling = ROLE_CAPABILITY_CEILING[role];
  return {
    manageRegistrations: ceiling.manageRegistrations && !!requested?.manageRegistrations,
    manageSquadLocks: ceiling.manageSquadLocks && !!requested?.manageSquadLocks,
    manageMatchesAndResults: ceiling.manageMatchesAndResults && !!requested?.manageMatchesAndResults,
    manageTournamentsAndRules: ceiling.manageTournamentsAndRules && !!requested?.manageTournamentsAndRules,
    manageDiscipline: ceiling.manageDiscipline && !!requested?.manageDiscipline,
    manageNewsAndStore: ceiling.manageNewsAndStore && !!requested?.manageNewsAndStore,
    manageSettingsAndAI: ceiling.manageSettingsAndAI && !!requested?.manageSettingsAndAI,
    manageBackups: ceiling.manageBackups && !!requested?.manageBackups,
    manageAdmins: ceiling.manageAdmins && !!requested?.manageAdmins,
  };
}

export function getRolePolicyMatrix() {
  return {
    president: {
      role: 'president' as AdminRole,
      labelAr: ROLE_LABELS_AR.president,
      scopeAr: 'السيادة الكاملة على جميع الاتحادات الستة والبطولات الدولية وإعدادات الخادم',
      exclusiveActions: ['إدارة المشرفين وتفويض الصلاحيات', 'تعديل إعدادات النظام ونماذج الذكاء الاصطناعي', 'استعادة النسخ الاحتياطية الكاملة'],
      capabilities: ROLE_CAPABILITY_CEILING.president,
    },
    director: {
      role: 'director' as AdminRole,
      labelAr: ROLE_LABELS_AR.director,
      scopeAr: 'إدارة العمليات والمسابقات والانضباط والإعلام عبر جميع الاتحادات الستة',
      exclusiveActions: ['إدارة البطولات واللوائح التنظيمية', 'إصدار العقوبات والانضباط', 'فتح وقفل التشكيلات', 'الأخبار والمتجر وسجل النشاطات'],
      capabilities: ROLE_CAPABILITY_CEILING.director,
    },
    organizer: {
      role: 'organizer' as AdminRole,
      labelAr: ROLE_LABELS_AR.organizer,
      scopeAr: 'مقيد بالاتحاد الوطني المعيّن له فقط (Division-Scoped)',
      exclusiveActions: ['مراجعة طلبات تسجيل الأندية في اتحاده', 'جدولة المباريات وتعيين الحكام ورصد النتائج في اتحاده', 'معالجة تذاكر الدعم في اتحاده'],
      capabilities: ROLE_CAPABILITY_CEILING.organizer,
    },
  };
}

// ==========================================
// PASSWORD HASHING (SALTED SCRYPT)
// ==========================================
export function hashPassword(password: string, existingSalt?: string): string {
  const salt = existingSalt || crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, keyHex] = parts;
  const derived = crypto.scryptSync(password, salt, 64);
  const keyBuf = Buffer.from(keyHex, 'hex');
  if (derived.length !== keyBuf.length) return false;
  return crypto.timingSafeEqual(derived, keyBuf);
}

const CREDENTIALS_FILE = path.resolve(process.cwd(), 'server/data/.admin_credentials.json');

function loadCredentialsMap(): Map<string, string> {
  const map = new Map<string, string>();
  try {
    const dir = path.dirname(CREDENTIALS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (fs.existsSync(CREDENTIALS_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(CREDENTIALS_FILE, 'utf-8')) as Record<string, string>;
      for (const [k, v] of Object.entries(parsed)) {
        if (typeof v === 'string' && v.includes(':')) map.set(k.toLowerCase(), v);
      }
    }
  } catch {
    // ignore read errors and regenerate defaults
  }

  let modified = false;
  if (!map.has('president')) {
    map.set('president', hashPassword(process.env.IOEF_PRES_PASS || 'IOEF-Pres-2026!'));
    modified = true;
  }
  if (!map.has('director')) {
    map.set('director', hashPassword(process.env.IOEF_DIR_PASS || 'IOEF-Dir-2026!'));
    modified = true;
  }
  if (!map.has('organizer')) {
    map.set('organizer', hashPassword(process.env.IOEF_ORG_PASS || 'IOEF-Org-2026!'));
    modified = true;
  }
  if (modified) saveCredentialsMap(map);
  return map;
}

function saveCredentialsMap(map: Map<string, string>): void {
  try {
    const dir = path.dirname(CREDENTIALS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const obj: Record<string, string> = {};
    for (const [k, v] of map.entries()) obj[k] = v;
    fs.writeFileSync(CREDENTIALS_FILE, JSON.stringify(obj, null, 2), { encoding: 'utf-8', mode: 0o600 });
  } catch (err) {
    console.error('Failed saving admin credentials:', err);
  }
}

const ADMIN_PASSWORDS: Map<string, string> = loadCredentialsMap();

export function resolveLoginUsername(rawUsername: string): string {
  const normalized = rawUsername.trim().toLowerCase().replace(/\s+/g, ' ');
  if (
    normalized === 'islam mohamed' ||
    normalized === 'islam' ||
    normalized === 'islammohamed' ||
    normalized === 'islammohamedhosnymohamedalghar@gmail.com' ||
    normalized === 'president@ioef.org'
  ) {
    return 'president';
  }
  return normalized;
}

export function verifyAdminCredential(username: string, password: string): boolean {
  const key = resolveLoginUsername(username);
  const hash = ADMIN_PASSWORDS.get(key);
  if (!hash) return false;
  return verifyPassword(password, hash);
}

export function setAdminCredential(username: string, newPassword: string): void {
  const key = username.trim().toLowerCase();
  ADMIN_PASSWORDS.set(key, hashPassword(newPassword));
  saveCredentialsMap(ADMIN_PASSWORDS);
}

export function updateAdminPassword(username: string, newPassword: string): void {
  setAdminCredential(username, newPassword);
}

export function removeAdminCredential(username: string): void {
  const key = username.trim().toLowerCase();
  if (key === 'president') return;
  ADMIN_PASSWORDS.delete(key);
  saveCredentialsMap(ADMIN_PASSWORDS);
}

// ==========================================
// RFC 7519 JSON WEB TOKENS (JWT - HS256)
// ==========================================
const revokedTokens = new Set<string>();

export interface JwtHeader {
  alg: 'HS256';
  typ: 'JWT';
}

export interface JwtPayload {
  iss: string;
  aud: string;
  sub: string;
  username: string;
  name: string;
  role: AdminRole;
  roleAr: string;
  assignedDivisionId: string | null;
  permissions: AdminPermissions;
  iat: number;
  nbf: number;
  exp: number;
  jti: string;
}

function signJwtSegments(headerB64: string, payloadB64: string): string {
  return crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(`${headerB64}.${payloadB64}`)
    .digest('base64url');
}

export function createJwtToken(admin: AdminUser): { token: string; claims: JwtPayload; expiresIn: number } {
  const nowSec = Math.floor(Date.now() / 1000);
  const header: JwtHeader = { alg: 'HS256', typ: 'JWT' };
  const effectivePermissions = enforceRoleCapabilities(admin.role, admin.permissions);

  const claims: JwtPayload = {
    iss: JWT_ISSUER,
    aud: JWT_AUDIENCE,
    sub: admin.id,
    username: admin.username,
    name: admin.name,
    role: admin.role,
    roleAr: ROLE_LABELS_AR[admin.role],
    assignedDivisionId: admin.assignedDivisionId || null,
    permissions: effectivePermissions,
    iat: nowSec,
    nbf: nowSec,
    exp: nowSec + JWT_TTL_SECONDS,
    jti: crypto.randomBytes(12).toString('hex'),
  };

  const headerB64 = Buffer.from(JSON.stringify(header), 'utf-8').toString('base64url');
  const payloadB64 = Buffer.from(JSON.stringify(claims), 'utf-8').toString('base64url');
  const signatureB64 = signJwtSegments(headerB64, payloadB64);

  return {
    token: `${headerB64}.${payloadB64}.${signatureB64}`,
    claims,
    expiresIn: JWT_TTL_SECONDS,
  };
}

export function verifyJwtToken(token: string): JwtPayload | null {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [headerB64, payloadB64, signatureB64] = parts;
  if (!headerB64 || !payloadB64 || !signatureB64) return null;

  try {
    const header = JSON.parse(Buffer.from(headerB64, 'base64url').toString('utf-8')) as Partial<JwtHeader>;
    // Explicitly reject "alg": "none" or algorithm downgrade attacks
    if (header.alg !== 'HS256' || header.typ !== 'JWT') return null;

    const expectedSig = signJwtSegments(headerB64, payloadB64);
    const sigBuf = Buffer.from(signatureB64);
    const expBuf = Buffer.from(expectedSig);
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return null;
    }

    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf-8')) as JwtPayload;
    const nowSec = Math.floor(Date.now() / 1000);

    if (payload.iss !== JWT_ISSUER || payload.aud !== JWT_AUDIENCE) return null;
    if (!payload.sub || !payload.jti || !['president', 'director', 'organizer'].includes(payload.role)) return null;
    if (typeof payload.nbf === 'number' && nowSec < payload.nbf) return null;
    if (typeof payload.exp !== 'number' || nowSec >= payload.exp) return null;
    if (revokedTokens.has(payload.jti)) return null;

    return payload;
  } catch {
    return null;
  }
}

export function createSessionToken(admin: AdminUser): string {
  return createJwtToken(admin).token;
}

export function verifySessionToken(token: string): JwtPayload | null {
  return verifyJwtToken(token);
}

export function revokeSessionToken(token: string): void {
  const payload = verifyJwtToken(token);
  if (payload?.jti) {
    revokedTokens.add(payload.jti);
  }
}

// ==========================================
// EXPRESS JWT & RBAC MIDDLEWARES
// ==========================================
export interface AuthenticatedRequest extends Request {
  adminUser?: AdminUser;
  jwtClaims?: JwtPayload;
}

let getAdminByIdFn: ((id: string) => AdminUser | undefined) | null = null;
export function registerAdminLookup(fn: (id: string) => AdminUser | undefined) {
  getAdminByIdFn = fn;
}

export function requireAdminAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  const claims = verifyJwtToken(token);

  if (!claims) {
    res.status(401).json({
      error: 'رمز التحقق JWT غير صالح أو منتهي الصلاحية. يرجى تسجيل الدخول إلى بوابة الإدارة.',
      code: 'INVALID_OR_EXPIRED_JWT',
    });
    return;
  }

  const admin = getAdminByIdFn ? getAdminByIdFn(claims.sub) : undefined;
  if (!admin || !admin.active || admin.role !== claims.role) {
    res.status(401).json({
      error: 'الحساب الإداري غير نشط أو تم تعديل صلاحياته؛ يرجى إعادة تسجيل الدخول.',
      code: 'ACCOUNT_INACTIVE_OR_ROLE_CHANGED',
    });
    return;
  }

  // Always enforce the role's capability ceiling on the hydrated admin object
  req.adminUser = {
    ...admin,
    permissions: enforceRoleCapabilities(admin.role, admin.permissions),
  };
  req.jwtClaims = claims;
  next();
}

export function requireRole(...allowedRoles: AdminRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const admin = req.adminUser;
    if (!admin) {
      res.status(401).json({ error: 'مطلوب مصادقة JWT للوصول إلى هذا المسار.', code: 'UNAUTHORIZED' });
      return;
    }

    if (!allowedRoles.includes(admin.role)) {
      const allowedAr = allowedRoles.map((r) => ROLE_LABELS_AR[r]).join(' أو ');
      res.status(403).json({
        error: `غير مسموح لدور "${ROLE_LABELS_AR[admin.role]}" بتنفيذ هذا الإجراء. الصلاحية محصورة على: ${allowedAr}.`,
        code: 'FORBIDDEN_ROLE',
        requiredRoles: allowedRoles,
        currentRole: admin.role,
      });
      return;
    }

    next();
  };
}

export function requirePermission(permission: keyof AdminPermissions) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const admin = req.adminUser;
    if (!admin) {
      res.status(401).json({ error: 'Authentication required', code: 'UNAUTHORIZED' });
      return;
    }

    // Check strict role capability ceiling first (no privilege escalation across roles)
    if (!ROLE_CAPABILITY_CEILING[admin.role][permission]) {
      res.status(403).json({
        error: `دور "${ROLE_LABELS_AR[admin.role]}" لا يمتلك صلاحية (${permission}) وفق سياسة الفصل بين الأدوار.`,
        code: 'FORBIDDEN_ROLE_CEILING',
      });
      return;
    }

    if (admin.role === 'president') {
      next();
      return;
    }

    if (!admin.permissions || !admin.permissions[permission]) {
      res.status(403).json({
        error: 'عفواً، صلاحيات حسابك الإداري لا تسمح بتنفيذ هذا الإجراء.',
        code: 'FORBIDDEN_PERMISSION',
      });
      return;
    }

    next();
  };
}

export function checkDivisionScope(admin: AdminUser | undefined, targetDivisionId?: string): boolean {
  if (!admin) return false;
  if (admin.role === 'president' || admin.role === 'director') return true;
  // Organizer MUST be explicitly assigned to a national federation and target MUST match that division
  if (!admin.assignedDivisionId || !targetDivisionId) return false;
  return admin.assignedDivisionId === targetDivisionId;
}

// ==========================================
// INPUT SANITIZATION & SECURITY HEADERS
// ==========================================
export function sanitizeText(value: unknown, maxLength: number = 2000): string {
  if (typeof value !== 'string') return '';
  return value
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/<\/?[^>]+(>|$)/g, '')
    .replace(/\u0000/g, '')
    .trim()
    .slice(0, maxLength);
}

const ALLOWED_IMAGE_MIME = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8 MB

export function validateImageUpload(imageInput: unknown): { valid: boolean; reason?: string } {
  if (typeof imageInput !== 'string' || !imageInput.trim()) {
    return { valid: false, reason: 'الصورة المرفوعة غير صالحة.' };
  }

  const trimmed = imageInput.trim();

  if (trimmed.startsWith('/src/assets/images/') || trimmed.startsWith('/assets/')) {
    if (trimmed.includes('..')) {
      return { valid: false, reason: 'مسار الصورة غير آمن.' };
    }
    return { valid: true };
  }

  const match = trimmed.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,([A-Za-z0-9+/=]+)$/);
  if (!match) {
    return { valid: false, reason: 'صيغة الصورة غير مدعومة. يرجى رفع صورة بصيغة JPG أو PNG أو WEBP.' };
  }

  const mime = match[1].toLowerCase();
  if (!ALLOWED_IMAGE_MIME.includes(mime)) {
    return { valid: false, reason: `نوع الملف (${mime}) غير مسموح به.` };
  }

  const base64Body = match[2];
  const estimatedBytes = Math.floor((base64Body.length * 3) / 4);
  if (estimatedBytes > MAX_IMAGE_BYTES) {
    return { valid: false, reason: 'حجم الصورة يتجاوز الحد الأقصى المسموح به (8 ميجابايت).' };
  }

  return { valid: true };
}

export function securityHeaders(_req: Request, res: Response, next: NextFunction) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
}
