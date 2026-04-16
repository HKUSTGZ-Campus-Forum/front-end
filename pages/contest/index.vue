<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { marked } from 'marked'

definePageMeta({ layout: 'keguang' })

marked.setOptions({ breaks: true, gfm: true })

function renderMarkdown(text: string | null | undefined): string {
  if (!text) return ''
  return marked.parse(text) as string
}

const { isLoggedIn } = useAuth()
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
const DEFAULT_END = '2026-04-21T00:00:00+08:00'

const startTime = computed(() => contest.value?.start_time ? new Date(contest.value.start_time) : new Date(DEFAULT_START))
const endTime = computed(() => contest.value?.end_time ? new Date(contest.value.end_time) : new Date(DEFAULT_END))

const now = ref(new Date())
let timer: ReturnType<typeof setInterval>

const contestStarted = computed(() => now.value >= startTime.value)
const contestEnded = computed(() => now.value >= endTime.value)

const isOrganizer = ref(false)

const targetTime = computed(() => contestStarted.value ? endTime.value : startTime.value)

const countdownHuman = computed(() => {
  if (contestEnded.value) return '比赛已结束'
  const diff = Math.max(0, targetTime.value.getTime() - now.value.getTime())
  const totalSeconds = Math.floor(diff / 1000)
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const prefix = contestStarted.value ? '离提交截止还有' : '离比赛开始还有'
  return `${prefix} ${days} 天 ${hours} 小时 ${minutes} 分钟 ${seconds} 秒`
})

// ── 双赛道 ──
type TrackId = 'tech' | 'fun'

const TRACK_LIST = [
  { id: 'tech' as TrackId, title: '技术赛道' },
  { id: 'fun' as TrackId, title: '娱乐赛道' },
] as const

function emptyContestForm() {
  return { project_name: '', project_url: '', team_members: '' }
}

// ── 报名逻辑 ──
const registering = ref(false)
const registerError = ref('')

/** 两条赛道均有报名占位记录（后端一次写入 tech + fun） */
const mySubmissions = ref<Partial<Record<TrackId, any>> | null>(null)
const registered = computed(() => {
  const s = mySubmissions.value
  if (!s) return false
  return s.tech != null && s.fun != null
})

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
      await fetchMySubmission()
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

/** 与后端一致：管理后台「开放报名/提交」关闭时，接口会拒绝报名与提交 */
const contestOpen = computed(() => contest.value?.is_active !== false)

const canSubmit = computed(() =>
  registered.value
  && contestStarted.value
  && !contestEnded.value
  && !isOrganizer.value
  && contestOpen.value,
)
const canRegister = computed(() => !contestEnded.value && contestOpen.value)

// ── 提交逻辑（按赛道） ──
const editMode = ref<Record<TrackId, boolean>>({ tech: false, fun: false })
const forms = ref<Record<TrackId, ReturnType<typeof emptyContestForm>>>({
  tech: emptyContestForm(),
  fun: emptyContestForm(),
})
const submitErrors = ref<Record<TrackId, string>>({ tech: '', fun: '' })
const submittingTrack = ref<TrackId | null>(null)

