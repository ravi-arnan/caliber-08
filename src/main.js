import './style.css';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { BEATS, beatAt, lerpField, lerpCamera, lerpTilt, lerpCurl, lerpPaper, copyOpacity } from './beats.js';
import { buildWatch, setBraceletCurl, FINISHES } from './watch.js';
import { COMPONENTS, TOTAL_MESHES } from './components.js';
import { initFinale } from './finale.js';

gsap.registerPlugin(ScrollTrigger);

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const stage = document.getElementById('stage');
const backdrop = document.getElementById('backdrop');
const overlay = document.getElementById('overlay');
const bar = document.getElementById('bar');
const ring = document.getElementById('ring');
const tally = document.getElementById('tally');
const explore = document.getElementById('explore');
const hint = document.querySelector('.hint');
const chapter = document.getElementById('chapter');
const chapterId = document.getElementById('chapter-id');
const chapterLabel = document.getElementById('chapter-label');
const leadersEl = document.getElementById('leaders');
const datumEl = document.getElementById('datum');
const tallyN = document.getElementById('tally-n');
const ringDark = ring.querySelector('.ring-dark');
const ringPale = ring.querySelector('.ring-pale');

/* ---------------------------------------------------------------- overlay */

// Escapes quotes too: esc() output is interpolated into attribute values in
// backdropMarkup(), so &<> alone is not sufficient if this data ever stops
// being static.
const esc = (s) => String(s).replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const specRows = (specs, id) => specs.length
  ? `<dl class="specs" data-testid="beat-specifications-${id}">${specs.map(([k, v]) => { const key = String(k).toLowerCase().replace(/[^a-z0-9]+/g, '-'); return `<div><dt data-testid="spec-label-${id}-${key}">${esc(k)}</dt><dd data-testid="spec-value-${id}-${key}">${esc(v)}</dd></div>`; }).join('')}</dl>`
  : '';

/**
 * Split a headline into per-glyph spans.
 *
 * The reveal is a left-to-right wipe rather than a block fade: each glyph trails
 * its neighbour slightly, so the line writes itself on. Word-joiners are kept as
 * plain text so the line still wraps at spaces.
 */
const glyphs = (text) => {
  // Per-glyph spans are `display:inline-block`, which makes every letter its own
  // wrappable box — the line breaker will happily split a word between any two
  // characters. Grouping them into per-word wrappers puts the unbreakable unit
  // back at the word, where it belongs.
  let i = 0;
  return text.split(' ').map((word) =>
    `<span class="word">${[...word]
      .map((ch) => `<span class="ch" data-c="${i++}">${esc(ch)}</span>`).join('')}</span>`
  ).join(' ');
};

/** A backdrop is either one word, or a stack of lines at varying weight. */
const backdropMarkup = (b) => Array.isArray(b.backdrop)
  ? `<span class="backdrop-stack">${b.backdrop
      .map((l) => `<span class="backdrop-line" style="--a:${l.alpha};--ind:${l.indent}">${esc(l.text)}</span>`)
      .join('')}</span>`
  : esc(b.backdrop);

/** Copy blocks, one per beat. Built from BEATS so the text lives in one place. */
function renderCopy() {
  overlay.innerHTML = BEATS.map((b, i) => b.title
    ? `<article class="beat-copy" data-i="${i}" data-align="${b.align}" data-testid="beat-copy-${b.id}" ${i === 0 ? 'data-lead' : ''} ${b.break ? 'data-break' : ''}>
      ${b.kicker ? `<p class="kicker" data-testid="beat-kicker-${b.id}">${esc(b.kicker)}</p>` : ''}
      <h2 class="beat-title" data-testid="beat-title-${b.id}">${glyphs(b.title)}</h2>
      <p class="beat-body" data-testid="beat-body-${b.id}">${esc(b.body)}</p>
      ${specRows(b.specs, b.id)}
    </article>`
    : `<article class="beat-copy" data-i="${i}" data-empty></article>`).join('');

  backdrop.innerHTML = BEATS
    .map((b, i) => `<span class="backdrop-word" data-i="${i}">${backdropMarkup(b)}</span>`)
    .join('');
}
renderCopy();

