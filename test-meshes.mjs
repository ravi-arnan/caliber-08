// The real geometry check.
//
// test-beats.mjs can only prove the component table is self-consistent. This
// boots the actual page and compares the table's total against the mesh count
// the live scene reports, which is the assertion that was missing when the page
// shipped "57 meshes" while the scene built 117.
//
// Run: node test-meshes.mjs   (requires the dev server on :5173)

import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { TOTAL_MESHES, TOTAL_PARTS, COMPONENTS } from './src/components.js';

const URL = process.env.URL ?? 'http://localhost:5173/';
const CHROME = process.env.CHROME ?? '/etc/profiles/per-user/ravi/bin/google-chrome';

const browser = await chromium.launch({
  executablePath: CHROME,
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, reducedMotion: 'no-preference' });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));

try {
  try {
    await page.goto(URL, { waitUntil: 'networkidle', timeout: 60000 });
  } catch (err) {
    // The most common failure here is simply that nobody started the server.
    // A raw ERR_CONNECTION_REFUSED stack reads like a code defect; it isn't.
    if (String(err).includes('ERR_CONNECTION_REFUSED')) {
      console.error(`\ncannot reach ${URL} — is the dev server running?\n`
        + '  npm run dev      (then re-run this in another shell)\n'
        + '  or point it elsewhere:  URL=https://… node test-meshes.mjs\n');
      process.exit(1);
    }
    throw err;
  }
  await page.waitForFunction(() => window.__scene !== undefined, { timeout: 20000 });

  const live = await page.evaluate(() => ({
    // Named hook, set once from the MAIN scene. The old global was written by
    // every buildWatch call (main + 4 finale + 1 card bake), so it reported
    // whichever finished last and matched only by coincidence.
    meshes: window.__scene.meshes,
    parts: window.__scene.parts,
    tableTotal: [...document.querySelectorAll('.index-row:not(.index-total) .index-meshes')]
      .reduce((a, el) => a + parseInt(el.textContent, 10), 0),
    tableFooter: document.querySelector('.index-total .index-meshes')?.textContent.trim(),
    rows: document.querySelectorAll('.index-row:not(.index-total)').length,
  }));

  assert.equal(live.meshes, TOTAL_MESHES,
    `page renders ${live.meshes} meshes but the table claims ${TOTAL_MESHES}`);
  assert.equal(live.parts, TOTAL_PARTS,
    `scene reports ${live.parts} parts, components.js says ${TOTAL_PARTS}`);
  assert.equal(live.tableTotal, TOTAL_MESHES,
    `rendered table rows sum to ${live.tableTotal}, expected ${TOTAL_MESHES}`);
  assert.equal(live.rows, COMPONENTS.length, 'rendered row count != COMPONENTS.length');
  assert.equal(live.tableFooter, `${TOTAL_MESHES} meshes`, 'footer total disagrees with the rows');
  assert.equal(errors.length, 0, `page errors: ${errors.join(' | ')}`);

  console.log(`ok — live scene builds ${live.meshes} meshes / ${live.parts} parts`);
  console.log(`ok — index table rows sum to ${live.tableTotal}, footer reads "${live.tableFooter}"`);
} finally {
  await browser.close();
}
