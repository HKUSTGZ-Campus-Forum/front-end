<template>
  <HomeContainer>
    <div class="project-create">
      <MatchingBreadcrumbs />

      <div class="create-header">
        <h1>
          <Icon name="plus-circle" class="title-icon" />
          创建项目
        </h1>
        <p v-if="!showInterview">分享你想解决的问题，AI助手会通过问答帮你完善项目描述</p>
        <p v-else>AI助手正在帮你完善项目描述</p>

        <!-- Creation tip -->
        <div v-if="!showInterview" class="creation-tip">
          <Icon name="lightbulb" class="tip-icon" />
          <span>💡 输入你的想法后，AI会问几个问题帮你完善项目描述，让队友更容易理解你的项目！</span>
        </div>
      </div>

      <!-- Initial Description Form -->
      <form v-if="!showInterview" @submit.prevent="startInterview" class="project-form">
        <!-- Problem Description Section -->
        <div class="form-section">
          <h2>你想解决什么问题？</h2>
          <div class="form-group">
            <label for="problem_description">描述你想解决的问题 *</label>
            <textarea
              id="problem_description"
              v-model="form.problem_description"
              placeholder="例如：想让课程选课更方便，或者想帮助同学更好地学习某个知识点，或者想改善校园里的某个不便之处..."
              rows="6"
              required
              maxlength="500"
            />
            <div class="char-count">{{ form.problem_description?.length || 0 }}/500</div>
            <p class="help-text">AI助手会基于你的描述提出几个问题，帮你形成更完整的项目计划</p>
          </div>
        </div>

        <!-- Form Actions -->
        <div class="form-actions">
          <button type="button" @click="$router.go(-1)" class="btn btn-secondary">
            取消
          </button>
          <button type="button" @click="createDirectly" :disabled="!isFormValid || creating" class="btn btn-secondary">
            <Icon v-if="creating" name="spinner" class="spinning" />
            直接创建项目
          </button>
          <button type="submit" :disabled="!isFormValid" class="btn btn-primary">
            开始AI问答完善 ✨
          </button>
        </div>
      </form>

      <!-- AI Interview Component -->
      <ProjectInterview
        v-if="showInterview"
        :initial-description="form.problem_description"
        @completed="onInterviewCompleted"
        @restart="onInterviewRestart"
      />
    </div>
  </HomeContainer>
</template>

<script setup>
import { ref, computed } from 'vue'
import MatchingBreadcrumbs from '~/components/matching/MatchingBreadcrumbs.vue'
import ProjectInterview from '~/components/matching/ProjectInterview.vue'

// Composables
const { fetchWithAuth } = useApi()

// Page meta
definePageMeta({
  title: 'Create Project',
  requiresAuth: true,
})

// Reactive data
const form = ref({
  problem_description: '',
})

const creating = ref(false)
const showInterview = ref(false)

// Computed properties
const isFormValid = computed(() => {
  return form.value.problem_description?.trim()
})

// Methods
const startInterview = () => {
  if (!isFormValid.value) return
  showInterview.value = true
}

const onInterviewCompleted = async (finalDescription) => {
  // Create project with AI-enhanced description
  await createProjectWithDescription(finalDescription)
}

const onInterviewRestart = () => {
  showInterview.value = false
}

const createDirectly = async () => {
  // Create project with original description (fallback option)
  await createProjectWithDescription(form.value.problem_description.trim())
}

const createProjectWithDescription = async (description) => {
  if (!description?.trim() || creating.value) return

  creating.value = true

  try {
    // Auto-generate title from first sentence or first 50 characters
    let title = description.split(/[.!?。！？]/)[0].trim()
    if (title.length > 50) {
      title = description.substring(0, 47) + '...'
    }
    if (!title) {
      title = '解决问题项目'  // Fallback title
    }

    const payload = {
      title: title,
      description: description,
      status: 'recruiting'
    }

    const rawResponse = await fetchWithAuth('/api/projects/', {
      method: 'POST',
      body: payload
    })

    const response = await rawResponse.json()

    if (response.success) {
      // Redirect to project detail or dashboard
      await navigateTo(`/matching/projects/${response.project.id}`)
    } else {
      throw new Error(response.message || 'Failed to create project')
    }
  } catch (error) {
    console.error('💥 Error creating project:', error)
    // Error logged to console, no popup alert
  } finally {
    creating.value = false
  }
}
</script>

<style scoped>
.project-create {
  max-width: 900px;
  margin: 0 auto;
  padding: 20px;
}

.create-header {
  text-align: center;
  margin-bottom: 40px;
}

.create-header h1 {
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

.create-header p {
  font-size: 1.1rem;
  color: var(--text-secondary, #7f8c8d);
  margin: 0 0 20px 0;
}

.creation-tip {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  max-width: 600px;
  margin: 0 auto;
  padding: 16px;
  background: rgba(255, 193, 7, 0.1);
  border: 1px solid rgba(255, 193, 7, 0.3);
  border-radius: 8px;
  font-size: 0.9rem;
  color: var(--text-secondary, #7f8c8d);
  text-align: left;
}

.tip-icon {
  flex-shrink: 0;
  color: #ffc107;
  margin-top: 2px;
}

.project-form {
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

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: var(--text-primary, #2c3e50);
}

input, textarea, select {
  width: 100%;
  padding: 12px;
  border: 1px solid var(--border-primary, #ddd);
  border-radius: 8px;
  font-size: 1rem;
  transition: border-color 0.2s ease;
}

input:focus, textarea:focus, select:focus {
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

  .form-row {
    grid-template-columns: 1fr;
  }

  .form-actions {
    flex-direction: column-reverse;
  }

  .checkbox-group {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>