/* Japan Field Guide offline copy: the trip page and every city guide under it.
   Version is stamped by _share.py at publish time from the newest page stamp. */
var VERSION = 'fg-dcb8f1eaa9';
var PAGES = ["index.html", "tokyo/index.html", "osaka/index.html"];   /* scope-relative: ['index.html', 'tokyo/index.html', 'osaka/index.html'] */
var CORE = ['./', './manifest.webmanifest', './icon-192.png', './icon-512.png'].concat(PAGES.map(function (p) { return './' + p; }));

/* A page's cache key is its path relative to the scope, so /tokyo/ and /osaka/ never collide
   on "index.html" and one guide never overwrites another. */
function pageKey(url) {
  var scope = new URL(self.registration.scope).pathname;
  var rel = url.pathname.indexOf(scope) === 0 ? url.pathname.slice(scope.length) : url.pathname.replace(/^\//, '');
  if (rel === '' || rel.slice(-1) === '/') rel += 'index.html';
  return './' + rel;
}

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) {
    // Each page on its own so one missing file does not block the rest.
    return Promise.all(CORE.map(function (u) { return c.add(u).catch(function () {}); }));
  }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  var req = e.request, url = new URL(req.url);
  if (req.method !== 'GET') return;
  var isPage = req.mode === 'navigate' || url.pathname.slice(-1) === '/' || /\.html$/.test(url.pathname);
  if (url.origin === location.origin && isPage) {
    // Network first so a republished page shows up; the cached copy answers underground.
    var key = pageKey(url);
    e.respondWith(fetch(req).then(function (res) {
      if (res && res.ok) { var copy = res.clone(); caches.open(VERSION).then(function (c) { c.put(key, copy); }); }
      return res;
    }).catch(function () {
      return caches.match(key).then(function (r) { return r || caches.match('./index.html'); });
    }));
    return;
  }
  if (url.origin === location.origin || /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) {
    // Fonts, icons and the PDF: cached copy first, refreshed in the background.
    e.respondWith(caches.open(VERSION).then(function (c) {
      return c.match(req).then(function (hit) {
        var net = fetch(req).then(function (res) { if (res && (res.ok || res.type === 'opaque')) c.put(req, res.clone()); return res; }).catch(function () { return hit; });
        return hit || net;
      });
    }));
  }
});
