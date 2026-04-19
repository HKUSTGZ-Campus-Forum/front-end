import { useServiceWorkerUpdate } from "~/composables/useServiceWorkerUpdate";

const UPDATE_CHECK_INTERVAL = 10 * 60 * 1000;

export default defineNuxtPlugin(() => {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  const runtimeConfig = useRuntimeConfig();
  const buildVersion = runtimeConfig.public.appBuildVersion || runtimeConfig.public.appVersion;
  const serviceWorkerUrl = `/sw.js?v=${encodeURIComponent(buildVersion)}`;
  const { setUpdateReady, clearUpdateState } = useServiceWorkerUpdate();

  let registrationRef: ServiceWorkerRegistration | null = null;
  let intervalId: number | null = null;
  let hasReloaded = false;

  const triggerUpdateCheck = () => {
    registrationRef?.update().catch((error) => {
      console.warn("[PWA] Failed to check for service worker updates:", error);
    });
  };

  const markUpdateReady = (registration: ServiceWorkerRegistration, version?: string | null) => {
    if (!registration.waiting) {
      return;
    }

    setUpdateReady(registration, version);
  };

  const watchInstallingWorker = (
    registration: ServiceWorkerRegistration,
    worker: ServiceWorker | null,
  ) => {
    if (!worker) {
      return;
    }

    worker.addEventListener("statechange", () => {
      if (worker.state === "installed" && navigator.serviceWorker.controller) {
        markUpdateReady(registration, buildVersion);
      }
    });
  };

  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (hasReloaded) {
      return;
    }

    hasReloaded = true;
    clearUpdateState();
    window.location.reload();
  });

  navigator.serviceWorker.addEventListener("message", async (event) => {
    if (!event.data?.type) {
      return;
    }

    if (event.data.type === "NEW_VERSION_READY") {
      const registration =
        registrationRef || (await navigator.serviceWorker.getRegistration("/"));

      if (registration?.waiting) {
        markUpdateReady(registration, event.data.version || buildVersion);
      }
    }

    if (event.data.type === "SW_ACTIVATED") {
      clearUpdateState();
    }
  });

  window.addEventListener("focus", triggerUpdateCheck);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      triggerUpdateCheck();
    }
  });

  window.addEventListener("beforeunload", () => {
    if (intervalId !== null) {
      window.clearInterval(intervalId);
    }
  });

  const registerServiceWorker = async () => {
    try {
      const registration = await navigator.serviceWorker.register(serviceWorkerUrl, {
        scope: "/",
      });

      registrationRef = registration;

      if (registration.waiting) {
        markUpdateReady(registration, buildVersion);
      }

      watchInstallingWorker(registration, registration.installing);

      registration.addEventListener("updatefound", () => {
        watchInstallingWorker(registration, registration.installing);
      });

      triggerUpdateCheck();
      intervalId = window.setInterval(triggerUpdateCheck, UPDATE_CHECK_INTERVAL);
    } catch (error) {
      if (import.meta.dev) {
        console.error("[PWA] Service worker registration failed:", error);
      }
    }
  };

  if (document.readyState === "complete") {
    void registerServiceWorker();
  } else {
    window.addEventListener("load", () => {
      void registerServiceWorker();
    }, { once: true });
  }
});
