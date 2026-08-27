# Working on Caliber 08

Read `README.md` first for what the project is. This file is the list of things
that are **not obvious from the code** and that have each already been broken
once. Re-breaking them is the main risk when editing this repo.

---

## Invariants

### `beats.js`

- **`COPY_WINDOW` must stay below 0.5.** At exactly 0.5 two neighbouring copy
  blocks are both partly visible at the midpoint between beats and print on top
  of each other. It is exported and asserted directly in `test-beats.mjs` — the
  overlap sweep alone does not pin it down (a value of 0.5101 still slipped
  under the legibility threshold).
- **`clamp01` is written as a positive test** so `NaN` falls through to `0`.
  The naive `n < 0 ? 0 : n > 1 ? 1 : n` returns `NaN` for `NaN`, and one `NaN`
  reaching the camera makes the scene disappear permanently with no recovery.
- **Never hardcode beat indices anywhere.** `main.js` derives every scroll
  window (`cards`, `ring`, `tally`, `leaders`) from `BEATS.findIndex(...)` by
  id. Inserting a beat used to silently slide those onto the wrong section with
  no test failure.

### Colour and `--tone`

- **The ink flip is a STEP, never a blend.** Any continuous dark→light ink
  interpolation *must* pass through whatever lightness the paper currently has.
  It did: around tone 0.68 ink and paper landed within 1.7 lightness of each
  other and every word on the page vanished. `main.js` writes `--ink-flip` as
  0 or 1 with hysteresis (0.70 down / 0.66 up). Do not "smooth" this.
- **Set `--tone` on `documentElement`, not `body`.** `--color-paper` and
  `--color-ink` are *defined* on `:root`, and a custom property resolves against
  the element where it is defined. Setting `--tone` lower down leaves the `:root`
  derivation reading its default.
- Contrast across the ramp is measured, not assumed. If you change the ramp,
  re-measure — and resolve colours through a canvas, because `getComputedStyle`
  reports `color-mix()` results as `oklch(...)`, whose components are not RGB.
  A naive parser silently reports 1.00 for everything.

### Typography

- **`.beat-title` glyphs are wrapped per word.** Per-glyph spans are
  `display:inline-block`, which makes every letter an independently wrappable
  box — the line breaker will split a word between any two characters. The
  `.word` wrapper is what stops it.
- **Never put `overflow-wrap: anywhere` on display type.** It removes the last
  guard against the above.
- **Centre copy with the `translate` property, not `transform`.** The render
  loop writes an inline `transform` every frame for the parallax, which beats
  the stylesheet; `translate` is a separate property and composes instead of
  competing. Centred copy previously sat with its *left edge* at viewport centre.

### `watch.js`

- **`steel` is a shared material.** The case, crown, all four lugs and every
  bracelet centre link use it so `main.js` can recolour the whole watch in one
  write. Never mutate it for one part — setting `.side` on it once turned every
  one of those double-sided.
- **`add()` sets `castShadow = true`.** Set `castShadow = false` *after* the
  call, not before, or it is silently undone.
- **Bracelet link height must exceed the pitch.** A rigid box on a curve needs
  more height at its outer face, because the outer radius sweeps a longer arc:
  `outer = PITCH * (1 + depth / (2 * curl))`. At the tightest curl that is 0.194
  against a pitch of 0.185, so `GAP` is negative on purpose. Cutting links to
  the pitch leaves a visible wedge between every pair.
- **The case profile must not close over the front.** It is a `LatheGeometry`
  revolved from `caseProfile`, which starts at `x = 0` (so the caseback is
  solid) and *stops* at `x = 0.855` — leaving the front open for the dial. Any
  profile that returns to `x = 0` at the front end puts a solid metal disc over
  the face and hides it entirely. An earlier capped-cylinder case did exactly
  that.
- **The crystal is not `transmission`.** The transmission pass does not
  composite the dial behind it, which also hides the face. It is thin
  transparent glass with a clearcoat.

