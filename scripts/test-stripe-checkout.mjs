#!/usr/bin/env node
/**
 * Season Intel Stripe scaffold checks (no live keys required).
 *
 * 1) Env unset → checkout APIs 503 { error: 'checkout_not_configured' }
 * 2) Dummy env → GET reports configured; POST attempts Stripe (fails, no crash)
 */

import checkoutHandler from '../api/stripe/checkout.js';
import webhookHandler from '../api/stripe/webhook.js';
import sessionHandler from '../api/stripe/session.js';
import { checkoutConfigured, notConfigured, applyStripeEvent } from '../api/_lib/stripe.js';

const KEYS = [
  'STRIPE_SECRET_KEY',
  'STRIPE_PUBLISHABLE_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'STRIPE_PRICE_ID',
];

let failed = 0;
function assert(cond, msg) {
  if (cond) {
    console.log('  ok  ' + msg);
    return;
  }
  failed++;
  console.error('  FAIL ' + msg);
}

function mockReq({ method = 'GET', body, headers = {} } = {}) {
  return {
    method,
    body,
    headers: { host: 'localhost:4321', ...headers },
    readable: false,
    readableEnded: true,
    socket: { remoteAddress: '127.0.0.1' },
  };
}

function mockRes() {
  const r = {
    statusCode: 200,
    headers: {},
    body: '',
    status(n) { r.statusCode = n; return r; },
    setHeader(k, v) { r.headers[k] = v; return r; },
    end(b) { r.body = b ?? ''; },
  };
  return r;
}

async function call(handler, req) {
  const res = mockRes();
  await handler(req, res);
  let parsed = null;
  try { parsed = res.body ? JSON.parse(res.body) : null; } catch { parsed = res.body; }
  return { status: res.statusCode, json: parsed, headers: res.headers };
}

function unsetStripe() {
  for (const k of KEYS) delete process.env[k];
}

function dummyStripe() {
  process.env.STRIPE_SECRET_KEY = 'sk_test_dummy_not_a_real_key';
  process.env.STRIPE_PUBLISHABLE_KEY = 'pk_test_dummy_not_a_real_key';
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_dummy_not_a_real_secret';
  process.env.STRIPE_PRICE_ID = 'price_dummy_not_a_real_id';
}

console.log('unset env');
unsetStripe();
assert(!checkoutConfigured(), 'checkoutConfigured() is false when keys missing');
assert(JSON.stringify(notConfigured()) === JSON.stringify({ error: 'checkout_not_configured' }), 'notConfigured JSON shape');

const g1 = await call(checkoutHandler, mockReq({ method: 'GET' }));
assert(g1.status === 503 && g1.json?.error === 'checkout_not_configured', 'GET /checkout 503 when unset');

const p1 = await call(checkoutHandler, mockReq({ method: 'POST', body: { lang: 'en' } }));
assert(p1.status === 503 && p1.json?.error === 'checkout_not_configured', 'POST /checkout 503 when unset');

const w1 = await call(webhookHandler, mockReq({ method: 'POST', body: {}, headers: { 'stripe-signature': 't=1,v1=abc' } }));
assert(w1.status === 503 && w1.json?.error === 'checkout_not_configured', 'POST /webhook 503 when unset');

const s1 = await call(sessionHandler, mockReq({ method: 'POST', body: { session_id: 'cs_test_x' } }));
assert(s1.status === 503 && s1.json?.error === 'checkout_not_configured', 'POST /session 503 when unset');

console.log('dummy env');
dummyStripe();
assert(checkoutConfigured(), 'checkoutConfigured() is true with dummy keys');

const g2 = await call(checkoutHandler, mockReq({ method: 'GET' }));
assert(g2.status === 200 && g2.json?.configured === true, 'GET /checkout 200 configured with dummy keys');

const p2 = await call(checkoutHandler, mockReq({
  method: 'POST',
  body: { lang: 'en', email: 'member@example.com' },
}));
assert(p2.status === 502 && p2.json?.error === 'checkout_failed', 'POST /checkout attempts Stripe and fails cleanly with dummy keys');
assert(p2.status !== 500, 'POST /checkout does not 500');

const w2 = await call(webhookHandler, mockReq({ method: 'POST', body: { type: 'ping' } }));
assert(w2.status === 400 && w2.json?.error === 'missing_signature', 'POST /webhook 400 without signature');

const w3 = await call(webhookHandler, mockReq({
  method: 'POST',
  body: { type: 'ping' },
  headers: { 'stripe-signature': 't=1,v1=not-a-real-signature' },
}));
assert(w3.status === 400 && w3.json?.error === 'invalid_signature', 'POST /webhook 400 with bad signature');

const stored = await applyStripeEvent({
  type: 'checkout.session.completed',
  data: {
    object: {
      customer_email: 'member@example.com',
      customer: 'cus_dummy',
      subscription: 'sub_dummy',
      metadata: { lang: 'en', product: 'season-intel' },
    },
  },
});
assert(stored.handled === 'checkout.session.completed', 'webhook event handler does not throw without Supabase');

unsetStripe();
if (failed) {
  console.error(`\n${failed} check(s) failed`);
  process.exit(1);
}
console.log('\nall stripe scaffold checks passed');
