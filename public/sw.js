// UniKorn Campus Forum Service Worker
const VERSION_PARAM = new URL(self.location.href).searchParams.get("v");
const CACHE_VERSION = VERSION_PARAM || "dev";
const STATIC_CACHE = `unikorn-static-${CACHE_VERSION}`;
const API_CACHE = `unikorn-api-${CACHE_VERSION}`;
const CACHE_PREFIXES = ["unikorn-static-", "unikorn-api-"];
const SW_SCRIPT_PATH = "/sw.js";
const OFFLINE_URL = "/offline.html";
const PRECACHE_ASSETS = [
  OFFLINE_URL,
  "/favicon.ico",
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

      const clientList = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      if (clientList.length > 0) {
        notifyClients({
          type: "NEW_VERSION_READY",
          version: CACHE_VERSION,
        });
      }
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
              (prefix) => cacheName.startsWith(prefix) && !cacheName.endsWith(CACHE_VERSION),
            ),
          )
          .map((cacheName) => caches.delete(cacheName)),
      );

      await self.clients.claim();
      notifyClients({
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
    event.waitUntil(updateUnreadBadge());
  }
});

async function doBackgroundSync() {
  const apiCache = await caches.open(API_CACHE);
  const keys = await apiCache.keys();

  return Promise.all(keys.map((key) => apiCache.delete(key)));
}

// Handle push notifications
self.addEventListener("push", (event) => {
  let notificationData = {
    title: "UniKorn Forum",
    body: "You have a new notification",
    icon: "/image/uniKorn.png",
    badge: "/image/uniKorn.png",
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: "1",
      url: "/notifications",
    },
    actions: [
      {
        action: "view",
        title: "查看",
        icon: "/image/uniKorn.png",
      },
      {
        action: "dismiss",
        title: "关闭",
      },
    ],
    requireInteraction: false,
    tag: "default-notification",
  };

  if (event.data) {
    try {
      const pushData = event.data.json();
      notificationData = {
        ...notificationData,
        ...pushData,
      };

      if (pushData.unread_count !== undefined) {
        updateAppBadge(pushData.unread_count);
      }
    } catch (error) {
      console.error("[SW] Error parsing push data:", error);
      notificationData.body = event.data.text() || notificationData.body;
    }
  }

  event.waitUntil(self.registration.showNotification(notificationData.title, notificationData));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  let urlToOpen = "/notifications";

  if (event.notification.data && event.notification.data.url) {
    urlToOpen = event.notification.data.url;
  }

  if (event.action === "dismiss") {
    return;
  }

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(urlToOpen);
          return client.focus();
        }
      }

      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }

      return undefined;
    }),
  );
});

// Handle messages from the main app
self.addEventListener("message", (event) => {
  if (!event.data) {
    return;
  }

  if (event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
    return;
  }

  if (event.data.type === "UPDATE_BADGE") {
    updateAppBadge(event.data.count);
  } else if (event.data.type === "CLEAR_BADGE") {
    updateAppBadge(0);
  } else if (event.data.type === "REFRESH_BADGE") {
    updateUnreadBadge();
  } else if (event.data.type === "GET_AUTH_TOKEN") {
    event.ports[0]?.postMessage({ token: null });
  }
});

function notifyClients(message) {
  self.clients
    .matchAll({ type: "window", includeUncontrolled: true })
    .then((clientList) => {
      clientList.forEach((client) => client.postMessage(message));
    })
    .catch((error) => {
      console.error("[SW] Failed to notify clients:", error);
    });
}

// Helper function to update app badge
function updateAppBadge(count) {
  if ("setAppBadge" in self.navigator) {
    if (count > 0) {
      self.navigator.setAppBadge(count).catch((error) => {
        console.error("[SW] Error setting app badge:", error);
      });
    } else {
      self.navigator.clearAppBadge().catch((error) => {
        console.error("[SW] Error clearing app badge:", error);
      });
    }
  }
}

// Helper function to fetch and update unread count
async function updateUnreadBadge() {
  try {
    const windowClients = await self.clients.matchAll({ type: "window" });
    if (windowClients.length === 0) {
      updateAppBadge(0);
      return;
    }

    const token = await new Promise((resolve) => {
      const messageChannel = new MessageChannel();
      messageChannel.port1.onmessage = (event) => {
        resolve(event.data.token);
      };
      windowClients[0].postMessage({ type: "GET_AUTH_TOKEN" }, [messageChannel.port2]);

      setTimeout(() => resolve(null), 5000);
    });

    if (!token) {
      updateAppBadge(0);
      return;
    }

    const response = await fetch(`${self.location.origin}/api/notifications/unread-count`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (response.ok) {
      const data = await response.json();
      updateAppBadge(data.unread_count || 0);
    } else {
      console.error("[SW] Failed to fetch unread count:", response.status);
    }
  } catch (error) {
    console.error("[SW] Error updating unread badge:", error);
  }
}
