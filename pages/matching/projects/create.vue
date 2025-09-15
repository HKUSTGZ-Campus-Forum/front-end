<template>
  <HomeContainer>
    <div class="project-create">
      <MatchingBreadcrumbs />

      <div class="create-header">
        <h1>
          <Icon name="plus-circle" class="title-icon" />
          创建项目
        </h1>
        <p>分享你的项目想法，找到合适的队友</p>

        <!-- Creation tip -->
        <div class="creation-tip">
          <Icon name="lightbulb" class="tip-icon" />
          <span>💡 即使只是一个模糊的想法或几个关键词，也可以创建项目。系统会帮你找到合适的队友来完善想法！</span>
        </div>
      </div>

      <form @submit.prevent="createProject" class="project-form">
        <!-- Basic Info Section -->
        <div class="form-section">
          <h2>基本信息</h2>
          <div class="form-group">
            <label for="title">项目标题 *</label>
            <input
              id="title"
              v-model="form.title"
              type="text"
              placeholder="为你的项目起个吸引人的名字..."
              required
              maxlength="100"
            />
          </div>

          <div class="form-group">
            <label for="description">项目描述 *</label>
            <textarea
              id="description"
              v-model="form.description"
              placeholder="详细描述你的项目想法、目标和愿景。即使是模糊的想法或关键词也可以..."
              rows="4"
              required
              maxlength="1000"
            />
            <div class="char-count">{{ form.description?.length || 0 }}/1000</div>
          </div>

          <div class="form-group">
            <label for="goal">项目目标</label>
            <textarea
              id="goal"
              v-model="form.goal"
              placeholder="你希望通过这个项目实现什么？"
              rows="3"
              maxlength="500"
            />
          </div>
        </div>

        <!-- Project Type & Difficulty -->
        <div class="form-section">
          <h2>项目属性</h2>
          <div class="form-row">
            <div class="form-group">
              <label for="project_type">项目类型</label>
              <select id="project_type" v-model="form.project_type">
                <option value="">选择项目类型...</option>
                <option value="web">Web开发</option>
                <option value="mobile">移动应用</option>
                <option value="ai">AI/机器学习</option>
                <option value="game">游戏开发</option>
                <option value="research">研究项目</option>
                <option value="hardware">硬件项目</option>
                <option value="other">其他</option>
              </select>
            </div>

            <div class="form-group">
              <label for="difficulty_level">难度等级</label>
              <select id="difficulty_level" v-model="form.difficulty_level">
                <option value="">选择难度...</option>
                <option value="beginner">初级 - 适合新手</option>
                <option value="intermediate">中级 - 需要一些经验</option>
                <option value="advanced">高级 - 需要丰富经验</option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label for="duration_estimate">预计时长</label>
            <select id="duration_estimate" v-model="form.duration_estimate">
              <option value="">选择预计时长...</option>
              <option value="1-2weeks">1-2周</option>
              <option value="1month">1个月</option>
              <option value="2-3months">2-3个月</option>
              <option value="semester">一学期</option>
              <option value="longterm">长期项目</option>
            </select>
          </div>
        </div>

        <!-- Skills Required -->
        <div class="form-section">
          <h2>技能需求</h2>
          <div class="form-group">
            <label>必需技能</label>
            <SkillSelector
              v-model="form.required_skills"
              placeholder="添加必需的技能..."
              :suggestions="skillSuggestions"
              :popularTags="popularSkills"
              :showPopularTags="true"
            />
          </div>

          <div class="form-group">
            <label>优选技能</label>
            <SkillSelector
              v-model="form.preferred_skills"
              placeholder="添加有了更好的技能..."
              :suggestions="skillSuggestions"
            />
          </div>
        </div>

        <!-- Team Requirements -->
        <div class="form-section">
          <h2>团队需求</h2>
          <div class="form-row">
            <div class="form-group">
              <label for="team_size_min">最少人数</label>
              <input
                id="team_size_min"
                v-model.number="form.team_size_min"
                type="number"
                min="1"
                max="20"
                placeholder="1"
              />
            </div>

            <div class="form-group">
              <label for="team_size_max">最多人数</label>
              <input
                id="team_size_max"
                v-model.number="form.team_size_max"
                type="number"
                min="1"
                max="20"
                placeholder="5"
              />
            </div>
          </div>

          <div class="form-group">
            <label>寻找的角色</label>
            <SkillSelector
              v-model="form.looking_for_roles"
              placeholder="添加需要的团队角色..."
              :suggestions="roleSuggestions"
              :popularTags="popularRoles"
              :showPopularTags="true"
            />
          </div>
        </div>

        <!-- Collaboration Preferences -->
        <div class="form-section">
          <h2>协作方式</h2>
          <div class="form-row">
            <div class="form-group">
              <label for="collaboration_method">协作方式</label>
              <select id="collaboration_method" v-model="form.collaboration_method">
                <option value="">选择协作方式...</option>
                <option value="remote">远程协作</option>
                <option value="in-person">线下见面</option>
                <option value="hybrid">混合方式</option>
              </select>
            </div>

            <div class="form-group">
              <label for="meeting_frequency">会议频率</label>
              <select id="meeting_frequency" v-model="form.meeting_frequency">
                <option value="">选择会议频率...</option>
                <option value="daily">每日</option>
                <option value="weekly">每周</option>
                <option value="biweekly">每两周</option>
                <option value="as-needed">按需要</option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label>沟通工具</label>
            <div class="checkbox-group">
              <label class="checkbox-option">
                <input type="checkbox" v-model="communicationTools.wechat" />
                微信
              </label>
              <label class="checkbox-option">
                <input type="checkbox" v-model="communicationTools.discord" />
                Discord
              </label>
              <label class="checkbox-option">
                <input type="checkbox" v-model="communicationTools.slack" />
                Slack
              </label>
              <label class="checkbox-option">
                <input type="checkbox" v-model="communicationTools.email" />
                邮箱
              </label>
            </div>
          </div>
        </div>

        <!-- Form Actions -->
        <div class="form-actions">
          <button type="button" @click="$router.go(-1)" class="btn btn-secondary">
            取消
          </button>
          <button type="submit" :disabled="!isFormValid || creating" class="btn btn-primary">
            <Icon v-if="creating" name="spinner" class="spinning" />
            创建项目
          </button>
        </div>
      </form>
    </div>
  </HomeContainer>
