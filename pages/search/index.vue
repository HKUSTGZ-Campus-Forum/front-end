<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useHead, useI18n, useLocalePath } from '#imports'
import { useSearch } from '~/composables/useSearch'
import UserAvatar from '~/components/user/UserAvatar.vue'
import SearchDropdown from '~/components/ui/SearchDropdown.vue'

definePageMeta({ layout: 'keguang' })

const { t } = useI18n()
const localePath = useLocalePath()
const { formatRelativeTime } = useDateFormat()

useHead(() => ({
  title: t('searchPage.pageTitle'),
  meta: [{ name: 'description', content: t('searchPage.metaDescription') }],
}))

const route = useRoute()
const router = useRouter()
const {
  searchQuery, detailedPosts, postsPagination, postsLoading, searchError,
  hasDetailedResults, searchPosts, searchUsers, searchTags, searchCourses,
  goToPost, goToUser, goToCourse
} = useSearch()

const activeTab = ref('posts')
const sortBy = ref('relevance')
const currentQuery = ref('')
const isInitialLoad = ref(true)

const usersResults = ref([])
const usersPagination = ref(null)
const usersLoading = ref(false)
const tagsResults = ref([])
const tagsLoading = ref(false)
const coursesResults = ref([])
const coursesLoading = ref(false)

const searchTabs = computed(() => [
  { id: 'posts', label: t('search.tabs.posts'), icon: '📝' },
  { id: 'users', label: t('search.tabs.users'), icon: '👥' },
  { id: 'tags', label: t('search.tabs.tags'), icon: '🏷' },
  { id: 'courses', label: t('search.tabs.courses'), icon: '📚' }
])

const sortOptions = computed(() => [
  { value: 'relevance', label: t('searchPage.sort.relevance') },
  { value: 'date', label: t('searchPage.sort.date') },
  { value: 'popularity', label: t('searchPage.sort.popularity') }
])

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

const performSearch = async (query: string, type: string = activeTab.value, page = 1) => {
  if (!query || query.trim().length < 2) return
  try {
    switch (type) {
      case 'posts': await searchPosts(query.trim(), page, sortBy.value); break
      case 'users':
        usersLoading.value = true
        const userResults = await searchUsers(query.trim(), page)
        usersResults.value = userResults.results
        usersPagination.value = userResults.pagination
        usersLoading.value = false; break
      case 'tags':
        tagsLoading.value = true
        tagsResults.value = await searchTags(query.trim(), 50)
        tagsLoading.value = false; break
      case 'courses':
        coursesLoading.value = true
        coursesResults.value = await searchCourses(query.trim(), 50)
        coursesLoading.value = false; break
    }
  } catch (error) { console.error('Search failed:', error) }
}

const changeTab = (tabId: string) => {
  activeTab.value = tabId
  router.push({ path: localePath('/search'), query: { q: currentQuery.value, type: tabId } })
  if (currentQuery.value) performSearch(currentQuery.value, tabId)
}

const changeSortBy = (newSort: string) => {
  sortBy.value = newSort
  if (currentQuery.value && activeTab.value === 'posts') performSearch(currentQuery.value, 'posts', 1)
}

const goToPage = (page: number) => {
  if (currentQuery.value) performSearch(currentQuery.value, activeTab.value, page)
}

const handleNewSearch = (query: string) => {
  currentQuery.value = query
  searchQuery.value = query
  router.push({ path: localePath('/search'), query: { q: query, type: activeTab.value } })
  performSearch(query, activeTab.value)
}

const formatTimeAgo = (dateString: string) => {
  return formatRelativeTime(dateString)
}

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

watch(() => route.query, () => {
  if (!isInitialLoad.value) initializeSearch()
}, { deep: true })

onMounted(() => {
  initializeSearch()
  isInitialLoad.value = false
})
</script>

