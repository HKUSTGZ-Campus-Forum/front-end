<template>
  <HomeContainer>
    <div class="discover-page">
      <MatchingBreadcrumbs />

      <!-- Header -->
      <div class="page-header">
        <h1>
          <Icon name="search" class="title-icon" />
          发现项目
        </h1>
        <p>找到与你的技能和兴趣匹配的项目</p>
      </div>

      <!-- Filters -->
      <div class="filters-section">
        <div class="filters-row">
          <div class="filter-group">
            <label>搜索</label>
            <input
              v-model="filters.query"
              @input="debouncedSearch"
              placeholder="搜索项目..."
              class="filter-input"
            />
          </div>

          <div class="filter-group">
            <label>项目类型</label>
            <select v-model="filters.type" @change="searchProjects" class="filter-select">
              <option value="">全部类型</option>
              <option value="web">Web开发</option>
              <option value="mobile">移动应用</option>
              <option value="ai">AI/机器学习</option>
              <option value="game">游戏开发</option>
              <option value="research">研究项目</option>
              <option value="hardware">硬件项目</option>
              <option value="other">其他</option>
            </select>
          </div>

          <div class="filter-group">
            <label>难度等级</label>
            <select v-model="filters.difficulty" @change="searchProjects" class="filter-select">
              <option value="">全部等级</option>
              <option value="beginner">初级</option>
              <option value="intermediate">中级</option>
              <option value="advanced">高级</option>
            </select>
          </div>

          <div class="filter-group">
            <label>查看模式</label>
            <div class="view-toggle">
              <button
                :class="['view-btn', { active: viewMode === 'recommended' }]"
                @click="switchView('recommended')"
              >
                <Icon name="stars" />
                推荐项目
              </button>
              <button
                :class="['view-btn', { active: viewMode === 'all' }]"
                @click="switchView('all')"
              >
                <Icon name="list" />
                全部项目
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
          <p>正在为你寻找项目...</p>
        </div>

        <!-- Profile Required Message -->
        <div v-else-if="viewMode === 'recommended' && (!profile || !profile.bio)" class="profile-required">
          <Icon name="user-circle" class="prompt-icon" />
          <div class="profile-message">
            <h3>需要完善个人资料</h3>
            <p>完成个人资料设置后，系统将为你推荐最匹配的项目</p>
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
              先看看所有项目
            </button>
          </div>
        </div>

        <!-- Results -->
        <div v-else class="results-section">
          <!-- Results Header -->
          <div class="results-header">
            <h2>
              {{ viewMode === 'recommended' ? '为你推荐' : '全部项目' }}
              <span class="results-count">({{ projects.length }})</span>
            </h2>
          </div>

          <!-- No Results -->
          <div v-if="projects.length === 0 && !loading" class="no-results">
            <Icon name="search" class="no-results-icon" />
            <h3>暂无项目</h3>
            <p>尝试调整筛选条件或稍后查看新项目</p>
          </div>

          <!-- Project Grid -->
          <div v-else class="project-grid">
            <!-- Debug info (development only) -->
            <div v-if="projects.length > 0 && isDevelopment" class="debug-info">
              <p style="color: #666; font-size: 0.8rem; margin-bottom: 10px; padding: 8px; background: #f8f9fa; border-radius: 4px;">
                🔍 调试信息: 找到 {{ projects.length }} 个项目 • 模式: {{ viewMode }}
              </p>
            </div>

            <ProjectCard
              v-for="(project, index) in projects"
              :key="`${viewMode}-${project.project?.id || project.id || index}`"
              :project="project.project || project"
              :match-info="project.similarity_score ? project : null"
            />
          </div>

          <!-- Load More -->
          <div v-if="hasMore" class="load-more-section">
            <button @click="loadMore" :disabled="loadingMore" class="btn btn-outline btn-lg">
              <Icon v-if="loadingMore" name="spinner" class="spinning" />
              加载更多项目
            </button>
          </div>
        </div>
      </div>
    </div>
  </HomeContainer>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { debounce } from 'lodash-es'
import MatchingBreadcrumbs from '~/components/matching/MatchingBreadcrumbs.vue'
import ProjectCard from '~/components/matching/ProjectCard.vue'

// Composables
const { fetchWithAuth, fetchPublic } = useApi()

// Page meta
definePageMeta({
  title: 'Discover Projects',
  requiresAuth: true,
})

// Reactive data
const viewMode = ref('recommended')
const profile = ref(null)
const projects = ref([])
const loading = ref(true)
const loadingMore = ref(false)
const hasMore = ref(false)
const currentPage = ref(1)

// Development mode detection
const isDevelopment = computed(() => process.dev)

