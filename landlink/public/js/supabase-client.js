// LandLink Supabase client (browser)
// Uses the shared OutdoorIntel Supabase project. Anon key only — service role
// operations happen server-side inside Vercel Functions.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// NOTE: these are public keys safe to ship to the browser.
const SUPABASE_URL = 'https://vbvsgwiyzjsmxawxyisn.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_yZO5NfffLzXGjnFN9TyagQ_rgjRcF00';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});

// =====================================================================
// AUTH HELPERS
// =====================================================================
export async function getCurrentUser() {
  const { data } = await supabase.auth.getUser();
  return data?.user || null;
}

export async function getCurrentProfile() {
  const user = await getCurrentUser();
  if (!user) return null;
  const { data } = await supabase
    .from('landlink_profiles')
    .select('*')
    .eq('user_id', user.id)
    .single();
  return data;
}

export async function signOut() {
  await supabase.auth.signOut();
  window.location.href = '/';
}

// =====================================================================
// PLATFORM ECONOMICS
// =====================================================================
// 15% host-side, 5% guest service fee.
export const HOST_TAKE_RATE = 0.15;
export const GUEST_FEE_RATE = 0.05;

/**
 * Compute the full fee breakdown for a booking in cents.
 * Single source of truth — both the booking UI and the server use this.
 */
export function bookingMath(subtotalCents) {
  const subtotal = Math.max(0, Math.round(subtotalCents || 0));
  const hostFee  = Math.round(subtotal * HOST_TAKE_RATE);
  const guestFee = Math.round(subtotal * GUEST_FEE_RATE);
  const total    = subtotal + guestFee;
  const payout   = subtotal - hostFee;
  return {
    subtotal_cents: subtotal,
    host_fee_cents: hostFee,
    guest_fee_cents: guestFee,
    total_cents: total,
    host_payout_cents: payout
  };
}

// =====================================================================
// FORMATTERS
// =====================================================================
const UNIT_LABEL_EN = {
  hour: 'hour', half_day: 'half-day', day: 'day', night: 'night',
  weekend: 'weekend', week: 'week', month: 'month', season: 'season',
  year: 'year', per_person: 'person', per_vehicle: 'vehicle', free: 'free'
};

export function formatPrice(cents, unit) {
  if (!cents || unit === 'free') return 'Free';
  const dollars = (cents / 100).toLocaleString('en-CA', {
    style: 'currency', currency: 'CAD', maximumFractionDigits: 0
  });
  const u = UNIT_LABEL_EN[unit] || unit || 'day';
  return `${dollars} / ${u}`;
}

export function formatShortPrice(cents, unit) {
  if (!cents || unit === 'free') return 'Free';
  return `$${Math.round(cents / 100)}`;
}

export function parcelCoverPhoto(parcel) {
  return (parcel?.photos && parcel.photos[0])
    || 'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=800&auto=format&fit=crop';
}

// =====================================================================
// ACTIVITY TAXONOMY (cached fetch from /data/activities.json)
// =====================================================================
let _activitiesCache = null;

export async function getActivities() {
  if (_activitiesCache) return _activitiesCache;
  try {
    const res = await fetch('/data/activities.json');
    _activitiesCache = await res.json();
  } catch (err) {
    console.warn('Could not load activities.json', err);
    _activitiesCache = { activities: [], price_units: [], parcel_features: [] };
  }
  return _activitiesCache;
}

export async function getActivity(code) {
  const { activities } = await getActivities();
  return activities.find(a => a.code === code) || null;
}

export function activityIcon(code, fallback = '📍') {
  const a = _activitiesCache?.activities?.find(x => x.code === code);
  return a?.icon || fallback;
}

export function activityLabel(code, lang = 'en') {
  const a = _activitiesCache?.activities?.find(x => x.code === code);
  if (!a) return code;
  return lang === 'fr' ? a.short_fr : a.short_en;
}
