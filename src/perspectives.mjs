import { extractHtml } from './extract.mjs';
import { sha256 } from './core.mjs';

// These are observed channels, never a transcript of a screen reader or model reasoning.
export async function capturePerspectives(page, { screenshot, rawHtml = '', tree } = {}) {
  if (!tree) {
    const session = await page.context().newCDPSession(page);
    try { tree = await session.send('Accessibility.getFullAXTree'); }
    finally { await session.detach(); }
  }
  const nodes = tree.nodes.filter(n => !n.ignored);
  const roles = new Set(['button', 'combobox', 'searchbox', 'textbox', 'checkbox', 'radio', 'link', 'heading', 'dialog', 'status', 'option']);
  const relevant = nodes.filter(n => roles.has(n.role?.value));
  const axRows = relevant.slice(0, 160).map(n => ({ role: n.role.value, name: n.name?.value ?? '',
    properties: (n.properties ?? []).filter(p => ['disabled', 'expanded', 'selected', 'required', 'modal', 'level', 'value'].includes(p.name)).map(p => ({ name: p.name, value: p.value?.value })) }));
  const dom = await page.evaluate(() => ({ text: (document.body.innerText ?? '').slice(0, 16000),
    controls: [...document.querySelectorAll('button,input,select,[role=button]')].slice(0, 20).map(el => el.outerHTML.slice(0, 1500)),
    textTruncated: (document.body.innerText ?? '').length > 16000,
    jsonLd: [...document.querySelectorAll('script[type="application/ld+json"]')].slice(0, 10).map(s => s.textContent.slice(0, 5000)) }));
  const image = screenshot ?? await page.screenshot({ fullPage: false, animations: 'disabled', caret: 'hide' });
  return { capturedAt: new Date().toISOString(), viewport: page.viewportSize(), url: page.url(),
    screenshotDataUrl: 'data:image/png;base64,' + image.toString('base64'), screenshotSha256: sha256(image),
    axRows, axTruncated: relevant.length > axRows.length, axTotalRelevant: relevant.length,
    dom, initialHtml: rawHtml ? { textSample: extractHtml(rawHtml, page.url()).textSample } : null, sourceHtmlSha256: sha256(rawHtml), sourceHtmlProvided: Boolean(rawHtml),
    note: 'Captura visual do viewport; árvore AX observada no Chromium; texto do DOM após JavaScript e blocos JSON-LD. Não é fala de leitor de tela nem resposta de um agente de IA. Diferentes agentes podem usar canais diferentes.' };
}

export function pairPerspectives(before, after) {
  return (after.pages ?? []).map(p => {
    const previous = (before.pages ?? []).find(q => (p.url && q.url === p.url) || (p.id && q.id === p.id));
    return { title: p.label ?? p.id, before: previous?.perspectives ?? null, after: p.perspectives ?? null,
      note: previous ? 'Registros fornecidos como antes/depois; alterações de conteúdo ou ambiente podem explicar diferenças. Confira datas, hashes e configurações.' : 'Página sem referência correspondente; visão anterior indisponível.' };
  });
}
