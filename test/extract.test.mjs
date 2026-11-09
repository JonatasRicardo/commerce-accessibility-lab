import test from 'node:test';
import assert from 'node:assert/strict';
import { extractHtml, indexDirectives } from '../src/extract.mjs';
import { escapeJsonControls } from '../src/microtests.mjs';
import { validateAnalytics } from '../src/analytics.mjs';

test('reads products nested in graph and variants without double-counting unrelated objects', () => {
  const html = `<html lang="pt-BR"><title>Produto</title><head><link rel="canonical" href="/p"></head><body><h1>Camisa</h1><script type="application/ld+json">${JSON.stringify({ '@graph': [{ '@type': 'Organization', name: 'Loja' }, { '@type': 'ProductGroup', name: 'Camisa', hasVariant: [{ '@type': 'Product', name: 'Camisa M', offers: { price: '10', priceCurrency: 'BRL' } }] }] })}</script></body></html>`;
  const result = extractHtml(html, 'https://example.org/start');
  assert.deepEqual(result.products.map(p => p.type), ['ProductGroup', 'Product']);
  assert.equal(result.products[1].offers[0].priceCurrency, 'BRL');
  assert.equal(result.canonicals[0], 'https://example.org/p');
});
test('invalid JSON remains evidence rather than disappearing from product checks', () => {
  const result = extractHtml('<script type="application/ld+json">{"name":"a\nb"}</script><img><img alt=""><img alt="Produto">', 'https://example.org/');
  assert.equal(result.jsonLd[0].valid, false);
  assert.equal(result.products.length, 0);
  assert.deepEqual(result.images, { total: 3, withoutAlt: 1, emptyAlt: 1 });
});
test('scoped indexing directives do not label a bingbot-only noindex as Google noindex', () => {
  assert.equal(indexDirectives([], 'bingbot: noindex, nofollow').noindex, false);
  assert.equal(indexDirectives([], 'noindex, nofollow').noindex, true);
  assert.equal(indexDirectives([], 'googlebot: noindex').noindex, true);
  assert.equal(indexDirectives([{ name: 'robots', content: 'none' }], '').noindex, true);
  assert.equal(indexDirectives([], 'max-snippet: -1, noindex').noindex, true);
});
test('minimal JSON repair preserves escaped quotes, backslashes and real line breaks', () => {
  const bad = '{"description":"um\\\"dois\ntrês\\\\quatro"}';
  assert.throws(() => JSON.parse(bad));
  const fixed = JSON.parse(escapeJsonControls(bad));
  assert.equal(fixed.description, 'um"dois\ntrês\\quatro');
});
test('conversion requires explicit units and never accepts order count as converting units', () => {
  const row = { url: 'https://example.org/', periodStart: '2026-01-01', periodEnd: '2026-01-31', source: 'GA4 export', unit: 'visitors', denominator: 100, convertingUnits: 3 };
  assert.equal(validateAnalytics([row])[0].conversionRate, .03);
  assert.throws(() => validateAnalytics([{ ...row, convertingUnits: 101 }]));
  assert.throws(() => validateAnalytics([{ ...row, unit: 'orders' }]));
  assert.throws(() => validateAnalytics([{ ...row, periodStart: '2027-01-01' }]));
});
