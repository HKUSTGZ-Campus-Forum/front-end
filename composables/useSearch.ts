import { ref, computed } from 'vue'
import { useApi } from './useApi'
import { useRouter } from 'vue-router'

// Types for search results
export interface SearchPost {
  id: number
  title: string
  content_excerpt: string
  title_highlighted: string
  author: string
  author_avatar?: string
  author_id: number
  reaction_count: number
  comment_count: number
  view_count: number
  created_at: string
  match_score: number
  tags: Array<{
    name: string
    type: string
  }>
}

export interface SearchUser {
  id: number
  username: string
  username_highlighted: string
  profile_picture_url?: string
  role_name: string
  created_at: string
  last_active_at?: string
}

export interface SearchTag {
  id: number
  name: string
  name_highlighted: string
  type: string
  post_count: number
}

export interface SearchCourse {
  id: number
  code: string
  name: string
  code_highlighted: string
  name_highlighted: string
  credits: number
}

export interface GlobalSearchResults {
  posts: SearchPost[]
  users: SearchUser[]
  tags: SearchTag[]
  courses: SearchCourse[]
}

export interface SearchPagination {
  page: number
  per_page: number
  total: number
  pages: number
  has_next: boolean
  has_prev: boolean
}

export function useSearch() {
  const { fetchPublic } = useApi()
  const router = useRouter()
  
  // Search state
  const isSearching = ref(false)
  const searchQuery = ref('')
  const searchResults = ref<GlobalSearchResults>({
    posts: [],
    users: [],
    tags: [],
    courses: []
  })
  const searchError = ref('')
  const lastSearchTime = ref<string>('')
  const totalResults = ref(0)
  
  // Detailed search results (for dedicated search page)
  const detailedPosts = ref<SearchPost[]>([])
  const postsPagination = ref<SearchPagination | null>(null)
  const postsLoading = ref(false)
  
  // Search history (stored in localStorage)
  const searchHistory = ref<string[]>([])
  
  // Load search history from localStorage
  const loadSearchHistory = () => {
    try {
      const stored = localStorage.getItem('search_history')
      if (stored) {
        searchHistory.value = JSON.parse(stored)
      }
    } catch (error) {
      console.error('Failed to load search history:', error)
      searchHistory.value = []
    }
  }
  
  // Save search to history
  const saveToHistory = (query: string) => {
    if (!query || query.length < 2) return
    
    // Remove if already exists
    const index = searchHistory.value.indexOf(query)
    if (index > -1) {
      searchHistory.value.splice(index, 1)
    }
    
    // Add to beginning
    searchHistory.value.unshift(query)
    
    // Keep only last 10 searches
    if (searchHistory.value.length > 10) {
      searchHistory.value = searchHistory.value.slice(0, 10)
    }
    
    // Save to localStorage
    try {
      localStorage.setItem('search_history', JSON.stringify(searchHistory.value))
    } catch (error) {
      console.error('Failed to save search history:', error)
    }
  }
  
  // Clear search history
  const clearSearchHistory = () => {
    searchHistory.value = []
    try {
      localStorage.removeItem('search_history')
    } catch (error) {
      console.error('Failed to clear search history:', error)
    }
  }
  
  // Global search (for dropdown results)
  const performGlobalSearch = async (query: string) => {
    if (!query || query.length < 2) {
      searchResults.value = { posts: [], users: [], tags: [], courses: [] }
      totalResults.value = 0
      return
    }
    
    isSearching.value = true
    searchError.value = ''
    
    try {
      const response = await fetchPublic(
        `https://dev.unikorn.axfff.com/api/search/global?q=${encodeURIComponent(query)}`
      )
      
      if (response.ok) {
        const data = await response.json()
        searchResults.value = data.results
        totalResults.value = data.total_results || 0
        lastSearchTime.value = data.search_time
        searchQuery.value = query
        
        // Save to history
        saveToHistory(query)
      } else {
        const errorData = await response.json().catch(() => ({}))
        searchError.value = errorData.error || 'Search failed'
      }
    } catch (error) {
      console.error('Search failed:', error)
      searchError.value = 'Network error occurred'
    } finally {
      isSearching.value = false
    }
  }
  
  // Detailed post search (for search results page)
  const searchPosts = async (query: string, page = 1, sortBy = 'relevance') => {
    if (!query || query.length < 2) {
      return
    }
    
    postsLoading.value = true
    searchError.value = ''
    
    try {
      const params = new URLSearchParams({
        q: query,
        page: page.toString(),
        per_page: '20',
        sort: sortBy
      })
      
      const response = await fetchPublic(
        `https://dev.unikorn.axfff.com/api/search/posts?${params}`
      )
      
      if (response.ok) {
        const data = await response.json()
        detailedPosts.value = data.results
        postsPagination.value = data.pagination
        searchQuery.value = query
        
        // Save to history
        saveToHistory(query)
      } else {
        const errorData = await response.json().catch(() => ({}))
        searchError.value = errorData.error || 'Search failed'
      }
    } catch (error) {
      console.error('Post search failed:', error)
      searchError.value = 'Network error occurred'
    } finally {
      postsLoading.value = false
    }
  }
  
  // Search users
  const searchUsers = async (query: string, page = 1) => {
    if (!query || query.length < 2) {
      return { results: [], pagination: null }
    }
    
    try {
      const params = new URLSearchParams({
        q: query,
        page: page.toString(),
        per_page: '20'
      })
      
      const response = await fetchPublic(
        `https://dev.unikorn.axfff.com/api/search/users?${params}`
      )
      
      if (response.ok) {
        const data = await response.json()
        return {
          results: data.results,
          pagination: data.pagination
        }
      } else {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'User search failed')
      }
    } catch (error) {
      console.error('User search failed:', error)
      throw error
    }
  }
  
  // Search tags
  const searchTags = async (query: string, limit = 20) => {
    if (!query || query.length < 1) {
      return []
    }
    
    try {
      const params = new URLSearchParams({
        q: query,
        limit: limit.toString()
      })
      
      const response = await fetchPublic(
        `https://dev.unikorn.axfff.com/api/search/tags?${params}`
      )
      
      if (response.ok) {
        const data = await response.json()
        return data.results
      } else {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Tag search failed')
      }
    } catch (error) {
      console.error('Tag search failed:', error)
      throw error
    }
  }
  
  // Search courses
  const searchCourses = async (query: string, limit = 20) => {
    if (!query || query.length < 2) {
      return []
    }
    
    try {
      const params = new URLSearchParams({
        q: query,
        limit: limit.toString()
      })
      
      const response = await fetchPublic(
        `https://dev.unikorn.axfff.com/api/search/courses?${params}`
      )
      
      if (response.ok) {
        const data = await response.json()
        return data.results
      } else {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Course search failed')
      }
    } catch (error) {
      console.error('Course search failed:', error)
      throw error
    }
  }
  
  // Navigation helpers
  const goToPost = (postId: number) => {
    router.push(`/forum/posts/${postId}`)
  }
  
  const goToUser = (userId: number) => {
    router.push(`/users/${userId}`)
  }
  
  const goToCourse = (courseId: number) => {
    router.push(`/courses/${courseId}`)
  }
  
  const goToSearchResults = (query: string, type = 'posts') => {
    router.push({
      path: '/search',
      query: { q: query, type }
    })
  }
  
  // Clear search state
  const clearSearch = () => {
    searchQuery.value = ''
    searchResults.value = { posts: [], users: [], tags: [], courses: [] }
    detailedPosts.value = []
    postsPagination.value = null
    searchError.value = ''
    totalResults.value = 0
  }
  
  // Computed properties
  const hasResults = computed(() => totalResults.value > 0)
  const hasError = computed(() => !!searchError.value)
  const hasDetailedResults = computed(() => detailedPosts.value.length > 0)
  
  // Initialize search history on first use
  loadSearchHistory()
  
  return {
    // State
    isSearching,
    searchQuery,
    searchResults,
    searchError,
    lastSearchTime,
    totalResults,
    detailedPosts,
    postsPagination,
    postsLoading,
    searchHistory,
    
    // Computed
    hasResults,
    hasError,
    hasDetailedResults,
    
    // Methods
    performGlobalSearch,
    searchPosts,
    searchUsers,
    searchTags,
    searchCourses,
    saveToHistory,
    clearSearchHistory,
    loadSearchHistory,
    
    // Navigation
    goToPost,
    goToUser,
    goToCourse,
    goToSearchResults,
    
    // Utilities
    clearSearch
  }
}