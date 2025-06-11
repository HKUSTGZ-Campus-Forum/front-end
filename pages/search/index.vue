<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useHead } from '#imports'
import { useSearch } from '~/composables/useSearch'
import UserAvatar from '~/components/user/UserAvatar.vue'
import SearchDropdown from '~/components/ui/SearchDropdown.vue'

// Meta information
useHead({
  title: '搜索结果',
  meta: [
    {
      name: 'description',
      content: '校园论坛搜索结果页面',
    },
  ],
})

// Composables
const route = useRoute()
const router = useRouter()
const {
  searchQuery,
  detailedPosts,
  postsPagination,
  postsLoading,
  searchError,
  hasDetailedResults,
  searchPosts,
  searchUsers,
  searchTags,
  searchCourses,
  goToPost,
  goToUser,
  goToCourse
} = useSearch()

// Component state
const activeTab = ref('posts')
const sortBy = ref('relevance')
const currentQuery = ref('')
const isInitialLoad = ref(true)

// Results for different tabs
const usersResults = ref([])
const usersPagination = ref(null)
const usersLoading = ref(false)

const tagsResults = ref([])
const tagsLoading = ref(false)

const coursesResults = ref([])
const coursesLoading = ref(false)

// Search tabs configuration
const searchTabs = [
  { id: 'posts', label: '帖子', icon: 'fas fa-file-alt' },
  { id: 'users', label: '用户', icon: 'fas fa-users' },
  { id: 'tags', label: '标签', icon: 'fas fa-tags' },
  { id: 'courses', label: '课程', icon: 'fas fa-book' }
]

// Sort options for posts
const sortOptions = [
  { value: 'relevance', label: '相关性' },
  { value: 'date', label: '最新发布' },
  { value: 'popularity', label: '热门程度' }
]

// Initialize search from URL parameters
const initializeSearch = () => {
  const query = route.query.q as string
  const type = route.query.type as string || 'posts'
  
  if (query) {
    currentQuery.value = query
    searchQuery.value = query
    activeTab.value = type
    performSearch(query, type)
  }
}

// Perform search based on active tab
const performSearch = async (query: string, type: string = activeTab.value, page = 1) => {
  if (!query || query.trim().length < 2) {
    return
  }
  
  try {
    switch (type) {
      case 'posts':
        await searchPosts(query.trim(), page, sortBy.value)
        break
      
      case 'users':
        usersLoading.value = true
        const userResults = await searchUsers(query.trim(), page)
        usersResults.value = userResults.results
        usersPagination.value = userResults.pagination
        usersLoading.value = false
        break
      
      case 'tags':
        tagsLoading.value = true
        tagsResults.value = await searchTags(query.trim(), 50)
        tagsLoading.value = false
        break
      
      case 'courses':
        coursesLoading.value = true
        coursesResults.value = await searchCourses(query.trim(), 50)
        coursesLoading.value = false
        break
    }
  } catch (error) {
    console.error('Search failed:', error)
  }
}

// Handle tab change
const changeTab = (tabId: string) => {
  activeTab.value = tabId
  
  // Update URL
  router.push({
    path: '/search',
    query: { 
      q: currentQuery.value,
      type: tabId
    }
  })
  
  // Perform search for new tab
  if (currentQuery.value) {
    performSearch(currentQuery.value, tabId)
  }
}

// Handle sort change
const changeSortBy = (newSort: string) => {
  sortBy.value = newSort
  if (currentQuery.value && activeTab.value === 'posts') {
    performSearch(currentQuery.value, 'posts', 1)
  }
}

// Handle pagination
const goToPage = (page: number) => {
  if (currentQuery.value) {
    performSearch(currentQuery.value, activeTab.value, page)
  }
}

// Handle new search
const handleNewSearch = (query: string) => {
  currentQuery.value = query
  searchQuery.value = query
  
  // Update URL
  router.push({
    path: '/search',
    query: { 
      q: query,
      type: activeTab.value
    }
  })
  
  // Perform search
  performSearch(query, activeTab.value)
}

// Format time ago
const formatTimeAgo = (dateString: string) => {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return '刚刚'
  if (diffMins < 60) return `${diffMins}分钟前`
  if (diffHours < 24) return `${diffHours}小时前`
  if (diffDays < 7) return `${diffDays}天前`
  return date.toLocaleDateString('zh-CN')
}

// Computed properties
const isLoading = computed(() => {
  switch (activeTab.value) {
    case 'posts': return postsLoading.value
    case 'users': return usersLoading.value
    case 'tags': return tagsLoading.value
    case 'courses': return coursesLoading.value
    default: return false
  }
})

