import { computed } from "vue";
import { useI18n, useLocalePath, useRoute, useSwitchLocalePath } from "#imports";

type AppLocaleCode = "zh" | "en";

export function useAppLocale() {
  const route = useRoute();
  const localePath = useLocalePath();
  const switchLocalePath = useSwitchLocalePath();
  const { locale, locales, setLocale } = useI18n();

  const currentLocale = computed<AppLocaleCode>(() =>
    locale.value === "en" ? "en" : "zh"
  );

  const availableLocales = computed(() =>
    locales.value.map((item: any) => ({
      code: item.code as AppLocaleCode,
      name: item.name as string,
    }))
  );

  const getLocalePath = (
    path: string | { path?: string; query?: Record<string, any> },
    targetLocale = currentLocale.value
  ) => localePath(path as any, targetLocale);

  const getSwitchLocalePath = (targetLocale: AppLocaleCode) =>
    switchLocalePath(targetLocale);

  const switchToLocale = async (targetLocale: AppLocaleCode) => {
    if (targetLocale === currentLocale.value) return;
    await setLocale(targetLocale);
  };

  return {
    route,
    locale: currentLocale,
    availableLocales,
    getLocalePath,
    getSwitchLocalePath,
    switchToLocale,
  };
}
