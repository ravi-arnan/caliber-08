# Caliber 08 — a mechanical automatic, drawn in code

[![Live Demo](https://img.shields.io/badge/demo-live-black?style=for-the-badge)](https://app.emergent.sh/showcase/building-indonesia/4f0e9d26-d98c-441f-9e8b-819485db08cd)
[![Building Indonesia](https://img.shields.io/badge/Building_Indonesia-Submission-FF6B00?style=for-the-badge)](https://app.emergent.sh/showcase/building-indonesia/4f0e9d26-d98c-441f-9e8b-819485db08cd)
[![Three.js](https://img.shields.io/badge/Three.js-0.180-black?style=flat-square&logo=three.js)](https://threejs.org/)
[![Vite](https://img.shields.io/badge/Vite-7.1-646CFF?style=flat-square&logo=vite)](https://vitejs.dev/)
[![GSAP](https://img.shields.io/badge/GSAP-3.13-88CE02?style=flat-square&logo=greensock)](https://gsap.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](./LICENSE)

> A scroll-choreographed product study. The whole page is one pinned WebGL canvas. Scrolling does not move a document, it scrubs a camera and an assembly timeline.

**Best viewed on desktop.** Mobile is functional but not yet optimized for the scroll choreography.

Live submission for [Building Indonesia by Emergent](https://app.emergent.sh/showcase/building-indonesia/4f0e9d26-d98c-441f-9e8b-819485db08cd) — 100 winners, Rp800M+ prize pool.

---

## Demo

**Live:** https://app.emergent.sh/showcase/building-indonesia/4f0e9d26-d98c-441f-9e8b-819485db08cd

*If you like the craft, an upvote on the showcase page is appreciated.*

---

## What it is

The watch is **generated at runtime** — no `.glb`, no textures, no photography. Every surface is Three.js primitives and one canvas-painted dial. Change a number in `src/watch.js` and the watch changes.

| | |
|---|---|
| Beats | 27 |
| Scroll length | 2700vh (~27 screens), 26 spans of ~104vh |
| Meshes in the main scene | 57, from 14 component types |
| Entries in `parts` | 57 — one per mesh, see the note below |
| External assets | none |

The page runs three sections:

1. **The pinned track** (`#scroll-track`) — 27 beats scrubbing a fixed canvas, including a two-beat model-free editorial interlude.
2. **The component index** (`#index`) — the canvas fades out and the page becomes an ordinary document: a full-bleed table of every component and its mesh count.
3. **The finale** (`#finale`) — the same geometry cast in four metals, with a pointer-following control.

### The three-act ground

Tone ramps near-white → mid-grey → near-black → back to white across the beats. Both the background *and* the ink derive from a single `--tone` value, so copy inverts to light on its own as the ground darkens.

---

## Features

- **Procedural geometry** — case, bezel, crystal, dial, hands, lugs and bracelet built from `LatheGeometry`, `RoundedBoxGeometry` and `ExtrudeGeometry`. No external model files.
- **Scroll choreography** — 27 beats define camera, explode, bracelet curl, tilt, tone and copy. Everything between beats is a lerp.
- **Performance tuned** — bracelet rows merged (117 → 57 meshes), geometry cached across 6 watch builds, finale and cards lazy-built via `IntersectionObserver` and `requestIdleCallback`. 168 draw calls per frame.
- **Design system as code** — single `--tone` drives background and ink, with a hard step flip to keep contrast at 4.5:1 everywhere.
- **Accessible by default** — `prefers-reduced-motion` collapses to a stacked document, WebGL fallback is the same document, finale control is keyboard operable.

---

## Tech Stack

- **Three.js 0.180** — procedural geometry, `MeshStandardMaterial` / `MeshPhysicalMaterial`
- **GSAP 3.13** — scroll scrubbing
- **Vite 7** — dev and build
- **Vanilla JS / CSS** — no framework, `--tone` and `translate` for composition

---

## Getting Started

```bash
npm install
npm run dev          # http://localhost:5173
npm test             # beat timeline invariants (no browser needed)
npm run test:scene   # boots the real page, checks it against the live scene
npm run build
```

`npm run test:scene` needs the dev server running and a Chrome binary. Override either with `URL=… CHROME=… node test-meshes.mjs`.

---

## Architecture

```
index.html          layered fixed elements + the scroll spacer
src/beats.js        the choreography as data — camera, explode, tone, copy
src/watch.js        procedural geometry; one buildWatch() per finish
src/main.js         renderer, scroll rig, all per-frame DOM
src/finale.js       the four-finish lineup (own context, built lazily)
src/cards.js        stills baked from the same geometry, one per idle callback
src/components.js   the component index table's data
src/tokens.css      design tokens — colour derives from --tone
src/style.css       layout
```

**`beats.js` is the file to edit.** A beat is a keyframe of the entire scene: camera position and target, explode amount, bracelet curl, whole-watch tilt, ground tone, particle density, copy alignment, and the copy itself. Scroll position maps to a point between two beats and everything else is a lerp.

Only `main.js` touches the DOM per frame. `beats.js` is pure and testable without a browser, which is what `npm test` exercises.

---

## Counting: parts vs meshes

`buildWatch()` returns a `parts` array of **57 entries** and the scene contains **57 meshes**. They agree by construction — every entry is exactly one mesh — but they are still different concepts, and they have disagreed before.

A bracelet row used to be a `THREE.Group` of three link meshes, so 30 rows were 30 *entries* and 90 *meshes*, and the page once published "57 meshes" over geometry that actually contained 117. The rows are now merged into one mesh each (carrying two material groups so the polished centre and brushed outer links still read differently), which is why the two numbers now line up.

`npm run test:scene` boots the real page and asserts the index table's total against what the live scene reports. That test exists because the version that shipped the wrong number had a test which only compared a constant to a literal — it could never have failed.

---

## Provenance

The scroll *technique* here was studied from [thewatch.60fps.fr](https://thewatch.60fps.fr/) — a showcase piece by the [60fps](https://60fps.fr/) studio. What was taken is structural: the pinned scroll-scrubbed canvas, the three-act tonal ramp, display type running behind and being occluded by the object, per-glyph reveals, drifting cards over a stacked type wall, and the release into a data table.

Their model, shaders, copy and photography are theirs and are not reproduced here. The geometry, the words, and the four finishes in this repo are original.

---

## Accessibility

- `prefers-reduced-motion` collapses the whole thing into a readable stacked document — no canvas, no scroll choreography, all copy present.
- If WebGL is unavailable the page falls back to that same static document rather than 38 blank screens.
- Contrast is measured, not assumed: body copy and kickers hold ≥4.5:1 across the entire tonal ramp.
- The finale's finish list is a real, focusable control. The pointer-following cursor is an enhancement on top of it, not the only way in.

---

## Links

- **Showcase:** https://app.emergent.sh/showcase/building-indonesia/4f0e9d26-d98c-441f-9e8b-819485db08cd
- **Repository:** https://github.com/ravi-arnan/caliber-08

---

## License

MIT — see [LICENSE](./LICENSE) if present.
