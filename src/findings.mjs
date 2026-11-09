import { indexDirectives } from './extract.mjs';

const A11Y_ACTIONS = {
  'button-name': 'Nomear cada botão pela ação e pelo contexto; verificar o nome computado e executar a ação por teclado.',
  'link-name': 'Fornecer nome acessível que identifique o destino; revisar links compostos apenas por imagem ou ícone.',
  'select-name': 'Associar rótulo ao seletor e verificar se a opção escolhida é anunciada.',
  'label': 'Associar rótulos persistentes aos campos e revisar instruções e mensagens de erro.',
  'aria-valid-attr': 'Corrigir a grafia do atributo ARIA e validar o padrão de interação do componente.',
  'aria-hidden-focus': 'Quando um diálogo estiver fechado, retirar seus controles da navegação e da árvore de acessibilidade; testar abrir, fechar e devolver o foco.',
  'color-contrast': 'Inspecionar contraste e estado real do elemento; distinguir controles inativos e exceções antes de confirmar a falha.',
  'target-size': 'Revisar área acionável, espaçamento e exceções do critério; testar em dispositivo e zoom relevantes.',
  'image-alt': 'Identificar a função da imagem; fornecer descrição útil quando informativa e alt vazio quando decorativa.',
};

export function deriveFindings(result) {
  if (result.status !== 'ok') return [{ id: 'collection-incomplete', domain: 'coleta', priority: 'alta', confidence: 'observado',
    title: 'Coleta incompleta ou página bloqueada', evidence: result.error ?? result.status,
    recommendation: 'Verificar a URL e a resposta registrada. Não interpretar a página de erro como o conteúdo da loja.' }];
  const { source, rendered, response, accessibility, robots } = result;
  const findings = [];
  const add = (id, domain, priority, title, evidence, recommendation, confidence = 'observado') => findings.push({ id, domain, priority, confidence, title, evidence, recommendation });
  for (const violation of accessibility.violations) add(`axe-${violation.id}`, 'acessibilidade', ['critical', 'serious'].includes(violation.impact) ? 'alta' : 'média',
    violation.help, `${violation.nodeCount} ocorrência(s); regra ${violation.id}; impacto da ferramenta: ${violation.impact ?? 'não informado'}.`,
    A11Y_ACTIONS[violation.id] ?? 'Revisar os elementos e o critério apontado; confirmar a barreira em testes manuais.', 'alerta automático; requer revisão');
  if (!rendered.title) add('title-missing', 'SEO', 'alta', 'Título da página ausente', 'Título vazio no DOM renderizado.', 'Adicionar título informativo que identifique conteúdo e produto.');
  if (!rendered.description) add('description-missing', 'SEO', 'média', 'Meta description não encontrada', 'Sem descrição no DOM renderizado.', 'Escrever descrição específica; a exibição do snippet depende do mecanismo.');
  if (!rendered.lang) add('language-missing', 'acessibilidade', 'alta', 'Idioma da página ausente', 'Elemento html sem lang.', 'Definir idioma correspondente ao conteúdo e verificar mudanças de idioma.');
  if (!rendered.h1.length) add('h1-missing', 'estrutura', 'média', 'Título principal não identificado', 'Nenhum h1 no DOM renderizado.', 'Revisar a hierarquia e a identificação da página; não é uma estimativa de posição na busca.');
  if (!rendered.canonicals.length) add('canonical-review', 'SEO', 'média', 'Canonical não encontrada', 'Sem link rel=canonical no DOM renderizado.', 'Revisar variantes e URLs duplicadas; definir a estratégia de canonical quando aplicável.', 'revisão contextual');
  const idx = indexDirectives(rendered.metas, response.headers['x-robots-tag']);
  if (idx.noindex) add('noindex-present', 'SEO', 'alta', 'Instrução noindex encontrada', JSON.stringify(idx.rawMeta) + '; X-Robots-Tag: ' + idx.rawHeader, 'Confirmar se a exclusão é intencional. Não remover em ambientes ou páginas que devem permanecer fora da busca.');
  for (const invalid of rendered.jsonLd.filter(x => !x.valid)) add(`jsonld-invalid-${invalid.index}`, 'agentes e SEO', 'alta', 'JSON-LD com erro de sintaxe', invalid.error, 'Serializar JSON corretamente, preservar os valores comerciais e validar o vocabulário e a correspondência com a oferta visível.');
  if (!rendered.products.length) add('product-channel-review', 'agentes e SEO', 'média', 'Product/ProductGroup não encontrado em JSON-LD', 'Nenhum objeto desses tipos nos blocos JSON-LD válidos.', 'Se esta for uma página de produto, verificar JSON-LD, microdados e feeds. Ausência neste canal não exclui outras integrações.', 'revisão contextual');
  if (rendered.products.some(p => !p.name)) add('product-name-missing', 'agentes e SEO', 'alta', 'Objeto de produto sem nome', 'Um ou mais objetos de produto não têm name.', 'Identificar o produto e validar os dados estruturados com a documentação do mecanismo.');
  if (rendered.products.some(p => p.offers.some(o => o.price !== null && !o.priceCurrency))) add('currency-missing', 'agentes e SEO', 'alta', 'Preço estruturado sem moeda', 'Oferta com price e sem priceCurrency.', 'Publicar moeda e preço coerentes com a oferta apresentada.');
  for (const agent of robots.agents.filter(a => a.allowedByFile === false && ['Googlebot', 'OAI-SearchBot'].includes(a.agent))) add(`robots-${agent.agent}`, 'descoberta', 'alta', `${agent.agent} não permitido pelo arquivo`, `robots.txt, linha ${agent.matchingLine ?? 'não determinada'}.`, 'Confirmar a política de rastreamento desejada; permissões não asseguram indexação ou recomendação.');
  if (!robots.available) add('robots-unavailable', 'descoberta', 'média', 'robots.txt não pôde ser avaliado', `HTTP ${robots.status ?? 'indisponível'}; ${robots.error ?? ''}`, 'Verificar a resposta e sua interpretação pelo mecanismo. A ferramenta preserva o resultado como indeterminado.', 'coleta parcial');
  if (!source.products.length && rendered.products.length) add('product-js-dependent', 'agentes e SEO', 'média', 'Produto apareceu apenas após execução de scripts', 'Sem Product/ProductGroup no HTML recebido, mas presente no DOM renderizado.', 'Verificar quais consumidores executam JavaScript e manter os canais de dados atualizados.', 'dependência observada; efeito não medido');
  const rank = { alta: 0, 'média': 1, baixa: 2 };
  return findings.sort((a, b) => rank[a.priority] - rank[b.priority]);
}
