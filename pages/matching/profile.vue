<template>
  <HomeContainer>
    <div class="profile-setup">
      <MatchingBreadcrumbs />

      <div class="setup-header">
        <h1>
          <Icon name="user-circle" class="title-icon" />
          设置个人资料
        </h1>
        <p>介绍一下你自己，获得更好的项目匹配</p>

        <!-- Progress indicator -->
        <div class="setup-progress">
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: `${setupProgress}%` }"></div>
          </div>
          <span class="progress-text">{{ setupProgress }}% 完成</span>
        </div>
      </div>

    <form @submit.prevent="saveProfile" class="profile-form">
      <!-- Bio Section -->
      <div class="form-section">
        <h2>关于你</h2>
        <div class="form-group">
          <label for="bio">个人介绍 *</label>
          <textarea
            id="bio"
            v-model="form.bio"
            placeholder="介绍一下你自己、你的背景、兴趣和热情所在..."
            rows="4"
            required
            maxlength="500"
          />
          <div class="char-count">{{ form.bio?.length || 0 }}/500</div>
        </div>
      </div>

      <!-- Skills Section -->
      <div class="form-section">
        <h2>技能 *</h2>
        <div class="form-group">
          <label>你有哪些技能？</label>
          <SkillSelector
            v-model="form.skills"
            placeholder="添加技能..."
            :suggestions="skillSuggestions"
            :popularTags="popularSkills"
            :showPopularTags="true"
          />
          <p class="help-text">至少添加3个技能以获得更好的匹配</p>
        </div>
      </div>

      <!-- Interests Section -->
      <div class="form-section">
        <h2>兴趣领域</h2>
        <div class="form-group">
          <label>你对什么感兴趣？</label>
          <SkillSelector
            v-model="form.interests"
            placeholder="添加兴趣..."
            :suggestions="interestSuggestions"
            :popularTags="popularInterests"
            :showPopularTags="true"
          />
        </div>
      </div>

      <!-- Research Thrust Section -->
      <div class="form-section">
        <h2>研究方向</h2>
        <div class="form-group">
          <label>选择你的研究方向 (基于HKUST-GZ研究重点)</label>
          <ThrustSelector
            v-model="form.thrust"
            :maxSelections="8"
          />
        </div>
      </div>

      <!-- Experience Level -->
      <div class="form-section">
        <h2>经验水平 *</h2>
        <div class="form-group">
          <div class="radio-group">
            <label class="radio-option">
              <input type="radio" v-model="form.experience_level" value="beginner" />
              <div class="radio-content">
                <strong>初学者</strong>
                <p>对大多数技术都还不熟悉，渴望学习</p>
              </div>
            </label>
            <label class="radio-option">
              <input type="radio" v-model="form.experience_level" value="intermediate" />
              <div class="radio-content">
                <strong>中级</strong>
                <p>有一些经验，对基础概念较为熟悉</p>
              </div>
            </label>
            <label class="radio-option">
              <input type="radio" v-model="form.experience_level" value="advanced" />
              <div class="radio-content">
                <strong>高级</strong>
                <p>经验丰富，能够独立工作</p>
              </div>
            </label>
            <label class="radio-option">
              <input type="radio" v-model="form.experience_level" value="expert" />
              <div class="radio-content">
                <strong>专家</strong>
                <p>专业水平很高，可以指导他人</p>
              </div>
            </label>
          </div>
        </div>
      </div>

      <!-- Preferred Roles -->
      <div class="form-section">
        <h2>偏好角色</h2>
        <div class="form-group">
          <label>你在项目中偏好什么角色？</label>
          <SkillSelector
            v-model="form.preferred_roles"
            placeholder="添加偏好角色..."
            :suggestions="roleSuggestions"
            :popularTags="popularRoles"
            :showPopularTags="true"
          />
        </div>
      </div>

      <!-- Availability -->
      <div class="form-section">
        <h2>可用时间</h2>
        <div class="form-group">
          <label for="availability">你能投入多少时间？</label>
          <select id="availability" v-model="form.availability">
            <option value="">选择可用时间...</option>
            <option value="full-time">全职 (30+小时/周)</option>
            <option value="part-time">兜职 (10-20小时/周)</option>
            <option value="weekends">仅周末</option>
            <option value="flexible">灵活时间</option>
            <option value="minimal">最少时间 (< 5小时/周)</option>
          </select>
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
import SkillSelector from '~/components/matching/SkillSelector.vue'
import ThrustSelector from '~/components/matching/ThrustSelector.vue'
import ContactMethodSelector from '~/components/matching/ContactMethodSelector.vue'
import MatchingBreadcrumbs from '~/components/matching/MatchingBreadcrumbs.vue'

