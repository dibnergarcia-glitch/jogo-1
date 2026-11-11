/**
 * testes/colisao.test.js
 * -------------------------------------------------------------------------
 * Confere a regra de colisão por faixa:
 *  - o jogador encostado na BORDA da pista TEM que ser atingido pelo carro
 *    que vem na mesma faixa (era o bug: o carro "passava direto");
 *  - o jogador NÃO pode ser atingido por um carro de outra faixa;
 *  - pular por cima do carro continua funcionando.
 *
 * Uso: node testes/colisao.test.js
 */
const { run } = require('./harness.js');

const ok = run(`
  (function () {
    const out = [];
    function log(label, cond, extra) {
      out.push(cond);
      console.log((cond ? 'OK    ' : 'FALHA ') + '  ' + label + (extra || ''));
    }

    function obstacleInLane(lane, y) {
      return {
        x: laneCenter(lane),
        y: y === undefined ? player.y : y,
        w: CAR_W, h: CAR_H, lane,
        color: '#fff', type: 'car', speed: 100, passed: false,
      };
    }

    const minX = ROAD_LEFT + PLAYER_W / 2;
    const maxX = ROAD_RIGHT - PLAYER_W / 2;

    console.log('W=' + W + '  LANES=' + LANES + '  LANE_WIDTH=' + LANE_WIDTH.toFixed(1) +
      '  JOGADOR=' + PLAYER_W + 'x' + PLAYER_H + '  CARRO=' + CAR_W + 'x' + CAR_H + '\\n');

    // 1) Jogador encostado na borda esquerda + carro da faixa 0
    player.x = minX;
    log('borda esquerda: carro da faixa 0 atinge o jogador',
        checkCollision(obstacleInLane(0)));

    // 2) Jogador encostado na borda direita + carro da última faixa
    player.x = maxX;
    log('borda direita: carro da última faixa atinge o jogador',
        checkCollision(obstacleInLane(LANES - 1)));

    // 3) Jogador no centro de cada faixa
    let todos = true;
    for (let l = 0; l < LANES; l++) {
      player.x = laneCenter(l);
      if (!checkCollision(obstacleInLane(l))) todos = false;
    }
    log('centro de todas as faixas: sempre colide', todos);

    // 4) Faixa vizinha não pode atingir
    player.x = laneCenter(0);
    log('carro da faixa vizinha NÃO atinge',
        !checkCollision(obstacleInLane(1)));

    // 5) Carro longe (ainda não chegou) não colide
    log('carro acima do jogador não colide',
        !checkCollision(obstacleInLane(0, player.y - 400)));

    // 6) Pulo por cima do carro
    player.jumpY = 200;
    const pulou = !checkCollision(obstacleInLane(0));
    player.jumpY = 0;
    log('pulo por cima do carro funciona', pulou);

    console.log('\\nResultado: ' + (out.every(Boolean) ? 'OK' : 'FALHA'));
    return out.every(Boolean);
  })()
`);

process.exit(ok ? 0 : 1);
