# Scheduler ranked plans design

## Goal

Add a second, explicit planning mode to the existing scheduler workspace. The current fixed-course solver remains the default and continues to choose one valid section combination for every enabled course. The new ranked mode lets a user mark a wider candidate pool, choose a minimum and maximum course count, score every conflict-free plan exactly, and browse every plan tied within the requested top score ranks.

The ranked solver was validated in the standalone `scheduler-optimizer-lab`. This integration keeps its correctness semantics while rebuilding the surface with the production scheduler's Keguang blue visual language, theme tokens, bilingual copy, existing timetable, saved-plan flows, and responsive behavior.

Implementation starts from `main@324e9b757082ee7e7839e347a06cd0729a65a88e`.

## Product boundaries

- Fixed mode remains behaviorally compatible with the current planner and remains the initial mode for existing users.
- Ranked mode changes only how a concrete timetable is found. It does not change course discovery, saved-plan visibility, sharing, popularity, authentication, or backend data.
- The cart remains the mutable planner workspace and the source of course popularity intent. Adding or removing a ranked candidate does not make a backend cart/popularity mutation.
- Existing section/layer enablement remains a hard eligibility constraint in both modes.
- Existing blocked periods and actual teaching date ranges remain hard conflict constraints in both modes.
- Ranked results are local derived data. A user may save the currently displayed concrete result through the existing saved-plan flow.
- Complete exact search is required. Heuristics may change traversal order or prune mathematically impossible branches, but may not omit a valid result or approximate a score.
- A maximum-course endpoint above 10 is allowed and labelled as an entertainment-grade workload. Ten remains the recommended practical ceiling; there is no hidden truncation.

## Vocabulary and mode semantics

### Fixed courses

The current mode solves all courses whose planner workspace `enabled` flag is true. For each course, it chooses one enabled bundle from every enabled layer. The existing `solvePlans` behavior, navigation, preview, filtering, and automatic recalculation stay intact.

### Ranked candidates

Ranked mode owns a separate, per-semester set of candidate course codes. It is initialized from the currently enabled cart courses, then reconciled when courses enter or leave the cart. Toggling candidate membership is local and must not call the cart enable/disable API.

For each chosen course, the adapter builds a complete course option by taking one enabled bundle from every enabled layer. It rejects options that conflict internally, violate blocked periods, or contain unusable meeting data. A ranked plan chooses a subset of candidate courses inside `[minimum, maximum]` and exactly one complete option for each chosen course.

This separation is intentional: candidate interest is a temporary optimization preference, while cart enablement contributes to the existing popularity semantics.

## Scoring model

All editable values are decimal strings, accept positive, zero, negative, and fractional values, and allow at most eight fractional digits. The implementation compiles all active values to a shared integer scale and performs scoring with `bigint`; JavaScript floating-point arithmetic is not used for ranking or tie detection.

Each plan starts with an editable base score and then applies:

- score per total course credit;
- zero or more exact course-count rules, such as five courses `+10`;
- a separate early-start rule for every weekday, defaulting to a 09:00 start penalty;
- zero or more occupied-time rules, with editable days, start/end times, value, and `per day`, `any day`, or `all days` aggregation;
- zero or more free-time rules with the same controls;
- zero or more selected-course rules;
- zero or more selected-specific-section rules.

A specific-section rule identifies a production section with the pair `(course code, section ID)`. If a complete course option contains that section, its value is applied once. Scoping by course prevents an identical section label in another course from matching accidentally.

Results are ordered by score descending and then a stable canonical plan key. `Top X` means score ranks, not an item limit: all plans whose score is at least the Xth distinct score are retained. Equal scores receive the same competition rank, so Top 3 may intentionally return far more than three plans.

The score breakdown records each non-zero contribution so the displayed total is auditable.

## Correctness and performance

The ranked search uses:

- production `schedulerLecturesOverlap` semantics, including half-open time intervals and actual teaching date ranges;
- precomputed course-option conflict bitsets;
- branch bounds that are valid for negative as well as positive scoring rules;
- exact top-rank collection, including every tie at the cutoff;
- cooperative asynchronous chunks so progress and cancellation can update without freezing the page;
- no search-node or result-count truncation.

Search progress distinguishes examined nodes, valid complete plans, retained plans, and completion. Cancellation never writes an incomplete cache entry. Configuration or candidate changes mark an existing result stale but keep it visible until the user starts a new calculation.

The complete-result cache is keyed by a stable fingerprint of semester, candidate set, course/layer/bundle/lecture/date-range data, enabled eligibility, blocked periods, course-count range, Top X, and the complete scoring profile. IndexedDB retains at most 12 completed entries. A cache hit must reproduce the same ordered results and score breakdown as a fresh solve.

## User experience

### Workspace shell

- Add a prominent two-option mode switch near the scheduler title: Fixed courses / Ranked preferences.
- Reuse the production timetable, course cards, responsive side panel, menu/filter surfaces, saved-plan dialogs, and bottom result navigator.
- Do not import the standalone lab's page shell or hard-coded palette.
- All new colors, borders, shadows, and focus states use existing theme variables. All new controls have visible keyboard focus and remain usable in light/deep-dark themes.

