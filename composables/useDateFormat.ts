import { computed } from "vue";
import { useI18n } from "#imports";

export function useDateFormat() {
  const { locale, t } = useI18n();

  const dateLocale = computed(() => (locale.value === "en" ? "en-US" : "zh-CN"));

  const formatDate = (
    dateString: string | Date,
    options: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }
  ): string => {
    if (!dateString) return t("common.date.empty");

    try {
      const date = typeof dateString === "string" ? new Date(dateString) : dateString;
      if (Number.isNaN(date.getTime())) return t("common.date.invalid");
      return new Intl.DateTimeFormat(dateLocale.value, options).format(date);
    } catch {
      return t("common.date.invalid");
    }
  };

  const formatRelativeTime = (dateString: string | Date): string => {
    if (!dateString) return t("common.date.empty");

    try {
      const date = typeof dateString === "string" ? new Date(dateString) : dateString;
      if (Number.isNaN(date.getTime())) return t("common.date.invalid");

      const now = Date.now();
      const diffMs = date.getTime() - now;
      const diffMinutes = Math.round(diffMs / 60000);
      const diffHours = Math.round(diffMs / 3600000);
      const diffDays = Math.round(diffMs / 86400000);

      const rtf = new Intl.RelativeTimeFormat(dateLocale.value, { numeric: "auto" });

      if (Math.abs(diffMinutes) < 60) return rtf.format(diffMinutes, "minute");
      if (Math.abs(diffHours) < 24) return rtf.format(diffHours, "hour");
      if (Math.abs(diffDays) < 30) return rtf.format(diffDays, "day");

      return formatDate(date, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return t("common.date.invalid");
    }
  };

  return {
    dateLocale,
    formatDate,
    formatRelativeTime,
  };
}
