# Linha de Frente: SUS

[![CI](https://github.com/jvitorcarvalho/jogo-sus/actions/workflows/ci.yml/badge.svg)](https://github.com/jvitorcarvalho/jogo-sus/actions/workflows/ci.yml)
[![CodeQL](https://github.com/jvitorcarvalho/jogo-sus/actions/workflows/codeql.yml/badge.svg)](https://github.com/jvitorcarvalho/jogo-sus/actions/workflows/codeql.yml)
[![Código: MIT](https://img.shields.io/badge/c%C3%B3digo-MIT-blue.svg)](LICENSE)
[![Conteúdo: CC BY-SA 4.0](https://img.shields.io/badge/conte%C3%BAdo-CC%20BY--SA%204.0-lightgrey.svg)](LICENSE-CONTEUDO.md)

**Jogar: <https://sus.evolutivanegociosdigitais.com.br>**

Jogo de estratégia de navegador em que você comanda a resposta do SUS a um surto no Brasil.
O orçamento não dá para tudo: cada frente que você deixa de financiar aparece no mapa.

Três cenários: dengue, sarampo e uma pandemia respiratória. No fim da partida, o jogo roda o
mesmo surto num país sem sistema público e mostra a diferença.

> É uma simulação didática. As doenças e os números do jogo foram ajustados para a partida ser
> boa de jogar; não são previsões nem dados reais. O projeto é independente e não tem vínculo
> com o Ministério da Saúde.

## O que é real

- População de cada estado: Censo 2022 do IBGE. Mapa: malha geográfica do IBGE. Os dois são
  baixados por `npm run dados`.
- Os textos "Na vida real" que aparecem durante a partida. Cada um tem URL de fonte oficial e
  data de consulta em [`src/data/fatos.ts`](src/data/fatos.ts), e um teste reprova fato sem fonte.

## Stack

| Camada | Tecnologia |
|---|---|
| Interface | React 19, TypeScript estrito, SVG, CSS puro |
| Motor de simulação | TypeScript puro, sem dependência, determinístico por semente |
| Build | Vite |
| Testes | Vitest (motor e armazenamento), Playwright (ponta a ponta, computador e celular) |
| Qualidade | ESLint, typescript-eslint, CodeQL, Dependabot |
| Entrega | Docker multi-estágio, nginx sem root, GitHub Actions, GitHub Container Registry |
| Offline | Service worker e manifesto (PWA) |

## Arquitetura

```
src/
  engine/    motor puro: estado, passo diário, eventos, regras de fim, simulação "sem SUS"
  data/      dados tipados: estados, cenários, frentes, ações, eventos, fatos
  storage/   partida salva e ranking em localStorage
  ui/        componentes React; só leem o estado e emitem ações
```

O motor não conhece a interface. Ele expõe três funções:

```ts
criarPartida(cenario, semente): Estado
aplicarAcao(estado, acao): { estado, ok, motivo? }
avancarDia(estado): Estado
```

Por ser puro e semeado, a mesma semente com as mesmas ações dá a mesma partida. É isso que
permite testar regra por regra e comparar a sua partida com o mesmo surto sem SUS.

O modelo é um SEIR por estado (suscetíveis, expostos, infectados, recuperados, mais vacinados e
óbitos), com espalhamento por fronteira terrestre e por via aérea, capacidade hospitalar,
vacinação que depende da confiança da população e uma "névoa": sem investir em Vigilância, o
mapa mostra os casos pela metade e com atraso.

## Rodar

Precisa de Node 24 ou mais novo.

```bash
npm ci
npm run dev
```

| Comando | O que faz |
|---|---|
| `npm run verificar` | lint, tipos, testes unitários e build |
| `npm run e2e` | testes de ponta a ponta contra o build de produção |
| `npm run dados` | baixa de novo população e malha do IBGE |
| `docker build -t jogo-sus .` | monta a imagem de produção |
| `sh scripts/ci.sh` | CI completo dentro do Docker, sobre o commit atual |
| `sh scripts/ci.sh 12` | o mesmo sobre o PR 12, sem trazê-lo para a sua pasta |

## CI que roda em qualquer lugar

O CI são estágios do [`Dockerfile`](Dockerfile), não a configuração de um serviço:

```bash
docker build --target verificar .   # lint, tipos e testes unitários
docker build --target e2e .         # Playwright, computador e celular
docker build .                      # imagem de produção
```

Só o estágio que baixa dependências tem rede. Os que executam código do repositório rodam com
`--network=none`, então dá para testar o PR de um desconhecido sem que o código dele fale com a
internet ou com a sua rede. [`scripts/ci.sh`](scripts/ci.sh) roda tudo sobre um commit exato e
grava o resultado no GitHub como o status `ci-local`. Os workflows em `.github/` rodam as mesmas
verificações no GitHub Actions.

## Entrega e segurança

O jogo publicado é um site estático dentro de um contêiner confinado. O repositório é aberto e
mesmo assim não tem como alcançar o servidor: não há credencial de deploy no GitHub. O mantenedor
publica da própria máquina com [`scripts/publicar.sh`](scripts/publicar.sh), que só envia o commit
da `main` depois de o CI passar sobre ele. O desenho completo está em [SECURITY.md](SECURITY.md) e
os arquivos em [`deploy/`](deploy).

## Contribuir

Código, texto, fato novo com fonte, cenário novo: veja [CONTRIBUTING.md](CONTRIBUTING.md).

## Licenças

Código sob [MIT](LICENSE). Textos do jogo e documentação sob
[CC BY-SA 4.0](LICENSE-CONTEUDO.md).
