<template>
  <HomeContainer>
    <div class="admin-contest-page">
      <div class="page-header">
        <h1 class="page-title">🏆 百块奖金大赛 · 管理后台</h1>
        <NuxtLink to="/contest" class="btn-secondary">查看比赛页面 →</NuxtLink>
      </div>

      <!-- 无权限 -->
      <div v-if="!isAdmin" class="forbidden">
        <p>⚠️ 此页面仅限管理员访问</p>
      </div>

      <template v-else>
        <!-- 比赛信息编辑 -->
        <section class="admin-card">
          <h2 class="card-title">📝 编辑比赛信息</h2>

          <div v-if="infoLoading" class="loading-text">加载中...</div>
          <form v-else class="admin-form" @submit.prevent="saveContestInfo">
            <div class="form-group">
              <label class="form-label">比赛标题</label>
              <input v-model="infoForm.title" class="form-input" type="text" maxlength="200" />
            </div>
            <div class="form-group">
              <label class="form-label">比赛介绍</label>
              <textarea v-model="infoForm.description" class="form-textarea" rows="4" placeholder="支持换行，内容会原样显示"></textarea>
            </div>
            <div class="form-group">
              <label class="form-label">参赛规则</label>
              <textarea v-model="infoForm.rules" class="form-textarea" rows="4" placeholder="支持换行，内容会原样显示"></textarea>
            </div>
            <div class="form-group">
              <label class="form-label">奖项设置</label>
              <textarea v-model="infoForm.prizes" class="form-textarea" rows="3" placeholder="例如：一等奖 100元、二等奖 50元..."></textarea>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">比赛开始时间（CST）</label>
                <input v-model="infoForm.start_time" class="form-input" type="datetime-local" />
              </div>
              <div class="form-group">
                <label class="form-label">提交截止时间（CST）</label>
                <input v-model="infoForm.end_time" class="form-input" type="datetime-local" />
              </div>
            </div>
            <div class="form-group toggle-group">
              <label class="form-label">开放提交</label>
              <label class="toggle">
                <input v-model="infoForm.is_active" type="checkbox" />
                <span class="toggle-track"></span>
                <span class="toggle-label-text">{{ infoForm.is_active ? '已开放' : '已关闭' }}</span>
              </label>
            </div>

            <div v-if="infoError" class="form-error">{{ infoError }}</div>
            <div v-if="infoSuccess" class="form-success">✅ 保存成功</div>

            <div class="form-actions">
              <button type="submit" class="btn-primary" :disabled="infoSaving">
                {{ infoSaving ? '保存中...' : '保存比赛信息' }}
              </button>
            </div>
          </form>
        </section>

        <!-- 提交列表 -->
        <section class="admin-card">
          <div class="submissions-header">
            <h2 class="card-title">📋 参赛提交列表</h2>
            <span class="count-badge">共 {{ submissions.length }} 份</span>
            <button class="btn-secondary" @click="fetchSubmissions" :disabled="subsLoading">刷新</button>
          </div>

          <div v-if="subsLoading" class="loading-text">加载中...</div>
          <div v-else-if="submissions.length === 0" class="empty-text">暂无提交记录</div>
          <div v-else class="table-wrap">
            <table class="submissions-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>用户名</th>
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
                  <td class="td-name">{{ sub.project_name }}</td>
                  <td class="td-desc">{{ sub.description }}</td>
                  <td class="td-url">
                    <a v-if="sub.project_url" :href="sub.project_url" target="_blank" class="link">链接</a>
                    <span v-else class="muted">-</span>
                  </td>
                  <td class="td-team">{{ sub.team_members || '-' }}</td>
                  <td class="td-time">{{ formatDate(sub.updated_at) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </template>
    </div>
  </HomeContainer>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

const { user, isLoggedIn } = useAuth()
const { fetchWithAuth, fetchPublic } = useApi()

const isAdmin = computed(() => (user.value as any)?.role_name === 'admin')

// ─── 比赛信息表单 ────────────────────────────────────────────
const infoLoading = ref(true)
const infoSaving  = ref(false)
const infoError   = ref('')
const infoSuccess = ref(false)

const infoForm = ref({
  title:       '',
  description: '',
  rules:       '',
  prizes:      '',
  start_time:  '',
  end_time:    '',
  is_active:   true,
})

function toLocalDatetimeInput(iso: string | null): string {
  if (!iso) return ''
  // Convert to CST local datetime-local input format (YYYY-MM-DDTHH:MM)
  const d = new Date(iso)
  const offset = 8 * 60
  const local = new Date(d.getTime() + offset * 60000)
  return local.toISOString().slice(0, 16)
}

function toISOWithOffset(local: string): string {
  // datetime-local input returns "YYYY-MM-DDTHH:MM", treat as CST (+08:00)
  if (!local) return ''
  return `${local}:00+08:00`
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
        rules:       data.rules       || '',
        prizes:      data.prizes      || '',
        start_time:  toLocalDatetimeInput(data.start_time),
        end_time:    toLocalDatetimeInput(data.end_time),
        is_active:   data.is_active ?? true,
      }
    }
  } catch (e) {
    console.error('获取比赛信息失败', e)
  } finally {
    infoLoading.value = false
  }
}

