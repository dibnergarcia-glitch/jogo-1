/**
 * testes/velocidade.test.js
 * -------------------------------------------------------------------------
 * Confere o acelerador e o freio:
 *  - ↑/W acelera a pista (até o limite máximo);
 *  - ↓/S freia (até o limite mínimo);
 *  - acelerar rende mais pontos que frear.
 *
 * Uso: node testes/velocidade.test.js
 */
const { run } = require('./harness.js');

const ok = run(`
  (function () {
    const out = [];
    function log(label, cond, extra) {
      out.push(cond);
      console.log((cond ? 'OK    ' : 'FALHA ') + '  ' + label + (extra || ''));
    }

    startGame();
    const dt = 1 / 60;

    // Mantém a partida viva (sem obstáculos) durante o teste
    function tick(n) {
      for (let i = 0; i < n; i++) {
        state.spawnTimer = 1e9;
        obstacles.length = 0;
        update(dt);
      }
    }

    state.roadSpeed = 300;
    keys['ArrowUp'] = true;
    tick(60);
    log('acelerador aumenta a velocidade', state.roadSpeed > 650,
        '  (300 -> ' + state.roadSpeed.toFixed(0) + ')');

    tick(600);
    log('não passa da velocidade máxima',
        state.roadSpeed <= CONFIG.ROAD_SPEED_MAX + 0.01,
        '  (' + state.roadSpeed.toFixed(0) + ' / ' + CONFIG.ROAD_SPEED_MAX + ')');

    keys['ArrowUp'] = false;
    keys['ArrowDown'] = true;
    tick(60);
    log('freio reduz a velocidade', state.roadSpeed < 200,
        '  (-> ' + state.roadSpeed.toFixed(0) + ')');

    tick(600);
    log('não passa da velocidade mínima',
        state.roadSpeed >= CONFIG.ROAD_SPEED_MIN - 0.01,
        '  (' + state.roadSpeed.toFixed(0) + ' / ' + CONFIG.ROAD_SPEED_MIN + ')');

    keys['ArrowDown'] = false;
    state.score = 0; state.roadSpeed = 300;
    tick(60);
    const pontosLento = state.score;

    state.score = 0;
    keys['ArrowUp'] = true;
    tick(60);
    log('acelerar rende mais pontos', state.score > pontosLento,
        '  (' + pontosLento.toFixed(0) + ' -> ' + state.score.toFixed(0) + ')');

    console.log('\\nResultado: ' + (out.every(Boolean) ? 'OK' : 'FALHA'));
    return out.every(Boolean);
  })()
`);

process.exit(ok ? 0 : 1);
