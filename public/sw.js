// UniKorn Campus Forum Service Worker
const CACHE_VERSION = 'v1.0.0';
const CACHE_NAME = `unikorn-forum-${CACHE_VERSION}`;
const STATIC_CACHE = `unikorn-static-${CACHE_VERSION}`;
const API_CACHE = `unikorn-api-${CACHE_VERSION}`;

// Assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/login',
  '/register',
  '/forum',
  '/favicon.ico',
  '/icons/sidebar_logo.svg',
  '/icons/topbar_logo.svg',
  '/image/uniKorn.png'
];

// API endpoints to cache
const API_PATTERNS = [
  '/api/analytics/hot-posts',
  '/api/analytics/daily-summary',
  '/api/posts',
  '/api/courses'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE).then((cache) => {
        return cache.addAll(STATIC_ASSETS);
      }),
      self.skipWaiting()
    ])
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => 
              cacheName !== CACHE_NAME && 
              cacheName !== STATIC_CACHE && 
              cacheName !== API_CACHE
            )
            .map((cacheName) => caches.delete(cacheName))
        );
      }),
      self.clients.claim()
    ])
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  // Handle static assets and pages
  event.respondWith(handleStaticRequest(request));
});

async function handleApiRequest(request) {
  const url = new URL(request.url);
  
  // Only cache public read-only endpoints
  const isCacheable = API_PATTERNS.some(pattern => 
    url.pathname.includes(pattern)
  );

  if (!isCacheable) {
    // For non-cacheable API requests, always go to network
    return fetch(request);
  }

  try {
    // Try network first for API requests
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache successful API responses
      const cache = await caches.open(API_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // If network fails, try cache
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline page for failed API requests
    return new Response(JSON.stringify({
      error: 'Offline - please check your connection',
      offline: true
    }), {
      status: 503,
      statusText: 'Service Unavailable',
      headers: new Headers({
        'Content-Type': 'application/json',
      }),
    });
  }
}

async function handleStaticRequest(request) {
  // Try cache first for static assets
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    // Try network
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache successful responses
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // For navigation requests, return cached home page
    if (request.mode === 'navigate') {
      const cachedHome = await caches.match('/');
      if (cachedHome) {
        return cachedHome;
      }
    }
    
    // Return generic offline response
    return new Response('Offline - please check your connection', {
      status: 503,
      statusText: 'Service Unavailable'
    });
  }
}

// Handle background sync for when connection is restored
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  } else if (event.tag === 'update-badge') {
    event.waitUntil(updateUnreadBadge());
  }
});

async function doBackgroundSync() {
  // Clear old API cache when connection is restored
  // This ensures fresh data when back online
  const apiCache = await caches.open(API_CACHE);
  const keys = await apiCache.keys();
  
  return Promise.all(
    keys.map(key => apiCache.delete(key))
  );
}

// Handle push notifications
self.addEventListener('push', (event) => {
  let notificationData = {
    title: 'UniKorn Forum',
    body: 'You have a new notification',
    icon: '/image/uniKorn.png',
    badge: '/image/uniKorn.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: '1',
      url: '/notifications'
    },
    actions: [
      {
        action: 'view',
        title: '查看',
        icon: '/image/uniKorn.png'
      },
      {
        action: 'dismiss',
        title: '关闭'
      }
    ],
    requireInteraction: false,
    tag: 'default-notification'
  };

  // Parse push data if available
  if (event.data) {
    try {
      const pushData = event.data.json();
      notificationData = {
        ...notificationData,
        ...pushData
      };
      
      // Update app badge if unread count is provided
      if (pushData.unread_count !== undefined) {
        updateAppBadge(pushData.unread_count);
      }
    } catch (error) {
      console.error('[SW] Error parsing push data:', error);
      // Fallback to text data
      notificationData.body = event.data.text() || notificationData.body;
    }
  }
  
  event.waitUntil(
    self.registration.showNotification(notificationData.title, notificationData)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  // Get the URL to open from notification data
  let urlToOpen = '/notifications';
  
  if (event.notification.data && event.notification.data.url) {
    urlToOpen = event.notification.data.url;
  }
  
  // Handle action clicks
  if (event.action === 'view') {
    // Use the URL from notification data
  } else if (event.action === 'dismiss') {
    // Just close the notification (already done above)
    return;
  }
  
  // Open or focus the app window
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Try to find an existing window
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          // Navigate to the notification URL and focus the window
          client.navigate(urlToOpen);
          return client.focus();
        }
      }
      
      // If no existing window, open a new one
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Handle messages from the main app
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);
  
  if (event.data && event.data.type === 'UPDATE_BADGE') {
    updateAppBadge(event.data.count);
  } else if (event.data && event.data.type === 'CLEAR_BADGE') {
    updateAppBadge(0);
  } else if (event.data && event.data.type === 'REFRESH_BADGE') {
    updateUnreadBadge();
  } else if (event.data && event.data.type === 'GET_AUTH_TOKEN') {
    // Respond with auth token request (handled by client)
    event.ports[0].postMessage({ token: null });
  }
});

// Helper function to update app badge
function updateAppBadge(count) {
  console.log('[SW] Updating app badge to:', count);
  
  if ('setAppBadge' in self.navigator) {
    if (count > 0) {
      self.navigator.setAppBadge(count).catch((error) => {
        console.error('[SW] Error setting app badge:', error);
      });
    } else {
      self.navigator.clearAppBadge().catch((error) => {
        console.error('[SW] Error clearing app badge:', error);
      });
    }
  } else {
    console.log('[SW] Badge API not supported');
  }
}

// Helper function to fetch and update unread count
async function updateUnreadBadge() {
  try {
    // Get auth token from clients
    const clients = await self.clients.matchAll({ type: 'window' });
    if (clients.length === 0) {
      console.log('[SW] No active clients, clearing badge');
      updateAppBadge(0);
      return;
    }

    // Request auth token from client
    const token = await new Promise((resolve) => {
      const messageChannel = new MessageChannel();
      messageChannel.port1.onmessage = (event) => {
        resolve(event.data.token);
      };
      clients[0].postMessage({ type: 'GET_AUTH_TOKEN' }, [messageChannel.port2]);
      
      // Timeout after 5 seconds
      setTimeout(() => resolve(null), 5000);
    });

    if (!token) {
      console.log('[SW] No auth token available, clearing badge');
      updateAppBadge(0);
      return;
    }

    const response = await fetch(`${self.location.origin}/api/notifications/unread-count`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      updateAppBadge(data.unread_count || 0);
    } else {
      console.error('[SW] Failed to fetch unread count:', response.status);
    }
  } catch (error) {
    console.error('[SW] Error updating unread badge:', error);
  }
}