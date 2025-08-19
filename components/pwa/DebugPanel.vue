<template>
  <div v-if="showDebugInfo" class="pwa-debug-panel">
    <div class="debug-header">
      <h4>🔧 PWA Debug Info</h4>
      <button @click="showDebugInfo = false" class="debug-close">✕</button>
    </div>
    
    <div class="debug-content">
      <div class="debug-item">
        <span class="debug-label">Protocol:</span>
        <span :class="['debug-value', isSecure ? 'success' : 'warning']">
          {{ protocol }} {{ isSecure ? '✅' : '⚠️' }}
        </span>
      </div>
      
      <div class="debug-item">
        <span class="debug-label">Host:</span>
        <span :class="['debug-value', isValidHost ? 'success' : 'warning']">
          {{ hostname }} {{ isValidHost ? '✅' : '⚠️' }}
        </span>
      </div>
      
      <div class="debug-item">
        <span class="debug-label">Service Worker:</span>
        <span :class="['debug-value', hasServiceWorker ? 'success' : 'error']">
          {{ hasServiceWorker ? 'Registered ✅' : 'Not Found ❌' }}
        </span>
      </div>
      
      <div class="debug-item">
        <span class="debug-label">Manifest:</span>
        <span :class="['debug-value', hasManifest ? 'success' : 'error']">
          {{ hasManifest ? 'Valid ✅' : 'Invalid ❌' }}
        </span>
      </div>
      
      <div class="debug-item">
        <span class="debug-label">Install Prompt:</span>
        <span :class="['debug-value', canInstall ? 'success' : 'info']">
          {{ canInstall ? 'Available ✅' : 'Waiting... ⏳' }}
        </span>
      </div>
      
      <div class="debug-item">
        <span class="debug-label">Already Installed:</span>
        <span :class="['debug-value', isInstalled ? 'info' : 'success']">
          {{ isInstalled ? 'Yes 📱' : 'No 🌐' }}
        </span>
      </div>
      
      <div class="debug-requirements">
        <h5>PWA Requirements:</h5>
        <ul>
          <li :class="isSecure || isLocalhost ? 'success' : 'error'">
            HTTPS or localhost {{ (isSecure || isLocalhost) ? '✅' : '❌' }}
          </li>
          <li :class="hasServiceWorker ? 'success' : 'error'">
            Service Worker {{ hasServiceWorker ? '✅' : '❌' }}
          </li>
          <li :class="hasManifest ? 'success' : 'error'">
            Valid Manifest {{ hasManifest ? '✅' : '❌' }}
          </li>
          <li :class="hasRequiredIcons ? 'success' : 'warning'">
            192x192 & 512x512 Icons {{ hasRequiredIcons ? '✅' : '⚠️' }}
          </li>
        </ul>
      </div>

      <div class="debug-actions">
        <button @click="checkManifest" class="debug-btn">Check Manifest</button>
        <button @click="forceRefresh" class="debug-btn">Refresh SW</button>
        <button v-if="canInstall" @click="triggerInstall" class="debug-btn primary">
          Trigger Install
        </button>
      </div>
    </div>
  </div>
  
  <!-- Debug trigger button -->
  <button 
    v-if="!showDebugInfo && isDevelopment" 
    @click="showDebugInfo = true"
    class="debug-trigger"
    title="PWA Debug Panel"
  >
    🔧
  </button>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

const showDebugInfo = ref(false)
const hasServiceWorker = ref(false)
const hasManifest = ref(false)
const canInstall = ref(false)
const hasRequiredIcons = ref(false)
const deferredPrompt = ref<any>(null)

const protocol = ref('')
const hostname = ref('')

const isDevelopment = computed(() => {
  return process.env.NODE_ENV === 'development' || hostname.value === 'localhost'
})

const isSecure = computed(() => protocol.value === 'https:')
const isLocalhost = computed(() => hostname.value === 'localhost' || hostname.value === '127.0.0.1')
const isValidHost = computed(() => isSecure.value || isLocalhost.value)

const isInstalled = computed(() => {
  if (process.client && window.matchMedia) {
    return window.matchMedia('(display-mode: standalone)').matches
  }
  return false
})

const checkManifest = async () => {
  try {
    const response = await fetch('/manifest.json')
    if (response.ok) {
      const manifest = await response.json()
      hasManifest.value = true
      
      // Check for required icon sizes
      const icons = manifest.icons || []
      const has192 = icons.some((icon: any) => 
        icon.sizes && (icon.sizes.includes('192x192') || icon.sizes === 'any')
      )
      const has512 = icons.some((icon: any) => 
        icon.sizes && (icon.sizes.includes('512x512') || icon.sizes === 'any')
      )
      
      hasRequiredIcons.value = has192 && has512
      console.log('✅ Manifest loaded:', manifest)
    } else {
      hasManifest.value = false
      console.error('❌ Manifest not found')
    }
  } catch (error) {
    hasManifest.value = false
    console.error('❌ Manifest error:', error)
  }
}