function isValidHttpUrl(s: string): boolean {
  try {
    const u = new URL(s.trim())
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

async function fetchMySubmission() {
  if (!isLoggedIn.value) return
  try {
    const res = await fetchWithAuth('/api/contest/my-submission')
    if (res.ok) {
      const data = await res.json()
      mySubmissions.value = data.submissions ?? null
    }
  } catch {}
}

function enterEditMode(track: TrackId) {
  const sub = mySubmissions.value?.[track]
  if (!sub) return
  forms.value[track] = {
    project_name: sub.project_name || '',
    project_url: sub.project_url || '',
    team_members: sub.team_members || '',
  }
  editMode.value[track] = true
}

function cancelEdit(track: TrackId) {
  editMode.value[track] = false
  submitErrors.value[track] = ''
  const sub = mySubmissions.value?.[track]
  forms.value[track] = sub
    ? {
        project_name: sub.project_name === '待提交' ? '' : (sub.project_name || ''),
        project_url: sub.project_url || '',
        team_members: sub.team_members || '',
      }
    : emptyContestForm()
}

async function handleSubmit(track: TrackId) {
  submitErrors.value[track] = ''
  const f = forms.value[track]
  if (!f.project_name.trim()) { submitErrors.value[track] = '请填写队名'; return }
  if (f.project_name.trim() === '待提交') { submitErrors.value[track] = '队名不能使用「待提交」'; return }
  if (!f.project_url.trim()) { submitErrors.value[track] = '请填写项目链接'; return }
  if (!isValidHttpUrl(f.project_url)) { submitErrors.value[track] = '项目链接需为有效的 http(s) 地址'; return }
  if (!f.team_members.trim()) { submitErrors.value[track] = '请填写团队成员'; return }
  submittingTrack.value = track
  try {
    const res = await fetchWithAuth('/api/contest/submit', {
      method: 'POST',
      body: JSON.stringify({
        track,
        project_name: f.project_name.trim(),
        project_url: f.project_url.trim(),
        team_members: f.team_members.trim(),
      }) as any,
    })
    const data = await res.json()
    if (!res.ok) {
      submitErrors.value[track] = data.error || '提交失败'
      return
    }
    if (data.submissions) mySubmissions.value = data.submissions
    editMode.value[track] = false
    forms.value[track] = emptyContestForm()
  } catch {
    submitErrors.value[track] = '网络错误'
  } finally {
    submittingTrack.value = null
  }
}

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

/** 题目 Tab：已报名且已开始，或管理员（任意时刻可预览） */
const showTabProblems = computed(() => isOrganizer.value || (registered.value && contestStarted.value))
type TabId = 'description' | 'announcements' | 'problems'
const activeTab = ref<TabId>('description')

watch(
  [showTabProblems, activeTab],
  () => {
    if (activeTab.value === 'problems' && !showTabProblems.value) activeTab.value = 'description'
  },
)

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
      <header class="kg-page-head">
        <div class="kg-page-head-main">
          <div class="kg-page-title-row">
            <span class="kg-title-icon" role="img" aria-label="奖杯">🏆</span>
            <h1 class="kg-page-title">{{ contest?.title || '「百块奖金」校园生活 Web 开发大赛' }}</h1>
            <div
              class="kg-status-pill"
              :class="{
                ended: contestEnded,
                on: contestStarted && !contestEnded && contestOpen,
                paused: contestStarted && !contestEnded && !contestOpen,
              }"
            >
              {{
                contestEnded
                  ? '已结束'
                  : contestStarted && !contestOpen
                    ? '暂不开放'
                    : contestStarted
                      ? '进行中'
                      : '即将开始'
              }}
            </div>
          </div>
          <nav class="kg-tabs" aria-label="比赛导航">
            <button
              type="button"
              class="kg-tab"
              :class="{ active: activeTab === 'description' }"
              @click="activeTab = 'description'"
            >
              比赛说明
            </button>
            <button
              type="button"
              class="kg-tab"
              :class="{ active: activeTab === 'announcements' }"
              @click="activeTab = 'announcements'"
            >
              比赛公告
            </button>
            <button
              v-if="showTabProblems"
              type="button"
              class="kg-tab"
              :class="{ active: activeTab === 'problems' }"
              @click="activeTab = 'problems'"
            >
              题目
            </button>
          </nav>
        </div>
        <div class="kg-page-head-aside">
          <p class="kg-countdown-line">{{ countdownHuman }}</p>
          <div class="kg-time-meta-row">
            <p class="kg-time-meta">
              开始 {{ formatTime(contest?.start_time || DEFAULT_START) }}
            </p>
            <span class="kg-time-meta-sep" aria-hidden="true">·</span>
            <p class="kg-time-meta">
              截止 {{ formatTime(contest?.end_time || DEFAULT_END) }}
            </p>
          </div>
        </div>
      </header>

      <div class="kg-layout">
        <main class="kg-main">
          <!-- 比赛说明 -->
          <div v-show="activeTab === 'description'" class="kg-panel kg-card">
            <template v-if="contest?.description">
              <div class="kg-markdown-body" v-html="renderMarkdown(contest.description)"></div>
            </template>
            <p v-else class="kg-empty">暂无比赛说明。</p>
          </div>

          <!-- 比赛公告 -->
          <div v-show="activeTab === 'announcements'" class="kg-panel kg-card">
            <template v-if="contest?.announcements">
              <div class="kg-markdown-body" v-html="renderMarkdown(contest.announcements)"></div>
            </template>
            <p v-else class="kg-empty">暂无公告。</p>
          </div>

          <!-- 题目（与后台「编辑题目」同一 Markdown 字段） -->
          <div v-show="activeTab === 'problems'" class="kg-panel">
            <div v-if="contest?.rules" class="kg-card kg-block">
              <h2 class="kg-block-title">题目</h2>
              <div class="kg-markdown-body" v-html="renderMarkdown(contest.rules)"></div>
            </div>
            <p v-else class="kg-card kg-empty">题目尚未发布。</p>

            <p v-if="isOrganizer && activeTab === 'problems'" class="kg-organizer-hint kg-card">
              你正在以<strong>管理员</strong>身份预览题目区。选手在报名且比赛开始后才会看到本页；提交列表与导出请在完整后台操作。
            </p>

            <!-- 选手提交：技术 / 娱乐双赛道，互不覆盖 -->
            <template v-if="!isOrganizer && registered && contestStarted">
              <template v-if="canSubmit">
                <div
                  v-for="item in TRACK_LIST"
                  :key="item.id"
                  class="kg-card kg-block kg-track-block"
                >
                  <h2 class="kg-block-title">{{ item.title }}</h2>
                  <template
                    v-if="mySubmissions?.[item.id] && mySubmissions[item.id].project_name !== '待提交' && !editMode[item.id]"
                  >
                    <div class="kg-submission-view">
                      <div class="kg-field">
                        <label>队名</label>
                        <p>{{ mySubmissions[item.id].project_name }}</p>
                      </div>
                      <div class="kg-field">
                        <label>项目链接</label>
                        <a :href="mySubmissions[item.id].project_url" target="_blank" class="kg-link">{{ mySubmissions[item.id].project_url }}</a>
                      </div>
                      <div class="kg-field">
                        <label>团队成员</label>
                        <p>{{ mySubmissions[item.id].team_members }}</p>
                      </div>
                      <div class="kg-field">
                        <label>提交时间</label>
                        <p>{{ formatDateTime(mySubmissions[item.id].submitted_at || mySubmissions[item.id].updated_at) }}</p>
                      </div>
                      <button type="button" class="kg-btn-primary" @click="enterEditMode(item.id)">编辑提交</button>
                    </div>
                  </template>
                  <template v-else>
                    <form class="kg-form" @submit.prevent="handleSubmit(item.id)">
                      <div class="kg-form-group">
                        <label>项目链接 *</label>
                        <input v-model="forms[item.id].project_url" class="kg-input" type="url" placeholder="https://..." required />
                      </div>
                      <div class="kg-form-group">
                        <label>队名 *</label>
                        <input v-model="forms[item.id].project_name" class="kg-input" type="text" placeholder="请输入队名" required />
                      </div>
                      <div class="kg-form-group">
                        <label>团队成员 *</label>
                        <input v-model="forms[item.id].team_members" class="kg-input" type="text" placeholder="例如：张三, 李四" required />
                      </div>
                      <div v-if="submitErrors[item.id]" class="kg-form-error">{{ submitErrors[item.id] }}</div>
                      <div class="kg-form-actions">
                        <button
                          v-if="editMode[item.id]"
                          type="button"
                          class="kg-btn-ghost"
                          @click="cancelEdit(item.id)"
                        >
                          取消
                        </button>
                        <button type="submit" class="kg-btn-primary" :disabled="submittingTrack === item.id">
                          {{
                            submittingTrack === item.id
                              ? '提交中...'
                              : editMode[item.id]
                                ? '更新提交'
                                : '提交作品'
                          }}
                        </button>
                      </div>
                    </form>
                  </template>
                </div>
              </template>
              <div v-else-if="contestEnded" class="kg-card kg-hint-box">
                <p>比赛已结束，感谢参与。</p>
                <template v-for="item in TRACK_LIST" :key="'end-' + item.id">
                  <div
                    v-if="mySubmissions?.[item.id] && mySubmissions[item.id].project_name !== '待提交'"
                    class="kg-submission-view kg-track-end-summary"
                  >
                    <p class="kg-track-end-title">{{ item.title }}</p>
                    <div class="kg-field">
                      <label>队名</label>
                      <p>{{ mySubmissions[item.id].project_name }}</p>
                    </div>
                    <div v-if="mySubmissions[item.id].project_url" class="kg-field">
                      <label>项目链接</label>
                      <a :href="mySubmissions[item.id].project_url" target="_blank" class="kg-link">{{ mySubmissions[item.id].project_url }}</a>
                    </div>
                    <div v-if="mySubmissions[item.id].team_members" class="kg-field">
                      <label>团队成员</label>
                      <p>{{ mySubmissions[item.id].team_members }}</p>
                    </div>
                  </div>
                </template>
              </div>
            </template>
          </div>

        </main>

        <aside class="kg-aside">
          <div class="kg-card kg-aside-block">
            <h3 class="kg-aside-title">比赛报名</h3>
            <template v-if="isOrganizer">
              <p class="kg-aside-text">你是比赛管理员，报名与提交请用选手账号体验；或使用后台管理数据。</p>
              <NuxtLink to="/contest/admin" class="kg-btn-ghost kg-aside-btn">打开管理后台</NuxtLink>
            </template>
            <template v-else-if="!isLoggedIn">
              <p class="kg-aside-text">您还没有报名本场比赛</p>
              <NuxtLink to="/login" class="kg-btn-primary kg-aside-btn">登录后报名</NuxtLink>
            </template>
            <template v-else-if="!registered">
              <p class="kg-aside-text">您还没有报名本场比赛</p>
              <div v-if="registerError" class="kg-form-error kg-aside-error">{{ registerError }}</div>
              <button
                v-if="canRegister"
                type="button"
                class="kg-btn-primary kg-aside-btn"
                :disabled="registering"
                @click="handleRegister"
              >
                {{ registering ? '报名中...' : '报名' }}
              </button>
              <p v-else-if="contestEnded" class="kg-aside-muted">比赛已结束，无法报名。</p>
              <p v-else class="kg-aside-muted">
                比赛暂未开放报名：管理员已在后台关闭「开放报名/提交」。开启后即可点击报名。
              </p>
            </template>
            <template v-else>
              <p class="kg-aside-ok">您已成功报名</p>
              <p v-if="!contestStarted" class="kg-aside-text">
                比赛尚未开始，题目将在开始后显示在「题目」标签页。
              </p>
              <p v-else-if="contestEnded" class="kg-aside-text">比赛已结束。</p>
              <p v-else-if="!contestOpen" class="kg-aside-text">
                报名与提交已由管理员暂停，请留意公告；开启「开放报名/提交」后可继续操作。
              </p>
              <p v-else class="kg-aside-text">请前往「题目」查看赛题；技术赛道与娱乐赛道各有独立提交入口。</p>
            </template>
          </div>

          <div class="kg-card kg-aside-block kg-discuss">
            <h3 class="kg-aside-title">比赛讨论区</h3>
            <p class="kg-aside-text">
              赛题交流、组队讨论可前往站内论坛；本页专注于说明与提交。
            </p>
            <NuxtLink to="/forum" class="kg-link kg-discuss-link">前往论坛 →</NuxtLink>
          </div>
        </aside>
      </div>
    </template>
  </div>
</template>

<style lang="scss" scoped>
.kg-contest {
  width: 100%;
  max-width: 1180px;
  margin: 0 auto;
  padding: 20px 20px 56px;
}

.kg-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 80px;
  color: var(--text-secondary);
}

