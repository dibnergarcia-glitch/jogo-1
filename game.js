/* =========================================================================
   NEON RACER — jogo de corrida 2D (visão de cima, pista com rolagem vertical)
   -------------------------------------------------------------------------
   Como o jogo funciona (resumo rápido):
     1. O cenário (grama, asfalto, faixas da pista) é desenhado a cada quadro,
        deslocado por uma variável `scroll` que só aumenta. Isso cria a
        sensação de velocidade sem precisar mover todos os objetos.
     2. O jogador controla um carrinho no rodapé da tela (setas esquerda/direita).
     3. Os obstáculos "nascem" acima da tela e descem em direção ao jogador.
     4. A cada quadro (`requestAnimationFrame`) chamamos `update(dt)` e depois
        `render()`. `dt` é o tempo em segundos desde o último quadro.
     5. Pontuação = distância percorrida + bônus por desvios.
   ========================================================================= */

'use strict';

/* =========================================================================
   1) CONFIGURAÇÃO
   Centralize aqui todos os "números mágicos" do jogo. É o lugar ideal para
   balancear o jogo (dificuldade, velocidades, cores...).
   ========================================================================= */
const CONFIG = {
  // --- Tela (coordenadas lógicas; o CSS escala o canvas para a tela real) ---
  WIDTH: 480,
  HEIGHT: 720,

  // --- Pista ---
  ROAD_RATIO: 0.74,      // largura da pista como fração da largura da tela
  LANES: 3,              // número de faixas
  ROAD_SPEED_START: 260, // velocidade inicial da pista (px/s)
  ROAD_SPEED_MAX: 900,   // velocidade máxima da pista (px/s)
  ROAD_ACCEL: 14,        // ganho de velocidade por segundo jogado

  // --- Jogador ---
  PLAYER_W: 44,
  PLAYER_H: 78,
  PLAYER_ACCEL: 2600,    // aceleração lateral (px/s²)
  PLAYER_MAX_SPEED: 520, // velocidade lateral máxima (px/s)
  PLAYER_FRICTION: 2400, // quanto o carrinho "escorrega" ao soltar a tecla
  PLAYER_BASE_Y: 610,    // altura base do rodapé (sem pulo)
  PLAYER_COLOR: '#35e0ff',

  // --- Pulo ---
  JUMP_VELOCITY: 560,    // impulso inicial do pulo (px/s)
  JUMP_GRAVITY: 1500,    // gravidade (px/s²)

  // --- Obstáculos ---
  SPAWN_INTERVAL_START: 1.05, // segundos entre surgimentos no começo
  SPAWN_INTERVAL_MIN: 0.36,   // limite mínimo de segundos entre surgimentos
  SPAWN_RAMP: 0.011,          // quanto o intervalo cai por segundo de jogo
  OBSTACLE_SPEED_MIN: 130,    // velocidade extra do obstáculo (px/s)
  OBSTACLE_SPEED_MAX: 280,
  OBSTACLE_MIN_GAP: 150,      // distância mínima entre o topo da tela e o jogador

  // --- Bônus ---
  SHIELD_DURATION: 6,      // segundos de invulnerabilidade após pegar o escudo
  SHIELD_SPAWN_CHANCE: 0.18, // chance de o escudo aparecer junto de um obstáculo
  POINTS_PER_METER: 1,     // pontos por metro percorrido
  POINTS_PER_DODGE: 15,    // bônus por obstáculo desviado
  POINTS_PER_PICKUP: 50,   // bônus por item coletado

  // --- Cores dos carros inimigos ---
  OBSTACLE_COLORS: ['#ff3d81', '#ffb03a', '#a970ff', '#3dff9e', '#ff5c5c', '#4d8cff'],
};

/* =========================================================================
   2) UTILITÁRIOS
   Pequenas funções auxiliares usadas em todo o jogo.
   ========================================================================= */

/** Desenha um retângulo com cantos arredondados (compatível com navegadores antigos). */
function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

/** Escurece (ou clareia) uma cor hexadecimal. amount < 0 escurece. */
function shade(hex, amount) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.min(255, (n >> 16) + amount));
  const g = Math.max(0, Math.min(255, ((n >> 8) & 0xff) + amount));
  const b = Math.max(0, Math.min(255, (n & 0xff) + amount));
  return `rgb(${r},${g},${b})`;
}

/** Retorna um número aleatório inteiro entre min e max (inclusive). */
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Retorna um item aleatório de um array. */
function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

