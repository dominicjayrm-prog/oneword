import { cookies } from 'next/headers';
import crypto from 'crypto';

const COOKIE_NAME = 'oneword_admin_auth';
const CSRF_COOKIE = 'oneword_csrf';

// --- Rate limiting (in-memory, per-process) ---
const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

function getRateLimitKey(ip: string): string {
  return ip || 'unknown';
}

export function checkRateLimit(ip: string): { allowed: boolean; remainingMs: number } {
  const key = getRateLimitKey(ip);
  const now = Date.now();
  const entry = loginAttempts.get(key);

  if (!entry || now > entry.resetAt) {
    return { allowed: true, remainingMs: 0 };
  }

  if (entry.count >= MAX_ATTEMPTS) {
    return { allowed: false, remainingMs: entry.resetAt - now };
  }

  return { allowed: true, remainingMs: 0 };
}

export function recordLoginAttempt(ip: string) {
  const key = getRateLimitKey(ip);
  const now = Date.now();
  const entry = loginAttempts.get(key);

  if (!entry || now > entry.resetAt) {
    loginAttempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
  } else {
    entry.count++;
  }
}

export function clearLoginAttempts(ip: string) {
  loginAttempts.delete(getRateLimitKey(ip));
}

// --- HMAC-signed session token ---
function getSecret(): string {
  const secret = process.env.ADMIN_PASSWORD;
  if (!secret) throw new Error('ADMIN_PASSWORD not set');
  return secret;
}

function signToken(payload: string): string {
  return crypto.createHmac('sha256', getSecret()).update(payload).digest('hex');
}

function createSessionToken(): string {
  const payload = `admin:${Date.now()}:${crypto.randomBytes(16).toString('hex')}`;
  const signature = signToken(payload);
  return `${payload}.${signature}`;
}

function verifySessionToken(token: string): boolean {
  const lastDot = token.lastIndexOf('.');
  if (lastDot === -1) return false;
  const payload = token.substring(0, lastDot);
  const signature = token.substring(lastDot + 1);
  const expected = signToken(payload);
  return crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'));
}

export async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return false;
  try {
    return verifySessionToken(token);
  } catch {
    return false;
  }
}

export async function setAuthenticated() {
  const cookieStore = await cookies();
  const token = createSessionToken();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  });
}

// --- CSRF protection ---
export async function generateCsrfToken(): Promise<string> {
  const token = crypto.randomBytes(32).toString('hex');
  const cookieStore = await cookies();
  cookieStore.set(CSRF_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60, // 1 hour
    path: '/',
  });
  return token;
}

export async function validateCsrfToken(token: string): Promise<boolean> {
  const cookieStore = await cookies();
  const stored = cookieStore.get(CSRF_COOKIE)?.value;
  if (!stored || !token) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(stored), Buffer.from(token));
  } catch {
    return false;
  }
}
