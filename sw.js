/* Tokyo Field Guide offline copy. Version is stamped by _share.py at publish time. */
var VERSION = 'fg-2026-10-24-24Oct20261714JST';
var CORE = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) { return c.addAll(CORE); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  var req = e.request, url = new URL(req.url);
  if (req.method !== 'GET') return;
  var isPage = req.mode === 'navigate' || url.pathname.endsWith('/') || url.pathname.endsWith('.html');
  if (url.origin === location.origin && isPage) {
    // Network first so a republished guide shows up; the cached copy answers underground.
    // Each page is cached under its own name (index.html, osaka.html), so one guide never overwrites another.
    var key = url.pathname.endsWith('/') ? './index.html' : '.' + url.pathname.slice(url.pathname.lastIndexOf('/'));
    e.respondWith(fetch(req).then(function (res) {
      var copy = res.clone(); caches.open(VERSION).then(function (c) { c.put(key, copy); }); return res;
    }).catch(function () { return caches.match(key).then(function (r) { return r || caches.match('./index.html'); }); }));
    return;
  }
  if (url.origin === location.origin || /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) {
    // Fonts and the PDF: cached copy first, refreshed in the background.
    e.respondWith(caches.open(VERSION).then(function (c) {
      return c.match(req).then(function (hit) {
        var net = fetch(req).then(function (res) { if (res && (res.ok || res.type === 'opaque')) c.put(req, res.clone()); return res; }).catch(function () { return hit; });
        return hit || net;
      });
    }));
  }
});