const slug = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-');
document.getElementById('index-table').innerHTML = COMPONENTS.map((c) => `
  <article class="index-row index-card" data-group="${esc(c.group)}" data-testid="index-card-${slug(c.name)}">
    <div class="index-card-head">
      <span class="index-n" data-testid="index-number-${slug(c.name)}">${esc(c.n)}</span>
      <span class="index-plus" aria-hidden="true">+</span>
      <span class="index-group" data-testid="index-group-${slug(c.name)}">${esc(c.group)}</span>
    </div>
    <span class="index-name" data-testid="index-name-${slug(c.name)}">${esc(c.name)}</span>
    <div class="index-card-foot">
      <span class="index-detail">Runtime geometry</span>
      <span class="index-meshes" data-testid="index-meshes-${slug(c.name)}">${c.meshes} ${c.meshes === 1 ? 'mesh' : 'meshes'}</span>
    </div>
  </article>`).join('') + `
  <div class="index-row index-total" data-testid="index-total-card">
    <span class="index-plus" aria-hidden="true"></span>
    <span class="index-name" data-testid="index-total-name">Total</span>
    <span class="index-n"></span>
    <span class="index-group"></span>
    <span class="index-meshes" data-testid="index-total-meshes">${TOTAL_MESHES} meshes</span>
  </div>`;

[...document.querySelectorAll('.index-row')].forEach((row, i) => {
  row.style.setProperty('--i', i);
});
// Rows reveal bottom-up; each one draws its own hairline in. The rule is the
// progress indicator, so the table assembles rather than simply appearing.
const rowObserver = new IntersectionObserver((entries) => {
  for (const e of entries) if (e.isIntersecting) e.target.dataset.in = '';
}, { threshold: 0.2 });
document.querySelectorAll('.index-row').forEach((r) => rowObserver.observe(r));

const indexFilters = [...document.querySelectorAll('.index-filter')];
const indexFilterStatus = document.getElementById('index-filter-status');
const indexRows = [...document.querySelectorAll('.index-card')];
indexFilters.forEach((button) => button.addEventListener('click', () => {
  const filter = button.dataset.filter ?? 'all';
  const visible = indexRows.filter((row) => filter === 'all' || row.dataset.group === filter);
  indexRows.forEach((row) => row.toggleAttribute('data-hidden', !visible.includes(row)));
  visible.forEach((row) => { row.dataset.in = ''; });
  indexFilters.forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
  indexFilterStatus.textContent = filter === 'all'
    ? `Showing all ${COMPONENTS.length} component types`
    : `Showing ${visible.length} ${filter} component types`;
}));

const copyEls = [...overlay.querySelectorAll('.beat-copy')];
const charCache = copyEls.map((el) => [...el.querySelectorAll('.ch')]);
const charState = copyEls.map(() => 0);
const wordEls = [...backdrop.querySelectorAll('.backdrop-word')];

/* ----------------------------------------------------------------- finale */

/* ------------------------------------------------- boot / static fallback */

/** Collapse to a readable document: no canvas, no scroll choreography. */
function staticFallback() {
  document.body.dataset.static = 'true';
  const track = document.getElementById('scroll-track');
  if (track) track.style.height = 'auto';
}

// Order matters. boot() runs before the finale below, and both are guarded:
// without this, no-WebGL or a throw in the decorative lineup left every copy
// block at opacity 0 over a 3800vh track — 38 screens of blank paper.
if (reduced) {
  staticFallback();
} else {
  try {
    boot();
  } catch (err) {
    console.warn('WebGL unavailable — falling back to static document:', err);
    staticFallback();
  }
}

/* ----------------------------------------------------------------- finale */

// A plain list of the finishes, so the lineup is readable without WebGL and in
// reduced-motion mode where the canvas never starts.
const finaleList = document.getElementById('finale-list');
const finaleLabel = document.getElementById('finale-label');

