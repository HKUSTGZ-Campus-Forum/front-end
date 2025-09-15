<template>
  <div v-if="isOpen" class="modal-overlay" @click="closeModal">
    <div class="modal-content" @click.stop>
      <!-- Modal Header -->
      <div class="modal-header">
        <h2>用户档案</h2>
        <button @click="closeModal" class="close-btn">
          <Icon name="x" />
        </button>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="loading-state">
        <Icon name="spinner" class="spinning" />
        <p>正在加载用户档案...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="error-state">
        <Icon name="alert-circle" class="error-icon" />
        <p>{{ error }}</p>
        <button @click="loadProfile" class="btn btn-primary">重试</button>
      </div>

      <!-- Profile Content -->
      <div v-else-if="profile" class="profile-content">
        <!-- User Header -->
        <div class="user-header">
          <UserAvatar
            :avatar-url="profile.user?.avatar_url"
            :username="profile.user?.username"
            :user-id="profile.user?.id"
            size="lg"
            :clickable="false"
          />
          <div class="user-info">
            <h3 class="username">{{ profile.user?.username }}</h3>
            <div class="user-meta">
              <span v-if="profile.experience_level" class="experience-badge" :class="`exp-${profile.experience_level}`">
                {{ formatExperience(profile.experience_level) }}
              </span>
              <span v-if="profile.availability" class="availability-badge">
                {{ formatAvailability(profile.availability) }}
              </span>
            </div>
          </div>
        </div>

        <!-- Bio Section -->
        <div v-if="profile.bio" class="profile-section">
          <h4>个人简介</h4>
          <p class="bio-text">{{ profile.bio }}</p>
        </div>

        <!-- Thrust Section -->
        <div v-if="profile.thrust?.length" class="profile-section">
          <h4>研究方向</h4>
          <div class="tags-list">
            <span
              v-for="thrust in profile.thrust"
              :key="thrust"
              class="tag thrust-tag"
            >
              {{ thrust }}
            </span>
          </div>
        </div>

        <!-- Skills Section -->
        <div v-if="profile.skills?.length" class="profile-section">
          <h4>技能</h4>
          <div class="tags-list">
            <span
              v-for="skill in profile.skills"
              :key="skill"
              class="tag skill-tag"
            >
              {{ skill }}
            </span>
          </div>
        </div>

        <!-- Interests Section -->
        <div v-if="profile.interests?.length" class="profile-section">
          <h4>兴趣领域</h4>
          <div class="tags-list">
            <span
              v-for="interest in profile.interests"
              :key="interest"
              class="tag interest-tag"
            >
              {{ interest }}
            </span>
          </div>
        </div>

        <!-- Preferred Roles Section -->
        <div v-if="profile.preferred_roles?.length" class="profile-section">
          <h4>偏好角色</h4>
          <div class="tags-list">
            <span
              v-for="role in profile.preferred_roles"
              :key="role"
              class="tag role-tag"
            >
              {{ role }}
            </span>
          </div>
        </div>

        <!-- Contact Information -->
        <div v-if="profile.contact_methods?.length || contactVisibilityNote" class="profile-section">
          <h4>联系方式</h4>

          <!-- Contact visibility note -->
          <div v-if="contactVisibilityNote" class="contact-note">
            <Icon name="info" class="note-icon" />
            <p>{{ contactVisibilityNote }}</p>
          </div>

          <!-- Contact information (always visible in simplified system) -->
          <div v-if="profile.contact_methods?.length" class="contact-list">
            <div
              v-for="contact in profile.contact_methods"
              :key="contact.method"
              class="contact-item"
            >
              <Icon :name="getContactIcon(contact.method)" />
              <span class="contact-method">{{ formatContactMethod(contact.method) }}</span>
              <span class="contact-value">{{ contact.value }}</span>
            </div>
          </div>
        </div>

        <!-- Stats Section -->
        <div class="profile-section stats-section">
          <h4>档案统计</h4>
          <div class="stats-grid">
            <div class="stat-item">
              <span class="stat-value">{{ profile.created_at ? formatJoinDate(profile.created_at) : '-' }}</span>
              <span class="stat-label">加入时间</span>
            </div>
            <div class="stat-item">
              <span class="stat-value">{{ getCompletionPercentage(profile) }}%</span>
              <span class="stat-label">档案完整度</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Modal Footer -->
      <div class="modal-footer">
        <button @click="closeModal" class="btn btn-outline">关闭</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import UserAvatar from '~/components/user/UserAvatar.vue'

