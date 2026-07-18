// Loads full spot records (all fields) for the AI endpoints that need rich
// grounding — getting_there, regulations, safety, best_time, etc. Fetches the
// public /data/<activity>.json from our own origin and caches per warm
// instance. Keeps the functions small (vs. bundling 2.5MB of data).

const CATS = ['fishing', 'hunting', 'camping', 'kayaking', 'skiing', 'hiking'];
const cache = {};

function origin() {
  return process.env.SITE_ORIGIN || 'https://www.outdoorintel.ca';
}

export async function loadCategory(activity) {
  if (!CATS.includes(activity)) return [];
  if (cache[activity]) return cache[activity];
  const r = await fetch(origin() + '/data/' + activity + '.json');
  if (!r.ok) throw new Error('data fetch ' + r.status);
  const d = await r.json();
  cache[activity] = d.spots || [];
  return cache[activity];
}

export async function getSpot(activity, slug) {
  const list = await loadCategory(activity);
  return list.find(s => s.slug === slug) || null;
}

export { CATS };
