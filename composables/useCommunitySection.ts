export type CommunitySection = "forum" | "feedback" | "activity";

const COMMUNITY_SECTION_KEY = "unikorn:community-section";

export function useCommunitySection() {
  const route = useRoute();
  const router = useRouter();
  const { getLocalePath } = useAppLocale();

  function isCommunitySection(value: unknown): value is CommunitySection {
    return value === "forum" || value === "feedback" || value === "activity";
  }

  function readStoredSection(): CommunitySection | null {
    if (import.meta.server) {
      return null;
    }

    const saved = window.localStorage.getItem(COMMUNITY_SECTION_KEY);
    return isCommunitySection(saved) ? saved : null;
  }

  function resolveSection(): CommunitySection {
    const section = Array.isArray(route.query.section)
      ? route.query.section[0]
      : route.query.section;

    if (isCommunitySection(section)) {
      return section;
    }

    const fullPathQuery = route.fullPath.includes("?")
      ? route.fullPath.slice(route.fullPath.indexOf("?") + 1)
      : "";
    const fullPathSection = new URLSearchParams(fullPathQuery).get("section");
    if (isCommunitySection(fullPathSection)) {
      return fullPathSection;
    }

    if (import.meta.client) {
      const browserSection = new URLSearchParams(window.location.search).get("section");
      if (isCommunitySection(browserSection)) {
        return browserSection;
      }
    }

    return readStoredSection() || "forum";
  }

  const activeSection = ref<CommunitySection>(resolveSection());

  if (import.meta.client) {
    watch(
      () => route.fullPath,
      () => {
        activeSection.value = resolveSection();
      },
      { immediate: true }
    );

    onMounted(() => {
      activeSection.value = resolveSection();
    });

    watch(
      activeSection,
      (section) => {
        persistSection(section);
      },
      { immediate: true }
    );
  }

  function persistSection(section: CommunitySection) {
    if (import.meta.server) {
      return;
    }

    window.localStorage.setItem(COMMUNITY_SECTION_KEY, section);
  }

  async function switchSection(section: CommunitySection) {
    persistSection(section);

    await router.replace({
      path: getLocalePath("/forum"),
      query: section === "forum" ? {} : { section },
    });
  }

  return {
    activeSection,
    switchSection,
    persistSection,
    isCommunitySection,
  };
}
