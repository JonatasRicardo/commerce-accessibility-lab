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

## Desenvolvimento React e duas versões visuais

- Inspeção local, sem executar código do repositório examinado: `practices --repo PASTA`. Opcional: `--ci-run https://github.com/OWNER/REPO/actions/runs/ID`. Diferencie configuração observada, run do mesmo commit limpo, artefato disponível e revisão humana.
- Prevenção para React numa auditoria: `audit URL --profile react`. As sugestões não identificam a stack do site nem comprovam seu processo.
- Experimento React, na raiz do instrumento: `npm run react:verify -- --out PASTA`. Gera capturas antes/depois, árvore AX e conteúdo disponível para agentes, além dos estados e controles negativos.
- Regra executável para CI: `gate REPORT.json --policy policies/accessibility-gate.json`. Exige coleta recente e completa; retorna erro quando reprovada. Não use replay para alegar nova aprovação de CI.
- Para um site corrigido, preserve uma auditoria antes e outra depois; use `compare ANTES.json DEPOIS.json`. Relatórios novos incorporam capturas e canais observados. Registros antigos sem essas evidências mostram a ausência, sem reconstrução fictícia.

A aparência visual, a árvore de acessibilidade e os canais de um agente são observações distintas. AX não é transcrição de leitor de tela; HTML/DOM/JSON-LD não são resposta de IA. Um agente pode usar pixels, DOM, AX ou outros canais. Não afirme sucesso de LLM com base no localizador Playwright. Não altere páginas de terceiros para apresentar uma correção como implantação real. Use o exemplo local para demonstrar mecanismos.

No ciclo ágil, seguir `AGENTS.md`, critérios da tarefa e `docs/AGILE-ACCESSIBILITY.md`. Registrar contribuição real e revisão pendente; se uma sessão implementar e verificar, declarar o mesmo responsável, sem inventar independência ou métricas de produtividade.
