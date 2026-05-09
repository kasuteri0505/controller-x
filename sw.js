/* ══════════════════════════════════════════════════════════════════════
   sw.js — ProfitFlow Labs Service Worker v2
   ══════════════════════════════════════════════════════════════════════ */

const CACHE_STATIC = 'profitflow-static-v4';

const PRECACHE_URLS = [
  '/app/', '/app/index.html', '/app/manifest.json', '/app/css/styles.css',
  '/app/js/config.js', '/app/js/core.js', '/app/js/pwa.js', '/app/js/auth.js',
  '/app/js/shell.js', '/app/js/landing.js', '/app/js/dashboard.js',
  '/app/js/pools.js', '/app/js/pool_helpers.js', '/app/js/wallet.js',
  '/app/js/finance.js', '/app/js/trading.js', '/app/js/p2p.js',
  '/app/js/billing.js', '/app/js/settings.js', '/app/js/home.js',
  '/app/js/extras.js', '/app/js/notif_board.js', '/app/js/charts.js',
  '/app/js/export.js', '/app/js/notifications.js', '/app/js/yield.js',
];

/* Domínios externos — passa direto, sem cache */
const EXTERNAL_HOSTS = [
  'gstatic.com','googleapis.com','cdnjs.cloudflare.com','cdn.jsdelivr.net',
  'fonts.googleapis.com','fonts.gstatic.com','js.stripe.com','api.stripe.com',
  'firebaseio.com','coingecko.com','yahoo.com','myfxbook.com','anthropic.com',
];
const isExternal = url => EXTERNAL_HOSTS.some(h => url.hostname.includes(h));

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_STATIC)
      .then(c => c.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_STATIC).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (!url.protocol.startsWith('http')) return;
  if (isExternal(url)) return; /* deixa o browser resolver CDNs */

  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req).then(response => {
        if (!response || response.status !== 200 || response.type === 'opaque') return response;
        const clone = response.clone(); /* clona ANTES de retornar */
        caches.open(CACHE_STATIC).then(c => c.put(req, clone));
        return response;
      }).catch(() => {
        if (req.destination === 'document') return caches.match('/app/index.html');
      });
    })
  );
});

self.addEventListener('push', event => {
  if (!event.data) return;
  let d = {};
  try { d = event.data.json(); } catch(_) { d = { title: 'ProfitFlow Labs', body: event.data.text() }; }
  event.waitUntil(
    self.registration.showNotification(d.title || 'ProfitFlow Labs', {
      body: d.body || '', icon: '/app/icon-192.png', badge: '/app/icon-192.png',
      tag: d.tag || 'profitflow-notif', data: d.data || {}, vibrate: [200,100,200],
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = event.notification.data?.url || '/app/';
  event.waitUntil(
    clients.matchAll({ type:'window', includeUncontrolled:true }).then(list => {
      for (const c of list) { if (c.url === url && 'focus' in c) return c.focus(); }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
