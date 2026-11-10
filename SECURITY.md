# Segurança

## Como avisar de uma falha

Use o [aviso privado de vulnerabilidade](https://github.com/jvitorcarvalho/jogo-sus/security/advisories/new)
do GitHub. Não abra issue pública para falha de segurança.

## O que o projeto é, do ponto de vista de risco

Um site estático. Não tem servidor de aplicação, banco de dados, login, formulário nem coleta de dados.
A partida salva e o ranking ficam no `localStorage` do navegador de quem joga.

## Como o repositório aberto não alcança o servidor

1. **O GitHub não tem credencial do servidor.** Não existe chave SSH, token ou segredo de deploy
   neste repositório. O servidor é que busca a imagem publicada, de tempos em tempos.
2. **PR de fora roda sem segredo.** O CI usa o evento `pull_request`, com token só de leitura.
   O repositório não usa `pull_request_target`.
3. **Só a `main` publica imagem**, e a `main` só recebe mudança por PR aprovado pelo mantenedor,
   com o CI verde.
4. **As actions são fixadas por SHA**, para uma tag alterada por terceiro não mudar o que roda.
5. **O isolamento do contêiner não mora neste repositório.** O `compose.yml` e o script de
   atualização em uso ficam no servidor, com dono root. Um PR pode mudar o conteúdo da imagem,
   mas não o confinamento em que ela roda.
6. **O contêiner é confinado**: sem root, disco só de leitura, sem capacidades do kernel, sem volume,
   limites de memória, CPU e processos, e rede interna sem saída para a internet.
7. **O navegador também é restrito**: política de conteúdo (CSP) que só aceita arquivos da própria
   origem, sem script ou estilo embutido.

## Dependências

O jogo publicado depende só de React. Dependabot abre PR semanal para npm, actions e imagem base,
e o CodeQL analisa o código a cada PR.
