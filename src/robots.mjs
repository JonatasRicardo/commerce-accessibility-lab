import robotsParser from 'robots-parser';

export const AGENTS = ['Googlebot', 'OAI-SearchBot', 'GPTBot', 'ChatGPT-User'];
export function evaluateRobots({ text = '', status, url, error = null }, targetUrl) {
  const isHtml = /<!doctype\s+html|<html[\s>]/i.test(text);
  const available = status >= 200 && status < 300 && !isHtml;
  // A 404 or inaccessible response is a distinct condition; neither is labelled "explicitly allowed".
  const parser = available ? robotsParser(url, text) : null;
  const explicit = [...text.matchAll(/^\s*user-agent\s*:\s*([^#\r\n]+)/gim)].map(x => x[1].trim().toLowerCase());
  return { url, status: status ?? null, error: error ?? (isHtml ? 'A resposta de robots.txt contém HTML; regras não interpretadas.' : null), available, agents: AGENTS.map(agent => ({ agent,
    allowedByFile: parser ? parser.isAllowed(targetUrl, agent) ?? null : null,
    explicitGroup: explicit.includes(agent.toLowerCase()),
    matchingLine: parser ? parser.getMatchingLineNumber(targetUrl, agent) ?? null : null,
  })), note: 'Regras do arquivo; não comprovam acesso de rede, indexação ou recomendação. ChatGPT-User não é o rastreador de busca.' };
}
