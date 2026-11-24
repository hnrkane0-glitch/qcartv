// QuickCart Service Worker v3 — network-first, offline fallback
const CACHE = 'quickcart-v12';
const PRECACHE = ['/', '/index.html', '/landing.html', '/features.html', '/demo.html', '/how-it-works.html', '/pricing.html', '/faq.html', '/contact.html', '/assets/site.css', '/assets/site.js', '/terms.html', '/privacy.html', '/assets/platform.js', '/icon-192.png', '/pos.html', '/admin.html', '/payment.html', '/assets/qc-ui.js', '/assets/qc-fx.js', '/assets/pos.js', '/assets/pos-addons.js', '/assets/qc-brand.css', '/shop.html', '/qc-db.js', '/qc-live.js', '/assets/shop.css', '/assets/shop.js', '/assets/landing.js', '/assets/geist-icons.js', '/assets/qc-theme.css', '/assets/qc-catalog.js', '/assets/qc-entitle.js', '/signup.html', '/welcome.html', '/assets/admin-pages.js', '/assets/admin-tools.js', '/assets/qc-modules.js'];

self.addEventListener('install', function (e) {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(function (c) {
    // add one by one so a single missing file never blocks installation
    return Promise.all(PRECACHE.map(function (u) { return c.add(u).catch(function () {}); }));
  }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  var req = e.request, url = req.url;
  // never touch writes, payment/API calls, Firebase or Paystack
  if (req.method !== 'GET' || url.includes('/api/') || url.includes('firebaseio.com') ||
      url.includes('paystack')) return;
  e.respondWith(
    fetch(req).then(function (res) {
      if (res && res.ok && url.startsWith(self.location.origin)) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); }).catch(function () {});
      }
      return res;
    }).catch(function () { return caches.match(req).then(function (r) { return r || (req.mode === 'navigate' ? caches.match('/index.html') : undefined); }); })
  );
});
