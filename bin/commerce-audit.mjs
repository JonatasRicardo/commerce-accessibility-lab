#!/usr/bin/env node
import { parseArgs } from 'node:util';
import { readFile, mkdir, access } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { scanPages } from '../src/audit.mjs';
import { saveReport } from '../src/report.mjs';
import { replayStudy, collectStudy } from '../src/study.mjs';
import { runMicrotests } from '../src/microtests.mjs';
import { inspectArchive } from '../src/archive.mjs';
import { validateAnalytics } from '../src/analytics.mjs';
import { VERSION, SCHEMA, finiteNumber, validateUrl } from '../src/core.mjs';
import { pairPerspectives } from '../src/perspectives.mjs';
import { baselineDiff } from '../src/compare.mjs';
import { inspectPractices } from '../src/practices.mjs';
import { evaluateGate, DEFAULT_POLICY } from '../src/gate.mjs';

const HELP = `Commerce Accessibility Lab v${VERSION}

Uso:
  commerce-audit audit URL [--competitor URL] [--out PASTA]
  commerce-audit study [--mode replay|live] [--out PASTA]
  commerce-audit microtests [--out PASTA]
  commerce-audit archive URL --at 20240101 [--current REPORT.json] [--out PASTA]
  commerce-audit compare REPORT-A.json REPORT-B.json [--out PASTA]
  commerce-audit practices --repo PASTA [--ci-run URL_GITHUB] [--out PASTA]
  commerce-audit gate REPORT.json [--policy POLITICA.json] [--out PASTA]

Opções:
  --wait-ms 3500             Espera após domcontentloaded
  --timeout-ms 45000         Limite de navegação
  --width 1440 --height 1000 Dimensões da janela
  --locale en-US            Idioma do contexto do navegador
  --baseline REPORT.json    Comparar uma nova auditoria com registro anterior
  --analytics DATA.json     Acrescentar dados comerciais explicitamente fornecidos
  --save-html               Salvar HTML recebido e renderizado localmente
  --profile react           Sugerir prevenção para React, sem inferir a stack do site
  --repo PASTA              Inspecionar configuração e código local, sem executá-los
  --ci-run URL_GITHUB       Acrescentar metadados públicos de uma execução de CI
  --policy POLITICA.json    Limites do gate de acessibilidade (padrão: zero crítico/sério)
  --help                    Mostrar esta ajuda

Saídas: report.html, report.json, comparison.csv, improvements.csv e evidências.
Não mede ranking real, conversão por inferência, conformidade completa ou sucesso de LLM.
O modo study/replay verifica registros preservados; study/live visita as seis páginas atuais.
`;

async function prepareOutput(out) {
  let exists = false;
  try { await access(path.join(out, 'report.json')); exists = true; } catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (exists) throw new Error(`Já existe relatório em ${out}. Escolha outra pasta para preservar a execução anterior.`);
  await mkdir(out, { recursive: true });
}
const loadJson = async filename => JSON.parse(await readFile(filename, 'utf8'));

