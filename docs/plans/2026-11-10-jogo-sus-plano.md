# Linha de Frente: SUS — plano de implementação

> **Para quem executa:** seguir tarefa por tarefa com TDD no motor. Caixas `- [ ]` marcam o andamento.

**Objetivo:** jogo de navegador em que o jogador comanda o SUS contra surtos no mapa do Brasil.

**Arquitetura:** motor de simulação puro em TypeScript (sem DOM), dados tipados separados, interface em DOM/SVG sem framework, salvamento em `localStorage`. A interface só lê estado e emite ações.

**Stack:** Vite, TypeScript estrito, Vitest. Nenhuma dependência de execução.

**Spec:** `docs/specs/2026-11-10-jogo-sus-design.md`

## Restrições globais

- Textos em português, sem jargão sem explicação; sem piada com doença ou vítima; sem partido, governo ou político nomeado.
- Sem logotipo do SUS, do Ministério da Saúde ou de qualquer órgão.
- Nenhum número factual de memória: população e malha vêm da API do IBGE por script; cada fato tem URL de fonte oficial e data de consulta.
- `engine` não importa `ui` nem `storage`. `data` não tem lógica.
- Mesma semente e mesmas ações produzem a mesma partida.
- Nenhum dado sai do navegador. Todo acesso a `localStorage` é protegido.
- Um dia de jogo = 1,5 s em 1x; cenário termina em no máximo 540 dias.
- Parâmetros epidemiológicos são de jogo, declarados como simplificação na tela "Sobre".

## Estrutura de arquivos

```
package.json, tsconfig.json, vite.config.ts, index.html
scripts/gerar-dados-ibge.mjs      baixa população (Censo 2022) e malha das UFs do IBGE
src/data/ibge.gerado.ts           saída do script: população e contorno SVG por UF
src/data/ufs.ts                   vizinhança, peso aéreo, junta com ibge.gerado
src/data/frentes.ts               seis frentes: nome, descrição, custos e efeitos por nível
src/data/acoesLocais.ts           quatro ações por UF
src/data/cenarios.ts              dengue, sarampo, respiratória
src/data/eventos.ts               sete eventos com opções
src/data/fatos.ts                 fatos reais com fonte
src/engine/tipos.ts               Estado, EstadoUF, Acao, Cenario
src/engine/rng.ts                 gerador semeado (mulberry32)
src/engine/partida.ts             criarPartida
src/engine/passo.ts               avancarDia (epidemia, hospital, vacina, confiança, orçamento)
src/engine/acoes.ts               aplicarAcao (investir, ação local, responder evento)
src/engine/eventos.ts             sorteio e efeito de eventos
src/engine/fim.ts                 vitória e derrota
src/engine/visao.ts               casos visíveis (névoa), totais, nota
src/engine/semSUS.ts              simularSemSUS
src/storage/local.ts              salvar, carregar, ranking
src/ui/*.ts, src/ui/estilo.css    mapa, barra, painéis, notícias, telas
src/main.ts                       relógio e ligação
tests/*.test.ts
```

## Interfaces do motor

```ts
criarPartida(cenario: CenarioId, semente: number, opcoes?: { semSUS?: boolean }): Estado
aplicarAcao(estado: Estado, acao: Acao): { estado: Estado; ok: boolean; motivo?: string }
avancarDia(estado: Estado): Estado            // não avança se há evento pendente ou fim
simularSemSUS(cenario: CenarioId, semente: number): { obitos: number; dias: number }
casosVisiveis(estado: Estado, uf: string): number
totais(estado: Estado): { ativos: number; obitos: number; ativosVisiveis: number; popSobrecarga: number }
nota(vidasSalvas: number, obitosSemSUS: number): 'A'|'B'|'C'|'D'|'E'

type Acao =
  | { tipo: 'investir'; frente: FrenteId }
  | { tipo: 'local'; uf: string; acao: AcaoLocalId }
  | { tipo: 'evento'; opcao: number }
```

## Tarefas

