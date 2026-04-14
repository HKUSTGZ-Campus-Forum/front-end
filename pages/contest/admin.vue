<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

definePageMeta({ layout: 'keguang' })

const { isLoggedIn } = useAuth()
const { fetchWithAuth, fetchPublic } = useApi()

// ─── 权限 ────────────────────────────────────────────────────
const roleLoading  = ref(true)
const isAdmin      = ref(false)
const isOrganizer  = ref(false)
const isManager    = computed(() => isAdmin.value || isOrganizer.value)

async function fetchMyRole() {
  if (!isLoggedIn.value) { roleLoading.value = false; return }
  try {
    const res = await fetchWithAuth('/api/contest/my-role')
    if (res.ok) {
      const data = await res.json()
      isAdmin.value     = data.is_admin
      isOrganizer.value = data.is_organizer
    }
  } catch (e) {
    console.error('获取权限失败', e)
  } finally {
    roleLoading.value = false
  }
}

// ─── 比赛信息表单 ────────────────────────────────────────────
const infoLoading = ref(true)
const infoSaving  = ref(false)
const infoError   = ref('')
const infoSuccess = ref(false)

const infoForm = ref({
  title: '', description: '',
  start_time: '', end_time: '', is_active: true,
})

/** 对应前台「题目」Tab，存后端 rules 字段 */
const problemBody = ref('')
const problemSaving = ref(false)
const problemError = ref('')
const problemSuccess = ref(false)

function toLocalInput(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  const local = new Date(d.getTime() + 8 * 60 * 60000)
  return local.toISOString().slice(0, 16)
}

function toISOWithOffset(local: string): string {
  return local ? `${local}:00+08:00` : ''
}

async function fetchContestInfo() {
  infoLoading.value = true
  try {
    const res = await fetchPublic('/api/contest')
    if (res.ok) {
      const data = await res.json()
      infoForm.value = {
        title:       data.title       || '',
        description: data.description || '',
        start_time:  toLocalInput(data.start_time),
        end_time:    toLocalInput(data.end_time),
        is_active:   data.is_active ?? true,
      }
      problemBody.value = data.rules || ''
      announcementText.value = data.announcements || ''
    }
  } catch (e) {
    console.error('获取比赛信息失败', e)
  } finally {
    infoLoading.value = false
  }
}

async function saveContestInfo() {
  infoError.value = ''; infoSuccess.value = false; infoSaving.value = true
  try {
    const payload = {
      title: infoForm.value.title,
      description: infoForm.value.description,
      start_time: toISOWithOffset(infoForm.value.start_time),
      end_time:   toISOWithOffset(infoForm.value.end_time),
      is_active: infoForm.value.is_active,
    }
    const res = await fetchWithAuth('/api/contest', {
      method: 'PUT',
      body: JSON.stringify(payload) as any,
    })
    const data = await res.json()
    if (!res.ok) { infoError.value = data.error || '保存失败'; return }
    infoSuccess.value = true
    setTimeout(() => { infoSuccess.value = false }, 3000)
  } catch (e) {
    infoError.value = '网络错误，请稍后重试'
  } finally {
    infoSaving.value = false
  }
}

async function saveProblems() {
  problemError.value = ''; problemSuccess.value = false; problemSaving.value = true
  try {
    const res = await fetchWithAuth('/api/contest', {
      method: 'PUT',
      body: JSON.stringify({ rules: problemBody.value }) as any,
    })
    const data = await res.json()
    if (!res.ok) { problemError.value = data.error || '保存失败'; return }
    problemSuccess.value = true
    setTimeout(() => { problemSuccess.value = false }, 3000)
  } catch {
    problemError.value = '网络错误，请稍后重试'
  } finally {
    problemSaving.value = false
  }
}

// ─── 公告 ─────────────────────────────────────────────────────
const announcementText = ref('')
const announceSaving = ref(false)
const announceError = ref('')
const announceSuccess = ref(false)

