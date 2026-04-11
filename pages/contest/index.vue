<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { marked } from 'marked'

definePageMeta({ layout: 'keguang' })

marked.setOptions({ breaks: true, gfm: true })

function renderMarkdown(text: string | null | undefined): string {
  if (!text) return ''
  return marked.parse(text) as string
}

const { isLoggedIn, user } = useAuth()
const { fetchWithAuth, fetchPublic } = useApi()

const contest = ref<any>(null)
const loading = ref(true)

async function fetchContest() {
  try {
    const res = await fetchPublic('/api/contest')
    if (res.ok) contest.value = await res.json()
  } catch (e) {
    console.error('获取比赛信息失败', e)
  } finally {
    loading.value = false
  }
}

const DEFAULT_START = '2026-04-14T10:00:00+08:00'
const DEFAULT_END   = '2026-04-21T00:00:00+08:00'

const startTime = computed(() => contest.value?.start_time ? new Date(contest.value.start_time) : new Date(DEFAULT_START))
const endTime   = computed(() => contest.value?.end_time ? new Date(contest.value.end_time) : new Date(DEFAULT_END))

const now = ref(new Date())
let timer: ReturnType<typeof setInterval>

const contestStarted = computed(() => now.value >= startTime.value)
const contestEnded   = computed(() => now.value >= endTime.value)

const countdownLabel = computed(() => {
  if (contestEnded.value) return '比赛状态'
  if (contestStarted.value) return '距离提交截止还有'
  return '距离比赛开始还有'
})

const targetTime = computed(() => contestStarted.value ? endTime.value : startTime.value)

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

// ── 报名逻辑 ──
const registered = ref(false)
const registering = ref(false)
const registerError = ref('')

async function checkRegistration() {
  if (!isLoggedIn.value) return
  try {
    const res = await fetchWithAuth('/api/contest/my-submission')
    if (res.ok) {
      const data = await res.json()
      if (data.submission) registered.value = true
    }
  } catch {}
}

async function handleRegister() {
  if (!isLoggedIn.value) {
    navigateTo('/login')
    return
  }
  registering.value = true
  registerError.value = ''
  try {
    const res = await fetchWithAuth('/api/contest/submit', {
      method: 'POST',
      body: JSON.stringify({
        project_name: '待提交',
        description: '已报名，等待提交作品',
        project_url: '',
        team_members: '',
      }) as any,
    })
    if (res.ok) {
      registered.value = true
    } else {
      const data = await res.json()
      registerError.value = data.error || '报名失败，请稍后重试'
    }
  } catch {
    registerError.value = '网络错误，请稍后重试'
  } finally {
    registering.value = false
  }
}

const canSeeTopics = computed(() => registered.value && contestStarted.value)
const canSubmit = computed(() => registered.value && contestStarted.value && !contestEnded.value)
const canRegister = computed(() => !contestEnded.value)

// ── 提交逻辑 ──
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
      if (data.submission) registered.value = true
    }
  } catch {}
}

function enterEditMode() {
  if (!mySubmission.value) return
  form.value = {
    project_name: mySubmission.value.project_name || '',
    description:  mySubmission.value.description || '',
    project_url:  mySubmission.value.project_url || '',
    team_members: mySubmission.value.team_members || '',
  }
  editMode.value = true
}

function cancelEdit() { editMode.value = false; submitError.value = '' }

async function handleSubmit() {
  submitError.value = ''
  if (!form.value.project_name.trim()) { submitError.value = '请填写作品名称'; return }
  if (!form.value.description.trim()) { submitError.value = '请填写作品介绍'; return }
  submitting.value = true
  try {
    const res = await fetchWithAuth('/api/contest/submit', {
      method: 'POST',
      body: JSON.stringify(form.value) as any,
    })
    const data = await res.json()
    if (!res.ok) { submitError.value = data.error || '提交失败'; return }
    mySubmission.value = data.submission
    editMode.value = false
    form.value = { project_name: '', description: '', project_url: '', team_members: '' }
  } catch { submitError.value = '网络错误' } finally { submitting.value = false }
}

// ── 管理员判断 ──
const isOrganizer = ref(false)
async function checkRole() {
  if (!isLoggedIn.value) return
  try {
    const res = await fetchWithAuth('/api/contest/my-role')
    if (res.ok) {
      const data = await res.json()
      isOrganizer.value = data.is_admin || data.is_organizer
    }
  } catch {}
}

function formatTime(iso: string | null): string {
  if (!iso) return '待公布'
  return new Date(iso).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Shanghai' })
}

