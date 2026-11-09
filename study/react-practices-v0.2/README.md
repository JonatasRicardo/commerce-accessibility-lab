# Experimento local React, v0.2

Observações reais de uma loja fictícia executada localmente em 9 de novembro de 2026 (timestamps UTC nos dados). Não são uma intervenção nas lojas públicas da amostra original. `observations.json` inclui versões, estados, asserções, capturas embutidas, canais de leitura e hashes dos arquivos do experimento; as imagens PNG também estão separadas. Portas locais mudam entre execuções.

Resultado preservado: 17 asserções aprovadas; três estados válidos sem alertas no recorte do axe; controle negativo com uma ocorrência crítica `button-name`, rejeitado pelo gate. O mesmo ícone e biblioteca foram mantidos: a comparação dos PNG decodificados registra 2 pixels diferentes em 1.440.000, dentro da tolerância explícita de 16 pixels. Os hashes brutos distintos são preservados. O localizador Playwright por papel/nome encontrou 0 alvos antes e 1 depois. São asserções correlacionadas de um único cenário, não 17 participantes ou experimentos independentes. Não houve execução de LLM, leitor de tela ou participantes humanos.

Reexecutar com `npm ci`, `npx playwright install chromium` e `npm run react:verify -- --out reports/repeticao`. Dados antigos não passam no gate como coleta recente. `npm test` verifica a integridade e os resultados preservados. As figuras 7–9 podem ser regeneradas com `python3 -m pip install -r scripts/figure-requirements.txt` e `python3 scripts/render-react-figures.py`.

Código e dados novos são uma extensão; os registros originais em `study/baseline` permanecem preservados. CI, publicação e revisão humana têm registros próprios e não são inferidos deste arquivo.
