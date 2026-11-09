import { chromium } from 'playwright';
import axe from 'axe-core';
import { mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { DEFAULTS, VERSION, SCHEMA, sha256, validateUrl, writeJson } from './core.mjs';
import { extractHtml } from './extract.mjs';
import { evaluateRobots } from './robots.mjs';
import { getText } from './network.mjs';
import { deriveFindings } from './findings.mjs';
import { capturePerspectives } from './perspectives.mjs';
import { reactPrevention } from './practices.mjs';

const require = createRequire(import.meta.url);
export async function scanPages(urls, options = {}) {
  const config = { ...DEFAULTS, ...options, viewport: options.viewport ?? DEFAULTS.viewport };
  const out = path.resolve(options.out ?? 'reports/audit');
  await mkdir(path.join(out, 'evidence'), { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const pages = [];
  try {
    for (const [index, input] of urls.entries()) {
      const url = validateUrl(input);
      const id = `${String(index + 1).padStart(2, '0')}-${new URL(url).hostname.replace(/[^a-z\d.-]/gi, '_')}-${sha256(url).slice(0, 7)}`;
      const context = await browser.newContext({ viewport: config.viewport, locale: config.locale, timezoneId: config.timezoneId, reducedMotion: config.reducedMotion });
      const page = await context.newPage();
      const startedAt = new Date().toISOString();
      let result;
      try {
        const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: config.timeoutMs });
        await page.waitForTimeout(config.waitMs);
        const finalUrl = validateUrl(page.url());
        const raw = response ? await response.text() : '';
        const source = extractHtml(raw, finalUrl);
        const renderedHtml = await page.content();
        const rendered = extractHtml(renderedHtml, finalUrl);
        const allHeaders = response ? await response.allHeaders() : {};
        const relevantHeaders = Object.fromEntries(['content-type', 'content-language', 'x-robots-tag', 'cache-control'].filter(k => k in allHeaders).map(k => [k, allHeaders[k]]));
        const responseData = { status: response?.status() ?? null, headers: relevantHeaders, url: finalUrl };
        const blocked = !responseData.status || responseData.status >= 400 || /just a moment|access denied|verify (you are|you're) human|robot or human|attention required|captcha/i.test(rendered.title);
        result = {
          id, label: options.labels?.[index] ?? (index === 0 ? 'Página avaliada' : 'Concorrente'),
          requestedUrl: url, url: finalUrl, collectedAt: startedAt,
          status: blocked ? 'blocked' : 'ok', response: responseData,
          source, rendered, sourceSha256: sha256(raw), sourceBytesUtf8: Buffer.byteLength(raw),
          browserVersion: browser.version(), playwrightVersion: require('playwright/package.json').version,
          axeVersion: axe.version, config: { viewport: config.viewport, locale: config.locale, timezoneId: config.timezoneId, reducedMotion: config.reducedMotion, waitMs: config.waitMs, timeoutMs: config.timeoutMs, axeTags: config.axeTags },
          evidence: { screenshot: `evidence/${id}.png`, accessibilityTree: null, sourceHtml: null, renderedHtml: null },
        };
        await page.screenshot({ path: path.join(out, result.evidence.screenshot), fullPage: false, timeout: 15000 });
        if (options.saveHtml) {
          result.evidence.sourceHtml = `evidence/${id}-source.html`;
          result.evidence.renderedHtml = `evidence/${id}-rendered.html`;
          await writeFile(path.join(out, result.evidence.sourceHtml), raw);
          await writeFile(path.join(out, result.evidence.renderedHtml), renderedHtml);
        }
        if (!blocked) {
          await page.addScriptTag({ content: axe.source });
          const scan = await page.evaluate(async tags => {
            let timer;
            try {
              return await Promise.race([
                globalThis.axe.run(document, { runOnly: { type: 'tag', values: tags } }),
                new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('axe excedeu 45 segundos')), 45000); }),
              ]);
            } finally { clearTimeout(timer); }
          }, config.axeTags);
          result.accessibility = {
            violations: scan.violations.map(v => ({ id: v.id, impact: v.impact, help: v.help, helpUrl: v.helpUrl, tags: v.tags,
              nodeCount: v.nodes.length, nodes: v.nodes.slice(0, 8).map(n => ({ html: n.html, target: n.target, failureSummary: n.failureSummary })) })),
            incomplete: scan.incomplete.map(v => ({ id: v.id, nodeCount: v.nodes.length })),
            passes: scan.passes.map(v => v.id),
          };
          const cdp = await context.newCDPSession(page);
          const tree = await cdp.send('Accessibility.getFullAXTree');
          result.perspectives = await capturePerspectives(page, { rawHtml: raw, tree });
          await cdp.detach();
          const roles = new Set(['button', 'combobox', 'searchbox', 'textbox', 'checkbox', 'radio', 'link', 'heading']);
          const compact = tree.nodes.filter(n => !n.ignored && roles.has(n.role?.value)).map(n => ({ role: n.role.value, name: n.name?.value ?? '', properties: n.properties }));
          result.agentReadability = {
            controls: compact.filter(n => !['link', 'heading'].includes(n.role)).length,
            unnamedControls: compact.filter(n => !['link', 'heading'].includes(n.role) && !n.name).length,
            note: 'Observação da árvore de acessibilidade; não mede sucesso de um LLM ou qualidade da recomendação.',
          };
          result.evidence.accessibilityTree = `evidence/${id}-accessibility-tree.json`;
          await writeJson(path.join(out, result.evidence.accessibilityTree), compact);
          result.tabSequence = [];
          for (let i = 0; i < 10; i++) {
            await page.keyboard.press('Tab');
            result.tabSequence.push(await page.evaluate(() => {
              const el = document.activeElement;
              return { tag: el.tagName, id: el.id, text: (el.textContent ?? '').trim().slice(0, 100), label: el.getAttribute('aria-label'), href: el.getAttribute('href') };
            }));
          }
          let robotsFile;
          try { robotsFile = await getText(new URL('/robots.txt', finalUrl).href, { timeoutMs: 15000, maxBytes: 1_000_000 }); }
          catch (error) { robotsFile = { url: new URL('/robots.txt', finalUrl).href, error: error.message }; }
          result.robots = evaluateRobots(robotsFile, finalUrl);
          if (robotsFile.text) await writeFile(path.join(out, 'evidence', `${id}-robots.txt`), robotsFile.text);
        } else result.error = `A página final não foi auditada como conteúdo comercial (HTTP ${responseData.status}).`;
        result.findings = deriveFindings(result);
        if (options.profile === 'react') result.prevention = reactPrevention(result.findings);
      } catch (error) {
        result = { ...(result ?? {}), id, requestedUrl: url, collectedAt: startedAt, status: 'error', error: error.message };
        result.findings = deriveFindings(result);
      } finally { await context.close(); }
      pages.push(result);
      options.onProgress?.(result);
      await writeJson(path.join(out, 'evidence', `${id}-audit.json`), result);
    }
  } finally { await browser.close(); }
  return { schema: SCHEMA, toolVersion: VERSION, kind: 'live-audit', createdAt: new Date().toISOString(),
    scope: 'Acessibilidade automatizada, SEO técnico e legibilidade estrutural; sem medição de ranking, vendas ou execução de tarefas por LLM.', pages };
}