/** Verifica se dois retângulos (AABB) se sobrepõem. */
function rectsOverlap(a, b) {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

/* =========================================================================
   3) ELEMENTOS DA PÁGINA E ESTADO DO JOGO
   ========================================================================= */
/* =========================================================================
   3) ELEMENTOS DA PÁGINA E ESTADO DO JOGO
   ========================================================================= */
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const scoreEl = document.getElementById('score');
const speedEl = document.getElementById('speed');
const bestEl = document.getElementById('best');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlayTitle');
const overlayText = document.getElementById('overlayText');
const btnStart = document.getElementById('btnStart');
const btnFullscreen = document.getElementById('btnFullscreen');
const toastEl = document.getElementById('toast');

/* -------------------------------------------------------------------------
   TAMANHO DO CANVAS (DINÂMICO)
   A ALTURA lógica é sempre LOGICAL_HEIGHT (720 unidades de jogo) e a LARGURA
   acompanha a proporção real da janela. Assim o jogo preenche a tela
   inteira — em qualquer monitor, inclusive em paisagem — sem distorcer
   as proporções dos carros.
   ------------------------------------------------------------------------- */
const LOGICAL_HEIGHT = 720;
let W = 480;   // largura lógica (varia com a proporção da tela)
let H = 720;   // altura lógica (sempre 720)

/** Geometria da pista (recalculada pela função `layout()`). */
let ROAD_WIDTH = 480 * CONFIG.ROAD_RATIO;
let ROAD_LEFT = (W - ROAD_WIDTH) / 2;
let ROAD_RIGHT = ROAD_LEFT + ROAD_WIDTH;
let LANE_WIDTH = ROAD_WIDTH / CONFIG.LANES;
let VERGE = 46;   // largura da "vergem" de terra ao lado da pista

/** Estado global — tudo que muda durante a partida. */
const state = {
  running: false,   // o loop está simulando?
  paused: false,    // jogo pausado por tecla?
  over: false,      // game over?
  score: 0,         // pontos atuais
  best: 0,          // recorde (salvo no navegador)
  distance: 0,      // metros percorridos
  roadSpeed: CONFIG.ROAD_SPEED_START, // velocidade atual da pista (px/s)
  scroll: 0,        // deslocamento acumulado do cenário (px)
  spawnTimer: 0,    // contador até o próximo obstáculo
  elapsed: 0,       // tempo total de partida (s)
  dodges: 0,        // obstáculos desviados
  shieldTimer: 0,   // segundos restantes de escudo
};

const player = {
  x: W / 2,                 // posição horizontal (centro do carrinho)
  y: CONFIG.PLAYER_BASE_Y, // posição vertical base (rodapé da tela)
  vx: 0,                   // velocidade lateral
  jumpY: 0,                // altura do pulo (px, 0 = no chão)
  jumpV: 0,                // velocidade vertical do pulo
};

let obstacles = [];  // carros inimigos
let pickups = [];    // escudos
let particles = [];  // fumaça / faíscas
let decor = [];      // objetos na grama (árvores, postes) para dar parallax

const keys = {};      // mapa de teclas pressionadas

/* =========================================================================
   4) ENTRADA (TECLADO E TOQUE)
   ========================================================================= */

/* =========================================================================
   3.1) LAYOUT RESPONSIVO + TELA CHEIA
   ========================================================================= */

/**
 * Recalcula o tamanho lógico do canvas e a geometria da pista.
 * Chamada na inicialização e sempre que a janela muda de tamanho
 * (redimensionar, girar o celular, entrar/sair de tela cheia).
 */
function layout() {
  // Proporção real da área do jogo (em pixels de CSS)
  const rect = canvas.getBoundingClientRect();
  const cssW = Math.max(1, rect.width || window.innerWidth || CONFIG.WIDTH);
  const cssH = Math.max(1, rect.height || window.innerHeight || CONFIG.HEIGHT);

  // Altura lógica fixa; largura deriva da proporção da tela
  H = LOGICAL_HEIGHT;
  W = Math.max(320, Math.min(4000, Math.round(H * (cssW / cssH))));

  // Buffer do canvas em resolução física (compatível com telas Retina)
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  // Largura da pista:
  //  - em telas estreitas (celular em pé) ela ocupa ~80% da largura;
  //  - em telas largas (paisagem) ela tem largura fixa e fica centralizada.
  ROAD_WIDTH = W <= 700 ? W * 0.8 : 520;
  ROAD_LEFT = (W - ROAD_WIDTH) / 2;
  ROAD_RIGHT = ROAD_LEFT + ROAD_WIDTH;
  LANE_WIDTH = ROAD_WIDTH / CONFIG.LANES;
  VERGE = Math.min(46, ROAD_LEFT * 0.5);

  // Reposiciona o jogador se ele estava fora da pista (janela redimensionada).
  // Fora de partida, o carrinho fica sempre no centro da pista.
  const halfW = CONFIG.PLAYER_W / 2;
  if (state.running) {
    player.x = Math.max(ROAD_LEFT + halfW, Math.min(ROAD_RIGHT - halfW, player.x));
  } else {
    player.x = ROAD_LEFT + ROAD_WIDTH / 2;
  }

  // Reorganiza a decoração da grama para a nova largura
  if (decor.length) buildDecor();
}

/** Entra/sai da tela cheia. */
function toggleFullscreen() {
  const doc = document;
  const el = doc.documentElement;

  if (!doc.fullscreenElement && !doc.webkitFullscreenElement) {
    const req = el.requestFullscreen || el.webkitRequestFullscreen;
    if (req) {
      const result = req.call(el);
      // Alguns navegadores devolvem Promise, outros não
      if (result && typeof result.catch === 'function') result.catch(() => {});
    }
  } else {
    const exit = doc.exitFullscreen || doc.webkitExitFullscreen;
    if (exit) {
      const result = exit.call(doc);
      if (result && typeof result.catch === 'function') result.catch(() => {});
    }
  }
}

/** Entra em tela cheia silenciosamente (usado ao apertar "Jogar"). */
function enterFullscreen() {
  if (document.fullscreenElement || document.webkitFullscreenElement) return;
  const el = document.documentElement;
  const req = el.requestFullscreen || el.webkitRequestFullscreen;
  if (!req) return;
  try {
    const result = req.call(el);
    if (result && typeof result.catch === 'function') result.catch(() => {});
  } catch (_) {
    /* navegador bloqueou — o jogo funciona igual sem tela cheia */
  }
}

btnFullscreen.addEventListener('click', toggleFullscreen);

// Recalcula o layout quando a janela muda (inclui entrar/sair de tela cheia)
window.addEventListener('resize', layout);
window.addEventListener('orientationchange', () => setTimeout(layout, 100));
document.addEventListener('fullscreenchange', () => setTimeout(layout, 50));

const LEFT_KEYS = ['ArrowLeft', 'a', 'A'];

const RIGHT_KEYS = ['ArrowRight', 'd', 'D'];

function keyDownHandler(e) {
  // Impede a rolagem da página com setas/espaço
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(e.key)) {
    e.preventDefault();
  }
  keys[e.key] = true;

  if (e.key === ' ' && state.running && !state.paused && player.jumpY === 0) {
    player.jumpV = CONFIG.JUMP_VELOCITY; // pulo
  }
  if (e.key === 'p' || e.key === 'P') togglePause();
  if (e.key === 'r' || e.key === 'R') startGame();
  if (e.key === 'f' || e.key === 'F') toggleFullscreen();

  // Enter/Espaço também iniciam o jogo a partir da tela inicial
  if (!state.running && !state.over && (e.key === 'Enter' || e.key === ' ')) {
    startGame();
  }
}

