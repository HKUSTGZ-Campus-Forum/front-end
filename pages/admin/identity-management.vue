<template>
  <div class="admin-identity-management">
    <div class="page-header">
      <h1>身份认证管理</h1>
      <p class="page-description">
        审核和管理用户身份验证申请。
      </p>
    </div>

    <!-- Stats Overview -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-number">{{ stats.pending }}</div>
        <div class="stat-label">待审核</div>
        <div class="stat-icon pending">⏳</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">{{ stats.approved }}</div>
        <div class="stat-label">已认证</div>
        <div class="stat-icon approved">✓</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">{{ stats.rejected }}</div>
        <div class="stat-label">已拒绝</div>
        <div class="stat-icon rejected">✕</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">{{ stats.total }}</div>
        <div class="stat-label">总申请数</div>
        <div class="stat-icon total">📊</div>
      </div>
    </div>

    <!-- Filters and Controls -->
    <div class="controls-section">
      <div class="filters">
        <div class="filter-group">
          <label>状态筛选:</label>
          <select v-model="selectedStatus" @change="applyFilters">
            <option value="">全部状态</option>
            <option value="pending">待审核</option>
            <option value="approved">已认证</option>
            <option value="rejected">已拒绝</option>
            <option value="revoked">已撤销</option>
          </select>
        </div>
        
        <div class="filter-group">
          <label>身份类型:</label>
          <select v-model="selectedType" @change="applyFilters">
            <option value="">全部类型</option>
            <option 
              v-for="identityType in identityTypes"
              :key="identityType.id"
              :value="identityType.id"
            >
              {{ identityType.display_name }}
            </option>
          </select>
        </div>
        
        <div class="filter-group">
          <label>排序:</label>
          <select v-model="sortOrder" @change="applyFilters">
            <option value="newest">最新申请</option>
            <option value="oldest">最早申请</option>
            <option value="priority">优先审核</option>
          </select>
        </div>
      </div>
      
      <div class="actions">
        <button @click="refreshData" class="btn btn-secondary" :disabled="loading">
          <span v-if="loading" class="loading-spinner">⟳</span>
          刷新数据
        </button>
        <button 
          @click="bulkAction = 'approve'; showBulkModal = true"
          :disabled="selectedRequests.size === 0"
          class="btn btn-success"
        >
          批量通过 ({{ selectedRequests.size }})
        </button>
        <button 
          @click="bulkAction = 'reject'; showBulkModal = true"
          :disabled="selectedRequests.size === 0"
          class="btn btn-danger"
        >
          批量拒绝 ({{ selectedRequests.size }})
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading && requests.length === 0" class="loading-container">
      <span class="loading-spinner">⟳</span>
      <span>加载申请列表...</span>
    </div>

    <!-- Error State -->
    <div v-if="error" class="error-container">
      <span class="error-icon">⚠️</span>
      <div class="error-content">
        <h3>加载失败</h3>
        <p>{{ error }}</p>
        <button @click="refreshData" class="retry-btn">重试</button>
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="!loading && filteredRequests.length === 0 && !error" class="empty-state">
      <span class="empty-icon">📋</span>
      <h3>暂无申请</h3>
      <p>当前筛选条件下没有找到身份验证申请。</p>
    </div>

    <!-- Requests List -->
    <div v-if="filteredRequests.length > 0" class="requests-section">
      <!-- Select All -->
      <div class="select-all-container">
        <label class="checkbox-label">
          <input 
            type="checkbox"
            :checked="isAllSelected"
            :indeterminate="isSomeSelected"
            @change="toggleSelectAll"
          />
          <span class="checkmark"></span>
          <span class="label-text">
            {{ selectedRequests.size > 0 ? `已选择 ${selectedRequests.size} 个申请` : '全选申请' }}
          </span>
        </label>
        <div class="list-info">
          共 {{ filteredRequests.length }} 个申请
        </div>
      </div>

      <!-- Request Cards -->
      <div class="requests-list">
        <div 
          v-for="request in paginatedRequests"
          :key="request.id"
          class="request-card"
          :class="`status-${request.status}`"
        >
          <!-- Selection Checkbox -->
          <div class="card-selection">
            <label class="checkbox-label">
              <input 
                type="checkbox"
                :checked="selectedRequests.has(request.id)"
                @change="toggleRequestSelection(request.id)"
              />
              <span class="checkmark"></span>
            </label>
          </div>

          <!-- Card Content -->
          <div class="card-content">
            <!-- Header -->
            <div class="request-header">
              <div class="user-info">
                <div class="avatar-container">
                  <img 
                    v-if="request.user.profile_picture_url"
                    :src="request.user.profile_picture_url"
                    :alt="request.user.username"
                    class="user-avatar"
                  />
                  <div v-else class="user-avatar placeholder">
                    {{ request.user.username.charAt(0).toUpperCase() }}
                  </div>
                </div>
                <div class="user-details">
                  <h3 class="username">{{ request.user.username }}</h3>
                  <p class="user-email">{{ request.user.email || '未提供邮箱' }}</p>
                </div>
              </div>

              <div class="request-meta">
                <div class="status-badge" :class="`status-${request.status}`">
                  <span class="status-icon">{{ getStatusIcon(request.status) }}</span>
                  <span class="status-text">{{ getStatusText(request.status) }}</span>
                </div>
                <div class="request-time">
                  申请于 {{ formatDate(request.created_at) }}
                </div>
              </div>
            </div>

            <!-- Identity Type -->
            <div class="identity-type-section">
              <div class="identity-type-info">
                <span 
                  class="identity-icon"
                  :style="{ color: request.identity_type.color }"
                >
                  {{ getIcon(request.identity_type.icon_name) }}
                </span>
                <div class="identity-details">
                  <h4>{{ request.identity_type.display_name }}</h4>
                  <p>{{ request.identity_type.description }}</p>
                </div>
              </div>
            </div>

            <!-- Documents -->
            <div v-if="request.verification_documents" class="documents-section">
              <h5>证明材料:</h5>
              <div class="documents-grid">
                <div 
                  v-for="(doc, index) in getDocuments(request.verification_documents)"
                  :key="index"
                  class="document-item"
                  @click="viewDocument(doc)"
                >
                  <div class="document-preview">
                    <span class="document-icon">📄</span>
                  </div>
                  <div class="document-info">
                    <span class="document-name">{{ doc.name || `文档${index + 1}` }}</span>
                    <span class="document-size">{{ formatFileSize(doc.size || 0) }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- User Notes -->
            <div v-if="request.notes" class="notes-section">
              <h5>申请说明:</h5>
              <p class="user-notes">{{ request.notes }}</p>
            </div>

            <!-- Admin Actions for Pending Requests -->
            <div v-if="request.status === 'pending'" class="action-buttons">
              <button 
                @click="approveRequest(request)"
                :disabled="processing.has(request.id)"
                class="btn btn-success"
              >
                <span v-if="processing.has(request.id)" class="loading-spinner">⟳</span>
                通过申请
              </button>
              <button 
                @click="showRejectModal(request)"
                :disabled="processing.has(request.id)"
                class="btn btn-danger"
              >
                拒绝申请
              </button>
              <button 
                @click="showReviewModal(request)"
                class="btn btn-secondary"
              >
                详细审核
              </button>
            </div>

            <!-- Admin Actions for Approved Requests -->
            <div v-if="request.status === 'approved'" class="action-buttons">
              <button 
                @click="revokeRequest(request)"
                :disabled="processing.has(request.id)"
                class="btn btn-danger"
              >
                撤销认证
              </button>
            </div>

            <!-- Admin Info for Processed Requests -->
            <div v-if="request.status !== 'pending' && request.verified_by" class="admin-info">
              <div class="admin-action-info">
                <span class="admin-label">处理人:</span>
                <span class="admin-name">管理员 #{{ request.verified_by }}</span>
              </div>
              <div v-if="request.verified_at" class="admin-action-info">
                <span class="admin-label">处理时间:</span>
                <span class="admin-time">{{ formatDate(request.verified_at) }}</span>
              </div>
              <div v-if="request.notes" class="admin-notes">
                <span class="admin-label">处理备注:</span>
                <p>{{ request.notes }}</p>
              </div>
              <div v-if="request.rejection_reason" class="rejection-reason">
                <span class="admin-label">拒绝原因:</span>
                <p>{{ request.rejection_reason }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Pagination -->
      <div v-if="totalPages > 1" class="pagination">
        <button 
          @click="currentPage = 1"
          :disabled="currentPage === 1"
          class="page-btn"
        >
          首页
        </button>
        <button 
          @click="currentPage = Math.max(1, currentPage - 1)"
          :disabled="currentPage === 1"
          class="page-btn"
        >
          上一页
        </button>
        
        <span class="page-info">
          第 {{ currentPage }} 页，共 {{ totalPages }} 页
        </span>
        
        <button 
          @click="currentPage = Math.min(totalPages, currentPage + 1)"
          :disabled="currentPage === totalPages"
          class="page-btn"
        >
          下一页
        </button>
        <button 
          @click="currentPage = totalPages"
          :disabled="currentPage === totalPages"
          class="page-btn"
        >
          末页
        </button>
      </div>
    </div>

    <!-- Modals -->
    <!-- Review Modal -->
    <div v-if="showReviewModalFlag && currentRequest" class="modal-overlay" @click="closeReviewModal">
      <div class="modal-content large" @click.stop>
        <div class="modal-header">
          <h3>详细审核申请</h3>
          <button @click="closeReviewModal" class="modal-close">✕</button>
        </div>
        
        <div class="modal-body">
          <div class="review-sections">
            <!-- User Information -->
            <section class="review-section">
              <h4>申请人信息</h4>
              <div class="user-review-info">
                <div class="info-row">
                  <span class="label">用户名:</span>
                  <span class="value">{{ currentRequest.user.username }}</span>
                </div>
                <div class="info-row">
                  <span class="label">邮箱:</span>
                  <span class="value">{{ currentRequest.user.email || '未提供' }}</span>
                </div>
                <div class="info-row">
                  <span class="label">申请时间:</span>
                  <span class="value">{{ formatDate(currentRequest.created_at) }}</span>
                </div>
              </div>
            </section>

            <!-- Identity Type -->
            <section class="review-section">
              <h4>申请身份类型</h4>
              <div class="identity-review">
                <div class="identity-type-card">
                  <span 
                    class="identity-icon large"
                    :style="{ color: currentRequest.identity_type.color }"
                  >
                    {{ getIcon(currentRequest.identity_type.icon_name) }}
                  </span>
                  <div class="identity-details">
                    <h5>{{ currentRequest.identity_type.display_name }}</h5>
                    <p>{{ currentRequest.identity_type.description }}</p>
                  </div>
                </div>
              </div>
            </section>

            <!-- Documents Review -->
            <section v-if="currentRequest.verification_documents" class="review-section">
              <h4>证明材料审核</h4>
              <div class="documents-review">
                <div 
                  v-for="(doc, index) in getDocuments(currentRequest.verification_documents)"
                  :key="index"
                  class="document-review-item"
                >
                  <div class="document-preview large">
                    <span class="document-icon">📄</span>
                  </div>
                  <div class="document-details">
                    <h6>{{ doc.name || `文档${index + 1}` }}</h6>
                    <p class="document-meta">
                      大小: {{ formatFileSize(doc.size || 0) }}
                      <br />
                      类型: {{ doc.type || '未知' }}
                    </p>
                    <div class="document-actions">
                      <button @click="viewDocument(doc)" class="btn btn-sm btn-secondary">
                        查看文档
                      </button>
                      <button @click="downloadDocument(doc)" class="btn btn-sm btn-outline">
                        下载
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <!-- Notes -->
            <section v-if="currentRequest.notes" class="review-section">
              <h4>申请说明</h4>
              <div class="notes-review">
                <p>{{ currentRequest.notes }}</p>
              </div>
            </section>
          </div>
        </div>

        <div class="modal-actions">
          <button @click="closeReviewModal" class="btn btn-secondary">关闭</button>
          <button 
            @click="rejectFromModal"
            :disabled="processing.has(currentRequest.id)"
            class="btn btn-danger"
          >
            拒绝申请
          </button>
          <button 
            @click="approveFromModal"
            :disabled="processing.has(currentRequest.id)"
            class="btn btn-success"
          >
            <span v-if="processing.has(currentRequest.id)" class="loading-spinner">⟳</span>
            通过申请
          </button>
        </div>
      </div>
    </div>

    <!-- Reject Modal -->
    <div v-if="showRejectModalFlag && requestToReject" class="modal-overlay" @click="closeRejectModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>拒绝申请</h3>
          <button @click="closeRejectModal" class="modal-close">✕</button>
        </div>
        
        <div class="modal-body">
          <div class="reject-form">
            <div class="form-group">
              <label>拒绝原因 *</label>
              <textarea 
                v-model="rejectReason"
                placeholder="请输入拒绝申请的具体原因..."
                rows="4"
                required
              ></textarea>
            </div>
            
            <div class="form-group">
              <label>管理员备注 (可选)</label>
              <textarea 
                v-model="rejectNotes"
                placeholder="内部备注，用户不可见..."
                rows="3"
              ></textarea>
            </div>
          </div>
        </div>

        <div class="modal-actions">
          <button @click="closeRejectModal" class="btn btn-secondary">取消</button>
          <button 
            @click="confirmReject"
            :disabled="!rejectReason.trim() || rejecting"
            class="btn btn-danger"
          >
            <span v-if="rejecting" class="loading-spinner">⟳</span>
            确认拒绝
          </button>
        </div>
      </div>
    </div>

    <!-- Bulk Action Modal -->
    <div v-if="showBulkModal" class="modal-overlay" @click="closeBulkModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>{{ bulkAction === 'approve' ? '批量通过' : '批量拒绝' }}</h3>
          <button @click="closeBulkModal" class="modal-close">✕</button>
        </div>
        
        <div class="modal-body">
          <p>您即将{{ bulkAction === 'approve' ? '通过' : '拒绝' }} {{ selectedRequests.size }} 个申请：</p>
          
          <div class="bulk-list">
            <div 
              v-for="requestId in Array.from(selectedRequests)"
              :key="requestId"
              class="bulk-item"
            >
              <span class="user-name">
                {{ requests.find(r => r.id === requestId)?.user.username }}
              </span>
              <span class="identity-name">
                {{ requests.find(r => r.id === requestId)?.identity_type.display_name }}
              </span>
            </div>
          </div>

          <div v-if="bulkAction === 'reject'" class="bulk-reject-form">
            <div class="form-group">
              <label>批量拒绝原因 *</label>
              <textarea 
                v-model="bulkRejectReason"
                placeholder="请输入拒绝这些申请的原因..."
                rows="3"
                required
              ></textarea>
            </div>
          </div>
        </div>

        <div class="modal-actions">
          <button @click="closeBulkModal" class="btn btn-secondary">取消</button>
          <button 
            @click="confirmBulkAction"
            :disabled="bulkAction === 'reject' && !bulkRejectReason.trim()"
            class="btn"
            :class="bulkAction === 'approve' ? 'btn-success' : 'btn-danger'"
          >
            确认{{ bulkAction === 'approve' ? '通过' : '拒绝' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Success/Error Toast -->
    <div v-if="toast.show" class="toast" :class="toast.type">
      <span class="toast-icon">{{ toast.type === 'success' ? '✓' : '⚠️' }}</span>
      <span>{{ toast.message }}</span>
      <button @click="hideToast" class="toast-close">✕</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useIdentity } from '~/composables/useIdentity'
import type { IdentityManagementItem, IdentityType } from '~/types/identity'

// Page meta
definePageMeta({
  middleware: 'admin',
  layout: 'admin'
})

// Composables
const {
  identityTypes,
  pendingRequests,
  loading,
  error,
  fetchIdentityTypes,
  fetchPendingRequests,
  approveIdentityRequest,
  rejectIdentityRequest,
  revokeIdentity
} = useIdentity()

// State
const requests = ref<IdentityManagementItem[]>([])
const selectedRequests = ref(new Set<number>())
const processing = ref(new Set<number>())

// Filters
const selectedStatus = ref('')
const selectedType = ref('')
const sortOrder = ref('newest')

// Pagination
const currentPage = ref(1)
const itemsPerPage = 10

// Modals
const showReviewModalFlag = ref(false)
const currentRequest = ref<IdentityManagementItem | null>(null)
const showRejectModalFlag = ref(false)
const requestToReject = ref<IdentityManagementItem | null>(null)
const showBulkModal = ref(false)
const bulkAction = ref<'approve' | 'reject'>('approve')

// Form data
const rejectReason = ref('')
const rejectNotes = ref('')
const bulkRejectReason = ref('')
const rejecting = ref(false)

// Toast notifications
const toast = ref({
  show: false,
  type: 'success' as 'success' | 'error',
  message: ''
})

// Computed
const stats = computed(() => {
  return {
    pending: requests.value.filter(r => r.status === 'pending').length,
    approved: requests.value.filter(r => r.status === 'approved').length,
    rejected: requests.value.filter(r => r.status === 'rejected').length,
    total: requests.value.length
  }
})

const filteredRequests = computed(() => {
  let filtered = [...requests.value]

  // Filter by status
  if (selectedStatus.value) {
    filtered = filtered.filter(r => r.status === selectedStatus.value)
  }

  // Filter by type
  if (selectedType.value) {
    filtered = filtered.filter(r => r.identity_type_id === parseInt(selectedType.value))
  }

  // Sort
  filtered.sort((a, b) => {
    switch (sortOrder.value) {
      case 'newest':
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      case 'oldest':
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      case 'priority':
        // Priority: pending first, then by date
        if (a.status !== b.status) {
          if (a.status === 'pending') return -1
          if (b.status === 'pending') return 1
        }
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      default:
        return 0
    }
  })

  return filtered
})

const totalPages = computed(() => Math.ceil(filteredRequests.value.length / itemsPerPage))

const paginatedRequests = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage
  const end = start + itemsPerPage
  return filteredRequests.value.slice(start, end)
})

const isAllSelected = computed(() => {
  return paginatedRequests.value.length > 0 && 
         paginatedRequests.value.every(r => selectedRequests.value.has(r.id))
})

const isSomeSelected = computed(() => {
  return selectedRequests.value.size > 0 && !isAllSelected.value
})

// Methods
const getIcon = (iconName: string): string => {
  const iconMap: Record<string, string> = {
    'academic-cap': '🎓',
    'user-group': '👥',
    'shield-check': '🛡️',
    'star': '⭐'
  }
  return iconMap[iconName] || '🏷️'
}

const getStatusIcon = (status: string): string => {
  const statusIcons = {
    pending: '⏳',
    approved: '✓',
    rejected: '✕',
    revoked: '🚫'
  }
  return statusIcons[status as keyof typeof statusIcons] || '❓'
}

const getStatusText = (status: string): string => {
  const statusTexts = {
    pending: '待审核',
    approved: '已认证',
    rejected: '已拒绝',
    revoked: '已撤销'
  }
  return statusTexts[status as keyof typeof statusTexts] || '未知'
}

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const getDocuments = (docs: any): any[] => {
  if (!docs) return []
  if (Array.isArray(docs)) return docs
  if (typeof docs === 'object') return Object.values(docs)
  return []
}

const refreshData = async () => {
  try {
    await Promise.all([
      fetchIdentityTypes(),
      fetchAllRequests()
    ])
  } catch (err) {
    showToast('error', '刷新数据失败')
  }
}

const fetchAllRequests = async () => {
  // This would need to be implemented to fetch all requests, not just pending
  // For now, we'll use pending requests
  await fetchPendingRequests()
  requests.value = pendingRequests.value
}

const applyFilters = () => {
  currentPage.value = 1
  selectedRequests.value.clear()
}

const toggleSelectAll = () => {
  if (isAllSelected.value) {
    paginatedRequests.value.forEach(r => selectedRequests.value.delete(r.id))
  } else {
    paginatedRequests.value.forEach(r => selectedRequests.value.add(r.id))
  }
}

const toggleRequestSelection = (requestId: number) => {
  if (selectedRequests.value.has(requestId)) {
    selectedRequests.value.delete(requestId)
  } else {
    selectedRequests.value.add(requestId)
  }
}

const approveRequest = async (request: IdentityManagementItem) => {
  if (!confirm(`确定通过 ${request.user.username} 的 ${request.identity_type.display_name} 认证申请吗？`)) {
    return
  }

  try {
    processing.value.add(request.id)
    await approveIdentityRequest(request.id)
    
    // Update local state
    const index = requests.value.findIndex(r => r.id === request.id)
    if (index > -1) {
      requests.value[index].status = 'approved'
      requests.value[index].verified_at = new Date().toISOString()
    }
    
    showToast('success', '申请已通过')
  } catch (err) {
    showToast('error', '通过申请失败')
  } finally {
    processing.value.delete(request.id)
  }
}

const showRejectModal = (request: IdentityManagementItem) => {
  requestToReject.value = request
  rejectReason.value = ''
  rejectNotes.value = ''
  showRejectModalFlag.value = true
}

const closeRejectModal = () => {
  showRejectModalFlag.value = false
  requestToReject.value = null
  rejectReason.value = ''
  rejectNotes.value = ''
}

const confirmReject = async () => {
  if (!requestToReject.value || !rejectReason.value.trim()) return

  try {
    rejecting.value = true
    await rejectIdentityRequest(
      requestToReject.value.id,
      rejectReason.value.trim(),
      rejectNotes.value.trim() || undefined
    )
    
    // Update local state
    const index = requests.value.findIndex(r => r.id === requestToReject.value!.id)
    if (index > -1) {
      requests.value[index].status = 'rejected'
      requests.value[index].rejection_reason = rejectReason.value.trim()
      requests.value[index].notes = rejectNotes.value.trim()
    }
    
    showToast('success', '申请已拒绝')
    closeRejectModal()
  } catch (err) {
    showToast('error', '拒绝申请失败')
  } finally {
    rejecting.value = false
  }
}

const showReviewModal = (request: IdentityManagementItem) => {
  currentRequest.value = request
  showReviewModalFlag.value = true
}

const closeReviewModal = () => {
  showReviewModalFlag.value = false
  currentRequest.value = null
}

const approveFromModal = async () => {
  if (currentRequest.value) {
    await approveRequest(currentRequest.value)
    closeReviewModal()
  }
}

const rejectFromModal = () => {
  if (currentRequest.value) {
    closeReviewModal()
    showRejectModal(currentRequest.value)
  }
}

const revokeRequest = async (request: IdentityManagementItem) => {
  if (!confirm(`确定要撤销 ${request.user.username} 的 ${request.identity_type.display_name} 认证吗？`)) {
    return
  }

  try {
    processing.value.add(request.id)
    await revokeIdentity(request.id, '管理员撤销')
    
    // Update local state
    const index = requests.value.findIndex(r => r.id === request.id)
    if (index > -1) {
      requests.value[index].status = 'revoked'
    }
    
    showToast('success', '认证已撤销')
  } catch (err) {
    showToast('error', '撤销认证失败')
  } finally {
    processing.value.delete(request.id)
  }
}

const closeBulkModal = () => {
  showBulkModal.value = false
  bulkRejectReason.value = ''
}

const confirmBulkAction = async () => {
  if (bulkAction.value === 'reject' && !bulkRejectReason.value.trim()) return

  const requestIds = Array.from(selectedRequests.value)
  const promises = requestIds.map(id => {
    if (bulkAction.value === 'approve') {
      return approveIdentityRequest(id)
    } else {
      return rejectIdentityRequest(id, bulkRejectReason.value.trim())
    }
  })

  try {
    await Promise.all(promises)
    
    // Update local state
    requestIds.forEach(id => {
      const index = requests.value.findIndex(r => r.id === id)
      if (index > -1) {
        requests.value[index].status = bulkAction.value === 'approve' ? 'approved' : 'rejected'
        if (bulkAction.value === 'reject') {
          requests.value[index].rejection_reason = bulkRejectReason.value.trim()
        }
      }
    })
    
    showToast('success', `批量${bulkAction.value === 'approve' ? '通过' : '拒绝'}成功`)
    selectedRequests.value.clear()
    closeBulkModal()
  } catch (err) {
    showToast('error', `批量操作失败`)
  }
}

const viewDocument = (doc: any) => {
  // Open document in new tab
  if (doc.url) {
    window.open(doc.url, '_blank')
  }
}

const downloadDocument = (doc: any) => {
  // Trigger download
  if (doc.url) {
    const link = document.createElement('a')
    link.href = doc.url
    link.download = doc.name || 'document'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }
}

const showToast = (type: 'success' | 'error', message: string) => {
  toast.value = { show: true, type, message }
  setTimeout(() => {
    hideToast()
  }, 5000)
}

const hideToast = () => {
  toast.value.show = false
}

// Watch for filter changes to reset selection
watch([selectedStatus, selectedType, sortOrder], () => {
  selectedRequests.value.clear()
})

// Lifecycle
onMounted(() => {
  refreshData()
})
</script>

<style lang="scss" scoped>
// I'll provide a condensed version of the styles since this is getting quite long
.admin-identity-management {
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
  
  @media (max-width: 768px) {
    padding: 1rem;
  }
}

.page-header {
  margin-bottom: 2rem;
  text-align: center;
  
  h1 {
    color: var(--text-primary);
    margin-bottom: 0.5rem;
  }
  
  .page-description {
    color: var(--text-muted);
  }
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.stat-card {
  background: var(--surface-primary);
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: var(--shadow-small);
  position: relative;
  
  .stat-number {
    font-size: 2rem;
    font-weight: bold;
    color: var(--text-primary);
  }
  
  .stat-label {
    color: var(--text-muted);
    margin-top: 0.5rem;
  }
  
  .stat-icon {
    position: absolute;
    top: 1rem;
    right: 1rem;
    font-size: 1.5rem;
    opacity: 0.5;
  }
}

.controls-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  background: var(--surface-primary);
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: var(--shadow-small);
  
  @media (max-width: 768px) {
    flex-direction: column;
    gap: 1rem;
  }
}

.filters {
  display: flex;
  gap: 1rem;
  
  @media (max-width: 768px) {
    flex-direction: column;
  }
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  
  label {
    font-size: 0.9rem;
    color: var(--text-muted);
  }
  
  select {
    padding: 0.5rem;
    border: 1px solid var(--border-primary);
    border-radius: 4px;
    background: var(--surface-primary);
    color: var(--text-primary);
  }
}

.actions {
  display: flex;
  gap: 1rem;
  
  @media (max-width: 768px) {
    width: 100%;
  }
}

.loading-container,
.error-container {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 3rem;
  color: var(--text-muted);
}

.empty-state {
  text-align: center;
  padding: 3rem;
  color: var(--text-muted);
  
  .empty-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
    display: block;
  }
}

