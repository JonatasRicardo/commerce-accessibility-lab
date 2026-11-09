import { chromium } from 'playwright';
import axe from 'axe-core';
import { VERSION, SCHEMA } from './core.mjs';

export function escapeJsonControls(input) {
  let quoted = false, escaped = false, output = '';
  for (const char of input) {
    if (char === '"' && !escaped) quoted = !quoted;
    output += quoted && char.charCodeAt(0) < 32 ? JSON.stringify(char).slice(1, -1) : char;
    escaped = char === '\\' && !escaped;
  }
  return output;
}
export async function runMicrotests() {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent('<!doctype html><html lang="pt-BR"><title>Teste local</title><main><h1>Produtos</h1><div role="group" aria-label="Carrossel de produtos"><button type="button"></button><button type="button"></button><button type="button"></button></div><p id="status" aria-live="polite">Página 1</p></main></html>');
    await page.locator('button').evaluateAll(elements => elements.forEach((el, i) => { el.onclick = () => { document.querySelector('#status').textContent = 'Página ' + (i + 1); }; }));
    await page.addScriptTag({ content: axe.source });
    const failures = async () => page.evaluate(async () => (await globalThis.axe.run(document, { runOnly: { type: 'rule', values: ['button-name'] } })).violations.reduce((n, v) => n + v.nodes.length, 0));
    const beforeFailures = await failures();
    const beforeTargetCount = await page.getByRole('button', { name: 'Ir para a página 2 de produtos', exact: true }).count();
    await page.locator('button').evaluateAll(elements => elements.forEach((el, i) => { el.setAttribute('aria-label', 'Ir para a página ' + (i + 1) + ' de produtos'); }));
    const afterFailures = await failures();
    const afterTargetCount = await page.getByRole('button', { name: 'Ir para a página 2 de produtos', exact: true }).count();
    await page.getByRole('button', { name: 'Ir para a página 2 de produtos', exact: true }).click();
    const afterState = await page.locator('#status').innerText();
    // Minimal reproduction of the observed JSON syntax error; not the retailer's whole payload.
    const invalid = '{"@context":"https://schema.org","@type":"Product","name":"Produto demonstrativo","description":"Linha 1\nLinha 2"}';
    let beforeError;
    try { JSON.parse(invalid); } catch (error) { beforeError = error.message; }
    const corrected = JSON.parse(escapeJsonControls(invalid));
    const result = { schema: SCHEMA, toolVersion: VERSION, kind: 'microtests', createdAt: new Date().toISOString(),
      scope: 'Reproduções mínimas dos mecanismos do estudo; sem alterações nos sites, vendas ou execução de LLM.',
      microtests: { buttons: { beforeFailures, afterFailures, beforeTargetCount, afterTargetCount, afterState },
        jsonLd: { beforeValid: !beforeError, beforeError, afterValid: corrected['@type'] === 'Product', preservedDescription: corrected.description === 'Linha 1\nLinha 2' } } };
    result.passed = beforeFailures === 3 && afterFailures === 0 && beforeTargetCount === 0 && afterTargetCount === 1 && afterState === 'Página 2' && result.microtests.jsonLd.afterValid && result.microtests.jsonLd.preservedDescription;
    return result;
  } finally { await browser.close(); }
}
