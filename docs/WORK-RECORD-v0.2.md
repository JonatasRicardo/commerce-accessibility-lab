# Registro da extensão v0.2

## Critérios de aceitação

- Mesmo componente React/Radix nas condições negativa e corrigida, com estado controlado.
- Seleção nativa, indisponibilidade, nome do acionador, foco do modal, Tab, Escape, retorno de foco e mensagem final verificáveis.
- Gate retorna falha para controle negativo e aprovação para os estados válidos.
- Painel antes/depois preserva capturas reais, AX e conteúdo disponível para agentes; não inventa fala ou resposta de IA.
- Recomendações de processo verificáveis por arquivo e opcionalmente pelo run público do mesmo commit.

## Contribuição e evidências

Implementação, documentação e verificação local foram feitas com assistência de IA na mesma sessão Codex, sob instruções do responsável pelo projeto. Não houve revisão independente por outro agente. A skill existente foi ampliada com os novos modos; o desenvolvimento foi conduzido na sessão, sem alegar que a simples presença da skill comprova seu uso por terceiros.

Verificações executadas localmente: lint JSX, TypeScript, testes unitários/CLI, dois testes de navegador, experimento React com 17 asserções e controle negativo. `study/react-practices-v0.2/observations.json` preserva o experimento e hashes de fontes. A CI publica logs e artefatos próprios por commit; conferir a execução vinculada à alteração.

Revisão humana do código e dos resultados: **pendente**, sem aprovação inferida. A publicação pública foi solicitada pelo usuário. Não foram medidas produtividade, lead time, resultados de sprint, vendas ou ranking; não houve execução de tarefas por um modelo de IA. Proteção de branch e implantação não foram configuradas por este trabalho.
