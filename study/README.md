# Conjunto preservado do estudo inicial

Observações de páginas públicas de Unhidden, PELAGIC e Wolverine coletadas em **8 de novembro de 2026, America/Sao_Paulo**. Os timestamps UTC podem indicar 9 de novembro. Existem seis registros: página inicial e página de produto físico por loja.

Os arquivos foram preparados como evidências de um manuscrito exploratório inicial; não se afirma publicação ou revisão por pares. São dados derivados de inspeção pública, e não analytics privados das lojas.

- `baseline/audit-results.json`: alertas, metadados, exemplos de elementos e hashes do HTML consultado. Nenhuma página inteira é incluída.
- `baseline/historical-static-comparison.json`: quatro capturas históricas válidas e as três páginas iniciais atuais, examinadas como HTML estático.
- `baseline/local-remediation-results.json`: resultados originais dos testes de correção.
- `expected-results.json`: seis linhas que a análise deve reconstruir.
- `manifest.json`: hashes dos arquivos preservados. A verificação detecta mudança em relação ao conjunto distribuído, sem equivaler a autenticação independente dos sites.

O código do instrumento é uma implementação nova e independente. O modo replay lê os registros e recompõe as contagens; não usa o navegador para reproduzir o passado. Os microtestes da ferramenta reconstroem os mecanismos com exemplos mínimos e não são o payload comercial integral original.

As consultas históricas efetivamente utilizadas foram PELAGIC em 11/12/2022 e 25/12/2024; Wolverine em 13/01/2023; e Unhidden, no domínio anterior unhiddenclothing.com, em 10/01/2024. O domínio unhidden.com de uma captura de 2022 não correspondia à loja e foi excluído.

O clone não contém o banco, código ou documentos internos do projeto usado como inspiração de organização do manuscrito. Os registros não permitem estimar conversão, tráfego ou posição de busca dessas lojas.
