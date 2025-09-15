<template>
  <HomeContainer>
    <div class="matching-dashboard">
      <!-- Header -->
      <div class="dashboard-header">
        <h1 class="dashboard-title">
          <Icon name="users" class="title-icon" />
          队友匹配
        </h1>
        <p class="dashboard-subtitle">找到合作伙伴和有趣的项目</p>
      </div>

      <!-- Onboarding Flow -->
      <div v-if="!isProfileComplete" class="onboarding-section">
        <!-- Progress Bar -->
        <div class="progress-container">
          <div class="progress-header">
            <h3>欢迎加入团队匹配系统！</h3>
            <p>完成设置，开始寻找完美的合作伙伴</p>
          </div>
          <div class="progress-steps">
            <div class="progress-step" :class="{ completed: profile?.bio }">
              <div class="step-indicator">1</div>
              <span>个人资料</span>
            </div>
            <div class="progress-line" :class="{ filled: profile?.bio }"></div>
            <div class="progress-step" :class="{ completed: profile?.skills?.length >= 3, active: profile?.bio }">
              <div class="step-indicator">2</div>
              <span>技能标签</span>
            </div>
            <div class="progress-line" :class="{ filled: profile?.skills?.length >= 3 }"></div>
            <div class="progress-step" :class="{ completed: isProfileComplete, active: profile?.skills?.length >= 3 }">
              <div class="step-indicator">3</div>
              <span>开始匹配</span>
            </div>
          </div>
        </div>

        <!-- Call to Action Card -->
        <div class="profile-prompt-card">
          <div class="prompt-content">
            <Icon name="user-circle" class="prompt-icon" />
            <div class="prompt-text">
              <h3>{{ getOnboardingTitle }}</h3>
              <p>{{ getOnboardingDescription }}</p>
              <div class="requirements-list">
                <div class="requirement" :class="{ completed: profile?.bio }">
                  <Icon :name="profile?.bio ? 'check-circle' : 'circle'" class="req-icon" />
                  个人介绍 (必填)
                </div>
                <div class="requirement" :class="{ completed: profile?.skills?.length >= 3 }">
                  <Icon :name="profile?.skills?.length >= 3 ? 'check-circle' : 'circle'" class="req-icon" />
                  至少3个技能标签 (必填)
                </div>
                <div class="requirement" :class="{ completed: profile?.experience_level }">
                  <Icon :name="profile?.experience_level ? 'check-circle' : 'circle'" class="req-icon" />
                  经验水平 (必填)
                </div>
              </div>
            </div>
            <div class="prompt-actions">
              <NuxtLink to="/matching/profile" class="btn btn-primary btn-lg">
                {{ profile?.id ? '继续完善资料' : '开始设置' }}
                <Icon name="arrow-right" />
              </NuxtLink>
              <button v-if="profile?.bio" @click="skipToDiscover" class="btn btn-outline">
                先去看看项目
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Dashboard Content -->
      <div v-else class="dashboard-content">
        <!-- Quick Stats -->
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-number">{{ dashboardData.stats?.projects_created || 0 }}</div>
            <div class="stat-label">创建项目</div>
          </div>
          <div class="stat-card">
            <div class="stat-number">{{ profileCompletion }}%</div>
            <div class="stat-label">资料完成度</div>
          </div>
        </div>

        <!-- Action Cards -->
        <div class="action-grid">
          <NuxtLink to="/matching/discover" class="action-card">
            <Icon name="search" class="action-icon" />
            <h3>发现项目</h3>
            <p>找到与你的技能和兴趣匹配的项目</p>
          </NuxtLink>

          <NuxtLink to="/matching/projects/create" class="action-card">
            <Icon name="plus-circle" class="action-icon" />
            <h3>创建项目</h3>
            <p>发布你的项目想法，找到队友</p>
          </NuxtLink>

          <NuxtLink to="/matching/profile" class="action-card profile-card">
            <Icon name="user-circle" class="action-icon" />
            <h3>编辑资料</h3>
            <p>更新你的技能、兴趣和联系方式</p>
            <div class="profile-completion">
              <div class="completion-bar">
                <div class="completion-fill" :style="{ width: `${profileCompletion}%` }"></div>
              </div>
              <span class="completion-text">{{ profileCompletion }}% 完成</span>
            </div>
          </NuxtLink>


          <NuxtLink to="/matching/projects" class="action-card">
            <Icon name="briefcase" class="action-icon" />
            <h3>我的项目</h3>
            <p>管理你的项目和团队成员</p>
          </NuxtLink>
        </div>

        <!-- Recent Activity -->
        <div class="activity-section">
          <h2>我的项目</h2>

          <!-- My Projects -->
          <div v-if="dashboardData.user_projects?.length" class="activity-card">
            <h3>我的项目</h3>
            <div class="project-list">
              <div
                v-for="project in dashboardData.user_projects.slice(0, 3)"
                :key="project.id"
                class="project-item"
              >
                <div class="project-info">
                  <h4>{{ project.title }}</h4>
                  <p class="project-stats">
                    {{ project.current_team_size }}/{{ project.team_size_max }} 成员
                    • {{ project.interest_count }} 关注
                  </p>
                </div>
                <NuxtLink :to="`/matching/projects/${project.id}`" class="btn btn-sm btn-outline">
