import type { MeetCampusAppearance, MeetCampusBootstrap, MeetCampusCommandInput, MeetCampusDecisionTrace, MeetCampusOnboardingInput, MeetCampusScene, MeetCampusStory } from "~/types/meetcampus";

type MeetCampusLoadState = "idle" | "loading" | "ready" | "denied" | "error";

export function useMeetCampus() {
  const { fetchWithAuth } = useApi();
  const bootstrap = ref<MeetCampusBootstrap | null>(null);
  const loadState = ref<MeetCampusLoadState>("idle");
  const isSubmitting = ref(false);
  const actionError = ref<string | null>(null);
  const selectedStoryId = ref<string | null>(null);
  const selectedSceneId = ref<string | null>(null);
  const decisionTraces = ref<MeetCampusDecisionTrace[]>([]);
  const perspectiveResidentId = ref<string | null>(null);
  let refreshTimer: ReturnType<typeof setInterval> | null = null;

  const myResident = computed(() => bootstrap.value?.snapshot.residents.find(resident => resident.id === bootstrap.value?.myResidentId) ?? null);
  const currentScene = computed(() => bootstrap.value?.snapshot.scenes.find(scene => scene.id === myResident.value?.state.sceneId) ?? null);
  const unreadStories = computed(() => bootstrap.value?.stories.filter(story => !story.isViewed) ?? []);
  const selectedStory = computed<MeetCampusStory | null>(() => bootstrap.value?.stories.find(story => story.id === selectedStoryId.value) ?? bootstrap.value?.stories[0] ?? null);
  const selectedScene = computed<MeetCampusScene | null>(() => bootstrap.value?.snapshot.scenes.find(scene => scene.id === selectedSceneId.value) ?? currentScene.value ?? null);

  async function request(path: string, options?: RequestInit) {
    const response = await fetchWithAuth(path, options);
    if (response.status === 403) {
      loadState.value = "denied";
      throw new Error("meetcampus_beta_required");
    }
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body?.code || `request_failed_${response.status}`);
    }
    return response.json();
  }

  function applySnapshot(payload: Pick<MeetCampusBootstrap, "snapshot" | "stories" | "relationships">) {
    if (bootstrap.value) bootstrap.value = { ...bootstrap.value, ...payload };
  }

  async function load() {
    loadState.value = "loading";
    try {
      const query = perspectiveResidentId.value ? `?residentId=${encodeURIComponent(perspectiveResidentId.value)}` : "";
      bootstrap.value = await request(`/api/meetcampus/bootstrap${query}`) as MeetCampusBootstrap;
      perspectiveResidentId.value = bootstrap.value.myResidentId;
      selectedSceneId.value = myResident.value?.state.sceneId ?? null;
      loadState.value = "ready";
      await loadDecisionTraces();
      startRefresh();
    } catch (error) {
      if (loadState.value !== "denied") loadState.value = "error";
      console.error("Failed to load MeetCampus", error);
    }
  }

  async function refresh() {
    if (loadState.value !== "ready" || isSubmitting.value) return;
    const query = perspectiveResidentId.value ? `?residentId=${encodeURIComponent(perspectiveResidentId.value)}` : "";
    try { applySnapshot(await request(`/api/meetcampus/snapshot${query}`)); await loadDecisionTraces(); }
    catch (error) { console.warn("MeetCampus refresh degraded", error); }
  }

  function stopRefresh() { if (refreshTimer) clearInterval(refreshTimer); refreshTimer = null; }
  function startRefresh() { stopRefresh(); refreshTimer = setInterval(refresh, 15_000); }

  async function loadDecisionTraces() {
    if (!perspectiveResidentId.value) return;
    try {
      const payload = await request(`/api/meetcampus/debug/residents/${encodeURIComponent(perspectiveResidentId.value)}/traces`);
      decisionTraces.value = payload.traces as MeetCampusDecisionTrace[];
    } catch (error) {
      decisionTraces.value = [];
      console.warn("MeetCampus traces degraded", error);
    }
  }

  async function switchPerspective(residentId: string) {
    perspectiveResidentId.value = residentId;
    selectedStoryId.value = null;
    selectedSceneId.value = null;
    await load();
  }

  async function submitOnboarding(input: MeetCampusOnboardingInput) {
    isSubmitting.value = true; actionError.value = null;
    try {
      bootstrap.value = await request("/api/meetcampus/onboarding", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) }) as MeetCampusBootstrap;
      selectedSceneId.value = myResident.value?.state.sceneId ?? null;
    } catch (error) { actionError.value = error instanceof Error ? error.message : "request_failed"; throw error; }
    finally { isSubmitting.value = false; }
  }

  async function sendCommand(input: MeetCampusCommandInput) {
    isSubmitting.value = true; actionError.value = null;
    try {
      await request("/api/meetcampus/commands", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...input, residentId: perspectiveResidentId.value }) });
      await refresh();
      await loadDecisionTraces();
    } catch (error) { actionError.value = error instanceof Error ? error.message : "request_failed"; throw error; }
    finally { isSubmitting.value = false; }
  }

  async function updateAppearance(input: MeetCampusAppearance) {
    isSubmitting.value = true; actionError.value = null;
    try {
      bootstrap.value = await request("/api/meetcampus/appearance", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) }) as MeetCampusBootstrap;
    } catch (error) { actionError.value = error instanceof Error ? error.message : "request_failed"; throw error; }
    finally { isSubmitting.value = false; }
  }

  async function openStory(story: MeetCampusStory) {
    selectedStoryId.value = story.id;
    if (!story.isViewed) {
      const updated = await request(`/api/meetcampus/stories/${story.id}/view`, { method: "POST" });
      if (bootstrap.value) bootstrap.value.stories = bootstrap.value.stories.map(item => item.id === story.id ? updated : item);
    }
  }

  async function createBridge(storyId: string) {
    isSubmitting.value = true; actionError.value = null;
    try { return await request(`/api/meetcampus/stories/${storyId}/bridge`, { method: "POST" }); }
    catch (error) { actionError.value = error instanceof Error ? error.message : "request_failed"; throw error; }
    finally { isSubmitting.value = false; }
  }

  onBeforeUnmount(stopRefresh);
  return { bootstrap, loadState, isSubmitting, actionError, myResident, currentScene, unreadStories, selectedStory, selectedStoryId, selectedScene, selectedSceneId, decisionTraces, perspectiveResidentId, load, refresh, switchPerspective, loadDecisionTraces, submitOnboarding, updateAppearance, sendCommand, openStory, createBridge };
}
