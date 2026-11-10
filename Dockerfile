# syntax=docker/dockerfile:1

# ---- build: compila o jogo; nada deste estágio vai para a imagem final ----
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
COPY . .
RUN npm run build

# ---- serve: só arquivos estáticos, nginx sem root, sem Node, sem shell de aplicação ----
FROM nginxinc/nginx-unprivileged:1.29-alpine
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --retries=3 CMD wget -q -O /dev/null http://127.0.0.1:8080/saude || exit 1
