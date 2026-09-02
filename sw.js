const CACHE_NAME = 'outdoorintel-v2';

// Core pages to pre-cache on install
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/en/map.html',
  '/en/fishing/directory.html',
  '/en/hunting/directory.html',
  '/en/camping/directory.html',
  '/en/kayaking/directory.html',
  '/en/skiing/directory.html',
  '/en/hiking/directory.html',
  '/en/blog.html',
  '/assets/logo/logo.jpg',
  '/assets/logo/mark.svg',
  '/assets/favicon.svg'
];

// Install: pre-cache core pages
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// Activate: clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch: network-first for HTML, cache-first for assets
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Skip non-GET and cross-origin requests
  if (event.request.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;

  // JSON data files: network-first (keep data fresh)
  if (url.pathname.startsWith('/data/')) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  // HTML pages: network-first with cache fallback
  if (event.request.headers.get('accept')?.includes('text/html') || url.pathname.endsWith('.html')) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  // Static assets (images, CSS, JS): cache-first
  event.respondWith(cacheFirst(event.request));
});

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (e) {
    const cached = await caches.match(request);
    if (cached) return cached;
    // Return offline fallback for HTML pages
    if (request.headers.get('accept')?.includes('text/html')) {
      return new Response(offlineHTML(), {
        headers: { 'Content-Type': 'text/html' }
      });
    }
    return new Response('Offline', { status: 503 });
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (e) {
    return new Response('Offline', { status: 503 });
  }
}

function offlineHTML() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Offline | Outdoor Intel</title>
<style>
  body { font-family: system-ui, sans-serif; background: #f5f3f0; color: #3e3127; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; text-align: center; padding: 2rem; }
  .box { max-width: 420px; }
  h1 { color: #2d5a3d; font-size: 1.8rem; margin-bottom: 0.5rem; }
  p { color: #6b6359; line-height: 1.6; }
  .btn { display: inline-block; margin-top: 1.5rem; padding: 12px 28px; background: #2d5a3d; color: white; border-radius: 8px; text-decoration: none; font-weight: 600; }
</style>
</head>
<body>
<div class="box">
  <h1>You're Off the Grid</h1>
  <p>No internet connection right now. Pages you've visited before are saved and available offline — try navigating back.</p>
  <a href="/" class="btn">Back to Home</a>
</div>
</body>
</html>`;
}