export async function main(argv = process.argv.slice(2)) {
  const { values, positionals } = parseArgs({ args: argv, allowPositionals: true, strict: true,
    options: { help: { type: 'boolean' }, competitor: { type: 'string' }, out: { type: 'string' },
      mode: { type: 'string' }, at: { type: 'string' }, current: { type: 'string' }, baseline: { type: 'string' },
      analytics: { type: 'string' }, profile: { type: 'string' }, repo: { type: 'string' }, 'ci-run': { type: 'string' }, policy: { type: 'string' },
      'save-html': { type: 'boolean' }, 'wait-ms': { type: 'string' },
      'timeout-ms': { type: 'string' }, width: { type: 'string' }, height: { type: 'string' }, locale: { type: 'string' } } });
  if (values.help || !positionals.length) { console.log(HELP); return 0; }
  const [command, ...args] = positionals;
  if (!['audit', 'study', 'microtests', 'archive', 'compare', 'practices', 'gate'].includes(command)) throw new Error(`Comando desconhecido: ${command}. Use --help.`);
  const config = {
    waitMs: finiteNumber(values['wait-ms'] ?? 3500, '--wait-ms'),
    timeoutMs: finiteNumber(values['timeout-ms'] ?? 45000, '--timeout-ms', { min: 1000, max: 120000 }),
    viewport: { width: finiteNumber(values.width ?? 1440, '--width', { min: 320, max: 3840 }), height: finiteNumber(values.height ?? 1000, '--height', { min: 320, max: 2160 }) },
    locale: values.locale ?? 'en-US', saveHtml: values['save-html'] ?? false, profile: values.profile ?? 'general',
  };
  const analytics = values.analytics ? validateAnalytics(await loadJson(values.analytics)) : null;
  const baseline = values.baseline ? await loadJson(values.baseline) : null;
  const out = path.resolve(values.out ?? `reports/${command}-${new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-')}`);
  // Validate command shape before opening a browser or creating output.
  if (command === 'audit' && (!args.length || args.length > 12)) throw new Error('audit exige entre 1 e 12 URLs.');
  if (command === 'archive' && (args.length !== 1 || !values.at)) throw new Error('archive exige uma URL e --at AAAAMMDD.');
  if (command === 'compare' && args.length !== 2) throw new Error('compare exige dois arquivos report.json.');
  if (command === 'gate' && args.length !== 1) throw new Error('gate exige um arquivo de auditoria atual.');
  if (command === 'practices' && (args.length || !values.repo)) throw new Error('practices exige --repo PASTA.');
  if (!['general', 'react'].includes(config.profile)) throw new Error('--profile deve ser general ou react.');
  if (['study', 'microtests'].includes(command) && args.length) throw new Error(`${command} não recebe URLs posicionais.`);
  if (command === 'study' && !['replay', 'live'].includes(values.mode ?? 'replay')) throw new Error('--mode deve ser replay ou live.');
  const urls = command === 'audit' ? [...args, ...(values.competitor ? [values.competitor] : [])].map(validateUrl) : [];
  if (values.competitor && command !== 'audit') throw new Error('--competitor é opção de audit.');
  await prepareOutput(out);
  const onProgress = p => console.log(`${p.status === 'ok' ? 'Coletado' : 'Não concluído'}: ${p.url ?? p.requestedUrl}`);
  let report;
  if (command === 'audit') report = await scanPages(urls, { ...config, out, onProgress });
  else if (command === 'study') report = (values.mode ?? 'replay') === 'live' ? await collectStudy({ ...config, out, onProgress }) : await replayStudy();
  else if (command === 'microtests') report = await runMicrotests();
  else if (command === 'practices') report = await inspectPractices(values.repo, { ciRunUrl: values['ci-run'] });
  else if (command === 'gate') {
    const rawReport = await readFile(args[0], 'utf8');
    const policy = values.policy ? await loadJson(values.policy) : DEFAULT_POLICY;
    report = evaluateGate(JSON.parse(rawReport), { policy, rawReport });
  }
  else if (command === 'archive') {
    const current = values.current ? await loadJson(values.current) : null;
    const target = validateUrl(args[0]);
    const currentPage = current?.pages?.find(p => p.url === target || p.requestedUrl === target);
    if (current && !currentPage) throw new Error('O relatório --current não contém a URL solicitada.');
    report = await inspectArchive(args[0], values.at, { currentStatic: currentPage?.source?.static });
  } else {
    const [a, b] = await Promise.all(args.map(loadJson));
    if (!Array.isArray(a.pages) || !Array.isArray(b.pages)) throw new Error('Os arquivos precisam conter relatórios com pages.');
    report = { schema: SCHEMA, toolVersion: VERSION, kind: 'saved-comparison', createdAt: new Date().toISOString(),
      scope: 'Comparação de relatórios salvos; sem nova navegação. Caminhos de evidências permanecem nos relatórios de origem.',
      pages: [...a.pages.map(p => ({ ...p, evidence: undefined })), ...b.pages.map(p => ({ ...p, evidence: undefined }))],
      diff: baselineDiff(b.pages, a.pages), visualComparisons: pairPerspectives(a, b) };
  }
  if (baseline && report.pages) { report.diff = baselineDiff(report.pages, baseline.pages ?? []); report.visualComparisons = pairPerspectives(baseline, report); }
  if (analytics) report.analytics = analytics;
  await saveReport(report, out);
  console.log(`Relatório: ${path.join(out, 'report.html')}`);
  if (report.verification && !report.verification.passed) return 2;
  if (report.passed === false || report.qualityGate?.passed === false || report.archive?.error || report.pages?.some(p => p.status !== 'ok')) return 2;
  return 0;
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().then(code => { process.exitCode = code; }).catch(error => { console.error(`Erro: ${error.message}`); process.exitCode = 1; });
}
