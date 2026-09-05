# Original Youyou Mascot

## Runtime

The default model is `/mascot/youyou/v1/youyou.model.json`: 20 independent cropped
transparent WebP textures, approximately 278 KiB total, with a small JSON manifest.
`utils/mascotYouyou.ts` renders a deformable WebGL mesh with stencil-clipped irises,
blinks, mouth crossfades, bounded gaze, head/body movement and damped hair tips.
It is a layered 2.5D rig, not a Cubism moc3. Explicit Live2D model URLs retain the
existing `l2d` adapter. Loading errors show the existing retry UI; no sample fallback.

`NUXT_PUBLIC_MASCOT_ENABLED` remains opt-in. Shared dev enables it; school production
continues to use its existing release manifest and flags. Scale/position environment
options continue to apply to the Live2D adapter; the original rig fits its own bounds
with motion padding to the responsive canvas.

## Controls

Overlay exposes `setActivity(idle|thinking|speaking|error)`,
`setExpression(neutral|happy|thinking|surprised|concerned|wink)`,
`playMotion(greeting|nod)`, `playReaction()`, `setMouthOpen(0..1)`, and `speak(text)`.
Chat request events drive thinking/error; replies drive a short text-timed mouth
animation. This is not audio analysis or TTS. Mouse gaze is automatic; touch and
keyboard reactions remain available. Settings/history circles are unchanged.

Animations stop while collapsed or hidden. Reduced motion renders state changes
without an idle loop. Disposal cancels requests/frames and releases textures,
buffers, shaders and listeners. Same-origin manifests and basename-only texture
paths keep this renderer independent of external image hosts and provider secrets.

## Artwork And Sources

Workshop: `E:/Code/Project/Live2d`.

- Approved source: `artwork/youyou-corrected-v5.png`.
- SHA-256: `6ca7208f7e13f1e2cc732bb2cd9af13e34acefed3d6c6fc1352d47d38d6890cc`.
- Scripts: `decompose_youyou.py`, `inspect_layers.py`, `repair_layers.py`,
  `export_youyou.cjs`, `qa_workbench.cjs`.
- Raw inference: `output/v5-seethrough-1280`; seed 42, 30 steps, 1280 canvas.
- Source head, horn, ears and lower hair are retained from v5. Initial neural
  separation omitted the horn/ears and was not published uncorrected. Lower face
  features and collar were repaired; eyes and mouth have dedicated closed/open
  layers. Body layers contain inferred occluded regions.
- Editable source and browser checks are retained in the workshop, not the web
  bundle. Credentials, generator task payloads and neural weights are not committed.

See `public/mascot/THIRD_PARTY_NOTICES.txt` for software attribution and the separate
character-art ownership notice. Generic closed-eye templates are MIT-licensed;
the mouth cavity is authored locally.
