import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { buildWatch, setBraceletCurl, BRACELET_SHUT, FINISHES } from './watch.js';

// The closing lineup: the same geometry cast in four metals, side by side.
//
// This gets its own renderer rather than borrowing the main one. The main scene
// is a fixed, full-page canvas driven by scroll; the finale is a self-contained
// block far down the document. Sharing one renderer would mean juggling two
// scenes and two cameras against a single scroll timeline for no real gain.
//
// It only renders while on screen — four full watches is ~468 meshes, and there
// is no reason to pay for that while the user is still up at the hero.

const ORDER = ['steel', 'graphite', 'gold', 'rose'];
const SPACING = 2.65;
const HAND_OFFSETS = [1.7, 3.1, 0.6, 2.35];

export function initFinale({ canvas, onSelect }) {
  let renderer = null;
  let scene = null;
  let camera = null;

  /** Context + environment, created on first intersection along with the meshes. */
  function ensureScene() {
    if (renderer) return;
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.95;
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);

    const pmrem = new THREE.PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    scene.environment = pmrem.fromScene(room, 0.04).texture;
    room.dispose();
    pmrem.dispose();

    scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    const key = new THREE.DirectionalLight(0xffffff, 1.7);
    key.position.set(3, 5, 7);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xffffff, 0.9);
    rim.position.set(-5, -2, -4);
    scene.add(rim);
  }

  // Built lazily on first intersection. Constructing four watches (468 meshes)
  // at page load cost a 2.3s task for something 35,000px down the document.
  let watches = null;

  const buildLineup = () => ORDER.map((keyName, i) => {
    const w = buildWatch(FINISHES[keyName]);

    // Closed loops, seen edge-on, dial frontal — each reads as a tall oval
    // standing upright rather than a watch with its band hanging down.
    setBraceletCurl(w, BRACELET_SHUT);
    for (const part of w.parts) {
      if (part.bracelet) part.mesh.position.copy(part.home);
    }

    w.root.position.x = (i - (ORDER.length - 1) / 2) * SPACING;
    w.root.rotation.set(0.02, -0.06, 0);
    w.root.scale.setScalar(0.92);
    scene.add(w.root);
    return { key: keyName, ...FINISHES[keyName], group: w.root, hands: w.hands };
  });

  let selected = 0;
  let visible = false;
  let raf = 0;

  function resize() {
    if (!renderer) return;
    const r = canvas.getBoundingClientRect();
    if (!r.width || !r.height) return;
    renderer.setSize(r.width, r.height, false);
    camera.aspect = r.width / r.height;
    // Pull back far enough that all four fit however wide the viewport is.
    camera.position.set(0, -0.15, camera.aspect < 1.1 ? 20 : 11.4);
    camera.lookAt(0, -0.15, 0);
    camera.updateProjectionMatrix();
  }

  const clock = new THREE.Clock();
  function frame() {
    if (!visible || !watches) { raf = 0; return; }
    const t = clock.getElapsedTime();
    watches.forEach((w, i) => {
      const on = i === selected;
      const target = on ? 1.04 : 0.9;
      w.group.scale.x += (target - w.group.scale.x) * 0.08;
      w.group.scale.y = w.group.scale.z = w.group.scale.x;
      w.group.position.y += ((on ? 0.14 : 0) - w.group.position.y) * 0.08;
      w.group.rotation.y = -0.06 + Math.sin(t * 0.3 + i * 0.7) * 0.07 + (on ? 0.10 : 0);
      // Different time on each watch — four identical poses read as copy-paste.
      w.hands.hourHand.rotation.z = -HAND_OFFSETS[i] * 0.52;
      w.hands.minuteHand.rotation.z = -HAND_OFFSETS[i] * 6.2;
      w.hands.secondHand.rotation.z = -HAND_OFFSETS[i] * 24 - t * 0.6;
    });
    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  }

  // stop()/start() actually parks elapsedTime; getDelta() advances it, so the
  // idle animation used to jump on re-entry after scrolling away.
  function start() { if (!raf) { clock.start(); raf = requestAnimationFrame(frame); } }

  new IntersectionObserver((entries) => {
    visible = entries[0].isIntersecting;
    if (visible) {
      if (!watches) { ensureScene(); watches = buildLineup(); api.select(selected); }
      resize();
      start();
    } else {
      clock.stop();
    }
  }, { rootMargin: '200px' }).observe(canvas);

  addEventListener('resize', resize);

  const api = {
    select(i) {
      const n = watches ? watches.length : ORDER.length;
      selected = ((i % n) + n) % n;
      if (watches) onSelect?.(watches[selected], selected);
      start();
    },
    next() { api.select(selected + 1); },
    get current() { return watches ? watches[selected] : null; },
    get watches() { return watches ?? ORDER.map((k) => ({ key: k, ...FINISHES[k] })); },
    get index() { return selected; },
  };
  return api;
}
