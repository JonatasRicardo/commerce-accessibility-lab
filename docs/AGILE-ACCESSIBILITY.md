# Boas práticas verificáveis no desenvolvimento React

O objetivo é transformar cada recomendação em uma hipótese de trabalho, um critério de aceitação e uma evidência. O avaliador de página identifica barreiras observáveis; `practices --repo` examina artefatos do repositório. Um modo não substitui o outro.

## Matriz de práticas e averiguação

| ID | Prática | Evidência verificável | O que continua fora da inferência |
| --- | --- | --- | --- |
| BP01 | Reutilizar componentes com recursos de acessibilidade | Dependência, importação e teste de integração de estados | Biblioteca instalada não assegura nomeação ou conformidade da aplicação |
| BP02 | Lint de JSX com regras de acessibilidade | Plugin, configuração, comando e resultado de execução | Análise estática não cobre todos os estados e comportamentos |
| BP03 | Testar teclado, foco, nomes e mensagens | Ações e asserções com papel/nome; estado final; logs | Teste automatizado não equivale a avaliação com pessoas |
| BP04 | Colocar acessibilidade na CI antes da entrega | Política versionada, comando do gate, código de saída e execução | Job vermelho só bloqueia merge se houver proteção configurada |
| BP05 | Preservar evidências e versões | Lockfile, hash, commit e artefato do run | Artefato listado não demonstra todas as conclusões de seu conteúdo |
| BP06 | Orientar skills e agentes por critérios verificáveis | SKILL.md, AGENTS.md e registro de contribuição real | Arquivos não provam uso, produtividade ou revisão independente |
| BP07 | Incluir acessibilidade na definição de pronto | Critérios da tarefa, evidências anexadas e revisão registrada | Template preenchido não comprova execução nem aprovação humana |

## Ciclo de trabalho proposto

1. **Refinamento:** identificar público, jornada e estados; escrever os critérios de aceitação.
2. **Implementação:** agente/desenvolvedor propõe uma mudança pequena e rastreável; prefere HTML semântico e componentes adequados ao padrão.
3. **Verificação:** lint, tipos, testes de interação e axe; asserções no estado final. O mesmo agente pode executar os dois papéis, mas isso deve ser informado.
4. **CI:** executar o gate em estados próprios de teste; preservar a política e o resultado. Não ocultar falhas com tolerância incondicional.
5. **Revisão:** conferir evidências e limites; registrar revisão humana quando efetivamente realizada. Decisões e exceções são vinculadas à tarefa.
6. **Entrega e acompanhamento:** promover a versão somente segundo as regras do projeto. Avaliar incidentes e resultados com dados reais, sem atribuir automaticamente melhoria a agentes ou bibliotecas.

Essas etapas são um protocolo proposto, não uma medição de adoção em sprints ou um sistema que executa agentes adicionais. Para investigar produtividade, medir previamente lead time, defeitos que escapam, retrabalho e contribuição dos agentes em amostra e desenho apropriados.

## Exemplo React executável

`examples/react-storefront` usa React, um seletor HTML nativo e Radix Dialog. `npm run react:verify` verifica seleção de tamanho, opção esgotada, abertura por Enter, foco contido no diálogo, Escape, retorno de foco e mensagem de estado. O gate é aplicado a três estados válidos.

O controle negativo mantém a mesma biblioteca e remove o nome útil do acionador. Ele deve falhar em `button-name` e ser rejeitado pelo gate. O teste mostra uma responsabilidade da integração; não compara Radix com React Aria, Material UI ou outras bibliotecas.

As fontes oficiais de [Radix](https://www.radix-ui.com/primitives/docs/overview/accessibility), [React Aria](https://react-aria.adobe.com/quality) e [Material UI](https://mui.com/material-ui/getting-started/accessibility/) ajudam a decidir quais responsabilidades são fornecidas pelo componente e quais permanecem na aplicação. Verificar documentação, versão, composição e cobertura do componente utilizado. Nenhuma dessas escolhas é uma certificação da loja inteira.

## Gate e revisão

```bash
npm run lint:a11y
npm run typecheck
npm run react:verify
node bin/commerce-audit.mjs gate reports/react-practices/states-accessible.json \
  --policy policies/accessibility-gate.json --out reports/decision
```

A política inicial admite zero ocorrências críticas e sérias no recorte testado e rejeita coletas ausentes, antigas, incompletas ou replay. Moderadas, menores e inconclusivas permanecem visíveis. Aprovação não garante WCAG completa, entrega em produção ou proteção de branch.

## Referências de implementação

- [React useId](https://react.dev/reference/react/useId): IDs para relacionar controles, rótulos e descrições.
- [WAI-ARIA APG, diálogo modal](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/): comportamento de foco e teclado.
- [eslint-plugin-jsx-a11y](https://github.com/jsx-eslint/eslint-plugin-jsx-a11y): regras estáticas para JSX; componentes customizados podem exigir configuração adicional.
- [Playwright, testes de acessibilidade](https://playwright.dev/docs/accessibility-testing): combinar detecção automática e avaliação manual.
- [Storybook, testes de acessibilidade](https://storybook.js.org/docs/writing-tests/accessibility-testing): alternativa para equipes que já testam componentes isoladamente; não é dependência deste exemplo.

As versões do exemplo estão fixadas no lockfile para reprodução. ESLint 9 foi escolhido pela compatibilidade declarada do plugin usado; atualização de ferramentas deve ser validada como uma mudança do instrumento, sem presumir que uma versão posterior reproduzirá exatamente o mesmo resultado.
