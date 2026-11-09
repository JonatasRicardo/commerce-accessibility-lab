import test from 'node:test';
import assert from 'node:assert/strict';
import { inspectArchive } from '../src/archive.mjs';

test('archive uses effective timestamp after redirect instead of requested date', async () => {
  const fetchText = async url => url.startsWith('https://archive.org/') ? {
    status: 200, text: JSON.stringify({ archived_snapshots: { closest: { available: true, timestamp: '20250101175920', url: 'http://web.archive.org/web/20250101175920/https://example.org/' } } }),
  } : { status: 200, url: 'https://web.archive.org/web/20241225010439id_/https://example.org/', text: '<html><title>Loja</title><body><img><img alt=""></body></html>' };
  const { archive } = await inspectArchive('https://example.org/', '20250101', { fetchText });
  assert.equal(archive.effectiveTimestamp, '20241225010439');
  assert.equal(archive.static.imagesWithoutAlt, 1);
  assert.equal(archive.static.images, 2);
});
test('missing archive never becomes a zero-error historical observation', async () => {
  const r = await inspectArchive('https://example.org/', '20240101', { fetchText: async () => ({ status: 200, text: '{"archived_snapshots":{}}' }) });
  assert.ok(r.archive.error); assert.equal(r.archive.static, undefined);
});
test('Wayback rate limiting is preserved as unavailable evidence without retrying', async () => {
  let requests = 0;
  const r = await inspectArchive('https://example.org/', '20240101', { fetchText: async () => { requests++; return { status: 429, text: 'Too many requests' }; } });
  assert.equal(requests, 1); assert.equal(r.archive.apiStatus, 429);
  assert.equal(r.archive.static, undefined); assert.ok(r.archive.error.includes('429'));
});
