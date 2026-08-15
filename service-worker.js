// service-worker.js — makes the mobile page installable and usable offline once loaded.
// This has nothing to do with site-blocking — a service worker can only intercept
// requests made BY this page, not traffic from other apps or browser tabs. See
// index.html's "Blocking on your phone" section for what actually blocks sites.

const CACHE_NAME = 'recovery-shield-mobile-v1';
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
  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request)));
});