管理
                </NuxtLink>
              </div>
            </div>
            <NuxtLink to="/matching/projects" class="view-all-link">查看所有项目</NuxtLink>
          </div>
        </div>
      </div>
    </div>
  </HomeContainer>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import MatchingNavigation from '~/components/matching/MatchingNavigation.vue'

// Composables
const { fetchWithAuth } = useApi()

// Page meta
definePageMeta({
  title: 'Teammate Matching',
  requiresAuth: true,
})

// Reactive data
const profile = ref(null)
const dashboardData = ref({
  stats: {},
  user_projects: []
})
const loading = ref(true)

// Computed properties for onboarding
const isProfileComplete = computed(() => {
  const hasProfile = profile.value?.bio &&
                    profile.value?.skills?.length >= 3 &&
                    profile.value?.experience_level

  console.log('🧮 Profile completeness check:', {
    hasBio: !!profile.value?.bio,
    bio: profile.value?.bio?.substring(0, 50) + '...',
    skillsCount: profile.value?.skills?.length || 0,
    skills: profile.value?.skills,
    hasExperience: !!profile.value?.experience_level,
    experience: profile.value?.experience_level,
    isComplete: hasProfile
  })

  return hasProfile
})

const profileCompletion = computed(() => {
  if (!profile.value) return 0

  let progress = 0
  if (profile.value.bio?.trim()) progress += 25
  if (profile.value.skills?.length >= 3) progress += 25
  else if (profile.value.skills?.length >= 1) progress += 12
  if (profile.value.experience_level) progress += 20
  if (profile.value.thrust?.length) progress += 10
  if (profile.value.preferred_roles?.length) progress += 8
  if (profile.value.availability) progress += 5
  if (profile.value.contact_methods?.length) progress += 7
  return Math.min(progress, 100)
})

const getOnboardingTitle = computed(() => {
  if (!profile.value?.bio) return '让我们了解一下你'
  if (!profile.value?.skills?.length || profile.value.skills.length < 3) return '添加你的技能'
  return '设置完成！开始匹配'
})

const getOnboardingDescription = computed(() => {
  if (!profile.value?.bio) return '写一段简单的自我介绍，让其他人了解你的背景和兴趣'
  if (!profile.value?.skills?.length || profile.value.skills.length < 3) return '添加你的技能标签，帮助系统找到最适合的项目和队友'
  return '一切准备就绪！现在你可以发现项目、创建项目或查看为你推荐的内容'
})

// Fetch dashboard data
const fetchDashboardData = async () => {
  try {
    console.log('🔄 Fetching dashboard data...')
    const rawResponse = await fetchWithAuth('/api/matching/dashboard')
    const response = await rawResponse.json()

    console.log('📡 Dashboard API response:', {
      success: response.success,
      hasProfile: !!response.profile,
      profile: response.profile,
      stats: response.stats,
      fullResponse: response
    })

    if (response.success) {
      dashboardData.value = response
      profile.value = response.profile

      // If no profile in dashboard response, try to fetch it separately
      if (!profile.value) {
        console.log('🔄 No profile in dashboard, fetching separately...')
        await fetchProfileSeparately()
      } else {
        console.log('✅ Profile loaded from dashboard:', {
          hasBio: !!profile.value.bio,
          skillsCount: profile.value.skills?.length || 0,
          hasExperience: !!profile.value.experience_level,
          isComplete: isProfileComplete.value,
          profileData: profile.value
        })
      }
    } else {
      console.error('❌ Dashboard API returned error:', response.message)
      // Try to fetch profile separately even if dashboard fails
      await fetchProfileSeparately()
    }
  } catch (error) {
    console.error('💥 Error fetching dashboard data:', error)
  } finally {
    loading.value = false
  }
}


