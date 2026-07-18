// Shared helpers for the community-intel serverless functions.
// Files/dirs under api/ prefixed with "_" are NOT routed as endpoints by Vercel.
//
// All writes to community tables go through these functions using the Supabase
// service role key, so we can hash IPs, rate-limit, and filter content that a
// browser client could otherwise bypass. No npm dependency — uses global fetch
// (Node 18+ on Vercel) and node:crypto.

import { createHmac } from 'node:crypto';

export function env() {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const salt = process.env.COMMUNITY_IP_SALT || 'outdoorintel-dev-salt';
  if (!url || !serviceKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env var');
  }
  return { url, serviceKey, salt };
}

// PostgREST call with the service role (bypasses RLS).
export async function rest(path, { method = 'GET', body, prefer } = {}) {
  const { url, serviceKey } = env();
  const headers = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    'Content-Type': 'application/json'
  };
  if (prefer) headers.Prefer = prefer;
  const res = await fetch(`${url}/rest/v1/${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) {
    const msg = (data && data.message) || `PostgREST ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }
  return data;
}

export function clientIp(req) {
  const xff = req.headers['x-forwarded-for'];
  if (typeof xff === 'string' && xff.length) return xff.split(',')[0].trim();
  return req.socket?.remoteAddress || '0.0.0.0';
}

export function hashIp(req) {
  const { salt } = env();
  return createHmac('sha256', salt).update(clientIp(req)).digest('hex').slice(0, 32);
}

// Best-effort per-IP rate limit against a table's created_at window.
export async function overRateLimit(table, ipHash, max, windowMs) {
  const since = new Date(Date.now() - windowMs).toISOString();
  const rows = await rest(
    `${table}?ip_hash=eq.${encodeURIComponent(ipHash)}&created_at=gte.${encodeURIComponent(since)}&select=id`
  );
  return Array.isArray(rows) && rows.length >= max;
}

// Lightweight text abuse screen. Images are gated separately (client-side
// NSFW classifier + community flagging). This catches obvious spam/slurs.
const BANNED = [
  // sexual spam / obvious NSFW words (kept short; nsfwjs handles images)
  'porn', 'xxx', 'nude', 'nudes', 'dick pic', 'blowjob',
  // spam / scam
  'viagra', 'cialis', 'casino', 'crypto giveaway', 'bit.ly/', 'free money',
  'work from home', 'make $', 'telegram @', 'whatsapp +'
];

export function screenText(text) {
  const t = (text || '').toLowerCase();
  if (!t.trim()) return { ok: false, reason: 'empty' };
  if (BANNED.some(w => t.includes(w))) return { ok: false, reason: 'blocked_terms' };
  const links = (t.match(/https?:\/\//g) || []).length;
  if (links > 2) return { ok: false, reason: 'too_many_links' };
  // crude gibberish/shout guard: >70% of a long message in caps
  const letters = text.replace(/[^a-z]/gi, '');
  if (letters.length > 40) {
    const caps = (text.match(/[A-Z]/g) || []).length;
    if (caps / letters.length > 0.7) return { ok: false, reason: 'all_caps' };
  }
  return { ok: true };
}

export function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') { try { return JSON.parse(req.body); } catch { return {}; } }
  return {};
}

export function json(res, status, obj) {
  res.status(status).setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(obj));
}

export function methodGuard(req, res, allowed) {
  if (req.method !== allowed) {
    json(res, 405, { error: 'Method not allowed' });
    return false;
  }
  return true;
}

const ACTIVITIES = ['fishing', 'hunting', 'camping', 'kayaking', 'skiing', 'hiking'];
export const isActivity = a => ACTIVITIES.includes(a);
export const cleanSlug = s => (typeof s === 'string' ? s.trim().toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 120) : '');
export const clip = (s, n) => (typeof s === 'string' ? s.trim().slice(0, n) : null);
