// LandLink Supabase client (browser)
// Uses the shared OutdoorIntel Supabase project. Anon key only — service role
// operations happen server-side inside Vercel Functions.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// NOTE: these are public keys safe to ship to the browser. Swap for your own.
const SUPABASE_URL = 'https://vbvsgwiyzjsmxawxyisn.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_yZO5NfffLzXGjnFN9TyagQ_rgjRcF00';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});

// ---------- helpers ----------
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

export function formatPrice(cents, unit) {
  if (!cents || unit === 'free') return 'Free';
  const dollars = (cents / 100).toLocaleString('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 });
  const unitLabel = { day: 'day', weekend: 'weekend', week: 'week', season: 'season' }[unit] || unit;
  return `${dollars} / ${unitLabel}`;
}

export function parcelCoverPhoto(parcel) {
  return (parcel.photos && parcel.photos[0])
    || `https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=800&auto=format&fit=crop`;
}
