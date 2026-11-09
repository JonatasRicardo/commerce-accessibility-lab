import test from 'node:test';
import assert from 'node:assert/strict';
import { pairPerspectives } from '../src/perspectives.mjs';
import { renderHtml } from '../src/report.mjs';
test('before/after pairing preserves missing evidence rather than fabricating old views', () => {
  const a = { pages: [{ id: 'a', url: 'https://example.org/', perspectives: { axRows: [] } }] };
  const b = { pages: [{ id: 'b', url: 'https://example.org/' }, { id: 'new', url: 'https://example.org/other' }] };
  const pairs = pairPerspectives(a, b);
  assert.ok(pairs[0].before); assert.equal(pairs[0].after, null); assert.equal(pairs[1].before, null);
});
test('perspective report escapes observed DOM text and only embeds PNG data images', () => {
  const html = renderHtml({ visualComparisons: [{ title: 'X', before: { screenshotDataUrl: 'javascript:alert(1)', axRows: [{ role: 'button', name: '<script>bad</script>' }], dom: { text: '<iframe src=x>', jsonLd: [] } } }] });
  assert.ok(html.includes('&lt;iframe')); assert.ok(!html.includes('<script>bad'));
  assert.ok(!html.includes('src="javascript:')); assert.ok(html.includes('Não capturado nesta versão'));
});