// Props
const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  },
  userId: {
    type: Number,
    required: true
  }
})

// Emits
const emit = defineEmits(['close', 'contact'])

// Composables
const { fetchPublic, fetchWithAuth } = useApi()
const { user: currentUser } = useAuth()

// State
const profile = ref(null)
const loading = ref(false)
const error = ref('')

// Computed

const canSeeContactInfo = computed(() => {
  // In the simplified matching system, contact info is always public
  return true
})

const contactVisibilityNote = computed(() => {
  // In simplified system, show a note that contact info is public
  if (!profile.value || !currentUser.value) return ''

  // Don't show note for own profile
  if (profile.value.user_id === currentUser.value.id) return ''

  return '联系方式已公开，您可以直接联系此用户'
})

// Methods
const closeModal = () => {
  emit('close')
}

// Contact visibility check removed - contact info is always public in simplified system

const loadProfile = async () => {
  if (!props.userId) return

  loading.value = true
  error.value = ''

  try {
    console.log('🔄 Loading user profile for ID:', props.userId)

    // Load profile (contact info is always visible in simplified system)
    let rawResponse
    try {
      rawResponse = await fetchPublic(`/api/profiles/user/${props.userId}`)
    } catch (publicError) {
      console.log('📡 Public endpoint failed, trying authenticated:', publicError)
      rawResponse = await fetchWithAuth(`/api/profiles/user/${props.userId}`)
    }

    const profileResponse = await rawResponse.json()

    console.log('📡 Profile API response:', {
      success: profileResponse.success,
      hasProfile: !!profileResponse.profile,
      message: profileResponse.message
    })

    if (profileResponse.success) {
      profile.value = profileResponse.profile
    } else {
      error.value = profileResponse.message || '无法加载用户档案'
    }
  } catch (err) {
    console.error('💥 Error loading profile:', {
      error: err,
      userId: props.userId,
      message: err.message
    })
    error.value = '加载档案时发生错误'
  } finally {
    loading.value = false
  }
}


// Formatting helpers
const formatExperience = (level) => {
  const levels = {
    beginner: '初学者',
    intermediate: '中级',
    advanced: '高级',
    expert: '专家'
  }
  return levels[level] || level
}

const formatAvailability = (availability) => {
  const availabilities = {
    'full-time': '全职可用',
    'part-time': '兼职可用',
    'weekends': '周末可用',
    'flexible': '灵活时间'
  }
  return availabilities[availability] || availability
}

const formatContactMethod = (method) => {
  const methods = {
    email: '邮箱',
    wechat: '微信',
    qq: 'QQ',
    phone: '电话',
    telegram: 'Telegram',
    discord: 'Discord'
  }
  return methods[method] || method
}

const getContactIcon = (method) => {
  const icons = {
    email: 'mail',
    wechat: 'message-square',
    qq: 'message-square',
    phone: 'phone',
    telegram: 'send',
    discord: 'message-circle'
  }
  return icons[method] || 'message-circle'
}

const formatJoinDate = (dateString) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-CN')
}

const getCompletionPercentage = (profile) => {
  if (!profile) return 0

  let total = 0
  let completed = 0

  // Required fields
  total += 4
  if (profile.bio) completed++
  if (profile.skills?.length) completed++
  if (profile.experience_level) completed++
  if (profile.interests?.length) completed++

  // Optional fields
  total += 4
  if (profile.thrust?.length) completed++
  if (profile.preferred_roles?.length) completed++
  if (profile.contact_methods?.length) completed++
  if (profile.availability) completed++

  return Math.round((completed / total) * 100)
}

