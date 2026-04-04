<template>
  <HomeContainer>
    <div class="contest-page">

      <!-- 头部 Banner -->
      <div class="contest-banner">
        <div class="banner-content">
          <div class="trophy-icon">🏆</div>
          <h1 class="contest-title">{{ contest?.title || '百块奖金Web大赛' }}</h1>
          <p class="contest-subtitle">展示你的作品，赢取百元奖金</p>
        </div>

        <!-- 倒计时 -->
        <div class="countdown-block">
          <div class="countdown-label">{{ countdownLabel }}</div>
          <div v-if="!contestEnded" class="countdown-timer">
            <div class="time-unit">
              <span class="time-value">{{ countdown.days }}</span>
              <span class="time-text">天</span>
            </div>
            <span class="time-sep">:</span>
            <div class="time-unit">
              <span class="time-value">{{ countdown.hours }}</span>
              <span class="time-text">时</span>
            </div>
            <span class="time-sep">:</span>
            <div class="time-unit">
              <span class="time-value">{{ countdown.minutes }}</span>
              <span class="time-text">分</span>
            </div>
            <span class="time-sep">:</span>
            <div class="time-unit">
              <span class="time-value">{{ countdown.seconds }}</span>
              <span class="time-text">秒</span>
            </div>
          </div>
          <div v-else class="contest-ended-badge">比赛已结束</div>
        </div>
      </div>

      <!-- 加载中 -->
      <div v-if="loading" class="loading-state">
        <div class="loading-spinner"></div>
        <span>加载比赛信息中...</span>
      </div>

      <template v-else-if="contest">
        <!-- 比赛信息卡片区 -->
        <div class="info-grid">
          <div class="info-card">
            <h2 class="card-title">📋 比赛介绍</h2>
            <div class="card-content markdown-text">{{ contest.description || '比赛介绍即将公布，敬请期待。' }}</div>
          </div>
          <div class="info-card">
            <h2 class="card-title">📜 参赛规则</h2>
            <div class="card-content markdown-text">{{ contest.rules || '参赛规则即将公布，敬请期待。' }}</div>
          </div>
          <div class="info-card prizes-card">
            <h2 class="card-title">🎁 奖项设置</h2>
            <div class="card-content markdown-text">{{ contest.prizes || '奖项信息即将公布，敬请期待。' }}</div>
          </div>
          <div class="info-card time-card">
            <h2 class="card-title">📅 赛程时间</h2>
            <div class="time-info">
              <div class="time-row">
                <span class="time-label">比赛开始</span>
                <span class="time-value-text">{{ formatTime(contest.start_time) }}</span>
              </div>
              <div class="time-row">
                <span class="time-label">提交截止</span>
                <span class="time-value-text deadline">{{ formatTime(contest.end_time) }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 提交区域 -->
        <div class="submission-section">
          <h2 class="section-title">📤 作品提交</h2>

          <!-- 未登录 -->
          <div v-if="!isLoggedIn" class="auth-prompt">
            <p>请先登录后再提交作品</p>
            <NuxtLink to="/login" class="btn-primary">前往登录</NuxtLink>
          </div>

          <!-- 比赛未开放 -->
          <div v-else-if="!contest.is_active" class="not-active-prompt">
            <p>比赛暂未开放提交，请关注官方公告</p>
          </div>

          <!-- 已提交 - 显示提交内容并允许修改 -->
          <div v-else-if="mySubmission && !editMode" class="submitted-view">
            <div class="submitted-badge">✅ 已提交</div>
            <div class="submission-detail">
              <div class="detail-row">
                <span class="detail-label">作品名称</span>
                <span class="detail-value">{{ mySubmission.project_name }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">作品介绍</span>
                <span class="detail-value">{{ mySubmission.description }}</span>
              </div>
              <div class="detail-row" v-if="mySubmission.project_url">
                <span class="detail-label">项目链接</span>
                <a :href="mySubmission.project_url" target="_blank" class="detail-link">{{ mySubmission.project_url }}</a>
              </div>
              <div class="detail-row" v-if="mySubmission.team_members">
                <span class="detail-label">队员信息</span>
                <span class="detail-value">{{ mySubmission.team_members }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">提交时间</span>
                <span class="detail-value muted">{{ formatDateTime(mySubmission.updated_at) }}</span>
              </div>
            </div>
            <button class="btn-secondary" @click="enterEditMode">修改提交</button>
          </div>

          <!-- 提交表单（首次提交或编辑） -->
          <div v-else-if="!contestEnded" class="submit-form-wrap">
            <form class="submit-form" @submit.prevent="handleSubmit">
              <div class="form-group">
                <label class="form-label">作品名称 <span class="required">*</span></label>
                <input
                  v-model="form.project_name"
                  class="form-input"
                  type="text"
                  placeholder="请输入你的作品名称"
                  maxlength="200"
                />
              </div>
              <div class="form-group">
                <label class="form-label">作品介绍 <span class="required">*</span></label>
                <textarea
                  v-model="form.description"
                  class="form-textarea"
                  placeholder="请介绍你的作品功能、特点和实现思路..."
                  rows="5"
                ></textarea>
              </div>
              <div class="form-group">
                <label class="form-label">项目链接</label>
                <input
                  v-model="form.project_url"
                  class="form-input"
                  type="url"
                  placeholder="GitHub 仓库地址或在线演示地址（选填）"
                />
              </div>
              <div class="form-group">
                <label class="form-label">队员信息</label>
                <input
                  v-model="form.team_members"
                  class="form-input"
                  type="text"
                  placeholder="如：张三、李四（选填，单人参赛可不填）"
                  maxlength="500"
                />
              </div>

              <div v-if="submitError" class="form-error">{{ submitError }}</div>

              <div class="form-actions">
                <button v-if="editMode" type="button" class="btn-secondary" @click="cancelEdit">取消</button>
                <button type="submit" class="btn-primary" :disabled="submitting">
                  {{ submitting ? '提交中...' : (editMode ? '保存修改' : '提交作品') }}
                </button>
              </div>
            </form>
          </div>

          <!-- 比赛已结束，不允许提交 -->
          <div v-else class="not-active-prompt">
            <p>比赛已结束，不再接受提交</p>
          </div>
        </div>
      </template>

      <!-- 接口返回无数据 -->
      <div v-else class="empty-state">
        <p>比赛信息尚未发布，请稍后再来查看</p>
      </div>

    </div>
  </HomeContainer>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

const { isLoggedIn } = useAuth()
const { fetchWithAuth, fetchPublic } = useApi()

// ─── 比赛数据 ───────────────────────────────────────────────
const contest = ref<any>(null)
const loading = ref(true)

async function fetchContest() {
  try {
    const res = await fetchPublic('/api/contest')
    if (res.ok) {
      contest.value = await res.json()
    }
  } catch (e) {
    console.error('获取比赛信息失败', e)
  } finally {
    loading.value = false
  }
}

// ─── 倒计时 ──────────────────────────────────────────────────
// 比赛开始：2026-04-14 10:00 CST  |  比赛结束：2026-04-21 00:00 CST
// 优先使用接口返回的时间，没有时则使用默认值
const DEFAULT_START = '2026-04-14T10:00:00+08:00'
const DEFAULT_END   = '2026-04-21T00:00:00+08:00'

const startTime = computed(() =>
  contest.value?.start_time ? new Date(contest.value.start_time) : new Date(DEFAULT_START)
)
const endTime = computed(() =>
  contest.value?.end_time ? new Date(contest.value.end_time) : new Date(DEFAULT_END)
)

const now = ref(new Date())
let timer: ReturnType<typeof setInterval>

const contestStarted = computed(() => now.value >= startTime.value)
const contestEnded   = computed(() => now.value >= endTime.value)

const countdownLabel = computed(() => {
  if (contestEnded.value) return '比赛状态'
  if (contestStarted.value) return '距离比赛结束还有'
  return '距离比赛开始还有'
})

const targetTime = computed(() =>
  contestStarted.value ? endTime.value : startTime.value
)

const countdown = computed(() => {
  const diff = Math.max(0, targetTime.value.getTime() - now.value.getTime())
  const totalSeconds = Math.floor(diff / 1000)
  return {
    days:    String(Math.floor(totalSeconds / 86400)).padStart(2, '0'),
    hours:   String(Math.floor((totalSeconds % 86400) / 3600)).padStart(2, '0'),
    minutes: String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0'),
    seconds: String(totalSeconds % 60).padStart(2, '0'),
  }
})

// ─── 我的提交 ────────────────────────────────────────────────
const mySubmission = ref<any>(null)
const editMode = ref(false)
const form = ref({ project_name: '', description: '', project_url: '', team_members: '' })
const submitting = ref(false)
const submitError = ref('')

async function fetchMySubmission() {
  if (!isLoggedIn.value) return
  try {
    const res = await fetchWithAuth('/api/contest/my-submission')
    if (res.ok) {
      const data = await res.json()
      mySubmission.value = data.submission
    }
  } catch (e) {
    console.error('获取提交记录失败', e)
  }
}

function enterEditMode() {
  if (!mySubmission.value) return
  form.value = {
    project_name: mySubmission.value.project_name,
    description:  mySubmission.value.description,
    project_url:  mySubmission.value.project_url || '',
    team_members: mySubmission.value.team_members || '',
  }
  editMode.value = true
}

function cancelEdit() {
  editMode.value = false
  submitError.value = ''
}

async function handleSubmit() {
  submitError.value = ''
  if (!form.value.project_name.trim()) {
    submitError.value = '请填写作品名称'
    return
  }
  if (!form.value.description.trim()) {
    submitError.value = '请填写作品介绍'
    return
  }

  submitting.value = true
  try {
    const res = await fetchWithAuth('/api/contest/submit', {
      method: 'POST',
      body: JSON.stringify(form.value) as any,
    })
    const data = await res.json()
    if (!res.ok) {
      submitError.value = data.error || '提交失败，请稍后重试'
      return
    }
    mySubmission.value = data.submission
    editMode.value = false
    form.value = { project_name: '', description: '', project_url: '', team_members: '' }
  } catch (e) {
    submitError.value = '网络错误，请稍后重试'
  } finally {
    submitting.value = false
  }
}

// ─── 工具函数 ────────────────────────────────────────────────
function formatTime(iso: string | null): string {
  if (!iso) return '待公布'
  const d = new Date(iso)
  return d.toLocaleString('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Shanghai',
  })
}

function formatDateTime(iso: string | null): string {
  if (!iso) return '-'
  return new Date(iso).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })
}

