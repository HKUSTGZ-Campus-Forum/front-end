# Course Universe Complete Graph Rendering Design

## Goal

Fix the Course Universe graph so that course cards, relationship lines, and
intermediate logic nodes form one coherent map. Keep the current Course
Universe product shell, bilingual UI, right-side detail panel, subject filters,
search, zoom controls, and campus-tool visual language.

The completed interaction should preserve two actions on each course card:

- a click opens the course detail panel;
- a pointer drag that exceeds the existing click tolerance pans the whole map.

This phase does not add freeform per-course node repositioning.

## Root Cause

The current Course Universe canvas normalizes only components with
`category === 0`. The scheduler map API currently returns 226 components:

- 128 course nodes;
- 24 prerequisite logic nodes;
- 28 co-requisite logic nodes;
- 46 exclusion logic nodes.

Filtering out the 98 non-course components removes the intermediate vertices
used by the original map model to express `AND`, `OR`, co-requisite, and
exclusion relationships. The current canvas then filters out lines whose
endpoints are not both normalized course nodes.

The remaining lines also use the wrong coordinate interpretation. In the
reference `CoursePlan.search` implementation, a course component coordinate is
the top-left corner of a course rectangle. In the current Course Universe
canvas, that coordinate is treated as the center of a card. This makes lines
appear detached from the visible cards.

## Reference Behavior

The implementation should adapt the map behavior from
`CoursePlan.search/src/app/(main)/map/draw.tsx` without porting its React,
Redux, or Panzoom structure.

The reference implementation establishes these rules:

- every map component participates in graph connectivity;
- category `0` components render as course cards;
- categories `1`, `2`, and `3` render as small logic nodes;
- every line is routed as `M x1,y1 H xc V y2 H x2`;
- course endpoints attach to the appropriate card side at vertical center;
- `line_type`, `node_type`, and `category` determine line dash style, node
  fill, color, and arrows;
- hovering a course highlights its related prerequisite chain.

## Architecture

Add a complete graph adapter to `utils/courseUniverse.ts`. The adapter accepts
the scheduler API payload and produces rendering primitives that preserve the
raw graph model:

- normalized course nodes for detail-panel and status behavior;
- render components for both course cards and logic nodes;
- routed line primitives with card-edge attachment points;
- adjacency data for relationship highlighting;
- visibility sets that preserve intermediate path nodes.

`CourseUniverseCanvas.vue` remains responsible for Vue interaction state and
SVG rendering. It should consume the adapter primitives instead of rebuilding
partial coordinates inside the template.

Keep pure graph calculations outside the component so Vitest can cover the
coordinate and visibility contracts directly.

## Graph Model

### Course Nodes

A normalized course node keeps its current metadata:

- compact course code;
- display code;
- short title;
- academic status;
- planner-cart status;
- selected state.

Its raw API `x_coordinate` and `y_coordinate` remain the top-left coordinate of
the reference card. The adapter computes a render rectangle using a constant
Course Universe card width and height. The visual card may remain more compact
than the reference rectangle, but all endpoints must be derived from the same
render rectangle.

### Logic Nodes

Categories `1`, `2`, and `3` remain in the rendering graph:

- category `1`: prerequisite logic node;
- category `2`: co-requisite logic node;
- category `3`: exclusion logic node.

The node is rendered as a small circle at its raw coordinate. `node_type`
controls whether the circle is hollow or filled where the reference model
distinguishes `OR` and `AND`.

### Lines

Each line keeps:

- `id`;
- `start_id`;
- `end_id`;
- `category`;
- `line_type`;
- `x_coordinate`.

The adapter resolves both endpoint components and builds one routed SVG path:

```text
M x1,y1 H xc V y2 H x2
```

Attachment rules:

- when the start component is a course, begin at its right-edge midpoint;
- when the start component is a logic node, begin at its raw coordinate;
- when the end component is a course, end at its left-edge midpoint;
- when the end component is a logic node, end at its raw coordinate.

The result is one path primitive per API line. A missing endpoint is treated as
invalid API data and excluded from rendering without breaking the rest of the
canvas.