async function saveAnnouncement() {
  announceError.value = ''; announceSuccess.value = false; announceSaving.value = true
  try {
    const res = await fetchWithAuth('/api/contest', {
      method: 'PUT',
      body: JSON.stringify({ announcements: announcementText.value }) as any,
    })
    const data = await res.json()
    if (!res.ok) { announceError.value = data.error || '发布失败'; return }
    announceSuccess.value = true
    setTimeout(() => { announceSuccess.value = false }, 3000)
  } catch {
    announceError.value = '网络错误'
  } finally {
    announceSaving.value = false
  }
}

// ─── Organizer 管理 ──────────────────────────────────────────
const organizers       = ref<any[]>([])
const orgLoading       = ref(false)
const orgActionLoading = ref(false)
const orgError         = ref('')
const orgSuccess       = ref('')
const newOrgUserId     = ref<number | null>(null)

async function fetchOrganizers() {
  orgLoading.value = true
  try {
    const res = await fetchWithAuth('/api/contest/organizers')
    if (res.ok) {
      const data = await res.json()
      organizers.value = data.organizers || []
    }
  } catch (e) {
    console.error('获取 organizer 列表失败', e)
  } finally {
    orgLoading.value = false
  }
}

async function addOrganizer() {
  orgError.value = ''; orgSuccess.value = ''
  if (!newOrgUserId.value) return
  orgActionLoading.value = true
  try {
    const res = await fetchWithAuth('/api/contest/organizers', {
      method: 'POST',
      body: JSON.stringify({ user_id: newOrgUserId.value }) as any,
    })
    const data = await res.json()
    if (!res.ok) { orgError.value = data.error || '添加失败'; return }
    orgSuccess.value = `已将 UID=${newOrgUserId.value} 设为 organizer`
    newOrgUserId.value = null
    await fetchOrganizers()
    setTimeout(() => { orgSuccess.value = '' }, 3000)
  } catch (e) {
    orgError.value = '网络错误'
  } finally {
    orgActionLoading.value = false
  }
}

async function removeOrganizer(userId: number, username: string) {
  if (!confirm(`确定移除 ${username} 的 organizer 权限吗？`)) return
  orgError.value = ''; orgSuccess.value = ''
  orgActionLoading.value = true
  try {
    const res = await fetchWithAuth(`/api/contest/organizers/${userId}`, { method: 'DELETE' })
    const data = await res.json()
    if (!res.ok) { orgError.value = data.error || '移除失败'; return }
    orgSuccess.value = `已移除 ${username}`
    await fetchOrganizers()
    setTimeout(() => { orgSuccess.value = '' }, 3000)
  } catch (e) {
    orgError.value = '网络错误'
  } finally {
    orgActionLoading.value = false
  }
}

// ─── 提交列表 ────────────────────────────────────────────────
const submissions = ref<any[]>([])
const subsLoading = ref(false)

async function fetchSubmissions() {
  subsLoading.value = true
  try {
    const res = await fetchWithAuth('/api/contest/submissions')
    if (res.ok) {
      const data = await res.json()
      submissions.value = data.submissions || []
    }
  } catch (e) {
    console.error('获取提交列表失败', e)
  } finally {
    subsLoading.value = false
  }
}

const realSubmissions = computed(() => submissions.value.filter(s => s.project_name !== '待提交'))
const registeredOnly = computed(() => submissions.value.filter(s => s.project_name === '待提交'))

async function downloadCsv() {
  try {
    const res = await fetchWithAuth('/api/contest/submissions/export')
    if (!res.ok) { alert('导出失败'); return }
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'contest_submissions.csv'
    a.click()
    URL.revokeObjectURL(url)
  } catch {
    alert('导出失败')
  }
}

function formatDate(iso: string | null): string {
  if (!iso) return '-'
  return new Date(iso).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })
}

// ─── 生命周期 ────────────────────────────────────────────────
onMounted(async () => {
  await fetchMyRole()
  if (!isManager.value) return
  await Promise.all([fetchContestInfo(), fetchOrganizers(), fetchSubmissions()])
})
</script>

