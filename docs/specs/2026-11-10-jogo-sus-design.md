# Linha de Frente: SUS — especificação de design

Data: 2026-11-10 · Status: aguardando revisão · Nome provisório

## 1. Objetivo

Jogo de navegador, gratuito e em português, que faz o jogador sentir na prática o que o SUS
faz numa epidemia. O jogador comanda a resposta do SUS a um surto no Brasil. A mensagem não é
dita, é jogada: cada frente do SUS que ele deixa de financiar aparece como mortes no mapa.

Sucesso da primeira versão:
- uma pessoa leiga entende o que fazer em menos de 1 minuto, sem tutorial longo;
- uma partida dura de 10 a 15 minutos;
- a tela final mostra um número que dá vontade de compartilhar: vidas salvas em comparação com
  o mesmo surto sem SUS.

É um jogo original do gênero "simulação de epidemia". Não reproduz nome, arte, interface,
textos nem cenários de nenhum jogo existente.

## 2. Público e tom

Público geral, 14 anos ou mais. Linguagem simples, sem jargão sanitário sem explicação.
Tom sério com leveza: o assunto são mortes, então nada de piada com doença ou com vítima.
Sem partido, sem governo, sem político nomeado. O jogo defende o sistema, não uma gestão.

## 3. Como se joga

### 3.1 Tela

- Centro: mapa do Brasil em SVG com as 27 unidades da federação. A cor de cada UF indica a
  proporção de infectados ativos. Um marcador indica UF com hospitais lotados.
- Topo: data do jogo, velocidade (pausa, 1x, 2x, 4x), orçamento disponível, confiança da
  população, casos ativos, óbitos.
- Lateral: painel das seis frentes do SUS (investimentos nacionais).
- Rodapé: faixa de notícias com eventos da partida e fatos reais do SUS.
- Clique numa UF: painel com dados da UF e ações locais.

No celular a lateral vira uma gaveta inferior; o mapa ocupa a largura inteira.

### 3.2 Tempo

Um dia de jogo dura 1,5 s em 1x. Um cenário termina em no máximo 540 dias de jogo.
Pausar não bloqueia nenhuma ação: o jogador pode pensar e investir com o jogo parado.

### 3.3 Recursos

- **Orçamento**: entra todo dia 1 de cada mês de jogo. O valor depende do cenário e de eventos.
- **Confiança** (0 a 100): cai com óbitos, hospitais lotados e desinformação; sobe com
  comunicação, transparência e surto em queda. Confiança baixa reduz adesão a vacina e a
  medidas de prevenção.

### 3.4 As seis frentes (investimento nacional, 3 níveis cada)

| Frente | Exemplos reais | Efeito no modelo |
|---|---|---|
| Atenção Básica | UBS, Estratégia Saúde da Família, agentes comunitários | reduz transmissão e detecta casos cedo |
| Vigilância | notificação, testagem, laboratórios | reduz atraso entre o surto real e o que o jogador vê; habilita rastreio |
| Imunização | PNI, rede de frio, campanhas | aumenta ritmo e alcance de vacinação |
| Urgência | SAMU, UPAs, leitos de UTI | aumenta capacidade hospitalar, reduz letalidade |
| Ciência | Fiocruz, Butantan | desenvolve e produz vacina ou tratamento do cenário |
| Comunicação | campanhas públicas, combate à desinformação | segura a confiança, neutraliza eventos de boato |

Cada nível custa mais que o anterior. Não dá para comprar tudo: a decisão é o jogo.

### 3.5 Ações locais (por UF, custo imediato, efeito temporário)

- Enviar Força Nacional do SUS: reforça a capacidade hospitalar da UF por 30 dias.
- Campanha de vacinação: acelera a vacinação na UF por 30 dias (exige vacina disponível).
- Mutirão contra o mosquito: reduz transmissão vetorial por 45 dias (só no cenário dengue).
- Abrir leitos de campanha: aumenta leitos por 60 dias.

### 3.6 Vigilância como "névoa"

Sem investir em Vigilância, o mapa mostra os casos com atraso e subnotificação. O jogador
descobre o surto tarde. Investir revela a situação real. Essa é a mecânica central para
mostrar um trabalho do SUS que ninguém vê.

### 3.7 Eventos

Sorteados ao longo da partida, com escolha quando fizer sentido:
boato sobre vacina, corte de verba, enchente numa região, falta de insumo, feriado com
aglomeração, doação de equipamento, variante mais transmissível.

### 3.8 Fim de partida

- **Vitória**: casos ativos abaixo do limiar de controle do cenário por 30 dias seguidos.
- **Derrota**: confiança chega a zero, ou hospitais lotados em mais da metade da população do
  país por 30 dias seguidos, ou fim dos 540 dias sem controle.
- **Tela final**: óbitos da partida, óbitos da simulação "sem SUS" (mesma semente, nenhum
  investimento, nenhuma capacidade pública), a diferença como "vidas salvas", nota de A a E,
  e os fatos reais do SUS ligados às frentes que o jogador mais usou.

## 4. Cenários

