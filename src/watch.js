import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// Every part of the watch is built from primitives at runtime. There is no
// .glb, no texture file, no external asset of any kind — the dial face is the
// only "texture" and it is painted into a 2D canvas on boot.
//
// Convention: parts are modelled with +Z as the axial direction (out of the
// dial, toward the camera). Lathe profiles are authored around Y and rotated
// into place, since LatheGeometry revolves around the Y axis.
//
// Each part carries an `explodeDir`: the direction it travels when the assembly
// blows apart. main.js lerps along that vector; nothing here knows about scroll.

const AXIAL = Math.PI / 2; // rotation.x that maps a lathe's +Y onto +Z

const v2 = (x, y) => new THREE.Vector2(x, y);

/* ------------------------------------------------------------------ dial */

let dialTexture = null;

/** Paint the dial face: sunburst, minute track, wordmark. Indices are 3D. */
function makeDialTexture() {
  if (dialTexture) return dialTexture;
  const S = 1024;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  const mid = S / 2;

  const bg = g.createRadialGradient(mid, mid * 0.74, S * 0.04, mid, mid, mid);
  bg.addColorStop(0, '#43434a');
  bg.addColorStop(0.55, '#26262b');
  bg.addColorStop(1, '#101013');
  g.fillStyle = bg;
  g.fillRect(0, 0, S, S);

  // Sunburst brushing — fine radial rays, the way a soleil dial catches light.
  for (let i = 0; i < 900; i++) {
    const a = (i / 900) * Math.PI * 2;
    g.strokeStyle = `rgba(255,255,255,${0.006 + Math.random() * 0.014})`;
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(mid + Math.cos(a) * S * 0.03, mid + Math.sin(a) * S * 0.03);
    g.lineTo(mid + Math.cos(a) * mid, mid + Math.sin(a) * mid);
    g.stroke();
  }

  // Minute track.
  for (let i = 0; i < 60; i++) {
    const a = (i / 60) * Math.PI * 2 - Math.PI / 2;
    const long = i % 5 === 0;
    const r1 = mid * 0.925;
    const r2 = mid * (long ? 0.878 : 0.898);
    g.strokeStyle = long ? 'rgba(236,236,240,0.80)' : 'rgba(236,236,240,0.30)';
    g.lineWidth = long ? 6 : 2.5;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(mid + Math.cos(a) * r1, mid + Math.sin(a) * r1);
    g.lineTo(mid + Math.cos(a) * r2, mid + Math.sin(a) * r2);
    g.stroke();
  }

  g.textAlign = 'center';
  g.fillStyle = 'rgba(240,240,244,0.90)';
  g.font = '600 38px "Cormorant Garamond", Georgia, serif';
  g.letterSpacing = '6px';
  g.fillText('CALIBER', mid, mid * 0.60);
  g.font = '400 21px "JetBrains Mono", monospace';
  g.fillStyle = 'rgba(240,240,244,0.42)';
  g.fillText('AUTOMATIC', mid, mid * 1.42);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  dialTexture = tex;
  return tex;
}

/* ----------------------------------------------------------------- hands */

/** A faceted, tapering hand with a counterweight — not a rectangle. */
function makeHand(length, width, tailLength) {
  const s = new THREE.Shape();
  s.moveTo(-width * 0.5, -tailLength);
  s.lineTo(width * 0.5, -tailLength);
  s.lineTo(width * 0.5, length * 0.06);
  s.lineTo(width * 0.30, length * 0.88);
  s.lineTo(0, length);
  s.lineTo(-width * 0.30, length * 0.88);
  s.lineTo(-width * 0.5, length * 0.06);
  s.closePath();
  const geo = new THREE.ExtrudeGeometry(s, {
    depth: 0.014, bevelEnabled: true, bevelThickness: 0.004,
    bevelSize: 0.004, bevelSegments: 2,
  });
  geo.center();
  geo.translate(0, length * 0.5 - tailLength * 0.5, 0);
  return geo;
}

/* -------------------------------------------------------------- bracelet */

// Row geometries are identical for both bracelet halves and for every watch
// built on the page (main + four finale = five). Caching them turns 450 link
// constructions into 15 merged rows.
//
// These are SHARED. Anything that disposes a watch must skip them — see the
// `shared` flag and the teardown in cards.js.
const rowGeoCache = new Map();