const hasResults = computed(() => {
  switch (activeTab.value) {
    case 'posts': return hasDetailedResults.value
    case 'users': return usersResults.value.length > 0
    case 'tags': return tagsResults.value.length > 0
    case 'courses': return coursesResults.value.length > 0
    default: return false
  }
})

const currentPagination = computed(() => {
  switch (activeTab.value) {
    case 'posts': return postsPagination.value
    case 'users': return usersPagination.value
    default: return null
  }
})

// Watch for route changes
watch(() => route.query, () => {
  if (!isInitialLoad.value) {
    initializeSearch()
  }
}, { deep: true })

// Lifecycle
onMounted(() => {
  initializeSearch()
  isInitialLoad.value = false
})
</script>

<template>
  <HomeContainer>
    <div class="search-page">
      <div class="search-container">
      <!-- Breadcrumb and back navigation -->
      <div class="navigation-header">
        <button class="back-button" @click="$router.back()">
          <i class="fas fa-arrow-left"></i>
          返回
        </button>
        <nav class="breadcrumb">
          <NuxtLink to="/" class="breadcrumb-item">首页</NuxtLink>
          <span class="breadcrumb-separator">/</span>
          <span class="breadcrumb-item current">搜索结果</span>
        </nav>
      </div>

      <!-- Search header -->
      <div class="search-header">
        <div class="search-input-section">
          <SearchDropdown
            v-model="currentQuery"
            placeholder="搜索帖子、用户、课程..."
            :show-history="true"
            @search="handleNewSearch"
          />
        </div>
        
        <!-- Search summary -->
        <div v-if="currentQuery" class="search-summary">
          <span class="search-query">搜索：<strong>"{{ currentQuery }}"</strong></span>
          <span v-if="!isLoading && hasResults" class="result-count">
            找到相关结果
          </span>
        </div>
      </div>

      <!-- Search tabs -->
      <div class="search-tabs">
        <button
          v-for="tab in searchTabs"
          :key="tab.id"
          class="tab-button"
          :class="{ active: activeTab === tab.id }"
          @click="changeTab(tab.id)"
        >
          <i :class="tab.icon"></i>
          {{ tab.label }}
        </button>
      </div>

      <!-- Sort options (only for posts) -->
      <div v-if="activeTab === 'posts' && hasResults" class="sort-options">
        <label>排序方式：</label>
        <select v-model="sortBy" @change="changeSortBy(sortBy)" class="sort-select">
          <option
            v-for="option in sortOptions"
            :key="option.value"
            :value="option.value"
          >
            {{ option.label }}
          </option>
        </select>
      </div>

      <!-- Loading state -->
      <div v-if="isLoading" class="loading-state">
        <div class="loading-spinner"></div>
        <p>搜索中...</p>
      </div>

      <!-- Error state -->
      <div v-else-if="searchError" class="error-state">
        <i class="fas fa-exclamation-triangle"></i>
        <p>{{ searchError }}</p>
        <button @click="performSearch(currentQuery, activeTab)" class="retry-btn">
          重试
        </button>
      </div>

      <!-- Search results -->
      <div v-else-if="hasResults" class="search-results">
        <!-- Posts results -->
        <div v-if="activeTab === 'posts'" class="posts-results">
          <div
            v-for="post in detailedPosts"
            :key="post.id"
            class="post-result"
            @click="goToPost(post.id)"
          >
            <div class="post-content">
              <h3 class="post-title" v-html="post.title_highlighted"></h3>
              <p class="post-excerpt">{{ post.content_excerpt }}</p>
              
              <div class="post-meta">
                <div class="author-info">
                  <UserAvatar
                    :avatar-url="post.author_avatar"
                    :username="post.author"
                    size="xs"
                    :clickable="false"
                  />
                  <span class="author-name">{{ post.author }}</span>
                </div>
                
                <div class="post-stats">
                  <span class="stat">
                    <i class="fas fa-heart"></i>
                    {{ post.reaction_count }}
                  </span>
                  <span class="stat">
                    <i class="fas fa-comment"></i>
                    {{ post.comment_count }}
                  </span>
                  <span class="stat">
                    <i class="fas fa-eye"></i>
                    {{ post.view_count }}
                  </span>
                  <span class="post-time">
                    {{ formatTimeAgo(post.created_at) }}
                  </span>
                </div>
              </div>
              
              <!-- Tags -->
              <div v-if="post.tags && post.tags.length > 0" class="post-tags">
                <span
                  v-for="tag in post.tags.slice(0, 3)"
                  :key="tag.name"
                  class="tag"
                  :class="tag.type"
                >
                  {{ tag.name }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Users results -->
        <div v-else-if="activeTab === 'users'" class="users-results">
          <div
            v-for="user in usersResults"
            :key="user.id"
            class="user-result"
            @click="goToUser(user.id)"
          >
            <UserAvatar
              :avatar-url="user.profile_picture_url"
              :username="user.username"
              size="md"
              :clickable="false"
            />
            <div class="user-info">
              <h3 class="user-name" v-html="user.username_highlighted"></h3>
              <p class="user-role">{{ user.role_name }}</p>
              <p v-if="user.last_active_at" class="user-activity">
                最后活跃：{{ formatTimeAgo(user.last_active_at) }}
              </p>
            </div>
          </div>
        </div>

        <!-- Tags results -->
        <div v-else-if="activeTab === 'tags'" class="tags-results">
          <div
            v-for="tag in tagsResults"
            :key="tag.id"
            class="tag-result"
            @click="goToPost(0)" 
          >
            <i class="fas fa-tag"></i>
            <div class="tag-info">
              <h3 class="tag-name" v-html="tag.name_highlighted"></h3>
              <p class="tag-count">{{ tag.post_count }} 个帖子</p>
              <span class="tag-type" :class="tag.type">{{ tag.type }}</span>
            </div>
          </div>
        </div>

        <!-- Courses results -->
        <div v-else-if="activeTab === 'courses'" class="courses-results">
          <div
            v-for="course in coursesResults"
            :key="course.id"
            class="course-result"
            @click="goToCourse(course.id)"
          >
            <i class="fas fa-graduation-cap"></i>
            <div class="course-info">
              <h3 class="course-code" v-html="course.code_highlighted"></h3>
              <p class="course-name" v-html="course.name_highlighted"></p>
              <span class="course-credits">{{ course.credits }} 学分</span>
            </div>
          </div>
        </div>

        <!-- Pagination -->
        <div v-if="currentPagination && currentPagination.pages > 1" class="pagination">
          <button
            v-if="currentPagination.has_prev"
            @click="goToPage(currentPagination.page - 1)"
            class="pagination-btn"
          >
            <i class="fas fa-chevron-left"></i>
            上一页
          </button>
          
          <div class="page-numbers">
            <button
              v-for="page in Math.min(currentPagination.pages, 10)"
              :key="page"
              @click="goToPage(page)"
              class="page-btn"
              :class="{ active: page === currentPagination.page }"
            >
              {{ page }}
            </button>
          </div>
          
          <button
            v-if="currentPagination.has_next"
            @click="goToPage(currentPagination.page + 1)"
            class="pagination-btn"
          >
            下一页
            <i class="fas fa-chevron-right"></i>
          </button>
        </div>
      </div>

      <!-- No results state -->
      <div v-else-if="currentQuery && !isLoading" class="no-results">
        <i class="fas fa-search"></i>
        <h3>没有找到相关结果</h3>
        <p>尝试使用不同的关键词或检查拼写</p>
        <div class="search-suggestions">
          <h4>搜索建议：</h4>
          <ul>
            <li>使用更简短的关键词</li>
            <li>检查拼写错误</li>
            <li>尝试相关的同义词</li>
            <li>移除一些搜索词</li>
          </ul>
        </div>
      </div>

      <!-- Empty state -->
      <div v-else class="empty-state">
        <i class="fas fa-search"></i>
        <h3>开始搜索</h3>
        <p>在上方输入关键词来搜索帖子、用户、标签或课程</p>
        <div class="quick-actions">
          <NuxtLink to="/forum" class="quick-action-btn">
            <i class="fas fa-comments"></i>
            浏览论坛
          </NuxtLink>
          <NuxtLink to="/" class="quick-action-btn">
            <i class="fas fa-home"></i>
            返回首页
          </NuxtLink>
        </div>
      </div>
    </div>
  </HomeContainer>
</template>

<style lang="scss" scoped>
.search-page {
  min-height: calc(100vh - 120px);
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  padding: 2rem 0;
}

.search-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 0 1rem;
}

