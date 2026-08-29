// The scroll choreography, as data.
//
// Every beat is a keyframe of the whole scene: where the camera is, how far the
// watch is blown apart, which material it wears, and what copy sits on top.
// Scroll position maps to a point between two beats; everything else is a lerp.
//
// Keeping this a pure module means the timing can be unit-tested without a GPU.

export const BEATS = [
  {
    id: 'hero', align: 'center', paper: 0, dust: 0,
    camera: { pos: [0, 0, 7.2], target: [0, 0, 0] },
    explode: 0, material: 'steel', handSpin: 0,
    kicker: null,
    title: 'Caliber 08',
    body: 'A mechanical automatic, drawn entirely in code.',
    specs: [], backdrop: 'CALIBER',
  },
  {
    id: 'overview', align: 'left', paper: 0, dust: 0,
    camera: { pos: [0, 0.1, 5.3], target: [0, 0, 0] },
    explode: 0, material: 'steel', handSpin: 0.15,
    kicker: '00 — Overview',
    title: 'Nothing here was loaded',
    body: 'No model file, no textures, no photographs. Every surface below is generated the moment the page opens.',
    specs: [['Geometry', 'Procedural'], ['Assets', 'None']],
    backdrop: 'OVERVIEW',
  },
  {
    id: 'case', paper: 0.03, dust: 0,
    camera: { pos: [3.4, 1.1, 5.2], target: [0, 0, 0] },
    explode: 0, material: 'steel', handSpin: 0.4,
    kicker: '01 — Case',
    title: 'Brushed and beveled',
    body: 'The case alternates brushed flanks against polished bevels, so the light breaks twice across every edge.',
    specs: [['Diameter', '38 mm'], ['Thickness', '9.4 mm'], ['Material', 'Steel']],
    backdrop: 'CASE',
  },
  {
    id: 'flank', paper: 0.07, dust: 0,
    camera: { pos: [2.2, 0.3, 2.6], target: [0.3, 0, 0] },
    explode: 0, material: 'steel', handSpin: 0.6,
    kicker: '01 — Case',
    title: 'Two finishes, one billet',
    body: 'The transition is a hard line, not a fade. Turn it under a lamp and the flank goes dark while the bevel stays bright.',
    specs: [], backdrop: 'FLANK',
  },
  {
    id: 'bezel', align: 'right', paper: 0.13, dust: 0,
    camera: { pos: [0.35, 1.95, 3.75], target: [0, 0.05, 0] },
    explode: 0, material: 'steel', handSpin: 0.9,
    kicker: '02 — Bezel',
    title: 'One continuous radius',
    body: 'No step, no seam. The bezel is turned from the same billet as the case and meets the crystal flush.',
    specs: [['Finish', 'Polished']],
    backdrop: 'BEZEL',
  },
  {
    id: 'sapphire', align: 'right', paper: 0.19, dust: 0,
    camera: { pos: [0.6, 1.4, 2.2], target: [0, 0.1, 0] },
    explode: 0, material: 'steel', handSpin: 1.05,
    kicker: '02 — Bezel',
    title: 'Box-domed sapphire',
    body: 'The crystal stands slightly proud of the bezel, which is why the dial distorts at the very edge.',
    specs: [['Crystal', 'Sapphire'], ['Coating', 'Inner AR']],
    backdrop: 'SAPPHIRE',
  },
  {
    id: 'crown', paper: 0.26, dust: 0,
    camera: { pos: [3.0, 0.1, 1.6], target: [0.9, 0, 0] },
    explode: 0, material: 'steel', handSpin: 1.2,
    kicker: '03 — Crown',
    title: 'Knurled and screwed down',
    body: 'Set into the case rather than bolted onto it, so the silhouette stays unbroken from the side.',
    specs: [['Type', 'Screw-down']],
    backdrop: 'CROWN',
  },
  {
    id: 'apart', paper: 0.34, dust: 0.5,
    camera: { pos: [0, 0.3, 7.0], target: [0, 0, 0] },
    explode: 0.45, material: 'steel', handSpin: 1.35,
    kicker: '04 — Assembly',
    title: 'It comes apart',
    body: 'Each component travels along its own axis. Nothing is hidden inside anything else.',
    specs: [], backdrop: 'APART',
  },
  {
    id: 'exploded', align: 'left', paper: 0.55, dust: 1.0,
    camera: { pos: [0, 0.6, 9.4], target: [0, 0, 0] },
    explode: 1, material: 'graphite', handSpin: 1.6,
    kicker: '04 — Assembly',
    title: 'Fourteen parts',
    body: 'Bezel, crystal, dial, hands, mainplate, caseback, rotor, crown, lugs, and the bracelet links behind them.',
    specs: [['Component types', '14'], ['Meshes', '57']],
    backdrop: 'EXPLODED',
  },
  {
    id: 'components', paper: 0.64, dust: 1.0,
    camera: { pos: [8.6, 0.7, 0.4], target: [0, 0, 0] },
    explode: 1, material: 'graphite', handSpin: 1.85,
    kicker: '04 — Assembly',
    title: 'Every part in the air',
    body: 'Seen from the side the stack reads clearly: glass, dial, hands, plate, back.',
    specs: [], backdrop: 'COMPONENTS',
  },
  {
    id: 'assembled', paper: 0.86, dust: 0.85,
    camera: { pos: [2.2, 0.5, 5.2], target: [0, 0, 0] },
    explode: 0.3, material: 'graphite', handSpin: 2.1,
    kicker: '05 — Assembly',
    title: 'And back together',
    body: 'Tolerances are tight enough that the caseback seats without a gasket line showing.',
    specs: [], backdrop: 'ASSEMBLED',
  },
  {
    id: 'interlude-numbers', align: 'center', paper: 1.0, dust: 0,
    camera: { pos: [0, 0, 7.2], target: [0, 0, 0] },
    explode: 0, material: 'graphite', handSpin: 2.1,
    modelOpacity: 0, break: true,
    kicker: 'Interlude — The numbers',
    title: '57 meshes. Zero shortcuts.',
    body: 'Fourteen component types, built from primitives at runtime. The complexity is real; the presentation stays precise.',
    specs: [['Component types', '14'], ['Imported assets', '0']],
    backdrop: '57',
  },
  {
    id: 'interlude-principle', align: 'center', paper: 1.0, dust: 0,
    camera: { pos: [0, 0, 7.2], target: [0, 0, 0] },
    explode: 0, material: 'graphite', handSpin: 2.1,
    modelOpacity: 0, break: true,
    kicker: 'Interlude — The principle',
    title: 'Complexity, made legible.',
    body: 'A 38 millimetre case, a 9.4 millimetre profile, and a 72-hour reserve—reduced to the facts that matter.',
    specs: [['Diameter', '38 mm'], ['Profile', '9.4 mm'], ['Reserve', '72 h']],
    backdrop: 'MEASURED',
  },
  {
    id: 'movement', align: 'left', paper: 1.0, dust: 0.75,
    camera: { pos: [-1.2, -0.4, 3.0], target: [0, -0.1, 0] },
    explode: 0.18, material: 'graphite', handSpin: 2.6,
    kicker: '06 — Movement',
    title: 'It keeps its own time',
    body: 'The rotor winds on the wrist. No battery, no cell to replace, no reason to ever open it.',
    specs: [['Power reserve', '72 h'], ['Frequency', '4 Hz'], ['Jewels', '27']],
    backdrop: 'AUTOMATIC',
  },
  {
    id: 'rotor', paper: 1.0, dust: 0.7,
    camera: { pos: [-2.0, -1.0, 2.2], target: [-0.2, -0.3, 0] },
    explode: 0.1, material: 'graphite', handSpin: 2.85,
    kicker: '06 — Movement',
    title: 'The rotor never stops',
    body: 'It swings on the smallest movement of the arm and keeps swinging after you have stopped noticing it.',
    specs: [['Winding', 'Bidirectional']],
    backdrop: 'ROTOR',
  },
  {
    id: 'dial', align: 'right', paper: 0.84, dust: 0.35,
    camera: { pos: [0, 0, 4.0], target: [0, 0, 0] },
    explode: 0, material: 'graphite', handSpin: 3.2,
    kicker: '07 — Dial',
    title: 'Read it in a glance',
    body: 'Applied indices, no printing, no clutter. The only text on the dial is the text that has to be there.',
    specs: [['Indices', 'Applied'], ['Lume', 'Yes']],
    backdrop: 'DIAL',
  },
  {
    id: 'indices', paper: 0.58, dust: 0.12,
    camera: { pos: [0.9, 0.6, 2.1], target: [0.1, 0.1, 0] },
    explode: 0, material: 'graphite', handSpin: 3.35,
    kicker: '07 — Dial',
    title: 'Applied, never printed',
    body: 'Each marker is a separate piece set into the dial, which is why they throw a shadow.',
    specs: [], backdrop: 'INDICES',
  },
  {
    id: 'hands', align: 'center', paper: 0.32, dust: 0,
    camera: { pos: [0, 0.2, 1.75], target: [0, 0, 0] },
    explode: 0, material: 'steel', handSpin: 3.5,
    kicker: '08 — Hands',
    title: 'Polished to a point',
    body: 'The seconds hand is thin enough to disappear edge-on, and it sweeps rather than ticks.',
    specs: [['Sweep', '8 beats/s']],
    backdrop: 'HANDS',
  },
  {
    id: 'strip', paper: 0.06, dust: 0, align: 'left', curl: 'flat',
    camera: { pos: [-1.1, 0.55, 2.5], target: [-3.6, -0.1, 0] },
    tilt: [0, 0, Math.PI / 2],
    explode: 0, material: 'steel', handSpin: 3.7,
    kicker: '09 — Bracelet',
    title: 'Laid flat',
    body: 'Straightened out, the taper is obvious: every row is a little narrower than the one before it.',
    specs: [['Rows', '30'], ['Pitch', '0.185']],
    backdrop: 'STRIP',
  },
  {
    id: 'tile', paper: 0.04, dust: 0, align: 'left', curl: 'flat',
    camera: { pos: [-2.6, -0.34, 1.62], target: [-2.6, -0.34, 0] },   // band sits high; copy gets clear ground
    tilt: [0, 0, Math.PI / 2],
    explode: 0, material: 'steel', handSpin: 3.72,
    kicker: '09 — Bracelet',
    title: 'Repeat, ten times over',
    body: 'Head-on the band stops reading as a band. It becomes a pattern — links and pins alternating past both edges of the frame.',
    specs: [['Pitch', '0.185'], ['Interlock', 'Half-pitch']],
    backdrop: 'REPEAT',
  },
  {
    id: 'bracelet', paper: 0.1, dust: 0,
    camera: { pos: [0, -2.3, 1.9], target: [0, -1.9, 0] },
    explode: 0, material: 'steel', handSpin: 3.6,
    kicker: '09 — Bracelet',
    title: 'Links that taper',
    body: 'Each link narrows toward the clasp, so the weight sits forward and the bracelet falls the way a bracelet should.',
    specs: [['Links', 'Tapered']],
    backdrop: 'BRACELET',
  },
  {
    id: 'hinge', paper: 0.17, dust: 0, align: 'center',
    camera: { pos: [0, -0.4, 13.5], target: [0, -0.4, 0] },
    explode: 0, material: 'steel', handSpin: 3.7,
    kicker: null,
    title: null,
    body: null,
    specs: [],
    backdrop: '',
  },
  {
    id: 'clasp', paper: 0, dust: 0,
    camera: { pos: [0.8, -3.4, 1.5], target: [0, -3.1, 0] },
    explode: 0, material: 'steel', handSpin: 3.75,
    kicker: '09 — Bracelet',
    title: 'Milled, not stamped',
    body: 'Solid links throughout. The difference is inaudible on the wrist and obvious in the hand.',
    specs: [['Clasp', 'Milled']],
    backdrop: 'CLASP',
  },
  {
    id: 'worn', paper: 0, dust: 0,
    camera: { pos: [0, -0.5, 6.4], target: [0, -0.5, 0] },
    explode: 0, material: 'steel', handSpin: 3.85,
    curl: 'shut', tilt: [0.16, -0.42, -0.44],
    kicker: '10 — Worn',
    title: 'It closes into a circle',
    body: 'The same links, curled shut. Nothing is swapped in — the band just follows a tighter arc.',
    specs: [['Curl', 'Continuous']],
    backdrop: 'WORN',
  },
  {
    id: 'wall', paper: 0, dust: 0,
    camera: { pos: [0.7, -0.55, 7.9], target: [0, -0.45, 0] },
    explode: 0, material: 'steel', handSpin: 3.95,
    curl: 'shut', tilt: [0.22, -0.66, -0.58],
    kicker: null,
    title: null,
    body: null,
    specs: [],
    // A stacked wall rather than a single word: the object threads through the
    // lines, occluding some and passing behind others.
    // Depth comes from GREY VALUE and INDENT, not from size: every line is set
    // at the same cap height and the alignment alternates flush-left / indented
    // so the ragged right edge zig-zags. Lines are meant to crop at the edges.
    backdrop: [
      { text: 'NO MODEL',    alpha: 0.22, indent: 0.28 },
      { text: 'NO TEXTURES', alpha: 0.95, indent: 0.02 },
      { text: 'NO ASSETS',   alpha: 0.22, indent: 0.28 },
      { text: '57 MESHES',   alpha: 0.22, indent: 0.02 },
    ],
  },
  {
    id: 'profile', align: 'left', paper: 0, dust: 0,
    camera: { pos: [6.6, 0.1, 0.5], target: [0, 0, 0] },
    explode: 0, material: 'steel', handSpin: 4.0,
    kicker: '10 — Profile',
    title: 'Thin enough to forget',
    body: 'Under ten millimetres, cuff to cuff, with the crown tucked inside the silhouette.',
    specs: [['Height', '9.4 mm'], ['Lug to lug', '46 mm']],
    backdrop: 'PROFILE',
  },
  {
    id: 'outro', align: 'center', paper: 0, dust: 0,
    camera: { pos: [3.1, 1.5, 9.8], target: [0, -0.15, 0] },
    explode: 0, material: 'steel', handSpin: 4.2,
    kicker: null,
    title: 'Caliber 08',
    body: 'A study in scroll choreography. Nothing here is loaded from a file — the watch is generated at runtime.',
    specs: [], backdrop: 'TIMELESS',
  },
];

