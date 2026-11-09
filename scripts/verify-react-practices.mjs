import { chromium } from 'playwright';
import axe from 'axe-core';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { createRequire } from 'node:module';
import path from 'node:path';
import assert from 'node:assert/strict';
import { DEFAULTS, SCHEMA, VERSION, sha256, writeJson } from '../src/core.mjs';
import { evaluateGate } from '../src/gate.mjs';
import { saveReport } from '../src/report.mjs';
import { capturePerspectives, comparePngPixels } from '../src/perspectives.mjs';
import { startReactFixture } from './react-fixture.mjs';

const require = createRequire(import.meta.url);
const { values } = parseArgs({ options: { out: { type: 'string', default: 'reports/react-practices' } } });
const out = path.resolve(values.out);
await mkdir(out, { recursive: true });
const fixture = await startReactFixture();
const browser = await chromium.launch({ headless: true });
const states = [], checks = [];
let beforeView, afterView;
const record = (name, actual, expected) => { assert.deepEqual(actual, expected, name); checks.push({ name, passed: true }); };
async function inspectState(page, id) {
  const result = await page.evaluate(async tags => await globalThis.axe.run(document, { runOnly: { type: 'tag', values: tags } }), DEFAULTS.axeTags);
  states.push({ id, status: 'ok', url: page.url(), collectedAt: new Date().toISOString(), axeVersion: axe.version, browserVersion: browser.version(),
    accessibility: { violations: result.violations.map(v => ({ id: v.id, impact: v.impact, nodeCount: v.nodes.length })), incomplete: result.incomplete.map(v => ({ id: v.id, nodeCount: v.nodes.length })) } });
}
try {
  const page = await browser.newPage({ viewport: DEFAULTS.viewport, locale: DEFAULTS.locale, timezoneId: DEFAULTS.timezoneId, reducedMotion: DEFAULTS.reducedMotion });
  const beforeResponse = await page.goto(fixture.url + '/?broken');
  await page.locator('article').waitFor();
  beforeView = await capturePerspectives(page, { rawHtml: await beforeResponse.text() });
  record('Localizador por papel/nome não encontra o controle antes', await page.getByRole('button', { name: 'Revisar seleção', exact: true }).count(), 0);
  const afterResponse = await page.goto(fixture.url);
  await page.getByRole('button', { name: 'Revisar seleção', exact: true }).waitFor();
  afterView = await capturePerspectives(page, { rawHtml: await afterResponse.text() });
  record('Localizador por papel/nome encontra o controle depois', await page.getByRole('button', { name: 'Revisar seleção', exact: true }).count(), 1);
  await page.addScriptTag({ content: axe.source });
  await inspectState(page, 'radix-closed');
  await page.getByRole('combobox', { name: 'Tamanho', exact: true }).selectOption('P');
  record('Variante G está nativamente indisponível', await page.locator('option[value="G"]').isDisabled(), true);
  const trigger = page.getByRole('button', { name: 'Revisar seleção', exact: true });
  await trigger.focus(); await page.keyboard.press('Enter');
  await page.getByRole('dialog', { name: 'Revisar seleção da camisa', exact: true }).waitFor();
  record('Diálogo identifica o título e a variante', await page.getByRole('dialog').innerText().then(t => t.includes('Tamanho escolhido: P')), true);
  record('Foco entra no diálogo ao abrir por teclado', await page.getByRole('dialog').evaluate(el => el.contains(document.activeElement)), true);
  for (let i = 0; i < 4; i++) {
    await page.keyboard.press('Tab');
    record(`Tab ${i + 1} permanece no diálogo`, await page.getByRole('dialog').evaluate(el => el.contains(document.activeElement)), true);
  }
  await inspectState(page, 'radix-open');
  await page.keyboard.press('Escape');
  record('Escape fecha o diálogo', await page.getByRole('dialog').count(), 0);
  await page.waitForFunction(() => document.activeElement?.getAttribute('aria-label') === 'Revisar seleção', null, { timeout: 3000 });
  record('Foco retorna ao acionador', await trigger.evaluate(el => el === document.activeElement), true);
  await trigger.press('Enter');
  await page.getByRole('button', { name: 'Confirmar reserva simulada', exact: true }).click();
  record('Mensagem de estado contém a variante reservada', await page.getByRole('status').innerText(), 'Reserva simulada: camisa tamanho P.');
  await inspectState(page, 'radix-confirmed');
  await page.screenshot({ path: path.join(out, 'react-accessible.png') });

  await page.goto(fixture.url + '/?broken');
  await page.locator('article').waitFor();
  await page.addScriptTag({ content: axe.source });
  await inspectState(page, 'radix-negative-control');
  const goodStates = { schema: SCHEMA, toolVersion: VERSION, kind: 'react-practice-states', pages: states.slice(0, 3) };
  const badState = { schema: SCHEMA, toolVersion: VERSION, kind: 'react-practice-states', pages: states.slice(3) };
  const goodGate = evaluateGate(goodStates), badGate = evaluateGate(badState);
  record('Implementação completa passa no recorte do gate', goodGate.qualityGate.passed, true);
  record('Controle negativo retém a biblioteca e é rejeitado pelo gate', badGate.qualityGate.passed, false);
  record('Controle negativo contém button-name', states[3].accessibility.violations.some(v => v.id === 'button-name'), true);
  const files = ['examples/react-storefront/ProductCard.tsx', 'examples/react-storefront/Storefront.tsx', 'eslint.config.mjs', 'policies/accessibility-gate.json', 'scripts/verify-react-practices.mjs', 'scripts/react-fixture.mjs', 'src/perspectives.mjs', 'src/gate.mjs', 'package-lock.json'];
  const hashes = [];
  for (const f of files) hashes.push({ file: f, sha256: sha256(await readFile(fileURLToPath(new URL('../' + f, import.meta.url)))) });
  const radixPackage = JSON.parse(await readFile(fileURLToPath(new URL('../node_modules/@radix-ui/react-dialog/package.json', import.meta.url)), 'utf8'));
  record('Botão sem nome antes e nomeado depois na árvore AX', beforeView.axRows.some(n => n.role === 'button' && !n.name) && afterView.axRows.some(n => n.role === 'button' && n.name === 'Revisar seleção'), true);
  await writeFile(path.join(out, 'before.png'), Buffer.from(beforeView.screenshotDataUrl.split(',')[1], 'base64'));
  await writeFile(path.join(out, 'after.png'), Buffer.from(afterView.screenshotDataUrl.split(',')[1], 'base64'));
  const pixelComparison = comparePngPixels(Buffer.from(beforeView.screenshotDataUrl.split(',')[1], 'base64'), Buffer.from(afterView.screenshotDataUrl.split(',')[1], 'base64'));
  record('Aparência preservada dentro da tolerância declarada de 16 pixels', pixelComparison.equivalent, true);
  const report = { schema: SCHEMA, toolVersion: VERSION, kind: 'react-practices-demo', createdAt: new Date().toISOString(),
    scope: 'Experimento de engenharia local: React + Radix, quatro estados, testes de teclado e gate. Não mede conversão ou superioridade entre bibliotecas.',
    visualComparisons: [{ title: 'Correção local React — mesmo ícone, nome acessível corrigido', before: beforeView, after: afterView, note: 'Controle negativo e versão corrigida da mesma página fictícia, na mesma sessão e viewport. O botão mantém o ícone visual; somente seu nome acessível muda. Os quatro estados do gate são observações separadas.' }],
    reactExperiment: { pixelComparison, config: { viewport: DEFAULTS.viewport, locale: DEFAULTS.locale, timezoneId: DEFAULTS.timezoneId, reducedMotion: DEFAULTS.reducedMotion }, versions: { node: process.version, playwright: require('playwright/package.json').version, react: require('react/package.json').version, radixDialog: radixPackage.version, axe: axe.version, browser: browser.version() }, checks, states,
      goodGate: goodGate.qualityGate, negativeControlGate: badGate.qualityGate, sourceHashes: hashes,
      interpretation: 'A mesma biblioteca está nas duas condições. Nomeação e integração corretas continuam sendo responsabilidade da aplicação. Não houve participantes humanos ou execução de modelo de IA.' } };
  await writeJson(path.join(out, 'react-practices.json'), report);
  await writeJson(path.join(out, 'states-accessible.json'), goodStates);
  await writeJson(path.join(out, 'state-negative.json'), badState);
  await saveReport(goodGate, path.join(out, 'gate-accessible'));
  await saveReport(badGate, path.join(out, 'gate-negative'));
  await saveReport(report, out);
  console.log(`Verificações React aprovadas: ${checks.length}. Gate acessível aprovado; controle negativo rejeitado.`);
  console.log(`Relatório: ${path.join(out, 'report.html')}`);
} finally { await browser.close(); await fixture.close(); }