.navigation-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
  padding: 0 0.5rem;
}

.back-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  color: #374151;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.875rem;
  font-weight: 500;
  
  &:hover {
    background: #f9fafb;
    border-color: #d1d5db;
    transform: translateX(-2px);
  }
  
  i {
    font-size: 0.75rem;
  }
}

.breadcrumb {
  display: flex;
  align-items: center;
  font-size: 0.875rem;
  color: #6b7280;
  
  .breadcrumb-item {
    color: #6b7280;
    text-decoration: none;
    transition: color 0.2s ease;
    
    &:hover:not(.current) {
      color: #3b82f6;
    }
    
    &.current {
      color: #1f2937;
      font-weight: 500;
    }
  }
  
  .breadcrumb-separator {
    margin: 0 0.5rem;
    color: #d1d5db;
  }
}

.search-header {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
}

.search-input-section {
  margin-bottom: 1rem;
}

.search-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.875rem;
  color: #6b7280;
  
  .search-query {
    strong {
      color: #1f2937;
    }
  }
  
  .result-count {
    color: #059669;
  }
}

.search-tabs {
  display: flex;
  background: white;
  border-radius: 12px;
  padding: 0.5rem;
  margin-bottom: 1.5rem;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
  gap: 0.5rem;
}

.tab-button {
  flex: 1;
  padding: 0.75rem 1rem;
  background: transparent;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.875rem;
  font-weight: 500;
  color: #6b7280;
  
  i {
    margin-right: 0.5rem;
  }
  
  &:hover {
    background: #f9fafb;
    color: #374151;
  }
  
  &.active {
    background: #3b82f6;
    color: white;
    
    &:hover {
      background: #2563eb;
    }
  }
}