// Fill in the fields only the newer beats bother to declare.
for (const b of BEATS) {
  if (b.curl === undefined) b.curl = 'open';
  if (b.tilt === undefined) b.tilt = [0, 0, 0];
  if (b.paper === undefined) b.paper = 0;   // 0 = near-white, 1 = near-black
  if (b.dust === undefined) b.dust = 0;
  if (b.modelOpacity === undefined) b.modelOpacity = 1;
  if (b.break === undefined) b.break = false;
  if (b.align === undefined) b.align = 'left';
}

/** Smoothstep-style ease. Keeps beat-to-beat motion from arriving flat. */
export const ease = (t) => t * t * (3 - 2 * t);

// Written as a positive test so NaN falls through to 0 instead of propagating:
// `NaN < 0` and `NaN > 1` are both false, so the naive form returns NaN, and a
// single NaN reaches the camera and the scene never comes back.
const clamp01 = (n) => (n > 0 ? (n > 1 ? 1 : n) : 0);

/**
 * Map global scroll progress to a segment between two beats.
 * Returns the pair of indices and the eased local position between them.
 */
export function beatAt(progress, beats = BEATS) {
  const spans = beats.length - 1;
  const scaled = clamp01(progress) * spans;
  const from = Math.min(Math.floor(scaled), spans - 1);
  const local = scaled - from;
  return { from, to: from + 1, t: ease(clamp01(local)), raw: local };
}

