import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { csv, escapeHtml as e, safeLink, writeJson, countOccurrences } from './core.mjs';
import { comparisonRows } from './compare.mjs';

const fmt = value => value === null || value === undefined ? 'Não medido' : String(value);
const text = value => e(fmt(value));
const link = (url, label = url) => `<a href="${safeLink(url)}" rel="noreferrer">${e(label)}</a>`;
function table(headers, rows) {
  return `<div class="table-wrap"><table><thead><tr>${headers.map(h => `<th scope="col">${e(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr>${row.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}
function bars(rows, key, title) {
  const values = rows.map(r => r[key]).filter(n => typeof n === 'number');
  const max = Math.max(1, ...values); const height = 50 + rows.length * 42;
  const chartId = `chart-${key}`;
  return `<figure><h3>${e(title)}</h3><svg role="img" aria-labelledby="${chartId}" viewBox="0 0 850 ${height}"><title id="${chartId}">${e(title)}. ${e(rows.map(r => `${r.label}: ${fmt(r[key])}`).join('; '))}</title>${rows.map((r, i) => {
    const y = 20 + i * 42; const width = r[key] === null ? 0 : r[key] / max * 470;
    return `<text x="0" y="${y + 18}" fill="#18313f" font-size="14">${e(r.label).slice(0, 150)}</text><rect x="270" y="${y}" width="${width}" height="25" rx="3" fill="${i % 2 ? '#087f8c' : '#173e55'}"/><text x="${280 + width}" y="${y + 18}" fill="#18313f" font-size="14">${text(r[key])}</text>`;
  }).join('')}</svg><figcaption>Contagens brutas por página; não são uma nota de conformidade ou uma previsão de conversão.</figcaption></figure>`;
}
function perspectiveCell(view, channel) {
  if (!view) return '<p>Não capturado nesta versão do registro. Execute uma nova auditoria para preservar esta visão.</p>';
  if (channel === 'visual') {
    const img = /^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(view.screenshotDataUrl ?? '') ? `<img class="page-capture" src="${view.screenshotDataUrl}" alt="Captura real da página no viewport registrado; o conteúdo semântico é apresentado na linha seguinte.">` : '<p>Captura visual indisponível.</p>';
    return `${img}<p class="small">${e(view.capturedAt)} · ${text(view.viewport?.width)} × ${text(view.viewport?.height)} px</p>`;
  }
  if (channel === 'ax') return `<pre>${e((view.axRows ?? []).map(n => `${n.role} | nome: ${n.name ? JSON.stringify(n.name) : '[SEM NOME]'}${n.properties?.length ? ' | ' + n.properties.map(p => p.name + '=' + p.value).join(', ') : ''}`).join('\n'))}</pre><p class="small">${view.axTruncated ? 'Recorte limitado a 160 nós; árvore maior.' : 'Nós relevantes do recorte.'} Árvore do navegador, sem simulação de fala.</p>`;
  return `<strong>Texto do DOM após JavaScript</strong><pre>${e(view.dom?.text ?? 'Não capturado')}</pre><strong>Marcação dos controles (até 20)</strong><pre>${e(view.dom?.controls?.join('\n') ?? 'Não capturada')}</pre><strong>Texto do HTML inicial</strong><pre>${e(view.initialHtml ? view.initialHtml.textSample || 'Sem texto no corpo do HTML recebido.' : 'HTML inicial não preservado nesta captura.')}</pre><strong>JSON-LD encontrado</strong><pre>${e(view.dom?.jsonLd?.length ? view.dom.jsonLd.join('\n') : 'Nenhum bloco neste recorte.')}</pre><p class="small">${view.dom?.textTruncated ? 'Texto truncado em 16.000 caracteres. ' : ''}Um robô que recebe apenas HTML inicial pode receber outro conteúdo. Não houve consulta a um LLM.</p>`;
}
function perspectivesSection(comparisons) {
  return comparisons.map(c => `<section class="perspectives"><h2>Antes e depois: três visões</h2><h3>${e(c.title)}</h3><p>${e(c.note)}</p>${table(['Canal observado', 'Antes', 'Depois'], [
    ['<strong>Usuário — aparência visual</strong>', perspectiveCell(c.before, 'visual'), perspectiveCell(c.after, 'visual')],
    ['<strong>Tecnologia assistiva — semântica exposta</strong><p>Árvore de acessibilidade (AX). Um leitor de tela interpreta essa estrutura conforme seu navegador, sistema e modo de navegação.</p>', perspectiveCell(c.before, 'ax'), perspectiveCell(c.after, 'ax')],
    ['<strong>Agente / robô — conteúdo disponível</strong><p>Texto e JSON-LD do DOM renderizado; agentes também podem consultar a árvore AX, pixels ou HTML inicial.</p>', perspectiveCell(c.before, 'dom'), perspectiveCell(c.after, 'dom')],
  ])}<p class="notice">Esta comparação mostra entradas observadas. Não representa a percepção de todas as pessoas, uma transcrição de leitor de tela ou o raciocínio de um agente. Uma melhoria semântica pode preservar exatamente a aparência visual.</p></section>`).join('');
}
function findingsSection(p) {
  const findings = p.findings ?? [];
  if (!findings.length) return '<p>As métricas abaixo foram recompostas dos registros originais. Para novas recomendações contextuais, executar uma auditoria atual.</p>';
  return findings.map(f => `<article class="finding"><div class="tags"><span>${e(f.domain)}</span><span>Prioridade ${e(f.priority)}</span><span>${e(f.confidence)}</span></div><h4>${e(f.title)}</h4><p><strong>Evidência:</strong> ${e(f.evidence)}</p><p><strong>Melhoria:</strong> ${e(f.recommendation)}</p></article>`).join('');
}
function pageSection(p) {
  const good = p.status === 'ok';
  const products = p.rendered?.products ?? [];
  return `<section><h2>${e(p.label ?? p.id)}</h2><p>${link(p.url ?? p.requestedUrl)}</p><p><strong>Situação:</strong> ${e(p.status)} · <strong>Coleta:</strong> ${e(p.collectedAt ?? '')}</p>
  ${!good ? `<p class="notice">${e(p.error ?? 'Coleta incompleta.')}</p>` : ''}
  ${good ? table(['Indicador', 'Registro'], [
    ['Título', text(p.rendered.title)], ['Idioma', text(p.rendered.lang)], ['Título principal', e((p.rendered.h1 ?? []).join(' | '))],
    ['JSON-LD inválido', text(p.rendered.jsonLd?.filter(x => !x.valid).length)], ['Produtos em JSON-LD', text(products.length)],
    ['Controles sem nome na árvore', text(p.agentReadability?.unnamedControls)],
    ['Hash SHA-256 do HTML recebido', `<code>${e(p.sourceSha256)}</code>`],
  ]) : ''}
  ${products.length ? `<h3>Leitura dos produtos</h3><p>Dados extraídos do canal JSON-LD; exatidão, estoque real e vocabulário completo não foram validados.</p>${table(['Tipo', 'Nome', 'SKU', 'Oferta estruturada'], products.slice(0, 20).map(x => [text(x.type), text(x.name), text(x.sku), `<code>${e(JSON.stringify(x.offers))}</code>`]))}` : ''}
  ${p.robots ? `<h3>Regras de rastreamento</h3>${table(['Agente', 'Regra do arquivo', 'Grupo explícito'], p.robots.agents.map(a => [e(a.agent), a.allowedByFile === null ? 'Indeterminada' : a.allowedByFile ? 'Permite esta URL' : 'Não permite esta URL', a.explicitGroup ? 'Sim' : 'Não']))}<p>${e(p.robots.note)}</p>` : ''}
  <h3>O que revisar</h3>${findingsSection(p)}
  ${p.prevention ? `<h3>Prevenção no desenvolvimento React</h3><p>${e(p.prevention.note)}</p>${table(['Prática', 'Como averiguar', 'Situação'], p.prevention.practices.map(x => [e(`${x.id} — ${x.title}`), e(x.verify), e(x.status)]))}` : ''}
  ${good ? `<details><summary>Alertas e elementos observados</summary>${(p.accessibility?.violations ?? []).map(v => `<article class="finding"><h4>${link(v.helpUrl, v.id)} · ${v.nodeCount} ocorrência(s)</h4><p>Impacto da ferramenta: ${e(v.impact)}. Confirmação humana necessária.</p>${v.nodes?.slice(0, 3).map(n => `<pre><code>${e(n.html)}</code></pre><p>${e(n.failureSummary)}</p>`).join('') ?? ''}</article>`).join('') || '<p>Nenhum alerta neste recorte automatizado. Isso não certifica acessibilidade.</p>'}</details>` : ''}
  ${p.evidence?.screenshot ? `<p><a href="${e(p.evidence.screenshot)}">Abrir captura da página</a></p>` : ''}</section>`;
}

export function renderHtml(report) {
  const pages = report.pages ?? [];
  const rows = comparisonRows(pages);
  const replay = report.kind === 'study-replay';
  const heading = ({ 'repository-practices': 'Práticas React e evidências do processo', 'quality-gate': 'Gate de acessibilidade para CI', 'react-practices-demo': 'Experimento de acessibilidade em React' })[report.kind]
    ?? (replay ? 'Reprodução dos registros do estudo' : 'Diagnóstico de páginas comerciais');
  let main = '';
  if (report.qualityGate) {
    const g = report.qualityGate;
    main += `<section><h2>Gate de acessibilidade: ${g.passed ? 'aprovado no recorte' : 'reprovado'}</h2><p>Limites explícitos de ocorrências: críticas ${g.policy.maxCritical}; sérias ${g.policy.maxSerious}. Esta aprovação não certifica WCAG nem configura proteção de merge.</p>${table(['Críticas', 'Sérias', 'Moderadas', 'Menores', 'Inconclusivas'], [[text(g.counts.critical), text(g.counts.serious), text(g.counts.moderate), text(g.counts.minor), text(g.counts.incompleteRules)]])}${g.reasons.length ? `<ul>${g.reasons.map(x => `<li>${e(x)}</li>`).join('')}</ul>` : '<p>Nenhuma condição de reprovação desta política foi encontrada.</p>'}<p>${e(g.note)}</p><p class="small">SHA-256 do resultado avaliado: ${e(g.sourceReportSha256)}</p></section>`;
  }
  if (report.practices) {
    const p = report.practices, ci = p.ciEvidence;
    main += `<section><h2>Práticas React e processo de desenvolvimento</h2><p>Repositório: ${e(p.repositoryName)} · commit ${e(p.commit ?? 'não identificado')}. Árvore local ${p.workingTreeDirty === null ? 'não identificada' : p.workingTreeDirty ? 'com alterações' : 'sem alterações identificadas'}.</p><p>Configuração, execução e revisão humana são evidências distintas. Os arquivos foram lidos e analisados; comandos do projeto inspecionado não foram executados.</p>${table(['Prática', 'Observação estática', 'Como verificar', 'Evidências'], p.rows.map(r => [e(`${r.id} — ${r.title}`), e(r.status), e(r.verify), r.evidence.map(x => `<code>${e(x.file)}${x.line ? ':' + x.line : ''}</code>: ${e(x.detail)}`).join('<br>') || e(r.missing.join(' '))]))}<p>${e(p.humanReview)}</p><p>Proteção de merge: ${e(p.branchProtection)}</p>${p.limitations.length ? `<details><summary>Limites da inspeção</summary><ul>${p.limitations.map(x => `<li>${e(x)}</li>`).join('')}</ul></details>` : ''}</section>`;
    if (ci) main += `<section><h2>Evidência pública de CI</h2><p>${link(ci.url)}</p>${ci.error ? `<p>${e(ci.error)}</p>` : `<p>Estado: ${e(ci.status)} · conclusão: ${e(ci.conclusion)}. ${e(ci.interpretation)}</p>${table(['Job', 'Conclusão', 'Etapas observadas'], ci.jobs.map(j => [e(j.name), text(j.conclusion), (j.steps ?? []).map(s => `${e(s.name)}: ${e(s.conclusion ?? s.status)}`).join('<br>')]))}${table(['Artefato', 'Disponível', 'Bytes'], ci.artifacts.map(a => [e(a.name), a.expired ? 'Expirado' : 'Não expirado', text(a.sizeInBytes)]))}<p>${e(ci.note)}</p>`}</section>`;
  }
  if (report.reactExperiment) {
    const r = report.reactExperiment;
    main += `<section><h2>Experimento de práticas React</h2><p>React ${e(r.versions.react)} · Radix Dialog ${e(r.versions.radixDialog)} · axe ${e(r.versions.axe)} · Chromium ${e(r.versions.browser)}.</p>${table(['Estado', 'Regras com alertas', 'Ocorrências', 'Resultado do gate'], r.states.map((s, i) => [e(s.id), text(s.accessibility.violations.length), text(countOccurrences(s.accessibility.violations)), i < 3 ? (r.goodGate.passed ? 'Aprovado no conjunto acessível' : 'Reprovado') : (r.negativeControlGate.passed ? 'Aprovado' : 'Reprovado como esperado')]))}${table(['Verificação comportamental', 'Resultado'], r.checks.map(c => [e(c.name), c.passed ? 'Confirmada no teste' : 'Não confirmada']))}${r.pixelComparison ? `<p>Comparação visual: ${text(r.pixelComparison.changedPixels)} pixel(s) alterado(s) em ${text(r.pixelComparison.totalPixels)}; limite declarado: ${text(r.pixelComparison.maxChangedPixels)}. ${e(r.pixelComparison.note)}</p>` : ''}<p>${e(r.interpretation)}</p></section>`;
  }
  if (pages.length) {
    main += `<section><h2>Comparação de páginas</h2><p>Comparar a mesma etapa da jornada, dispositivo e contexto. Quantidade e complexidade de elementos variam entre páginas.</p>${table(['Página', 'Regras com alertas', 'Ocorrências', 'Inconclusivas', 'JSON-LD inválido'], rows.map(r => [link(r.url, r.label), text(r.rules), text(r.occurrences), text(r.incomplete), text(r.invalidJsonLd)]))}${bars(rows, 'rules', 'Regras com alertas')}${bars(rows, 'occurrences', 'Ocorrências regra-elemento')}</section>`;
  }
  if (report.verification) main += `<section><h2>Verificação dos registros do estudo</h2><p class="notice">${report.verification.passed ? 'Os arquivos e as contagens conferem com o conjunto preservado.' : 'Foram encontradas divergências no conjunto preservado.'} Reprodução de análise: sem nova coleta das páginas.</p>${table(['Arquivo', 'Integridade'], report.verification.files.map(f => [e(f.file), f.ok ? 'SHA-256 confere' : 'Divergente']))}</section>`;
  if (report.diff) main += `<section><h2>Diferenças em relação à referência</h2><p>Diferenças observacionais entre versões e ambientes não são efeitos causais.</p>${table(['Página', 'Ocorrências anteriores', 'Ocorrências atuais', 'Mesmo HTML', 'Mesmo navegador / axe / config'], report.diff.map(d => [e(d.id), text(d.previousOccurrences), text(d.currentOccurrences), d.comparable ? (d.sameSourceHash ? 'Sim' : 'Não') : 'Não comparável', d.comparable ? e([d.sameBrowserVersion, d.sameAxeVersion, d.sameConfig].map(x => x ? 'sim' : 'não').join(' / ')) : e(d.reason)]))}</section>`;
  if (report.history) main += `<section><h2>Registros históricos</h2><p>HTML estático. A presença de alt não informa se a descrição é adequada. As datas efetivamente entregues prevalecem sobre datas solicitadas.</p>${table(['Página / data', 'Imagens sem alt / total', 'Atributo aria-has' + 'pop'], report.history.map(x => [e(`${x.site} — ${x.date}`), e(`${x.counts.imagesWithoutAlt} / ${x.counts.images}`), text(x.counts.ariaHaspopTypo)]))}</section>`;
  if (report.archive) {
    const a = report.archive;
    main += `<section><h2>Wayback Machine</h2><p>${a.snapshotUrl ? link(a.snapshotUrl) : 'Sem captura disponível.'}</p><p>Data solicitada: ${e(a.requestedAt)} · Captura efetiva: ${e(a.effectiveTimestamp ?? 'não obtida')}</p>${a.error ? `<p>${e(a.error)}</p>` : ''}${a.static ? table(['Indicador estático', 'Captura histórica', 'HTML atual recebido'], Object.keys(a.static).map(k => [e(k), text(a.static[k]), text(a.currentStatic?.[k])])) : ''}<p>Recursos ausentes ou redirecionamentos históricos podem alterar o conteúdo. Este modo não executa scripts nem estima contraste, vendas ou ranking histórico.</p></section>`;
  }
  if (report.microtests) main += `<section><h2>Microtestes locais</h2><p>Reprodução mínima do mecanismo observado; sem compras e sem execução de LLM.</p>${table(['Medida', 'Antes', 'Depois'], [
    ['Botões com falha de nomeação', text(report.microtests.buttons.beforeFailures), text(report.microtests.buttons.afterFailures)],
    ['Alvos localizados por nome', text(report.microtests.buttons.beforeTargetCount), text(report.microtests.buttons.afterTargetCount)],
    ['Estado após clique', 'Não testável pelo nome solicitado', e(report.microtests.buttons.afterState)],
    ['JSON-LD sintaticamente válido', report.microtests.jsonLd.beforeValid ? 'Sim' : 'Não', report.microtests.jsonLd.afterValid ? 'Sim' : 'Não'],
  ])}</section>`;
  if (report.analytics) main += `<section><h2>Dados comerciais fornecidos</h2><p>Valores fornecidos pelo usuário; não auditados e não atribuídos causalmente às correções.</p>${table(['URL', 'Origem e período', 'Unidade', 'Unidades convertidas / total', 'Conversão'], report.analytics.map(a => [link(a.url), e(`${a.source}; ${a.periodStart} a ${a.periodEnd}`), e(a.unit), e(`${a.convertingUnits} / ${a.denominator}`), e((a.conversionRate * 100).toFixed(2) + '%')]))}</section>`;
  if (report.visualComparisons) main += perspectivesSection(report.visualComparisons);
  main += pages.map(pageSection).join('');
  const interpretation = report.practices ? 'Inspeção de arquivos locais e, quando fornecidos, metadados públicos de CI. Presença de configuração não prova execução ou adoção por uma equipe.' : report.qualityGate ? 'O gate aplica limites ao relatório fornecido e verifica sua data e completude. Não configura proteção de merge ou implantação.' : replay ? 'Este relatório recompõe os dados preservados de 8 de novembro de 2026. Não é uma nova auditoria dos sites.' : 'Os resultados representam as páginas e os estados observados nesta execução. O relatório não visita todo o checkout nem substitui testes com pessoas.';
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src 'self' data:; base-uri 'none'; form-action 'none'"><title>Commerce Accessibility Lab — relatório</title><style>
  .page-capture{width:100%;height:auto;border:1px solid #b7c9d0}.perspectives table{table-layout:fixed;min-width:780px}.perspectives th:first-child{width:20%}.perspectives pre{max-height:420px}.perspectives td{padding:10px}@media print{.perspectives pre{max-height:none}.perspectives table{min-width:0}.perspectives tr{break-inside:avoid}}:root{color-scheme:light}*{box-sizing:border-box}body{margin:0;background:#f0f5f7;color:#18313f;font:16px/1.55 system-ui,sans-serif}header{background:#173e55;color:white;padding:46px max(24px,calc((100% - 1140px)/2))}header p{max-width:900px;color:#e4f1f5}h1{font-size:clamp(28px,4vw,42px);line-height:1.15;margin:12px 0}h2{font-size:26px}h3{font-size:21px}h4{font-size:17px;margin:12px 0}main{max-width:1200px;margin:32px auto;padding:0 22px}section{background:white;border:1px solid #dce5e9;border-radius:12px;padding:26px;margin:22px 0;overflow:hidden}a{color:#075d75;overflow-wrap:anywhere}a:focus-visible,summary:focus-visible{outline:3px solid #a45a13;outline-offset:4px}.notice{border-left:4px solid #087f8c;padding:16px;background:#edf7f7}.table-wrap{overflow:auto}table{width:100%;border-collapse:collapse;font-size:14px}th,td{text-align:left;vertical-align:top;padding:12px;border-bottom:1px solid #dce5e9;overflow-wrap:anywhere}th{background:#173e55;color:white}tr:nth-child(even){background:#f0f5f7}code{overflow-wrap:anywhere}pre{white-space:pre-wrap;padding:12px;background:#f0f5f7;font-size:12px;overflow:auto}.finding{border-top:1px solid #dce5e9;padding:18px 0}.tags{display:flex;gap:8px;flex-wrap:wrap}.tags span{background:#edf7f7;padding:4px 8px;border-radius:4px;font-size:12px;color:#174451}figure{margin:25px 0}svg{width:100%;height:auto}figcaption,.small{font-size:13px;color:#536873}summary{padding:16px 0;cursor:pointer}footer{padding:20px 0}.skip{position:absolute;left:10px;top:-70px;background:white;padding:10px}.skip:focus{top:10px}@media print{body{background:white}section{border:none;padding:10px 0}details{display:block}header{padding:20px;color:#18313f;background:white}header p{color:#18313f}figure,table{break-inside:avoid}a{color:#18313f}}
  </style></head><body><a class="skip" href="#conteudo">Ir ao conteúdo</a><header><p>COMMERCE ACCESSIBILITY LAB · v${e(report.toolVersion ?? '0.1.0')}</p><h1>${e(heading)}</h1><p>${e(report.scope ?? '')}</p><p>${e(report.createdAt ?? '')}</p></header><main id="conteudo"><section><h2>Como interpretar</h2><p>${e(interpretation)}</p><p>Zero alertas não certifica acessibilidade. Leitura de HTML e robots.txt não demonstra posição no Google, presença em respostas do ChatGPT ou taxa de conversão. Essas métricas exigem coleta própria e dados autorizados.</p></section>${main}<footer><p>Fontes de interpretação: ${link('https://www.w3.org/WAI/test-evaluate/', 'W3C WAI')}, ${link('https://developers.google.com/search/docs/fundamentals/seo-starter-guide', 'Google Search Central')}, ${link('https://developers.openai.com/api/docs/bots', 'OpenAI Crawlers')}. Código e método: ${link('https://github.com/JonatasRicardo/commerce-accessibility-lab', 'GitHub')}.</p></footer></main></body></html>`.replace(/[ \t]+$/gm, "");
}

export async function saveReport(report, out) {
  await mkdir(out, { recursive: true });
  await writeJson(path.join(out, 'report.json'), report);
  await writeFile(path.join(out, 'report.html'), renderHtml(report));
  const rows = comparisonRows(report.pages ?? []);
  await writeFile(path.join(out, 'comparison.csv'), csv([['pagina', 'url', 'status', 'regras_com_alertas', 'ocorrencias', 'inconclusivas', 'jsonld_invalido'], ...rows.map(r => [r.label, r.url, r.status, r.rules, r.occurrences, r.incomplete, r.invalidJsonLd])]));
  const findings = (report.pages ?? []).flatMap(p => (p.findings ?? []).map(f => [p.url ?? p.requestedUrl, f.domain, f.priority, f.confidence, f.title, f.evidence, f.recommendation]));
  await writeFile(path.join(out, 'improvements.csv'), csv([['url', 'dominio', 'prioridade', 'tipo_de_evidencia', 'achado', 'evidencia', 'melhoria'], ...findings]));
  if (report.practices) await writeFile(path.join(out, 'practices.csv'), csv([['pratica', 'titulo', 'observacao_estatica', 'como_averiguar', 'arquivos'], ...report.practices.rows.map(r => [r.id, r.title, r.status, r.verify, r.evidence.map(x => x.file).join('; ')])]));
}