<template>
  <div class="kg-search">
    <div class="kg-search-header">
      <h1 class="kg-page-title">{{ t("searchPage.title") }}</h1>
      <div class="kg-search-box">
        <SearchDropdown
          v-model="currentQuery"
          :placeholder="t('search.placeholder')"
          @search="handleNewSearch"
        />
      </div>
    </div>

    <div v-if="currentQuery" class="kg-search-body">
      <div class="kg-search-meta">
        <span class="kg-result-label">
          {{ t("searchPage.keywordLabel") }}<strong>{{ currentQuery }}</strong>
        </span>
        <div v-if="activeTab === 'posts'" class="kg-sort-row">
          <span class="kg-sort-label">{{ t("searchPage.sort.label") }}</span>
          <button
            v-for="opt in sortOptions"
            :key="opt.value"
            :class="['kg-sort-btn', { active: sortBy === opt.value }]"
            @click="changeSortBy(opt.value)"
          >{{ opt.label }}</button>
        </div>
      </div>

      <div class="kg-tab-bar">
        <button
          v-for="tab in searchTabs"
          :key="tab.id"
          :class="['kg-tab', { active: activeTab === tab.id }]"
          @click="changeTab(tab.id)"
        >
          <span class="kg-tab-icon" aria-hidden="true">{{ tab.icon }}</span>
          {{ tab.label }}
        </button>
      </div>

      <div v-if="isLoading" class="kg-loading">
        <div class="kg-spinner"></div><span>{{ t("searchPage.loading") }}</span>
      </div>

      <div v-else-if="searchError" class="kg-empty">
        <div class="kg-empty-icon">⚠️</div>
        <p>{{ searchError }}</p>
      </div>

      <div v-else-if="!hasResults" class="kg-empty">
        <div class="kg-empty-icon">🔍</div>
        <p>{{ t("searchPage.empty") }}</p>
      </div>

      <template v-else>
        <div v-if="activeTab === 'posts'" class="kg-results-list">
          <NuxtLink
            v-for="post in detailedPosts"
            :key="post.id"
            :to="localePath(`/forum/posts/${post.id}`)"
            class="kg-result-card"
          >
            <h3 class="kg-result-title">{{ post.title }}</h3>
            <p class="kg-result-excerpt">{{ post.content?.slice(0, 120) }}...</p>
            <div class="kg-result-meta">
              <span>{{ post.author || t("common.unknownAuthor") }}</span>
              <span>{{ formatTimeAgo(post.created_at) }}</span>
              <span><span class="kg-result-meta-icon" aria-hidden="true">💬</span>{{ post.comment_count || 0 }}</span>
            </div>
          </NuxtLink>
        </div>

        <div v-else-if="activeTab === 'users'" class="kg-results-list">
          <NuxtLink
            v-for="u in usersResults"
            :key="u.id"
            :to="localePath(`/users/${u.id}`)"
            class="kg-result-card kg-result-card--user"
          >
            <UserAvatar
              :avatar-url="u.profile_picture_url"
              :username="u.username"
              :user-id="u.id"
              size="md"
            />
            <div class="kg-user-info">
              <p class="kg-user-name">{{ u.username }}</p>
              <p class="kg-user-bio">{{ u.bio || t("searchPage.userFallbackBio") }}</p>
            </div>
          </NuxtLink>
        </div>

        <div v-else-if="activeTab === 'tags'" class="kg-tags-grid">
          <NuxtLink
            v-for="tag in tagsResults"
            :key="tag.id"
            :to="localePath({ path: '/forum', query: { tag: tag.name } })"
            class="kg-tag-card"
          >
            <span class="kg-tag-name"># {{ tag.name }}</span>
            <span class="kg-tag-count">{{ t("search.tagPostCount", { count: tag.post_count || 0 }) }}</span>
          </NuxtLink>
        </div>

        <div v-else-if="activeTab === 'courses'" class="kg-results-list">
          <NuxtLink
            v-for="course in coursesResults"
            :key="course.id"
            :to="localePath(`/courses/${course.id}`)"
            class="kg-result-card"
          >
            <div class="kg-result-header">
              <span class="kg-course-code">{{ course.code }}</span>
              <h3 class="kg-result-title">{{ course.name }}</h3>
            </div>
            <p class="kg-result-excerpt">{{ course.description?.slice(0, 100) }}</p>
          </NuxtLink>
        </div>

        <div v-if="currentPagination && currentPagination.total_pages > 1" class="kg-pagination">
          <button
            class="kg-page-btn"
            :disabled="currentPagination.current_page <= 1"
            @click="goToPage(currentPagination.current_page - 1)"
          >{{ t("searchPage.pagination.previous") }}</button>
          <span class="kg-page-info">{{ currentPagination.current_page }} / {{ currentPagination.total_pages }}</span>
          <button
            class="kg-page-btn"
            :disabled="currentPagination.current_page >= currentPagination.total_pages"
            @click="goToPage(currentPagination.current_page + 1)"
          >{{ t("searchPage.pagination.next") }}</button>
        </div>
      </template>
    </div>

    <div v-else class="kg-search-placeholder">
      <div class="kg-placeholder-icon">🔍</div>
      <p>{{ t("searchPage.placeholder") }}</p>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.kg-search {
  width: 100%;
  max-width: 900px;
  margin: 0 auto;
  padding: 24px 20px 60px;
}

.kg-search-header {
  margin-bottom: 24px;
}

