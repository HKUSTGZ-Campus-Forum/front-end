<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useSearch } from '~/composables/useSearch'
import { useDebounceFn } from '@vueuse/core'
import UserAvatar from '~/components/user/UserAvatar.vue'

// Props
const props = defineProps<{
  modelValue: string
  placeholder?: string
  showHistory?: boolean
}>()

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: string]
  'search': [query: string]
  'select': [type: string, item: any]
}>()

// Search composable
const {
  isSearching,
  searchResults,
  searchError,
  hasResults,
  totalResults,
  searchHistory,
  performGlobalSearch,
  goToPost,
  goToUser,
  goToCourse,
  goToSearchResults,
  clearSearchHistory
} = useSearch()

// Component state
const isDropdownOpen = ref(false)
const searchInput = ref<HTMLInputElement>()
const dropdownRef = ref<HTMLElement>()
const inputValue = ref(props.modelValue)

// Debounced search function (300ms delay)
const debouncedSearch = useDebounceFn(async (query: string) => {
  if (query.trim().length >= 2) {
    await performGlobalSearch(query.trim())
    isDropdownOpen.value = true
  } else {
    isDropdownOpen.value = false
  }
}, 300)

// Watch for input changes
watch(() => props.modelValue, (newValue) => {
  inputValue.value = newValue
})

watch(inputValue, (newValue) => {
  emit('update:modelValue', newValue)
  
  if (newValue.trim().length >= 2) {
    debouncedSearch(newValue.trim())
  } else if (newValue.trim().length === 0) {
    isDropdownOpen.value = false
  }
})

// Handle input focus
const handleFocus = () => {
  if (inputValue.value.trim().length >= 2 && hasResults.value) {
    isDropdownOpen.value = true
  } else if (inputValue.value.trim().length === 0 && searchHistory.value.length > 0 && props.showHistory) {
    isDropdownOpen.value = true
  }
}

// Handle input blur
const handleBlur = () => {
  // Delay closing to allow for clicks on dropdown items
  setTimeout(() => {
    isDropdownOpen.value = false
  }, 200)
}

// Handle search submission
const handleSearch = () => {
  const query = inputValue.value.trim()
  if (query.length >= 2) {
    emit('search', query)
    goToSearchResults(query)
    isDropdownOpen.value = false
    searchInput.value?.blur()
  }
}

// Handle keyboard navigation
const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Enter') {
    event.preventDefault()
    handleSearch()
  } else if (event.key === 'Escape') {
    isDropdownOpen.value = false
    searchInput.value?.blur()
  }
}

// Handle item selection
const selectItem = (type: string, item: any) => {
  emit('select', type, item)
  isDropdownOpen.value = false
  searchInput.value?.blur()
  
  // Navigate based on type
  switch (type) {
    case 'post':
      goToPost(item.id)
      break
    case 'user':
      goToUser(item.id)
      break
    case 'course':
      goToCourse(item.id)
      break
    case 'tag':
      goToSearchResults(item.name, 'posts')
      break
  }
}

// Handle history item click
const selectHistoryItem = (query: string) => {
  inputValue.value = query
  handleSearch()
}

// Clear search input
const clearInput = () => {
  inputValue.value = ''
  emit('update:modelValue', '')
  isDropdownOpen.value = false
  nextTick(() => {
    searchInput.value?.focus()
  })
}

// Handle click outside
const handleClickOutside = (event: Event) => {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target as Node)) {
    isDropdownOpen.value = false
  }
}

// Lifecycle
onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})

// Strip HTML tags from highlighted text for display
const stripHtml = (html: string) => {
  return html.replace(/<[^>]*>/g, '')
}
</script>