<template>
  <div class="kg-admin">
    <div class="kg-admin-header">
      <h1 class="kg-admin-title">
        <img src="/icons/sidebar_trophy.svg" alt="" class="kg-admin-icon" />
        百块奖金大赛 · 管理后台
      </h1>
      <NuxtLink to="/contest" class="kg-btn-ghost">查看比赛页面 →</NuxtLink>
    </div>

    <div v-if="roleLoading" class="kg-loading">
      <div class="kg-spinner"></div>
      <span>权限验证中...</span>
    </div>

    <div v-else-if="!isManager" class="kg-forbidden">
      <p>⚠️ 此页面仅限比赛管理者（organizer）或站点管理员访问</p>
    </div>

    <template v-else>
      <!-- 比赛信息编辑 -->
      <div class="kg-card">
        <h2 class="kg-card-title">📝 编辑比赛信息</h2>
        <div v-if="infoLoading" class="kg-loading-text">加载中...</div>
        <form v-else class="kg-form" @submit.prevent="saveContestInfo">
          <div class="kg-form-group">
            <label>比赛标题</label>
            <input v-model="infoForm.title" class="kg-input" type="text" maxlength="200" />
          </div>

          <div class="kg-form-group">
            <label>比赛介绍（支持 Markdown）</label>
            <ClientOnly>
              <CommonMarkdownEditor v-model="infoForm.description" height="360px" />
            </ClientOnly>
          </div>

          <div class="kg-form-row">
            <div class="kg-form-group">
              <label>比赛开始时间（北京时间）</label>
              <input v-model="infoForm.start_time" class="kg-input" type="datetime-local" />
            </div>
            <div class="kg-form-group">
              <label>提交截止时间（北京时间）</label>
              <input v-model="infoForm.end_time" class="kg-input" type="datetime-local" />
            </div>
          </div>

          <div class="kg-form-group kg-toggle-row">
            <label>开放报名/提交</label>
            <label class="kg-toggle">
              <input v-model="infoForm.is_active" type="checkbox" />
              <span class="kg-toggle-track"></span>
              <span class="kg-toggle-text">{{ infoForm.is_active ? '已开放' : '已关闭' }}</span>
            </label>
          </div>

          <div v-if="infoError" class="kg-msg-error">{{ infoError }}</div>
          <div v-if="infoSuccess" class="kg-msg-success">✅ 保存成功</div>
          <div class="kg-form-actions">
            <button type="submit" class="kg-btn-primary" :disabled="infoSaving">
              {{ infoSaving ? '保存中...' : '保存比赛信息' }}
            </button>
          </div>
        </form>
      </div>

      <!-- 题目（对应前台「题目」标签页） -->
      <div class="kg-card">
        <h2 class="kg-card-title">📋 编辑题目</h2>
        <p class="kg-card-desc">
          对应比赛页「题目」标签；支持 Markdown。比赛开始且选手已报名后可见本内容（管理员可随时预览）。
        </p>
        <div v-if="infoLoading" class="kg-loading-text">加载中...</div>
        <div v-else class="kg-form">
          <div class="kg-form-group">
            <ClientOnly>
              <CommonMarkdownEditor v-model="problemBody" height="360px" />
            </ClientOnly>
          </div>
          <div v-if="problemError" class="kg-msg-error">{{ problemError }}</div>
          <div v-if="problemSuccess" class="kg-msg-success">✅ 题目已保存</div>
          <div class="kg-form-actions">
            <button type="button" class="kg-btn-primary" :disabled="problemSaving" @click="saveProblems">
              {{ problemSaving ? '保存中...' : '保存题目' }}
            </button>
          </div>
        </div>
      </div>

      <!-- 公告 -->
      <div class="kg-card">
        <h2 class="kg-card-title">📢 发布公告</h2>
        <p class="kg-card-desc">公告内容会显示在比赛页面顶部，所有人可见。留空则不显示。支持 Markdown。</p>
        <div class="kg-form">
          <div class="kg-form-group">
            <ClientOnly>
              <CommonMarkdownEditor v-model="announcementText" height="260px" />
            </ClientOnly>
          </div>
          <div v-if="announceError" class="kg-msg-error">{{ announceError }}</div>
          <div v-if="announceSuccess" class="kg-msg-success">✅ 已发布</div>
          <div class="kg-form-actions">
            <button class="kg-btn-primary" @click="saveAnnouncement" :disabled="announceSaving">
              {{ announceSaving ? '发布中...' : '发布公告' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Organizer 管理 -->
      <div class="kg-card">
        <h2 class="kg-card-title">👥 管理者列表（Organizer）</h2>
        <p class="kg-card-desc">Organizer 可以编辑比赛信息与题目、发布公告、查看提交、导出数据。</p>

        <div v-if="orgLoading" class="kg-loading-text">加载中...</div>
        <template v-else>
          <div v-if="organizers.length === 0" class="kg-empty-text">暂无 organizer</div>
          <ul v-else class="kg-org-list">
            <li v-for="org in organizers" :key="org.user_id" class="kg-org-item">
              <span class="kg-org-name">{{ org.username }}</span>
              <span class="kg-org-uid">UID {{ org.user_id }}</span>
              <span class="kg-org-time">{{ formatDate(org.added_at) }}</span>
              <button class="kg-btn-danger-sm" @click="removeOrganizer(org.user_id, org.username)" :disabled="orgActionLoading">移除</button>
            </li>
          </ul>

          <div class="kg-add-org">
            <input v-model="newOrgUserId" class="kg-input kg-uid-input" type="number" placeholder="输入用户 UID" min="1" />
            <button class="kg-btn-primary" @click="addOrganizer" :disabled="orgActionLoading || !newOrgUserId">
              {{ orgActionLoading ? '处理中...' : '添加' }}
            </button>
          </div>
          <div v-if="orgError" class="kg-msg-error">{{ orgError }}</div>
          <div v-if="orgSuccess" class="kg-msg-success">{{ orgSuccess }}</div>
        </template>
      </div>

      <!-- 报名 & 提交列表 -->
      <div class="kg-card">
        <div class="kg-subs-header">
          <h2 class="kg-card-title">📋 参赛情况</h2>
          <div class="kg-subs-stats">
            <span class="kg-stat-badge kg-stat-total">总报名 {{ submissions.length }}</span>
            <span class="kg-stat-badge kg-stat-submitted">已提交 {{ realSubmissions.length }}</span>
            <span class="kg-stat-badge kg-stat-pending">仅报名 {{ registeredOnly.length }}</span>
          </div>
          <div class="kg-subs-actions">
            <button class="kg-btn-ghost" @click="fetchSubmissions" :disabled="subsLoading">刷新</button>
            <button class="kg-btn-primary" @click="downloadCsv">导出 CSV</button>
          </div>
        </div>

        <div v-if="subsLoading" class="kg-loading-text">加载中...</div>
        <div v-else-if="submissions.length === 0" class="kg-empty-text">暂无报名记录</div>
        <div v-else class="kg-table-wrap">
          <table class="kg-table">
            <thead>
              <tr>
                <th>#</th>
                <th>用户名</th>
                <th>UID</th>
                <th>状态</th>
                <th>作品名称</th>
                <th>作品介绍</th>
                <th>项目链接</th>
                <th>队员</th>
                <th>最后更新</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(sub, idx) in submissions" :key="sub.id">
                <td class="td-num">{{ idx + 1 }}</td>
                <td class="td-user">{{ sub.username }}</td>
                <td class="td-uid">{{ sub.user_id }}</td>
                <td>
                  <span v-if="sub.project_name === '待提交'" class="kg-status-pending">仅报名</span>
                  <span v-else class="kg-status-submitted">已提交</span>
                </td>
                <td class="td-name">{{ sub.project_name === '待提交' ? '-' : sub.project_name }}</td>
                <td class="td-desc">{{ sub.project_name === '待提交' ? '-' : sub.description }}</td>
                <td class="td-url">
                  <a v-if="sub.project_url" :href="sub.project_url" target="_blank" class="kg-link">链接</a>
                  <span v-else class="kg-muted">-</span>
                </td>
                <td class="td-team">{{ sub.team_members || '-' }}</td>
                <td class="td-time">{{ formatDate(sub.updated_at) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </div>
</template>

<style lang="scss" scoped>
.kg-admin {
  max-width: 1100px;
  margin: 0 auto;
  padding: 24px 20px 60px;
}

.kg-admin-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 12px;
}

.kg-admin-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 1.4rem;
  font-weight: 700;
  color: #1a2a4a;
  margin: 0;
}

.kg-admin-icon { width: 24px; height: 24px; }

.kg-card {
  background: #F5FBFE;
  border: 1.5px solid #c8dff8;
  border-radius: 16px;
  box-shadow: 0 2px 16px rgba(40, 57, 101, 0.07);
  padding: 28px 32px;
  margin-bottom: 20px;
}

.kg-card-title {
  font-size: 1.05rem;
  font-weight: 700;
  color: #1a2a4a;
  margin: 0 0 12px;
}

.kg-card-desc {
  font-size: 0.85rem;
  color: #6a85a0;
  margin: 0 0 16px;
}

// ── 表单 ──
.kg-form { display: flex; flex-direction: column; gap: 20px; }

.kg-form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  @media (max-width: 600px) { grid-template-columns: 1fr; }
}

.kg-form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  label {
    font-size: 0.85rem;
    font-weight: 600;
    color: #4a6080;
  }
}

