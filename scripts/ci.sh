#!/bin/sh
# CI sem depender de serviço de CI: roda os estágios do Dockerfile sobre um commit exato
# e, se pedido, marca o resultado no GitHub como status "ci-local".
#
#   scripts/ci.sh                 testa o HEAD atual
#   scripts/ci.sh 12              testa o PR 12 (inclusive de fork) sem trazê-lo para a sua pasta
#   scripts/ci.sh <ref ou sha>    testa um commit qualquer
#   MARCAR=1 scripts/ci.sh 12     testa e grava o status no commit do PR
#
# O código testado entra no Docker por `git archive`: nunca é copiado para a pasta de trabalho
# nem executado fora de contêiner. Dentro do Docker ele roda sem rede (ver Dockerfile).
set -eu

REPO=${REPO:-jvitorcarvalho/jogo-sus}
CONTEXTO=ci-local
alvo=${1:-HEAD}

case "$alvo" in
  *[!0-9]*) ref=$alvo ;;
  *)
    git fetch --quiet origin "pull/$alvo/head"
    ref=FETCH_HEAD
    ;;
esac
sha=$(git rev-parse --verify "$ref^{commit}")
echo "CI sobre $sha"

marcar() {
  [ "${MARCAR:-0}" = 1 ] || return 0
  gh api --silent -X POST "repos/$REPO/statuses/$sha" \
    -f state="$1" -f context="$CONTEXTO" -f description="$2"
}

etapa() {
  echo "== $1"
  # O contexto do build é o commit, não a pasta: arquivo não commitado não entra.
  git archive --format=tar "$sha" | docker build --quiet --target "$1" - >/dev/null
}

marcar pending "Rodando lint, tipos, testes e ponta a ponta"
for alvo_docker in verificar e2e producao; do
  if ! etapa "$alvo_docker"; then
    marcar failure "Falhou em: $alvo_docker"
    echo "FALHOU em $alvo_docker. Para ver a saída completa:"
    echo "  git archive $sha | docker build --progress=plain --target $alvo_docker -"
    exit 1
  fi
done
marcar success "Lint, tipos, testes, ponta a ponta e imagem"
echo "CI ok: $sha"
