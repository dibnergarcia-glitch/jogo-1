# 🏎️ Neon Racer — jogo de corrida 2D

Jogo de corrida visto de cima, feito com **HTML + CSS + JavaScript (Canvas 2D)**.
A pista rola verticalmente para dar sensação de velocidade, o carrinho é
controlado pelas setas do teclado e o jogo acaba quando você bate em um
obstáculo.

![estrutura](https://img.shields.io/badge/HTML-CSS-JS-orange) ![sem dependências](https://img.shields.io/badge/depend%C3%AAncias-nenhuma-green)

---

## ▶️ Como abrir

> ⚠️ **Neste ambiente há um detalhe importante:** os navegadores estão
> "embrulhados" por scripts que **sempre abrem junto a plataforma
> `educacao.pr.gov.br`**. Por isso, dar duplo clique num HTML pode mostrar
> essa página em vez do jogo.
>
> **Use o atalho:** `./abrir-jogo.sh` — ele sobe um servidor local e abre o
> jogo no binário real do navegador (sem o wrapper), já em tela cheia.
>
> Se preferir fazer na mão:
> ```bash
> # servidor local
> python3 -m http.server 8000
> # abre o jogo no navegador real (contorna o wrapper do ambiente)
> /opt/google/chrome/chrome --new-window http://localhost:8000/jogo-completo.html
> ```

**Opção 1 — arquivo único (mais garantido)**

Abra o arquivo **`jogo-completo.html`**. Ele tem CSS e JavaScript embutidos,
então funciona sem depender de servidor, de internet ou de outros arquivos na
mesma pasta.

**Opção 2 — projeto completo (para editar)**

Clique duas vezes no `index.html` **mantendo `style.css` e `game.js` na mesma
pasta** — ou sirva por HTTP (recomendado, habilita a tela cheia):

```bash
cd jogo-1
python3 -m http.server 8000
```

Depois acesse <http://localhost:8000> no navegador.

> **Tela cheia:** clique em **Jogar** (o jogo pede a tela cheia automaticamente
> quando servido por HTTP) ou depois use o botão **⛶** do HUD / a tecla **F**.
> Em `file://` alguns navegadores bloqueiam o pedido automático — por isso o
> jogo também **começa sozinho após 5 segundos** se você não clicar em nada.

> **Regerar a versão de arquivo único** depois de editar o código:
> ```bash
> node build-single-file.js
> ```

---

## 🎮 Controles

| Ação | Teclado | Toque |
|------|----------|-------|
| Mover o carrinho | `←` `→` ou `A` `D` | botões na tela / arrastar o dedo |
| **Acelerar** | `↑` ou `W` | botão ▲ |
| **Frear** | `↓` ou `S` | botão ▼ |
| Pular | `Espaço` | — |
| Pausar | `P` | — |
| Reiniciar | `R` | botão na tela de fim de jogo |
| Tela cheia | `F` | botão **⛶** |

Pegue os **escudos verdes** (S) para ficar invulnerável por 6 segundos.

### 🚗 Acelerar e frear

- **Acelerar (`↑`/`W`)** aumenta a velocidade da pista (até 1000 px/s ≈ 280 km/h).
  A pista e os obstáculos giram mais rápido: você rende **mais pontos por
  segundo**, mas tem **menos tempo** para desviar.
- **Frear (`↓`/`S`)** derruba a velocidade (até 120 px/s): os carros inimigos
  se aproximam mais devagar, dando **mais tempo de reação**, mas os pontos
  por metro caem.

A barra de velocidade no HUD mostra a velocidade atual; o número fica verde
acelerando e amarelo freando.

---

## 🎯 Pontuação

| Ação | Pontos |
|------|--------|
| Cada metro percorrido | +1 |
| Desviar de um obstáculo | +15 |
| Pegar um escudo | +50 |

O recorde fica salvo no `localStorage` do navegador.

---

## 📁 Estrutura do código

```
jogo-1/
├── index.html            # estrutura da página, HUD e telas de sobreposição
├── style.css             # layout em tela cheia, HUD flutuante e botões
├── game.js               # todo o jogo (canvas, física, colisão, loop)
├── jogo-completo.html    # versão de arquivo único (gerada)
├── build-single-file.js  # script que gera a versão de arquivo único
├── abrir-jogo.sh         # abre o jogo no navegador real, em tela cheia
└── testes/               # testes automáticos da lógica (sem navegador)
    ├── harness.js        # carrega o game.js com DOM/Canvas falsos
    ├── colisao.test.js   # regra de colisão por faixa
    ├── velocidade.test.js# acelerador e freio
    ├── jogo.test.js      # partida simulada de ponta a ponta
    └── rodar.sh          # roda todos os testes
```

### Seções do `game.js`

| # | Seção | O que faz |
|---|-------|-----------|
| 1 | `CONFIG` | Todos os números do jogo (velocidades, dificuldade, pontos) num lugar só |
| 2 | Utilitários | `roundRect`, `shade`, `randInt`, `rectsOverlap` (colisão) |
| 3 | Estado | Variáveis do jogo (placar, velocidade, obstáculos) |
| 3.1 | Layout / tela cheia | Calcula o tamanho do canvas e a geometria da pista |
| 4 | Entrada | Teclado e toque |
| 5 | Fluxo | Iniciar, pausar, game over, recorde |
| 6 | Geração | Cenário e criação de obstáculos |
| 7 | Update | Física do jogador, pulo, spawn, colisão, pontuação |
| 8 | Partículas | Fumaça e explosões |
| 9 | Render | Desenho da pista, carros, itens e efeitos |
| 10 | HUD | Atualização do placar na tela |
| 11 | Loop | `requestAnimationFrame` com `dt` (tempo entre quadros) |
| 12 | Init | Monta tudo e inicia o loop |

---

## 🧩 Como o jogo funciona (resumo)

1. **Rolagem do cenário** — a variável `state.scroll` só aumenta. O asfalto,
   as faixas tracejadas e a grama são redesenhados a cada quadro deslocados
   por esse valor, criando o movimento sem mover "o mundo" inteiro.
2. **Loop principal** — `loop(timestamp)` é chamado ~60× por segundo pelo
   `requestAnimationFrame`. O `dt` (segundos desde o quadro anterior) é
   passado para `update(dt)`, garantindo a mesma velocidade em qualquer monitor.
3. **Jogador** — a aceleração lateral é aplicada enquanto a seta está
   pressionada; ao soltar, o atrito (`PLAYER_FRICTION`) desacelera o carrinho.
4. **Velocidade** — o jogador controla a pista: `↑`/`W` acelera, `↓`/`S`
   freia. A velocidade define o quanto o cenário rola, o quanto os
   obstáculos se aproximam e quantos pontos são ganhos.
5. **Colisão por faixa** — cada carro inimigo **ocupa a faixa em que está**
   (o tamanho do carro é calculado a partir da largura da faixa). Se o
   jogador está na mesma faixa, a colisão acontece sempre — inclusive
   quando ele está encostado na borda da pista. Fora da faixa, só há
   colisão se as caixas desenhadas realmente se encostarem.
6. **Dificuldade** — a velocidade da pista sobe `ROAD_ACCEL` por segundo
   (até `ROAD_SPEED_MAX`) e o intervalo entre obstáculos encurta com o tempo.

### 🛣️ Faixas da pista

O número de faixas é calculado em `layout()` para que cada uma tenha mais
ou menos `LANE_TARGET_WIDTH` (84 px): em telas largas aparecem 6 faixas e
no celular 3. Como o tamanho dos carros acompanha a largura da faixa, um
carro sempre preenche a sua faixa — e por isso nunca "atravessa" o jogador
que está na mesma faixa.

---

## 🚀 Ideias para expandir

- **Trilha do nudge**: carros mudam de faixa para atrapalhar.
- **Combo de desvio**: pontos extras por desviar vários carros seguidos.
- **Som**: `AudioContext` para motor, buzina e colisão.
- **Novos itens**: nitro (acelera), mola, escudo duplo.
- **Fases noturnas**: chuva, neblina, semáforo, checkpoints.
- **Ranking online**: salvar as melhores partidas em um backend.

---

## ⚡ Desempenho

O jogo se adapta sozinho à máquina:

- **Resolução adaptativa**: o loop mede o tempo de cada quadro. Se o quadro
  está lento (computador sem GPU, navegador em modo software), o buffer do
  canvas encolhe automaticamente; quando sobra folga, ele volta ao normal.
- **Menos pixels por quadro**: a grama é pintada só fora da pista, o
  `clearRect` foi removido (a grama já cobre a tela) e os gradientes do
  cenário são criados uma vez, não a cada quadro.
- **HUD sem "engasgo"**: o placar só é escrito no DOM quando o valor muda
  (escrever todo quadro forçava recálculo de layout).
- **Desenho em lote**: rodas, vidros, faróis e a decoração da grama são
  pintados com um único `fill()` cada.

Para fechar qualquer sobra de folga, abra o jogo com o Chrome e a aceleração
de hardware ligada (o `abrir-jogo.sh` já usa o binário real do navegador).

---

## 🧪 Testes

O jogo roda sem dependências, mas você pode validar a lógica sem navegador:

```bash
node --check game.js   # valida a sintaxe
./testes/rodar.sh      # roda todos os testes (colisão, acelerador/freio, partida)
```

Os testes carregam o `game.js` num sandbox com DOM/Canvas falsos e conferem:

- o jogador encostado na borda da pista **é** atingido pelo carro da faixa;
- o jogador **não** é atingido por carro de outra faixa;
- o carro na mesma faixa acaba com a partida;
- acelerar aumenta a velocidade (e os pontos) e frear reduz.
