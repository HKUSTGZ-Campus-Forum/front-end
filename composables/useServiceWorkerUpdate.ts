let waitingRegistration: ServiceWorkerRegistration | null = null;

export const useServiceWorkerUpdate = () => {
  const isUpdateAvailable = useState<boolean>("service-worker-update-available", () => false);
  const isApplyingUpdate = useState<boolean>("service-worker-applying-update", () => false);
  const availableVersion = useState<string | null>("service-worker-available-version", () => null);

  const setUpdateReady = (registration: ServiceWorkerRegistration, version?: string | null) => {
    waitingRegistration = registration;
    availableVersion.value = version || null;
    isApplyingUpdate.value = false;
    isUpdateAvailable.value = true;
  };

  const clearUpdateState = () => {
    waitingRegistration = null;
    availableVersion.value = null;
    isApplyingUpdate.value = false;
    isUpdateAvailable.value = false;
  };

  const dismissUpdate = () => {
    isUpdateAvailable.value = false;
  };

  const applyUpdate = async () => {
    const waitingWorker = waitingRegistration?.waiting;

    if (!waitingWorker) {
      clearUpdateState();
      return false;
    }

    isApplyingUpdate.value = true;
    waitingWorker.postMessage({ type: "SKIP_WAITING" });
    return true;
  };

  return {
    isUpdateAvailable,
    isApplyingUpdate,
    availableVersion,
    setUpdateReady,
    clearUpdateState,
    dismissUpdate,
    applyUpdate,
  };
};