.kg-input {
  padding: 10px 14px;
  border: 1.5px solid #c8dff8;
  border-radius: 12px;
  background: #fff;
  color: #1a2a4a;
  font-size: 0.9rem;
  outline: none;
  font-family: inherit;
  transition: border-color 0.2s;
  &:focus { border-color: #26a4ff; }
  &::placeholder { color: #9ab0c6; }
}

.kg-toggle-row { flex-direction: row; align-items: center; gap: 16px; }

.kg-toggle {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;

  input { display: none; }

  .kg-toggle-track {
    width: 42px; height: 24px;
    background: #c8dff8;
    border-radius: 12px;
    position: relative;
    transition: background 0.2s;

    &::after {
      content: '';
      position: absolute;
      left: 3px; top: 3px;
      width: 18px; height: 18px;
      background: #fff;
      border-radius: 50%;
      transition: transform 0.2s;
      box-shadow: 0 1px 3px rgba(0,0,0,0.15);
    }
  }

  input:checked + .kg-toggle-track {
    background: #26a4ff;
    &::after { transform: translateX(18px); }
  }

  .kg-toggle-text { font-size: 0.85rem; color: #6a85a0; }
}

.kg-form-actions { display: flex; gap: 12px; justify-content: flex-end; }

// ── Organizer ──
.kg-org-list {
  list-style: none;
  padding: 0;
  margin: 0 0 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.kg-org-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 14px;
  background: #fff;
  border: 1px solid #daeef9;
  border-radius: 10px;
  font-size: 0.9rem;
  flex-wrap: wrap;
}

.kg-org-name { font-weight: 600; flex: 1; color: #1a2a4a; }
.kg-org-uid  { color: #6a85a0; font-size: 0.8rem; }
.kg-org-time { color: #6a85a0; font-size: 0.8rem; margin-right: auto; }

.kg-add-org {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-top: 8px;
  flex-wrap: wrap;
  .kg-uid-input { max-width: 180px; flex: none; }
}

// ── 提交列表 ──
.kg-subs-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
  .kg-card-title { margin: 0; }
}

.kg-subs-stats { display: flex; gap: 8px; flex-wrap: wrap; }

.kg-stat-badge {
  border-radius: 20px;
  padding: 3px 12px;
  font-size: 0.78rem;
  font-weight: 600;
}

.kg-stat-total     { background: #dbeafe; color: #1e40af; }
.kg-stat-submitted { background: #dcfce7; color: #166534; }
.kg-stat-pending   { background: #fef9c3; color: #854d0e; }

.kg-subs-actions { display: flex; gap: 8px; margin-left: auto; }

.kg-status-pending {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 10px;
  font-size: 0.78rem;
  font-weight: 600;
  background: #fef9c3;
  color: #854d0e;
}

.kg-status-submitted {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 10px;
  font-size: 0.78rem;
  font-weight: 600;
  background: #dcfce7;
  color: #166534;
}

.kg-table-wrap { overflow-x: auto; }

.kg-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;

  th {
    text-align: left;
    padding: 8px 10px;
    background: #e8f4fd;
    border-bottom: 2px solid #c8dff8;
    font-weight: 600;
    color: #4a6080;
    white-space: nowrap;
  }

  td {
    padding: 10px;
    border-bottom: 1px solid #e8f4fd;
    color: #1a2a4a;
    vertical-align: top;
  }

  tr:last-child td { border-bottom: none; }
  tr:hover td { background: #f0f7ff; }

  .td-num  { width: 36px; color: #6a85a0; }
  .td-user { white-space: nowrap; font-weight: 500; }
  .td-uid  { white-space: nowrap; color: #6a85a0; font-size: 0.8rem; }
  .td-name { white-space: nowrap; }
  .td-desc { max-width: 200px; white-space: pre-wrap; word-break: break-word; }
  .td-url, .td-team, .td-time { white-space: nowrap; }
  .td-time { color: #6a85a0; }
}

// ── 按钮 ──
.kg-btn-primary {
  padding: 9px 24px;
  background: #26a4ff;
  color: #fff;
  border: none;
  border-radius: 14px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
  &:hover:not(:disabled) { background: #0d8de0; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
}

.kg-btn-ghost {
  padding: 9px 24px;
  border: 1.5px solid #c8dff8;
  border-radius: 14px;
  background: transparent;
  color: #4a6080;
  cursor: pointer;
  font-size: 0.9rem;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  &:hover { background: #F5FBFE; }
  &:disabled { opacity: 0.5; }
}

.kg-btn-danger-sm {
  padding: 4px 12px;
  background: transparent;
  color: #e05a5a;
  border: 1px solid rgba(224,90,90,0.3);
  border-radius: 8px;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s;
  &:hover:not(:disabled) { background: rgba(224,90,90,0.06); }
  &:disabled { opacity: 0.5; }
}

// ── 反馈 ──
.kg-msg-error {
  font-size: 0.85rem;
  color: #e05a5a;
  padding: 8px 14px;
  background: rgba(224,90,90,0.06);
  border: 1px solid rgba(224,90,90,0.2);
  border-radius: 10px;
}

.kg-msg-success {
  font-size: 0.85rem;
  color: #059669;
  padding: 8px 14px;
  background: rgba(16,185,129,0.06);
  border: 1px solid rgba(16,185,129,0.2);
  border-radius: 10px;
}

.kg-link { color: #26a4ff; text-decoration: none; &:hover { text-decoration: underline; } }
.kg-muted { color: #6a85a0; }
.kg-loading { display: flex; align-items: center; justify-content: center; gap: 12px; padding: 60px; color: #4a6080; }
.kg-spinner { width: 28px; height: 28px; border: 3px solid #c8dff8; border-top-color: #26a4ff; border-radius: 50%; animation: spin 0.7s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.kg-loading-text { color: #6a85a0; padding: 12px 0; }
.kg-empty-text   { color: #6a85a0; padding: 8px 0; }
.kg-forbidden    { text-align: center; padding: 60px 0; color: #e05a5a; font-size: 1.1rem; }
</style>