.kg-spinner {
  width: 28px;
  height: 28px;
  border: 3px solid var(--border-primary);
  border-top-color: var(--interactive-primary);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

.kg-card {
  background: var(--surface-primary);
  border: 1px solid var(--border-secondary);
  border-radius: 14px;
  box-shadow: var(--shadow-small);
  padding: 22px 24px;
}

// ── Page header ──
.kg-page-head {
  display: flex;
  flex-wrap: wrap;
  align-items: stretch;
  justify-content: space-between;
  gap: 20px 28px;
  margin-bottom: 20px;
  padding: 22px 24px 0;
  background: var(--surface-primary);
  border: 1px solid var(--border-secondary);
  border-radius: 14px;
  box-shadow: var(--shadow-small);
}

.kg-page-head-main {
  flex: 1;
  min-width: 280px;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.kg-page-title-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px 12px;
  padding-top: 10px;
}

.kg-title-icon {
  flex-shrink: 0;
  font-size: 1.75rem;
  line-height: 1;
  display: inline-flex;
  align-items: center;
}

.kg-page-title {
  font-size: 1.52rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
  line-height: 1.32;
}

.kg-page-head-aside {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  justify-content: center;
  align-self: center;
  gap: 24px;
  text-align: right;
  max-width: 440px;
  padding-top: 18px;
}

.kg-status-pill {
  display: inline-block;
  padding: 5px 16px;
  border-radius: 20px;
  font-size: 0.9rem;
  font-weight: 700;
  background: var(--surface-secondary);
  color: var(--interactive-primary);
  flex-shrink: 0;

  &.on {
    background: rgba(16, 185, 129, 0.12);
    color: var(--semantic-success);
  }

  &.ended {
    background: var(--surface-secondary);
    color: var(--text-muted);
  }

  &.paused {
    background: rgba(245, 158, 11, 0.14);
    color: #b45309;
  }
}

.kg-countdown-line {
  margin: 0;
  font-size: 1.12rem;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.38;
  letter-spacing: 0.01em;
}

.kg-time-meta-row {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: flex-end;
  gap: 6px 10px;
}

.kg-time-meta-sep {
  color: var(--text-muted);
  font-size: 0.85rem;
  user-select: none;
}

.kg-time-meta {
  margin: 0;
  font-size: 0.82rem;
  color: var(--text-secondary);
  line-height: 1.55;
}

// ── Tabs ──
.kg-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
  margin-top: auto;
  padding-top: 18px;
}

