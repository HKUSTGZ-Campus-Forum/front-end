<template>
  <HomeContainer>
    <div class="discover-page">
      <MatchingBreadcrumbs />

      <!-- Header -->
      <div class="page-header">
        <h1>
          <Icon :name="searchMode === 'projects' ? 'search' : 'users'" class="title-icon" />
          {{ searchMode === 'projects' ? '发现项目' : '发现队友' }}
        </h1>
        <p>{{ searchMode === 'projects' ? '找到与你的技能和兴趣匹配的项目' : '找到合适的队友加入你的项目' }}</p>

        <!-- Mode Toggle -->
        <div class="mode-toggle">
          <button
            :class="['mode-btn', { active: searchMode === 'projects' }]"
            @click="switchSearchMode('projects')"
          >
            <Icon name="folder" />
            发现项目
          </button>
          <button
            :class="['mode-btn', { active: searchMode === 'teammates' }]"
            @click="switchSearchMode('teammates')"
          >
            <Icon name="users" />
            发现队友
          </button>
        </div>
      </div>

      <!-- Filters -->
      <div class="filters-section">
        <div class="filters-row">
          <div class="filter-group search-group">
            <label>搜索</label>
            <input
              v-model="filters.query"
              @input="debouncedSearch"
              :placeholder="searchMode === 'projects' ? '搜索项目...' : '搜索队友...'"
              class="filter-input"
            />
          </div>

          <div class="filter-group">
            <label>查看模式</label>
            <div class="view-toggle">
              <button
                :class="['view-btn', { active: viewMode === 'recommended' }]"
                @click="switchView('recommended')"
              >
                <Icon name="stars" />
                {{ searchMode === 'projects' ? '推荐项目' : '推荐队友' }}
              </button>
              <button
                :class="['view-btn', { active: viewMode === 'all' }]"
                @click="switchView('all')"
              >
                <Icon name="list" />
                {{ searchMode === 'projects' ? '全部项目' : '全部队友' }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Content -->
      <div class="content-section">
        <!-- Loading -->
        <div v-if="loading" class="loading-section">
          <Icon name="spinner" class="spinning" />
          <p>{{ searchMode === 'projects' ? '正在为你寻找项目...' : '正在为你寻找队友...' }}</p>
        </div>

        <!-- Profile Required Message -->
        <div v-else-if="viewMode === 'recommended' && (!profile || !profile.bio)" class="profile-required">
          <Icon name="user-circle" class="prompt-icon" />
          <div class="profile-message">
            <h3>需要完善个人资料</h3>
            <p>{{ searchMode === 'projects' ? '完成个人资料设置后，系统将为你推荐最匹配的项目' : '完成个人资料设置后，系统将为你推荐最合适的队友' }}</p>
            <div class="profile-requirements">
              <div class="requirement-item">
                <Icon name="circle" class="req-icon" />
                个人介绍
              </div>
              <div class="requirement-item">
                <Icon name="circle" class="req-icon" />
                技能标签 (至少3个)
              </div>
              <div class="requirement-item">
                <Icon name="circle" class="req-icon" />
                经验水平
              </div>
            </div>
          </div>
          <div class="profile-actions">
            <NuxtLink to="/matching/profile" class="btn btn-primary btn-lg">
              <Icon name="user-circle" />
              去完善资料
            </NuxtLink>
            <button @click="switchView('all')" class="btn btn-outline">
              {{ searchMode === 'projects' ? '先看看所有项目' : '先看看所有队友' }}
            </button>
          </div>
        </div>

        <!-- Results -->
        <div v-else class="results-section">
          <!-- Results Header -->
          <div class="results-header">
            <h2>
              {{ getResultsTitle() }}
              <span class="results-count">({{ searchMode === 'projects' ? projects.length : teammates.length }})</span>
            </h2>
          </div>

          <!-- No Results -->
          <div v-if="(searchMode === 'projects' ? projects.length === 0 : teammates.length === 0) && !loading" class="no-results">
            <Icon :name="searchMode === 'projects' ? 'search' : 'users'" class="no-results-icon" />
            <h3>{{ searchMode === 'projects' ? '暂无项目' : '暂无队友' }}</h3>
            <p>{{ searchMode === 'projects' ? '尝试调整筛选条件或稍后查看新项目' : '尝试调整筛选条件或稍后查看新用户' }}</p>
          </div>

          <!-- Results Grid -->
          <div v-else class="results-grid">

            <!-- Project Cards -->
            <ProjectCard
              v-if="searchMode === 'projects'"
              v-for="(project, index) in projects"
              :key="`project-${viewMode}-${project.project?.id || project.id || index}`"
              :project="project.project || project"
              :match-info="project.similarity_score ? project : null"
            />

            <!-- User Cards -->
            <UserCard
              v-if="searchMode === 'teammates'"
              v-for="(teammate, index) in teammates"
              :key="`teammate-${viewMode}-${teammate.profile?.user_id || teammate.user_id || index}`"
              :profile="teammate.profile || teammate"
              :match-info="teammate.similarity_score ? teammate : null"
              @view-user="viewUserProfile"
            />
          </div>

          <!-- Load More -->
          <div v-if="hasMore" class="load-more-section">
            <button @click="loadMore" :disabled="loadingMore" class="btn btn-outline btn-lg">
              <Icon v-if="loadingMore" name="spinner" class="spinning" />
              {{ searchMode === 'projects' ? '加载更多项目' : '加载更多队友' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- User Profile Modal (teleported to body) -->
    <Teleport to="body">
      <UserProfileModal
        :is-open="showUserProfileModal"
        :user-id="selectedUserId"
        @close="showUserProfileModal = false"
      />
    </Teleport>
  </HomeContainer>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { debounce } from 'lodash-es'
import MatchingBreadcrumbs from '~/components/matching/MatchingBreadcrumbs.vue'
import ProjectCard from '~/components/matching/ProjectCard.vue'
import UserCard from '~/components/matching/UserCard.vue'
import UserProfileModal from '~/components/matching/UserProfileModal.vue'

// Composables
const { fetchWithAuth, fetchPublic } = useApi()

// Page meta
definePageMeta({
  title: 'Discover Projects',
  requiresAuth: true,
})

// Reactive data
const searchMode = ref('projects') // 'projects' or 'teammates'
const viewMode = ref('recommended')
const profile = ref(null)
const projects = ref([])
const teammates = ref([])
const loading = ref(true)
const loadingMore = ref(false)
const hasMore = ref(false)
const currentPage = ref(1)

// User profile modal state
const showUserProfileModal = ref(false)
const selectedUserId = ref(null)

const filters = ref({
  query: ''
})

// Methods
const search = async (resetPage = true) => {
  if (searchMode.value === 'projects') {
    return searchProjects(resetPage)
  } else {
    return searchTeammates(resetPage)
  }
}

const searchProjects = async (resetPage = true) => {
  if (resetPage) {
    currentPage.value = 1
    projects.value = []
  }

  loading.value = resetPage

  try {
    let response
    if (viewMode.value === 'recommended') {
      // Get recommended projects
      const params = new URLSearchParams({
        limit: '10'
      })

      const rawResponse = await fetchWithAuth(`/api/matching/projects?${params}`)
      response = await rawResponse.json()
    } else {
      // Get all projects with filters
      const params = new URLSearchParams({
        page: currentPage.value.toString(),
        limit: '12',
        status: 'recruiting'
      })

      if (filters.value.query) params.append('q', filters.value.query)

      const rawResponse = await fetchPublic(`/api/projects/?${params}`)
      response = await rawResponse.json()
    }

    if (response.success) {
      if (viewMode.value === 'recommended') {
        const matches = response.matches || []
        const validMatches = matches.filter(m => m.project || (m.id && m.title))

        projects.value = validMatches
        hasMore.value = false
      } else {
        const projectList = response.projects || []
        const validProjects = projectList.filter(p => p.id && p.title)

        if (resetPage) {
          projects.value = validProjects
        } else {
          projects.value.push(...validProjects)
        }

        const pagination = response.pagination || {}
        hasMore.value = pagination.page < pagination.pages
      }
    } else {
      // Handle unsuccessful response silently or add user-friendly error handling here
    }
  } catch (error) {
    // Handle errors silently or add user-friendly error handling here
    if (error.status === 400 && error.data?.profile_required) {
      profile.value = null
    }
  } finally {
    loading.value = false
    loadingMore.value = false
  }
}

const searchTeammates = async (resetPage = true) => {
  if (resetPage) {
    currentPage.value = 1
    teammates.value = []
  }

  loading.value = resetPage

  try {
    let response
    if (viewMode.value === 'recommended') {
      // Get recommended teammates (requires a specific project context)
      // For now, fall back to all teammates since we don't have project context in discover page
      viewMode.value = 'all'
    }

    // Get all teammates with filters
    const params = new URLSearchParams({
      page: currentPage.value.toString(),
      limit: '12'
    })

    if (filters.value.query) params.append('q', filters.value.query)

    const rawResponse = await fetchPublic(`/api/profiles/?${params}`)
    response = await rawResponse.json()

    if (response.success) {
      const profileList = response.profiles || []
      const validProfiles = profileList.filter(p => p.user_id && p.user)

      if (resetPage) {
        teammates.value = validProfiles
      } else {
        teammates.value.push(...validProfiles)
      }

      const pagination = response.pagination || {}
      hasMore.value = pagination.page < pagination.pages
    } else {
      // Handle unsuccessful response silently or add user-friendly error handling here
    }
  } catch (error) {
    // Handle errors silently or add user-friendly error handling here
  } finally {
    loading.value = false
    loadingMore.value = false
  }
}

const debouncedSearch = debounce(() => {
  if (viewMode.value === 'all') {
    search()
  }
}, 500)

const switchView = async (mode) => {
  if (viewMode.value === mode) return

  viewMode.value = mode
  await search()
}

const switchSearchMode = async (mode) => {
  if (searchMode.value === mode) return

  // Clear previous results
  projects.value = []
  teammates.value = []

  // Reset filters
  filters.value = {
    query: ''
  }

  searchMode.value = mode

  // For teammates, recommended mode isn't available in discover page (needs project context)
  if (mode === 'teammates' && viewMode.value === 'recommended') {
    viewMode.value = 'all'
  }

  await search()
}

const loadMore = async () => {
  if (loadingMore.value || !hasMore.value) return

  loadingMore.value = true
  currentPage.value++
  await search(false)
}

const getResultsTitle = () => {
  if (searchMode.value === 'projects') {
    return viewMode.value === 'recommended' ? '为你推荐' : '全部项目'
  } else {
    return viewMode.value === 'recommended' ? '为你推荐' : '全部队友'
  }
}

const viewUserProfile = (userId) => {
  selectedUserId.value = userId
  showUserProfileModal.value = true
}


const loadProfile = async () => {
  try {
    const rawResponse = await fetchWithAuth('/api/profiles')
    const response = await rawResponse.json()

    if (response.success) {
      profile.value = response.profile
    }
  } catch (error) {
    // Handle errors silently or add user-friendly error handling here
  }
}

// Lifecycle
onMounted(async () => {
  await loadProfile()
  await search()
})
</script>

<style scoped>
.discover-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.page-header {
  text-align: center;
  margin-bottom: 30px;
}

.page-header h1 {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  font-size: 2.5rem;
  color: var(--text-primary, #2c3e50);
  margin-bottom: 8px;
}

.title-icon {
  color: var(--interactive-primary, #3498db);
}

.page-header p {
  font-size: 1.1rem;
  color: var(--text-secondary, #7f8c8d);
  margin: 0 0 20px 0;
}

.mode-toggle {
  display: flex;
  justify-content: center;
  gap: 4px;
  background: var(--surface-secondary, #f8f9fa);
  border-radius: 10px;
  padding: 4px;
  max-width: 400px;
  margin: 0 auto;
}

.mode-btn {
  flex: 1;
  padding: 12px 20px;
  background: transparent;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.95rem;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.2s ease;
  color: var(--text-secondary, #7f8c8d);
}

.mode-btn:hover {
  background: rgba(255, 255, 255, 0.5);
  color: var(--text-primary, #2c3e50);
}

.mode-btn.active {
  background: var(--interactive-primary, #3498db);
  color: white;
  box-shadow: 0 2px 8px rgba(52, 152, 219, 0.3);
}

.mode-btn svg {
  width: 18px;
  height: 18px;
}

.filters-section {
  background: var(--surface-primary, white);
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.08);
  margin-bottom: 30px;
}

.filters-row {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 20px;
  align-items: end;
}

.search-group {
  min-width: 300px;
}

.filter-group label {
  display: block;
  font-weight: 500;
  color: var(--text-primary, #2c3e50);
  margin-bottom: 6px;
}

.filter-input,
.filter-select {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 0.9rem;
}

.filter-input:focus,
.filter-select:focus {
  outline: none;
  border-color: #3498db;
}

.view-toggle {
  display: flex;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid #ddd;
}

.view-btn {
  flex: 1;
  padding: 10px 12px;
  background: var(--surface-primary, white);
  border: none;
  cursor: pointer;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: all 0.2s ease;
}

.view-btn:hover {
  background: #f8f9fa;
}

.view-btn.active {
  background: #3498db;
  color: white;
}

.view-btn:not(:last-child) {
  border-right: 1px solid #ddd;
}

.loading-section {
  text-align: center;
  padding: 60px 20px;
  color: var(--text-secondary, #7f8c8d);
}

.loading-section .spinning {
  font-size: 2rem;
  margin-bottom: 16px;
}

.profile-required {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: flex-start;
  gap: 24px;
  background: linear-gradient(135deg, rgba(52, 152, 219, 0.05), rgba(41, 128, 185, 0.05));
  padding: 30px;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.08);
  border: 1px solid rgba(52, 152, 219, 0.2);
}

.profile-message h3 {
  margin: 0 0 8px 0;
  color: var(--text-primary, #2c3e50);
  font-size: 1.3rem;
}

.profile-message p {
  margin: 0 0 16px 0;
  color: var(--text-secondary, #7f8c8d);
}

.profile-requirements {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.requirement-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9rem;
  color: var(--text-secondary, #7f8c8d);
}

.req-icon {
  font-size: 0.8rem;
  color: var(--interactive-primary, #3498db);
}

.profile-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 200px;
}

.btn-lg {
  padding: 16px 24px;
  font-size: 1rem;
  font-weight: 600;
}

.prompt-icon {
  font-size: 3rem;
  color: var(--interactive-primary, #3498db);
}

.profile-required h3 {
  margin: 0 0 8px 0;
  color: var(--text-primary, #2c3e50);
}

.profile-required p {
  margin: 0 0 16px 0;
  color: var(--text-secondary, #7f8c8d);
}

.results-header {
  display: flex;
  align-items: center;
  justify-content: between;
  margin-bottom: 20px;
}

.results-header h2 {
  color: var(--text-primary, #2c3e50);
  font-size: 1.5rem;
  margin: 0;
}

.results-count {
  color: var(--text-secondary, #7f8c8d);
  font-weight: normal;
  font-size: 1rem;
}

.no-results {
  text-align: center;
  padding: 60px 20px;
  background: var(--surface-primary, white);
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.08);
}

.no-results-icon {
  font-size: 3rem;
  color: #bdc3c7;
  margin-bottom: 16px;
}

.no-results h3 {
  color: var(--text-primary, #2c3e50);
  margin: 0 0 8px 0;
}

.no-results p {
  color: var(--text-secondary, #7f8c8d);
  margin: 0;
}

.results-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

/* Specific styling for project cards */
.results-grid .project-card {
  /* Project cards already have proper styling */
}

/* Specific styling for user cards */
.results-grid .user-card {
  /* User cards already have proper styling */
}

.load-more-section {
  text-align: center;
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

.btn-outline {
  background: var(--surface-primary, white);
  color: var(--text-secondary, #7f8c8d);
  border-color: #bdc3c7;
}

.btn-outline:hover:not(:disabled) {
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
  .filters-row {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .results-grid {
    grid-template-columns: 1fr;
  }

  .profile-required {
    grid-template-columns: 1fr;
    text-align: center;
    gap: 16px;
  }

  .profile-actions {
    align-items: center;
  }

  .mode-toggle {
    max-width: 100%;
  }

  .mode-btn {
    padding: 10px 16px;
    font-size: 0.9rem;
  }
}
</style>