import { defineStore } from 'pinia'
import type { CalendarState, CalendarEmojiHistory, PullEmojiResponse } from '@/types/calendar'
import { useAuth } from '~/composables/useAuth'

export const useCalendarStore = defineStore('calendar', {
  state: (): CalendarState => ({
    history: [],
    todaysEmoji: null
  }),

  actions: {
    async fetchCalendarHistory() {
      const auth = useAuth()
      if (!auth.user.value) return

      const { data } = await useFetch(`/api/calendar/${auth.user.value.id}/emojis`)
      if (data.value) {
        this.history = (data.value as any[]).map(item => ({
          date: item.date,
          emoji: {
            emoji_code: item.emoji.emoji_code,
            image_url: item.emoji.image_url
          },
          userId: auth.user.value?.id
        })) as CalendarEmojiHistory[]
      }
    },

    async pullDailyEmoji() {
      const auth = useAuth()
      if (!auth.user.value) return

      const { data } = await useFetch(`/api/calendar/${auth.user.value.id}/pull-emoji`, {
        method: 'POST'
      })
      
      if (data.value) {
        const response = data.value as any
        this.todaysEmoji = {
          emoji_code: response.emoji_code,
          image_url: response.image_url
        }
        this.history.unshift({
          date: response.date,
          emoji: {
            emoji_code: response.emoji_code,
            image_url: response.image_url
          },
          userId: auth.user.value.id
        })
        return this.todaysEmoji
      }
      return null
    }
  }
})