const filters = ref({
  query: '',
  type: '',
  difficulty: '',
})

// Methods
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
      console.log('🔍 Fetching recommended projects with params:', params.toString())

      const rawResponse = await fetchWithAuth(`/api/matching/projects?${params}`)
      response = await rawResponse.json()

      console.log('📡 Raw server response for recommendations:', {
        success: response.success,
        matchesCount: response.matches?.length || 0,
        matches: response.matches,
        profile: response.profile,
        message: response.message,
        fullResponse: response
      })
    } else {
      // Get all projects with filters
      const params = new URLSearchParams({
        page: currentPage.value.toString(),
        limit: '12',
        status: 'recruiting'
      })

      if (filters.value.query) params.append('q', filters.value.query)
      if (filters.value.type) params.append('type', filters.value.type)
      if (filters.value.difficulty) params.append('difficulty', filters.value.difficulty)

      console.log('🔍 Fetching all projects with params:', params.toString())

      const rawResponse = await fetchPublic(`/api/projects/?${params}`)
      response = await rawResponse.json()

      console.log('📡 Raw server response for all projects:', {
        success: response.success,
        projectsCount: response.projects?.length || 0,
        projects: response.projects,
        pagination: response.pagination,
        fullResponse: response
      })
    }

    console.log('🎯 Processing response...')

    if (response.success) {
      if (viewMode.value === 'recommended') {
        const matches = response.matches || []
        console.log('✅ Setting recommended projects:', {
          matchesReceived: matches.length,
          matchesData: matches.map(m => ({
            id: m.project?.id || m.id,
            title: m.project?.title || m.title,
            similarity_score: m.similarity_score,
            compatibility_score: m.compatibility_score,
            match_reasons: m.match_reasons,
            hasProject: !!m.project,
            projectData: m.project
          }))
        })

        // Ensure matches have proper project data
        const validMatches = matches.filter(m => m.project || (m.id && m.title))
        console.log('📊 Valid matches after filtering:', validMatches.length)

        projects.value = validMatches
        hasMore.value = false
      } else {
        const projectList = response.projects || []
        console.log('✅ Setting all projects:', {
          projectsReceived: projectList.length,
          projectsData: projectList.map(p => ({
            id: p.id,
            title: p.title,
            hasRequiredFields: !!(p.id && p.title)
          }))
        })

        // Ensure projects have required data
        const validProjects = projectList.filter(p => p.id && p.title)
        console.log('📊 Valid projects after filtering:', validProjects.length)

        if (resetPage) {
          projects.value = validProjects
        } else {
          projects.value.push(...validProjects)
        }

        const pagination = response.pagination || {}
        hasMore.value = pagination.page < pagination.pages
      }

      console.log('🏁 Final projects state:', {
        viewMode: viewMode.value,
        projectsCount: projects.value.length,
        hasMore: hasMore.value
      })
    } else {
      console.error('❌ Server returned unsuccessful response:', response)
    }
  } catch (error) {
    console.error('💥 Error searching projects:', {
      error: error,
      message: error.message,
      status: error.status,
      data: error.data
    })
    if (error.status === 400 && error.data?.profile_required) {
      // Profile required for recommendations
      profile.value = null
    }
  } finally {
    loading.value = false
    loadingMore.value = false
  }
}

const debouncedSearch = debounce(() => {
  if (viewMode.value === 'all') {
    searchProjects()
  }
}, 500)

const switchView = async (mode) => {
  if (viewMode.value === mode) return

  viewMode.value = mode
  await searchProjects()
}

const loadMore = async () => {
  if (loadingMore.value || !hasMore.value) return

  loadingMore.value = true
  currentPage.value++
  await searchProjects(false)
}


const loadProfile = async () => {
  try {
    console.log('👤 Loading user profile...')
    const rawResponse = await fetchWithAuth('/api/profiles')
    const response = await rawResponse.json()

    console.log('👤 Profile response:', {
      success: response.success,
      profileExists: !!response.profile,
      profileData: response.profile,
      message: response.message
    })

    if (response.success) {
      profile.value = response.profile
      console.log('✅ Profile loaded successfully:', {
        hasProfile: !!response.profile,
        profileComplete: response.profile?.bio && response.profile?.skills?.length > 0,
        bio: response.profile?.bio,
        skillsCount: response.profile?.skills?.length || 0
      })
    }
  } catch (error) {
    console.error('💥 Error loading profile:', error)
  }
}

// Lifecycle
onMounted(async () => {
  await loadProfile()
  await searchProjects()
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
  margin: 0;
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
  grid-template-columns: 2fr 1fr 1fr 1fr;
  gap: 20px;
  align-items: end;
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

.project-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
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

  .project-grid {
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
}
</style>