// ─── 生命周期 ────────────────────────────────────────────────
onMounted(async () => {
  await fetchContest()
  await fetchMySubmission()
  timer = setInterval(() => { now.value = new Date() }, 1000)
})

onUnmounted(() => clearInterval(timer))
</script>

<style lang="scss" scoped>
.contest-page {
  max-width: 900px;
  margin: 0 auto;
  padding: 0 1rem 3rem;
}

// ── Banner ─────────────────────────────────────────────────────
.contest-banner {
  background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 60%, #a855f7 100%);
  border-radius: 16px;
  padding: 2.5rem 2rem 2rem;
  color: #fff;
  margin-bottom: 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
  text-align: center;
  box-shadow: 0 8px 32px rgba(79, 70, 229, 0.3);

  @media (max-width: 480px) {
    padding: 2rem 1rem 1.5rem;
    border-radius: 12px;
  }
}

.banner-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.trophy-icon {
  font-size: 3rem;
  line-height: 1;
  filter: drop-shadow(0 2px 8px rgba(0,0,0,0.2));
}

.contest-title {
  font-size: 2rem;
  font-weight: 700;
  margin: 0;
  letter-spacing: 0.02em;

  @media (max-width: 480px) { font-size: 1.5rem; }
}

.contest-subtitle {
  margin: 0;
  opacity: 0.85;
  font-size: 1rem;
}