const forceRefresh = async () => {
  if ('serviceWorker' in navigator) {
    const registration = await navigator.serviceWorker.getRegistration()
    if (registration) {
      await registration.update()
      console.log('🔄 Service Worker updated')
    }
  }
}

const triggerInstall = async () => {
  if (deferredPrompt.value) {
    deferredPrompt.value.prompt()
    const { outcome } = await deferredPrompt.value.userChoice
    console.log(`📱 Install prompt: ${outcome}`)
  }
}

onMounted(async () => {
  if (process.client) {
    protocol.value = window.location.protocol
    hostname.value = window.location.hostname
    
    // Check service worker
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration()
      hasServiceWorker.value = !!registration
    }
    
    // Check manifest
    await checkManifest()
    
    // Listen for install prompt
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault()
      deferredPrompt.value = e
      canInstall.value = true
      console.log('📱 Install prompt available!')
    })
    
    window.addEventListener('appinstalled', () => {
      console.log('🎉 App installed!')
      canInstall.value = false
      deferredPrompt.value = null
    })
  }
})
</script>

<style scoped>
.pwa-debug-panel {
  position: fixed;
  top: 80px;
  right: 20px;
  width: 320px;
  max-height: calc(100vh - 100px);
  background: white;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.1);
  z-index: 10000;
  font-family: -apple-system, BlinkMacSystemFont, sans-serif;
  overflow-y: auto;
}

.debug-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #f8fafc;
  border-bottom: 1px solid #e5e7eb;
  border-radius: 10px 10px 0 0;
}

.debug-header h4 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #374151;
}

.debug-close {
  background: none;
  border: none;
  font-size: 16px;
  cursor: pointer;
  padding: 4px;
  color: #6b7280;
}

.debug-content {
  padding: 16px;
}

.debug-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 0;
  border-bottom: 1px solid #f1f5f9;
}

.debug-label {
  font-size: 12px;
  font-weight: 500;
  color: #374151;
}

.debug-value {
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 500;
}

.debug-value.success {
  background: #dcfce7;
  color: #166534;
}

.debug-value.warning {
  background: #fef3c7;
  color: #92400e;
}

.debug-value.error {
  background: #fecaca;
  color: #991b1b;
}

.debug-value.info {
  background: #dbeafe;
  color: #1e40af;
}

.debug-requirements {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #e5e7eb;
}

.debug-requirements h5 {
  margin: 0 0 8px 0;
  font-size: 12px;
  font-weight: 600;
  color: #374151;
}

.debug-requirements ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.debug-requirements li {
  font-size: 11px;
  padding: 3px 0;
  font-weight: 500;
}

.debug-requirements li.success {
  color: #166534;
}

.debug-requirements li.warning {
  color: #92400e;
}

.debug-requirements li.error {
  color: #991b1b;
}

.debug-actions {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #e5e7eb;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.debug-btn {
  padding: 6px 12px;
  border: 1px solid #d1d5db;
  background: white;
  border-radius: 6px;
  font-size: 11px;
  cursor: pointer;
  color: #374151;
  font-weight: 500;
}

.debug-btn:hover {
  background: #f9fafb;
}

.debug-btn.primary {
  background: #4f46e5;
  color: white;
  border-color: #4f46e5;
}

.debug-btn.primary:hover {
  background: #4338ca;
}

.debug-trigger {
  position: fixed;
  bottom: 80px;
  right: 20px;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: none;
  background: #374151;
  color: white;
  font-size: 16px;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  z-index: 9999;
  transition: all 0.2s ease;
}

.debug-trigger:hover {
  background: #1f2937;
  transform: scale(1.05);
}

@media (max-width: 768px) {
  .pwa-debug-panel {
    right: 10px;
    left: 10px;
    width: auto;
    top: 70px;
  }
  
  .debug-trigger {
    bottom: 20px;
    right: 20px;
  }
}

@media (prefers-color-scheme: dark) {
  .pwa-debug-panel {
    background: #1f2937;
    border-color: #374151;
    color: #f9fafb;
  }
  
  .debug-header {
    background: #374151;
    border-bottom-color: #4b5563;
  }
  
  .debug-header h4 {
    color: #f9fafb;
  }
  
  .debug-close {
    color: #9ca3af;
  }
  
  .debug-item {
    border-bottom-color: #374151;
  }
  
  .debug-label {
    color: #f9fafb;
  }
  
  .debug-requirements {
    border-top-color: #374151;
  }
  
  .debug-requirements h5 {
    color: #f9fafb;
  }
  
  .debug-actions {
    border-top-color: #374151;
  }
  
  .debug-btn {
    background: #374151;
    border-color: #4b5563;
    color: #f9fafb;
  }
  
  .debug-btn:hover {
    background: #4b5563;
  }
}
</style>