// Smallest thing that fails if the scroll choreography breaks.
// Run: npm test
import assert from 'node:assert/strict';
import { BEATS, beatAt, lerpField, lerpCamera, copyOpacity, ease, COPY_WINDOW } from './src/beats.js';

// Every beat must be fully specified — a missing field silently NaNs the camera.
for (const b of BEATS) {
  for (const k of ['id', 'camera', 'explode', 'material', 'handSpin', 'title', 'body', 'backdrop']) {
    assert.ok(b[k] !== undefined, `beat ${b.id} missing ${k}`);
  }
  assert.equal(b.camera.pos.length, 3, `${b.id} camera.pos must be xyz`);
  assert.equal(b.camera.target.length, 3, `${b.id} camera.target must be xyz`);
  assert.ok(['steel', 'graphite'].includes(b.material), `${b.id} unknown material`);
}

// Progress must stay in range at both ends and never index past the last beat.
for (const p of [-1, 0, 0.5, 1, 2]) {
  const { from, to, t } = beatAt(p);
  assert.ok(from >= 0 && to < BEATS.length, `beatAt(${p}) out of bounds`);
  assert.equal(to, from + 1);
  assert.ok(t >= 0 && t <= 1, `beatAt(${p}) t out of range`);
}

// p=0 parks exactly on the first beat, p=1 exactly on the last.
assert.deepEqual(lerpCamera(0, 'pos'), BEATS[0].camera.pos);
assert.deepEqual(lerpCamera(1, 'pos'), BEATS.at(-1).camera.pos);
assert.equal(lerpField(0, 'explode'), BEATS[0].explode);
assert.equal(lerpField(1, 'explode'), BEATS.at(-1).explode);

// The camera path must be continuous — no jump between adjacent samples.
// Sample density must scale with beat count, or a coarse sweep steps straight
// over a span and reports smooth motion it never actually measured.
const SAMPLES = (BEATS.length - 1) * 120;
let prev = lerpCamera(0, 'pos');
for (let i = 1; i <= SAMPLES; i++) {
  const cur = lerpCamera(i / SAMPLES, 'pos');
  const jump = Math.hypot(cur[0] - prev[0], cur[1] - prev[1], cur[2] - prev[2]);
  assert.ok(jump < 0.35, `camera jumped ${jump.toFixed(3)} at p=${(i / SAMPLES).toFixed(4)}`);
  prev = cur;
}

// Each beat's copy peaks on its own beat and is gone at its neighbours.
// Exact equality is wrong here: i/(n-1)*spans does not land precisely on an
// integer in floating point, so a parked beat reads 0.999999... not 1.
const near = (a, b, msg) => assert.ok(Math.abs(a - b) < 1e-6, `${msg} (got ${a})`);

BEATS.forEach((b, i) => {
  near(copyOpacity(i / (BEATS.length - 1), i), 1,
    `beat ${b.id} copy not fully visible on its own beat`);
  for (const n of [i - 1, i + 1]) {
    if (n < 0 || n >= BEATS.length) continue;
    near(copyOpacity(n / (BEATS.length - 1), i), 0,
      `beat ${b.id} copy still showing at neighbour ${n}`);
  }
});

// Ease is a well-behaved 0->1 curve.
assert.equal(ease(0), 0);
assert.equal(ease(1), 1);
assert.ok(ease(0.5) > 0.49 && ease(0.5) < 0.51);

console.log(`ok — ${BEATS.length} beats, camera path continuous, copy crossfade clean`);

// No two copy blocks may be legible at once — the failure this guards against
// is two beats printing on top of each other mid-span.
for (let i = 0; i <= 4000; i++) {
  const p = i / 4000;
  const lit = BEATS.map((_, j) => copyOpacity(p, j)).filter((o) => o > 0.02);
  assert.ok(lit.length <= 1, `p=${p.toFixed(3)}: ${lit.length} copy blocks visible at once`);
}
console.log('ok — copy blocks never overlap');

// The index table publishes mesh counts. They must match what the scene really
// builds, or the page states a number the geometry contradicts.
const { COMPONENTS, TOTAL_MESHES } = await import('./src/components.js');
// NOTE: this only checks internal consistency of the table. The claim that it
// matches the real geometry is enforced by test-meshes.mjs, which boots the
// page and compares against the live scene — a constant-vs-literal assert here
// proved nothing and previously let a wrong number ship.
assert.equal(TOTAL_MESHES, 57, `component table sums to ${TOTAL_MESHES}`);
assert.equal(COMPONENTS.length, 14, 'copy claims fourteen component types');
// align must be a value the stylesheet actually understands.
for (const b of BEATS) {
  assert.ok(['left', 'center', 'right'].includes(b.align), `beat ${b.id} bad align: ${b.align}`);
  assert.ok(['open', 'shut', 'flat'].includes(b.curl), `beat ${b.id} bad curl: ${b.curl}`);
  assert.ok(Array.isArray(b.tilt) && b.tilt.length === 3, `beat ${b.id} tilt must be xyz`);
  for (const k of ['explode', 'handSpin', 'paper', 'dust']) {
    assert.ok(Number.isFinite(b[k]), `beat ${b.id}.${k} must be a finite number`);
  }
  for (const k of ['paper', 'dust']) {
    assert.ok(b[k] >= 0 && b[k] <= 1, `beat ${b.id}.${k} must be within 0..1`);
  }
}
// The beat ids main.js derives its card/ring windows from must exist.
for (const id of ['bracelet', 'hinge']) {
  assert.ok(BEATS.some((b) => b.id === id), `main.js derives a window from missing beat "${id}"`);
}
console.log(`ok — index table: ${COMPONENTS.length} types, ${TOTAL_MESHES} meshes`);
console.log('ok — every beat has valid align/curl/tilt and finite numeric fields');


// The overlap sweep alone does not pin this down: a COPY_WINDOW of 0.5101 still
// slips under the 0.02 legibility threshold. Assert the real invariant.
assert.ok(COPY_WINDOW < 0.5, `COPY_WINDOW must stay below 0.5, got ${COPY_WINDOW}`);

// A single NaN reaching the camera parks the scene permanently, so clamp01 has
// to absorb it rather than propagate it.
for (const bad of [NaN, undefined, 'x']) {
  const r = beatAt(bad);
  assert.ok(Number.isFinite(r.t), `beatAt(${String(bad)}) produced non-finite t`);
  assert.ok(Number.isInteger(r.from) && r.from >= 0, `beatAt(${String(bad)}) bad index`);
  const cam = lerpCamera(bad, 'pos');
  assert.ok(cam.every(Number.isFinite), `lerpCamera(${String(bad)}) produced NaN`);
}
console.log('ok — COPY_WINDOW invariant holds and NaN cannot reach the camera');