## Relationship Styling

Use project theme variables for all UI colors. Preserve the reference
relationship semantics:

- prerequisites use the primary text color;
- co-requisites use the semantic info color;
- exclusions use the semantic error color;
- dash style follows `category` and `line_type`;
- logic-node fill follows `node_type`;
- directional arrows are rendered where the reference relationship category
  requires them.

Arrows should be SVG path primitives generated from pure helper functions.
They should remain readable at the current zoom levels without overpowering
course cards.

## Visibility And Local Views

Prefix filtering, search, and selected-course focus must operate on the full
graph, not a course-only graph.

Visibility rules:

- prefix view starts from matching course nodes and keeps directly connected
  relationship paths, including intermediate logic nodes;
- selected-course view keeps upstream and downstream course relationships and
  every intermediate logic node on those paths;
- search view keeps matched courses, direct related paths, and their
  intermediate logic nodes;
- only course nodes appear in the subject filter counts;
- logic nodes never appear as selectable course cards or in the detail panel.

Local layout must not independently rearrange course cards while leaving raw
logic-node positions behind. For this fix, local views retain coherent raw
graph coordinates and use viewport fitting to bring the relevant subgraph into
frame. This prioritizes correct relationships over synthetic compact lanes.

## Hover Highlighting

Hovering a course card highlights its related prerequisite chain using the full
graph adjacency:

- traversed course nodes become visually emphasized;
- traversed logic nodes become visually emphasized;
- traversed lines increase contrast and stroke width;
- unrelated nodes and lines become subdued.

Click selection continues to control the right-side detail panel. Hover state
is temporary and independent from selected-course state.

## Pointer Interaction

Keep the existing pointer-movement tolerance helper.

- pointer down on either empty canvas space or a course card starts a possible
  map-pan gesture;
- movement below the tolerance remains a click candidate;
- movement above the tolerance pans the whole canvas and suppresses the
  subsequent course click;
- zoom controls do not start map panning;
- individual course cards cannot be repositioned.

## Files

Modify:

- `utils/courseUniverse.ts`
  - add complete graph primitives, routed-line helpers, arrow helpers,
    visibility traversal, and full-graph normalization.
- `tests/course-universe/courseUniverse.test.ts`
  - add failing tests for complete component preservation, card-edge endpoint
    attachment, routed paths, intermediate-node visibility, style semantics,
    and pointer intent.
- `components/courses/universe/CourseUniversePage.vue`
  - pass full scheduler map components into the canvas in addition to
    normalized course metadata.
- `components/courses/universe/CourseUniverseCanvas.vue`
  - render full graph primitives, logic nodes, routed paths, arrows, and hover
    state while preserving current Course Universe controls and detail-panel
    selection.

No backend changes are required because the existing scheduler map endpoints
already provide the complete graph payload.

## Testing

### Automated

Add Vitest coverage that proves:

- course nodes retain status metadata while logic nodes remain available to
  the render adapter;
- a course-to-course line attaches from the start card right edge to the end
  card left edge;
- a course-to-logic and logic-to-course chain preserves its middle node;
- routed lines include the API `x_coordinate` as their vertical elbow;
- selected-course and prefix visibility retain required intermediate nodes;
- line styling distinguishes prerequisite, co-requisite, and exclusion
  relationships;
- drag tolerance still separates click selection from canvas panning.

Run:

```bash
npm test -- tests/course-universe/courseUniverse.test.ts
npm run build
```

### Browser Verification

Run the frontend at `localhost:3000`, open `/courses`, and verify:

- visible lines attach to card edges rather than floating between cards;
- prerequisite, co-requisite, and exclusion nodes appear with distinct
  semantics;
- hover emphasizes a relationship chain;
- clicking a card opens the detail panel;
- dragging from empty space pans the canvas;
- dragging from a course card pans the canvas without opening the panel;
- zoom controls continue to work;
- subject-prefix switching and focused course views retain coherent paths.

After verification, stop the local dev server so port `3000` is free for the
user.
