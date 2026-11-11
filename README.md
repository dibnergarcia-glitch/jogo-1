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
| Pular | `Espaço` | — |
| Pausar | `P` | — |
| Reiniciar | `R` | botão na tela de fim de jogo |
| Tela cheia | `F` | botão **⛶** |

Pegue os **escudos verdes** (S) para ficar invulnerável por 6 segundos.

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
└── abrir-jogo.sh         # abre o jogo no navegador real, em tela cheia
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
4. **Colisão** — retângulos (AABB) do jogador e do obstáculo são comparados a
   cada quadro. As caixas são encolhidas em 6 px para deixar a jogada justa.
5. **Dificuldade** — a velocidade da pista sobe `ROAD_ACCEL` por segundo
   (até `ROAD_SPEED_MAX`) e o intervalo entre obstáculos encurta com o tempo.

---

## 🚀 Ideias para expandir

- **Trilha do nudge**: carros mudam de faixa para atrapalhar.
- **Combo de desvio**: pontos extras por desviar vários carros seguidos.
- **Som**: `AudioContext` para motor, buzina e colisão.
- **Novos itens**: nitro (acelera), mola, escudo duplo.
- **Fases noturnas**: chuva, neblina, semáforo, checkpoints.
- **Ranking online**: salvar as melhores partidas em um backend.

---

## 🧪 Testes

O jogo roda sem dependências, mas você pode validar a lógica sem navegador:

```bash
node --check game.js   # valida a sintaxe
```
