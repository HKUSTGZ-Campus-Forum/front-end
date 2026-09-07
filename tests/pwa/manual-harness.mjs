/**
 * Supplemental localhost-only browser harness for the exact current PWA plugin,
 * update utility and service worker; this does not exercise Nuxt/backend/auth.
 * Run: node tests/pwa/manual-harness.mjs [4185]
 * Open the printed URL in a browser. No files are built/written to disk.
 * 1. Click Deploy next build; within 60 seconds Page build should match Server
 *    build with exactly one extra HTML navigation (not an update prompt).
 * 2. Open editor, type a draft, deploy again and wait >60 seconds: no reload.
 *    Leave editor, then wait for the automatic check: exactly one reload.
 * 3. Toggle stale HTML ON, deploy again, wait >120 seconds: server/page builds
 *    intentionally differ, but only one reload occurs for that target build.
 *    Toggle stale HTML OFF, deploy another build, and recovery is automatic.
 * Close test tabs and Ctrl+C to stop. Service-worker caches are isolated to this
 * dedicated localhost port. Clear its site data manually if desired.
 */
import { build } from "esbuild";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const port = Number(process.argv[2] || 4185);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error("Use a port from 1024 to 65535.");
const origin = `http://127.0.0.1:${port}`;
const root = fileURLToPath(new URL("../../", import.meta.url));
const bundled = await build({
  stdin: {
    contents: 'import plugin from "./plugins/pwa.client.ts"; plugin({ hook: (name, handler) => window.harnessHooks.set(name, handler) });',
    resolveDir: root,
    sourcefile: "manual-pwa-entry.ts",
    loader: "ts",
  },
  bundle: true,
  write: false,
  platform: "browser",
  format: "esm",
  define: { "import.meta.dev": "false" },
});
const pluginScript = bundled.outputFiles[0].text;
const workerSource = await readFile(new URL("../../public/sw.js", import.meta.url), "utf8");
const placeholder = JSON.stringify("__UNIKORN_BUILD_VERSION__");
if (workerSource.split(placeholder).length !== 2) throw new Error("Expected exactly one worker build placeholder.");
const runId = Date.now().toString(36);
let release = 1;
const version = () => `manual-${runId}-${release}`;
let staleVersion = null;
let navigations = 0;

