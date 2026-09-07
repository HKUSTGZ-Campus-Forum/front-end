// UniKorn Campus Forum Service Worker
// The production build stamps this literal; legacy ?v parameters are ignored.
const CACHE_VERSION = "__UNIKORN_BUILD_VERSION__";
const STATIC_CACHE = `unikorn-static-${CACHE_VERSION}`;
const API_CACHE = `unikorn-api-${CACHE_VERSION}`;
const CACHE_PREFIXES = ["unikorn-static-", "unikorn-api-"];
const SW_SCRIPT_PATH = "/sw.js";
const OFFLINE_URL = "/offline.html";
const PRECACHE_ASSETS = [
  OFFLINE_URL,
  "/favicon-white.ico",
  "/manifest.json",
  "/icons/sidebar_logo.svg",
  "/icons/topbar_logo.svg",
  "/image/uniKorn.png",
];
const CACHEABLE_API_PATTERNS = [
  "/api/analytics/hot-posts",
  "/api/analytics/daily-summary",
  "/api/courses",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      await cache.addAll(PRECACHE_ASSETS);
      // Existing clients must migrate without clicking the retired update toast.
      // New clients decide safe page reloads independently using frontend health.
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();

      await Promise.all(
        cacheNames
          .filter((cacheName) =>
            CACHE_PREFIXES.some(
              (prefix) => cacheName.startsWith(prefix) &&
                cacheName !== STATIC_CACHE && cacheName !== API_CACHE,
            ),
          )
          .map((cacheName) => caches.delete(cacheName)),
      );

      await self.clients.claim();
      await notifyClients({
        type: "SW_ACTIVATED",
        version: CACHE_VERSION,
      });
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") {
    return;
  }

  if (request.headers.has("range")) {
    return;
  }

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) {
    return;
  }

  // Private creator sessions must reach the authorization gateway on every
  // request, including navigations. Never substitute cached/offline content.
  if (url.pathname.startsWith("/api/makerspace/")) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(handleNavigationRequest(request));
    return;
  }

  if (url.pathname.startsWith("/api/")) {
    event.respondWith(handleApiRequest(request, url));
    return;
  }

  if (shouldHandleStaticAsset(request, url)) {
    event.respondWith(handleStaticAssetRequest(request));
  }
});

async function handleNavigationRequest(request) {
  try {
    return await fetch(request);
  } catch (error) {
    const cache = await caches.open(STATIC_CACHE);
    const offlineResponse = await cache.match(OFFLINE_URL);

    if (offlineResponse) {
      return offlineResponse;
    }

    return new Response("Offline - please check your connection", {
      status: 503,
      statusText: "Service Unavailable",
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  }
}

async function handleApiRequest(request, url) {
  if (url.pathname.startsWith("/api/posts")) {
    return fetch(request);
  }

  const isCacheable = CACHEABLE_API_PATTERNS.some((pattern) => url.pathname.includes(pattern));

  if (!isCacheable) {
    return fetch(request);
  }

  const cache = await caches.open(API_CACHE);

  try {
    const networkResponse = await fetch(request);

    if (networkResponse.ok && !shouldBypassCache(networkResponse)) {
      await cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      return cachedResponse;
    }

    return new Response(
      JSON.stringify({
        error: "Offline - please check your connection",
        offline: true,
      }),
      {
        status: 503,
        statusText: "Service Unavailable",
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  }
}

async function handleStaticAssetRequest(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    return cachedResponse;
  }

  const networkResponse = await fetch(request);

  if (networkResponse.ok) {
    await cache.put(request, networkResponse.clone());
  }

  return networkResponse;
}

function shouldHandleStaticAsset(request, url) {
  if (url.pathname === SW_SCRIPT_PATH || url.pathname.startsWith("/_nuxt/")) {
    return false;
  }

  if (PRECACHE_ASSETS.includes(url.pathname)) {
    return true;
  }

  return ["image", "font"].includes(request.destination);
}

function shouldBypassCache(response) {
  const cacheControl = response.headers.get("Cache-Control") || "";
  return /no-store|private/i.test(cacheControl);
}

// Handle background sync for when connection is restored
self.addEventListener("sync", (event) => {
  if (event.tag === "background-sync") {
    event.waitUntil(doBackgroundSync());
  } else if (event.tag === "update-badge") {
    event.waitUntil(notifyClients({ type: "NOTIFICATION_RECEIVED" }));
  }
});

async function doBackgroundSync() {
  const apiCache = await caches.open(API_CACHE);
  const keys = await apiCache.keys();

  return Promise.all(keys.map((key) => apiCache.delete(key)));
}

// Every push displays a visible notification, including malformed/legacy payloads.
self.addEventListener("push", (event) => {
  let payload = {};
  try { payload = event.data?.json() || {}; } catch { /* Use a safe fallback. */ }
  if (!payload || typeof payload !== "object") payload = {};
  const title = typeof payload.title === "string" && payload.title.trim() ? payload.title : "UniKorn";
  const body = typeof payload.body === "string" && payload.body.trim()
    ? payload.body : "你有一条新通知 / You have a new notification";
  const options = {
    body, icon: "/image/uniKorn.png", badge: "/image/uniKorn.png",
    tag: typeof payload.tag === "string" ? payload.tag : "unikorn-notification",
    data: { url: safeNotificationUrl(payload.data?.url) },
  };
  event.waitUntil(Promise.all([
    self.registration.showNotification(title, options),
    updateAppBadge(payload.unread_count),
    notifyClients({ type: "NOTIFICATION_RECEIVED" }),
  ]));
});

function safeNotificationUrl(value) {
  try {
    if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) return "/notifications";
    const url = new URL(value, self.location.origin);
    if (url.origin !== self.location.origin) return "/notifications";
    // Only notification destinations owned by the main application.
    if (!/^\/(en\/)?(notifications\/?$|forum\/posts\/\d+\/?$|feedback(?:\/merge-requests)?\/\d+\/?$|admin\/feedback\/?$)/.test(url.pathname)) return "/notifications";
    return url.pathname + url.search + url.hash;
  } catch { return "/notifications"; }
}

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  if (event.action === "dismiss") return;
  const target = new URL(safeNotificationUrl(event.notification.data?.url), self.location.origin).href;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const existing = windows.find(client => client.url === target);
    if (existing) return existing.focus();
    // Opening a new destination preserves drafts in other open windows.
    return self.clients.openWindow(target);
  })());
});

self.addEventListener("message", (event) => {
  if (!event.data) return;
  if (event.data.type === "SKIP_WAITING") event.waitUntil(self.skipWaiting());
  else if (event.data.type === "UPDATE_BADGE") event.waitUntil(updateAppBadge(event.data.count));
  else if (event.data.type === "CLEAR_BADGE") event.waitUntil(updateAppBadge(0));
  else if (event.data.type === "REFRESH_BADGE") event.waitUntil(notifyClients({ type: "NOTIFICATION_RECEIVED" }));
});

function notifyClients(message) {
  return self.clients
    .matchAll({ type: "window", includeUncontrolled: true })
    .then((clientList) => {
      clientList.forEach((client) => client.postMessage(message));
    })
    .catch((error) => {
      console.error("[SW] Failed to notify clients:", error);
    });
}

// Keep optional badging inside the push/message event lifetime.
async function updateAppBadge(count) {
  if (!Number.isSafeInteger(count) || count < 0) return;
  try {
    if (count > 0) await self.navigator.setAppBadge?.(count);
    else await self.navigator.clearAppBadge?.();
  } catch { /* Unsupported or denied badges must not prevent visible delivery. */ }
}