</template>

<script setup>
import { ref, computed } from 'vue'
import SkillSelector from '~/components/matching/SkillSelector.vue'
import MatchingBreadcrumbs from '~/components/matching/MatchingBreadcrumbs.vue'

// Composables
const { fetchWithAuth } = useApi()

// Page meta
definePageMeta({
  title: 'Create Project',
  requiresAuth: true,
})

// Reactive data
const form = ref({
  title: '',
  description: '',
  goal: '',
  project_type: '',
  difficulty_level: '',
  duration_estimate: '',
  required_skills: [],
  preferred_skills: [],
  team_size_min: 1,
  team_size_max: 5,
  looking_for_roles: [],
  collaboration_method: '',
  meeting_frequency: '',
})

const communicationTools = ref({
  wechat: false,
  discord: false,
  slack: false,
  email: true,
})

const creating = ref(false)

// Popular suggestions
const popularSkills = [
  'JavaScript', 'Python', 'React', 'Vue.js', 'HTML/CSS', 'Java',
  'UI/UX设计', '项目管理', '数据科学', '机器学习'
]

const skillSuggestions = [
  'JavaScript', 'Python', 'React', 'Vue.js', 'Node.js', 'TypeScript',
  'HTML/CSS', 'Java', 'C++', 'Swift', 'Kotlin', 'Flutter', 'React Native',
  '机器学习', '数据科学', 'AI/ML', '深度学习', 'NLP',
  'UI/UX设计', '平面设计', 'Figma', 'Photoshop', 'Illustrator',
  '项目管理', 'Agile', 'Scrum', '领导力', '沟通能力',
  '数据库设计', 'SQL', 'MongoDB', 'PostgreSQL', 'MySQL',
  '云计算', 'AWS', 'Azure', 'Google Cloud', 'DevOps', 'Docker'
]

const popularRoles = [
  '前端开发', '后端开发', 'UI/UX设计师', '项目经理',
  '全栈开发', '产品经理'
]

const roleSuggestions = [
  '前端开发', '后端开发', '全栈开发',
  'UI/UX设计师', '产品经理', '项目经理', '团队负责人',
  '数据科学家', '机器学习工程师', 'DevOps工程师',
  '移动开发', 'QA工程师', '商业分析师', '市场营销',
  '内容创作者', '研究员', '导师'
]

// Computed properties
const isFormValid = computed(() => {
  return form.value.title?.trim() &&
         form.value.description?.trim() &&
         form.value.team_size_min <= form.value.team_size_max
})

// Methods
const createProject = async () => {
  if (!isFormValid.value || creating.value) return

  creating.value = true

  try {
    // Prepare communication tools array
    const selectedTools = Object.keys(communicationTools.value)
      .filter(tool => communicationTools.value[tool])

    const payload = {
      ...form.value,
      communication_tools: selectedTools,
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
    console.error('Error creating project:', error)
    alert('Failed to create project. Please try again.')
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