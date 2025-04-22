import { Time } from "./time";

export interface Emoji {
  emoji_code: string;
  image_url?: string;
}

export interface CalendarEmojiHistory {
  date: string;
  emoji: Emoji;
  userId: string;
}

export interface PullEmojiResponse {
  emoji_code: string;
  image_url?: string;
  date: string;
}

export interface CalendarState {
  history: CalendarEmojiHistory[];
  todaysEmoji: Emoji | null;
}
