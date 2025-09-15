<template>
  <div class="contact-method-selector">
    <h4>联系方式设置</h4>
    <p class="description">设置您的公开联系方式，其他用户可以通过这些方式与您联系</p>

    <div class="contact-methods">
      <!-- Email -->
      <div class="contact-method">
        <div class="method-header">
          <div class="method-info">
            <Icon name="mail" class="method-icon" />
            <div class="method-details">
              <div class="method-name">邮箱</div>
              <div class="method-desc">通过邮件联系</div>
            </div>
          </div>
          <label class="toggle">
            <input
              type="checkbox"
              :checked="isMethodEnabled('email')"
              @change="toggleMethod('email', $event.target.checked)"
            />
            <span class="toggle-slider"></span>
          </label>
        </div>
        <div v-if="isMethodEnabled('email')" class="method-input">
          <input
            v-model="contactValues.email"
            type="email"
            placeholder="your-email@example.com"
            class="contact-input"
            @blur="updateContactValue('email')"
          />
        </div>
      </div>

      <!-- WeChat -->
      <div class="contact-method">
        <div class="method-header">
          <div class="method-info">
            <Icon name="message-square" class="method-icon" />
            <div class="method-details">
              <div class="method-name">微信</div>
              <div class="method-desc">通过微信联系</div>
            </div>
          </div>
          <label class="toggle">
            <input
              type="checkbox"
              :checked="isMethodEnabled('wechat')"
              @change="toggleMethod('wechat', $event.target.checked)"
            />
            <span class="toggle-slider"></span>
          </label>
        </div>
        <div v-if="isMethodEnabled('wechat')" class="method-input">
          <input
            v-model="contactValues.wechat"
            type="text"
            placeholder="微信号或昵称"
            class="contact-input"
            @blur="updateContactValue('wechat')"
          />
        </div>
      </div>

      <!-- QQ -->
      <div class="contact-method">
        <div class="method-header">
          <div class="method-info">
            <Icon name="message-circle" class="method-icon" />
            <div class="method-details">
              <div class="method-name">QQ</div>
              <div class="method-desc">通过QQ联系</div>
            </div>
          </div>
          <label class="toggle">
            <input
              type="checkbox"
              :checked="isMethodEnabled('qq')"
              @change="toggleMethod('qq', $event.target.checked)"
            />
            <span class="toggle-slider"></span>
          </label>
        </div>
        <div v-if="isMethodEnabled('qq')" class="method-input">
          <input
            v-model="contactValues.qq"
            type="text"
            placeholder="QQ号码"
            class="contact-input"
            @blur="updateContactValue('qq')"
          />
        </div>
      </div>

      <!-- Telegram -->
      <div class="contact-method">
        <div class="method-header">
          <div class="method-info">
            <Icon name="send" class="method-icon" />
            <div class="method-details">
              <div class="method-name">Telegram</div>
              <div class="method-desc">通过Telegram联系</div>
            </div>
          </div>
          <label class="toggle">
            <input
              type="checkbox"
              :checked="isMethodEnabled('telegram')"
              @change="toggleMethod('telegram', $event.target.checked)"
            />
            <span class="toggle-slider"></span>
          </label>
        </div>
        <div v-if="isMethodEnabled('telegram')" class="method-input">
          <input
            v-model="contactValues.telegram"
            type="text"
            placeholder="@username 或用户名"
            class="contact-input"
            @blur="updateContactValue('telegram')"
          />
        </div>
      </div>

      <!-- Discord -->
      <div class="contact-method">
        <div class="method-header">
          <div class="method-info">
            <Icon name="hash" class="method-icon" />
            <div class="method-details">
              <div class="method-name">Discord</div>
              <div class="method-desc">通过Discord联系</div>
            </div>
          </div>
          <label class="toggle">
            <input
              type="checkbox"
              :checked="isMethodEnabled('discord')"
              @change="toggleMethod('discord', $event.target.checked)"
            />
            <span class="toggle-slider"></span>
          </label>
        </div>
        <div v-if="isMethodEnabled('discord')" class="method-input">
          <input
            v-model="contactValues.discord"
            type="text"
            placeholder="username#1234"
            class="contact-input"
            @blur="updateContactValue('discord')"
          />
        </div>
      </div>

      <!-- Phone -->
      <div class="contact-method">
        <div class="method-header">
          <div class="method-info">
            <Icon name="phone" class="method-icon" />
            <div class="method-details">
              <div class="method-name">电话</div>
              <div class="method-desc">通过电话联系</div>
            </div>
          </div>
          <label class="toggle">
            <input
              type="checkbox"
              :checked="isMethodEnabled('phone')"
              @change="toggleMethod('phone', $event.target.checked)"
            />
            <span class="toggle-slider"></span>
          </label>
        </div>
        <div v-if="isMethodEnabled('phone')" class="method-input">
          <input
            v-model="contactValues.phone"
            type="tel"
            placeholder="+86 138 0000 0000"
            class="contact-input"
            @blur="updateContactValue('phone')"
          />
        </div>
      </div>
    </div>

    <!-- Privacy Notice -->
    <div class="privacy-notice">
      <Icon name="shield" class="privacy-icon" />
      <div class="privacy-text">
        <strong>公开信息提醒:</strong> 您填写的联系方式将在您的个人资料中公开显示，所有查看您资料的用户都能看到。请谨慎填写个人信息。
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

