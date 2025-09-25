<template>
  <HomeContainer>
    <div class="profile-setup">
      <MatchingBreadcrumbs />

      <div class="setup-header">
        <h1>
          <Icon name="user-circle" class="title-icon" />
          设置个人资料
        </h1>
        <p>简单介绍你感兴趣的问题领域并设置联系方式，以便队友能够联系到你</p>
      </div>

    <form @submit.prevent="saveProfile" class="profile-form">
      <!-- Problem of Interest Section -->
      <div class="form-section">
        <h2>你感兴趣解决什么问题？</h2>
        <div class="form-group">
          <label for="problem_interest">描述你感兴趣的问题领域 *</label>
          <textarea
            id="problem_interest"
            v-model="form.problem_interest"
            placeholder="例如：想改善校园生活的某个方面，或者对某个技术领域很好奇想深入研究，或者想解决某个社会问题..."
            rows="6"
            required
            maxlength="500"
          />
          <div class="char-count">{{ form.problem_interest?.length || 0 }}/500</div>
          <p class="help-text">不用担心描述得不够专业，系统会通过AI理解你的兴趣并匹配合适的项目和队友</p>
        </div>
      </div>

      <!-- Contact Methods Section -->
      <div class="form-section">
        <ContactMethodSelector
          v-model="form.contact_methods"
        />
      </div>

      <!-- Form Actions -->
      <div class="form-actions">
        <button type="button" @click="$router.go(-1)" class="btn btn-secondary">
          取消
        </button>
        <button type="submit" :disabled="!isFormValid || saving" class="btn btn-primary">
          <Icon v-if="saving" name="spinner" class="spinning" />
          {{ profile?.id ? '更新资料' : '保存资料' }}
        </button>
        <button
          v-if="isFormValid && !saving"
          type="button"
          @click="saveAndContinue"
          class="btn btn-success"
        >
          保存并继续到项目发现
          <Icon name="arrow-right" />
        </button>
      </div>
    </form>
    </div>
  </HomeContainer>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import MatchingBreadcrumbs from '~/components/matching/MatchingBreadcrumbs.vue'
import ContactMethodSelector from '~/components/matching/ContactMethodSelector.vue'

// Composables
const { fetchWithAuth } = useApi()

// Page meta
definePageMeta({
  title: 'Profile Setup',
  requiresAuth: true,
})

// Reactive data
const form = ref({
  problem_interest: '',
  contact_methods: [],
})

const profile = ref(null)
const saving = ref(false)

// Computed properties
const isFormValid = computed(() => {
  return form.value.problem_interest?.trim() && form.value.contact_methods?.length > 0
})

// Methods
const loadProfile = async () => {
  try {
    const response = await fetchWithAuth('/api/profiles')
    const data = await response.json()

    if (data.success && data.profile) {
      const p = data.profile
      profile.value = p

      form.value = {
        problem_interest: p.problem_interest || p.bio || '',  // fallback to bio if problem_interest doesn't exist yet
        contact_methods: p.contact_methods || [],
      }
    }
  } catch (error) {
    console.error('Error loading profile:', error)
  }
}

const saveProfile = async () => {
  if (!isFormValid.value || saving.value) return

  saving.value = true

  try {
    const payload = {
      ...form.value,
      is_active: true
    }

    const response = await fetchWithAuth('/api/profiles', {
      method: 'POST',
      body: payload
    })

    const data = await response.json()

    if (data.success) {
      // Show success message
      // Add toast notification here if available

      // Redirect to dashboard
      await navigateTo('/matching')
    } else {
      throw new Error(data.message || 'Failed to save profile')
    }
  } catch (error) {
    console.error('Error saving profile:', error)
    // Show error message
  } finally {
    saving.value = false
  }
}

const saveAndContinue = async () => {
  if (!isFormValid.value || saving.value) return

  saving.value = true

  try {
    const payload = {
      ...form.value,
      is_active: true
    }

    const response = await fetchWithAuth('/api/profiles', {
      method: 'POST',
      body: payload
    })

    const data = await response.json()

    if (data.success) {
      // Redirect to project discovery
      await navigateTo('/matching/discover')
    } else {
      throw new Error(data.message || 'Failed to save profile')
    }
  } catch (error) {
    console.error('Error saving profile:', error)
    // Show error message
  } finally {
    saving.value = false
  }
}

