// UroStudyHub Service Worker — Network-first with offline fallback
// Always fetches fresh content from server; caches for offline use.
// Auto-activates immediately so updates are picked up on next page load.

var CACHE_NAME = "urostudyhub-v1";
var ASSETS = [
  "./",
  "./index.html",
  "./UroStudyHub.min.html"
];

// Install: pre-cache shell
self.addEventListener("install", function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting(); // Activate immediately, don't wait for old tabs to close
});

// Activate: clean up old caches and take control of all clients
self.addEventListener("activate", function(e) {
  e.waitUntil(
    caches.keys().then(function(names) {
      return Promise.all(
        names.filter(function(name) { return name !== CACHE_NAME; })
            .map(function(name) { return caches.delete(name); })
      );
    }).then(function() {
      return self.clients.claim(); // Take control of all open tabs immediately
    })
  );
});

// Fetch: network-first — try server, fall back to cache
self.addEventListener("fetch", function(e) {
  // Only handle same-origin navigation/page requests
  if (e.request.method !== "GET") return;

  e.respondWith(
    fetch(e.request).then(function(response) {
      // Got fresh response — update cache and return it
      if (response.ok) {
        var clone = response.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(e.request, clone);
        });
      }
      return response;
    }).catch(function() {
      // Network failed — serve from cache (offline mode)
      return caches.match(e.request);
    })
  );
});
