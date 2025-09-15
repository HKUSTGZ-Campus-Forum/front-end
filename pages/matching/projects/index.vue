<template>
  <HomeContainer>
    <div class="projects-page">
      <MatchingBreadcrumbs />

      <div class="page-header">
        <h1>
          <Icon name="briefcase" class="title-icon" />
          我的项目
        </h1>
        <p>管理你创建的项目和团队成员</p>

        <NuxtLink to="/matching/projects/create" class="btn btn-primary">
          <Icon name="plus" />
          创建新项目
        </NuxtLink>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="loading-state">
        <Icon name="spinner" class="spinning" />
        <p>Loading projects...</p>
      </div>

      <!-- Empty State -->
      <div v-else-if="!projects.length" class="empty-state">
        <Icon name="briefcase" class="empty-icon" />
        <h3>No projects yet</h3>
        <p>Create your first project to find teammates and bring your ideas to life.</p>
        <NuxtLink to="/matching/projects/create" class="btn btn-primary">
          <Icon name="plus" />
          创建项目
        </NuxtLink>
      </div>

      <!-- Projects List -->
      <div v-else class="projects-list">
        <div
          v-for="project in projects"
          :key="project.id"
          class="project-card"
        >
          <!-- Project Header -->
          <div class="project-header">
            <div class="project-info">
              <h3 class="project-title">{{ project.title }}</h3>
              <div class="project-meta">
                <span :class="['status-badge', `status-${project.status}`]">
                  {{ formatStatus(project.status) }}
                </span>
                <span class="project-type" v-if="project.project_type">
                  {{ formatProjectType(project.project_type) }}
                </span>
                <span class="difficulty-badge" :class="`difficulty-${project.difficulty_level}`">
                  {{ project.difficulty_level }}
                </span>
              </div>
            </div>
            <div class="project-stats">
              <div class="stat-item">
                <Icon name="users" />
                {{ project.current_team_size }}/{{ project.team_size_max }}
              </div>
              <div class="stat-item">
                <Icon name="eye" />
                {{ project.view_count }}
              </div>
              <div class="stat-item">
                <Icon name="heart" />
                {{ project.interest_count }}
              </div>
            </div>
          </div>

          <!-- Project Content -->
          <div class="project-content">
            <p class="project-description">
              {{ truncateText(project.description, 150) }}
            </p>

            <div v-if="project.required_skills?.length" class="skills-section">
              <strong>Required Skills:</strong>
              <div class="skills-list">
                <span
                  v-for="skill in project.required_skills.slice(0, 4)"
                  :key="skill"
                  class="skill-tag"
                >
                  {{ skill }}
                </span>
                <span v-if="project.required_skills.length > 4" class="more-skills">
                  +{{ project.required_skills.length - 4 }}
                </span>
              </div>
            </div>

            <div class="project-timeline">
              <small>Created {{ formatDate(project.created_at) }}</small>
            </div>
          </div>

          <!-- Pending Applications -->
          <div v-if="project.pending_applications?.length" class="pending-section">
            <h4>Pending Applications ({{ project.pending_applications.length }})</h4>
            <div class="applications-preview">
              <div
                v-for="application in project.pending_applications.slice(0, 3)"
                :key="application.id"
                class="application-preview"
              >
                <UserAvatar
                  :avatar-url="application.user?.avatar_url"
                  :username="application.user?.username"
                  :user-id="application.user?.id"
                  size="sm"
                  :clickable="true"
                />
                <div class="applicant-info">
                  <div class="applicant-name">{{ application.user?.username }}</div>
                  <div v-if="application.match_score" class="match-score">
                    {{ Math.round(application.match_score * 100) }}% match
                  </div>
                </div>
                <div class="application-actions">
                  <button
                    @click="handleApplication(application.id, 'accept')"
                    class="btn btn-success btn-xs"
                    :disabled="processingApplication"
                  >
                    Accept
                  </button>
                  <button
                    @click="handleApplication(application.id, 'reject')"
                    class="btn btn-outline btn-xs"
                    :disabled="processingApplication"
                  >
                    Reject
                  </button>
                </div>
              </div>

              <div v-if="project.pending_applications.length > 3" class="more-applications">
                <button @click="viewAllApplications(project.id)" class="btn btn-link">
                  View all {{ project.pending_applications.length }} applications
                </button>
              </div>
            </div>
          </div>

          <!-- Project Actions -->
          <div class="project-actions">
            <NuxtLink
              :to="`/matching/projects/${project.id}`"
              class="btn btn-outline"
            >
              View Details
            </NuxtLink>

            <button
              v-if="project.status === 'recruiting'"
              @click="toggleRecruitment(project.id, false)"
              class="btn btn-secondary"
            >
              Stop Recruiting
            </button>

            <button
              v-else-if="project.status === 'active'"
              @click="toggleRecruitment(project.id, true)"
              class="btn btn-primary"
            >
              Resume Recruiting
            </button>

            <NuxtLink
              :to="`/matching/projects/${project.id}/edit`"
              class="btn btn-outline"
            >
              Edit
            </NuxtLink>
          </div>
        </div>
      </div>

      <!-- Load More -->
      <div v-if="hasMore" class="load-more">
        <button @click="loadMore" :disabled="loadingMore" class="btn btn-outline">
          <Icon v-if="loadingMore" name="spinner" class="spinning" />
          Load More
        </button>
      </div>
    </div>
  </HomeContainer>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import MatchingBreadcrumbs from '~/components/matching/MatchingBreadcrumbs.vue'

