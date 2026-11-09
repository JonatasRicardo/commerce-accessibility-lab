import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import tsParser from '@typescript-eslint/parser';
import { parse as parseYaml } from 'yaml';
import { SCHEMA, VERSION, sha256 } from './core.mjs';
import { getText } from './network.mjs';

export const PRACTICES = [
  { id: 'BP01', title: 'Componentes e bibliotecas com recursos de acessibilidade', verify: 'Dependência + importação no código são indícios de integração. Nome, semântica e comportamento da aplicação precisam ser testados.' },
  { id: 'BP02', title: 'Análise estática de acessibilidade no JSX', verify: 'Plugin, configuração e comando de lint precisam estar conectados. A configuração não prova que o lint foi executado.' },
  { id: 'BP03', title: 'Testes de estados, teclado e foco', verify: 'Identificar testes comportamentais. Somente execução registrada comprova os cenários efetivamente exercitados.' },
  { id: 'BP04', title: 'Regra de acessibilidade no CI/CD', verify: 'Conferir comando do gate, política e fluxo de CI. Job reprovado só impede merge se houver regras de proteção correspondentes.' },
  { id: 'BP05', title: 'Preservação de evidências e versões', verify: 'Conferir lockfile, artefatos configurados e hashes. Artefatos disponíveis do run são evidência adicional; não garantem integridade futura de todo o processo.' },
  { id: 'BP06', title: 'Skills e instruções para agentes', verify: 'Arquivos registram um protocolo. Presença no repositório não comprova uso, independência dos agentes ou qualidade das alterações.' },
  { id: 'BP07', title: 'Critérios de aceitação e revisão no ciclo ágil', verify: 'Critérios e registro de trabalho são documentos observáveis. Execução declarada, revisão humana e resultados de sprint devem ser distinguidos.' },
];
const LIBRARIES = ['@radix-ui/react-dialog', 'radix-ui', 'react-aria', 'react-aria-components', '@react-aria/button', '@mui/material', '@headlessui/react', '@ariakit/react', '@chakra-ui/react', '@base-ui/react'];
const SKIP = new Set(['node_modules', '.git', 'reports', '.next', 'dist', 'build', 'coverage', '.cache']);
const EXT = /\.(?:[cm]?js|jsx|ts|tsx|json|ya?ml|md|lock)$/;

function git(root, args) { try { return execFileSync('git', ['-C', root, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 1_000_000 }).trim(); } catch { return null; } }
function walkAst(node, visit) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) { node.forEach(n => walkAst(n, visit)); return; }
  if (node.type) visit(node);
  for (const [key, value] of Object.entries(node)) if (!['parent', 'tokens', 'comments', 'loc', 'range'].includes(key)) walkAst(value, visit);
}
function parseSource(text, filename) {
  const imports = [], calls = [];
  const tree = tsParser.parse(text, { sourceType: 'module', ecmaVersion: 'latest', ecmaFeatures: { jsx: true }, filePath: filename, loc: true });
  walkAst(tree, node => {
    if (node.type === 'ImportDeclaration') imports.push({ value: node.source.value, line: node.loc.start.line });
    if (node.type === 'CallExpression') {
      if (node.callee.type === 'MemberExpression' && !node.callee.computed) calls.push({ name: node.callee.property.name, line: node.loc.start.line });
    }
  });
  return { imports, calls };
}
async function filesAt(root) {
  const files = [], limitations = [];
  async function visit(dir, depth = 0) {
    if (depth > 7 || files.length >= 1500) { limitations.push('Limite de profundidade ou quantidade de arquivos atingido.'); return; }
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      if (files.length >= 1500) { limitations.push('Limite de quantidade de arquivos atingido.'); break; }
      if (SKIP.has(entry.name) || entry.name.startsWith('.env')) continue;
      const full = path.join(dir, entry.name);
      if (entry.isSymbolicLink()) { limitations.push(`Link simbólico não seguido: ${path.relative(root, full)}`); continue; }
      if (entry.isDirectory()) await visit(full, depth + 1);
      else if (EXT.test(entry.name)) {
        const size = (await stat(full)).size;
        if (size <= 500000) files.push({ file: path.relative(root, full).split(path.sep).join('/'), text: await readFile(full, 'utf8') });
        else limitations.push(`Arquivo grande não analisado: ${path.relative(root, full)}`);
      }
    }
  }
  await visit(root); return { files, limitations };
}

