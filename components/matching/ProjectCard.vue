<template>
  <div class="project-card" @click="viewProjectDetails" role="button" tabindex="0">
    <!-- Match Score Badge (for recommended projects) -->
    <div v-if="matchInfo" class="match-badge">
      <Icon name="star" />
      {{ Math.round(matchInfo.combined_score * 100) }}% match
    </div>

    <!-- Project Header -->
    <div class="project-header">
      <h3 class="project-title">{{ project.title }}</h3>
      <div class="project-meta">
        <span class="project-type" v-if="project.project_type">
          {{ formatProjectType(project.project_type) }}
        </span>
        <span class="difficulty-badge" :class="`difficulty-${project.difficulty_level}`">
          {{ project.difficulty_level }}
        </span>
      </div>
    </div>

    <!-- Project Description -->
    <p class="project-description">
      {{ truncateText(project.description, 120) }}
    </p>

    <!-- Skills Required -->
    <div v-if="project.required_skills?.length" class="skills-section">
      <h4>Required Skills</h4>
      <div class="skills-list">
        <span
          v-for="skill in project.required_skills.slice(0, 4)"
          :key="skill"
          class="skill-tag"
        >
          {{ skill }}
        </span>
        <span v-if="project.required_skills.length > 4" class="more-skills">
          +{{ project.required_skills.length - 4 }} more
        </span>
      </div>
    </div>

    <!-- Match Reasons (for recommended projects) -->
    <div v-if="matchInfo?.match_reasons?.length" class="match-reasons">
      <h4>Why this matches you</h4>
      <ul class="reasons-list">
        <li v-for="reason in matchInfo.match_reasons.slice(0, 2)" :key="reason">
          {{ reason }}
        </li>
      </ul>
    </div>

    <!-- Project Stats -->
    <div class="project-stats">
      <div class="stat-item">
        <Icon name="users" />
        {{ project.current_team_size }}/{{ project.team_size_max }}
      </div>
      <div class="stat-item">
        <Icon name="heart" />
        {{ project.interest_count }}
      </div>
      <div class="stat-item">
        <Icon name="eye" />
        {{ project.view_count }}
      </div>
      <div class="stat-item">
        <Icon name="calendar" />
        {{ formatDate(project.created_at) }}
      </div>
    </div>

    <!-- Creator Info -->
    <div class="creator-info">
      <div class="creator-avatar" @click.stop="viewCreatorProfile" role="button" tabindex="0">
        <UserAvatar
          :avatar-url="project.creator?.avatar_url"
          :username="project.creator?.username"
          :user-id="project.creator?.id"
          size="sm"
          :clickable="true"
        />
      </div>
      <span class="creator-name">{{ project.creator?.username }}</span>
    </div>

    <!-- User Profile Modal (teleported to body) -->
    <Teleport to="body">
      <UserProfileModal
        :is-open="showProfileModal"
        :user-id="selectedUserId"
        @close="showProfileModal = false"
      />
    </Teleport>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import UserAvatar from '~/components/user/UserAvatar.vue'
import UserProfileModal from '~/components/matching/UserProfileModal.vue'

// Props
const props = defineProps({
  project: {
    type: Object,
    required: true
  },
  matchInfo: {
    type: Object,
    default: null
  }
})

// Methods
const formatProjectType = (type) => {
  const types = {
    'web': 'Web Dev',
    'mobile': 'Mobile',
    'ai': 'AI/ML',
    'game': 'Game Dev',
    'research': 'Research',
    'hardware': 'Hardware',
    'other': 'Other'
  }
  return types[type] || type
}

const truncateText = (text, maxLength) => {
  if (!text) return ''
  if (text.length <= maxLength) return text
  return text.substr(0, maxLength) + '...'
}

const formatDate = (dateString) => {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now - date
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`

  return date.toLocaleDateString()
}

// State
const showProfileModal = ref(false)
const selectedUserId = ref(null)

const viewProjectDetails = () => {
  navigateTo(`/matching/projects/${props.project.id}`)
}

const viewCreatorProfile = () => {
  if (props.project.creator?.id) {
    selectedUserId.value = props.project.creator.id
    showProfileModal.value = true
  }
}
</script>

<style scoped>
.project-card {
  background: var(--surface-primary, white);
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.08);
  border: 1px solid #e9ecef;
  transition: all 0.3s ease;
  position: relative;
  height: fit-content;
  cursor: pointer;
}

.project-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 25px rgba(0,0,0,0.12);
}

.project-card:focus {
  outline: 2px solid #3498db;
  outline-offset: 2px;
}

.match-badge {
  position: absolute;
  top: 16px;
  right: 16px;
  background: linear-gradient(135deg, #f39c12, #e67e22);
  color: white;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 4px;
}

.project-header {
  margin-bottom: 16px;
  margin-right: 60px; /* Space for match badge */
}

.project-title {
  margin: 0 0 8px 0;
  font-size: 1.3rem;
  color: var(--text-primary, #2c3e50);
  font-weight: 600;
  line-height: 1.3;
}

.project-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.project-type {
  background: #ecf0f1;
  color: #7f8c8d;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 500;
}

.difficulty-badge {
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 500;
  text-transform: capitalize;
}

.difficulty-beginner { background: #d5f4e6; color: #27ae60; }
.difficulty-intermediate { background: #fef9e7; color: #f39c12; }
.difficulty-advanced { background: #fadbd8; color: #e74c3c; }

.project-description {
  color: #7f8c8d;
  line-height: 1.5;
  margin-bottom: 16px;
}

.skills-section {
  margin-bottom: 16px;
}

.skills-section h4 {
  margin: 0 0 8px 0;
  font-size: 0.9rem;
  color: var(--text-primary, #2c3e50);
  font-weight: 600;
}

.skills-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.skill-tag {
  background: #e3f2fd;
  color: #1976d2;
  padding: 4px 8px;
  border-radius: 10px;
  font-size: 0.8rem;
  font-weight: 500;
}

.more-skills {
  color: #7f8c8d;
  font-size: 0.8rem;
  font-style: italic;
}

.match-reasons {
  margin-bottom: 16px;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 8px;
  border-left: 3px solid #3498db;
}

.match-reasons h4 {
  margin: 0 0 8px 0;
  font-size: 0.9rem;
  color: var(--text-primary, #2c3e50);
  font-weight: 600;
}

.reasons-list {
  margin: 0;
  padding-left: 16px;
  color: #7f8c8d;
  font-size: 0.9rem;
}

.reasons-list li {
  margin-bottom: 4px;
}

.project-stats {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  margin-bottom: 16px;
  font-size: 0.9rem;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #7f8c8d;
}

.creator-info {
  display: flex;
  align-items: center;
  gap: 10px;
  padding-top: 16px;
  border-top: 1px solid #e9ecef;
}

.creator-avatar {
  cursor: pointer;
  border-radius: 50%;
  transition: all 0.2s ease;
}

.creator-avatar:hover {
  transform: scale(1.1);
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
}

.creator-avatar:focus {
  outline: 2px solid #3498db;
  outline-offset: 2px;
}

.creator-name {
  font-weight: 500;
  color: var(--text-primary, #2c3e50);
}


@media (max-width: 768px) {
  .project-header {
    margin-right: 0;
  }

  .match-badge {
    position: static;
    align-self: flex-start;
    margin-bottom: 12px;
  }

  .project-stats {
    grid-template-columns: 1fr;
  }
}
</style>