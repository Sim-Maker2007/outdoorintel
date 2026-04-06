// LandLink favourites module
import { supabase, getCurrentUser } from './supabase-client.js';

let cachedFavs = null;
let userId = null;

export async function loadFavourites() {
  const user = await getCurrentUser();
  if (!user) return [];
  userId = user.id;
  const { data } = await supabase
    .from('landlink_favourites')
    .select('parcel_id')
    .eq('user_id', user.id);
  cachedFavs = new Set((data || []).map(f => f.parcel_id));
  return cachedFavs;
}

export function isFavourite(parcelId) {
  return cachedFavs ? cachedFavs.has(parcelId) : false;
}

export async function toggleFavourite(parcelId) {
  if (!userId) {
    const user = await getCurrentUser();
    if (!user) return false;
    userId = user.id;
  }

  if (isFavourite(parcelId)) {
    await supabase.from('landlink_favourites')
      .delete().eq('user_id', userId).eq('parcel_id', parcelId);
    cachedFavs.delete(parcelId);
    return false;
  } else {
    await supabase.from('landlink_favourites')
      .insert({ user_id: userId, parcel_id: parcelId });
    if (!cachedFavs) cachedFavs = new Set();
    cachedFavs.add(parcelId);
    return true;
  }
}

/**
 * Attach click handlers to all .ll-card-fav elements in a container.
 */
export function attachFavHandlers(container) {
  container.querySelectorAll('.ll-card-fav').forEach(btn => {
    const parcelId = btn.dataset.parcelId;
    if (!parcelId) return;
    if (isFavourite(parcelId)) btn.classList.add('active');

    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const isNowFav = await toggleFavourite(parcelId);
      btn.classList.toggle('active', isNowFav);
    });
  });
}