function keyUpHandler(e) {
  keys[e.key] = false;
}

window.addEventListener('keydown', keyDownHandler);
window.addEventListener('keyup', keyUpHandler);

// Solta as teclas se a aba perder o foco (evita o carrinho "grudar" na parede)
window.addEventListener('blur', () => {
  for (const key in keys) keys[key] = false;
});

// Botões de toque para celular
document.querySelectorAll('.touch-btn').forEach((btn) => {
  const dir = Number(btn.dataset.dir);
  const down = (e) => { e.preventDefault(); btn.dataset.active = '1'; };
  const up = (e) => { e.preventDefault(); btn.dataset.active = '0'; };
  btn.addEventListener('touchstart', down);
  btn.addEventListener('touchend', up);
  btn.addEventListener('mousedown', down);
  btn.addEventListener('mouseup', up);
});

// Arrastar o dedo na tela também move o carrinho
let touchTargetX = null;
canvas.addEventListener('touchmove', (e) => {
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  const touch = e.touches[0];
  touchTargetX = ((touch.clientX - rect.left) / rect.width) * W;
});

/* =========================================================================
   5) FLUXO DO JOGO (INICIAR, PAUSAR, GAME OVER)
   ========================================================================= */
function startGame() {
  clearTimeout(autoStartTimer);   // cancela o início automático pendente

  // Reinicia todos os contadores
  state.running = true;
  state.paused = false;
  state.over = false;
  state.score = 0;
  state.distance = 0;
  state.roadSpeed = CONFIG.ROAD_SPEED_START;
  state.scroll = 0;
  state.spawnTimer = 0;
  state.elapsed = 0;
  state.dodges = 0;
  state.shieldTimer = 0;

  player.x = W / 2;
  player.y = CONFIG.PLAYER_BASE_Y;
  player.vx = 0;
  player.jumpY = 0;
  player.jumpV = 0;

  obstacles = [];
  pickups = [];
  particles = [];
  touchTargetX = null;

  buildDecor();
  overlay.hidden = true;
  updateHUD();
}

function togglePause() {
  if (!state.running || state.over) return;
  state.paused = !state.paused;
  if (state.paused) {
    showOverlay('PAUSADO', 'Pressione <kbd>P</kbd> para continuar.', 'Continuar');
  } else {
    overlay.hidden = true;
  }
}