function rowGeometry(r, rows, PITCH, GAP) {
  if (rowGeoCache.has(r)) return rowGeoCache.get(r);

  const taper = 1 - (r / (rows - 1)) * 0.28;
  const centreW = 0.40 * taper;
  const outerW = 0.225 * taper;
  const h = PITCH - GAP;
  const link = (w, d) => new RoundedBoxGeometry(w, h, d, 2, 0.018);

  const centre = link(centreW, 0.105);
  const outers = [1, -1].map((sx) => {
    const g = link(outerW, 0.086);
    g.translate(sx * ((centreW + outerW) * 0.5 - 0.004), PITCH * 0.5, -0.006);
    return g;
  });

  // Merge the two outers first (one material), then merge with the centre
  // USING GROUPS so the row still renders two-tone from one mesh.
  const outerMerged = mergeGeometries(outers);
  outers.forEach((g) => g.dispose());
  const merged = mergeGeometries([centre, outerMerged], true);
  centre.dispose();
  outerMerged.dispose();

  merged.userData.shared = true;
  rowGeoCache.set(r, merged);
  return merged;
}

/**
 * A bracelet half.
 *
 * Rows are placed along a real circular arc rather than on a straight line that
 * is then rotated — rotating a row that sits on a straight line pivots it out of
 * contact with its neighbour and opens a wedge-shaped gap, which is what made
 * the band read as a stack of floating tiles. On an arc the rows stay tangent,
 * so the pitch stays constant all the way down.
 *
 * Outer links are offset half a pitch so they bridge the centre links, the way
 * a real three-piece bracelet interlocks.
 */
function makeBracelet(dir, mats, parts) {
  const group = new THREE.Group();
  const ROWS = 15;
  const PITCH = 0.185;
  const CURL = 3.2;        // radius of the arc the band falls along
  // NEGATIVE on purpose. A rigid box on a curve needs more height at its OUTER
  // face than the pitch, because the outer radius sweeps a longer arc:
  //   outer arc = PITCH * (1 + depth / (2 * curl))
  // At the tightest curl (1.12) that is 0.194 against a pitch of 0.185, so a
  // link cut to the pitch leaves a ~0.019 wedge between every pair — the gaps
  // that made the band read as falling blocks. Overshooting the pitch closes
  // the outer face; the resulting overlap is at the inner face, which is hidden.
  const GAP = -0.009;

  for (let r = 0; r < ROWS; r++) {
    const t = r / (ROWS - 1);
    const theta = (r * PITCH) / CURL;

    // One merged mesh per row instead of three separate link meshes. The two
    // outer links share a material, so they merge into a single group; the
    // centre link keeps its own. Two draw calls per row rather than three, and
    // 30 meshes across both bracelets rather than 90.
    const row = new THREE.Mesh(rowGeometry(r, ROWS, PITCH, GAP), [mats.polished, mats.brushed]);
    row.castShadow = true;
    row.position.y = dir * (0.94 + CURL * Math.sin(theta));
    row.position.z = -CURL * (1 - Math.cos(theta));
    row.rotation.x = dir * theta;

    group.add(row);
    parts.push({
      mesh: row,
      explodeDir: new THREE.Vector3(0, dir * (0.5 + r * 0.20), -0.3 - t * 0.5),
      bracelet: { r, dir, pitch: PITCH },
    });
  }
  return group;
}

export const BRACELET_OPEN = 3.2;   // hangs straight down, as worn off-wrist
export const BRACELET_SHUT = 1.12;  // curled into a closed loop

/**
 * Re-lay the bracelet along an arc of the given radius.
 *
 * Writes into each row's `home` rather than its position, so the exploded-view
 * offset in the render loop still composes on top instead of fighting it.
 */
export function setBraceletCurl(watch, curl) {
  for (const part of watch.parts) {
    if (!part.bracelet) continue;
    const { r, dir, pitch } = part.bracelet;
    const theta = (r * pitch) / curl;
    part.home.set(
      0,
      dir * (0.94 + curl * Math.sin(theta)),
      -curl * (1 - Math.cos(theta)),
    );
    part.mesh.rotation.x = dir * theta;
  }
}

/* ----------------------------------------------------------------- build */

/**
 * Build the watch.
 * Returns the root group, the flat part list (for exploding), the hand meshes,
 * and the materials so the caller can crossfade between them.
 */