.sort-options {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
  font-size: 0.875rem;
  color: #6b7280;
  
  .sort-select {
    padding: 0.375rem 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    background: white;
    font-size: 0.875rem;
    
    &:focus {
      outline: none;
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }
  }
}

.loading-state, .error-state, .no-results, .empty-state {
  background: white;
  border-radius: 12px;
  padding: 3rem 2rem;
  text-align: center;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
  
  i {
    font-size: 3rem;
    margin-bottom: 1rem;
    opacity: 0.5;
  }
  
  h3 {
    margin: 0 0 0.5rem;
    color: #1f2937;
  }
  
  p {
    color: #6b7280;
    margin: 0;
  }
  
  .loading-spinner {
    width: 40px;
    height: 40px;
    border: 4px solid #f3f3f3;
    border-top: 4px solid #3b82f6;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto 1rem;
  }
  
  .retry-btn {
    margin-top: 1rem;
    padding: 0.5rem 1rem;
    background: #3b82f6;
    color: white;
    border: none;
    border-radius: 0.375rem;
    cursor: pointer;
    
    &:hover {
      background: #2563eb;
    }
  }
  
  .quick-actions {
    display: flex;
    gap: 1rem;
    margin-top: 2rem;
    justify-content: center;
  }
  
  .quick-action-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1.5rem;
    background: white;
    border: 2px solid #e5e7eb;
    border-radius: 0.5rem;
    color: #374151;
    text-decoration: none;
    font-weight: 500;
    transition: all 0.2s ease;
    
    &:hover {
      border-color: #3b82f6;
      color: #3b82f6;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
    }
    
    i {
      font-size: 0.875rem;
    }
  }
}

.search-suggestions {
  margin-top: 2rem;
  text-align: left;
  max-width: 300px;
  margin-left: auto;
  margin-right: auto;
  
  h4 {
    margin: 0 0 0.5rem;
    color: #374151;
    font-size: 1rem;
  }
  
  ul {
    list-style: none;
    padding: 0;
    margin: 0;
    
    li {
      padding: 0.25rem 0;
      color: #6b7280;
      font-size: 0.875rem;
      
      &:before {
        content: "•";
        color: #3b82f6;
        margin-right: 0.5rem;
      }
    }
  }
}

.search-results {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
}

