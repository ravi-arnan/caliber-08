import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { buildWatch, setBraceletCurl, BRACELET_OPEN, BRACELET_SHUT, FINISHES } from './watch.js';

// The drifting cards in the type-wall section.
//
// The reference uses product photography here. This build has no assets, so the
// cards are rendered from the same geometry the rest of the page uses — four
// stills shot at different framings against a dark ground, baked to data URIs
// once and then never touched again.
//
// Rendering happens on an idle callback well after first paint: it costs one
// extra watch and four draw calls, and nothing on screen depends on it.

const VIEWS = [
  { w: 426, h: 638, pos: [0.1, 0.2, 3.2], target: [0, 0.05, 0], curl: 0 },   // dial, close
  { w: 426, h: 680, pos: [2.6, 0.9, 2.3], target: [0.2, 0, 0], curl: 0 },    // case 3/4
  { w: 660, h: 930, pos: [0, -0.4, 5.6], target: [0, -0.3, 0], curl: 1 },    // worn loop, hero
  { w: 426, h: 530, pos: [0, -2.0, 1.7], target: [0, -1.8, 0], curl: 0 },    // bracelet macro
];

/**
 * Bake the stills one view at a time.
 *
 * Doing all four in a single call produced one 5-6 second unyieldable task
 * (toDataURL alone was ~4s, most of it first-call shader warm-up). requestIdle-
 * Callback cannot help a callback that never returns, so the work is split:
 * each `next()` renders exactly one view and the caller re-schedules.
 */
export function createCardBaker() {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(1);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.35;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x191a1d);   // was near-black; contents were invisible

  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  scene.environment = pmrem.fromScene(room, 0.04).texture;
  room.dispose();

  scene.add(new THREE.AmbientLight(0xffffff, 0.62));
  const key = new THREE.DirectionalLight(0xffffff, 2.1);
  key.position.set(3, 5, 6);
  scene.add(key);

  const watch = buildWatch(FINISHES.graphite);
  scene.add(watch.root);

  let i = 0;

  const bakeOne = () => {
    const v = VIEWS[i];
    setBraceletCurl(watch, v.curl ? BRACELET_SHUT : BRACELET_OPEN);
    for (const part of watch.parts) {
      if (part.bracelet) part.mesh.position.copy(part.home);
    }
    renderer.setSize(v.w, v.h, false);
    const camera = new THREE.PerspectiveCamera(38, v.w / v.h, 0.1, 100);
    camera.position.set(...v.pos);
    camera.lookAt(...v.target);
    renderer.render(scene, camera);
    return renderer.domElement.toDataURL('image/jpeg', 0.82);
  };

  const teardown = () => {
    watch.root.traverse((o) => {
      // Skip shared geometry: the merged bracelet rows are cached at module
      // level and used by the main scene and the finale too.
      if (!o.geometry?.userData?.shared) o.geometry?.dispose();
      if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose());
      else o.material?.dispose();
    });
    pmrem.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
  };

  return {
    get done() { return i >= VIEWS.length; },
    get index() { return i; },
    /** Bakes exactly one still and returns its data URI. Disposes after the last. */
    next() {
      const url = bakeOne();
      i += 1;
      if (i >= VIEWS.length) teardown();
      return url;
    },
    abort: teardown,
  };
}

// Where each card sits and how fast it climbs. Pure vertical travel — no drift,
// no rotation, no scale. The differing rates are the whole parallax.
// Two widths, not four, and all of them clear of the left copy column so a card
// can never print over the headline.
// Columns are spread so no two share one, all of them clear the left copy
// column (which ends at ~29vw), and none sits under the top-right hint.
export const CARD_LAYOUT = [
  { left: '38%', w: 213, rate: 2.45 },
  { left: '66%', w: 213, rate: 1.95 },
  { left: '50%', w: 330, rate: 1.40 },
  { left: '32%', w: 213, rate: 1.00 },
];