### Ranked mode

- The side panel heading becomes “Candidate courses: which courses do you want?” and course cards toggle local candidate membership.
- A compact settings summary appears in the workspace header, together with an “Optimization settings” action.
- A large primary “Start calculation” action occupies the existing visible header action area. During a run it becomes “Cancel calculation”; the action is never buried inside the scrolling settings panel.
- The settings drawer uses three plain-language sections:
  1. Candidate courses: which courses do you want?
  2. Course count: minimum and maximum?
  3. Scoring rules: what kind of timetable do you prefer?
- The range summary is prominent and names the real candidate count and endpoints.
- Workload messaging depends on the maximum endpoint, not the number of checked candidates: `10` is the recommended ceiling; `>10` is entertainment-grade.
- Progress, cancellation, cache hit, stale results, no-solution, invalid settings, and unavailable-course states use inline production-style notices.
- The stats area shows candidate count, retained plan count, score rank/value, and credits as space permits.
- A score-breakdown dialog explains the selected result.

### Result navigation

The existing bottom navigator is retained. Its current position becomes an editable numeric input between the previous/next buttons, so a user can jump directly to result 165 of 171. Input is clamped on commit and remains accessible by keyboard.

## State and persistence

Per-semester local configuration stores:

- active mode;
- candidate course codes;
- minimum and maximum course count;
- Top X;
- scoring profile;
- last displayed ranked result index;
- settings drawer state only when useful, not transient progress or errors.

Storage parsing is defensive and versioned. Invalid scalar settings fall back field-by-field; a malformed scoring profile falls back as a unit to known-safe defaults. Temporarily invalid numeric drafts such as an empty value or `-` never overwrite the last valid persisted profile, while mode, candidate, range, Top X, and preferred-plan changes continue to persist. Results are not restored from `localStorage`; only a matching complete IndexedDB cache entry may restore them.

Fixed and ranked modes keep independent result indices. Switching modes must not erase fixed-mode choices, ranked configuration, or the last complete ranked result.

## Component and module layout

- `utils/schedulerOptimizer.ts`: pure adapter, exact decimal helpers, score compilation/evaluation, fingerprints, workload estimate, and asynchronous exact solver.
- `utils/schedulerOptimizerStorage.ts`: browser-only versioned configuration and completed-result cache.
- `composables/useSchedulerOptimizer.ts`: per-semester state, candidate reconciliation, persistence, cache lookup, progress, cancellation, and result lifecycle.
- `components/scheduler/SchedulerModeSwitch.vue`: accessible production-style segmented mode control.
- `components/scheduler/SchedulerOptimizerSettings.vue`: responsive settings drawer and scoring rule editors.
- `components/scheduler/SchedulerScoreBreakdown.vue`: selected-plan score audit.
- Existing scheduler dashboard, side panel, course card, timetable, and bottom navigator receive narrowly scoped mode/result props rather than duplicated ranked-mode versions.

## Failure and edge states

- Candidate courses with no internally valid complete option are listed as unavailable and are skipped; the whole solve can continue if the requested minimum is still reachable.
- If the minimum exceeds available candidates, maximum is below minimum, Top X is invalid, a time interval is empty/reversed, or a decimal is invalid, calculation is blocked with a field-level message.
- Missing or invalid teaching date ranges preserve the production solver's conservative conflict behavior.
- A very large tie group may consume substantial memory because retaining all cutoff ties is a product requirement. The UI warns for high estimated workloads and maximum endpoints above 10 but never silently drops ties.
- Navigation and saving remain disabled when no concrete result exists.

## Verification and acceptance criteria

Automated checks must prove:

- exact decimal parsing, negative/fractional values, score totals, and tie ranks;
- date-range-aware overlap and half-open interval behavior inherited from the production scheduler;
- formal multi-layer courses expand into complete options correctly;
- the optimized solver is differentially identical to an intentionally simple exhaustive reference solver on deterministic and seeded randomized cases;
- Top X keeps every cutoff tie and is deterministic;
- cancellation and stale inputs never create a cache hit;
- persistence rejects corrupt/old data safely;
- fixed-mode `solvePlans`, save/new/share hooks, and route behavior remain wired;
- all new i18n keys exist in Chinese and English;
- controls use theme tokens and the result index is directly editable.

Release checks:

1. `npm run i18n:check`
2. `npm test`
3. `npm run typecheck` when defined
4. `npm run build`
5. Manual browser matrix: Chinese/English × light/deep-dark × desktop/mobile.
6. In both modes, verify course/bundle toggles, blocked periods, preview, plan navigation, direct result jump, save current plan, open My plans, and return to the same semester.
7. In ranked mode, run the 20-course demo-equivalent fixture with endpoint 10, compare optimized output against the reference oracle, exercise cancellation, repeat for a cache hit, edit one rule to confirm stale invalidation, and inspect every retained cutoff tie.

## Non-goals

- Moving ranked search to the backend or a worker in this iteration.
- Synchronizing optimization preferences between devices.
- Automatically applying the highest-ranked plan to the cart.
- Adding a hard course-count or result-count cap.
- Replacing the existing timetable, saved-plan model, course popularity semantics, or formal scheduler visual system.