### Leader lines and the explore control

- Labels are placed left-to-right and any that cannot clear its neighbour by
  96px is **suppressed**, not squeezed. This explode is radial, not the lateral
  row the technique comes from, so several components land on nearly the same x
  and a full set piles up illegibly.
- Holding `#explore` lifts that suppression and steps crowded labels up in
  22px tiers instead. It is a real affordance, not decoration — it is the only
  way to see all six names — so it must stay operable by keyboard (Enter
  toggles, `aria-pressed` tracks state). A press-and-hold that only works with
  a mouse would put those labels out of reach entirely.
- The rule runs FROM the component DOWN to the bottom edge. Anchoring it at the
  top put the label on the object, where it was least readable.
- Labels use `writing-mode: vertical-rl`, not `rotate(-90deg)`. A rotated
  element keeps a horizontal box, so half the label swung below the viewport
  and clipped.

### Counting

`parts.length` and the mesh count are both **57**, and they agree *by
construction*: each `parts` entry is exactly one mesh. Do not assume that is
permanent. A bracelet row was previously a Group of three link meshes, making
the counts 57 and 117, and the page published the wrong one. If you ever put a
Group back into `parts`, the two diverge again.
`window.__scene` is set once, from the main scene only, in `main.js`; do not
move it back into `buildWatch()`, which runs six times per load (main, four
finale, one card bake) and would report whichever finished last.

---

## Performance shape

Measured, not guessed:

- No heap leak — plateaus around 8.5 MB after one scroll cycle.
- The main render loop is gated by an IntersectionObserver on `#scroll-track`
  and genuinely stops past it.
- The finale (renderer, environment bake and 468 meshes) is built on first
  intersection, not at load.
- The card bake is one still per idle callback. Doing all four in one call was a
  single multi-second task that `requestIdleCallback` could not interrupt.
- Bracelet rows are merged (three link meshes into one, two material groups)
  and their geometry is cached at module level across all six watch builds:
  117 → 57 meshes, 540 link constructions → 15 merged rows, 194 → 168 draw
  calls per frame.
- The draw-call win is deliberately smaller than it could be. One material per
  row would give ~74/frame, but the row would lose the polished-centre /
  brushed-outer contrast. Two groups was chosen over the extra 94 calls.
- **Cached row geometry is shared.** `merged.userData.shared = true` marks it,
  and `cards.js` skips it on teardown. Any new code that disposes a watch must
  do the same, or the bracelets vanish from every other watch on the page.

---

## Verifying changes

```bash
npm test && npm run test:scene && npm run build
```

**A green suite is not proof.** Several of the worst defects in this project's
history passed every check that existed at the time:

- Headlines split mid-word on 14 of 24 beats — every element present, every
  opacity correct.
- `data-align` was emitted, then overwritten by a later edit; twelve beats
  declared an alignment that never reached the DOM.
- The page printed a mesh count its own geometry contradicted, while a test
  asserted the constant against a literal.
- A leader-line check reported "all labels on screen" while measuring the
  bounding boxes of labels whose opacity was zero.

So: **when you write a check, ask what would make it fail.** If nothing
plausible would, it is decoration. And when a measurement is implausible,
suspect the instrument before you rewrite working code — a contrast probe once
reported 1.00 everywhere because it parsed `oklch()` as RGB.

Screenshots catch what numbers miss (collisions, crops, things landing on dark
objects). Numbers catch what eyes miss (alignment to the pixel, contrast ratios,
per-frame write counts). Both are needed; neither alone is sufficient.

---

## House style

- Comments explain **why**, especially where the code looks wrong but is not
  (the negative `GAP`, the hard ink step, the per-word wrappers).
- `beats.js` stays pure — no DOM, no Three.js — so it can be tested headless.
- Anything user-visible that states a number must be checkable against the thing
  it describes.
