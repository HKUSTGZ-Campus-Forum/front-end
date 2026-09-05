# Original Mascot Implementation

- [x] Inspect current renderer, controls, deployment and source-image preparation research.
- [x] Define asset pipeline and renderer contract.
- [x] Generate and visually validate original source artwork (v5 approved).
- [x] Decompose on local CUDA, repair layers, save editable PSD and export optimized assets.
- [x] Adapt and attribute the existing open-source mesh renderer.
- [x] Integrate default model, hover controls, assistant state and lifecycle.
- [x] Verify visual/interactive behavior on desktop and mobile.
- [x] Pass i18n, frontend tests and production build (470 tests in isolated Linux).
- [x] Commit, push, deploy shared dev and verify the live model.

Feature commit: `c727b1e9cc7e2e65006e5260fc1554e4d252284c`.
Shared dev deployment: GitHub Actions run `33969389421`, successful.
Live health returned the exact feature SHA; manifest and all 20 texture hashes
matched the local assets. Live desktop/mobile, settings/history, collapse/resume,
mock assistant reply/error, bubble expiry and WebGL context-loss retry passed.
Mock provider requests were intercepted in the isolated QA browser; no real model
service was called. School production was not deployed.