function gameOver() {
  state.over = true;
  state.running = false;

  // Salva o recorde no localStorage
  if (state.score > state.best) {
    state.best = state.score;
    storage.set('neonRacerBest', String(state.best));
  }

  showOverlay(
    'GAME OVER',
    `<div class="panel__stats">
       <div><span>Pontos</span><strong>${Math.floor(state.score)}</strong></div>
       <div><span>Distância</span><strong>${Math.floor(state.distance)}m</strong></div>
       <div><span>Desvios</span><strong>${state.dodges}</strong></div>
       <div><span>Recorde</span><strong>${state.best}</strong></div>
     </div>
     Pressione <kbd>R</kbd> ou o botão para jogar de novo.`,
    'Jogar novamente'
  );
}

function showOverlay(title, html, buttonLabel) {
  overlayTitle.textContent = title;
  overlayText.innerHTML = html;
  btnStart.textContent = buttonLabel;
  overlay.hidden = false;
}

btnStart.addEventListener('click', () => {
  // Se estiver pausado, o botão apenas continua.
  if (state.paused) {
    togglePause();
    return;
  }

  // Tenta ocupar a tela inteira — mas só quando a página é servida por
  // http(s). Em file:// alguns navegadores bloqueiam o pedido e a página
  // pode piscar/preencher de preto; nesses casos use o botão ⛶ ou a tecla F.
  if (location.protocol === 'http:' || location.protocol === 'https:') {
    enterFullscreen();
  }

  startGame();
});

/* =========================================================================
   6) GERAÇÃO DO CENÁRIO E DOS OBSTÁCULOS
   ========================================================================= */

/** Cria os objetos decorativos na grama (esquerda/direita da pista). */
function buildDecor() {
  decor = [];
  // Quantidade proporcional à área de grama (telas largas precisam de mais)
  const count = Math.max(24, Math.round(30 * (W / 480)));
  const grassLeft = Math.max(0, ROAD_LEFT - VERGE);        // grama à esquerda
  const grassRight = Math.max(0, W - ROAD_RIGHT - VERGE);  // grama à direita
  for (let i = 0; i < count; i++) {
    const side = Math.random() < 0.5 ? -1 : 1;
    const x = side < 0
      ? Math.random() * grassLeft * 0.95
      : ROAD_RIGHT + VERGE + Math.random() * grassRight * 0.95;
    decor.push({
      x,
      y: Math.random() * H,
      type: Math.random() < 0.5 ? 'tree' : 'post',
      scale: 0.7 + Math.random() * 0.7,
    });
  }
}

/** Calcula a posição central de uma faixa. */
function laneCenter(lane) {
  return ROAD_LEFT + LANE_WIDTH * (lane + 0.5);
}

/** Cria um novo obstáculo (carro inimigo) no topo da tela. */
function spawnObstacle() {
  const lane = randInt(0, CONFIG.LANES - 1);
  const isTruck = Math.random() < 0.25;

  const w = isTruck ? 58 : 46;
  const h = isTruck ? 104 : 82;

  obstacles.push({
    x: laneCenter(lane),
    y: -h - Math.random() * 80,           // nasce acima da tela
    w,
    h,
    speed: CONFIG.OBSTACLE_SPEED_MIN +
            Math.random() * (CONFIG.OBSTACLE_SPEED_MAX - CONFIG.OBSTACLE_SPEED_MIN),
    color: pick(CONFIG.OBSTACLE_COLORS),
    type: isTruck ? 'truck' : 'car',
    passed: false,                        // jáScores
  });

  // Às vezes um escudo aparece junto (para dar respiro ao jogador)
  if (Math.random() < CONFIG.SHIELD_SPAWN_CHANCE) {
    pickups.push({
      x: laneCenter(randInt(0, CONFIG.LANES - 1)),
      y: -40,
      r: 16,
      speed: 120,
    });
  }
}

/* =========================================================================
   7) ATUALIZAÇÃO (LÓGICA DO JOGO)
   Chamada a cada quadro com o tempo decorrido (dt) em segundos.
   ========================================================================= */
