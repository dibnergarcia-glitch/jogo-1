/**
 * testes/harness.js
 * -------------------------------------------------------------------------
 * Carrega o `game.js` em um sandbox (Node + `vm`) com DOM e Canvas falsos.
 * Assim dá para testar a lógica do jogo (colisão, acelerador, freio)
 * sem abrir o navegador.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function noop() {}

function makeCtx() {
  return new Proxy({}, {
    get(target, prop) {
      if (prop === 'canvas') return { width: 800, height: 720 };
      if (prop === 'measureText') return () => ({ width: 10 });
      if (prop === 'createLinearGradient' || prop === 'createRadialGradient')
        return () => ({ addColorStop: noop });
      return typeof prop === 'string' ? noop : undefined;
    },
    set() { return true; },
  });
}

function makeElement(id) {
  return {
    id, style: {}, dataset: {}, hidden: false, textContent: '', innerHTML: '',
    classList: { add: noop, remove: noop, contains: () => false },
    addEventListener() {}, appendChild() {}, removeChild() {},
    getBoundingClientRect() { return { width: 1280, height: 720, left: 0, top: 0 }; },
    getContext() { return makeCtx(); },
    querySelectorAll() { return []; },
  };
}

const elements = {};

const document = {
  getElementById(id) {
    if (!elements[id]) elements[id] = makeElement(id);
    return elements[id];
  },
  createElement(tag) {
    const el = makeElement(tag);
    el.appendChild = () => {};
    return el;
  },
  querySelector() { return makeElement('stage'); },
  querySelectorAll() { return []; },
  addEventListener() {},
  documentElement: { requestFullscreen: null },
  body: { innerHTML: '', appendChild() {} },
};

const window = {
  innerWidth: 1280, innerHeight: 720, devicePixelRatio: 1,
  addEventListener() {},
  localStorage: { getItem: () => null, setItem: noop },
  requestAnimationFrame: () => 0,
  setTimeout: () => 0, clearTimeout: noop,
};

const sandbox = {
  console, document, window,
  localStorage: window.localStorage,
  requestAnimationFrame: () => 0,
  setTimeout: () => 0, clearTimeout: noop,
  Math, Date, JSON, Object, Array, Number, String, parseInt, parseFloat, isNaN,
};
sandbox.globalThis = sandbox;
vm.createContext(sandbox);

const file = process.argv[2] || path.join(__dirname, '..', 'game.js');
vm.runInContext(fs.readFileSync(file, 'utf8'), sandbox, { filename: file });

/** Executa uma expressão dentro do sandbox do jogo. */
function run(code) {
  return vm.runInContext(code, sandbox);
}

module.exports = { sandbox, run };