function formatDateTime(iso: string | null): string {
  if (!iso) return '-'
  return new Date(iso).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })
}

onMounted(async () => {
  await fetchContest()
  await Promise.all([fetchMySubmission(), checkRole()])
  timer = setInterval(() => { now.value = new Date() }, 1000)
})

onUnmounted(() => clearInterval(timer))
</script>

<template>
  <div class="kg-contest">
    <div v-if="loading" class="kg-loading">
      <div class="kg-spinner"></div>
      <span>加载中...</span>
    </div>

    <template v-else>
      <!-- Banner -->
      <div class="kg-card kg-contest-banner">
        <div class="kg-banner-content">
          <div class="kg-banner-text">
            <div class="kg-banner-badge">
              <img src="/icons/sidebar_trophy.svg" alt="" class="kg-banner-trophy" />
              <span>第一届</span>
            </div>
            <h1 class="kg-banner-title">{{ contest?.title || '「百块奖金」校园生活 Web 开发大赛' }}</h1>
            <p class="kg-banner-tagline">技术玩出圈，创意贴校园</p>
            <div class="kg-banner-times">
              <span>🚀 开始：{{ formatTime(contest?.start_time || DEFAULT_START) }}</span>
              <span>🏁 截止：{{ formatTime(contest?.end_time || DEFAULT_END) }}</span>
            </div>
          </div>
          <div class="kg-banner-right">
            <div class="kg-contest-status-badge" :class="{ ended: contestEnded, started: contestStarted && !contestEnded }">
              {{ contestEnded ? '已结束' : contestStarted ? '进行中' : '即将开始' }}
            </div>
            <NuxtLink v-if="isOrganizer" to="/contest/admin" class="kg-admin-btn">
              ⚙️ 管理后台
            </NuxtLink>
          </div>
        </div>

        <div class="kg-countdown">
          <p class="kg-countdown-label">{{ countdownLabel }}</p>
          <div v-if="!contestEnded" class="kg-countdown-grid">
            <div class="kg-countdown-unit">
              <span class="kg-countdown-num">{{ countdown.days }}</span>
              <span class="kg-countdown-label-sm">天</span>
            </div>
            <div class="kg-countdown-sep">:</div>
            <div class="kg-countdown-unit">
              <span class="kg-countdown-num">{{ countdown.hours }}</span>
              <span class="kg-countdown-label-sm">时</span>
            </div>
            <div class="kg-countdown-sep">:</div>
            <div class="kg-countdown-unit">
              <span class="kg-countdown-num">{{ countdown.minutes }}</span>
              <span class="kg-countdown-label-sm">分</span>
            </div>
            <div class="kg-countdown-sep">:</div>
            <div class="kg-countdown-unit">
              <span class="kg-countdown-num">{{ countdown.seconds }}</span>
              <span class="kg-countdown-label-sm">秒</span>
            </div>
          </div>
          <p v-else class="kg-ended-text">感谢参与！</p>
        </div>
      </div>

      <!-- 公告 -->
      <div v-if="contest?.announcements" class="kg-card kg-announcement">
        <div class="kg-announcement-header">
          <span class="kg-announcement-icon">📢</span>
          <h2 class="kg-announcement-title">比赛公告</h2>
        </div>
        <div class="kg-announcement-body kg-markdown-body" v-html="renderMarkdown(contest.announcements)"></div>
      </div>

      <!-- 比赛介绍 -->
      <div v-if="contest?.description" class="kg-card kg-intro">
        <h2 class="kg-section-title">比赛介绍</h2>
        <div class="kg-markdown-body" v-html="renderMarkdown(contest.description)"></div>
      </div>

      <!-- Organizer 管理面板入口 -->
      <div v-if="isOrganizer" class="kg-card kg-organizer-panel">
        <div class="kg-organizer-header">
          <span class="kg-organizer-badge">🛠️ 你是本次比赛的管理者</span>
        </div>
        <p class="kg-organizer-desc">你可以编辑比赛信息、发布公告、查看报名情况、导出提交数据。</p>
        <NuxtLink to="/contest/admin" class="kg-btn-primary kg-btn-lg">进入管理后台 →</NuxtLink>
      </div>

      <!-- 报名/参赛 区域（非管理者才显示） -->
      <div v-if="!isOrganizer" class="kg-card kg-action-section">
        <!-- 未登录 -->
        <template v-if="!isLoggedIn">
          <div class="kg-hint-box">
            <p>请先 <NuxtLink to="/login" class="kg-link">登录</NuxtLink> 后报名参赛</p>
          </div>
        </template>

        <!-- 已登录但未报名 -->
        <template v-else-if="!registered">
          <h2 class="kg-section-title">报名参赛</h2>
          <template v-if="canRegister">
            <p class="kg-register-desc">
              {{ contestStarted ? '比赛正在进行中，现在报名后可立即查看题目并提交作品！' : '比赛尚未开始，报名后等比赛开始即可查看题目。' }}
            </p>
            <div v-if="registerError" class="kg-form-error">{{ registerError }}</div>
            <button class="kg-btn-primary kg-btn-lg" @click="handleRegister" :disabled="registering">
              {{ registering ? '报名中...' : '立即报名' }}
            </button>
          </template>
          <template v-else>
            <div class="kg-hint-box"><p>比赛已结束，无法报名。</p></div>
          </template>
        </template>

        <!-- 已报名 -->
        <template v-else>
          <div class="kg-registered-badge">✅ 你已成功报名</div>

          <!-- 比赛未开始：报名了但看不到题目 -->
          <template v-if="!contestStarted">
            <div class="kg-hint-box">
              <p>⏳ 比赛尚未开始，题目将在 <strong>{{ formatTime(contest?.start_time || DEFAULT_START) }}</strong> 公布。</p>
              <p>请耐心等待，比赛开始后刷新页面即可查看题目并提交作品。</p>
            </div>
          </template>

          <!-- 比赛进行中或已结束：可以看到题目 -->
          <template v-else>
            <!-- 题目区域 -->
            <div v-if="contest?.rules" class="kg-topics">
              <h3 class="kg-subsection-title">比赛题目 / 规则</h3>
              <div class="kg-topics-content kg-markdown-body" v-html="renderMarkdown(contest.rules)"></div>
            </div>
            <div v-if="contest?.prizes" class="kg-topics">
              <h3 class="kg-subsection-title">奖项设置</h3>
              <div class="kg-topics-content kg-markdown-body" v-html="renderMarkdown(contest.prizes)"></div>
            </div>

            <!-- 提交作品 -->
            <template v-if="canSubmit">
              <h3 class="kg-subsection-title">我的参赛作品</h3>

              <template v-if="mySubmission && mySubmission.project_name !== '待提交' && !editMode">
                <div class="kg-submission-view">
                  <div class="kg-field">
                    <label>作品名称</label>
                    <p>{{ mySubmission.project_name }}</p>
                  </div>
                  <div class="kg-field">
                    <label>作品介绍</label>
                    <p>{{ mySubmission.description }}</p>
                  </div>
                  <div v-if="mySubmission.project_url" class="kg-field">
                    <label>项目链接</label>
                    <a :href="mySubmission.project_url" target="_blank" class="kg-link">{{ mySubmission.project_url }}</a>
                  </div>
                  <div v-if="mySubmission.team_members" class="kg-field">
                    <label>团队成员</label>
                    <p>{{ mySubmission.team_members }}</p>
                  </div>
                  <div class="kg-field">
                    <label>提交时间</label>
                    <p>{{ formatDateTime(mySubmission.submitted_at || mySubmission.updated_at) }}</p>
                  </div>
                  <button class="kg-btn-primary" @click="enterEditMode">编辑提交</button>
                </div>
              </template>

              <template v-else>
                <form class="kg-form" @submit.prevent="handleSubmit">
                  <div class="kg-form-group">
                    <label>作品名称 *</label>
                    <input v-model="form.project_name" class="kg-input" type="text" placeholder="请输入作品名称" required />
                  </div>
                  <div class="kg-form-group">
                    <label>作品介绍 *</label>
                    <textarea v-model="form.description" class="kg-textarea" rows="4" placeholder="请介绍你的作品..." required></textarea>
                  </div>
                  <div class="kg-form-group">
                    <label>项目链接（可选）</label>
                    <input v-model="form.project_url" class="kg-input" type="url" placeholder="https://..." />
                  </div>
                  <div class="kg-form-group">
                    <label>团队成员（可选，1-3人）</label>
                    <input v-model="form.team_members" class="kg-input" type="text" placeholder="姓名1, 姓名2, ..." />
                  </div>
                  <div v-if="submitError" class="kg-form-error">{{ submitError }}</div>
                  <div class="kg-form-actions">
                    <button v-if="editMode" type="button" class="kg-btn-ghost" @click="cancelEdit">取消</button>
                    <button type="submit" class="kg-btn-primary" :disabled="submitting">
                      {{ submitting ? '提交中...' : editMode ? '更新提交' : '提交作品' }}
                    </button>
                  </div>
                </form>
              </template>
            </template>

            <!-- 比赛已结束 -->
            <template v-else-if="contestEnded">
              <div class="kg-hint-box"><p>📋 比赛已结束，感谢您的参与！</p></div>
              <div v-if="mySubmission && mySubmission.project_name !== '待提交'" class="kg-submission-view" style="margin-top: 16px;">
                <div class="kg-field">
                  <label>你提交的作品</label>
                  <p>{{ mySubmission.project_name }}</p>
                </div>
              </div>
            </template>
          </template>
        </template>
      </div>
    </template>
  </div>