### Tarefa 1 — Projeto e dados do IBGE
- [ ] `package.json`, `tsconfig.json` estrito, `vite.config.ts`, `index.html` mínimo.
- [ ] `scripts/gerar-dados-ibge.mjs`: população residente do Censo 2022 por UF (SIDRA) e malha das UFs (API de malhas), simplifica e projeta para SVG, grava `src/data/ibge.gerado.ts` com URL e data da consulta no cabeçalho.
- [ ] `src/data/ufs.ts` com vizinhança e peso aéreo.
- [ ] Teste `tests/ufs.test.ts`: 27 UFs; vizinhança simétrica; toda UF tem população > 0 e contorno; soma da população entre 190 e 220 milhões.
- Entrega: `npm test` verde com dados reais.

### Tarefa 2 — Motor: partida, rng e passo epidêmico
- [ ] Teste: `criarPartida` é determinística; população por UF se conserva após 200 dias (tolerância 1e-6 relativa); o surto cresce sem intervenção; chega a UFs vizinhas.
- [ ] Implementar `tipos.ts`, `rng.ts`, `partida.ts`, `passo.ts` (S, E, I, R, V, óbitos; sazonalidade; importação por fronteira e via aérea).
- Entrega: epidemia espalha no modelo, testada.

### Tarefa 3 — Motor: hospital, vacina, confiança, orçamento, névoa
- [ ] Teste: acima da capacidade a letalidade sobe; vacinação reduz suscetíveis e depende de confiança; orçamento entra a cada 30 dias; `casosVisiveis` é menor e atrasado com Vigilância 0 e igual ao real no nível 3.
- [ ] Implementar em `passo.ts` e `visao.ts`.

### Tarefa 4 — Motor: ações, frentes, eventos, fim, semSUS
- [ ] Teste: investir debita orçamento, respeita nível máximo e saldo; para cada frente, investir cedo reduz óbitos em pelo menos um cenário e nunca piora; ação local expira; evento pendente trava o dia até resposta; vitória e os três tipos de derrota disparam; `simularSemSUS` é determinística e pior que a partida sem ações, nos três cenários.
- [ ] Implementar `acoes.ts`, `eventos.ts`, `fim.ts`, `semSUS.ts`, dados de frentes, ações, cenários e eventos.
- [ ] Teste de integridade: todo cenário referencia UF e eventos existentes.
- [ ] Calibragem por script de teste: sem ação o jogador perde ou termina com nota baixa; com estratégia razoável vence. Ajustar só dados de cenário.

### Tarefa 5 — Fatos reais
- [ ] Conferir cada fato na fonte oficial; gravar `src/data/fatos.ts` (texto, frente, url, consultadoEm).
- [ ] Teste: todo fato tem URL https de domínio permitido e data.

### Tarefa 6 — Armazenamento
- [ ] Teste (com `localStorage` falso): salvar e carregar devolve o mesmo estado; versão diferente é descartada; falha de armazenamento não lança erro; ranking guarda dez por cenário em ordem.
- [ ] Implementar `storage/local.ts`.

### Tarefa 7 — Interface
- [ ] Mapa SVG colorido por casos visíveis, marcador de sobrecarga, clique abre painel da UF.
- [ ] Barra superior, painel de frentes, painel da UF com ações locais, faixa de notícias, modal de evento.
- [ ] Telas: início (escolha de cenário, continuar, ranking, sobre), fim de partida com vidas salvas e fatos.
- [ ] Relógio em `main.ts` com pausa, 1x, 2x, 4x; salvamento automático mensal.
- [ ] Layout de celular: painéis em gaveta inferior.

### Tarefa 8 — Verificação
- [ ] `npm test` e `npm run build` sem erro.
- [ ] No navegador: uma partida por cenário em largura de computador e de celular; conferir console sem erros.
- [ ] Varredura de PII do repositório e commits por arquivo.

## Revisão contra a spec

Seções 3 a 9 da spec têm tarefa correspondente (3: tarefas 2 a 4 e 7; 4: tarefa 4; 5: tarefas 2 e 3; 6: tarefa 5; 7: estrutura; 8: tarefa 6; 9: testes em cada tarefa). Itens da seção 10 ficam fora.