// Lifecycle
onMounted(async () => {
  await loadProfile()
})
</script>

<style scoped>
.profile-setup {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.setup-header {
  text-align: center;
  margin-bottom: 40px;
}

.setup-header h1 {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  font-size: 2.5rem;
  color: var(--text-primary, #2c3e50);
  margin-bottom: 8px;
}

.title-icon {
  color: #3498db;
}

.setup-header p {
  font-size: 1.1rem;
  color: var(--text-secondary, #7f8c8d);
  margin: 0 0 20px 0;
}

.setup-progress {
  max-width: 400px;
  margin: 0 auto;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background: var(--surface-secondary, #f8f9fa);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 8px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--interactive-primary, #3498db), #2ecc71);
  border-radius: 4px;
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 0.9rem;
  color: var(--text-secondary, #7f8c8d);
  font-weight: 500;
}

.profile-form {
  background: var(--surface-primary, white);
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.08);
  overflow: hidden;
}

.form-section {
  padding: 30px;
  border-bottom: 1px solid #e9ecef;
}

.form-section:last-child {
  border-bottom: none;
}

.form-section h2 {
  margin: 0 0 20px 0;
  font-size: 1.4rem;
  color: var(--text-primary, #2c3e50);
  font-weight: 600;
}

.form-group {
  margin-bottom: 20px;
}

.form-group:last-child {
  margin-bottom: 0;
}

label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: var(--text-primary, #2c3e50);
}

input[type="text"],
input[type="email"],
textarea,
select {
  width: 100%;
  padding: 12px;
  border: 1px solid var(--border-primary, #ddd);
  border-radius: 8px;
  font-size: 1rem;
  transition: border-color 0.2s ease;
}

input[type="text"]:focus,
input[type="email"]:focus,
textarea:focus,
select:focus {
  outline: none;
  border-color: var(--interactive-primary, #3498db);
  box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.1);
}

textarea {
  resize: vertical;
  min-height: 100px;
}

.char-count {
  text-align: right;
  font-size: 0.9rem;
  color: var(--text-secondary, #7f8c8d);
  margin-top: 4px;
}

.help-text {
  font-size: 0.9rem;
  color: var(--text-secondary, #7f8c8d);
  margin: 8px 0 0 0;
}

.radio-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.radio-option {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.radio-option:hover {
  border-color: var(--interactive-primary, #3498db);
  background: rgba(52, 152, 219, 0.02);
}

.radio-option input[type="radio"] {
  width: auto;
  margin: 2px 0 0 0;
}

.radio-content strong {
  display: block;
  color: var(--text-primary, #2c3e50);
  margin-bottom: 4px;
}

.radio-content p {
  margin: 0;
  font-size: 0.9rem;
  color: var(--text-secondary, #7f8c8d);
}

.checkbox-group {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 16px;
}

.checkbox-option {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.checkbox-option input[type="checkbox"] {
  width: auto;
}

.form-actions {
  padding: 30px;
  display: flex;
  justify-content: flex-end;
  gap: 16px;
  background: #f8f9fa;
}

.btn {
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 500;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: 1px solid transparent;
  cursor: pointer;
  font-size: 1rem;
  transition: all 0.2s ease;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background: var(--interactive-primary, #3498db);
  color: white;
  border-color: var(--interactive-primary, #3498db);
}

.btn-primary:hover:not(:disabled) {
  background: #2980b9;
  border-color: #2980b9;
}

.btn-secondary {
  background: var(--surface-primary, white);
  color: var(--text-secondary, #7f8c8d);
  border-color: #bdc3c7;
}

.btn-secondary:hover {
  background: #ecf0f1;
}

.btn-success {
  background: #27ae60;
  color: white;
  border-color: #27ae60;
}

.btn-success:hover:not(:disabled) {
  background: #219a52;
  border-color: #219a52;
}

.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@media (max-width: 768px) {
  .form-section {
    padding: 20px;
  }

  .form-actions {
    flex-direction: column-reverse;
  }

  .checkbox-group {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>