| Cenário | Dificuldade | Particularidade |
|---|---|---|
| Dengue | fácil | transmissão por vetor, sazonal (pior no verão), sem contágio entre pessoas; vacina limitada |
| Sarampo | média | muito transmissível, vacina já existe; o problema é cobertura vacinal baixa e desinformação |
| Pandemia respiratória | difícil | doença nova, vacina precisa ser desenvolvida pela frente Ciência, chega por aeroportos |

Cada cenário é um arquivo de dados: parâmetros epidemiológicos, UF de origem, orçamento,
eventos habilitados, limiar de controle. Um cenário novo não exige mexer no motor.

Os parâmetros são calibrados para a partida ser boa, não para prever a realidade. O jogo diz
isso com clareza na tela "Sobre": é uma simplificação didática, não um modelo epidemiológico.

## 5. Modelo de simulação

- Por UF, compartimentos S, E, I, R, V (vacinados) e óbitos acumulados. Passo de 1 dia.
- Transmissão dentro da UF por taxa do cenário, modificada por frentes, ações, confiança,
  sazonalidade e eventos.
- Espalhamento entre UFs: fronteira terrestre (lista de vizinhança) e rotas aéreas entre
  capitais com pesos por porte.
- Hospitalização: fração dos infectados precisa de leito; acima da capacidade da UF a
  letalidade sobe. É aqui que Urgência e ações locais salvam vidas.
- Aleatoriedade com gerador semeado. Mesma semente e mesmas ações produzem a mesma partida;
  isso permite testar e permite a comparação "sem SUS".
- População por UF: Censo 2022 do IBGE.

## 6. Conteúdo factual

Fatos reais do SUS aparecem na faixa de notícias e na tela final.
Regras:
- cada fato fica em `src/data/fatos.ts` com texto, frente relacionada, URL da fonte e data de
  consulta;
- só entram fontes oficiais ou acadêmicas (Ministério da Saúde, IBGE, Fiocruz, Butantan, OMS,
  OPAS, periódico revisado);
- um teste automático reprova o build se algum fato estiver sem fonte;
- nenhum número entra de memória: cada um é conferido na fonte antes de ser escrito.

O jogo não usa a marca do SUS, do Ministério da Saúde nem de nenhum órgão. Citar Fiocruz,
Butantan, SAMU e PNI pelo nome, como fato, é permitido; usar logotipo não é. A tela "Sobre"
declara que o jogo é independente e não tem vínculo com o governo.

## 7. Arquitetura

> Atualização de 2026-11-10: a interface foi migrada para React 19 (`src/ui/*.tsx`). O motor,
> os dados e o armazenamento não mudaram. A entrega passou a ser uma imagem Docker; ver
> `SECURITY.md` e `deploy/`.

Vite + TypeScript, sem framework de interface (versão inicial). Saída estática (`dist/`), hospedável em
qualquer servidor de arquivos.

```
src/
  engine/      motor puro, sem DOM: estado, passo diário, rng, regras de fim de jogo
  data/        ufs (população, vizinhança, rotas), cenários, frentes, eventos, fatos
  ui/          mapa SVG, barra superior, painéis, faixa de notícias, telas
  storage/     salvamento e ranking em localStorage
  main.ts      liga motor, interface e relógio
```

Fronteiras:
- `engine` não importa nada de `ui` nem de `storage`. Recebe estado e ações, devolve estado.
- `ui` lê o estado e emite ações; não altera o estado direto.
- `data` é só dado tipado, sem lógica.

Interface do motor:
- `criarPartida(cenario, semente) -> Estado`
- `avancarDia(estado, acoes) -> Estado`
- `simularSemSUS(cenario, semente) -> Resultado`

## 8. Salvamento e ranking

- Salvamento automático a cada mês de jogo e ao sair, em `localStorage`, com número de versão.
  Salvamento de versão incompatível é descartado com aviso, nunca quebra o jogo.
- Ranking local: dez melhores partidas por cenário (vidas salvas, nota, data).
- Toda leitura e escrita em `localStorage` é protegida; sem armazenamento disponível o jogo
  funciona, só não salva.
- Nenhum dado sai do navegador. Sem cadastro, sem analytics, sem cookies na primeira versão.

## 9. Testes

Vitest no motor:
- mesma semente e ações produzem o mesmo resultado;
- a população de cada UF se conserva (S+E+I+R+V+óbitos constante);
- cada frente melhora o desfecho em relação à partida sem ela;
- "sem SUS" é sempre pior que jogar sem fazer nada com o SUS básico;
- condições de vitória e derrota disparam;
- todo fato tem fonte; todo cenário referencia UFs e eventos existentes.

Interface: verificação manual no navegador em largura de computador e de celular, uma partida
completa por cenário.

## 10. Fora da primeira versão

Ranking online, contas, multijogador, som e música, outros idiomas, aplicativo de celular,
editor de cenários, municípios (o mapa fica em nível de UF).

## 11. Decisões em aberto para depois da primeira versão

- Nome definitivo e domínio.
- Hospedagem.
- Ranking online (exige servidor e política de privacidade).
