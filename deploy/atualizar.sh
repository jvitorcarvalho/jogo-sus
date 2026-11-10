#!/bin/sh
# Atualização por puxada: o servidor busca a imagem publicada; o GitHub nunca entra no servidor.
# Este script e o compose.yml ficam no servidor, com dono root, e NÃO são atualizados pelo repositório:
# mudar o isolamento do contêiner exige alguém com acesso ao servidor.
set -eu
cd "$(dirname "$0")"

antes=$(docker compose images -q web 2>/dev/null || true)
docker compose pull --quiet web
docker compose up -d --remove-orphans web
depois=$(docker compose images -q web)

if [ "$antes" != "$depois" ]; then
  echo "jogo-sus atualizado: $depois"
  docker image prune -f --filter "label=org.opencontainers.image.source=https://github.com/jvitorcarvalho/jogo-sus" >/dev/null
fi

# Falha visível no journal se o jogo não responder depois da troca.
sleep 3
wget -q -O /dev/null http://172.31.250.2:8080/saude