.select-all-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: var(--surface-secondary);
  border-radius: 8px;
  margin-bottom: 1rem;
}

.requests-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.request-card {
  background: var(--surface-primary);
  border-radius: 8px;
  box-shadow: var(--shadow-small);
  border: 1px solid var(--border-primary);
  display: flex;
  gap: 1rem;
  padding: 1.5rem;
  
  &.status-pending {
    border-left: 4px solid var(--warning);
  }
  
  &.status-approved {
    border-left: 4px solid var(--success);
  }
  
  &.status-rejected {
    border-left: 4px solid var(--error);
  }
}

.card-selection {
  display: flex;
  align-items: flex-start;
  padding-top: 0.5rem;
}

.card-content {
  flex: 1;
}

.request-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
  gap: 1rem;
}

.user-info {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.user-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  
  &.placeholder {
    background: var(--interactive-primary);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
  }
}

.status-badge {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-size: 0.9rem;
  font-weight: 500;
  
  &.status-pending {
    background: var(--warning)20;
    color: var(--warning);
  }
  
  &.status-approved {
    background: var(--success)20;
    color: var(--success);
  }
  
  &.status-rejected {
    background: var(--error)20;
    color: var(--error);
  }
}

.identity-type-section {
  margin-bottom: 1rem;
}

