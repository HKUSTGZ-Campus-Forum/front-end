export const FRONTEND_UPDATE_STORAGE_KEY = "unikorn:frontend-update-attempts:v1";

let activeOperations = 0;

/** Keep an upload protected even if its input/component unmounts before completion. */
export function beginFrontendUpdateActivity(): () => void {
  activeOperations += 1;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    activeOperations -= 1;
  };
}

export function hasActiveFrontendWork(doc: Document): boolean {
  if (activeOperations > 0) return true;
  // These workspaces include in-memory or iframe-owned state with no DOM input
  // event (guest cart, optimizer, independent TeamUp application).
  if (doc.querySelector('#scheduler-planner-workspace, .teamup-host iframe, [data-auto-update-blocked], [aria-busy="true"]')) return true;
  if (doc.activeElement?.matches('input, textarea, select, [contenteditable="true"], [contenteditable=""]')) return true;
  return Array.from(doc.querySelectorAll('textarea, [contenteditable="true"], [contenteditable=""]'))
    .some(control => Boolean((control.tagName === "TEXTAREA"
      ? (control as HTMLTextAreaElement).value : control.textContent)?.trim()));
}

interface UpdateOptions {
  currentVersion: string;
  readVersion: () => Promise<unknown>;
  canReload: () => boolean;
  storage: Pick<Storage, "getItem" | "setItem">;
  reload: () => void;
}

/** The frontend health endpoint, not a worker message or the old bundle, is authoritative. */
export function parseFrontendVersion(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const health = payload as Record<string, unknown>;
  return health.status === "ok" && health.service === "campus-forum-frontend" &&
    typeof health.version === "string" && /^[a-zA-Z0-9._-]{1,200}$/.test(health.version)
    ? health.version : null;
}

/** One automatic navigation per target build per tab session, including across reloads. */
export function createFrontendUpdater(options: UpdateOptions) {
  let checking = false;
  let reloading = false;

  async function check() {
    if (checking || reloading) return;
    checking = true;
    try {
      const version = parseFrontendVersion(await options.readVersion());
      if (!version || version === options.currentVersion || !options.canReload()) return;

      // Fail closed if storage is unavailable/corrupt. An in-memory guard alone
      // cannot stop reload loops when a CDN keeps serving the previous HTML.
      const raw = options.storage.getItem(FRONTEND_UPDATE_STORAGE_KEY);
      const attempts: unknown = raw === null ? [] : JSON.parse(raw);
      if (!Array.isArray(attempts) || !attempts.every(item => typeof item === "string")) return;
      if (attempts.includes(version) || attempts.length >= 100) return;
      const next = JSON.stringify([...attempts, version]);
      options.storage.setItem(FRONTEND_UPDATE_STORAGE_KEY, next);
      if (options.storage.getItem(FRONTEND_UPDATE_STORAGE_KEY) !== next) return;

      reloading = true;
      options.reload();
    } catch {
      // Offline, timeouts, invalid health responses or disabled storage must
      // not interrupt browsing. A later check or normal navigation can update.
    } finally {
      checking = false;
    }
  }

  return { check };
}

/** Retain edited controls while mounted, including editors outside the routed page. */
export function createFrontendEditGuard() {
  const edited = new Set<Element>();
  return {
    record(target: EventTarget | null) {
      if (!(target instanceof Element)) return;
      const control = target.closest('input, textarea, select, [contenteditable="true"], [contenteditable=""], form');
      if (control && control.getAttribute("data-auto-update-disposable") === null) edited.add(control);
    },
    hasEdits() {
      for (const control of edited) {
        if (!control.isConnected) edited.delete(control);
      }
      return edited.size > 0;
    },
  };
}
