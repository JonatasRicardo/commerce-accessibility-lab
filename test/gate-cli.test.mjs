import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
test('CI command returns failure for a real negative result and success for a complete clean result', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'gate-cli-'));
  try {
    for (const bad of [false, true]) {
      const input = path.join(root, bad ? 'bad.json' : 'good.json'), out = path.join(root, bad ? 'bad' : 'good');
      await writeFile(input, JSON.stringify({ kind: 'live-audit', pages: [{ id: 'p', status: 'ok', collectedAt: new Date().toISOString(), axeVersion: '4.10.3', accessibility: { violations: bad ? [{ id: 'button-name', impact: 'critical', nodeCount: 1 }] : [], incomplete: [] } }] }));
      const r = spawnSync(process.execPath, ['bin/commerce-audit.mjs', 'gate', input, '--out', out], { encoding: 'utf8' });
      assert.equal(r.status, bad ? 2 : 0, r.stderr);
      assert.equal(JSON.parse(await readFile(path.join(out, 'report.json'), 'utf8')).qualityGate.passed, !bad);
    }
  } finally { await rm(root, { recursive: true }); }
});