.identity-type-info {
  display: flex;
  gap: 1rem;
  align-items: center;
  padding: 1rem;
  background: var(--surface-secondary);
  border-radius: 6px;
}

.documents-section {
  margin-bottom: 1rem;
  
  h5 {
    margin-bottom: 0.5rem;
    color: var(--text-primary);
  }
}

.documents-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 0.75rem;
}

.document-item {
  display: flex;
  gap: 0.75rem;
  padding: 0.75rem;
  background: var(--surface-secondary);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    box-shadow: var(--shadow-small);
  }
}

.document-preview {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: var(--surface-tertiary);
  border-radius: 4px;
  
  .document-icon {
    font-size: 1.25rem;
  }
}

.action-buttons {
  display: flex;
  gap: 0.75rem;
  margin-top: 1rem;
  flex-wrap: wrap;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  margin-top: 2rem;
  padding: 1rem;
}

.page-btn {
  padding: 0.5rem 1rem;
  border: 1px solid var(--border-primary);
  background: var(--surface-primary);
  color: var(--text-primary);
  border-radius: 4px;
  cursor: pointer;
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  &:hover:not(:disabled) {
    background: var(--surface-secondary);
  }
}

// Modal styles (simplified)
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
  padding: 1rem;
}

.modal-content {
  background: var(--surface-primary);
  border-radius: 12px;
  max-width: 600px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  
  &.large {
    max-width: 800px;
  }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem 2rem;
  border-bottom: 1px solid var(--border-primary);
}

