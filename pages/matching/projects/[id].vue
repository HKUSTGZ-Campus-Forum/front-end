<template>
  <HomeContainer>
    <div class="project-detail">
      <MatchingBreadcrumbs />

      <!-- Loading State -->
      <div v-if="loading" class="loading-state">
        <Icon name="spinner" class="spinning" />
        <p>正在加载项目...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="error-state">
        <Icon name="alert-circle" class="error-icon" />
        <h2>项目未找到</h2>
        <p>{{ error }}</p>
        <div class="error-actions">
          <NuxtLink to="/matching/discover" class="btn btn-primary">
            返回项目列表
          </NuxtLink>
          <button @click="loadProject" class="btn btn-outline">
            重试
          </button>
        </div>
      </div>

      <!-- Project Content -->
      <div v-else-if="project" class="project-content">
        <!-- Project Header -->
        <div class="project-header">
          <div class="header-main">
            <h1 class="project-title">{{ project.title }}</h1>
            <div class="project-meta">
              <span :class="['status-badge', `status-${project.status}`]">
                {{ formatStatus(project.status) }}
              </span>
              <span v-if="project.project_type" class="project-type">
                {{ formatProjectType(project.project_type) }}
              </span>
              <span v-if="project.difficulty_level" class="difficulty-badge" :class="`difficulty-${project.difficulty_level}`">
                {{ project.difficulty_level }}
              </span>
            </div>
          </div>

          <div class="header-stats">
            <div class="stat-item">
              <Icon name="users" />
              {{ project.current_team_size || 0 }}/{{ project.team_size_max }}
            </div>
            <div class="stat-item">
              <Icon name="eye" />
              {{ project.view_count || 0 }}
            </div>
            <div class="stat-item">
              <Icon name="heart" />
              {{ project.interest_count || 0 }}
            </div>
          </div>
        </div>

        <!-- Project Creator -->
        <div v-if="project.creator" class="project-creator">
          <UserAvatar
            :avatar-url="project.creator.avatar_url"
            :username="project.creator.username"
            :user-id="project.creator.id"
            size="md"
            :clickable="true"
            @click="viewCreatorProfile"
          />
          <div class="creator-info">
            <div class="creator-name" @click="viewCreatorProfile">{{ project.creator.username }}</div>
            <div class="creator-role">项目创建者</div>
          </div>
          <div class="created-date">
            创建于 {{ formatDate(project.created_at) }}
          </div>
          <button @click="viewCreatorProfile" class="view-profile-btn">
            <Icon name="user" />
            查看档案
          </button>
        </div>

        <!-- Project Description -->
        <div class="project-section">
          <h2>Project Description</h2>
          <div class="description-content">
            <p>{{ project.description }}</p>
          </div>
        </div>

        <!-- Project Goal -->
        <div v-if="project.goal" class="project-section">
          <h2>Project Goal</h2>
          <div class="goal-content">
            <p>{{ project.goal }}</p>
          </div>
        </div>

        <!-- Skills Required -->
        <div v-if="project.required_skills?.length || project.preferred_skills?.length" class="project-section">
          <h2>Skills</h2>

          <div v-if="project.required_skills?.length" class="skills-group">
            <h3>Required Skills</h3>
            <div class="skills-list">
              <span
                v-for="skill in project.required_skills"
                :key="skill"
                class="skill-tag required"
              >
                {{ skill }}
              </span>
            </div>
          </div>

          <div v-if="project.preferred_skills?.length" class="skills-group">
            <h3>Preferred Skills</h3>
            <div class="skills-list">
              <span
                v-for="skill in project.preferred_skills"
                :key="skill"
                class="skill-tag preferred"
              >
                {{ skill }}
              </span>
            </div>
          </div>
        </div>

        <!-- Looking For -->
        <div v-if="project.looking_for_roles?.length" class="project-section">
          <h2>Looking For</h2>
          <div class="roles-list">
            <span
              v-for="role in project.looking_for_roles"
              :key="role"
              class="role-tag"
            >
              {{ role }}
            </span>
          </div>
        </div>

        <!-- Project Details -->
        <div class="project-section">
          <h2>Project Details</h2>
          <div class="details-grid">
            <div v-if="project.duration_estimate" class="detail-item">
              <strong>Duration:</strong>
              <span>{{ formatDuration(project.duration_estimate) }}</span>
            </div>
            <div class="detail-item">
              <strong>Team Size:</strong>
              <span>{{ project.team_size_min }}-{{ project.team_size_max }} members</span>
            </div>
            <div v-if="project.collaboration_method" class="detail-item">
              <strong>Collaboration:</strong>
              <span>{{ formatCollaboration(project.collaboration_method) }}</span>
            </div>
            <div v-if="project.meeting_frequency" class="detail-item">
              <strong>Meetings:</strong>
              <span>{{ formatMeetingFreq(project.meeting_frequency) }}</span>
            </div>
          </div>
        </div>

        <!-- Communication Tools -->
        <div v-if="project.communication_tools?.length" class="project-section">
          <h2>Communication Tools</h2>
          <div class="tools-list">
            <span
              v-for="tool in project.communication_tools"
              :key="tool"
              class="tool-tag"
            >
              {{ formatTool(tool) }}
            </span>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="project-actions">
          <!-- Contact Creator Button (for non-creators) -->
          <button
            v-if="!isCreator && project.status === 'recruiting'"
            @click="contactCreator"
            class="btn btn-primary btn-lg"
          >
            <Icon name="message-circle" />
            Contact Creator
          </button>

          <!-- Creator Actions -->
          <template v-if="isCreator">
            <NuxtLink :to="`/matching/projects/edit/${project.id}`" class="btn btn-outline">
              编辑项目
            </NuxtLink>

            <button
              v-if="project.status === 'recruiting'"
              @click="updateProjectStatus('active')"
              class="btn btn-secondary"
            >
              开始项目
            </button>

            <button
              v-else-if="project.status === 'active'"
              @click="updateProjectStatus('completed')"
              class="btn btn-success"
            >
              标记完成
            </button>
          </template>

          <!-- Back Button -->
          <NuxtLink to="/matching/discover" class="btn btn-outline">
            Back to Projects
          </NuxtLink>
        </div>
      </div>
    </div>


  </HomeContainer>

  <!-- User Profile Modal (teleported to body) -->
  <Teleport to="body">
    <UserProfileModal
      :is-open="showProfileModal"
      :user-id="selectedUserId"
      @close="showProfileModal = false"
      @contact="handleContactUser"
    />
  </Teleport>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import MatchingBreadcrumbs from '~/components/matching/MatchingBreadcrumbs.vue'
