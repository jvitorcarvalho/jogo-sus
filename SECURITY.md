# Segurança

## Como avisar de uma falha

Use o [aviso privado de vulnerabilidade](https://github.com/jvitorcarvalho/jogo-sus/security/advisories/new)
do GitHub. Não abra issue pública para falha de segurança.

## O que o projeto é, do ponto de vista de risco

Um site estático. Não tem servidor de aplicação, banco de dados, login, formulário nem coleta de dados.
A partida salva e o ranking ficam no `localStorage` do navegador de quem joga.

## Como o repositório aberto não alcança o servidor

1. **O GitHub não tem credencial do servidor.** Não existe chave SSH, token ou segredo de deploy
   neste repositório. Quem publica é o mantenedor, da máquina dele, com `scripts/publicar.sh`:
   a imagem vai por SSH e a credencial nunca sai dessa máquina.
2. **Código de PR de fora é testado sem rede e sem segredo.** O CI são estágios do `Dockerfile`.
   O único estágio com rede só baixa pacotes, sem executar script de instalação; todo estágio que
   executa código do repositório roda com `--network=none`. O código entra no Docker por
   `git archive` e nunca é executado fora de contêiner. Os workflows do GitHub Actions, quando
   ativos, usam o evento `pull_request` com token só de leitura; o repositório não usa
   `pull_request_target`.
3. **Só a `main` é publicada**, e só depois de o CI passar sobre o commit exato que vai ao ar.
   A `main` só recebe mudança por PR, com o status `ci-local` verde.
4. **As actions são fixadas por SHA**, para uma tag alterada por terceiro não mudar o que roda.
5. **O isolamento do contêiner não mora neste repositório.** O `compose.yml` em uso fica no
   servidor, com dono root, e a publicação não o altera. Um PR pode mudar o conteúdo da imagem,
   mas não o confinamento em que ela roda.
6. **O contêiner é confinado**: sem root, disco só de leitura, sem capacidades do kernel, sem volume,
   sem porta publicada, com limites de memória, CPU e processos, e rede interna sem saída para a
   internet. Limite conhecido: pelo gateway da própria rede o contêiner ainda alcança serviços do
   servidor que escutam em todas as interfaces; fechar isso exige regra de firewall no servidor.
7. **O navegador também é restrito**: política de conteúdo (CSP) que só aceita arquivos da própria
   origem, sem script ou estilo embutido. A página manda `no-transform` para a CDN não injetar nada.

## Dependências

O jogo publicado depende só de React. Dependabot abre PR semanal para npm, actions e imagem base,
e o CodeQL analisa o código a cada PR.
