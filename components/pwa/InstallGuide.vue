<template>
  <div v-if="showGuide" class="install-guide-container">
    <!-- Floating Install Button -->
    <div 
      v-if="!isExpanded && canInstall" 
      class="install-float-btn"
      @click="isExpanded = true"
    >
      <span class="install-icon">📱</span>
      <span class="install-text">安装应用</span>
    </div>

    <!-- Expanded Install Guide -->
    <Transition name="slide-up">
      <div v-if="isExpanded" class="install-guide-card">
        <div class="guide-header">
          <div class="guide-title">
            <span class="guide-icon">🚀</span>
            <h3>安装 UniKorn 应用</h3>
          </div>
          <button @click="closeGuide" class="close-btn" aria-label="关闭">✕</button>
        </div>

        <div class="guide-content">
          <p class="guide-description">获得更好的使用体验，支持离线访问</p>
          
          <!-- Install Button for supported browsers -->
          <button 
            v-if="canInstall" 
            @click="installApp" 
            class="install-btn-primary"
          >
            <span class="btn-icon">📲</span>
            一键安装应用
          </button>

          <!-- Manual Instructions -->
          <div class="manual-instructions">
            <div class="instruction-tabs">
              <button 
                v-for="platform in platforms" 
                :key="platform.id"
                @click="selectedPlatform = platform.id"
                :class="['tab-btn', { active: selectedPlatform === platform.id }]"
              >
                <span class="tab-icon" v-html="platform.icon"></span>
                {{ platform.name }}
              </button>
            </div>

            <div class="instruction-content">
              <div v-for="step in currentInstructions" :key="step.id" class="instruction-step">
                <div class="step-number">{{ step.id }}</div>
                <div class="step-content">
                  <div class="step-text">{{ step.text }}</div>
                  <div v-if="step.icon" class="step-icon" v-html="step.icon"></div>
                </div>
              </div>
            </div>
          </div>

          <div class="guide-footer">
            <label class="dont-show-again">
              <input v-model="dontShowAgain" type="checkbox">
              <span>不再显示</span>
            </label>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Backdrop -->
    <div 
      v-if="isExpanded" 
      class="install-guide-backdrop"
      @click="closeGuide"
    ></div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

const isExpanded = ref(false)
const canInstall = ref(false)
const selectedPlatform = ref('chrome')
const dontShowAgain = ref(false)
const deferredPrompt = ref<any>(null)

const showGuide = computed(() => {
  if (process.server) return false
  
  // Don't show if user dismissed permanently
  if (localStorage.getItem('pwa-install-dismissed') === 'true') return false
  
  // Don't show if already installed
  if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) return false
  
  return true
})

const platforms = [
  {
    id: 'chrome',
    name: 'Chrome',
    icon: '🌐',
    instructions: [
      { id: 1, text: '点击地址栏右侧的安装图标', icon: '⬇️' },
      { id: 2, text: '或点击右上角三个点菜单', icon: '⋮' },
      { id: 3, text: '选择"安装 UniKorn"', icon: '📲' },
      { id: 4, text: '确认安装，享受应用体验！', icon: '✨' }
    ]
  },
  {
    id: 'safari',
    name: 'Safari',
    icon: '🧭',
    instructions: [
      { id: 1, text: '点击底部分享按钮', icon: '📤' },
      { id: 2, text: '滑动找到"添加到主屏幕"', icon: '📱' },
      { id: 3, text: '点击"添加到主屏幕"', icon: '➕' },
      { id: 4, text: '确认添加，应用已安装到桌面', icon: '🎉' }
    ]
  },
  {
    id: 'edge',
    name: 'Edge',
    icon: '🔷',
    instructions: [
      { id: 1, text: '点击地址栏右侧的应用图标', icon: '📱' },
      { id: 2, text: '或点击右上角三个点菜单', icon: '⋯' },
      { id: 3, text: '选择"将此站点安装为应用"', icon: '🔽' },
      { id: 4, text: '点击"安装"完成设置', icon: '☑️' }
    ]
  }
]

const currentInstructions = computed(() => {
  const platform = platforms.find(p => p.id === selectedPlatform.value)
  return platform?.instructions || []
})

const installApp = async () => {
  if (deferredPrompt.value) {
    deferredPrompt.value.prompt()
    const { outcome } = await deferredPrompt.value.userChoice
    
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt')
      closeGuide()
    }
    
    deferredPrompt.value = null
    canInstall.value = false
  }
}

const closeGuide = () => {
  isExpanded.value = false
  
  if (dontShowAgain.value) {
    localStorage.setItem('pwa-install-dismissed', 'true')
  } else {
    // Hide for this session
    sessionStorage.setItem('pwa-install-session-dismissed', 'true')
  }
}

const handleBeforeInstallPrompt = (e: Event) => {
  e.preventDefault()
  deferredPrompt.value = e
  canInstall.value = true
}

const handleAppInstalled = () => {
  console.log('PWA was installed')
  canInstall.value = false
  deferredPrompt.value = null
  closeGuide()
}

const detectPlatform = () => {
  if (process.client) {
    const userAgent = navigator.userAgent.toLowerCase()
    
    if (userAgent.includes('safari') && !userAgent.includes('chrome')) {
      selectedPlatform.value = 'safari'
    } else if (userAgent.includes('edg')) {
      selectedPlatform.value = 'edge'
    } else {
      selectedPlatform.value = 'chrome'
    }
  }
}

