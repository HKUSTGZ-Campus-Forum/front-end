# Course graph redesign

## Problem

The production graph currently treats every active course row as a graph node. The
current official undergraduate catalog contributes structured relationships for only
a subset of those rows, leaving most nodes isolated. A density-sorted twelve-subject
limit makes valid subjects such as UFUG unreachable, while the layout retains global
catalog coordinates and places isolated courses far below the connected graph.

## Product model

The graph is a relationship explorer, not a catalog dump.

- The landing state provides course search and a complete alphabetical subject
  directory. It does not render an arbitrary default subject or the whole database.
- A subject view renders only courses with known relationships and the logic nodes
  needed to express those relationships. Courses without known relationships remain
  discoverable in a separate list.
- A course view renders the selected course with its direct upstream and downstream
  relationship paths. Cross-subject courses are retained and visibly distinguished.
- PCC catalog rules remain the relationship authority. SISN offerings are not used as
  prerequisite truth.

## Interaction and layout

- Search suggestions are keyboard-accessible and selecting a result opens its focused
  graph.
- Every subject is available from a native select and an alphabetical directory.
- The current context is explicit and can be cleared without navigating away.
- The visible subgraph is split into connected components, ranked by directed
  prerequisite edges, compacted, and packed into a bounded workspace. Original API
  coordinates are treated only as stable ordering hints.
- Isolated subject courses are shown outside SVG in a responsive list with a clear
  explanation.
- Zoom, fit, pan, node selection, course detail, and planner actions remain available.

## States and accessibility

- Loading uses a structural skeleton.
- Errors explain that graph data could not be loaded and provide a retry action.
- Empty focused and subject graphs explain that no structured relationship is known.
- Controls have visible labels or accessible names, 44px touch targets, focus-visible
  styles, and bilingual copy.
- Mobile uses a single-column explorer, full-width controls, a shorter graph stage,
  and horizontally safe subject/isolated-course lists.

## Acceptance criteria

1. UFUG and every other subject returned by the graph API is directly selectable.
2. No subject is selected by default and the full graph is never rendered on load.
3. Isolated courses do not affect graph bounds or force relationship nodes off-screen.
4. MICS opens with its connected relationship graph visible and its isolated courses
   listed separately.
5. A focused UFUG course shows its direct related-course paths and can return to the
   directory or its subject.
6. Chinese/English, light/dark, desktop/mobile, keyboard interaction, tests, i18n
   checks, and production build pass before release.

