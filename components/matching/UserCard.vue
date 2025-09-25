<template>
  <div class="user-card" @click="viewUserDetails" role="button" tabindex="0">
    <!-- Match Score Badge (for recommended teammates) -->
    <div v-if="matchInfo" class="match-badge">
      <Icon name="star" />
      {{ Math.round(matchInfo.combined_score * 100) }}% match
    </div>

    <!-- User Header -->
    <div class="user-header">
      <UserAvatar
        :avatar-url="profile.user?.avatar_url"
        :username="profile.user?.username"
        :user-id="profile.user?.id"
        size="lg"
        :clickable="false"
      />
      <div class="user-info">
        <h3 class="username">{{ profile.user?.username }}</h3>
        <div class="user-meta">
          <span v-if="profile.experience_level" class="experience-badge" :class="`exp-${profile.experience_level}`">
            {{ formatExperience(profile.experience_level) }}
          </span>
          <span v-if="profile.availability" class="availability-badge">
            {{ formatAvailability(profile.availability) }}
          </span>
        </div>
      </div>
    </div>

    <!-- Bio Section -->
    <p v-if="profile.bio" class="user-bio">
      {{ truncateText(profile.bio, 100) }}
    </p>

    <!-- Skills Section -->
    <div v-if="profile.skills?.length" class="skills-section">
      <h4>Skills</h4>
      <div class="skills-list">
        <span
          v-for="skill in profile.skills.slice(0, 4)"
          :key="skill"
          class="skill-tag"
        >
          {{ skill }}
        </span>
        <span v-if="profile.skills.length > 4" class="more-skills">
          +{{ profile.skills.length - 4 }} more
        </span>
      </div>
    </div>

    <!-- Interests Section -->
    <div v-if="profile.interests?.length" class="interests-section">
      <h4>Interests</h4>
      <div class="interests-list">
        <span
          v-for="interest in profile.interests.slice(0, 3)"
          :key="interest"
          class="interest-tag"
        >
          {{ interest }}
        </span>
        <span v-if="profile.interests.length > 3" class="more-interests">
          +{{ profile.interests.length - 3 }} more
        </span>
      </div>
    </div>

    <!-- Match Reasons (for recommended teammates) -->
    <div v-if="matchInfo?.match_reasons?.length" class="match-reasons">
      <h4>Why this matches</h4>
      <ul class="reasons-list">
        <li v-for="reason in matchInfo.match_reasons.slice(0, 2)" :key="reason">
          {{ reason }}
        </li>
      </ul>
    </div>

    <!-- User Stats -->
    <div class="user-stats">
      <div class="stat-item">
        <Icon name="user-check" />
        {{ getCompletionPercentage(profile) }}% complete
      </div>
      <div v-if="profile.preferred_roles?.length" class="stat-item">
        <Icon name="briefcase" />
        {{ profile.preferred_roles.slice(0, 2).join(', ') }}
      </div>
      <div class="stat-item">
        <Icon name="calendar" />
        {{ formatDate(profile.created_at) }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import UserAvatar from '~/components/user/UserAvatar.vue'

// Props
const props = defineProps({
  profile: {
    type: Object,
    required: true
  },
  matchInfo: {
    type: Object,
    default: null
  }
})

// Emits
const emit = defineEmits(['view-user'])

// Methods
const viewUserDetails = () => {
  emit('view-user', props.profile.user_id)
}

// Helper functions
const truncateText = (text, maxLength) => {
  if (!text || text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

const formatExperience = (level) => {
  const levels = {
    beginner: 'Beginner',
    intermediate: 'Intermediate',
    advanced: 'Advanced',
    expert: 'Expert'
  }
  return levels[level] || level
}

const formatAvailability = (availability) => {
  const availabilities = {
    'full-time': 'Full-time',
    'part-time': 'Part-time',
    'weekends': 'Weekends',
    'flexible': 'Flexible'
  }
  return availabilities[availability] || availability
}

const formatDate = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  })
}

const getCompletionPercentage = (profile) => {
  if (!profile) return 0

  let total = 0
  let completed = 0

  // Required fields
  total += 4
  if (profile.bio) completed++
  if (profile.skills?.length) completed++
  if (profile.experience_level) completed++
  if (profile.interests?.length) completed++

  // Optional fields
  total += 4
  if (profile.thrust?.length) completed++
  if (profile.preferred_roles?.length) completed++
  if (profile.contact_methods?.length) completed++
  if (profile.availability) completed++

  return Math.round((completed / total) * 100)
}
</script>

<style scoped>
.user-card {
  background: var(--surface-primary, white);
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.08);
  transition: all 0.2s ease;
  cursor: pointer;
  position: relative;
  border: 1px solid transparent;
}

.user-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 20px rgba(0,0,0,0.12);
  border-color: var(--interactive-primary, #3498db);
}

.match-badge {
  position: absolute;
  top: 12px;
  right: 12px;
  background: linear-gradient(135deg, #ffd700, #ffb347);
  color: white;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 4px;
  box-shadow: 0 2px 8px rgba(255, 215, 0, 0.3);
}

.user-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
}

.user-info {
  flex: 1;
}

.username {
  margin: 0 0 6px 0;
  font-size: 1.2rem;
  font-weight: 600;
  color: var(--text-primary, #2c3e50);
}

.user-meta {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.experience-badge, .availability-badge {
  padding: 3px 8px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
}

.experience-badge {
  background: #e3f2fd;
  color: #1976d2;
}

.exp-beginner { background: #d5f4e6; color: #27ae60; }
.exp-intermediate { background: #fef9e7; color: #f39c12; }
.exp-advanced { background: #fadbd8; color: #e74c3c; }
.exp-expert { background: #e8e8ff; color: #6633cc; }

.availability-badge {
  background: #f3e5f5;
  color: #7b1fa2;
}

.user-bio {
  color: var(--text-secondary, #7f8c8d);
  line-height: 1.5;
  margin: 0 0 16px 0;
  font-size: 0.9rem;
}

.skills-section, .interests-section {
  margin-bottom: 16px;
}

.skills-section h4, .interests-section h4 {
  margin: 0 0 8px 0;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-secondary, #7f8c8d);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.skills-list, .interests-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.skill-tag {
  background: #e3f2fd;
  color: #1976d2;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
}

.interest-tag {
  background: #f3e5f5;
  color: #7b1fa2;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
}

.more-skills, .more-interests {
  color: var(--text-secondary, #7f8c8d);
  font-size: 0.75rem;
  font-style: italic;
  padding: 4px 8px;
}

.match-reasons {
  background: linear-gradient(135deg, rgba(52, 152, 219, 0.05), rgba(41, 128, 185, 0.05));
  border: 1px solid rgba(52, 152, 219, 0.2);
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 16px;
}

.match-reasons h4 {
  margin: 0 0 8px 0;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--interactive-primary, #3498db);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.reasons-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.reasons-list li {
  font-size: 0.8rem;
  color: var(--text-secondary, #7f8c8d);
  margin-bottom: 4px;
  position: relative;
  padding-left: 12px;
}

.reasons-list li:before {
  content: "•";
  color: var(--interactive-primary, #3498db);
  position: absolute;
  left: 0;
}

.user-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  padding-top: 12px;
  border-top: 1px solid #f0f0f0;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.75rem;
  color: var(--text-secondary, #7f8c8d);
}

.stat-item svg {
  width: 14px;
  height: 14px;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .user-card {
    padding: 16px;
  }

  .user-header {
    gap: 12px;
  }

  .username {
    font-size: 1.1rem;
  }

  .user-stats {
    flex-direction: column;
    gap: 8px;
  }
}
</style>