// Watch for modal open/close
watch(() => props.isOpen, (newVal) => {
  if (newVal && props.userId) {
    loadProfile()
  } else {
    profile.value = null
    error.value = ''
  }
})
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal-content {
  background: var(--surface-primary, white);
  border-radius: 16px;
  max-width: 600px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 30px;
  border-bottom: 1px solid var(--border-primary, #e9ecef);
}

.modal-header h2 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--text-primary, #2c3e50);
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: var(--text-secondary, #7f8c8d);
  padding: 8px;
  border-radius: 8px;
  transition: all 0.2s ease;
}

.close-btn:hover {
  background: var(--surface-secondary, #f8f9fa);
  color: var(--text-primary, #2c3e50);
}

.loading-state, .error-state {
  text-align: center;
  padding: 60px 30px;
}

.error-icon {
  font-size: 3rem;
  color: #e74c3c;
  margin-bottom: 16px;
}

.profile-content {
  padding: 0 30px 20px;
}

.user-header {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 20px 0;
  border-bottom: 1px solid var(--border-primary, #f0f0f0);
  margin-bottom: 30px;
}


.user-info {
  flex: 1;
}

.username {
  margin: 0 0 8px 0;
  font-size: 1.3rem;
  font-weight: 600;
  color: var(--text-primary, #2c3e50);
}

.user-meta {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.experience-badge, .availability-badge {
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 500;
}

.experience-badge {
  background: #e3f2fd;
  color: #1976d2;
}

.exp-beginner { background: #d5f4e6; color: #27ae60; }
.exp-intermediate { background: #fef9e7; color: #f39c12; }
.exp-advanced { background: #fadbd8; color: #e74c3c; }
.exp-expert { background: #e8e8ff; color: #6633cc; }

.availability-badge {
  background: #f3e5f5;
  color: #7b1fa2;
}

.profile-section {
  margin-bottom: 30px;
}

.profile-section h4 {
  margin: 0 0 12px 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-primary, #2c3e50);
}

.bio-text {
  line-height: 1.6;
  color: var(--text-secondary, #7f8c8d);
  margin: 0;
}

.tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag {
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 0.9rem;
  font-weight: 500;
}

.thrust-tag {
  background: #fff3e0;
  color: #f57c00;
}

.skill-tag {
  background: #e3f2fd;
  color: #1976d2;
}

.interest-tag {
  background: #f3e5f5;
  color: #7b1fa2;
}

.role-tag {
  background: #e8f5e8;
  color: #2e7d32;
}

.contact-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.contact-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: var(--surface-secondary, #f8f9fa);
  border-radius: 8px;
}

.contact-method {
  font-weight: 500;
  color: var(--text-primary, #2c3e50);
  min-width: 60px;
}

.contact-value {
  color: var(--text-secondary, #7f8c8d);
  font-family: monospace;
}

.contact-note {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  background: var(--surface-tertiary, #f1f3f4);
  border: 1px solid var(--border-secondary, #ddd);
  border-radius: 8px;
  margin-bottom: 16px;
}

.note-icon {
  color: var(--accent-primary, #3498db);
  margin-top: 2px;
  flex-shrink: 0;
}

.contact-note p {
  margin: 0;
  color: var(--text-secondary, #7f8c8d);
  font-size: 0.9rem;
  line-height: 1.4;
}

.contact-hidden {
  opacity: 0.6;
}

.contact-hidden .contact-value {
  color: var(--text-tertiary, #bbb);
  font-weight: bold;
}

.stats-section {
  border-top: 1px solid var(--border-primary, #f0f0f0);
  padding-top: 20px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 20px;
}

.stat-item {
  text-align: center;
  padding: 16px;
  background: var(--surface-secondary, #f8f9fa);
  border-radius: 8px;
}

.stat-value {
  display: block;
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--accent-primary, #3498db);
  margin-bottom: 4px;
}

.stat-label {
  font-size: 0.9rem;
  color: var(--text-secondary, #7f8c8d);
}

.modal-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 30px;
  border-top: 1px solid var(--border-primary, #e9ecef);
  background: var(--surface-secondary, #f8f9fa);
  border-radius: 0 0 16px 16px;
}

.btn {
  padding: 10px 20px;
  border-radius: 8px;
  font-weight: 500;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: 1px solid transparent;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s ease;
}

.btn-primary {
  background: var(--accent-primary, #3498db);
  color: white;
  border-color: var(--accent-primary, #3498db);
}

.btn-primary:hover {
  background: var(--accent-secondary, #2980b9);
}

.btn-outline {
  background: transparent;
  color: var(--text-secondary, #7f8c8d);
  border-color: var(--border-primary, #bdc3c7);
}

.btn-outline:hover {
  background: var(--surface-secondary, #ecf0f1);
}

.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@media (max-width: 768px) {
  .modal-content {
    margin: 10px;
    max-height: 95vh;
  }

  .modal-header, .profile-content, .modal-footer {
    padding-left: 20px;
    padding-right: 20px;
  }

  .user-header {
    flex-direction: column;
    text-align: center;
    gap: 16px;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }

  .modal-footer {
    flex-direction: column;
    gap: 12px;
  }
}
</style>