function update(dt) {
  if (!state.running || state.paused || state.over) return;

  state.elapsed += dt;

  // --- 7.1 Dificuldade progressiva -------------------------------------
  state.roadSpeed = Math.min(
    CONFIG.ROAD_SPEED_MAX,
    state.roadSpeed + CONFIG.ROAD_ACCEL * dt
  );

  // Distância (metros) — 10 pixels ≈ 1 metro
  const traveled = state.roadSpeed * dt;
  state.distance += traveled / 10;
  state.score += (traveled / 10) * CONFIG.POINTS_PER_METER;

  // Deslocamento do cenário
  state.scroll += traveled;

  // --- 7.2 Jogador: movimento lateral ----------------------------------
  let direction = 0;
  if (LEFT_KEYS.some((k) => keys[k])) direction -= 1;
  if (RIGHT_KEYS.some((k) => keys[k])) direction += 1;

  // No celular, arrastar o dedo define a posição-alvo
  if (touchTargetX !== null) {
    const diff = touchTargetX - player.x;
    direction = Math.abs(diff) < 6 ? 0 : Math.sign(diff);
  }

  if (direction !== 0) {
    player.vx += direction * CONFIG.PLAYER_ACCEL * dt;
    player.vx = Math.max(-CONFIG.PLAYER_MAX_SPEED, Math.min(CONFIG.PLAYER_MAX_SPEED, player.vx));
  } else {
    // Atrito: o carrinho desacelera aos poucos
    const friction = CONFIG.PLAYER_FRICTION * dt;
    player.vx = Math.abs(player.vx) <= friction ? 0 : player.vx - Math.sign(player.vx) * friction;
  }

  player.x += player.vx * dt;

  // Mantém o carrinho dentro da pista
  const halfW = CONFIG.PLAYER_W / 2;
  const minX = ROAD_LEFT + halfW;
  const maxX = ROAD_RIGHT - halfW;
  if (player.x < minX) { player.x = minX; player.vx = 0; }
  if (player.x > maxX) { player.x = maxX; player.vx = 0; }

  // --- 7.3 Pulo ----------------------------------------------------------
  if (player.jumpY > 0 || player.jumpV > 0) {
    player.jumpY += player.jumpV * dt;
    player.jumpV -= CONFIG.JUMP_GRAVITY * dt;
    if (player.jumpY <= 0) {
      player.jumpY = 0;
      player.jumpV = 0;
    }
  }

  // --- 7.4 Espuma/fumaça atrás do carrinho -------------------------------
  if (Math.abs(player.vx) > 120 && Math.random() < 0.6) {
    spawnParticle(player.x, player.y + CONFIG.PLAYER_H / 2 - 4, {
      vx: -player.vx * 0.15 + randInt(-20, 20),
      vy: randInt(20, 70),
      life: 0.5,
      size: randInt(3, 7),
      color: 'rgba(200,210,235,0.5)',
    });
  }

  // --- 7.5 Surto de obstáculos -----------------------------------------
  state.spawnTimer -= dt;
  if (state.spawnTimer <= 0) {
    spawnObstacle();
    const interval = Math.max(
      CONFIG.SPAWN_INTERVAL_MIN,
      CONFIG.SPAWN_INTERVAL_START - state.elapsed * CONFIG.SPAWN_RAMP
    );
    state.spawnTimer = interval * (0.75 + Math.random() * 0.5); // pequena variação
  }

  // --- 7.6 Atualiza obstáculos e checa colisões -------------------------
  for (let i = obstacles.length - 1; i >= 0; i--) {
    const ob = obstacles[i];
    ob.y += (state.roadSpeed + ob.speed) * dt;

    // Saiu da tela por baixo? Remove e credita o desvio.
    if (ob.y - ob.h / 2 > H) {
      obstacles.splice(i, 1);
      if (!ob.passed) {
        ob.passed = true;
        state.dodges++;
        state.score += CONFIG.POINTS_PER_DODGE;
      }
      continue;
    }

    if (checkCollision(ob)) {
      if (state.shieldTimer > 0) {
        // Escudo ativo: o obstáculo é destruído em vez de acabar com o jogo
        burst(ob.x, ob.y, ob.color, 14);
        obstacles.splice(i, 1);
      } else {
        burst(player.x, player.y, '#ff3d81', 26);
        gameOver();
        return;
      }
    }
  }

  // --- 7.7 Atualiza escudos (itens) --------------------------------------
  for (let i = pickups.length - 1; i >= 0; i--) {
    const p = pickups[i];
    p.y += (state.roadSpeed + p.speed) * dt;

    if (p.y - p.r > H) {
      pickups.splice(i, 1);
      continue;
    }

    // Colisão do jogador com o item
    const dx = player.x - p.x;
    const dy = (player.y - player.jumpY) - p.y;
    if (Math.hypot(dx, dy) < p.r + 18) {
      state.shieldTimer = CONFIG.SHIELD_DURATION;
      state.score += CONFIG.POINTS_PER_PICKUP;
      showToast('ESCUDO ATIVADO!');
      burst(p.x, p.y, '#3dff9e', 16);
      pickups.splice(i, 1);
    }
  }

  // --- 7.8 Temporizadores ------------------------------------------------
  if (state.shieldTimer > 0) {
    state.shieldTimer = Math.max(0, state.shieldTimer - dt);
  }

  // --- 7.9 Partículas ----------------------------------------------------
  for (let i = particles.length - 1; i >= 0; i--) {
    const pt = particles[i];
    pt.x += pt.vx * dt;
    pt.y += pt.vy * dt;
    pt.vy += 120 * dt;      // gravidade leve
    pt.life -= dt;
    if (pt.life <= 0) particles.splice(i, 1);
  }

  updateHUD();
}

