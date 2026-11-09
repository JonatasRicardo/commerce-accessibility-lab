import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';
import { scanPages } from '../../src/audit.mjs';
import { runMicrotests } from '../../src/microtests.mjs';
import { saveReport } from '../../src/report.mjs';

test('browser-to-report flow detects the practical barriers, preserves failures and renders safely', async () => {
  const server = http.createServer((req, res) => {
    if (req.url === '/robots.txt') { res.setHeader('content-type', 'text/plain'); return res.end('User-agent: *\nAllow: /\nUser-agent: GPTBot\nDisallow: /\n'); }
    if (req.url === '/denied') { res.writeHead(403, { 'content-type': 'text/html' }); return res.end('<html><title>Access denied</title></html>'); }
    const bad = req.url === '/bad';
    res.setHeader('content-type', 'text/html');
    res.end(`<!doctype html><html lang="pt-BR"><head><title>Camisa — Loja demonstrativa</title><meta name="description" content="Camisa demonstrativa"><link rel="canonical" href="${req.url}"></head><body><main><h1>Camisa</h1><p>R$ 10,00</p><button style="width:80px;height:48px" ${bad ? '' : 'aria-label="Adicionar camisa"'}>${bad ? '' : 'Comprar'}</button><script type="application/ld+json">${bad ? '{"@type":"Product","description":"Linha 1\nLinha 2"}' : '{"@context":"https://schema.org","@type":"Product","name":"Camisa","offers":{"price":"10","priceCurrency":"BRL"}}'}</script></main></body></html>`);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const out = await mkdtemp(path.join(tmpdir(), 'commerce-flow-'));
  try {
    const r = await scanPages([`${base}/bad`, `${base}/good`, `${base}/denied`], { out, waitMs: 50, timeoutMs: 5000 });
    assert.equal(r.pages[0].status, 'ok');
    assert.ok(r.pages[0].perspectives.screenshotDataUrl.startsWith('data:image/png;base64,'));
    assert.ok(r.pages[0].perspectives.axRows.some(n => n.role === 'button' && !n.name));
    assert.ok(r.pages[1].perspectives.axRows.some(n => n.role === 'button' && n.name === 'Adicionar camisa'));
    assert.match(r.pages[0].perspectives.dom.controls[0], /button/);
    assert.ok(r.pages[0].findings.some(f => f.id === 'axe-button-name'));
    assert.ok(r.pages[0].findings.some(f => f.id.startsWith('jsonld-invalid')));
    assert.equal(r.pages[1].rendered.products[0].name, 'Camisa');
    assert.ok(!r.pages[1].findings.some(f => f.id === 'axe-button-name'));
    assert.equal(r.pages[2].status, 'blocked');
    assert.equal(r.pages[2].accessibility, undefined);
    await saveReport(r, out);
    const b = await chromium.launch({ headless: true });
    try {
      const p = await b.newPage();
      await p.goto('file://' + path.join(out, 'report.html'));
      assert.equal(await p.locator('h1').innerText(), 'Diagnóstico de páginas comerciais');
      assert.ok(await p.getByText('JSON-LD com erro de sintaxe', { exact: true }).count());
      assert.ok(await p.locator('svg[role="img"]').count());
      assert.ok(JSON.parse(await readFile(path.join(out, 'report.json'), 'utf8')).pages.length === 3);
    } finally { await b.close(); }
  } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); await rm(out, { recursive: true }); }
});
test('local correction reproduces the three-to-zero and zero-to-one results', async () => {
  const r = await runMicrotests();
  assert.equal(r.passed, true);
  assert.equal(r.microtests.buttons.beforeFailures, 3);
  assert.equal(r.microtests.buttons.afterFailures, 0);
  assert.equal(r.microtests.buttons.afterState, 'Página 2');
  assert.equal(r.microtests.jsonLd.preservedDescription, true);
});
