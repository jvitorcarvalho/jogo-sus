#!/bin/sh
# Publica a main no servidor, a partir da máquina do mantenedor.
#
#   DEPLOY_SSH=meu-servidor scripts/publicar.sh
#
# Só publica o commit que está na origin/main, e só depois de o CI passar sobre ele.
# A imagem vai por `docker save | ssh`: não depende de registro nem de serviço de CI, e a
# credencial do servidor fica na máquina do mantenedor, nunca no GitHub.
# No servidor, o compose.yml que define o confinamento já está em /opt/jogo-sus e não é alterado aqui.
set -eu

: "${DEPLOY_SSH:?defina DEPLOY_SSH com o host SSH do servidor}"
IMAGEM=ghcr.io/jvitorcarvalho/jogo-sus
FONTE=https://github.com/jvitorcarvalho/jogo-sus
cd "$(dirname "$0")/.."

git fetch --quiet origin main
sha=$(git rev-parse origin/main)

sh scripts/ci.sh "$sha"

echo "== montando a imagem de $sha"
git archive --format=tar "$sha" | docker build --quiet --target producao \
  --label "org.opencontainers.image.source=$FONTE" \
  --label "org.opencontainers.image.revision=$sha" \
  -t "$IMAGEM:latest" -t "$IMAGEM:$sha" - >/dev/null

echo "== enviando para $DEPLOY_SSH"
docker save "$IMAGEM:latest" | gzip | ssh "$DEPLOY_SSH" 'gunzip | docker load'

echo "== trocando o contêiner"
ssh "$DEPLOY_SSH" 'cd /opt/jogo-sus && sudo docker compose up -d --pull never && sleep 5 \
  && docker inspect -f "{{index .Config.Labels \"org.opencontainers.image.revision\"}} {{.State.Health.Status}}" jogo-sus-web-1 \
  && docker image prune -f --filter "label=org.opencontainers.image.source=https://github.com/jvitorcarvalho/jogo-sus" >/dev/null'
echo "Publicado: $sha"