// Composables
const { fetchWithAuth } = useApi()

// Page meta
definePageMeta({
  title: 'My Projects',
  requiresAuth: true,
})

// Reactive data
const projects = ref([])
const loading = ref(true)
const loadingMore = ref(false)
const processingApplication = ref(false)
const currentPage = ref(1)
const hasMore = ref(false)

// Methods
const loadProjects = async (resetPage = true) => {
  if (resetPage) {
    currentPage.value = 1
    projects.value = []
  }

  loading.value = resetPage
  loadingMore.value = !resetPage

  try {
    const params = new URLSearchParams({
      page: currentPage.value.toString(),
      limit: '10',
    })

    console.log('🔄 Fetching user projects...')
    const rawResponse = await fetchWithAuth('/api/projects/my')
    const response = await rawResponse.json()

    console.log('📡 My Projects API response:', {
      success: response.success,
      projectsCount: response.projects?.length || 0,
      projects: response.projects,
      fullResponse: response
    })

    if (response.success) {
      const projectsData = response.projects || []

      // Load pending applications for each project
      for (const project of projectsData) {
        if (project.status === 'recruiting') {
          try {
            const appRawResponse = await fetchWithAuth(`/api/matching/applications/received?project_id=${project.id}&status=pending&limit=5`)
            const appResponse = await appRawResponse.json()
            project.pending_applications = appResponse.applications || []
          } catch (error) {
            console.error(`Error loading applications for project ${project.id}:`, error)
            project.pending_applications = []
          }
        }
      }

      if (resetPage) {
        projects.value = projectsData
      } else {
        projects.value.push(...projectsData)
      }

      // Note: /my endpoint doesn't have pagination, so no more pages
      hasMore.value = false
    }
  } catch (error) {
    console.error('Error loading projects:', error)
  } finally {
    loading.value = false
    loadingMore.value = false
  }
}

const loadMore = async () => {
  if (loadingMore.value || !hasMore.value) return
  currentPage.value++
  await loadProjects(false)
}

const handleApplication = async (applicationId, action) => {
  processingApplication.value = true

  try {
    const rawResponse = await fetchWithAuth(`/api/matching/applications/${applicationId}`, {
      method: 'PUT',
      body: { action }
    })

    const response = await rawResponse.json()

    if (response.success) {
      // Refresh projects to update application counts
      await loadProjects()
    } else {
      alert(response.message || 'Failed to process application')
    }
  } catch (error) {
    console.error(`Error ${action}ing application:`, error)
    alert('Failed to process application')
  } finally {
    processingApplication.value = false
  }
}

const toggleRecruitment = async (projectId, startRecruiting) => {
  try {
    const status = startRecruiting ? 'recruiting' : 'active'

    const rawResponse = await fetchWithAuth(`/api/projects/${projectId}/`, {
      method: 'PUT',
      body: { status }
    })

    const response = await rawResponse.json()

    if (response.success) {
      // Update local project status
      const project = projects.value.find(p => p.id === projectId)
      if (project) {
        project.status = status
      }
    } else {
      alert(response.message || 'Failed to update project')
    }
  } catch (error) {
    console.error('Error updating project:', error)
    alert('Failed to update project')
  }
}

const viewAllApplications = (projectId) => {
  // Navigate to detailed applications view
  navigateTo(`/matching/projects/${projectId}/applications`)
}

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
    'web': 'Web Dev',
    'mobile': 'Mobile',
    'ai': 'AI/ML',
    'game': 'Game Dev',
    'research': 'Research',
    'hardware': 'Hardware',
    'other': 'Other'
  }
  return types[type] || type
}

const formatDate = (dateString) => {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now - date
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'today'
  if (diffDays === 1) return 'yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`

  return date.toLocaleDateString()
}

const truncateText = (text, maxLength) => {
  if (!text) return ''
  if (text.length <= maxLength) return text
  return text.substr(0, maxLength) + '...'
}

