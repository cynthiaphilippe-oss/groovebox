const CACHE_NAME = "groovebox-v1";

const APP_SHELL = [
  "/",
  "/index.html",
  "/style.css",
  "/mobile.css",
  "/script.js",
  "/manifest.json"
];

// installation : on met en cache les fichiers de base de l'appli
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

// activation : on nettoie les anciens caches si la version change
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// stratégie : réseau d'abord, cache en secours (utile hors-ligne)
// les appels vers l'API backend (autre domaine) ne sont jamais mis en cache
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // on ne touche pas aux appels vers l'API (données toujours à jour)
  if (url.origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