if (!reduced && !document.body.dataset.static) try {
  const finale = initFinale({
    canvas: document.getElementById('finale-canvas'),
    onSelect: (f) => {
      finaleLabel.textContent = f.label;
      const n = finale.watches.indexOf(f) + 1;
      document.getElementById('finale-count').textContent =
        `${String(n).padStart(2, '0')} / ${String(finale.watches.length).padStart(2, '0')}`;
      [...finaleList.children].forEach((li, i) =>
        li.toggleAttribute('data-on', i === finale.watches.indexOf(f)));
    },
  });
  finaleList.innerHTML = finale.watches
    .map((w, i) => `<li><button type="button" data-i="${i}" data-testid="finale-finish-${w.key}">${esc(w.label)}</button></li>`).join('');
  finaleList.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-i]');
    if (btn) finale.select(+btn.dataset.i);
  });
  document.getElementById('select-model').addEventListener('click', () => finale.next());

  // Half-screen hit zones + a cursor that lerps toward the pointer.
  const section = document.getElementById('finale');
  const cursor = document.getElementById('model-cursor');
  section.querySelectorAll('.finale-half').forEach((btn) =>
    btn.addEventListener('click', () => finale.select(
      finale.watches.indexOf(finale.current) + +btn.dataset.step)));

  let cx = 0, cy = 0, tx = 0, ty = 0, chasing = false;
  section.addEventListener('pointermove', (e) => {
    // Mouse only. A touch also fires pointermove, which set data-pointer and
    // hid #select-model — so a touch user could see the button, tap it, and
    // watch it disappear out from under the tap. The chasing cursor is a
    // fine-pointer affordance; touch keeps the real button.
    if (e.pointerType !== 'mouse') return;
    tx = e.clientX; ty = e.clientY;
    if (!chasing) { cx = tx; cy = ty; chasing = true; chase(); }
    section.dataset.pointer = 'in';
  });
  let chaseRaf = 0;
  section.addEventListener('pointerleave', () => {
    delete section.dataset.pointer;
    cancelAnimationFrame(chaseRaf);
    chaseRaf = 0;
    chasing = false;
  });
  function chase() {
    cx += (tx - cx) * 0.14;
    cy += (ty - cy) * 0.14;
    cursor.style.transform = `translate3d(${cx}px, ${cy}px, 0) translate(-50%, -50%)`;
    chaseRaf = requestAnimationFrame(chase);
  }

  finale.select(0);
} catch (err) {
  // The lineup is the last section on the page. If its context is refused,
  // degrade to the plain list rather than taking the hero down with it.
  console.warn('finale lineup unavailable:', err);
  document.getElementById('finale-canvas')?.remove();
  finaleStaticList();
} else finaleStaticList();

function finaleStaticList() {
  finaleList.innerHTML = ['Brushed steel', 'Graphite', 'Yellow gold', 'Rose gold']
    .map((l, i) => `<li><span data-testid="finale-static-option-${i}">${esc(l)}</span></li>`).join('');
}



/* ------------------------------------------------------------------ scene */

