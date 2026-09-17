/* Windows 11 Web — service worker: offline cache, stale-while-revalidate.
   Bump CACHE version to force clients to refetch everything. */
'use strict';

const CACHE = 'win11-web-v5';
const ASSETS = [
  './', './index.html', './css/win11.css',
  './js/kernel.js', './js/wm.js', './js/apps-core.js', './js/apps-office.js',
  './js/apps-social.js', './js/apps-store.js', './js/apps-fun.js', './js/apps-more.js', './js/shell.js', './js/main.js',
  './manifest.webmanifest',
  './icons/icon-192.png', './icons/icon-512.png', './icons/icon-512-maskable.png', './icons/icon-180.png'
];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// serve from cache instantly, refresh the cache from the network in the background
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    caches.open(CACHE).then(async cache => {
      const cached = await cache.match(req, { ignoreSearch: req.mode === 'navigate' });
      const network = fetch(req).then(res => {
        if (res && res.ok) cache.put(req, res.clone());
        return res;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