// ── 倒计时 ────────────────────────────────────────────────────
.countdown-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
}

.countdown-label {
  font-size: 0.95rem;
  opacity: 0.85;
  font-weight: 500;
}

.countdown-timer {
  display: flex;
  align-items: flex-end;
  gap: 0.5rem;
}

.time-unit {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  padding: 0.5rem 0.75rem;
  min-width: 56px;

  @media (max-width: 480px) { min-width: 44px; padding: 0.4rem 0.5rem; }
}

.time-value {
  font-size: 2rem;
  font-weight: 700;
  line-height: 1;
  font-variant-numeric: tabular-nums;

  @media (max-width: 480px) { font-size: 1.5rem; }
}

.time-text {
  font-size: 0.7rem;
  opacity: 0.8;
  margin-top: 2px;
}

.time-sep {
  font-size: 1.8rem;
  font-weight: 700;
  opacity: 0.7;
  padding-bottom: 0.5rem;
}

.contest-ended-badge {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 20px;
  padding: 0.5rem 1.5rem;
  font-weight: 600;
  font-size: 1rem;
}

// ── 信息卡片 ──────────────────────────────────────────────────
.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.25rem;
  margin-bottom: 2rem;

  @media (max-width: 640px) { grid-template-columns: 1fr; }
}