/** Scalar interpolation between the two beats a progress value straddles. */
export function lerpField(progress, field, beats = BEATS) {
  const { from, to, t } = beatAt(progress, beats);
  const a = beats[from][field];
  const b = beats[to][field];
  return a + (b - a) * t;
}

/** Vector3-as-array interpolation for the camera path. */
export function lerpCamera(progress, key, beats = BEATS) {
  const { from, to, t } = beatAt(progress, beats);
  const a = beats[from].camera[key];
  const b = beats[to].camera[key];
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ];
}

/** Ground tone, interpolated between beats. */
export function lerpPaper(progress, beats = BEATS) {
  return lerpField(progress, 'paper', beats);
}

/** Whole-watch tilt, interpolated between beats. */
export function lerpTilt(progress, beats = BEATS) {
  const { from, to, t } = beatAt(progress, beats);
  const a = beats[from].tilt;
  const b = beats[to].tilt;
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ];
}

/** Arc radius the bracelet is laid along. Larger = straighter. */
export const CURL_RADIUS = { flat: 34, open: 3.2, shut: 1.12 };

/** The bracelet's arc radius at a given scroll position. */
export function lerpCurl(progress, beats = BEATS) {
  const { from, to, t } = beatAt(progress, beats);
  const a = CURL_RADIUS[beats[from].curl];
  const b = CURL_RADIUS[beats[to].curl];
  return a + (b - a) * t;
}

/**
 * Opacity for beat `i`'s copy at a given progress.
 * Copy is fully visible when parked on its beat and gone before the midpoint
 * to the next one. The window must stay under 0.5 of a span: any wider and two
 * blocks are both partly visible mid-span and print on top of each other.
 */
// MUST stay below 0.5: at exactly 0.5 two neighbouring blocks are both visible
// at the midpoint between beats and print on top of each other. Asserted in
// test-beats.mjs — the overlap sweep alone does not pin this down.
export const COPY_WINDOW = 0.46;

export function copyOpacity(progress, i, beats = BEATS) {
  const spans = beats.length - 1;
  const distance = Math.abs(clamp01(progress) * spans - i);
  return clamp01(1 - distance / COPY_WINDOW);
}