function boot() {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.92;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  stage.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, innerWidth / innerHeight, 0.1, 100);

  // Room environment gives the metal something to reflect without loading an HDR.
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  scene.environment = pmrem.fromScene(room, 0.04).texture;
  room.dispose();
  pmrem.dispose();

  scene.add(new THREE.AmbientLight(0xffffff, 0.5));
  const key = new THREE.DirectionalLight(0xffffff, 1.85);
  key.position.set(4, 6, 6);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.near = 0.5;
  key.shadow.camera.far = 24;
  key.shadow.camera.left = -3; key.shadow.camera.right = 3;
  key.shadow.camera.top = 3; key.shadow.camera.bottom = -3;
  key.shadow.bias = -0.0012;
  key.shadow.radius = 3;
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xffffff, 1.1);
  rim.position.set(-5, -2, -4);
  scene.add(rim);

  const watch = buildWatch();
  scene.add(watch.root);

  // The editorial interlude removes the object without removing the canvas.
  // Preserve each material's original transparency so the crystal returns with
  // its intended opacity after the watch fades back into the next chapter.
  const modelMaterials = new Map();
  watch.root.traverse((node) => {
    if (!node.isMesh) return;
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    materials.forEach((material) => {
      if (material && !modelMaterials.has(material)) {
        modelMaterials.set(material, { opacity: material.opacity, transparent: material.transparent });
      }
    });
  });

  // Test hook for the MAIN scene only. buildWatch runs five times per load (here
  // and four in the finale); writing this inside buildWatch
  // meant the global reported whichever finished last.
  window.__scene = { meshes: watch.meshCount, parts: watch.parts.length };

  const dust = makeDust();
  scene.add(dust);

  /* --------------------------------------------------------- scroll state */

  // GSAP owns the smoothing. This MUST be a tween that ScrollTrigger scrubs —
  // `scrub` interpolates the tween's playhead toward the scroll position over
  // time, which is where the glide comes from.
  //
  // Reading `self.progress` inside onUpdate instead looks equivalent and is not:
  // that value is the raw scroll offset, so the camera lands on each wheel notch
  // exactly as chunky as the wheel delta, and `scrub` has nothing to smooth.
  // No Lenis — the reference smooths the same way.
  const state = { p: 0 };

  gsap.to(state, {
    p: 1,
    ease: 'none',
    scrollTrigger: {
      trigger: '#scroll-track',
      start: 'top top',
      end: 'bottom bottom',
      scrub: 0.85,
    },
  });

  // Derived from ids, not hardcoded: inserting a beat above these used to move
  // the cards and ring onto the wrong section with no test failure.
  const beatIndex = (id) => {
    const i = BEATS.findIndex((b) => b.id === id);
    if (i < 0) throw new Error(`unknown beat id: ${id}`);
    return i;
  };
  const RING_START = beatIndex('hinge') + 0.3;
  const TALLY_START = beatIndex('apart');
  const LEADER_START = beatIndex('exploded') - 0.45;
  const TALLY_LAND = beatIndex('exploded');   // hits 117 exactly where the spec says 117
  const TALLY_END = beatIndex('dial');
  const INTERLUDE_FIRST = beatIndex('interlude-numbers');
  const INTERLUDE_LAST = beatIndex('interlude-principle');

  // One leader per labelled component, built once.
  leadersEl.innerHTML = watch.labelled
    .map((l) => `<span class="leader"><i></i><b>${esc(l.name)}</b></span>`).join('');
  const leaderEls = [...leadersEl.querySelectorAll('.leader')];
  const projected = new THREE.Vector3();

  // Holding the explore control names every component at once: the collision
  // suppression below hides labels that share an x, and this lifts it, spacing
  // them vertically instead. Pointer hold OR keyboard toggle — a press-and-hold
  // that only works with a mouse would put the extra labels out of reach.
  let exploring = false;
  const setExploring = (on) => {
    exploring = on;
    explore.setAttribute('aria-pressed', String(on));
  };
  explore.addEventListener('pointerdown', () => setExploring(true));
  addEventListener('pointerup', () => setExploring(false));
  explore.addEventListener('pointerleave', () => setExploring(false));
  explore.addEventListener('keydown', (e) => {
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); setExploring(!exploring); }
  });

  const camPos = new THREE.Vector3();
  const camTarget = new THREE.Vector3();
  const offset = new THREE.Vector3();
  // Read from FINISHES rather than re-typing the hex: these were hand-copied
  // and graphite had already drifted from the finale's value, so the same named
  // finish rendered as two different greys on one page.
  const steelColor = new THREE.Color(FINISHES.steel.steel);
  const brushedColor = new THREE.Color(FINISHES.steel.brushed);
  const graphiteColor = new THREE.Color(FINISHES.graphite.steel);

  const clock = new THREE.Clock();
  let rafId = 0;
  let running = false;
  let lastTone = '';
  let lastModelOpacity = -1;
  let lastChapter = -1;
  let inkFlip = 0;
  let lastTally = -1;
  const INK_FLIP_DOWN = 0.70;   // scrolling down: dark ink -> light
  const INK_FLIP_UP = 0.66;     // scrolling back up: light ink -> dark
  let vh = innerHeight;
  let vw = innerWidth;

  function startLoop() { if (!running) { running = true; rafId = requestAnimationFrame(frame); } }
  function stopLoop() { running = false; cancelAnimationFrame(rafId); rafId = 0; }

  // Past the end of the track the canvas is faded out and the page is an
  // ordinary document — no reason to keep drawing.
  new IntersectionObserver(
    ([e]) => (e.isIntersecting ? startLoop() : stopLoop()),
    { rootMargin: '0px' },
  ).observe(document.getElementById('scroll-track'));

  // A lost context leaves a permanently blank canvas while the loop spins on.
  renderer.domElement.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    stopLoop();
    console.warn('WebGL context lost — pausing render loop');
  });
  renderer.domElement.addEventListener('webglcontextrestored', () => {
    console.warn('WebGL context restored');
    startLoop();
  });

  function frame() {
    if (!running) return;
    const p = state.p;
    const elapsed = clock.getElapsedTime();

    // Camera rides the beat path.
    const [px, py, pz] = lerpCamera(p, 'pos');
    const [tx, ty, tz] = lerpCamera(p, 'target');
    camPos.set(px, py, pz);
    camTarget.set(tx, ty, tz);
    camera.position.copy(camPos);
    camera.lookAt(camTarget);

    // Bracelet curl. This rewrites each row's `home`, so it has to land before
    // the exploded-view pass below adds its offset on top.
    setBraceletCurl(watch, lerpCurl(p));   // lerpCurl now returns the radius itself

    // Exploded view.
    const explode = lerpField(p, 'explode');
    for (const part of watch.parts) {
      offset.copy(part.explodeDir).multiplyScalar(explode * 1.5);
      part.mesh.position.copy(part.home).add(offset);
    }

    // Material crossfade, steel <-> graphite.
    const { from, to, t } = beatAt(p);
    const wantsGraphite = (i) => (BEATS[i].material === 'graphite' ? 1 : 0);
    const mix = wantsGraphite(from) + (wantsGraphite(to) - wantsGraphite(from)) * t;
    watch.steel.color.copy(steelColor).lerp(graphiteColor, mix);
    watch.steel.roughness = FINISHES.steel.rough + mix * (FINISHES.graphite.rough - FINISHES.steel.rough);
    watch.brushed.color.copy(brushedColor).lerp(graphiteColor, mix);
    watch.brushed.roughness = 0.44 + mix * 0.02;

    // Hands sweep as you scroll; the seconds hand also ticks on its own.
    const spin = lerpField(p, 'handSpin');
    watch.hands.hourHand.rotation.z = -spin * 0.52;
    watch.hands.minuteHand.rotation.z = -spin * 6.2;
    watch.hands.secondHand.rotation.z = -spin * 24 - elapsed * 0.9;
    watch.rotor.rotation.z = spin * 3.1 + elapsed * 0.25;

    // Beat tilt, plus a slow idle drift so the object never looks frozen.
    const [tiltX, tiltY, tiltZ] = lerpTilt(p);
    watch.root.rotation.x = tiltX;
    watch.root.rotation.y = tiltY + Math.sin(elapsed * 0.22) * 0.028;
    watch.root.rotation.z = tiltZ;

    // Keep the watch completely absent for roughly two viewport-length spans,
    // with short mechanical fades before and after the editorial interruption.
    const timelinePosition = p * (BEATS.length - 1);
    const fadeOutStart = INTERLUDE_FIRST - 1;
    const hiddenStart = INTERLUDE_FIRST - 0.45;
    const hiddenEnd = INTERLUDE_LAST + 0.45;
    const fadeInEnd = INTERLUDE_LAST + 1;
    let modelOpacity = 1;
    if (timelinePosition >= fadeOutStart && timelinePosition < hiddenStart) {
      const t = (timelinePosition - fadeOutStart) / (hiddenStart - fadeOutStart);
      modelOpacity = 1 - t * t * (3 - 2 * t);
    } else if (timelinePosition >= hiddenStart && timelinePosition <= hiddenEnd) {
      modelOpacity = 0;
    } else if (timelinePosition > hiddenEnd && timelinePosition <= fadeInEnd) {
      const t = (timelinePosition - hiddenEnd) / (fadeInEnd - hiddenEnd);
      modelOpacity = t * t * (3 - 2 * t);
    }
    watch.root.visible = modelOpacity > 0.005;
    window.__scene.modelOpacity = modelOpacity;
    if (Math.abs(modelOpacity - lastModelOpacity) > 0.002) {
      for (const [material, original] of modelMaterials) {
        const transparent = original.transparent || modelOpacity < 0.999;
        if (material.transparent !== transparent) {
          material.transparent = transparent;
          material.needsUpdate = true;
        }
        material.opacity = original.opacity * modelOpacity;
      }
      lastModelOpacity = modelOpacity;
    }

    dust.material.opacity = lerpField(p, 'dust') * 0.55;
    dust.rotation.y = elapsed * 0.045;
    const toneNow = lerpPaper(p);
    dust.material.color.setScalar(0.29 + toneNow * 0.55);

    // DOM layers follow the same progress, but NOT at the same rate. The display
    // type travels several times faster than the object, so lines swim past it —
    // locking them together is what made the earlier build feel flat.
    const spans = BEATS.length - 1;

    const chapterIndex = Math.min(BEATS.length - 1, Math.round(p * spans));
    if (chapterIndex !== lastChapter) {
      const beat = BEATS[chapterIndex];
      const label = beat.kicker?.replace(/^\d+\s—\s/, '') ?? beat.id;
      chapterId.textContent = String(chapterIndex).padStart(2, '0');
      chapterLabel.textContent = label;
      chapter.dataset.beat = beat.id;
      lastChapter = chapterIndex;
    }

    copyEls.forEach((el, i) => {
      const o = copyOpacity(p, i);
      const rel = p * spans - i;
      el.style.opacity = o;
      el.style.transform = `translate3d(0, ${-rel * 64}px, 0)`;
      el.style.pointerEvents = o > 0.6 ? 'auto' : 'none';

      // Per-glyph wipe, only for beats actually on screen.
      const chars = charCache[i];
      if (!chars || (o <= 0.002 && charState[i] <= 0.002)) { charState[i] = o; return; }
      charState[i] = o;
      const n = chars.length;
      for (let c = 0; c < n; c++) {
        const delay = (c / n) * 0.55;
        chars[c].style.opacity = Math.max(0, Math.min(1, (o - delay) / (1 - delay)));
      }
    });

    wordEls.forEach((el, i) => {
      const o = copyOpacity(p, i);
      const rel = p * spans - i;
      // Beats that carry a kicker also carry body copy over the word, so the
      // word ghosts back to stay out of its way. The bookend beats, which have
      // only a title, keep the word at full strength.
      const alpha = BEATS[i].kicker ? 0.16 : 0.85;
      el.style.opacity = o * alpha;
      el.style.transform =
        `translate3d(-50%, calc(-50% + ${-rel * 300}px), 0) scale(${0.96 + o * 0.04})`;
    });

    // Ground tone shifts through the three acts; ink inverts with it.
    // Only write when the quantised value actually changes: --tone feeds nested
    // color-mix() chains consumed by dozens of selectors, so every write
    // invalidates style for the entire document.
    const toneStr = toneNow.toFixed(3);
    if (toneStr !== lastTone) {
      document.documentElement.style.setProperty('--tone', toneStr);
      lastTone = toneStr;
    }

    // Ink flips as a STEP, never a blend — see the note in tokens.css. The two
    // thresholds are hysteresis: flip to light going down past 0.70, back to
    // dark going up past 0.66, so scrubbing across the boundary cannot strobe.
    const wantFlip = inkFlip ? (toneNow > INK_FLIP_UP ? 1 : 0)
                             : (toneNow > INK_FLIP_DOWN ? 1 : 0);
    if (wantFlip !== inkFlip) {
      inkFlip = wantFlip;
      document.documentElement.style.setProperty('--ink-flip', String(inkFlip));
    }

    // Ring gauge draws itself around the object through the worn/wall beats.
    const ringT = Math.max(0, Math.min(1, (p * spans - RING_START) / 2.2));
    const C = 2 * Math.PI * 186;
    ring.style.opacity = ringT > 0.002 && ringT < 0.998 ? 1 : 0;
    ringDark.style.strokeDasharray = `${C * 0.62 * ringT} ${C}`;
    ringPale.style.strokeDasharray = `${C * 0.38 * ringT} ${C}`;
    ringPale.style.strokeDashoffset = `${-C * 0.62 * ringT}`;

    // Tally: counts up to the real mesh total and LANDS on the beat whose spec
    // row states it, then holds through the graphite act. Previously it ramped
    // across three spans, so it read 039 beside a spec saying 117.
    const rel = p * spans;
    const countT = Math.max(0, Math.min(1, (rel - TALLY_START) / (TALLY_LAND - TALLY_START)));
    const tallyOp = Math.min(1, Math.max(0, (rel - TALLY_START) * 2.2))
                  * Math.min(1, Math.max(0, (TALLY_END - rel) * 1.6));
    tally.style.opacity = tallyOp;
    if (tallyOp > 0.01) {
      const n = Math.round(countT * TOTAL_MESHES);
      if (n !== lastTally) { tallyN.textContent = String(n).padStart(3, '0'); lastTally = n; }
    }

    // Leader lines track the real projected position of each component, so they
    // stay attached as the camera moves rather than sitting at fixed offsets.
    const leadT = Math.max(0, Math.min(1, (p * spans - LEADER_START) / 1.9));
    const leadVis = leadT > 0.02 && leadT < 0.98;
    leadersEl.style.opacity = leadVis ? Math.min(1, leadT * 4) * Math.min(1, (1 - leadT) * 4) : 0;
    datumEl.style.opacity = leadersEl.style.opacity;
    if (leadVis) {
      const w = vw;

      // This explode is radial, not the lateral row the technique comes from,
      // so several components land on nearly the same x and their labels print
      // on top of each other. Place them left-to-right and drop any that cannot
      // clear its neighbour — a partial set reads as considered; a pile does not.
      const placed = watch.labelled
        .map((l, i) => {
          l.mesh.getWorldPosition(projected);
          projected.project(camera);
          return { i, x: (projected.x * 0.5 + 0.5) * w,
                   y: (-projected.y * 0.5 + 0.5) * vh, z: projected.z };
        })
        .sort((a, b) => a.x - b.x);

      let lastX = -Infinity;
      let tier = 0;
      const LABEL_MIN_GAP = 96;
      for (const q of placed) {
        const clear = q.x - lastX >= LABEL_MIN_GAP;
        if (clear) { lastX = q.x; tier = 0; } else { tier += 1; }
        // While held, nothing is suppressed — crowded labels step up a tier.
        q.show = clear || exploring;
        q.lift = exploring ? tier * 22 : 0;
      }

      placed.forEach((q) => {
        const { x, y } = q;
        const el = leaderEls[q.i];
        const onScreen = q.z < 1 && x > -40 && x < w + 40 && q.show;
        el.style.opacity = onScreen ? 1 : 0;
        // The rule runs FROM the component DOWN to the bottom edge, where the
        // label sits. Anchoring it at the top instead put the label on the
        // object itself, which is where it was least readable.
        el.style.transform = `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0)`;
        el.firstElementChild.style.height = `${Math.max(0, Math.round(vh - y))}px`;
        el.style.setProperty('--lift', `${q.lift}px`);
      });
      datumEl.style.top = `${Math.round(vh * 0.5)}px`;
    }
    explore.style.opacity = leadersEl.style.opacity;
    explore.toggleAttribute('data-on', leadVis);
    if (!leadVis && exploring) setExploring(false);

    hint.style.opacity = p > 0.035 ? 0 : 1;
    bar.style.transform = `scaleX(${p})`;

    renderer.render(scene, camera);
    rafId = requestAnimationFrame(frame);
  }
  startLoop();

  // The pinned experience hands off to the document: fade the fixed layers out
  // over the last stretch of the track so the index table arrives on clean paper.
  ScrollTrigger.create({
    trigger: '#scroll-track',
    start: 'bottom bottom-=80%',
    end: 'bottom bottom',
    scrub: true,
    onUpdate: (self) => {
      const o = 1 - self.progress;
      stage.style.opacity = o;
      backdrop.style.opacity = o;
      overlay.style.opacity = o;
      document.getElementById('chrome').style.opacity = o;
    },
  });

  let resizeTimer = 0;
  addEventListener('resize', () => {
    vh = innerHeight;
    vw = innerWidth;
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setSize(innerWidth, innerHeight);
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => ScrollTrigger.refresh(), 150);
  });
}

/** Particle shell that blooms during the exploded-view beat. */
function makeDust() {
  const COUNT = 2600;
  const pos = new Float32Array(COUNT * 3);
  for (let i = 0; i < COUNT; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = 1.1 + Math.pow(Math.random(), 0.6) * 3.4;
    const y = (Math.random() - 0.5) * 4.2;
    pos[i * 3] = Math.cos(a) * r;
    pos[i * 3 + 1] = y;
    pos[i * 3 + 2] = Math.sin(a) * r * 0.7;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));

  // A bare PointsMaterial draws hard axis-aligned squares, which read as dead
  // pixels rather than atmosphere. A soft radial sprite fixes that without
  // costing anything — one 64px canvas, generated once.
  const S = 64;
  const cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const g = cv.getContext('2d');
  const grad = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.45, 'rgba(255,255,255,0.55)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, S, S);
  const sprite = new THREE.CanvasTexture(cv);

  return new THREE.Points(geo, new THREE.PointsMaterial({
    color: 0x4a4a4e, size: 0.05, map: sprite, alphaMap: sprite,
    transparent: true, opacity: 0, sizeAttenuation: true,
    depthWrite: false, blending: THREE.NormalBlending,
  }));
}