export const FINISHES = {
  steel:    { steel: 0xc2c2c8, brushed: 0xa6a6ad, rough: 0.19, label: 'Brushed steel' },
  graphite: { steel: 0x35353a, brushed: 0x27272b, rough: 0.30, label: 'Graphite' },
  gold:     { steel: 0xc9a24a, brushed: 0xa8863b, rough: 0.22, label: 'Yellow gold' },
  rose:     { steel: 0xc08871, brushed: 0xa06f5c, rough: 0.24, label: 'Rose gold' },
};

export function buildWatch(finish = FINISHES.steel) {
  const root = new THREE.Group();
  const parts = [];

  // `steel` is the one main.js recolours to swap the whole watch to graphite,
  // so every structural part shares it.
  const steel = new THREE.MeshStandardMaterial({ color: finish.steel, metalness: 1, roughness: finish.rough });
  const brushed = new THREE.MeshStandardMaterial({ color: finish.brushed, metalness: 1, roughness: finish.rough + 0.25 });
  const graphite = new THREE.MeshStandardMaterial({ color: 0x2a2a2c, metalness: 0.95, roughness: 0.34 });

  const add = (mesh, explodeDir) => {
    mesh.castShadow = true;
    root.add(mesh);
    parts.push({ mesh, explodeDir });
    return mesh;
  };

  // --- Case: a lathed profile, so the flank, bevel and caseback are one solid.
  const caseProfile = [
    v2(0.00, -0.20), v2(0.46, -0.205), v2(0.74, -0.185), v2(0.88, -0.135),
    v2(0.97, -0.075), v2(1.005, 0.005), v2(1.00, 0.075),
    v2(0.965, 0.115), v2(0.90, 0.140), v2(0.855, 0.145),
  ];
  const caseBody = new THREE.Mesh(new THREE.LatheGeometry(caseProfile, 128), steel);
  caseBody.rotation.x = AXIAL;
  caseBody.receiveShadow = true;
  add(caseBody, new THREE.Vector3(0, 0, -1.0));

  // --- Bezel: a separate lathed ring with a polished outer bevel.
  const bezelProfile = [
    v2(0.845, 0.145), v2(0.855, 0.185), v2(0.905, 0.208), v2(0.975, 0.196),
    v2(1.015, 0.150), v2(1.010, 0.120), v2(0.940, 0.132), v2(0.845, 0.145),
  ];
  // NOTE: `steel` is shared with the case, crown, lugs and every bracelet centre
  // link so main.js can recolour the watch in a single write. Never mutate it
  // here — setting .side made all of those double-sided, which doubled fragment
  // work and put backfaces in the shadow map. The profile is a closed loop, so
  // front faces are enough.
  const bezel = new THREE.Mesh(new THREE.LatheGeometry(bezelProfile, 128), steel);
  bezel.rotation.x = AXIAL;
  add(bezel, new THREE.Vector3(0, 0.55, 1.5));

  // --- Crystal: shallow box dome, standing slightly proud of the bezel.
  const crystalProfile = [];
  for (let i = 0; i <= 14; i++) {
    const t = i / 14;
    crystalProfile.push(v2(t * 0.86, 0.205 - Math.pow(t, 2.4) * 0.045));
  }
  const crystal = new THREE.Mesh(
    new THREE.LatheGeometry(crystalProfile, 96),
    new THREE.MeshPhysicalMaterial({
      // Deliberately NOT transmission: the transmission pass does not composite
      // the dial behind it, which hides the whole face. Thin transparent glass
      // with a clearcoat sheen reads the same and stays cheap.
      color: 0xffffff, metalness: 0, roughness: 0.02,
      transparent: true, opacity: 0.11,
      clearcoat: 1, clearcoatRoughness: 0.02, depthWrite: false,
    }),
  );
  crystal.rotation.x = AXIAL;
  add(crystal, new THREE.Vector3(0.25, 1.05, 1.9));
  crystal.castShadow = false;   // must follow add(), which sets it true

  // --- Dial.
  const dial = new THREE.Mesh(
    new THREE.CircleGeometry(0.845, 128),
    new THREE.MeshStandardMaterial({ map: makeDialTexture(), metalness: 0.45, roughness: 0.48 }),
  );
  dial.position.z = 0.02;
  dial.receiveShadow = true;
  add(dial, new THREE.Vector3(-0.2, 0.7, 1.1));

  // --- Applied indices: real geometry, so they catch light and cast shadows.
  const indexMat = new THREE.MeshStandardMaterial({ color: 0xf2f2f5, metalness: 1, roughness: 0.14 });
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const wide = i % 3 === 0;
    const idx = new THREE.Mesh(
      new THREE.BoxGeometry(wide ? 0.075 : 0.040, wide ? 0.175 : 0.150, 0.022),
      indexMat,
    );
    idx.position.set(Math.sin(a) * 0.665, Math.cos(a) * 0.665, 0.035);
    idx.rotation.z = -a;
    idx.castShadow = true;
    add(idx, new THREE.Vector3(Math.sin(a) * 1.5, Math.cos(a) * 1.5, 0.9));
  }

  // --- Hands.
  const handMat = new THREE.MeshStandardMaterial({ color: 0xf4f4f7, metalness: 1, roughness: 0.10 });
  const hourHand = add(new THREE.Mesh(makeHand(0.44, 0.070, 0.10), handMat), new THREE.Vector3(-0.5, 1.3, 1.4));
  hourHand.position.z = 0.055;
  const minuteHand = add(new THREE.Mesh(makeHand(0.66, 0.050, 0.12), handMat), new THREE.Vector3(0.5, 1.3, 1.4));
  minuteHand.position.z = 0.075;
  const secondHand = add(new THREE.Mesh(makeHand(0.72, 0.016, 0.19), handMat), new THREE.Vector3(0, 1.5, 1.5));
  secondHand.position.z = 0.092;

  const pinion = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.05, 24), handMat);
  pinion.rotation.x = AXIAL;
  pinion.position.z = 0.10;
  add(pinion, new THREE.Vector3(0, 0.4, 1.6));

  // --- Crown, set into the case flank.
  const crownProfile = [
    v2(0, 0), v2(0.085, 0.002), v2(0.098, 0.022), v2(0.098, 0.10),
    v2(0.082, 0.122), v2(0, 0.124),
  ];
  const crown = new THREE.Mesh(new THREE.LatheGeometry(crownProfile, 32), steel);
  crown.rotation.z = -Math.PI / 2;
  crown.position.set(1.00, 0, -0.03);
  add(crown, new THREE.Vector3(1.9, 0.2, 0));

  // --- Mainplate and rotor, behind the dial.
  const mainplate = new THREE.Mesh(new THREE.CylinderGeometry(0.78, 0.78, 0.07, 96), graphite);
  mainplate.rotation.x = AXIAL;
  mainplate.position.z = -0.09;
  add(mainplate, new THREE.Vector3(0.1, -0.9, -1.3));

  const rotor = new THREE.Mesh(
    new THREE.CircleGeometry(0.63, 64, 0, Math.PI),
    new THREE.MeshStandardMaterial({ color: 0x8e8e95, metalness: 1, roughness: 0.26, side: THREE.DoubleSide }),
  );
  rotor.position.z = -0.135;
  add(rotor, new THREE.Vector3(-0.6, -1.5, -1.5));

  // --- Lugs, at 12 and 6, tucked under the bracelet.
  for (const [sx, sy] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
    const lug = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.30, 0.24), steel);
    lug.position.set(sx * 0.40, sy * 0.92, -0.04);
    lug.rotation.z = sx * sy * 0.09;
    add(lug, new THREE.Vector3(sx * 0.7, sy * 1.4, -0.2));
  }

  root.add(makeBracelet(1, { polished: steel, brushed }, parts));
  root.add(makeBracelet(-1, { polished: steel, brushed }, parts));

  let meshCount = 0;
  root.traverse((o) => { if (o.isMesh) meshCount++; });
  // Cache each part's assembled position so exploding is a pure offset.
  for (const p of parts) p.home = p.mesh.position.clone();

  // Named handles for the leader lines. Kept explicit rather than guessing by
  // index, so reordering the build cannot silently relabel a component.
  const labelled = [
    { name: 'Bezel', mesh: bezel },
    { name: 'Crystal', mesh: crystal },
    { name: 'Dial', mesh: dial },
    { name: 'Mainplate', mesh: mainplate },
    { name: 'Rotor', mesh: rotor },
    { name: 'Crown', mesh: crown },
  ];

  return { root, parts, meshCount, labelled, hands: { hourHand, minuteHand, secondHand }, steel, brushed, graphite, rotor };
}
