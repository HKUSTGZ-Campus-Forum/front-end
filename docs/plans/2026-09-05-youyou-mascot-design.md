# Original Youyou Mascot

## Goal

Replace the dev forum's remote Hiyori sample with the user's original campus character. Preserve the existing assistant settings/history hover buttons. The character must visibly track the pointer, blink, move its mouth, react to clicks and expose named expressions and motions.

## Assets And Renderer

The production workshop is `E:/Code/Project/Live2d`. Reference-assisted illustration generation produces a clean original portrait. See-through (SIGGRAPH 2026, Apache-2.0) produces completed semantic layers and an editable PSD. Anime2.5DRig (MIT) supplies proven automatic anchor detection, mesh deformation, iris clipping and hair springs. Inspect and repair the generated layers before publishing.

Use a compact, versioned, same-origin model manifest and transparent WebP textures. Export offline so visitors do not download Python models, PSD parsers or editing tools. The website renderer loads only browser-ready assets. Keep copyright and MIT attribution with the distribution. This is a layered 2.5D model, not a Cubism `.moc3` export.

The overlay selects the renderer by model manifest suffix. Explicit `.model3.json` configurations retain the existing Live2D adapter. Shared dev and local example configuration default to the original model. Preserve the independent mascot enable flag and production release controls.

## Control And Lifecycle

- Shared renderer contract: mount, resize, dispose, reaction, mouth value, pause and optional expression/state controls.
- Pointer input maps to bounded eye/head parameters. Keyboard and touch still trigger reactions.
- Expressions include neutral, happy, thinking, surprised and concerned. Named motions include greeting and nodding.
- Preserve assistant bubble/speech integration and connect request state to thinking/reply/error expressions.
- Stop work when collapsed, hidden, disposed or reduced motion is enabled; resume cleanly. Dispose GPU resources and listeners, cancel in-flight loads and animation frames.
- Fail with the existing retry state. No silent fallback to an unrelated sample character.

## Acceptance

The live shared development deployment serves the original same-origin assets. Desktop and mobile screenshots show intact proportions, eyes and costume, no gray background, seams or clipping. Pointer tracking, blink, expression changes, mouth motion, hover actions, collapse/resume and loading errors are exercised. Run i18n checks, the full frontend test suite and production build. Record exact source and deployment commits and provide the workshop source files.