.modal-body {
  padding: 2rem;
}

.modal-actions {
  padding: 1.5rem 2rem;
  border-top: 1px solid var(--border-primary);
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
}

// Button styles
.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  
  &.btn-primary {
    background: var(--interactive-primary);
    color: white;
  }
  
  &.btn-secondary {
    background: var(--surface-secondary);
    color: var(--text-primary);
    border: 1px solid var(--border-primary);
  }
  
  &.btn-success {
    background: var(--success);
    color: white;
  }
  
  &.btn-danger {
    background: var(--error);
    color: white;
  }
  
  &.btn-sm {
    padding: 0.5rem 1rem;
    font-size: 0.9rem;
  }
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  
  input[type="checkbox"] {
    display: none;
  }
  
  .checkmark {
    width: 20px;
    height: 20px;
    border: 2px solid var(--border-primary);
    border-radius: 4px;
    position: relative;
    
    &::after {
      content: '✓';
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      color: white;
      font-size: 12px;
      opacity: 0;
    }
  }
  
  input:checked + .checkmark {
    background: var(--interactive-primary);
    border-color: var(--interactive-primary);
    
    &::after {
      opacity: 1;
    }
  }
  
  input:indeterminate + .checkmark {
    background: var(--interactive-primary);
    border-color: var(--interactive-primary);
    
    &::after {
      content: '−';
      opacity: 1;
    }
  }
}

.toast {
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  padding: 1rem 1.5rem;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  box-shadow: var(--shadow-large);
  z-index: 1001;
  
  &.success {
    background: var(--success);
    color: white;
  }
  
  &.error {
    background: var(--error);
    color: white;
  }
}

.loading-spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>