.kg-tab {
  padding: 10px 18px;
  border: none;
  background: transparent;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-secondary);
  cursor: pointer;
  border-radius: 8px 8px 0 0;
  position: relative;
  transition: color var(--transition-fast), background var(--transition-fast);

  &:hover {
    color: var(--interactive-primary);
    background: rgba(38, 164, 255, 0.06);
  }

  &.active {
    color: var(--interactive-primary);
    background: var(--surface-primary);
  }

  &.active::after {
    content: '';
    position: absolute;
    left: 8px;
    right: 8px;
    bottom: -1px;
    height: 2.5px;
    background: var(--interactive-primary);
    border-radius: 2px 2px 0 0;
  }
}

// ── Layout ──
.kg-layout {
  display: grid;
  grid-template-columns: 1fr 300px;
  gap: 24px;
  align-items: start;
}

@media (max-width: 960px) {
  .kg-layout {
    grid-template-columns: 1fr;
  }
  .kg-page-head-aside {
    align-items: flex-start;
    align-self: stretch;
    justify-content: flex-start;
    text-align: left;
    max-width: none;
    width: 100%;
    padding-top: 0;
  }

  .kg-time-meta-row {
    justify-content: flex-start;
  }
}

.kg-main {
  min-width: 0;
}

.kg-panel {
  min-height: 120px;
}