/** Retângulo de colisão do jogador (considera o pulo). */
function playerRect() {
  return {
    x: player.x - CONFIG.PLAYER_W / 2,
    y: player.y - player.jumpY - CONFIG.PLAYER_H / 2,
    w: CONFIG.PLAYER_W,
    h: CONFIG.PLAYER_H,
  };
}

/** Testa colisão entre o jogador e um obstáculo. */
function checkCollision(obstacle) {
  const p = playerRect();
  const o = {
    x: obstacle.x - obstacle.w / 2,
    y: obstacle.y - obstacle.h / 2,
    w: obstacle.w,
    h: obstacle.h,
  };
  // Encolhe um pouco as caixas para ser justo com o jogador (hitbox amigável)
  const pad = 6;
  return rectsOverlap(
    { x: p.x + pad, y: p.y + pad, w: p.w - pad * 2, h: p.h - pad * 2 },
    { x: o.x + pad, y: o.y + pad, w: o.w - pad * 2, h: o.h - pad * 2 }
  );
}

/* =========================================================================
   8) PARTÍCULAS
   ========================================================================= */
function spawnParticle(x, y, opts = {}) {
  particles.push({
    x, y,
    vx: opts.vx ?? 0,
    vy: opts.vy ?? 0,
    life: opts.life ?? 0.6,
    maxLife: opts.life ?? 0.6,
    size: opts.size ?? 5,
    color: opts.color ?? '#fff',
  });
}

/** Explosão de partículas (usada em colisões e pickups). */
function burst(x, y, color, count = 12) {
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.6;
    const speed = randInt(80, 260);
    spawnParticle(x, y, {
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: randInt(0.3, 0.7),
      size: randInt(3, 8),
      color,
    });
  }
}

/* =========================================================================
   9) DESENHO (RENDER)
   ========================================================================= */

/** Desenha um carrinho visto de cima. `facing` = 'up' (jogador) ou 'down'. */
function drawCar(cx, cy, w, h, color, facing = 'up') {
  const halfW = w / 2;
  const halfH = h / 2;

  ctx.save();
  ctx.translate(cx, cy);
  if (facing === 'down') ctx.scale(1, -1); // inverte o carro (vira de frente)

  // Sombra
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  roundRect(ctx, -halfW + 3, -halfH + 6, w, h, 10);
  ctx.fill();

  // Rodas
  ctx.fillStyle = '#12141c';
  roundRect(ctx, -halfW - 3, -halfH + 10, 9, 18, 3); ctx.fill();
  roundRect(ctx, -halfW - 3, halfH - 30, 9, 18, 3); ctx.fill();
  roundRect(ctx, halfW - 6, -halfH + 10, 9, 18, 3); ctx.fill();
  roundRect(ctx, halfW - 6, halfH - 30, 9, 18, 3); ctx.fill();

  // Corpo com degrade lateral
  const grad = ctx.createLinearGradient(-halfW, 0, halfW, 0);
  grad.addColorStop(0, shade(color, -45));
  grad.addColorStop(0.45, color);
  grad.addColorStop(1, shade(color, -45));
  ctx.fillStyle = grad;
  roundRect(ctx, -halfW, -halfH, w, h, 11);
  ctx.fill();

  // Vidros
  ctx.fillStyle = 'rgba(18,28,45,0.92)';
  roundRect(ctx, -halfW + 8, -halfH + 16, w - 16, 20, 6); ctx.fill();
  roundRect(ctx, -halfW + 8, halfH - 38, w - 16, 15, 6); ctx.fill();

  // Faixa central (branco)
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.fillRect(-3, -halfH + 40, 6, h - 80);

  // Faróis (frente do carro = lado -y)
  ctx.fillStyle = '#fff6c9';
  roundRect(ctx, -halfW + 6, -halfH + 4, 11, 6, 3); ctx.fill();
  roundRect(ctx, halfW - 17, -halfH + 4, 11, 6, 3); ctx.fill();

  // Lanternas traseiras
  ctx.fillStyle = '#ff4d5e';
  roundRect(ctx, -halfW + 6, halfH - 9, 11, 6, 3); ctx.fill();
  roundRect(ctx, halfW - 17, halfH - 9, 11, 6, 3); ctx.fill();

  ctx.restore();
}

