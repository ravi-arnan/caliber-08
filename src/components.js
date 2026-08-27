// The component index, mirroring what watch.js actually builds.
//
// These are counts of real THREE.Mesh instances. A bracelet row used to be a
// THREE.Group of three link meshes (90 meshes for 30 rows); the three are now
// merged into one mesh carrying two material groups, so a row is one mesh and
// `parts.length` and the mesh count agree at 57 by construction rather than by
// coincidence.
//
// test-meshes.mjs boots the real page and asserts TOTAL_MESHES equals the
// mesh count the live scene reports, so this table cannot drift from geometry.

export const COMPONENTS = [
  { n: '01', name: 'Case',            group: 'Structure', meshes: 1 },
  { n: '02', name: 'Bezel',           group: 'Structure', meshes: 1 },
  { n: '03', name: 'Crystal',         group: 'Structure', meshes: 1 },
  { n: '04', name: 'Dial',            group: 'Face',      meshes: 1 },
  { n: '05', name: 'Applied indices', group: 'Face',      meshes: 12 },
  { n: '06', name: 'Hour hand',       group: 'Face',      meshes: 1 },
  { n: '07', name: 'Minute hand',     group: 'Face',      meshes: 1 },
  { n: '08', name: 'Seconds hand',    group: 'Face',      meshes: 1 },
  { n: '09', name: 'Pinion',          group: 'Face',      meshes: 1 },
  { n: '10', name: 'Crown',           group: 'Structure', meshes: 1 },
  { n: '11', name: 'Mainplate',       group: 'Movement',  meshes: 1 },
  { n: '12', name: 'Rotor',           group: 'Movement',  meshes: 1 },
  { n: '13', name: 'Lugs',            group: 'Structure', meshes: 4 },
  { n: '14', name: 'Bracelet rows',   group: 'Band',      meshes: 30 },  // one merged mesh each
];

export const TOTAL_MESHES = COMPONENTS.reduce((a, c) => a + c.meshes, 0);

/** Entries in watch.js's `parts` array — a mix of meshes and groups. */
export const TOTAL_PARTS = 57;
