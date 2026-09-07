import { createFrontendEditGuard, createFrontendUpdater, hasActiveFrontendWork } from "../utils/frontendUpdate";

const UPDATE_CHECK_INTERVAL = 60 * 1000;
const UPDATE_CHECK_THROTTLE = 15 * 1000;

export default defineNuxtPlugin((nuxtApp) => {
  // HMR owns development updates. A production worker can leave localhost
  // tabs with stale assets and interfere with debugging.
  if (import.meta.dev) return;

  const config = useRuntimeConfig();
  const buildVersion = config.public.appBuildVersion || config.public.appVersion;
  const edits = createFrontendEditGuard();
  const recordEdit = (event: Event) => edits.record(event.target);
  document.addEventListener("input", recordEdit, true);
  document.addEventListener("change", recordEdit, true);
  document.addEventListener("drop", recordEdit, true);
  document.addEventListener("submit", recordEdit, true);

  const updater = createFrontendUpdater({
    currentVersion: buildVersion,
    // Same-origin frontend runtime health, not a backend API/authenticated request.
    async readVersion() {
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 8000);
      try {
        const response = await fetch("/health", {
          cache: "no-store",
          credentials: "same-origin",
          signal: controller.signal,
        });
        if (!response.ok) return null;
        return await response.json();
      } finally {
        window.clearTimeout(timeout);
      }
    },
    canReload: () => navigator.onLine && document.visibilityState === "visible" &&
      !edits.hasEdits() && !hasActiveFrontendWork(document),
    // Resolve storage lazily: access itself can throw in restricted browsers.
    storage: {
      getItem: key => window.sessionStorage.getItem(key),
      setItem: (key, value) => window.sessionStorage.setItem(key, value),
    },
    reload: () => window.location.reload(),
  });

  let registrationRef: ServiceWorkerRegistration | null = null;
  let lastCheck = -Infinity;
  const check = () => {
    if (!navigator.onLine || document.visibilityState !== "visible") return;
    if (Date.now() - lastCheck < UPDATE_CHECK_THROTTLE) return;
    lastCheck = Date.now();
    void updater.check();
    void registrationRef?.update().catch(() => { /* Retry on the next check. */ });
  };

  const activateWaiting = (registration: ServiceWorkerRegistration) => {
    // Activation does not replace page code. Navigation is governed separately
    // by /health and edit/reload guards, including in other updated tabs.
    registration.waiting?.postMessage({ type: "SKIP_WAITING" });
  };
  const watchWorker = (registration: ServiceWorkerRegistration) => {
    const worker = registration.installing;
    if (!worker) return;
    worker.addEventListener("statechange", () => {
      if (worker.state === "installed") activateWaiting(registration);
    });
  };

  async function start() {
    check();
    if (!("serviceWorker" in navigator)) return;
    // Never reload merely because a controller changed (including first install).
    navigator.serviceWorker.addEventListener("controllerchange", check);
    try {
      const registration = await navigator.serviceWorker.register("/sw.js", {
        scope: "/",
        updateViaCache: "none",
      });
      registrationRef = registration;
      activateWaiting(registration);
      watchWorker(registration);
      registration.addEventListener("updatefound", () => watchWorker(registration));
    } catch {
      // Checks still work where service workers are unsupported/blocked.
    }
  }

  window.addEventListener("focus", check);
  window.addEventListener("online", check);
  document.addEventListener("visibilitychange", check);
  nuxtApp.hook("page:finish", check);
  let interval: number | null = window.setInterval(check, UPDATE_CHECK_INTERVAL);
  window.addEventListener("pagehide", () => {
    if (interval !== null) window.clearInterval(interval);
    interval = null;
  });
  window.addEventListener("pageshow", () => {
    if (interval === null) interval = window.setInterval(check, UPDATE_CHECK_INTERVAL);
    check();
  });
  if (document.readyState === "complete") void start();
  else window.addEventListener("load", () => void start(), { once: true });
});
