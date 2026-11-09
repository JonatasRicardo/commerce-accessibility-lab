import { VERSION, SCHEMA, sha256 } from './core.mjs';

export const DEFAULT_POLICY = Object.freeze({ version: 1, maxCritical: 0, maxSerious: 0, maxAgeHours: 24 });

export function evaluateGate(report, { policy = DEFAULT_POLICY, rawReport, now = Date.now() } = {}) {
  for (const name of ['maxCritical', 'maxSerious']) {
    if (!Number.isInteger(policy[name]) || policy[name] < 0) throw new Error(`Política inválida: ${name} precisa ser inteiro não negativo.`);
  }
  if (!Number.isFinite(policy.maxAgeHours) || policy.maxAgeHours <= 0) throw new Error('Política inválida: maxAgeHours precisa ser positivo.');
  const reasons = [];
  const counts = { critical: 0, serious: 0, moderate: 0, minor: 0, unknown: 0, incompleteRules: 0 };
  if (!['live-audit', 'study-live', 'react-practice-states'].includes(report.kind)) reasons.push('O gate exige coleta atual de estados; replay, comparação salva ou captura histórica não comprovam uma nova verificação.');
  if (!Array.isArray(report.pages) || !report.pages.length) reasons.push('Nenhuma página ou estado auditado.');
  for (const page of report.pages ?? []) {
    const timestamp = Date.parse(page.collectedAt);
    if (!Number.isFinite(timestamp) || now - timestamp > policy.maxAgeHours * 3600000 || timestamp > now + 300000) reasons.push(`${page.id}: coleta ausente, antiga ou com data futura inconsistente.`);
    if (page.status !== 'ok' || !Array.isArray(page.accessibility?.violations) || !page.axeVersion) {
      reasons.push(`${page.id}: coleta ou resultado do motor incompleto.`); continue;
    }
    counts.incompleteRules += page.accessibility.incomplete?.length ?? 0;
    for (const v of page.accessibility.violations) {
      if (!Number.isInteger(v.nodeCount) || v.nodeCount < 1) { reasons.push(`${page.id}: contagem inválida em ${v.id}.`); continue; }
      const impact = Object.hasOwn(counts, v.impact) && v.impact !== 'incompleteRules' ? v.impact : 'unknown';
      counts[impact] += v.nodeCount;
    }
  }
  if (counts.critical > policy.maxCritical) reasons.push(`Ocorrências críticas: ${counts.critical}; limite: ${policy.maxCritical}.`);
  if (counts.serious > policy.maxSerious) reasons.push(`Ocorrências sérias: ${counts.serious}; limite: ${policy.maxSerious}.`);
  return {
    schema: SCHEMA, toolVersion: VERSION, kind: 'quality-gate', createdAt: new Date(now).toISOString(),
    scope: 'Regra de CI para o recorte automatizado. Aprovação não certifica WCAG, implantação ou proteção de merge.',
    qualityGate: { passed: reasons.length === 0, policy, counts, reasons,
      sourceReportSha256: sha256(rawReport ?? JSON.stringify(report)),
      reviewedStates: (report.pages ?? []).map(p => ({ id: p.id, collectedAt: p.collectedAt, axeVersion: p.axeVersion, browserVersion: p.browserVersion })),
      note: 'Itens inconclusivos e impactos fora do limite escolhido permanecem para revisão; esta política não avalia tarefas humanas completas.' },
  };
}