<template>
  <div class="search-dropdown" ref="dropdownRef">
    <div class="search-input-container">
      <input
        ref="searchInput"
        v-model="inputValue"
        type="text"
        class="search-input"
        :placeholder="placeholder || '搜索帖子、用户、课程...'"
        @focus="handleFocus"
        @blur="handleBlur"
        @keydown="handleKeydown"
      />
      
      <!-- Search button -->
      <button
        class="search-button"
        type="button"
        @click="handleSearch"
        :disabled="inputValue.trim().length < 2"
      >
        <i v-if="!isSearching" class="fas fa-search"></i>
        <i v-else class="fas fa-spinner fa-spin"></i>
      </button>
      
      <!-- Clear button -->
      <button
        v-if="inputValue.length > 0"
        class="clear-button"
        type="button"
        @click="clearInput"
      >
        <i class="fas fa-times"></i>
      </button>
    </div>
    
    <!-- Search dropdown -->
    <div v-if="isDropdownOpen" class="search-results-dropdown">
      <!-- Loading state -->
      <div v-if="isSearching" class="dropdown-section">
        <div class="loading-item">
          <i class="fas fa-spinner fa-spin"></i>
          <span>搜索中...</span>
        </div>
      </div>
      
      <!-- Error state -->
      <div v-else-if="searchError" class="dropdown-section">
        <div class="error-item">
          <i class="fas fa-exclamation-triangle"></i>
          <span>{{ searchError }}</span>
        </div>
      </div>
      
      <!-- Search history (when no query) -->
      <div v-else-if="inputValue.trim().length === 0 && searchHistory.length > 0 && showHistory" class="dropdown-section">
        <div class="section-header">
          <span>最近搜索</span>
          <button @click="clearSearchHistory" class="clear-history-btn">
            <i class="fas fa-trash"></i>
            清除
          </button>
        </div>
        <div class="history-list">
          <button
            v-for="query in searchHistory"
            :key="query"
            class="history-item"
            @click="selectHistoryItem(query)"
          >
            <i class="fas fa-history"></i>
            <span>{{ query }}</span>
          </button>
        </div>
      </div>
      
      <!-- Search results -->
      <div v-else-if="hasResults">
        <!-- Posts section -->
        <div v-if="searchResults.posts.length > 0" class="dropdown-section">
          <div class="section-header">
            <i class="fas fa-file-alt"></i>
            <span>帖子 ({{ searchResults.posts.length }})</span>
          </div>
          <div class="results-list">
            <div
              v-for="post in searchResults.posts"
              :key="post.id"
              class="result-item post-item"
              @click="selectItem('post', post)"
            >
              <div class="post-info">
                <h4 class="post-title" v-html="post.title_highlighted"></h4>
                <p class="post-excerpt">{{ post.content_excerpt }}</p>
                <div class="post-meta">
                  <UserAvatar
                    :avatar-url="post.author_avatar"
                    :username="post.author"
                    size="xs"
                    :clickable="false"
                  />
                  <span class="author-name">{{ post.author }}</span>
                  <span class="post-stats">
                    <i class="fas fa-heart"></i> {{ post.reaction_count }}
                    <i class="fas fa-comment"></i> {{ post.comment_count }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Users section -->
        <div v-if="searchResults.users.length > 0" class="dropdown-section">
          <div class="section-header">
            <i class="fas fa-users"></i>
            <span>用户 ({{ searchResults.users.length }})</span>
          </div>
          <div class="results-list">
            <div
              v-for="user in searchResults.users"
              :key="user.id"
              class="result-item user-item"
              @click="selectItem('user', user)"
            >
              <UserAvatar
                :avatar-url="user.profile_picture_url"
                :username="user.username"
                size="sm"
                :clickable="false"
              />
              <div class="user-info">
                <h4 class="user-name" v-html="user.username_highlighted"></h4>
                <span class="user-role">{{ user.role_name }}</span>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Tags section -->
        <div v-if="searchResults.tags.length > 0" class="dropdown-section">
          <div class="section-header">
            <i class="fas fa-tags"></i>
            <span>标签 ({{ searchResults.tags.length }})</span>
          </div>
          <div class="results-list">
            <div
              v-for="tag in searchResults.tags"
              :key="tag.id"
              class="result-item tag-item"
              @click="selectItem('tag', tag)"
            >
              <i class="fas fa-tag"></i>
              <div class="tag-info">
                <h4 class="tag-name" v-html="tag.name_highlighted"></h4>
                <span class="tag-count">{{ tag.post_count }} 个帖子</span>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Courses section -->
        <div v-if="searchResults.courses.length > 0" class="dropdown-section">
          <div class="section-header">
            <i class="fas fa-book"></i>
            <span>课程 ({{ searchResults.courses.length }})</span>
          </div>
          <div class="results-list">
            <div
              v-for="course in searchResults.courses"
              :key="course.id"
              class="result-item course-item"
              @click="selectItem('course', course)"
            >
              <i class="fas fa-graduation-cap"></i>
              <div class="course-info">
                <h4 class="course-code" v-html="course.code_highlighted"></h4>
                <p class="course-name" v-html="course.name_highlighted"></p>
              </div>
            </div>
          </div>
        </div>
        
        <!-- View all results -->
        <div class="dropdown-footer">
          <button class="view-all-btn" @click="handleSearch">
            <i class="fas fa-search"></i>
            查看全部 {{ totalResults }} 个结果
          </button>
        </div>
      </div>
      
      <!-- No results -->
      <div v-else-if="inputValue.trim().length >= 2" class="dropdown-section">
        <div class="no-results">
          <i class="fas fa-search"></i>
          <span>没有找到相关结果</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.search-dropdown {
  position: relative;
  width: 100%;
}

.search-input-container {
  position: relative;
  display: flex;
  align-items: center;
}

.search-input {
  flex: 1;
  padding: 0.5rem 3rem 0.5rem 1rem;
  font-size: 0.875rem;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  background: white;
  transition: all 0.2s ease;
  
  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
  
  &::placeholder {
    color: #9ca3af;
  }
}

.search-button {
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: #6b7280;
  cursor: pointer;
  padding: 0.25rem;
  transition: color 0.2s ease;
  
  &:hover:not(:disabled) {
    color: #3b82f6;
  }
  
  &:disabled {
    color: #d1d5db;
    cursor: not-allowed;
  }
}

.clear-button {
  position: absolute;
  right: 2.5rem;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: #9ca3af;
  cursor: pointer;
  padding: 0.25rem;
  transition: color 0.2s ease;
  
  &:hover {
    color: #ef4444;
  }
}

.search-results-dropdown {
  position: absolute;
  top: calc(100% + 0.25rem);
  left: 0;
  right: 0;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  max-height: 32rem;
  overflow-y: auto;
  z-index: 50;
}

.dropdown-section {
  border-bottom: 1px solid #f3f4f6;
  
  &:last-child {
    border-bottom: none;
  }
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem 0.5rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  
  i {
    margin-right: 0.5rem;
  }
  
  .clear-history-btn {
    background: none;
    border: none;
    color: #ef4444;
    cursor: pointer;
    font-size: 0.75rem;
    padding: 0.25rem;
    transition: color 0.2s ease;
    
    &:hover {
      color: #dc2626;
    }
    
    i {
      margin-right: 0.25rem;
    }
  }
}

.results-list {
  padding: 0 0.5rem 0.5rem;
}

.result-item {
  display: flex;
  align-items: center;
  padding: 0.75rem 0.5rem;
  border-radius: 0.375rem;
  cursor: pointer;
  transition: background-color 0.2s ease;
  
  &:hover {
    background-color: #f9fafb;
  }
}

.post-item {
  align-items: flex-start;
  
  .post-info {
    flex: 1;
    min-width: 0;
    
    .post-title {
      font-size: 0.875rem;
      font-weight: 600;
      color: #1f2937;
      margin: 0 0 0.25rem;
      line-height: 1.4;
      
      :deep(mark) {
        background-color: #fef3c7;
        color: #92400e;
        padding: 0.125rem 0.25rem;
        border-radius: 0.25rem;
      }
    }
    
    .post-excerpt {
      font-size: 0.75rem;
      color: #6b7280;
      margin: 0 0 0.5rem;
      line-height: 1.4;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    
    .post-meta {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.75rem;
      color: #9ca3af;
      
      .author-name {
        font-weight: 500;
        color: #6b7280;
      }
      
      .post-stats {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        margin-left: auto;
        
        i {
          margin-right: 0.25rem;
        }
      }
    }
  }
}

.user-item {
  .user-info {
    margin-left: 0.75rem;
    
    .user-name {
      font-size: 0.875rem;
      font-weight: 600;
      color: #1f2937;
      margin: 0 0 0.125rem;
      
      :deep(mark) {
        background-color: #fef3c7;
        color: #92400e;
        padding: 0.125rem 0.25rem;
        border-radius: 0.25rem;
      }
    }
    
    .user-role {
      font-size: 0.75rem;
      color: #6b7280;
    }
  }
}

.tag-item, .course-item {
  i {
    color: #3b82f6;
    margin-right: 0.75rem;
    font-size: 1rem;
  }
  
  .tag-info, .course-info {
    h4 {
      font-size: 0.875rem;
      font-weight: 600;
      color: #1f2937;
      margin: 0 0 0.125rem;
      
      :deep(mark) {
        background-color: #fef3c7;
        color: #92400e;
        padding: 0.125rem 0.25rem;
        border-radius: 0.25rem;
      }
    }
    
    .tag-count, .course-name {
      font-size: 0.75rem;
      color: #6b7280;
    }
  }
}

.loading-item, .error-item, .no-results {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem 1rem;
  color: #6b7280;
  font-size: 0.875rem;
  
  i {
    margin-right: 0.5rem;
  }
}

.error-item {
  color: #ef4444;
}

.history-list {
  padding: 0 0.5rem 0.5rem;
}

.history-item {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 0.5rem;
  background: none;
  border: none;
  text-align: left;
  border-radius: 0.375rem;
  cursor: pointer;
  transition: background-color 0.2s ease;
  
  &:hover {
    background-color: #f9fafb;
  }
  
  i {
    color: #9ca3af;
    margin-right: 0.75rem;
  }
  
  span {
    color: #6b7280;
    font-size: 0.875rem;
  }
}

.dropdown-footer {
  padding: 0.75rem 1rem;
  border-top: 1px solid #f3f4f6;
}

.view-all-btn {
  width: 100%;
  padding: 0.5rem 1rem;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 0.375rem;
  color: #374151;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: #f3f4f6;
    border-color: #d1d5db;
  }
  
  i {
    margin-right: 0.5rem;
  }
}

// Responsive design
@media (max-width: 768px) {
  .search-results-dropdown {
    max-height: 24rem;
  }
  
  .post-item .post-meta .post-stats {
    display: none;
  }
}
</style>