async function saveContestInfo() {
  infoError.value   = ''
  infoSuccess.value = false
  infoSaving.value  = true
  try {
    const payload = {
      ...infoForm.value,
      start_time: toISOWithOffset(infoForm.value.start_time),
      end_time:   toISOWithOffset(infoForm.value.end_time),
    }
    const res = await fetchWithAuth('/api/contest', {
      method: 'PUT',
      body: JSON.stringify(payload) as any,
    })
    const data = await res.json()
    if (!res.ok) {
      infoError.value = data.error || '保存失败'
      return
    }
    infoSuccess.value = true
    setTimeout(() => { infoSuccess.value = false }, 3000)
  } catch (e) {
    infoError.value = '网络错误，请稍后重试'
  } finally {
    infoSaving.value = false
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

function formatDate(iso: string | null): string {
  if (!iso) return '-'
  return new Date(iso).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })
}

// ─── 生命周期 ────────────────────────────────────────────────
onMounted(async () => {
  if (!isLoggedIn.value) return
  await fetchContestInfo()
  await fetchSubmissions()
})
</script>

<style lang="scss" scoped>
.admin-contest-page {
  max-width: 1000px;
  margin: 0 auto;
  padding: 0 1rem 3rem;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 2rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.page-title {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0;
}

.admin-card {
  background: var(--bg-card, #fff);
  border: 1px solid var(--border-primary, #e5e7eb);
  border-radius: 12px;
  padding: 2rem;
  margin-bottom: 1.5rem;
  box-shadow: 0 1px 4px rgba(0,0,0,0.04);

  @media (max-width: 480px) { padding: 1.25rem; }
}

.card-title {
  font-size: 1.05rem;
  font-weight: 600;
  margin: 0 0 1.5rem;
}

// ── 表单 ──────────────────────────────────────────────────────
.admin-form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.25rem;

  @media (max-width: 600px) { grid-template-columns: 1fr; }
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.form-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-primary, #374151);
}

.form-input,
.form-textarea {
  padding: 0.6rem 0.875rem;
  border: 1px solid var(--border-primary, #d1d5db);
  border-radius: 8px;
  font-size: 0.9rem;
  color: var(--text-primary, #111);
  background: var(--bg-input, #fff);
  transition: border-color 0.2s;
  resize: vertical;

  &:focus {
    outline: none;
    border-color: #4f46e5;
    box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
  }
}

.form-textarea { min-height: 100px; }

.toggle-group { flex-direction: row; align-items: center; gap: 1rem; }

.toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;

  input { display: none; }

  .toggle-track {
    width: 42px;
    height: 24px;
    background: #d1d5db;
    border-radius: 12px;
    position: relative;
    transition: background 0.2s;

    &::after {
      content: '';
      position: absolute;
      left: 3px;
      top: 3px;
      width: 18px;
      height: 18px;
      background: #fff;
      border-radius: 50%;
      transition: transform 0.2s;
      box-shadow: 0 1px 3px rgba(0,0,0,0.2);
    }
  }

  input:checked + .toggle-track {
    background: #4f46e5;
    &::after { transform: translateX(18px); }
  }

  .toggle-label-text {
    font-size: 0.875rem;
    color: var(--text-secondary, #6b7280);
  }
}

.form-error {
  font-size: 0.875rem;
  color: #e11d48;
  padding: 0.5rem 0.75rem;
  background: #fff1f2;
  border-radius: 6px;
  border: 1px solid #fecdd3;
}

.form-success {
  font-size: 0.875rem;
  color: #166534;
  padding: 0.5rem 0.75rem;
  background: #dcfce7;
  border-radius: 6px;
  border: 1px solid #bbf7d0;
}

.form-actions { margin-top: 0.25rem; }

// ── 提交列表 ──────────────────────────────────────────────────
.submissions-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;

  .card-title { margin: 0; }
}

.count-badge {
  background: #ede9fe;
  color: #5b21b6;
  border-radius: 20px;
  padding: 0.2rem 0.75rem;
  font-size: 0.8rem;
  font-weight: 600;
}

.table-wrap { overflow-x: auto; }

.submissions-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;

  th {
    text-align: left;
    padding: 0.6rem 0.75rem;
    background: var(--bg-table-head, #f9fafb);
    border-bottom: 2px solid var(--border-primary, #e5e7eb);
    font-weight: 600;
    color: var(--text-secondary, #6b7280);
    white-space: nowrap;
  }

  td {
    padding: 0.75rem;
    border-bottom: 1px solid var(--border-primary, #f3f4f6);
    color: var(--text-primary, #111);
    vertical-align: top;
  }

  tr:last-child td { border-bottom: none; }
  tr:hover td { background: var(--interactive-secondary, #f9fafb); }

  .td-num   { width: 36px; color: var(--text-secondary, #9ca3af); }
  .td-user  { white-space: nowrap; font-weight: 500; }
  .td-name  { white-space: nowrap; }
  .td-desc  { max-width: 200px; white-space: pre-wrap; word-break: break-word; }
  .td-url   { white-space: nowrap; }
  .td-team  { white-space: nowrap; }
  .td-time  { white-space: nowrap; color: var(--text-secondary, #6b7280); }
}

.link {
  color: #4f46e5;
  text-decoration: none;
  &:hover { text-decoration: underline; }
}

.muted { color: var(--text-secondary, #9ca3af); }
.loading-text { color: var(--text-secondary, #9ca3af); padding: 1rem 0; }
.empty-text { color: var(--text-secondary, #9ca3af); padding: 1rem 0; text-align: center; }

// ── 按钮 ──────────────────────────────────────────────────────
.btn-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.6rem 1.5rem;
  background: #4f46e5;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  text-decoration: none;
  transition: background 0.2s;
  min-height: 40px;

  &:hover:not(:disabled) { background: #4338ca; }
  &:disabled { opacity: 0.6; cursor: not-allowed; }
}

.btn-secondary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem 1.25rem;
  background: transparent;
  color: var(--text-primary, #374151);
  border: 1px solid var(--border-primary, #d1d5db);
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  text-decoration: none;
  transition: background 0.2s;
  min-height: 38px;

  &:hover:not(:disabled) { background: var(--interactive-secondary, #f3f4f6); }
  &:disabled { opacity: 0.6; cursor: not-allowed; }
}

// ── 无权限 ────────────────────────────────────────────────────
.forbidden {
  text-align: center;
  padding: 4rem 0;
  color: #e11d48;
  font-size: 1.1rem;
}
</style>
