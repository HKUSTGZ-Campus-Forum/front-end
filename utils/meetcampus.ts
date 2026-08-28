import type { LocalizedText, MeetCampusLocale } from "~/types/meetcampus";

export const MEETCAMPUS_BETA_EMAIL = "wtao565@connect.hkust-gz.edu.cn";

export function localizeText(value: LocalizedText | undefined, locale: MeetCampusLocale): string {
  if (!value) return "";
  return value[locale] || value.zh || value.en || "";
}

export function formatMeetCampusTime(value: string, locale: MeetCampusLocale): string {
  return new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en", {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  }).format(new Date(value));
}