.kg-block-title {
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 14px;
}

.kg-block {
  margin-bottom: 16px;
}

.kg-empty {
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.93rem;
}

.kg-organizer-hint {
  margin-top: 16px;
  background: var(--surface-secondary);
  border-color: var(--border-primary);
  font-size: 0.9rem;
  color: var(--text-secondary);
  line-height: 1.6;
}

// ── Sidebar ──
.kg-aside-block {
  margin-bottom: 16px;
}

.kg-aside-title {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 12px;
}

.kg-aside-text {
  font-size: 0.88rem;
  color: var(--text-secondary);
  line-height: 1.6;
  margin: 0 0 12px;
}

.kg-aside-muted {
  font-size: 0.85rem;
  color: var(--text-muted);
  margin: 0;
}

.kg-aside-ok {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--semantic-success);
  margin: 0 0 8px;
}

.kg-aside-btn {
  display: inline-block;
  width: 100%;
  text-align: center;
  text-decoration: none;
  box-sizing: border-box;
}

.kg-aside-error {
  margin-bottom: 10px;
  font-size: 0.82rem;
}

.kg-discuss-link {
  font-size: 0.88rem;
  font-weight: 600;
}

// ── Markdown body ──
.kg-markdown-body {
  color: var(--text-primary);
  font-size: 0.93rem;
  line-height: 1.8;
  word-break: break-word;

  :deep(p) { margin: 0 0 12px; }
  :deep(p:last-child) { margin-bottom: 0; }
  :deep(strong) { color: var(--text-primary); }
  :deep(h1) { font-size: 1.35rem; font-weight: 700; color: var(--text-primary); margin: 16px 0 12px; }
  :deep(h2) { font-size: 1.15rem; font-weight: 700; color: var(--text-primary); margin: 14px 0 10px; }
  :deep(h3) { font-size: 1.02rem; font-weight: 600; color: var(--text-primary); margin: 12px 0 8px; }
  :deep(ul), :deep(ol) { padding-left: 24px; margin: 8px 0 12px; }
  :deep(li) { margin-bottom: 4px; }
  :deep(blockquote) {
    margin: 12px 0;
    padding: 10px 16px;
    background: rgba(38, 164, 255, 0.06);
    border-left: 3px solid var(--interactive-primary);
    border-radius: 0 8px 8px 0;
    color: var(--text-secondary);
    font-weight: 500;
  }
  :deep(code) {
    background: rgba(38, 164, 255, 0.07);
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 0.88em;
    color: var(--interactive-hover);
  }
  :deep(pre) {
    background: var(--sidebar-bg);
    color: #e2e8f0;
    padding: 14px 18px;
    border-radius: 10px;
    overflow-x: auto;
    margin: 12px 0;
    code { background: none; color: inherit; padding: 0; }
  }
  :deep(a) { color: var(--interactive-primary); text-decoration: none; &:hover { text-decoration: underline; } }
  :deep(hr) { border: none; border-top: 1px solid var(--border-primary); margin: 16px 0; }
  :deep(table) {
    width: 100%;
    border-collapse: collapse;
    margin: 12px 0;
    font-size: 0.88rem;
    th, td { padding: 8px 12px; border: 1px solid var(--border-primary); text-align: left; }
    th { background: var(--surface-secondary); font-weight: 600; color: var(--text-primary); }
  }
  :deep(img) { max-width: 100%; border-radius: 8px; }
}

