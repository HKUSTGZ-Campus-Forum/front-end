// UniKorn Campus Forum Service Worker
const CACHE_NAME = 'unikorn-forum-v1';
const STATIC_CACHE = 'unikorn-static-v1';
const API_CACHE = 'unikorn-api-v1';

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
  console.log('[SW] Install event');
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
  console.log('[SW] Activate event');
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
    console.log('[SW] Network failed, trying cache for:', request.url);
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
    console.log('[SW] Network failed for static request:', request.url);
    
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
  console.log('[SW] Background sync event:', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
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

// Handle push notifications (if needed in future)
self.addEventListener('push', (event) => {
  console.log('[SW] Push received');
  
  const options = {
    body: event.data ? event.data.text() : 'New update available',
    icon: '/icons/topbar_logo.svg',
    badge: '/favicon.ico',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: '1'
    },
    actions: [
      {
        action: 'explore',
        title: 'View',
        icon: '/icons/sidebar_logo.svg'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/favicon.ico'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('UniKorn Forum', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification click received');
  
  event.notification.close();
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});