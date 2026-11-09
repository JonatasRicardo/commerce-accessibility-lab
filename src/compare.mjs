import { countOccurrences } from './core.mjs';
import { collectProducts } from './extract.mjs';

export function comparisonRows(pages) {
  return pages.map(p => ({ id: p.id, label: p.label ?? p.site ?? p.id, url: p.url ?? p.requestedUrl, status: p.status,
    rules: p.status === 'ok' ? p.accessibility.violations.length : null,
    occurrences: p.status === 'ok' ? countOccurrences(p.accessibility.violations) : null,
    incomplete: p.status === 'ok' ? p.accessibility.incomplete.length : null,
    title: p.rendered?.title ?? null, productObjects: p.rendered?.products?.length ?? null,
    invalidJsonLd: p.rendered?.jsonLd?.filter(x => !x.valid).length ?? null,
    unnamedControls: p.agentReadability?.unnamedControls ?? null }));
}
export function baselineDiff(pages, baseline) {
  return pages.map(p => {
    const old = baseline.find(b => (b.url ?? b.requestedUrl) === p.url || b.id === p.id);
    if (!old || old.status !== 'ok' || p.status !== 'ok') return { id: p.id, comparable: false, reason: 'Página ou execução comparável não disponível.' };
    return { id: p.id, comparable: true, previousCollectedAt: old.collectedAt, currentCollectedAt: p.collectedAt,
      previousRules: old.accessibility.violations.length, currentRules: p.accessibility.violations.length,
      previousOccurrences: countOccurrences(old.accessibility.violations), currentOccurrences: countOccurrences(p.accessibility.violations),
      sameSourceHash: old.sourceSha256 === p.sourceSha256,
      sameBrowserVersion: old.browserVersion === p.browserVersion, sameAxeVersion: old.axeVersion === p.axeVersion,
      sameConfig: JSON.stringify(old.config) === JSON.stringify(p.config),
      note: 'Diferença observada entre execuções; não estima causalidade, conformidade ou conversão.' };
  });
}

export function normalizeLegacy(records) {
  return records.map(d => {
    const jsonLd = (d.dom?.jsonld ?? []).map((value, index) => ({ index, valid: !value?.invalid, ...(value?.invalid ? { error: 'Erro de sintaxe registrado na coleta original.' } : { value }) }));
    return { id: `${d.site}-${d.kind}`, label: `${d.site} — ${d.kind === 'home' ? 'inicial' : 'produto'}`, site: d.site, pageKind: d.kind,
      status: d.error ? 'error' : 'ok', error: d.error, requestedUrl: d.urlRequested, url: d.url, collectedAt: d.collectedAt,
      sourceSha256: d.sourceSha256, browserVersion: d.browserVersion, axeVersion: d.axeVersion,
      config: { viewport: { width: 1440, height: 1000 }, locale: 'en-US', timezoneId: 'America/Sao_Paulo', reducedMotion: 'reduce', waitMs: 3500, timeoutMs: 45000,
        axeTags: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
      accessibility: { violations: d.violations ?? [], incomplete: d.incomplete ?? [], passes: d.passes ?? [] },
      rendered: d.dom ? { ...d.dom, jsonLd, canonicals: d.dom.canonical ? [d.dom.canonical] : [], description: d.dom.metas?.find(m => m.name === 'description')?.content ?? '', products: collectProducts(jsonLd.filter(x => x.valid).map(x => x.value)) } : null,
      agentReadability: { unnamedControls: d.axControlsWithoutName?.length ?? null },
      provenance: 'Registro original do estudo de 8 nov. 2026; adaptação de formato sem reexecução do motor.' };
  });
}
