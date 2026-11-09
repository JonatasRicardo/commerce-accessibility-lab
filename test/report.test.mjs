import test from 'node:test';
import assert from 'node:assert/strict';
import { renderHtml } from '../src/report.mjs';
import { comparisonRows, baselineDiff } from '../src/compare.mjs';
import { deriveFindings } from '../src/findings.mjs';
import { validateUrl } from '../src/core.mjs';

test('blocked pages have no zero-alert success metric', () => {
  const p = { id: 'blocked', status: 'blocked', requestedUrl: 'https://example.org/', error: 'HTTP 403' };
  assert.equal(comparisonRows([p])[0].rules, null);
  assert.equal(deriveFindings(p)[0].id, 'collection-incomplete');
});
test('site-controlled text and links cannot inject executable markup into the report', () => {
  const html = renderHtml({ scope: '</p><script>alert(1)</script>', pages: [{ id: '<img src=x onerror=alert(1)>', status: 'blocked', requestedUrl: 'javascript:alert(1)', error: '<svg onload=alert(1)>' }] });
  assert.ok(!html.includes('<script>'));
  assert.ok(!html.includes('href="javascript:'));
  assert.ok(html.includes('&lt;svg onload='));
});
test('comparison preserves browser and content changes instead of implying causal improvement', () => {
  const p = { id: 'p', url: 'https://example.org/', status: 'ok', sourceSha256: 'a', browserVersion: '151', axeVersion: '4.10.3', config: { waitMs: 3500 }, accessibility: { violations: [{ nodeCount: 3 }] } };
  const q = { ...p, sourceSha256: 'b', browserVersion: '152', accessibility: { violations: [] } };
  const [diff] = baselineDiff([q], [p]);
  assert.equal(diff.sameSourceHash, false); assert.equal(diff.sameBrowserVersion, false);
  assert.equal(diff.currentOccurrences, 0); assert.equal(diff.previousOccurrences, 3);
});
test('audit targets reject embedded credentials and non-HTTP schemes', () => {
  assert.throws(() => validateUrl('https://user:secret@example.org'));
  assert.throws(() => validateUrl('file:///etc/passwd'));
  assert.equal(validateUrl('https://example.org/p#main'), 'https://example.org/p');
});
