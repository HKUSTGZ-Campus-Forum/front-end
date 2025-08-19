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
  // You can enhance this with a proper UI component later
  if (confirm('New content is available. Refresh to update?')) {
    window.location.reload();
  }
}

// Add install prompt handling
let deferredPrompt: any = null;

if (process.client) {
  window.addEventListener('beforeinstallprompt', (e) => {
    console.log('[PWA] Install prompt available');
    e.preventDefault();
    deferredPrompt = e;
    
    // Show custom install button/banner
    showInstallPrompt();
  });

  window.addEventListener('appinstalled', () => {
    console.log('[PWA] App installed successfully');
    deferredPrompt = null;
    hideInstallPrompt();
  });
}

function showInstallPrompt() {
  // Create a simple install banner
  const installBanner = document.createElement('div');
  installBanner.id = 'pwa-install-banner';
  installBanner.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 20px;
    right: 20px;
    background: #4f46e5;
    color: white;
    padding: 16px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    display: flex;
    justify-content: space-between;
    align-items: center;
    z-index: 1000;
    font-family: system-ui, -apple-system, sans-serif;
  `;

  installBanner.innerHTML = `
    <div>
      <strong>Install UniKorn Forum</strong>
      <div style="font-size: 14px; opacity: 0.9;">Get the app for a better experience</div>
    </div>
    <div>
      <button id="pwa-install-btn" style="background: rgba(255,255,255,0.2); border: none; color: white; padding: 8px 16px; border-radius: 4px; margin-right: 8px; cursor: pointer;">Install</button>
      <button id="pwa-dismiss-btn" style="background: transparent; border: none; color: white; padding: 8px; cursor: pointer; opacity: 0.7;">✕</button>
    </div>
  `;

  document.body.appendChild(installBanner);

  // Handle install button click
  const installBtn = document.getElementById('pwa-install-btn');
  installBtn?.addEventListener('click', async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`[PWA] User ${outcome} the install prompt`);
    }
    hideInstallPrompt();
  });

  // Handle dismiss button click
  const dismissBtn = document.getElementById('pwa-dismiss-btn');
  dismissBtn?.addEventListener('click', () => {
    hideInstallPrompt();
  });
}

function hideInstallPrompt() {
  const banner = document.getElementById('pwa-install-banner');
  if (banner) {
    banner.remove();
  }
}