// Composables
const { fetchWithAuth } = useApi()

// Page meta
definePageMeta({
  title: 'Profile Setup',
  requiresAuth: true,
})

// Reactive data
const form = ref({
  bio: '',
  skills: [],
  interests: [],
  thrust: [],
  experience_level: '',
  preferred_roles: [],
  availability: '',
  contact_methods: [],
})


const profile = ref(null)
const saving = ref(false)

// 常用标签 (Popular tags)
const popularSkills = [
  'JavaScript', 'Python', 'React', 'Vue.js', 'HTML/CSS', 'Java',
  'UI/UX设计', '项目管理', '数据科学', '机器学习'
]

const popularInterests = [
  'Web开发', '移动应用', 'AI/ML', 'UI/UX设计', '游戏开发',
  '数据科学', '社会影响', '创业', '开源项目', '创新'
]

const popularRoles = [
  '前端开发', '后端开发', 'UI/UX设计师', '项目经理',
  '全栈开发', '产品经理'
]

// 技能建议列表 (Complete suggestions for autocomplete)
const skillSuggestions = [
  'JavaScript', 'Python', 'React', 'Vue.js', 'Node.js', 'TypeScript',
  'HTML/CSS', 'Java', 'C++', 'Swift', 'Kotlin', 'Flutter', 'React Native',
  '机器学习', '数据科学', 'AI/ML', '深度学习', 'NLP',
  'UI/UX设计', '平面设计', 'Figma', 'Photoshop', 'Illustrator',
  '项目管理', 'Agile', 'Scrum', '领导力', '沟通能力',
  '数据库设计', 'SQL', 'MongoDB', 'PostgreSQL', 'MySQL',
  '云计算', 'AWS', 'Azure', 'Google Cloud', 'DevOps', 'Docker',
  '移动开发', 'Web开发', '后端开发', '前端开发'
]

const interestSuggestions = [
  'Web开发', '移动应用', '游戏开发', 'AI/ML', '区块链',
  'IoT', '机器人', '网络安全', '数据科学', '云计算',
  '社会影响', '教育', '医疗', '金融', '电子商务',
  '可持续发展', '绿色科技', '音乐', '艺术', '摄影',
  '创业', '开源项目', '研究', '创新', '企业家精神'
]

const roleSuggestions = [
  '前端开发', '后端开发', '全栈开发',
  'UI/UX设计师', '产品经理', '项目经理', '团队负责人',
  '数据科学家', '机器学习工程师', 'DevOps工程师',
  '移动开发', 'QA工程师', '商业分析师', '市场营销',
  '内容创作者', '研究员', '导师', '顾问'
]

// Computed properties
const isFormValid = computed(() => {
  return form.value.bio?.trim() &&
         form.value.skills?.length >= 1 &&
         form.value.experience_level
})

const setupProgress = computed(() => {
  let progress = 0
  if (form.value.bio?.trim()) progress += 25
  if (form.value.skills?.length >= 3) progress += 25
  else if (form.value.skills?.length >= 1) progress += 12
  if (form.value.experience_level) progress += 20
  if (form.value.thrust?.length) progress += 10
  if (form.value.preferred_roles?.length) progress += 8
  if (form.value.availability) progress += 5
  if (form.value.contact_methods?.length) progress += 7
  return Math.min(progress, 100)
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
        bio: p.bio || '',
        skills: p.skills || [],
        interests: p.interests || [],
        thrust: p.thrust || [],
        experience_level: p.experience_level || '',
        preferred_roles: p.preferred_roles || [],
        availability: p.availability || '',
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