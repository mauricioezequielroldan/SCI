/* Service worker: guarda la app para que funcione sin señal. Cambiá VERSION cada vez que publiques cambios. */
const VERSION = 'sci-v2.4.0';
const FILES = ['./', './index.html', './css/app.css', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png',
  './js/pdf.js', './js/report.js', './js/geo.js', './js/qr.js', './js/map.js', './js/core.js', './js/cuartel.js', './js/op.js', './js/extras.js', './js/general.js', './js/equipos.js', './js/envio.js', './js/team.js', './js/demo.js', './js/main.js', './js/beta.js', './js/croquis-mapa.js'];
self.addEventListener('install', e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const u = new URL(e.request.url); if (u.origin !== location.origin) return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(hit => {
    const net = fetch(e.request).then(r => { if (r && r.ok) { const cp = r.clone(); caches.open(VERSION).then(c => c.put(e.request, cp)); } return r; }).catch(() => hit);
    return hit || net;
  }));
});