// Lifecycle
onMounted(async () => {
  await loadProjects()
})
</script>

<style scoped>
.projects-page {
  max-width: 1000px;
  margin: 0 auto;
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
}

.page-header h1 {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 2.5rem;
  color: var(--text-primary, #2c3e50);
  margin: 0;
}

.title-icon {
  color: #3498db;
}

.page-header p {
  font-size: 1.1rem;
  color: var(--text-secondary, #7f8c8d);
  margin: 4px 0 0 0;
}

.loading-state, .empty-state {
  text-align: center;
  padding: 60px 20px;
}

.empty-icon {
  font-size: 4rem;
  color: var(--text-secondary, #7f8c8d);
  margin-bottom: 20px;
}

.empty-state h3 {
  font-size: 1.5rem;
  color: var(--text-primary, #2c3e50);
  margin-bottom: 10px;
}

.projects-list {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.project-card {
  background: var(--surface-primary, white);
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.08);
  border: 1px solid #e9ecef;
  transition: all 0.2s ease;
}

.project-card:hover {
  box-shadow: 0 4px 15px rgba(0,0,0,0.12);
}

.project-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}

.project-title {
  font-size: 1.4rem;
  font-weight: 600;
  color: var(--text-primary, #2c3e50);
  margin: 0 0 8px 0;
}

.project-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.status-badge {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
}

.status-recruiting { background: #d4edda; color: #155724; }
.status-active { background: #cce5ff; color: #0056b3; }
.status-completed { background: #e2e3e5; color: #6c757d; }
.status-cancelled { background: #f8d7da; color: #721c24; }

.project-type {
  background: #ecf0f1;
  color: #7f8c8d;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 500;
}

.difficulty-badge {
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 500;
  text-transform: capitalize;
}

.difficulty-beginner { background: #d5f4e6; color: #27ae60; }
.difficulty-intermediate { background: #fef9e7; color: #f39c12; }
.difficulty-advanced { background: #fadbd8; color: #e74c3c; }

.project-stats {
  display: flex;
  gap: 16px;
  color: var(--text-secondary, #7f8c8d);
  font-size: 0.9rem;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.project-description {
  color: var(--text-secondary, #7f8c8d);
  line-height: 1.5;
  margin-bottom: 12px;
}

.skills-section {
  margin-bottom: 12px;
}

.skills-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}

.skill-tag {
  background: #e3f2fd;
  color: #1976d2;
  padding: 4px 8px;
  border-radius: 10px;
  font-size: 0.8rem;
  font-weight: 500;
}

.more-skills {
  color: #7f8c8d;
  font-size: 0.8rem;
  font-style: italic;
}

.project-timeline {
  color: var(--text-secondary, #7f8c8d);
  font-size: 0.85rem;
}

.pending-section {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #e9ecef;
}

.pending-section h4 {
  margin: 0 0 12px 0;
  color: var(--text-primary, #2c3e50);
  font-size: 1rem;
}

.applications-preview {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.application-preview {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 8px;
}


.applicant-info {
  flex: 1;
}

.applicant-name {
  font-weight: 500;
  color: var(--text-primary, #2c3e50);
}

.match-score {
  font-size: 0.8rem;
  color: #f39c12;
  font-weight: 600;
}

.application-actions {
  display: flex;
  gap: 8px;
}

.more-applications {
  text-align: center;
  padding: 8px;
}

.project-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #f0f0f0;
}

.load-more {
  text-align: center;
  margin-top: 30px;
}

.btn {
  padding: 8px 16px;
  border-radius: 6px;
  font-weight: 500;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid transparent;
  cursor: pointer;
  font-size: 0.9rem;
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

.btn-secondary:hover:not(:disabled) {
  background: #e67e22;
}

.btn-success {
  background: #27ae60;
  color: white;
  border-color: #27ae60;
}

.btn-success:hover:not(:disabled) {
  background: #219a52;
}

.btn-outline {
  background: transparent;
  color: var(--text-secondary, #7f8c8d);
  border-color: #bdc3c7;
}

.btn-outline:hover:not(:disabled) {
  background: #ecf0f1;
}

.btn-link {
  background: transparent;
  color: #3498db;
  border: none;
  text-decoration: none;
}

.btn-link:hover {
  text-decoration: underline;
}

.btn-xs {
  padding: 4px 8px;
  font-size: 0.8rem;
}

.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }

  .project-header {
    flex-direction: column;
    gap: 12px;
  }

  .project-stats {
    justify-content: flex-start;
  }

  .project-actions {
    flex-wrap: wrap;
  }

  .application-preview {
    flex-wrap: wrap;
    gap: 8px;
  }

  .application-actions {
    width: 100%;
    justify-content: flex-end;
  }
}
</style>