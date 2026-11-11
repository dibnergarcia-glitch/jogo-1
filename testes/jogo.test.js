/**
 * testes/jogo.test.js
 * -------------------------------------------------------------------------
 * Simula uma partida inteira (com um piloto automático que desvia) e
 * confere que o jogo roda sem exceções e que um carro na mesma faixa
 * realmente acaba com a partida.
 *
 * Uso: node testes/jogo.test.js
 */
const { run } = require('./harness.js');

const ok = run(`
  (function () {
    const out = [];
    function log(label, cond, extra) {
      out.push(cond);
      console.log((cond ? 'OK    ' : 'FALHA ') + '  ' + label + (extra || ''));
    }

    // 1) Carro na mesma faixa derruba o jogador
    startGame();
    state.spawnTimer = 1e9;
    obstacles.length = 0;
    player.x = laneCenter(0);
    obstacles.push({
      x: laneCenter(0), y: player.y - 10, w: CAR_W, h: CAR_H, lane: 0,
      speed: 100, color: '#f00', type: 'car', passed: false,
    });
    update(1 / 60);
    log('carro na mesma faixa acaba com a partida', state.over === true);

    // 2) Partida longa sem erros
    startGame();
    let frames = 0;
    let pontos = 0;
    try {
      while (!state.over && frames < 60 * 90) {
        // piloto automático: fica na faixa mais livre
        let melhorFaixa = 0, melhorDist = -1;
        for (let l = 0; l < LANES; l++) {
          let dist = 9999;
          for (const ob of obstacles) {
            if (ob.lane !== l) continue;
            if (ob.y > player.y - 260) continue;
            dist = Math.min(dist, Math.abs(ob.y - player.y));
          }
          if (dist > melhorDist) { melhorDist = dist; melhorFaixa = l; }
        }
        const alvo = laneCenter(melhorFaixa);
        player.vx = Math.max(-600, Math.min(600, (alvo - player.x) * 6));
        player.x += player.vx / 60;
        const minX = ROAD_LEFT + PLAYER_W / 2;
        const maxX = ROAD_RIGHT - PLAYER_W / 2;
        player.x = Math.max(minX, Math.min(maxX, player.x));
        if (Math.random() < 0.01) keys['ArrowUp'] = !keys['ArrowUp'];
        update(1 / 60);
        frames++;
        pontos = state.score;
      }
      log('partida simulada sem exceção', true,
          '  (' + frames + ' quadros, ' + Math.floor(pontos) + ' pontos)');
    } catch (e) {
      log('partida simulada sem exceção', false, '  ' + e.message);
    }

    console.log('\\nResultado: ' + (out.every(Boolean) ? 'OK' : 'FALHA'));
    return out.every(Boolean);
  })()
`);

process.exit(ok ? 0 : 1);
