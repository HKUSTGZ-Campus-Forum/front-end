<template>
  <div class="calendar-container">
    <h2>Emoji Calendar</h2>
    
    <div class="daily-emoji" v-if="calendar.todaysEmoji">
      <h3>Today's Emoji</h3>
      <div class="emoji-display">
        <img 
          v-if="calendar.todaysEmoji.image_url"
          :src="calendar.todaysEmoji.image_url" 
          :alt="calendar.todaysEmoji.emoji_code"
          class="emoji-image"
        >
        <span v-else>{{ calendar.todaysEmoji.emoji_code }}</span>
      </div>
    </div>

    <button 
      v-if="!calendar.todaysEmoji"
      @click="pullEmoji"
      class="pull-button"
    >
      Pull Today's Emoji
    </button>

    <div class="history">
      <h3>Your Emoji History</h3>
      <div class="history-grid">
        <div 
          v-for="entry in calendar.history" 
          :key="entry.date"
          class="history-entry"
        >
          <div class="date">{{ formatDate(entry.date) }}</div>
          <div class="emoji">
            <img 
              v-if="entry.emoji.image_url"
              :src="entry.emoji.image_url" 
              :alt="entry.emoji.emoji_code"
              class="emoji-image"
            >
            <span v-else>{{ entry.emoji.emoji_code }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useCalendarStore } from '~/store/modules/calendar'
import dayjs from 'dayjs'

const calendar = useCalendarStore()

onMounted(async () => {
  await calendar.fetchCalendarHistory()
})

const pullEmoji = async () => {
  await calendar.pullDailyEmoji()
}

const formatDate = (dateString: string) => {
  return dayjs(dateString).format('MMM DD, YYYY')
}
</script>

<style scoped>
.calendar-container {
  max-width: 100%;
  margin: 0;
  padding: 10px;
}

.daily-emoji {
  text-align: center;
  margin-bottom: 15px;
}

.emoji-display {
  font-size: 2rem;
  margin: 5px 0;
}

.pull-button {
  background-color: #4CAF50;
  color: white;
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  margin-bottom: 15px;
}

.history-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
  gap: 10px;
}

.history-entry {
  text-align: center;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.date {
  font-size: 0.7rem;
  color: #666;
}

.emoji {
  font-size: 1.2rem;
}

.emoji-image {
  width: 32px;
  height: 32px;
  object-fit: contain;
}
</style>