function html(pageVersion) {
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>UniKorn automatic update browser harness</title>
<style>body{font:18px/1.5 system-ui;max-width:860px;margin:40px auto;padding:0 24px;background:#edf5ff;color:#143254}h1{font-size:28px}dl{display:grid;grid-template-columns:200px 1fr;gap:12px}dd{margin:0;overflow-wrap:anywhere}button,a{font:inherit;margin:8px 12px 8px 0;padding:10px;color:#123f71}textarea{box-sizing:border-box;width:100%;font:inherit;padding:12px}section{border:1px solid #abc8e9;padding:20px;border-radius:12px;background:white;margin-top:20px}small{display:block;color:#475c73}code{font-size:15px}</style>
<h1>Automatic frontend update — browser harness</h1>
<p>Runs the current repository plugin and service worker, without any external requests.</p>
<dl><dt>Page build</dt><dd id="page">${pageVersion}</dd>
<dt>Server build</dt><dd id="server">Loading…</dd>
<dt>HTML navigations</dt><dd id="navigations">${navigations}</dd>
<dt>Stale HTML mode</dt><dd id="stale">Loading…</dd>
<dt>SW controller</dt><dd id="worker">Not controlled yet</dd>
<dt>SW active build</dt><dd id="worker-build">Waiting for activation</dd>
<dt>Reload attempts</dt><dd><code id="attempts">[]</code></dd></dl>
<button id="deploy">Deploy next build</button><button id="toggle-stale">Toggle stale HTML</button>
<button id="open-editor">Open editor</button><button id="check">Run route-finish check</button>
<small>Real cadence: 60 seconds. Focus/route checks are throttled to once per 15 seconds.</small>
<section id="editor-host" hidden></section><p id="status" role="status"></p>
<script>
window.harnessHooks = new Map();
window.defineNuxtPlugin = callback => callback;
window.useRuntimeConfig = () => ({ public: { appBuildVersion: ${JSON.stringify(pageVersion)}, appVersion: "manual" } });
const byId = id => document.getElementById(id);
function showController() { byId("worker").textContent = navigator.serviceWorker?.controller?.scriptURL || "Not controlled yet"; }
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.addEventListener("controllerchange", showController);
  navigator.serviceWorker.addEventListener("message", event => {
    if (event.data?.type === "SW_ACTIVATED") byId("worker-build").textContent = event.data.version;
  });
}
async function refreshStatus() {
  try {
    const state = await fetch("/state", { cache: "no-store" }).then(response => response.json());
    byId("server").textContent = state.version;
    byId("navigations").textContent = state.navigations;
    byId("stale").textContent = state.staleVersion ? "ON — serving " + state.staleVersion : "OFF";
    byId("attempts").textContent = sessionStorage.getItem("unikorn:frontend-update-attempts:v1") || "[]";
    showController();
  } catch { byId("status").textContent = "Harness server unavailable"; }
}
async function command(path) {
  const response = await fetch(path, { method: "POST" });
  if (!response.ok) throw new Error("Command rejected");
  await refreshStatus();
  byId("status").textContent = "Server changed. Waiting for the real automatic check…";
}
byId("deploy").onclick = () => command("/deploy");
byId("toggle-stale").onclick = () => command("/toggle-stale");
byId("check").onclick = () => window.harnessHooks.get("page:finish")?.();
byId("open-editor").onclick = () => {
  const host = byId("editor-host");
  if (!host.hidden) return;
  host.hidden = false;
  host.innerHTML = '<label for="draft">Unsaved draft</label><textarea id="draft" rows="4" placeholder="Type a draft before deploying"></textarea><a href="#browse" id="leave-editor">Leave editor (discard test draft)</a>';
  byId("leave-editor").onclick = event => {
    event.preventDefault(); host.replaceChildren(); host.hidden = true;
    window.harnessHooks.get("page:finish")?.();
  };
};
refreshStatus(); setInterval(refreshStatus, 1000);
</script><script type="module" src="/plugin.js"></script></html>`;
}

createServer((request, response) => {
  if (request.headers.host !== `127.0.0.1:${port}`) {
    response.writeHead(403).end("Loopback host only");
    return;
  }
  const pathname = new URL(request.url || "/", origin).pathname;
  const send = (type, body, status = 200) => {
    response.writeHead(status, { "Content-Type": type, "Cache-Control": "no-store" });
    response.end(body);
  };
  if (request.method === "POST") {
    if (request.headers.origin !== origin) return send("text/plain", "Same-origin POST only", 403);
    if (pathname === "/deploy") release += 1;
    else if (pathname === "/toggle-stale") staleVersion = staleVersion ? null : version();
    else return send("text/plain", "Not found", 404);
    return send("application/json", JSON.stringify({ version: version() }));
  }
  if (request.method !== "GET") return send("text/plain", "Method not allowed", 405);
  if (pathname === "/health") return send("application/json", JSON.stringify({ status: "ok", service: "campus-forum-frontend", version: version() }));
  if (pathname === "/state") return send("application/json", JSON.stringify({ version: version(), staleVersion, navigations }));
  if (pathname === "/plugin.js") return send("text/javascript", pluginScript);
  if (pathname === "/sw.js") return send("text/javascript", workerSource.replace(placeholder, () => JSON.stringify(version())));
  if (pathname === "/") {
    navigations += 1;
    return send("text/html; charset=utf-8", html(staleVersion || version()));
  }
  // Precaching succeeds using local fixtures; no application backend is proxied.
  if (pathname === "/manifest.json") return send("application/manifest+json", JSON.stringify({ name: "PWA harness", start_url: "/" }));
  if (["/offline.html", "/favicon-white.ico", "/icons/sidebar_logo.svg", "/icons/topbar_logo.svg", "/image/uniKorn.png"].includes(pathname)) return send("text/plain", "Local PWA harness fixture");
  return send("text/plain", "Not found", 404);
}).listen(port, "127.0.0.1", () => console.log(`PWA browser harness: ${origin}/ (Ctrl+C to stop)`));