// ── Submission view ──
.kg-submission-view { display: flex; flex-direction: column; gap: 16px; }

.kg-track-block + .kg-track-block {
  margin-top: 16px;
}

.kg-track-end-summary {
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid var(--border-secondary);
}

.kg-track-end-title {
  margin: 0 0 8px;
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--text-primary);
}

.kg-field {
  label { display: block; font-size: 0.8rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 4px; }
  p { margin: 0; color: var(--text-primary); font-size: 0.93rem; line-height: 1.6; }
}

.kg-link { color: var(--interactive-primary); text-decoration: none; &:hover { text-decoration: underline; } }

// ── Form ──
.kg-form { display: flex; flex-direction: column; gap: 18px; }

.kg-form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  label { font-size: 0.85rem; font-weight: 600; color: var(--text-secondary); }
}

.kg-input, .kg-textarea {
  padding: 10px 14px;
  border: 1.5px solid var(--border-primary);
  border-radius: 10px;
  background: var(--surface-primary);
  color: var(--text-primary);
  font-size: 0.9rem;
  outline: none;
  font-family: inherit;
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
  &:focus {
    border-color: var(--border-focus);
    box-shadow: 0 0 0 3px rgba(38, 164, 255, 0.1);
  }
  &::placeholder { color: var(--text-muted); }
}

.kg-textarea { resize: vertical; }

.kg-form-error {
  padding: 10px 14px;
  background: rgba(239, 68, 68, 0.06);
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: 10px;
  color: var(--semantic-error);
  font-size: 0.875rem;
}

.kg-form-actions { display: flex; gap: 12px; justify-content: flex-end; }

// ── Buttons ──
.kg-btn-primary {
  padding: 9px 22px;
  background: var(--interactive-primary);
  color: var(--text-inverse);
  border: none;
  border-radius: 10px;
  font-size: 0.88rem;
  font-weight: 600;
  cursor: pointer;
  transition: background var(--transition-fast), box-shadow var(--transition-fast);

  &:hover:not(:disabled) {
    background: var(--interactive-hover);
    box-shadow: var(--shadow-small);
  }

  &:active:not(:disabled) {
    background: var(--interactive-active);
  }

  &:disabled {
    background: var(--interactive-disabled);
    cursor: not-allowed;
  }
}

.kg-btn-lg {
  padding: 12px 28px;
  font-size: 1rem;
}

.kg-btn-ghost {
  padding: 9px 22px;
  border: 1.5px solid var(--border-primary);
  border-radius: 10px;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 0.88rem;
  font-weight: 500;
  text-decoration: none;
  display: inline-block;
  transition: background var(--transition-fast), border-color var(--transition-fast);

  &:hover {
    background: var(--surface-secondary);
    border-color: var(--interactive-secondary);
  }
}

.kg-hint-box {
  text-align: center;
  padding: 20px;
  background: var(--surface-secondary);
  border-radius: 12px;
  color: var(--text-secondary);
  p { margin: 4px 0; font-size: 0.93rem; }
}
</style>
