// Service worker mínimo: permite instalar la página como app.
// Siempre pide primero a internet (así Lorena y sus clientas ven los cambios al instante)
// y solo usa lo guardado si no hay conexión. No toca nada de otros sitios (base de datos, Mercado Pago, fuentes).
const VERSION = "lc-v1";
const BASICOS = ["./", "index.html", "manifest.webmanifest", "assets/images/brand/lc-icono.png"];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(VERSION).then(function (c) {
      return Promise.all(BASICOS.map(function (u) { return c.add(u).catch(function () {}); }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (claves) {
      return Promise.all(claves.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (e) {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  e.respondWith(
    fetch(req).then(function (res) {
      if (res && res.ok) {
        const copia = res.clone();
        caches.open(VERSION).then(function (c) { c.put(req, copia); });
      }
      return res;
    }).catch(function () {
      return caches.match(req).then(function (g) {
        return g || (req.mode === "navigate" ? caches.match("index.html") : undefined);
      });
    })
  );
});