</template>

<style lang="scss" scoped>
.kg-contest {
  width: 100%;
  max-width: 860px;
  margin: 0 auto;
  padding: 24px 20px 60px;
}

.kg-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 80px;
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

.kg-card {
  background: #F5FBFE;
  border: 1.5px solid #c8dff8;
  border-radius: 16px;
  box-shadow: 0 2px 16px rgba(40, 57, 101, 0.07);
  padding: 28px 32px;
  margin-bottom: 20px;
}

// ── Banner ──
.kg-contest-banner {
  background: linear-gradient(135deg, #283965 0%, #1a5fa8 100%);
  border-color: transparent;
  color: #fff;
}

.kg-banner-content {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 24px;
}

.kg-banner-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(255,255,255,0.15);
  border-radius: 20px;
  padding: 4px 14px 4px 8px;
  font-size: 0.8rem;
  font-weight: 600;
  margin-bottom: 10px;
}

.kg-banner-trophy {
  width: 18px;
  height: 18px;
  filter: brightness(0) invert(1);
}

.kg-banner-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: #fff;
  margin: 0 0 6px;
  line-height: 1.4;
}

.kg-banner-tagline {
  font-size: 0.95rem;
  color: rgba(255,255,255,0.85);
  margin: 0 0 12px;
  font-weight: 500;
}

