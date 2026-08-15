// service-worker.js — makes the mobile page installable and usable offline once loaded.
// This has nothing to do with site-blocking — a service worker can only intercept
// requests made BY this page, not traffic from other apps or browser tabs. See
// index.html's "Blocking on your phone" section for what actually blocks sites.

const CACHE_NAME = 'recovery-shield-mobile-v2';
const ASSETS = ['./', './index.html', './styles.css', './app.js', './manifest.json', './icons/icon128.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Network-first, cache-as-fallback — the opposite of the original cache-first
  // strategy that caused this exact bug (a permanently stale copy that never
  // updated even when the live files changed). This way, an internet connection
  // always gets you the current version; the cache only kicks in when offline.
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
