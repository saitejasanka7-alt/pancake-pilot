import crypto from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { loginSchema, signupSchema } from '../src/shared/schemas.ts';
import {
  generateSecureToken,
  hashToken,
  readDb,
  StoredUser,
  writeDb,
} from './db.ts';

export const SESSION_COOKIE_NAME = 'pp_session';
const TOKEN_TTL_MS = 15 * 60 * 1000; // 15 minutes
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// Simple in-memory rate limiter for auth endpoints
const rateBuckets = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(key: string, maxRequests = 8, windowMs = 10 * 60 * 1000): boolean {
  const now = Date.now();
  const bucket = rateBuckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    rateBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (bucket.count >= maxRequests) return false;
  bucket.count += 1;
  return true;
}

function parseCookies(req: Request): Record<string, string> {
  const header = req.headers.cookie;
  if (!header) return {};
  const result: Record<string, string> = {};
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const val = decodeURIComponent(part.slice(idx + 1).trim());
    result[key] = val;
  }
  return result;
}

export function getAuthenticatedUser(req: Request): StoredUser | null {
  const cookies = parseCookies(req);
  const bearer = req.headers.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.slice(7).trim()
    : '';
  const rawToken = cookies[SESSION_COOKIE_NAME] || bearer;
  if (!rawToken) return null;

  const db = readDb();
  const tokenHash = hashToken(rawToken);
  const now = Date.now();
  const session = db.sessions.find(
    (s) => s.tokenHash === tokenHash && !s.revokedAt && s.expiresAt > now
  );
  if (!session) return null;

  return db.users.find((u) => u.id === session.userId) ?? null;
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const user = getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ error: 'Authentication required. Please sign in.' });
    return;
  }
  (req as Request & { authUser?: StoredUser }).authUser = user;
  next();
}

async function sendMagicLinkEmail(
  email: string,
  fullName: string,
  verifyUrl: string
): Promise<{ emailSent: boolean; reason?: string }> {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey || resendKey === 'YOUR_RESEND_API_KEY') {
    return {
      emailSent: false,
      reason:
        'RESEND_API_KEY is not configured in this environment. Use the development verification link below or continue in Guest / Demo mode.',
    };
  }

  const fromEmail = process.env.AUTH_FROM_EMAIL || 'PancakePilot AI <onboarding@resend.dev>';
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [email],
        subject: 'Your PancakePilot AI Magic Login Link',
        html: `
          <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; background: #080B16; color: #F6F7FB; border-radius: 12px;">
            <h2 style="margin: 0 0 12px; color: #A46BFF;">PancakePilot AI</h2>
            <p>Hi ${fullName},</p>
            <p>Click the secure single-use link below to sign in to your PancakePilot AI workspace. This link expires in 15 minutes.</p>
            <p style="margin: 24px 0;">
              <a href="${verifyUrl}" style="background: #8156F8; color: #ffffff; padding: 12px 20px; border-radius: 8px; text-decoration: none; font-weight: 600;">Verify &amp; Open PancakePilot</a>
            </p>
            <p style="font-size: 12px; color: #9BA6C0;">If you did not request this link, you can safely ignore this email.</p>
          </div>
        `,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return { emailSent: false, reason: `Resend email service rejected the request: ${errText}` };
    }
    return { emailSent: true };
  } catch (err) {
    return {
      emailSent: false,
      reason: err instanceof Error ? err.message : 'Unable to reach Resend email service.',
    };
  }
}

function buildVerifyUrl(req: Request, rawToken: string): string {
  const configuredOrigin = process.env.APP_URL;
  const origin =
    configuredOrigin && configuredOrigin !== 'MY_APP_URL'
      ? configuredOrigin.replace(/\/$/, '')
      : `${req.protocol}://${req.get('host')}`;
  return `${origin}/auth/verify?token=${encodeURIComponent(rawToken)}`;
}

export async function handleSignup(req: Request, res: Response): Promise<void> {
  const ipKey = `signup:${req.ip}`;
  if (!checkRateLimit(ipKey)) {
    res.status(429).json({ error: 'Too many signup attempts. Please wait a few minutes.' });
    return;
  }

  const parsed = signupSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: parsed.error.issues[0]?.message || 'Invalid signup information.',
    });
    return;
  }

  const email = parsed.data.email.toLowerCase();
  const db = readDb();

  if (db.users.some((u) => u.email === email)) {
    res.status(409).json({
      error: 'An account with this email already exists. Please use Sign In instead.',
    });
    return;
  }

  const nowIso = new Date().toISOString();
  const newUser: StoredUser = {
    id: `usr_${crypto.randomUUID()}`,
    email,
    fullName: parsed.data.fullName,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  const rawToken = generateSecureToken();
  db.users.push(newUser);
  db.magicTokens.push({
    tokenHash: hashToken(rawToken),
    userId: newUser.id,
    email,
    expiresAt: Date.now() + TOKEN_TTL_MS,
    usedAt: null,
  });
  writeDb(db);

  const verifyUrl = buildVerifyUrl(req, rawToken);
  const delivery = await sendMagicLinkEmail(email, newUser.fullName, verifyUrl);

  res.status(201).json({
    ok: true,
    email,
    emailSent: delivery.emailSent,
    deliveryMessage: delivery.emailSent
      ? `A secure verification link was sent to ${email}.`
      : delivery.reason,
    devVerificationUrl:
      !delivery.emailSent && process.env.NODE_ENV !== 'production' ? verifyUrl : undefined,
  });
}