.kg-page-title {
  font-size: 1.6rem;
  font-weight: 700;
  color: #1a2a4a;
  margin: 0 0 16px;
}

.kg-search-box { width: 100%; }

.kg-search-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 10px;
}

.kg-result-label {
  font-size: 0.9rem;
  color: #4a6080;
  strong { color: #1a2a4a; }
}

.kg-sort-row { display: flex; align-items: center; gap: 6px; }
.kg-sort-label { font-size: 0.85rem; color: #6a85a0; }

.kg-sort-btn {
  padding: 5px 14px;
  border: 1.5px solid #c8dff8;
  border-radius: 12px;
  background: #F5FBFE;
  color: #4a6080;
  font-size: 0.825rem;
  cursor: pointer;
  transition: all 0.2s;
  &:hover { border-color: #26a4ff; color: #26a4ff; }
  &.active { background: #26a4ff; border-color: #26a4ff; color: #fff; font-weight: 600; }
}

.kg-tab-bar {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
  border-bottom: 1.5px solid #c8dff8;
  padding-bottom: 12px;
}

.kg-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 18px;
  border: 1.5px solid transparent;
  border-radius: 12px 12px 0 0;
  background: transparent;
  color: #4a6080;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
  &:hover { color: #26a4ff; }
  &.active { background: #26a4ff; border-color: #26a4ff; color: #fff; font-weight: 600; }
}

.kg-tab-icon {
  font-size: 0.86rem;
  line-height: 1;
}

.kg-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 60px;
  color: #4a6080;
}

.kg-spinner {
  width: 28px;
  height: 28px;
  border: 3px solid #c8dff8;
  border-top-color: #26a4ff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

.kg-empty, .kg-search-placeholder {
  text-align: center;
  padding: 60px 20px;
  color: #6a85a0;
  .kg-empty-icon, .kg-placeholder-icon { font-size: 3rem; margin-bottom: 12px; }
  p { margin: 0; font-size: 0.95rem; }
}

.kg-results-list { display: flex; flex-direction: column; gap: 10px; }

.kg-result-card {
  display: block;
  background: #F5FBFE;
  border: 1.5px solid #c8dff8;
  border-radius: 14px;
  padding: 16px 20px;
  text-decoration: none;
  transition: all 0.2s;
  box-shadow: 0 2px 10px rgba(40, 57, 101, 0.05);
  &:hover { border-color: #26a4ff; transform: translateY(-1px); box-shadow: 0 4px 16px rgba(40, 57, 101, 0.1); }
  &--user {
    display: flex;
    align-items: center;
    gap: 14px;
  }
}

.kg-result-header { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }
.kg-course-code { font-size: 0.78rem; font-weight: 700; color: #26a4ff; background: rgba(38,164,255,0.1); border-radius: 6px; padding: 2px 8px; }

.kg-result-title {
  font-size: 0.97rem;
  font-weight: 600;
  color: #1a2a4a;
  margin: 0 0 6px;
  line-height: 1.4;
}

.kg-result-excerpt {
  font-size: 0.85rem;
  color: #4a6080;
  margin: 0 0 8px;
  line-height: 1.5;
}

.kg-result-meta {
  display: flex;
  gap: 14px;
  font-size: 0.78rem;
  color: #9ab0c6;
}

.kg-result-meta-icon {
  margin-right: 3px;
  font-size: 0.78rem;
}

.kg-user-info { flex: 1; }
.kg-user-name { margin: 0 0 4px; font-size: 0.93rem; font-weight: 600; color: #1a2a4a; }
.kg-user-bio { margin: 0; font-size: 0.83rem; color: #6a85a0; }

.kg-tags-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.kg-tag-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 10px 18px;
  background: #F5FBFE;
  border: 1.5px solid #c8dff8;
  border-radius: 12px;
  text-decoration: none;
  transition: all 0.2s;
  &:hover { border-color: #26a4ff; background: rgba(38,164,255,0.05); }
}

.kg-tag-name { font-size: 0.9rem; font-weight: 600; color: #26a4ff; }
.kg-tag-count { font-size: 0.75rem; color: #9ab0c6; }

.kg-pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 24px 0 0;
}

.kg-page-btn {
  padding: 7px 20px;
  border: 1.5px solid #c8dff8;
  border-radius: 14px;
  background: #F5FBFE;
  color: #4a6080;
  cursor: pointer;
  font-size: 0.875rem;
  transition: all 0.2s;
  &:hover:not(:disabled) { border-color: #26a4ff; color: #26a4ff; }
  &:disabled { opacity: 0.4; cursor: not-allowed; }
}

.kg-page-info { font-size: 0.875rem; color: #4a6080; }
</style>
