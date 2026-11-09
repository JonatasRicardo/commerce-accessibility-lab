import { extractHtml } from './extract.mjs';
import { getText } from './network.mjs';
import { VERSION, SCHEMA, sha256, validateUrl } from './core.mjs';

export async function inspectArchive(input, at, { currentStatic, fetchText = getText } = {}) {
  const url = validateUrl(input);
  if (!/^\d{4}(\d{2}){0,5}$/.test(at) || at.length > 14) throw new Error('Use uma data Wayback com 4 a 14 dígitos, por exemplo 20240101.');
  const apiUrl = `https://archive.org/wayback/available?${new URLSearchParams({ url, timestamp: at })}`;
  const response = await fetchText(apiUrl);
  if (response.status !== 200) return { schema: SCHEMA, toolVersion: VERSION, kind: 'archive', createdAt: new Date().toISOString(),
    scope: 'Consulta histórica não concluída; não há contagem de falhas ou avaliação da loja.',
    archive: { requestedUrl: url, requestedAt: at, apiUrl, apiStatus: response.status,
      error: `API do Wayback retornou HTTP ${response.status}. ${response.status === 429 ? 'Limite de requisições; nenhuma nova tentativa automática foi feita.' : 'Captura não obtida.'}` } };
  const availability = JSON.parse(response.text);
  const closest = availability.archived_snapshots?.closest;
  const archive = { requestedUrl: url, requestedAt: at, apiUrl, availability };
  if (!closest?.available) archive.error = 'Nenhuma captura disponível foi retornada. Não há contagens históricas.';
  else {
    archive.snapshotUrl = closest.url.replace(/^http:/, 'https:');
    archive.rawUrl = archive.snapshotUrl.replace(`/web/${closest.timestamp}/`, `/web/${closest.timestamp}id_/`);
    const fetched = await fetchText(archive.rawUrl, { timeoutMs: 45000 });
    archive.effectiveUrl = fetched.url;
    archive.effectiveTimestamp = fetched.url.match(/\/web\/(\d{4,14})/)?.[1] ?? null;
    archive.httpStatus = fetched.status;
    if (fetched.status !== 200) archive.error = `A captura retornou HTTP ${fetched.status}; não foi interpretada como loja.`;
    else {
      const extracted = extractHtml(fetched.text, url);
      if (!extracted.title && !extracted.static.images && !extracted.static.buttons) archive.error = 'Corpo não reconhecido como HTML útil; nenhuma contagem foi interpretada.';
      else { archive.title = extracted.title; archive.sourceSha256 = sha256(fetched.text); archive.static = extracted.static; archive.currentStatic = currentStatic ?? null; }
    }
  }
  return { schema: SCHEMA, toolVersion: VERSION, kind: 'archive', createdAt: new Date().toISOString(),
    scope: 'Inspeção estática de captura histórica; exige confirmação de domínio, identidade e data efetiva.', archive };
}