.kg-banner-times {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 0.85rem;
  color: rgba(255,255,255,0.7);
}

.kg-banner-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 10px;
  flex-shrink: 0;
}

.kg-contest-status-badge {
  padding: 6px 16px;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 700;
  background: rgba(255,255,255,0.2);
  color: #fff;
  &.started { background: rgba(38, 220, 120, 0.3); }
  &.ended { background: rgba(200,200,200,0.2); }
}

.kg-admin-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 16px;
  border-radius: 20px;
  font-size: 0.82rem;
  font-weight: 600;
  background: rgba(255,255,255,0.2);
  color: #fff;
  text-decoration: none;
  transition: background 0.2s;
  &:hover { background: rgba(255,255,255,0.35); }
}

.kg-countdown { text-align: center; }

.kg-countdown-label {
  font-size: 0.9rem;
  color: rgba(255,255,255,0.7);
  margin: 0 0 12px;
}

.kg-countdown-grid {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.kg-countdown-unit {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.kg-countdown-num {
  font-size: 2.5rem;
  font-weight: 800;
  color: #fff;
  line-height: 1;
  min-width: 60px;
  text-align: center;
  background: rgba(255,255,255,0.15);
  border-radius: 10px;
  padding: 6px 4px;
}

.kg-countdown-label-sm { font-size: 0.75rem; color: rgba(255,255,255,0.6); }
.kg-countdown-sep { font-size: 2rem; color: rgba(255,255,255,0.5); line-height: 1; margin-bottom: 16px; }
.kg-ended-text { font-size: 1.1rem; color: rgba(255,255,255,0.7); margin: 0; }

// ── 公告 ──
.kg-announcement {
  background: #fffbeb;
  border-color: #fde68a;
}

.kg-announcement-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.kg-announcement-icon { font-size: 1.2rem; }

.kg-announcement-title {
  font-size: 1rem;
  font-weight: 700;
  color: #92400e;
  margin: 0;
}

.kg-announcement-body {
  color: #78350f;
  font-size: 0.93rem;
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-word;
}

// ── Markdown 渲染 ──
.kg-markdown-body {
  color: #2a3f5f;
  font-size: 0.93rem;
  line-height: 1.8;
  word-break: break-word;

  :deep(p) { margin: 0 0 12px; }
  :deep(p:last-child) { margin-bottom: 0; }
  :deep(strong) { color: #1a2a4a; }
  :deep(h1) { font-size: 1.4rem; font-weight: 700; color: #1a2a4a; margin: 20px 0 12px; }
  :deep(h2) { font-size: 1.2rem; font-weight: 700; color: #1a2a4a; margin: 18px 0 10px; }
  :deep(h3) { font-size: 1.05rem; font-weight: 600; color: #1a2a4a; margin: 14px 0 8px; }
  :deep(ul), :deep(ol) { padding-left: 24px; margin: 8px 0 12px; }
  :deep(li) { margin-bottom: 4px; }
  :deep(blockquote) {
    margin: 12px 0;
    padding: 10px 16px;
    background: linear-gradient(90deg, rgba(38,164,255,0.08), rgba(38,164,255,0.02));
    border-left: 3px solid #26a4ff;
    border-radius: 0 8px 8px 0;
    color: #1a5fa8;
    font-weight: 500;
  }
  :deep(code) {
    background: rgba(38,164,255,0.08);
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 0.88em;
    color: #1a5fa8;
  }
  :deep(pre) {
    background: #1a2a4a;
    color: #e2e8f0;
    padding: 14px 18px;
    border-radius: 10px;
    overflow-x: auto;
    margin: 12px 0;
    code { background: none; color: inherit; padding: 0; }
  }
  :deep(a) { color: #26a4ff; text-decoration: none; &:hover { text-decoration: underline; } }
  :deep(hr) { border: none; border-top: 1px solid #c8dff8; margin: 16px 0; }
  :deep(table) {
    width: 100%;
    border-collapse: collapse;
    margin: 12px 0;
    font-size: 0.88rem;
    th, td { padding: 8px 12px; border: 1px solid #c8dff8; text-align: left; }
    th { background: #e8f4fd; font-weight: 600; color: #1a2a4a; }
  }
  :deep(img) { max-width: 100%; border-radius: 8px; }
}

// ── 通用 ──
.kg-section-title {
  font-size: 1.1rem;
  font-weight: 700;
  color: #1a2a4a;
  margin: 0 0 16px;
}

.kg-subsection-title {
  font-size: 1rem;
  font-weight: 600;
  color: #1a2a4a;
  margin: 20px 0 12px;
}

.kg-registered-badge {
  display: inline-block;
  padding: 6px 16px;
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.3);
  border-radius: 20px;
  color: #059669;
  font-size: 0.9rem;
  font-weight: 600;
  margin-bottom: 16px;
}

.kg-topics {
  background: #fff;
  border: 1px solid #daeef9;
  border-radius: 12px;
  padding: 16px 20px;
  margin-bottom: 12px;
}

.kg-topics-content {
  color: #2a3f5f;
  font-size: 0.9rem;
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-word;
}

.kg-register-desc {
  color: #4a6080;
  font-size: 0.93rem;
  margin: 0 0 16px;
  line-height: 1.6;
}

.kg-submission-view { display: flex; flex-direction: column; gap: 16px; }

.kg-field {
  label { display: block; font-size: 0.8rem; font-weight: 600; color: #6a85a0; margin-bottom: 4px; }
  p { margin: 0; color: #1a2a4a; font-size: 0.93rem; line-height: 1.6; }
}

.kg-link { color: #26a4ff; text-decoration: none; &:hover { text-decoration: underline; } }

.kg-form { display: flex; flex-direction: column; gap: 18px; }

.kg-form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  label { font-size: 0.85rem; font-weight: 600; color: #4a6080; }
}

.kg-input, .kg-textarea {
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

.kg-textarea { resize: vertical; }

.kg-form-error {
  padding: 10px 14px;
  background: rgba(224, 90, 90, 0.1);
  border: 1px solid rgba(224, 90, 90, 0.3);
  border-radius: 10px;
  color: #e05a5a;
  font-size: 0.875rem;
}

.kg-form-actions { display: flex; gap: 12px; justify-content: flex-end; }

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

.kg-btn-lg {
  padding: 12px 36px;
  font-size: 1rem;
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
  display: inline-block;
  &:hover { background: #F5FBFE; }
}

// ── Organizer 面板 ──
.kg-organizer-panel {
  background: linear-gradient(135deg, #f0f7ff 0%, #e8f4fd 100%);
  border-color: #a8d4f5;
}

.kg-organizer-header {
  margin-bottom: 10px;
}

.kg-organizer-badge {
  display: inline-block;
  padding: 5px 14px;
  background: #283965;
  color: #fff;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 600;
}

.kg-organizer-desc {
  color: #4a6080;
  font-size: 0.93rem;
  margin: 0 0 16px;
  line-height: 1.6;
}

.kg-hint-box {
  text-align: center;
  padding: 20px;
  background: rgba(38, 164, 255, 0.06);
  border-radius: 12px;
  color: #4a6080;
  p { margin: 4px 0; font-size: 0.93rem; }
}

</style>