.info-card {
  background: var(--bg-card, #fff);
  border: 1px solid var(--border-primary, #e5e7eb);
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);

  &.prizes-card,
  &.time-card {
    grid-column: span 1;
  }
}

.card-title {
  font-size: 1rem;
  font-weight: 600;
  margin: 0 0 0.875rem;
  color: var(--text-primary, #111);
}

.card-content.markdown-text {
  font-size: 0.9rem;
  line-height: 1.7;
  color: var(--text-secondary, #555);
  white-space: pre-wrap;
  word-break: break-word;
}

.time-info {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.time-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.time-label {
  font-size: 0.85rem;
  color: var(--text-secondary, #888);
  min-width: 64px;
}

.time-value-text {
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--text-primary, #111);

  &.deadline { color: #e11d48; }
}

// ── 提交区域 ──────────────────────────────────────────────────
.submission-section {
  background: var(--bg-card, #fff);
  border: 1px solid var(--border-primary, #e5e7eb);
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);

  @media (max-width: 480px) { padding: 1.25rem; }
}

.section-title {
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0 0 1.5rem;
  color: var(--text-primary, #111);
}

.auth-prompt,
.not-active-prompt {
  text-align: center;
  padding: 2rem 1rem;
  color: var(--text-secondary, #888);

  p { margin: 0 0 1rem; }
}

// ── 已提交视图 ────────────────────────────────────────────────
.submitted-badge {
  display: inline-block;
  background: #dcfce7;
  color: #166534;
  border-radius: 20px;
  padding: 0.3rem 1rem;
  font-size: 0.875rem;
  font-weight: 600;
  margin-bottom: 1.25rem;
}

.submission-detail {
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
  margin-bottom: 1.5rem;
}

.detail-row {
  display: flex;
  gap: 1rem;
  align-items: flex-start;
}

.detail-label {
  min-width: 72px;
  font-size: 0.85rem;
  color: var(--text-secondary, #888);
  padding-top: 1px;
}

.detail-value {
  font-size: 0.9rem;
  color: var(--text-primary, #111);
  word-break: break-word;
  flex: 1;
  white-space: pre-wrap;

  &.muted { color: var(--text-secondary, #888); font-size: 0.85rem; }
}

.detail-link {
  font-size: 0.9rem;
  color: #4f46e5;
  word-break: break-all;
  flex: 1;
  &:hover { text-decoration: underline; }
}

// ── 表单 ──────────────────────────────────────────────────────
.submit-form-wrap { max-width: 600px; }

.submit-form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.form-label {
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--text-primary, #111);

  .required { color: #e11d48; }
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

.form-textarea { min-height: 120px; }

.form-error {
  font-size: 0.875rem;
  color: #e11d48;
  padding: 0.5rem 0.75rem;
  background: #fff1f2;
  border-radius: 6px;
  border: 1px solid #fecdd3;
}

.form-actions {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

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
  padding: 0.6rem 1.5rem;
  background: transparent;
  color: var(--text-primary, #374151);
  border: 1px solid var(--border-primary, #d1d5db);
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
  min-height: 40px;

  &:hover { background: var(--interactive-secondary, #f3f4f6); }
}

// ── 状态 ──────────────────────────────────────────────────────
.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 4rem 0;
  color: var(--text-secondary, #888);

  .loading-spinner {
    width: 22px;
    height: 22px;
    border: 2px solid #e5e7eb;
    border-top-color: #4f46e5;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
}

.empty-state {
  text-align: center;
  padding: 4rem 0;
  color: var(--text-secondary, #888);
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