import UserProfileModal from '~/components/matching/UserProfileModal.vue'
import UserAvatar from '~/components/user/UserAvatar.vue'

// Composables
const { fetchWithAuth, fetchPublic } = useApi()
const route = useRoute()
const { user } = useAuth()

// Page meta
definePageMeta({
  title: 'Project Detail',
})

// Reactive data
const project = ref(null)
const loading = ref(true)
const error = ref('')
const showProfileModal = ref(false)
const selectedUserId = ref(null)

// Computed
const projectId = computed(() => route.params.id)
const isCreator = computed(() => {
  return user.value && project.value && user.value.id === project.value.user_id
})

// Methods
const loadProject = async () => {
  loading.value = true
  error.value = ''

  try {
    console.log('🔄 Loading project ID:', projectId.value)
    const rawResponse = await fetchPublic(`/api/projects/${projectId.value}`)
    const response = await rawResponse.json()

    console.log('📡 Project API response:', {
      success: response.success,
      hasProject: !!response.project,
      projectId: response.project?.id,
      projectTitle: response.project?.title,
      message: response.message
    })

    if (response.success) {
      project.value = response.project

      // Check if current user has applied
      if (user.value) {
        await checkApplicationStatus()
      }
    } else {
      error.value = response.message || 'Project not found'
      console.error('❌ Project loading failed:', response.message)
    }
  } catch (err) {
    console.error('💥 Error loading project:', {
      error: err,
      projectId: projectId.value,
      url: `/api/projects/${projectId.value}`,
      message: err.message
    })
    error.value = 'Failed to load project'
  } finally {
    loading.value = false
  }
}

