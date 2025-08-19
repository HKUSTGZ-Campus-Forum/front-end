// PWA Service Worker Registration Plugin
export default defineNuxtPlugin(() => {
  if (process.client && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      registerServiceWorker();
    });
  }
});

async function registerServiceWorker() {
  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/'
    });

    console.log('[PWA] Service Worker registered successfully:', registration.scope);

    // Handle service worker updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed') {
            if (navigator.serviceWorker.controller) {
              // New service worker available
              console.log('[PWA] New content available, please refresh');
              showUpdateNotification();
            } else {
              // First time installation
              console.log('[PWA] Content cached for offline use');
            }
          }
        });
      }
    });

    // Handle service worker messages
    navigator.serviceWorker.addEventListener('message', (event) => {
      console.log('[PWA] Message from service worker:', event.data);
    });

    // Check for updates periodically (every 24 hours)
    setInterval(() => {
      registration.update();
    }, 24 * 60 * 60 * 1000);

  } catch (error) {
    console.error('[PWA] Service Worker registration failed:', error);
  }
}

function showUpdateNotification() {
  // Simple notification that new content is available
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #10b981;
    color: white;
    padding: 16px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 10000;
    font-family: system-ui, -apple-system, sans-serif;
    max-width: 300px;
  `;

  notification.innerHTML = `
    <div style="font-weight: 600; margin-bottom: 4px;">更新可用</div>
    <div style="font-size: 14px; margin-bottom: 12px;">发现新内容，刷新页面获取最新版本</div>
    <button onclick="window.location.reload()" style="background: rgba(255,255,255,0.2); border: none; color: white; padding: 6px 12px; border-radius: 4px; cursor: pointer; margin-right: 8px;">刷新</button>
    <button onclick="this.parentElement.remove()" style="background: transparent; border: none; color: white; padding: 6px 12px; cursor: pointer; opacity: 0.8;">稍后</button>
  `;

  document.body.appendChild(notification);

  // Auto-remove after 30 seconds
  setTimeout(() => {
    if (notification.parentElement) {
      notification.remove();
    }
  }, 30000);
}