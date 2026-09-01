// Season Intel Stripe helpers.
// Feature-flag: all four env vars must be non-empty. Missing keys must never
// crash the site — callers return 503 { error: 'checkout_not_configured' }.
//
// Membership store: prefer Supabase `season_intel_members` (same project as
// the newsletter). If the table or service role is missing, we log and rely
// on the signed member cookie set after Checkout success. A durable store
// beyond that is the follow-up once Simon pastes live keys.

import { createHmac, timingSafeEqual } from 'node:crypto';
import Stripe from 'stripe';
import { rest } from './community.js';

export const STRIPE_ENV_KEYS = [
  'STRIPE_SECRET_KEY',
  'STRIPE_PUBLISHABLE_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'STRIPE_PRICE_ID',
];

const COOKIE = 'oi_si_member';
const YEAR_S = 60 * 60 * 24 * 365;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function present(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

export function checkoutConfigured() {
  return STRIPE_ENV_KEYS.every((key) => present(process.env[key]));
}

export function missingStripeKeys() {
  return STRIPE_ENV_KEYS.filter((key) => !present(process.env[key]));
}

export function notConfigured() {
  return { error: 'checkout_not_configured' };
}

export function getStripe() {
  if (!checkoutConfigured()) return null;
  return new Stripe(process.env.STRIPE_SECRET_KEY.trim());
}

export function siteOrigin(req) {
  const envOrigin = (process.env.SITE_ORIGIN || process.env.OPENROUTER_SITE_URL || '').trim();
  if (envOrigin) return envOrigin.replace(/\/$/, '');
  const host = req?.headers?.['x-forwarded-host'] || req?.headers?.host;
  const proto = req?.headers?.['x-forwarded-proto'] || 'https';
  if (host) return `${proto}://${Array.isArray(host) ? host[0] : host}`.replace(/\/$/, '');
  return 'https://outdoorintel.ca';
}

export function normalizeLang(lang) {
  return lang === 'fr' ? 'fr' : 'en';
}

export function normalizeEmail(email) {
  const value = (email || '').trim().toLowerCase();
  if (!EMAIL_RE.test(value) || value.length > 254) return null;
  return value;
}

export function caslNote(lang) {
  return lang === 'fr'
    ? 'Les courriels Season Intel indiquent comment se désabonner : écrivez à hello@outdoorintel.ca. Il n’y a pas d’URL de désabonnement public pour le moment.'
    : 'Season Intel emails include an unsubscribe note: write to hello@outdoorintel.ca. There is no public unsubscribe URL yet.';
}

function signingSecret() {
  return (process.env.STRIPE_WEBHOOK_SECRET || '').trim();
}

export function signMemberToken({ email, customerId, subscriptionId, status, exp }) {
  const secret = signingSecret();
  if (!secret || !email) return null;
  const payload = [email, customerId || '', subscriptionId || '', status || 'active', String(exp || 0)].join('|');
  const sig = createHmac('sha256', secret).update(payload).digest('base64url');
  return Buffer.from(payload, 'utf8').toString('base64url') + '.' + sig;
}

export function readMemberToken(token) {
  const secret = signingSecret();
  if (!secret || typeof token !== 'string' || !token.includes('.')) return null;
  const [payloadB64, sig] = token.split('.');
  let payload;
  try {
    payload = Buffer.from(payloadB64, 'base64url').toString('utf8');
  } catch {
    return null;
  }
  const expected = createHmac('sha256', secret).update(payload).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  const [email, customerId, subscriptionId, status, expRaw] = payload.split('|');
  const exp = Number(expRaw);
  if (!email || !Number.isFinite(exp) || exp * 1000 < Date.now()) return null;
  return { email, customerId, subscriptionId, status, exp };
}

export function cookieFromHeader(req) {
  const raw = req?.headers?.cookie;
  if (!raw) return null;
  const parts = String(raw).split(';');
  for (const part of parts) {
    const idx = part.indexOf('=');
    if (idx < 0) continue;
    const name = part.slice(0, idx).trim();
    if (name === COOKIE) return decodeURIComponent(part.slice(idx + 1).trim());
  }
  return null;
}

export function memberFromRequest(req) {
  return readMemberToken(cookieFromHeader(req));
}

export function memberSetCookie(member, req) {
  const exp = Math.floor(Date.now() / 1000) + YEAR_S;
  const token = signMemberToken({ ...member, exp });
  if (!token) return null;
  const host = String(req?.headers?.host || '');
  const secure = !host.includes('localhost') && !host.startsWith('127.');
  const parts = [
    `${COOKIE}=${token}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${YEAR_S}`,
  ];
  if (secure) parts.push('Secure');
  return parts.join('; ');
}

export async function persistMember(row) {
  const email = normalizeEmail(row.email);
  if (!email) {
    console.warn('[season-intel] member persist skipped: no email');
    return { stored: 'log_only' };
  }
  const record = {
    email,
    stripe_customer_id: row.customerId || null,
    stripe_subscription_id: row.subscriptionId || null,
    status: row.status || 'active',
    lang: normalizeLang(row.lang),
    updated_at: new Date().toISOString(),
  };
  console.log('[season-intel] member', {
    email: 'set',
    customerId: record.stripe_customer_id,
    subscriptionId: record.stripe_subscription_id,
    status: record.status,
  });
  try {
    await rest('season_intel_members?on_conflict=email', {
      method: 'POST',
      prefer: 'resolution=merge-duplicates,return=minimal',
      body: [record],
    });
    return { stored: 'supabase' };
  } catch (err) {
    console.warn('[season-intel] Supabase member store skipped:', err.message);
    return { stored: 'log_only', error: err.message };
  }
}

async function patchMemberBySubscription(subscriptionId, patch) {
  if (!subscriptionId) return false;
  try {
    await rest(
      `season_intel_members?stripe_subscription_id=eq.${encodeURIComponent(subscriptionId)}`,
      { method: 'PATCH', prefer: 'return=minimal', body: patch }
    );
    return true;
  } catch (err) {
    console.warn('[season-intel] subscription patch skipped:', err.message);
    return false;
  }
}

function idOf(value) {
  if (!value) return null;
  if (typeof value === 'string') return value;
  return value.id || null;
}

export async function applyStripeEvent(event) {
  const type = event?.type;
  if (type === 'checkout.session.completed') {
    const session = event.data?.object || {};
    const email = normalizeEmail(
      session.customer_details?.email || session.customer_email || session.metadata?.email
    );
    const customerId = idOf(session.customer);
    const subscriptionId = idOf(session.subscription);
    const lang = normalizeLang(session.metadata?.lang || session.locale);
    await persistMember({
      email,
      customerId,
      subscriptionId,
      status: 'active',
      lang,
    });
    return { handled: type };
  }

  if (type === 'customer.subscription.updated' || type === 'customer.subscription.deleted') {
    const sub = event.data?.object || {};
    const subscriptionId = sub.id || null;
    const customerId = idOf(sub.customer);
    const status = type === 'customer.subscription.deleted' ? 'canceled' : (sub.status || 'unknown');
    const email = normalizeEmail(sub.metadata?.email);
    const lang = normalizeLang(sub.metadata?.lang);
    const patch = {
      status,
      stripe_customer_id: customerId,
      updated_at: new Date().toISOString(),
    };
    await patchMemberBySubscription(subscriptionId, patch);
    if (email) {
      await persistMember({
        email,
        customerId,
        subscriptionId,
        status,
        lang,
      });
    } else {
      console.log('[season-intel]', type, { subscriptionId, customerId, status });
    }
    return { handled: type };
  }

  return { ignored: true, type };
}

export async function readRawBody(req) {
  if (Buffer.isBuffer(req.body)) return req.body;
  if (typeof req.body === 'string') return Buffer.from(req.body);
  if (req.readable && req.readableEnded === false) {
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
    }
    if (chunks.length) return Buffer.concat(chunks);
  }
  if (req.body && typeof req.body === 'object') {
    return Buffer.from(JSON.stringify(req.body));
  }
  return Buffer.alloc(0);
}