export async function handleLogin(req: Request, res: Response): Promise<void> {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: parsed.error.issues[0]?.message || 'Please provide a valid email address.',
    });
    return;
  }

  const email = parsed.data.email.toLowerCase();
  if (!checkRateLimit(`login:${email}`) || !checkRateLimit(`login-ip:${req.ip}`, 15)) {
    res.status(429).json({ error: 'Rate limit exceeded. Please wait before requesting another link.' });
    return;
  }

  const db = readDb();
  const user = db.users.find((u) => u.email === email);
  if (!user) {
    res.status(404).json({
      error: 'No registered account was found for that email. Create an account first or continue as Guest.',
    });
    return;
  }

  const rawToken = generateSecureToken();
  db.magicTokens.push({
    tokenHash: hashToken(rawToken),
    userId: user.id,
    email,
    expiresAt: Date.now() + TOKEN_TTL_MS,
    usedAt: null,
  });
  writeDb(db);

  const verifyUrl = buildVerifyUrl(req, rawToken);
  const delivery = await sendMagicLinkEmail(email, user.fullName, verifyUrl);

  res.json({
    ok: true,
    email,
    emailSent: delivery.emailSent,
    deliveryMessage: delivery.emailSent
      ? `A secure login link was sent to ${email}.`
      : delivery.reason,
    devVerificationUrl:
      !delivery.emailSent && process.env.NODE_ENV !== 'production' ? verifyUrl : undefined,
  });
}

export function handleVerifyToken(req: Request, res: Response): void {
  const token = typeof req.body?.token === 'string' ? req.body.token.trim() : '';
  if (!token) {
    res.status(400).json({ error: 'Verification token is missing.' });
    return;
  }

  const db = readDb();
  const tokenHash = hashToken(token);
  const record = db.magicTokens.find((t) => t.tokenHash === tokenHash);

  if (!record) {
    res.status(400).json({ error: 'Invalid verification link. Request a new magic link.' });
    return;
  }
  if (record.usedAt !== null) {
    res.status(400).json({ error: 'This magic link has already been used. Please request a fresh link.' });
    return;
  }
  if (record.expiresAt < Date.now()) {
    res.status(400).json({ error: 'This magic link has expired (15-minute window). Please request a new one.' });
    return;
  }

  const user = db.users.find((u) => u.id === record.userId);
  if (!user) {
    res.status(404).json({ error: 'Account no longer exists.' });
    return;
  }

  // Invalidate single-use token
  record.usedAt = Date.now();

  // Issue session
  const rawSession = generateSecureToken();
  db.sessions.push({
    id: `sess_${crypto.randomUUID()}`,
    tokenHash: hashToken(rawSession),
    userId: user.id,
    createdAt: Date.now(),
    expiresAt: Date.now() + SESSION_TTL_MS,
    revokedAt: null,
  });
  writeDb(db);

  res.cookie(SESSION_COOKIE_NAME, rawSession, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: SESSION_TTL_MS,
    path: '/',
  });

  res.json({
    ok: true,
    sessionToken: rawSession,
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      createdAt: user.createdAt,
    },
  });
}

export function handleGetMe(req: Request, res: Response): void {
  const user = getAuthenticatedUser(req);
  if (!user) {
    res.json({ authenticated: false, user: null });
    return;
  }
  res.json({
    authenticated: true,
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      createdAt: user.createdAt,
    },
  });
}

export function handleLogout(req: Request, res: Response): void {
  const cookies = parseCookies(req);
  const bearer = req.headers.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.slice(7).trim()
    : '';
  const rawToken = cookies[SESSION_COOKIE_NAME] || bearer;

  if (rawToken) {
    const db = readDb();
    const tokenHash = hashToken(rawToken);
    const session = db.sessions.find((s) => s.tokenHash === tokenHash);
    if (session) {
      session.revokedAt = Date.now();
      writeDb(db);
    }
  }

  res.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
  res.json({ ok: true });
}

export function handleDeleteAccount(req: Request, res: Response): void {
  const user = getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }
  const db = readDb();
  db.users = db.users.filter((u) => u.id !== user.id);
  db.sessions = db.sessions.filter((s) => s.userId !== user.id);
  db.magicTokens = db.magicTokens.filter((t) => t.userId !== user.id);
  delete db.userDatasets[user.id];
  writeDb(db);
  res.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
  res.json({ ok: true });
}
