---
name: commerce-accessibility-audit
description: Avalia páginas de e-commerce em acessibilidade automatizada, SEO técnico e legibilidade para agentes; compara concorrentes e reproduz os registros do estudo Commerce Accessibility Lab.
---

# Auditoria de e-commerce

Use o instrumento deste repositório para gerar relatório em português com evidências, gráficos e melhorias. Escolha o modo conforme o pedido; não substitua uma avaliação solicitada por uma explicação genérica.

O launcher é `scripts/run.mjs`, ao lado desta skill. Ele encontra o clone pela instalação vinculada ou por `COMMERCE_AUDIT_ROOT`. Se as dependências não existirem, na raiz do clone execute `npm ci` e `npx playwright install chromium`.

## Modos

- Uma página: `node <pasta-da-skill>/scripts/run.mjs audit URL --out PASTA`.
- Concorrente: acrescente `--competitor URL`; escolha a mesma etapa da jornada e explicite diferenças de contexto.
- Registros do artigo: `study --mode replay`. Confere integridade e recompõe as tabelas, sem nova coleta.
- Nova coleta nas seis páginas: `study --mode live`. Preserva a comparação com a referência; divergências são esperadas em sites dinâmicos.
- Correções locais: `microtests`. Verifica nomeação/ação de botões e sintaxe JSON em reprodução mínima.
- Código antigo: `archive URL --at AAAAMMDD`. Confirme a identidade da loja e a data efetivamente entregue. `--current REPORT.json` compara indicadores estáticos da mesma URL.
- Antes/depois salvo: `compare REPORT-A.json REPORT-B.json`.

Use uma pasta de saída nova. Leia `report.json` para separar observação, alerta automático e revisão contextual. Entregue o link local para `report.html`, as melhorias prioritárias e a evidência que sustenta cada uma. Os CSV permitem reaproveitar os resultados em artigo ou planilha.

## Interpretação

Zero alertas não certifica WCAG. Uma coleta bloqueada não significa zero falhas. Contagens brutas não classificam a qualidade global de lojas distintas. Nomes de controles e JSON-LD legível não provam sucesso de um LLM. Permissões de robôs não provam indexação ou recomendação.

Não estime conversão privada, posição real no Google ou frequência de recomendação do ChatGPT a partir de HTML. Quando o usuário fornecer dados comerciais autorizados, use `--analytics arquivo.json` e preserve unidade, período, origem e atribuição. Diferencie os benchmarks publicados dos resultados próprios.

Para detalhes de instrumentos e limites, consulte `docs/METHOD.md` na raiz do clone. A skill opera o avaliador local; publicar relatórios ou alterar sites exige estar no escopo solicitado pelo usuário.
