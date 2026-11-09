import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { inspectPractices, inspectCiRun } from '../src/practices.mjs';

test('inspector distinguishes imports from comments and never executes repository configuration', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'practices-'));
  try {
    await writeFile(path.join(root, 'package.json'), JSON.stringify({ dependencies: { '@radix-ui/react-dialog': '1.3.1' } }));
    await writeFile(path.join(root, 'app.tsx'), '// import * as Dialog from "@radix-ui/react-dialog";\nexport const X = () => <button>OK</button>;');
    await writeFile(path.join(root, 'eslint.config.mjs'), 'throw new Error("MUST NOT EXECUTE");');
    let r = await inspectPractices(root);
    assert.equal(r.practices.rows[0].status, 'indícios parciais');
    assert.equal(r.practices.workingTreeDirty, null);
    await writeFile(path.join(root, 'app.tsx'), 'import * as Dialog from "@radix-ui/react-dialog"; export const X = Dialog.Root;');
    await mkdir(path.join(root, '.github/workflows'), { recursive: true });
    await writeFile(path.join(root, '.github/workflows/ci.yml'), 'jobs:\n  test:\n    steps:\n      - run: node bin/commerce-audit.mjs gate input.json || true\n');
    r = await inspectPractices(root);
    assert.equal(r.practices.rows[0].status, 'configuração observada');
    assert.equal(r.practices.rows[3].status, 'indícios parciais');
    assert.ok(r.practices.rows[3].evidence[0].detail.includes('tolerância'));
  } finally { await rm(root, { recursive: true }); }
});
test('public CI evidence binds clean code to the exact commit and keeps artifact limits', async () => {
  const fetchText = async url => ({ status: 200, text: JSON.stringify(url.includes('/jobs?') ? { jobs: [{ name: 'checks', conclusion: 'success', steps: [] }], total_count: 1 } : url.includes('/artifacts?') ? { artifacts: [] } : { head_sha: 'abc', status: 'completed', conclusion: 'success', html_url: 'https://github.com/a/b/actions/runs/1' }) });
  const url = 'https://github.com/a/b/actions/runs/1';
  assert.equal((await inspectCiRun(url, { expectedCommit: 'abc', fetchText })).matchesCommit, true);
  assert.match((await inspectCiRun(url, { expectedCommit: 'abc', dirty: true, fetchText })).interpretation, /não valida/);
  assert.match((await inspectCiRun(url, { expectedCommit: 'xyz', fetchText })).interpretation, /não valida/);
  await assert.rejects(inspectCiRun('https://example.org/not-a-run'), /URL pública/);
});