export async function inspectPractices(directory, { ciRunUrl, fetchText = getText } = {}) {
  const root = path.resolve(directory);
  const { files, limitations } = await filesAt(root);
  const byName = new Map(files.map(f => [f.file, f]));
  const packageFiles = files.filter(f => /(^|\/)package\.json$/.test(f.file));
  const declared = [], scriptEntries = [];
  for (const f of packageFiles) {
    try {
      const pkg = JSON.parse(f.text);
      for (const [name, version] of Object.entries({ ...pkg.dependencies, ...pkg.devDependencies })) declared.push({ file: f.file, name, version });
      for (const [name, command] of Object.entries(pkg.scripts ?? {})) scriptEntries.push({ file: f.file, name, command });
    } catch { limitations.push(`JSON não analisado: ${f.file}`); }
  }
  const sources = [];
  for (const f of files.filter(f => /\.(?:[cm]?js|jsx|ts|tsx)$/.test(f.file))) {
    try { sources.push({ file: f.file, ...parseSource(f.text, f.file) }); }
    catch { limitations.push(`Sintaxe não analisada: ${f.file}`); }
  }
  const libraries = declared.filter(d => LIBRARIES.some(l => d.name === l || d.name.startsWith('@radix-ui/') || d.name.startsWith('@react-aria/')));
  const libraryImports = sources.flatMap(s => s.imports.filter(i => libraries.some(l => i.value === l.name || i.value.startsWith(l.name + '/'))).map(i => ({ file: s.file, line: i.line, detail: `Importação de ${i.value}` })));
  const lintImports = sources.filter(s => /eslint\.config\./.test(s.file)).flatMap(s => s.imports.filter(i => i.value === 'eslint-plugin-jsx-a11y').map(i => ({ file: s.file, line: i.line, detail: 'Plugin de JSX acessível importado na configuração' })));
  const testSources = sources.filter(s => /(?:\.test\.|\.spec\.|(?:^|\/)verify[-/])/.test(s.file));
  const behavioral = testSources.flatMap(s => s.calls.filter(c => ['getByRole', 'press', 'focus', 'isDisabled'].includes(c.name)).map(c => ({ file: s.file, line: c.line, detail: `Chamada ${c.name} em instrumento/teste` })));
  const workflowSteps = [], workflowFiles = [];
  for (const f of files.filter(f => /^\.github\/workflows\/.*\.ya?ml$/.test(f.file))) {
    try {
      const y = parseYaml(f.text, { maxAliasCount: 30 });
      workflowFiles.push(f.file);
      for (const [job, value] of Object.entries(y?.jobs ?? {})) for (const step of value.steps ?? []) workflowSteps.push({ file: f.file, job, name: step.name ?? step.run ?? step.uses,
        run: typeof step.run === 'string' ? step.run : '', uses: typeof step.uses === 'string' ? step.uses : '',
        bypass: !!value['continue-on-error'] || !!step['continue-on-error'] || /\|\|\s*(?:true|exit\s+0)/.test(step.run ?? '') });
    } catch { limitations.push(`Workflow YAML não analisado: ${f.file}`); }
  }
  const expandScript = command => {
    const names = [...command.matchAll(/npm\s+run\s+([\w:-]+)/g)].map(m => m[1]);
    return command + '\n' + names.map(n => scriptEntries.find(s => s.name === n)?.command ?? '').join('\n');
  };
  const gateSteps = workflowSteps.filter(s => /commerce-audit\.mjs\s+gate\b|\baccessibility-gate\b/.test(expandScript(s.run)));
  const uploadSteps = workflowSteps.filter(s => /^actions\/upload-artifact@/.test(s.uses));
  const skillFiles = files.filter(f => /(?:^|\/)SKILL\.md$/.test(f.file));
  const agentFile = byName.get('AGENTS.md');
  const prTemplate = byName.get('.github/PULL_REQUEST_TEMPLATE.md');
  const agileDoc = byName.get('docs/AGILE-ACCESSIBILITY.md');
  const workflowEvidence = step => ({ file: step.file, detail: `${step.job}: ${step.name}${step.bypass ? ' (há tolerância explícita a falha)' : ''}` });
  const row = (id, configured, evidence, missing, partial = false) => ({ ...PRACTICES.find(p => p.id === id),
    status: configured ? 'configuração observada' : partial ? 'indícios parciais' : 'não encontrado no recorte',
    evidence, missing: configured ? [] : missing,
    execution: 'Não comprovada pela presença dos arquivos.' });
  const rows = [
    row('BP01', libraries.length && libraryImports.length, [...libraries.map(d => ({ file: d.file, detail: `${d.name}: ${d.version}` })), ...libraryImports], ['Verificar dependência, importação e comportamento da aplicação.'], !!libraries.length),
    row('BP02', lintImports.length && scriptEntries.some(s => /eslint/.test(s.command)), lintImports, ['Conectar plugin, configuração e comando de lint.']),
    row('BP03', behavioral.some(e => e.detail.includes('getByRole')) && behavioral.some(e => e.detail.includes('press')), behavioral.slice(0, 14), ['Verificar cenários de interação e resultado da execução.'], !!behavioral.length),
    row('BP04', gateSteps.some(s => !s.bypass), gateSteps.map(workflowEvidence), ['Configurar um gate real de acessibilidade sem tolerância explícita à falha.'], !!gateSteps.length),
    row('BP05', uploadSteps.length && files.some(f => /(?:package-lock\.json|pnpm-lock\.yaml|yarn\.lock)$/.test(f.file)), uploadSteps.map(workflowEvidence), ['Preservar versões e artefatos do processo.'], !!uploadSteps.length),
    row('BP06', skillFiles.length && agentFile, [...skillFiles.map(f => ({ file: f.file, detail: 'Instruções de skill presentes; uso não inferido.' })), ...(agentFile ? [{ file: 'AGENTS.md', detail: 'Protocolo para agentes presente.' }] : [])], ['Documentar papéis, limites e evidências; registrar uso real separadamente.'], !!skillFiles.length),
    row('BP07', prTemplate && agileDoc, [prTemplate, agileDoc].filter(Boolean).map(f => ({ file: f.file, detail: 'Critérios de aceitação e protocolo de revisão documentados.' })), ['Definir critérios de aceitação e registrar revisão e evidências reais.'], !!(prTemplate || agileDoc)),
  ];
  const commit = git(root, ['rev-parse', 'HEAD']);
  const dirty = git(root, ['status', '--porcelain']);
  const dirtyState = dirty === null ? null : !!dirty;
  let ciEvidence = null;
  if (ciRunUrl) ciEvidence = await inspectCiRun(ciRunUrl, { expectedCommit: commit, dirty: dirtyState !== false, fetchText });
  return { schema: SCHEMA, toolVersion: VERSION, kind: 'repository-practices', createdAt: new Date().toISOString(),
    scope: 'Inspeção estática de um repositório React e evidência opcional de execução pública de CI. Configuração não demonstra adoção, conformidade ou causalidade.',
    practices: { repositoryName: path.basename(root), commit, workingTreeDirty: dirtyState, scannedFiles: files.length,
      limitations: [...new Set(limitations)], libraries, workflowFiles, rows, ciEvidence,
      evidenceHashes: [...new Set(rows.flatMap(r => r.evidence.map(e => e.file)))].map(file => ({ file, sha256: sha256(byName.get(file)?.text ?? '') })),
      humanReview: 'Não inferida. Conferir registros e autoria de revisão separadamente.',
      branchProtection: 'Não avaliada; um workflow aprovado ou reprovado não comprova regras de merge.' } };
}

