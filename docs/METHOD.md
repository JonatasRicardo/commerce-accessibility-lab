# Método do instrumento

O instrumento separa **observação técnica**, **resultado comercial divulgado** e **hipótese de impacto**. A execução da ferramenta produz o primeiro tipo de evidência. Sua saída não transforma uma pontuação técnica em vendas, posição de busca ou sucesso de agente.

## Procedimento atual

1. Abrir cada URL em contexto novo de Chromium, com viewport, localidade, movimento reduzido e tempo de espera registrados.
2. Preservar hash SHA-256 do HTML recebido; extrair indicadores do HTML e do DOM após scripts.
3. Executar axe nos grupos `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa`. Registrar contagens completas e até oito exemplos de elementos por regra.
4. Observar papéis e nomes de controles na árvore de acessibilidade e as primeiras dez posições de Tab. A amostra não comprova o fluxo completo por teclado; iframes e componentes dinâmicos exigem revisão.
5. Ler robots.txt por HTTP GET e interpretar regras para os agentes indicados. Uma resposta ausente, falha ou HTML não é tratada como permissão explícita.
6. Gerar ações baseadas nos achados e um relatório com origem e limitações.

HTTP de erro ou página reconhecida como bloqueio não recebe uma auditoria de sucesso. O acesso não é tentado por evasão de CAPTCHA, falsificação de identidade do robô ou utilização de contas autenticadas.

## Unidade de medida

“Regras com alertas” conta regras retornadas em `violations`. “Ocorrências regra-elemento” soma `nodes.length`, registrado como `nodeCount`. Um mesmo elemento pode participar de várias regras. Itens `incomplete` têm contagem própria e não são automaticamente convertidos em falhas.

Não se normalizam esses valores como conformidade, percentual de usuários afetados ou classificação universal entre lojas. Contraste e tamanho de alvo podem depender de estados e exceções que exigem inspeção humana.

## Reprodutibilidade em três níveis

| Nível | Comando | O que pode ser reproduzido |
| --- | --- | --- |
| Análise congelada | `study --mode replay` | Hashes e tabelas derivadas dos arquivos preservados, sem rede |
| Mecanismo local | `microtests` | Nomeação de botões, ação por localizador e correção sintática de JSON demonstrativo |
| Coleta ao vivo | `study --mode live` | Procedimento nas mesmas URLs, com comparação de versões, conteúdo e resultados |

O replay não é reexecução de axe. A coleta ao vivo pode divergir mesmo mantendo ferramentas, porque o site e o contexto mudam. HTML com mesmo hash não garante DOM idêntico: recursos externos, disponibilidade, execução e tempo também influenciam o resultado. O teste mínimo de JSON não contém a descrição integral do produto original.

## Wayback

A API de disponibilidade recebe URL e data desejada. O corpo histórico é buscado no modo `id_`, descompactado quando necessário e examinado estaticamente. São mantidos URL e timestamp efetivamente entregues após redirecionamentos. A ferramenta não confirma automaticamente que a captura é da mesma empresa ou loja; domínio estacionado ou reutilizado deve ser excluído pelo pesquisador.

Ausência de atributo alt é um indicador de presença de marcação. Um alt vazio pode ser apropriado, e um alt não vazio pode ser inadequado. A análise histórica não recompõe integralmente CSS, JavaScript, inventário, ranking ou taxa de conversão.

## Comparação e hipóteses comerciais

Compare páginas da mesma etapa e condições semelhantes. Canonical ausente e ausência de produto em JSON-LD são indicações contextuais: não provam erro, e outros canais como microdados e feeds podem existir. As ações de melhoria devem ser testadas em tarefas completas e, quando houver acesso autorizado, em experimento comercial.

Para medir Google, documentar consulta, região, dispositivo, data, impressões e cliques. Para respostas de IA, definir conjunto de perguntas, versão/configuração, repetições, menções, links e visitas. Conversão precisa de unidades elegíveis, unidades convertidas, período e atribuição. Nenhuma dessas medidas é inferida pelo scanner.

## Fontes primárias

- [W3C — WCAG 2.2](https://www.w3.org/TR/2024/REC-WCAG22-20241212/).
- [W3C — Evaluating Web Accessibility](https://www.w3.org/WAI/test-evaluate/).
- [Playwright — Accessibility testing](https://playwright.dev/docs/accessibility-testing).
- [axe-core 4.10.3](https://github.com/dequelabs/axe-core/tree/v4.10.3).
- [Google — SEO Starter Guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide).
- [Google — Product structured data](https://developers.google.com/search/docs/appearance/structured-data/product).
- [Google — Robots specification](https://developers.google.com/crawling/docs/robots-txt/robots-txt-spec).
- [OpenAI — Crawlers](https://developers.openai.com/api/docs/bots).
- [Internet Archive — Wayback APIs](https://archive.org/help/wayback_api.php).

As fontes contextualizam as regras; versões e páginas de documentação podem evoluir. Para publicação científica, preserve a versão do software, o commit, o conjunto de dados e a data da coleta.