onMounted(() => {
  if (process.client) {
    // Check if already dismissed this session
    if (sessionStorage.getItem('pwa-install-session-dismissed') === 'true') {
      return
    }

    detectPlatform()
    
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)
    
    // Auto-show after a delay if installable
    setTimeout(() => {
      if (canInstall.value && !isExpanded.value) {
        // Don't auto-expand, just show the float button
      }
    }, 10000) // Show after 10 seconds
  }
})

onUnmounted(() => {
  if (process.client) {
    window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.removeEventListener('appinstalled', handleAppInstalled)
  }
})
</script>

<style scoped>
.install-guide-container {
  position: relative;
  z-index: 1000;
}

/* Floating Install Button */
.install-float-btn {
  position: fixed;
  bottom: 20px;
  right: 20px;
  background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
  color: white;
  padding: 12px 16px;
  border-radius: 24px;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(79, 70, 229, 0.3);
  transition: all 0.3s ease;
  font-size: 14px;
  font-weight: 500;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.install-float-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(79, 70, 229, 0.4);
}

.install-icon {
  font-size: 16px;
}

/* Install Guide Card */
.install-guide-card {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: var(--surface-primary, white);
  border-radius: 16px 16px 0 0;
  box-shadow: 0 -4px 32px rgba(0, 0, 0, 0.1);
  max-height: 80vh;
  overflow-y: auto;
  border: 1px solid var(--border-light, #e5e7eb);
}

@media (min-width: 768px) {
  .install-guide-card {
    position: fixed;
    bottom: 80px;
    right: 20px;
    left: auto;
    width: 380px;
    border-radius: 16px;
    max-height: 600px;
  }
}

.install-guide-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(4px);
  z-index: -1;
}

.guide-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 20px 16px;
  border-bottom: 1px solid var(--border-light, #f1f5f9);
}

.guide-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.guide-title h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary, #1f2937);
}

.guide-icon {
  font-size: 20px;
}

.close-btn {
  background: none;
  border: none;
  font-size: 20px;
  color: var(--text-secondary, #6b7280);
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.close-btn:hover {
  background: var(--surface-secondary, #f8fafc);
  color: var(--text-primary, #1f2937);
}

.guide-content {
  padding: 0 20px 20px;
}

.guide-description {
  margin: 0 0 16px;
  color: var(--text-secondary, #6b7280);
  font-size: 14px;
}

/* Primary Install Button */
.install-btn-primary {
  width: 100%;
  background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
  color: white;
  border: none;
  padding: 12px 16px;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.3s ease;
  margin-bottom: 20px;
}

.install-btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 16px rgba(79, 70, 229, 0.3);
}

.btn-icon {
  font-size: 18px;
}

/* Manual Instructions */
.manual-instructions {
  border-top: 1px solid var(--border-light, #f1f5f9);
  padding-top: 20px;
}

.instruction-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.tab-btn {
  flex: 1;
  background: var(--surface-secondary, #f8fafc);
  border: 1px solid var(--border-light, #e5e7eb);
  color: var(--text-secondary, #6b7280);
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  transition: all 0.2s ease;
}

.tab-btn.active {
  background: var(--primary-color, #4f46e5);
  color: white;
  border-color: var(--primary-color, #4f46e5);
}

.tab-icon {
  font-size: 12px;
}

.instruction-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.instruction-step {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.step-number {
  width: 24px;
  height: 24px;
  background: var(--primary-color, #4f46e5);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  flex-shrink: 0;
}

.step-content {
  flex: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.step-text {
  color: var(--text-primary, #1f2937);
  font-size: 14px;
  line-height: 1.4;
}

.step-icon {
  font-size: 16px;
  opacity: 0.7;
}

.guide-footer {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid var(--border-light, #f1f5f9);
}

.dont-show-again {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--text-secondary, #6b7280);
  cursor: pointer;
}

.dont-show-again input {
  margin: 0;
}

/* Animations */
.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s ease;
}

.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateY(100%);
  opacity: 0;
}

/* Dark theme support */
@media (prefers-color-scheme: dark) {
  .install-guide-card {
    background: var(--surface-primary, #1f2937);
    border-color: var(--border-dark, #374151);
  }
  
  .guide-header {
    border-bottom-color: var(--border-dark, #374151);
  }
  
  .tab-btn {
    background: var(--surface-tertiary, #374151);
    border-color: var(--border-dark, #4b5563);
    color: var(--text-secondary, #9ca3af);
  }
  
  .manual-instructions {
    border-top-color: var(--border-dark, #374151);
  }
  
  .guide-footer {
    border-top-color: var(--border-dark, #374151);
  }
}

/* Mobile optimizations */
@media (max-width: 767px) {
  .install-float-btn {
    bottom: 16px;
    right: 16px;
    padding: 10px 14px;
    font-size: 13px;
  }
  
  .install-guide-card {
    max-height: 70vh;
  }
  
  .guide-content {
    padding: 0 16px 16px;
  }
  
  .guide-header {
    padding: 16px 16px 12px;
  }
}
</style>