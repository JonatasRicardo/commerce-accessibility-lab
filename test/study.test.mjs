import test from 'node:test';
import assert from 'node:assert/strict';
import { cp, mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { replayStudy, STUDY_DIR } from '../src/study.mjs';

test('frozen evidence reconstructs all six published audit rows', async () => {
  const report = await replayStudy();
  assert.equal(report.verification.passed, true);
  assert.deepEqual(report.verification.recomputed.map(p => p.occurrences), [1, 3, 0, 4, 75, 39]);
  assert.equal(report.history.length, 7);
  assert.equal(report.pages.find(p => p.id === 'pelagic-product').rendered.products[0].type, 'ProductGroup');
});
test('changed evidence fails integrity even if displayed totals do not change', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'commerce-study-'));
  try {
    await cp(STUDY_DIR, dir, { recursive: true });
    const file = path.join(dir, 'baseline/audit-results.json');
    await writeFile(file, (await readFile(file, 'utf8')) + ' ');
    assert.equal((await replayStudy(dir)).verification.passed, false);
  } finally { await rm(dir, { recursive: true }); }
});