// Posts results styling
.posts-results {
  .post-result {
    padding: 1.5rem;
    border-bottom: 1px solid #f3f4f6;
    cursor: pointer;
    transition: background-color 0.2s ease;
    
    &:hover {
      background: #f9fafb;
    }
    
    &:last-child {
      border-bottom: none;
    }
    
    .post-title {
      font-size: 1.125rem;
      font-weight: 600;
      color: #1f2937;
      margin: 0 0 0.5rem;
      line-height: 1.4;
      
      :deep(mark) {
        background-color: #fef3c7;
        color: #92400e;
        padding: 0.125rem 0.25rem;
        border-radius: 0.25rem;
      }
    }
    
    .post-excerpt {
      color: #6b7280;
      margin: 0 0 1rem;
      line-height: 1.5;
    }
    
    .post-meta {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1rem;
      
      .author-info {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        
        .author-name {
          font-weight: 500;
          color: #374151;
          font-size: 0.875rem;
        }
      }
      
      .post-stats {
        display: flex;
        align-items: center;
        gap: 1rem;
        font-size: 0.75rem;
        color: #9ca3af;
        
        .stat {
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }
        
        .post-time {
          margin-left: 0.5rem;
        }
      }
    }
    
    .post-tags {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
      
      .tag {
        padding: 0.25rem 0.5rem;
        border-radius: 0.375rem;
        font-size: 0.75rem;
        font-weight: 500;
        
        &.course {
          background: #dbeafe;
          color: #1d4ed8;
        }
        
        &.user {
          background: #fce7f3;
          color: #be185d;
        }
        
        &.system {
          background: #d1fae5;
          color: #047857;
        }
      }
    }
  }
}

// Users results styling
.users-results {
  .user-result {
    display: flex;
    align-items: center;
    padding: 1.5rem;
    border-bottom: 1px solid #f3f4f6;
    cursor: pointer;
    transition: background-color 0.2s ease;
    
    &:hover {
      background: #f9fafb;
    }
    
    &:last-child {
      border-bottom: none;
    }
    
    .user-info {
      margin-left: 1rem;
      
      .user-name {
        font-size: 1rem;
        font-weight: 600;
        color: #1f2937;
        margin: 0 0 0.25rem;
        
        :deep(mark) {
          background-color: #fef3c7;
          color: #92400e;
          padding: 0.125rem 0.25rem;
          border-radius: 0.25rem;
        }
      }
      
      .user-role {
        color: #6b7280;
        font-size: 0.875rem;
        margin: 0 0 0.25rem;
      }
      
      .user-activity {
        color: #9ca3af;
        font-size: 0.75rem;
        margin: 0;
      }
    }
  }
}

// Tags and courses results styling
.tags-results, .courses-results {
  .tag-result, .course-result {
    display: flex;
    align-items: center;
    padding: 1.5rem;
    border-bottom: 1px solid #f3f4f6;
    cursor: pointer;
    transition: background-color 0.2s ease;
    
    &:hover {
      background: #f9fafb;
    }
    
    &:last-child {
      border-bottom: none;
    }
    
    i {
      color: #3b82f6;
      margin-right: 1rem;
      font-size: 1.25rem;
    }
    
    .tag-info, .course-info {
      h3 {
        font-size: 1rem;
        font-weight: 600;
        color: #1f2937;
        margin: 0 0 0.25rem;
        
        :deep(mark) {
          background-color: #fef3c7;
          color: #92400e;
          padding: 0.125rem 0.25rem;
          border-radius: 0.25rem;
        }
      }
      
      p {
        color: #6b7280;
        font-size: 0.875rem;
        margin: 0 0 0.25rem;
      }
      
      .tag-type, .course-credits {
        background: #f3f4f6;
        color: #6b7280;
        padding: 0.125rem 0.5rem;
        border-radius: 0.375rem;
        font-size: 0.75rem;
        font-weight: 500;
      }
    }
  }
}

// Pagination styling
.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 1.5rem;
  border-top: 1px solid #f3f4f6;
  
  .pagination-btn, .page-btn {
    padding: 0.5rem 0.75rem;
    background: white;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 0.875rem;
    
    &:hover {
      background: #f9fafb;
      border-color: #9ca3af;
    }
    
    &.active {
      background: #3b82f6;
      color: white;
      border-color: #3b82f6;
      
      &:hover {
        background: #2563eb;
      }
    }
  }
  
  .page-numbers {
    display: flex;
    gap: 0.25rem;
  }
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

// Responsive design
@media (max-width: 768px) {
  .search-page {
    padding: 1rem 0;
  }
  
  .search-container {
    padding: 0 0.5rem;
  }
  
  .search-header {
    padding: 1rem;
  }
  
  .search-tabs {
    flex-wrap: wrap;
    
    .tab-button {
      flex: 1 1 calc(50% - 0.25rem);
    }
  }
  
  .post-meta {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
    
    .post-stats {
      gap: 0.5rem;
    }
  }
  
  .navigation-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
    
    .breadcrumb {
      align-self: stretch;
      justify-content: center;
    }
  }
  
  .pagination {
    flex-wrap: wrap;
    
    .page-numbers {
      order: -1;
      width: 100%;
      justify-content: center;
      margin-bottom: 0.5rem;
    }
  }
}
</style>