// Fallback profile fetching
const fetchProfileSeparately = async () => {
  try {
    console.log('🔍 Fetching profile separately...')
    const profileResponse = await fetchWithAuth('/api/profiles')
    const profileData = await profileResponse.json()

    console.log('📋 Profile API response:', {
      success: profileData.success,
      hasProfile: !!profileData.profile,
      profileData: profileData.profile
    })

    if (profileData.success && profileData.profile) {
      profile.value = profileData.profile
      console.log('✅ Profile loaded separately:', {
        hasBio: !!profile.value.bio,
        skillsCount: profile.value.skills?.length || 0,
        hasExperience: !!profile.value.experience_level,
        isComplete: isProfileComplete.value
      })
    }
  } catch (error) {
    console.error('💥 Error fetching profile separately:', error)
  }
}

// Navigation helpers
const skipToDiscover = () => {
  navigateTo('/matching/discover')
}

// Format date helper
const formatDate = (dateString) => {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now - date
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`

  return date.toLocaleDateString()
}

// Lifecycle
onMounted(async () => {
  await fetchDashboardData()
})
</script>

<style scoped>
.matching-dashboard {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.dashboard-header {
  text-align: center;
  margin-bottom: 30px;
}

.dashboard-title {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  font-size: 2.5rem;
  font-weight: 700;
  color: var(--text-primary, #2c3e50);
  margin-bottom: 8px;
}

.title-icon {
  font-size: 2.2rem;
  color: var(--interactive-primary, #3498db);
}

.dashboard-subtitle {
  font-size: 1.2rem;
  color: var(--text-secondary, #7f8c8d);
  margin: 0;
}

.onboarding-section {
  margin-bottom: 40px;
}

.progress-container {
  background: var(--surface-primary, white);
  border-radius: 12px;
  padding: 30px;
  margin-bottom: 24px;
  box-shadow: var(--shadow-medium, 0 2px 10px rgba(0,0,0,0.08));
  border: 1px solid var(--border-primary, #e3e8ef);
}

.progress-header {
  text-align: center;
  margin-bottom: 30px;
}

.progress-header h3 {
  margin: 0 0 8px 0;
  font-size: 1.8rem;
  color: var(--text-primary, #2c3e50);
  font-weight: 600;
}

.progress-header p {
  margin: 0;
  color: var(--text-secondary, #7f8c8d);
  font-size: 1rem;
}

.progress-steps {
  display: flex;
  align-items: center;
  justify-content: center;
  max-width: 600px;
  margin: 0 auto;
}

.progress-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: var(--text-secondary, #7f8c8d);
  transition: all 0.3s ease;
}

.progress-step.completed,
.progress-step.active {
  color: var(--interactive-primary, #3498db);
}

.step-indicator {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--surface-secondary, #f8f9fa);
  border: 2px solid var(--border-secondary, #e9ecef);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  transition: all 0.3s ease;
}

.progress-step.completed .step-indicator {
  background: var(--interactive-primary, #3498db);
  border-color: var(--interactive-primary, #3498db);
  color: white;
}

.progress-step.active .step-indicator {
  border-color: var(--interactive-primary, #3498db);
  background: var(--surface-primary, white);
  color: var(--interactive-primary, #3498db);
}

.progress-line {
  flex: 1;
  height: 2px;
  background: var(--border-secondary, #e9ecef);
  margin: 0 16px;
  transition: all 0.3s ease;
}

.progress-line.filled {
  background: var(--interactive-primary, #3498db);
}

.profile-prompt-card {
  background: linear-gradient(135deg, #3498db, #2980b9);
  border-radius: 12px;
  padding: 30px;
  color: white;
  box-shadow: 0 4px 20px rgba(52, 152, 219, 0.3);
}

.prompt-content {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 24px;
  align-items: flex-start;
  max-width: 1000px;
  margin: 0 auto;
}

.prompt-icon {
  font-size: 3rem;
  opacity: 0.9;
}

.prompt-text h3 {
  margin: 0 0 8px 0;
  font-size: 1.5rem;
}

.prompt-text p {
  margin: 0 0 16px 0;
  opacity: 0.9;
}

.requirements-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.requirement {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9rem;
  opacity: 0.8;
  transition: all 0.2s ease;
}

.requirement.completed {
  opacity: 1;
  color: #a8f5a8;
}

.req-icon {
  font-size: 1rem;
}

.prompt-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: stretch;
  min-width: 200px;
}

.btn-lg {
  padding: 16px 32px;
  font-size: 1.1rem;
  font-weight: 600;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.stat-card {
  background: var(--surface-primary, white);
  padding: 24px;
  border-radius: 12px;
  text-align: center;
  box-shadow: var(--shadow-medium, 0 2px 10px rgba(0,0,0,0.08));
  border: 1px solid var(--border-primary, #e3e8ef);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 20px rgba(0,0,0,0.12);
}

.stat-number {
  font-size: 2.5rem;
  font-weight: 700;
  color: var(--text-primary, #2c3e50);
  margin-bottom: 8px;
}

.stat-label {
  font-size: 0.9rem;
  color: var(--text-secondary, #7f8c8d);
  font-weight: 500;
}

.action-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
  margin-bottom: 40px;
}

.action-card {
  background: var(--surface-primary, white);
  padding: 30px;
  border-radius: 12px;
  text-align: center;
  text-decoration: none;
  color: inherit;
  box-shadow: var(--shadow-medium, 0 2px 10px rgba(0,0,0,0.08));
  border: 1px solid var(--border-primary, #e3e8ef);
  transition: all 0.3s ease;
  position: relative;
}

.action-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 6px 25px rgba(0,0,0,0.15);
  border-color: #3498db;
}

.action-icon {
  font-size: 2.5rem;
  color: var(--interactive-primary, #3498db);
  margin-bottom: 16px;
}

.action-card h3 {
  margin: 0 0 12px 0;
  font-size: 1.3rem;
  color: var(--text-primary, #2c3e50);
}

.action-card p {
  margin: 0;
  color: var(--text-secondary, #7f8c8d);
  line-height: 1.5;
}

.badge {
  position: absolute;
  top: 15px;
  right: 15px;
  background: #e74c3c;
  color: white;
  border-radius: 12px;
  padding: 4px 8px;
  font-size: 0.8rem;
  font-weight: 600;
}

.profile-card .profile-completion {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--border-primary, #e9ecef);
}

.completion-bar {
  width: 100%;
  height: 6px;
  background: var(--surface-secondary, #f8f9fa);
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 8px;
}

.completion-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--interactive-primary, #3498db), #2ecc71);
  border-radius: 3px;
  transition: width 0.3s ease;
}

.completion-text {
  font-size: 0.8rem;
  color: var(--text-secondary, #7f8c8d);
  font-weight: 500;
}

.activity-section h2 {
  font-size: 1.8rem;
  color: var(--text-primary, #2c3e50);
  margin-bottom: 20px;
  font-weight: 600;
}

.activity-card {
  background: var(--surface-primary, white);
  border-radius: 12px;
  padding: 25px;
  margin-bottom: 20px;
  box-shadow: var(--shadow-medium, 0 2px 10px rgba(0,0,0,0.08));
  border: 1px solid var(--border-primary, #e3e8ef);
}

.activity-card h3 {
  margin: 0 0 20px 0;
  font-size: 1.2rem;
  color: var(--text-primary, #2c3e50);
  font-weight: 600;
}

.application-list, .project-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.application-item, .project-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

.application-info h4, .project-info h4 {
  margin: 0 0 4px 0;
  font-size: 1rem;
  color: var(--text-primary, #2c3e50);
}

.application-date, .project-stats, .project-name {
  font-size: 0.9rem;
  color: var(--text-secondary, #7f8c8d);
  margin: 0;
}

.applicant-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.applicant-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
}

.status-badge {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
}

.status-pending { background: #fff3cd; color: #856404; }
.status-accepted { background: #d1ecf1; color: #0c5460; }
.status-rejected { background: #f8d7da; color: #721c24; }

.application-actions {
  display: flex;
  gap: 8px;
}

.view-all-link {
  display: inline-block;
  margin-top: 15px;
  color: var(--interactive-primary, #3498db);
  text-decoration: none;
  font-weight: 500;
}

.view-all-link:hover {
  text-decoration: underline;
}

.btn {
  padding: 8px 16px;
  border-radius: 6px;
  font-weight: 500;
  text-decoration: none;
  display: inline-block;
  border: 1px solid transparent;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s ease;
}

.btn-primary {
  background: var(--interactive-primary, #3498db);
  color: white;
  border-color: #3498db;
}

.btn-primary:hover {
  background: #2980b9;
  border-color: #2980b9;
}

.btn-success {
  background: #27ae60;
  color: white;
  border-color: #27ae60;
}

.btn-success:hover {
  background: #219a52;
}

.btn-outline {
  background: transparent;
  color: var(--text-secondary, #7f8c8d);
  border-color: #bdc3c7;
}

.btn-outline:hover {
  background: #ecf0f1;
}

.btn-sm {
  padding: 6px 12px;
  font-size: 0.8rem;
}

@media (max-width: 768px) {
  .prompt-content {
    flex-direction: column;
    text-align: center;
  }

  .action-grid, .stats-grid {
    grid-template-columns: 1fr;
  }

  .application-item, .project-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }

  .application-actions {
    align-self: flex-end;
  }
}
</style>