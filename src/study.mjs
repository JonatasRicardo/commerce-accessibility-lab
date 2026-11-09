import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { SCHEMA, VERSION, sha256, countOccurrences } from './core.mjs';
import { normalizeLegacy, baselineDiff } from './compare.mjs';
import { scanPages } from './audit.mjs';

export const STUDY_DIR = fileURLToPath(new URL('../study/', import.meta.url));
export async function replayStudy(directory = STUDY_DIR) {
  const manifest = JSON.parse(await readFile(path.join(directory, 'manifest.json'), 'utf8'));
  const files = [];
  for (const entry of manifest.files) {
    const content = await readFile(path.join(directory, entry.file));
    files.push({ file: entry.file, expected: entry.sha256, actual: sha256(content), ok: sha256(content) === entry.sha256 });
  }
  const original = JSON.parse(await readFile(path.join(directory, 'baseline/audit-results.json'), 'utf8'));
  const expected = JSON.parse(await readFile(path.join(directory, 'expected-results.json'), 'utf8'));
  const pages = normalizeLegacy(original);
  const rows = pages.map(p => ({ id: p.id, rules: p.accessibility.violations.length, occurrences: countOccurrences(p.accessibility.violations), incomplete: p.accessibility.incomplete.length }));
  const countsMatch = JSON.stringify(rows) === JSON.stringify(expected.pages);
  return { schema: SCHEMA, toolVersion: VERSION, kind: 'study-replay', createdAt: new Date().toISOString(),
    scope: 'Recomposição determinística dos registros de 8 nov. 2026. Nenhuma nova visita ou repetição do motor de auditoria.',
    pages, history: JSON.parse(await readFile(path.join(directory, 'baseline/historical-static-comparison.json'), 'utf8')),
    verification: { passed: files.every(f => f.ok) && countsMatch, files, countsMatch, expected, recomputed: rows } };
}
export async function collectStudy(options) {
  const baseline = await replayStudy();
  if (!baseline.verification.passed) throw new Error('O conjunto de referência não passou na verificação de integridade.');
  const report = await scanPages(baseline.pages.map(p => p.url), { ...options, labels: baseline.pages.map(p => p.label) });
  report.kind = 'study-live';
  // Stable page identities keep redirects from silently dropping a comparison.
  report.pages.forEach((p, index) => { p.id = baseline.pages[index].id; });
  report.diff = baselineDiff(report.pages, baseline.pages);
  return report;
}
