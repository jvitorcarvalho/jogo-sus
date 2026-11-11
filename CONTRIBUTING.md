# Como contribuir

Obrigado por querer ajudar. O projeto aceita código, correção de texto, fato novo com fonte,
cenário novo e ajuste de equilíbrio.

## Rodar na sua máquina

Precisa de Node 24 ou mais novo.

```bash
npm ci
npm run dev
```

Antes de abrir o PR:

```bash
npm run verificar
npm run e2e
```

## Regras do projeto

**Código**

- O motor (`src/engine`) é puro: recebe estado e ação, devolve estado. Não importa React, não toca
  no navegador. O lint barra isso.
- Mesma semente e mesmas ações têm de dar a mesma partida. Aleatoriedade só por `sortear()`.
- Mudou regra do motor? Vem com teste em `tests/`.
- Cenário, frente, ação e evento são dados em `src/data`. Um cenário novo não deve exigir mexer
  no motor.

**Conteúdo**

- Nenhum número real entra de memória. Fato novo vai em `src/data/fatos.ts` com URL de fonte
  oficial (governo, IBGE, Fiocruz, OPAS, OMS) e a data em que você leu a página. O teste reprova
  fato sem fonte.
- Os parâmetros das doenças são de jogo, não de epidemiologia. Não apresente número do jogo como
  dado real.
- O jogo defende o sistema público de saúde, não um governo. Sem partido, sem político nomeado.
- Sem piada com doença ou com vítima.
- Sem logotipo ou marca de órgão público.

**Equilíbrio**

Para ajustar dificuldade, edite `src/data/cenarios.ts` e veja o efeito com:

```bash
npx vitest run --mode calibrar tests/calibragem.test.ts
```

## Pull requests

- Um assunto por PR, com descrição do que mudou e de como você conferiu.
- O CI tem de ficar verde: lint, tipos, testes, build, testes de ponta a ponta e imagem Docker.
  Ele roda dentro do Docker (`sh scripts/ci.sh`), e o mantenedor o executa sobre o seu PR e marca
  o resultado como o status `ci-local`. Se tiver Docker, rode antes de abrir o PR.
- Mudança em `.github/`, `deploy/` ou `Dockerfile` passa por revisão mais lenta, porque decide o
  que roda no CI e no servidor.

## Licença das contribuições

Ao contribuir você concorda que seu código entra sob MIT e seu texto sob CC BY-SA 4.0, como o
resto do projeto.