// Props
const props = defineProps({
  modelValue: {
    type: Array,
    default: () => []
  }
})

// Emits
const emit = defineEmits(['update:modelValue'])

// State
const contactValues = ref({
  email: '',
  wechat: '',
  qq: '',
  telegram: '',
  discord: '',
  phone: ''
})

// Initialize from modelValue
const initializeFromProps = () => {
  if (props.modelValue?.length) {
    props.modelValue.forEach(contact => {
      if (contact.method && contact.value) {
        contactValues.value[contact.method] = contact.value
      }
    })
  }
}

// Initialize on mount
initializeFromProps()

// Watch for prop changes
watch(() => props.modelValue, initializeFromProps, { deep: true })

// Methods
const isMethodEnabled = (method) => {
  return props.modelValue.some(contact => contact.method === method)
}

const toggleMethod = (method, enabled) => {
  const currentMethods = [...props.modelValue]

  if (enabled) {
    // Add method if not already present
    if (!currentMethods.some(contact => contact.method === method)) {
      currentMethods.push({
        method,
        value: contactValues.value[method] || ''
      })
    }
  } else {
    // Remove method
    const index = currentMethods.findIndex(contact => contact.method === method)
    if (index > -1) {
      currentMethods.splice(index, 1)
    }
    // Clear the input value
    contactValues.value[method] = ''
  }

  emit('update:modelValue', currentMethods)
}

const updateContactValue = (method) => {
  const currentMethods = [...props.modelValue]
  const index = currentMethods.findIndex(contact => contact.method === method)

  if (index > -1) {
    // Update existing method
    currentMethods[index].value = contactValues.value[method] || ''
    emit('update:modelValue', currentMethods)
  }
}

// Computed
const enabledMethods = computed(() => {
  return props.modelValue.filter(contact => contact.value && contact.value.trim())
})
</script>

<style scoped>
.contact-method-selector h4 {
  margin: 0 0 8px 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-primary, #2c3e50);
}

.description {
  margin: 0 0 20px 0;
  color: var(--text-secondary, #7f8c8d);
  font-size: 0.9rem;
  line-height: 1.4;
}

.contact-methods {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 20px;
}

.contact-method {
  border: 1px solid var(--border-primary, #e9ecef);
  border-radius: 8px;
  overflow: hidden;
  background: var(--surface-primary, white);
}

.method-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
}

.method-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.method-icon {
  width: 20px;
  height: 20px;
  color: var(--accent-primary, #3498db);
}

.method-details {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.method-name {
  font-weight: 500;
  color: var(--text-primary, #2c3e50);
}

.method-desc {
  font-size: 0.85rem;
  color: var(--text-secondary, #7f8c8d);
}

.toggle {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
}

.toggle input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--border-primary, #ccc);
  transition: 0.3s;
  border-radius: 24px;
}

.toggle-slider:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: 0.3s;
  border-radius: 50%;
}

.toggle input:checked + .toggle-slider {
  background-color: var(--accent-primary, #3498db);
}

.toggle input:checked + .toggle-slider:before {
  transform: translateX(20px);
}

.method-input {
  padding: 0 16px 16px 16px;
  border-top: 1px solid var(--border-primary, #f0f0f0);
  background: var(--surface-secondary, #f8f9fa);
}

.contact-input {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid var(--border-primary, #e9ecef);
  border-radius: 6px;
  font-size: 0.9rem;
  background: var(--surface-primary, white);
  color: var(--text-primary, #2c3e50);
  margin-top: 12px;
}

.contact-input:focus {
  outline: none;
  border-color: var(--accent-primary, #3498db);
  box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.1);
}

.contact-input::placeholder {
  color: var(--text-secondary, #95a5a6);
}

.privacy-notice {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  margin-top: 20px;
}

.privacy-icon {
  width: 20px;
  height: 20px;
  color: var(--accent-primary, #3498db);
  margin-top: 2px;
  flex-shrink: 0;
}

.privacy-text {
  font-size: 0.85rem;
  line-height: 1.4;
  color: var(--text-secondary, #7f8c8d);
}

.privacy-text strong {
  color: var(--text-primary, #2c3e50);
}

@media (max-width: 768px) {
  .method-header {
    padding: 12px;
  }

  .method-input {
    padding: 0 12px 12px 12px;
  }

  .privacy-notice {
    padding: 12px;
  }

  .contact-input {
    font-size: 0.85rem;
  }
}
</style>