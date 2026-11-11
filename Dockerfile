# syntax=docker/dockerfile:1

# O CI do projeto mora aqui, em estágios. Roda igual em qualquer máquina com Docker:
#   docker build --target verificar .   lint, tipos e testes unitários
#   docker build --target e2e .         testes de ponta a ponta (Playwright)
#   docker build .                      imagem de produção
#
# Só o estágio "deps" tem rede, e ele apenas baixa pacotes, sem executar script de instalação.
# Todo estágio que executa código do repositório roda com --network=none: o código de um PR
# de terceiro é testado sem conseguir falar com a internet nem com a rede de quem o testa.

# ---- deps: baixa dependências (único estágio com rede) ----
FROM node:24-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# ---- fonte: dependências + código ----
FROM deps AS fonte
COPY . .

# ---- verificar: lint, tipos e testes unitários ----
FROM fonte AS verificar
RUN --network=none npm run lint && npm run tipos && npm test

# ---- build: compila o jogo ----
FROM fonte AS build
RUN --network=none npm run build

# ---- e2e: Playwright contra o build de produção, em computador e celular ----
# A versão da imagem tem de acompanhar a de @playwright/test no package.json.
FROM mcr.microsoft.com/playwright:v1.65.0-noble AS e2e
WORKDIR /app
COPY --from=build /app /app
ENV CI=1
RUN --network=none npx playwright test

# ---- producao: só arquivos estáticos, nginx sem root, sem Node ----
FROM nginxinc/nginx-unprivileged:1.31-alpine AS producao
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --retries=3 CMD wget -q -O /dev/null http://127.0.0.1:8080/saude || exit 1