/** Desenha o cenário (grama + pista) com rolagem. */
function drawRoad() {
  // Grama
  const grass = ctx.createLinearGradient(0, 0, W, H);
  grass.addColorStop(0, '#17341f');
  grass.addColorStop(1, '#0f2617');
  ctx.fillStyle = grass;
  ctx.fillRect(0, 0, W, H);

  // Faixas de grama com parallax (rolam mais rápido que a pista)
  const stripe = 120;
  const off = (state.scroll * 1.25) % (stripe * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.028)';
  for (let y = -stripe * 2 + off; y < H + stripe * 2; y += stripe * 2) {
    ctx.fillRect(0, y, W, stripe);
  }

  // Decorações na grama (árvores/postes)
  for (const d of decor) {
    const y = ((d.y + state.scroll * 1.25) % (H + 80)) - 40;
    ctx.save();
    ctx.globalAlpha = 0.85;
    if (d.type === 'tree') {
      ctx.fillStyle = '#0b1b10';
      ctx.beginPath();
      ctx.arc(d.x, y, 16 * d.scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1f5c31';
      ctx.beginPath();
      ctx.arc(d.x, y - 3 * d.scale, 12 * d.scale, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = '#2b3550';
      ctx.fillRect(d.x - 3, y - 18, 6, 36);
      ctx.fillStyle = '#ffd166';
      ctx.fillRect(d.x - 5, y - 22, 10, 6);
    }
    ctx.restore();
  }

  // Asfalto
  ctx.fillStyle = '#1b1e26';
  ctx.fillRect(ROAD_LEFT, 0, ROAD_WIDTH, H);

  // "Vergem" de terra logo ao lado da pista (ancora visualmente a estrada)
  const VERGE_W = VERGE;
  ctx.fillStyle = '#2b2a24';
  ctx.fillRect(ROAD_LEFT - VERGE_W, 0, VERGE_W, H);
  ctx.fillRect(ROAD_RIGHT, 0, VERGE_W, H);
  // Textura da verge rolando junto com o cenário
  ctx.fillStyle = 'rgba(0,0,0,0.16)';
  const vergeOff = state.scroll % 90;
  for (let y = -90 + vergeOff; y < H + 90; y += 90) {
    ctx.fillRect(ROAD_LEFT - VERGE_W, y, VERGE_W, 45);
    ctx.fillRect(ROAD_RIGHT, y + 45, VERGE_W, 45);
  }

  // Brilho lateral do asfalto
  const asphaltShade = ctx.createLinearGradient(ROAD_LEFT, 0, ROAD_RIGHT, 0);
  asphaltShade.addColorStop(0, 'rgba(0,0,0,0.45)');
  asphaltShade.addColorStop(0.15, 'rgba(255,255,255,0.02)');
  asphaltShade.addColorStop(0.85, 'rgba(255,255,255,0.02)');
  asphaltShade.addColorStop(1, 'rgba(0,0,0,0.45)');
  ctx.fillStyle = asphaltShade;
  ctx.fillRect(ROAD_LEFT, 0, ROAD_WIDTH, H);

  // Bordas da pista (faixas contínuas, brancas)
  ctx.fillStyle = '#e8edf7';
  ctx.fillRect(ROAD_LEFT - 4, 0, 4, H);
  ctx.fillRect(ROAD_RIGHT, 0, 4, H);
  // Bordas vermelhas (como pista de corrida)
  ctx.fillStyle = '#e6405a';
  ctx.fillRect(ROAD_LEFT - 8, 0, 4, H);
  ctx.fillRect(ROAD_RIGHT + 4, 0, 4, H);

  // Faixas tracejadas entre as lanes
  const dash = 42;      // comprimento do tracejado
  const period = 78;    // distância entre tracejados
  const offset = state.scroll % period;
  ctx.fillStyle = 'rgba(232,237,247,0.75)';
  for (let lane = 1; lane < CONFIG.LANES; lane++) {
    const x = ROAD_LEFT + LANE_WIDTH * lane - 3;
    for (let y = -period + offset; y < H + period; y += period) {
      ctx.fillRect(x, y, 6, dash);
    }
  }
}

/** Desenha os itens (escudos). */
function drawPickups() {
  for (const p of pickups) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(state.elapsed * 3);

    ctx.fillStyle = 'rgba(61,255,158,0.25)';
    ctx.beginPath();
    ctx.arc(0, 0, p.r + 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#3dff9e';
    ctx.beginPath();
    ctx.arc(0, 0, p.r, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#0d2b1c';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('S', 0, 1);
    ctx.restore();
  }
}

/** Desenha o jogador (com escudo e sombra de pulo). */
function drawPlayer() {
  const y = player.y - player.jumpY;

  // Sombra no chão (some quando o carro está no alto do pulo)
  ctx.save();
  ctx.globalAlpha = Math.max(0.15, 0.45 - player.jumpY / 260);
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.ellipse(player.x, player.y + CONFIG.PLAYER_H / 2 + 6, CONFIG.PLAYER_W * 0.5, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Anel de escudo
  if (state.shieldTimer > 0) {
    const pulse = 1 + Math.sin(state.elapsed * 10) * 0.08;
    ctx.save();
    ctx.globalAlpha = 0.35 + 0.25 * Math.sin(state.elapsed * 8);
    ctx.strokeStyle = '#3dff9e';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(player.x, y, CONFIG.PLAYER_W * 0.85 * pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // Rotaciona levemente o carro conforme a direção (sensação de direção)
  ctx.save();
  ctx.translate(player.x, y);
  ctx.rotate(player.vx / 1600);
  drawCar(0, 0, CONFIG.PLAYER_W, CONFIG.PLAYER_H, CONFIG.PLAYER_COLOR, 'up');
  ctx.restore();
}

/** Desenha as partículas. */
function drawParticles() {
  for (const pt of particles) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
    ctx.fillStyle = pt.color;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

/** Desenha o quadro completo. */
function render() {
  ctx.clearRect(0, 0, W, H);
  drawRoad();

  for (const ob of obstacles) {
    drawCar(ob.x, ob.y, ob.w, ob.h, ob.color, 'down');
  }

  drawPickups();
  drawPlayer();
  drawParticles();
}

/* =========================================================================
   10) HUD (PLACAR NA TELA)
   ========================================================================= */
function updateHUD() {
  scoreEl.textContent = Math.floor(state.score);
  // Conversão "de pixels para km/h" só para ficar bonito
  const kmh = Math.round(state.roadSpeed * 0.28);
  speedEl.innerHTML = `${kmh} <small>km/h</small>`;
  bestEl.textContent = state.best;
}

/** Mostra um aviso temporário no topo da tela. */
let toastTimeout = null;
function showToast(text) {
  toastEl.textContent = text;
  toastEl.classList.add('toast--visible');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toastEl.classList.remove('toast--visible'), 1600);
}

/* =========================================================================
   11) LOOP PRINCIPAL
   O requestAnimationFrame chama `loop` ~60x por segundo. Calculamos o tempo
   decorrido (dt) para que a física funcione igual em qualquer monitor.
   ========================================================================= */
let lastTime = 0;

function loop(timestamp) {
  if (!lastTime) lastTime = timestamp;
  const dt = Math.min((timestamp - lastTime) / 1000, 0.05); // limita "saltos" de quadro
  lastTime = timestamp;

  update(dt);
  render();

  requestAnimationFrame(loop);
}

/* =========================================================================
   12) INICIALIZAÇÃO
   ========================================================================= */
/** Leitura/escrita segura no localStorage (alguns navegadores bloqueiam em file://). */
const storage = {
  get(key) {
    try {
      return localStorage.getItem(key);
    } catch (_) {
      return null;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (_) {
      /* sem persistência — o jogo continua funcionando */
    }
  },
};

function init() {
  // Se o navegador não suportar Canvas 2D, avisa em vez de mostrar tela preta
  if (!ctx) {
    document.body.innerHTML =
      '<p style="color:#fff;font:16px sans-serif;padding:24px">' +
      'Seu navegador não suporta Canvas 2D. Tente Chrome, Firefox ou Edge.</p>';
    return;
  }

  // Calcula o tamanho do canvas e a geometria da pista
  layout();

  // Carrega o recorde salvo
  state.best = Number(storage.get('neonRacerBest') || 0);
  updateHUD();

  // Tela inicial
  showOverlay(
    'NEON RACER',
    'Desvie dos carros que descem na pista!<br />' +
    '<kbd>&larr;</kbd> <kbd>&rarr;</kbd> movem &nbsp;•&nbsp; <kbd>Espaço</kbd> pula &nbsp;•&nbsp; pegue escudos verdes<br />' +
    '<small>clique em Jogar — ou aguarde, o jogo começa sozinho</small>',
    'Jogar'
  );

  // Começa sozinho em 5 segundos se ninguém clicar
  scheduleAutoStart(5000);

  requestAnimationFrame(loop);
}

/* =========================================================================
   12.1) TRATAMENTO DE ERROS
   Se algo quebrar, mostramos o motivo na tela em vez de deixar tudo preto.
   ========================================================================= */
window.addEventListener('error', (e) => {
  showOverlay(
    'ERRO',
    `Algo impede o jogo de rodar:<br /><small>${e.message}</small>`,
    'Recarregar'
  );
  btnStart.onclick = () => location.reload();
});

/* =========================================================================
   12.2) INÍCIO AUTOMÁTICO
   Se o usuário não clicar em "Jogar", a partida começa sozinha depois de
   alguns segundos — assim a página nunca fica "parada" parecendo quebrada.
   ========================================================================= */
let autoStartTimer = null;

function scheduleAutoStart(delay = 5000) {
  clearTimeout(autoStartTimer);
  autoStartTimer = setTimeout(() => {
    if (!state.running && !state.over) {
      overlay.hidden = true;
      startGame();
    }
  }, delay);
}

init();
