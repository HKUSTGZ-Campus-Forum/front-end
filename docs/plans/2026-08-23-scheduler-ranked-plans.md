# Scheduler ranked plans implementation plan

- [x] Fast-forward local `main` to verified remote SHA `324e9b757082ee7e7839e347a06cd0729a65a88e` and create the integration branch.
- [x] Map the standalone optimizer semantics onto production course, layer, bundle, lecture, date-range, saved-plan, and theme contracts.
- [x] Add exact decimal scoring, formal course-option expansion, exact ranked search, deterministic Top X ties, progress, cancellation, and stable fingerprints as pure utilities.
- [x] Add versioned per-semester preferences and completed-result IndexedDB caching with defensive parsing and bounded retention.
- [x] Add a composable that keeps fixed/ranked state independent and marks ranked results stale when inputs change.
- [x] Integrate the production-style mode switch, visible calculate/cancel action, settings drawer, status/progress surface, and score breakdown into the existing dashboard.
- [x] Adapt existing course cards and side panel for a local ranked candidate pool without changing backend popularity intent.
- [x] Make the existing result position directly editable while preserving previous/next and pointer-drag navigation.
- [x] Add complete Chinese and English copy, theme-token-only styles, keyboard states, and responsive layouts.
- [x] Port deterministic solver tests and add a simple exhaustive differential oracle, randomized cases, formal multi-layer/date-range fixtures, tie/cancellation/cache tests, and UI contract tests.
- [x] Fix the Windows CRLF-sensitive scheduler static-test helper so the current baseline suite is platform-independent.
- [x] Update the changelog and architectural record.
- [x] Run i18n, scheduler tests, the available TypeScript integration gates, production build, and the Chinese/English × light/deep-dark × desktop/mobile browser matrix.
- [x] Hand the user reproducible commands, fixtures, and a visual verification checklist; wait for explicit authorization before commit, push, or PR.