export async function inspectCiRun(url, { expectedCommit, dirty = false, fetchText = getText } = {}) {
  const match = String(url).match(/^https:\/\/github\.com\/([\w.-]+)\/([\w.-]+)\/actions\/runs\/(\d+)\/?$/);
  if (!match) throw new Error('--ci-run exige uma URL pública de execução do GitHub Actions.');
  const [, owner, repo, id] = match;
  const root = `https://api.github.com/repos/${owner}/${repo}/actions/runs/${id}`;
  try {
    const runResponse = await fetchText(root);
    if (runResponse.status !== 200) return { url, error: `GitHub retornou HTTP ${runResponse.status}; execução não verificada.` };
    const run = JSON.parse(runResponse.text);
    const jobsResponse = await fetchText(`${root}/jobs?per_page=100`);
    const jobsData = jobsResponse.status === 200 ? JSON.parse(jobsResponse.text) : null;
    const artifactsResponse = await fetchText(`${root}/artifacts?per_page=100`);
    const artifacts = artifactsResponse.status === 200 ? JSON.parse(artifactsResponse.text) : null;
    const matchesCommit = !!expectedCommit && run.head_sha === expectedCommit;
    return { url: run.html_url, status: run.status, conclusion: run.conclusion, headSha: run.head_sha, workflowPath: run.path,
      matchesCommit, workingTreeDirty: dirty,
      interpretation: matchesCommit && !dirty ? 'Execução corresponde ao commit local limpo; conferir cobertura e etapas.' : 'Execução não valida a árvore local atual: commit diferente ou alterações locais presentes.',
      jobs: jobsData?.jobs?.map(j => ({ name: j.name, conclusion: j.conclusion, steps: j.steps?.map(s => ({ name: s.name, status: s.status, conclusion: s.conclusion })) })) ?? [],
      jobsTruncated: !!jobsData && jobsData.total_count > jobsData.jobs.length,
      artifacts: artifacts?.artifacts?.map(a => ({ name: a.name, expired: a.expired, sizeInBytes: a.size_in_bytes, digest: a.digest ?? null })) ?? [],
      artifactListUnavailable: !artifacts,
      note: 'Metadados de CI observados na API; não são revisão humana, inspeção do conteúdo de cada artefato ou prova de implantação.' };
  } catch (error) { return { url, error: error.message }; }
}

export function reactPrevention(findings) {
  const ids = new Set(findings.map(f => f.id));
  const relevance = ids.size ? ['BP01', 'BP02', 'BP03', 'BP04', 'BP06', 'BP07'] : ['BP03', 'BP04', 'BP07'];
  return { profile: 'react', observedStack: false,
    note: 'Propostas para uma implementação React; a tecnologia, dependências e processo do site não foram inferidos da página publicada.',
    practices: PRACTICES.filter(p => relevance.includes(p.id)).map(p => ({ id: p.id, title: p.title, verify: p.verify,
      status: 'proposta; requer código/configuração e evidência de execução' })) };
}