const checkApplicationStatus = async () => {
  if (!user.value || !project.value) return

  try {
    const rawResponse = await fetchWithAuth(`/api/matching/applications/check?project_id=${project.value.id}`)
    const response = await rawResponse.json()
    hasApplied.value = response.has_applied || false
  } catch (err) {
    console.error('Error checking application status:', err)
  }
}

const updateProjectStatus = async (newStatus) => {
  try {
    const rawResponse = await fetchWithAuth(`/api/projects/${project.value.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status: newStatus })
    })

    const response = await rawResponse.json()

    if (response.success) {
      project.value.status = newStatus
      // Status change is visually reflected immediately, no alert needed
    } else {
      console.error('❌ Project status update failed:', response.message)
    }
  } catch (err) {
    console.error('💥 Error updating project status:', err)
  }
}

const contactCreator = () => {
  // Show creator profile modal directly (no confirmation dialog)
  if (project.value?.creator?.id) {
    selectedUserId.value = project.value.creator.id
    showProfileModal.value = true
  }
}

const viewCreatorProfile = () => {
  if (project.value?.creator?.id) {
    selectedUserId.value = project.value.creator.id
    showProfileModal.value = true
  }
}

const handleContactUser = (contactInfo) => {
  console.log('Contact user:', contactInfo)

  // Format contact methods for display
  const contactMethods = contactInfo.contactMethods || []

  if (contactMethods.length === 0) {
    console.log('该用户未提供联系方式')
    return
  }

  // Log contact info to console instead of showing alert
  console.log('📞 联系方式:', contactMethods)

  // The modal will stay open so users can see the contact info
  // showProfileModal.value = false
}

// Formatting helpers
const formatStatus = (status) => {
  const statusMap = {
    recruiting: 'Recruiting',
    active: 'Active',
    completed: 'Completed',
    cancelled: 'Cancelled'
  }
  return statusMap[status] || status
}

const formatProjectType = (type) => {
  const types = {
    'web': 'Web Development',
    'mobile': 'Mobile App',
    'ai': 'AI/ML',
    'game': 'Game Development',
    'research': 'Research',
    'hardware': 'Hardware',
    'other': 'Other'
  }
  return types[type] || type
}

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString()
}

const formatDuration = (duration) => {
  const durations = {
    '1-2weeks': '1-2 weeks',
    '1month': '1 month',
    '2-3months': '2-3 months',
    'semester': 'One semester',
    'longterm': 'Long term'
  }
  return durations[duration] || duration
}

const formatCollaboration = (method) => {
  const methods = {
    'remote': 'Remote',
    'in-person': 'In Person',
    'hybrid': 'Hybrid'
  }
  return methods[method] || method
}

const formatMeetingFreq = (freq) => {
  const frequencies = {
    'daily': 'Daily',
    'weekly': 'Weekly',
    'biweekly': 'Bi-weekly',
    'as-needed': 'As needed'
  }
  return frequencies[freq] || freq
}

const formatTool = (tool) => {
  const tools = {
    'wechat': 'WeChat',
    'discord': 'Discord',
    'slack': 'Slack',
    'email': 'Email'
  }
  return tools[tool] || tool
}

// Lifecycle
onMounted(async () => {
  await loadProject()
})
</script>

<style scoped>
.project-detail {
  max-width: 1000px;
  margin: 0 auto;
  padding: 20px;
}

.loading-state, .error-state {
  text-align: center;
  padding: 60px 20px;
}

.error-icon {
  font-size: 3rem;
  color: #e74c3c;
  margin-bottom: 16px;
}

.error-state h2 {
  color: var(--text-primary, #2c3e50);
  margin-bottom: 16px;
}

.error-actions {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-top: 20px;
}

.project-content {
  background: var(--surface-primary, white);
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.08);
  overflow: hidden;
}

.project-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 30px;
  border-bottom: 1px solid #e9ecef;
}

.project-title {
  font-size: 2rem;
  font-weight: 600;
  color: var(--text-primary, #2c3e50);
  margin: 0 0 12px 0;
}

.project-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.status-badge {
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
}

.status-recruiting { background: #d4edda; color: #155724; }
.status-active { background: #cce5ff; color: #0056b3; }
.status-completed { background: #e2e3e5; color: #6c757d; }

.project-type, .tool-tag {
  background: #ecf0f1;
  color: #7f8c8d;
  padding: 6px 12px;
  border-radius: 12px;
  font-size: 0.8rem;
}

.difficulty-badge {
  padding: 6px 12px;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 500;
  text-transform: capitalize;
}

.difficulty-beginner { background: #d5f4e6; color: #27ae60; }
.difficulty-intermediate { background: #fef9e7; color: #f39c12; }
.difficulty-advanced { background: #fadbd8; color: #e74c3c; }

.header-stats {
  display: flex;
  gap: 20px;
  color: var(--text-secondary, #7f8c8d);
  font-size: 0.9rem;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.project-creator {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px 30px;
  background: #f8f9fa;
  border-bottom: 1px solid #e9ecef;
}


.creator-info {
  flex: 1;
}

.creator-name {
  font-weight: 600;
  color: var(--text-primary, #2c3e50);
  cursor: pointer;
  transition: color 0.2s ease;
}

.creator-name:hover {
  color: var(--accent-primary, #3498db);
}

.creator-role {
  font-size: 0.9rem;
  color: var(--text-secondary, #7f8c8d);
}

.view-profile-btn {
  background: var(--accent-primary, #3498db);
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: background 0.2s ease;
}

.view-profile-btn:hover {
  background: var(--accent-secondary, #2980b9);
}

.created-date {
  font-size: 0.9rem;
  color: var(--text-secondary, #7f8c8d);
}

.project-section {
  padding: 30px;
  border-bottom: 1px solid #f0f0f0;
}

.project-section:last-child {
  border-bottom: none;
}

.project-section h2 {
  font-size: 1.3rem;
  font-weight: 600;
  color: var(--text-primary, #2c3e50);
  margin: 0 0 20px 0;
}

.description-content, .goal-content {
  line-height: 1.6;
  color: var(--text-secondary, #7f8c8d);
}

.skills-group {
  margin-bottom: 20px;
}

.skills-group:last-child {
  margin-bottom: 0;
}

.skills-group h3 {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary, #2c3e50);
  margin: 0 0 12px 0;
}

.skills-list, .roles-list, .tools-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.skill-tag {
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 0.9rem;
  font-weight: 500;
}

.skill-tag.required {
  background: #e3f2fd;
  color: #1976d2;
}

.skill-tag.preferred {
  background: #f3e5f5;
  color: #7b1fa2;
}

.role-tag {
  background: #fff3e0;
  color: #f57c00;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 0.9rem;
  font-weight: 500;
}

.details-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 16px;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.detail-item strong {
  color: var(--text-primary, #2c3e50);
  font-size: 0.9rem;
}

.detail-item span {
  color: var(--text-secondary, #7f8c8d);
}

.project-actions {
  padding: 30px;
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
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
  background: #3498db;
  color: white;
  border-color: #3498db;
}

.btn-primary:hover:not(:disabled) {
  background: #2980b9;
}

.btn-secondary {
  background: #f39c12;
  color: white;
  border-color: #f39c12;
}

.btn-success {
  background: #27ae60;
  color: white;
  border-color: #27ae60;
}

.btn-outline {
  background: transparent;
  color: var(--text-secondary, #7f8c8d);
  border-color: #bdc3c7;
}

.btn-outline:hover {
  background: #ecf0f1;
}

.btn-lg {
  padding: 16px 32px;
  font-size: 1.1rem;
}

.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@media (max-width: 768px) {
  .project-header {
    flex-direction: column;
    gap: 16px;
  }

  .header-stats {
    justify-content: flex-start;
  }

  .project-creator {
    flex-wrap: wrap;
    gap: 12px;
  }

  .details-grid {
    grid-template-columns: 1fr;
  }

  .project-actions {
    flex-direction: column;
  }
}
</style>