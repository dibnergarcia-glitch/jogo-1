/**
 * build-single-file.js
 * -------------------------------------------------------------------------
 * Gera `jogo-completo.html`: uma cópia do jogo com o CSS e o JavaScript
 * embutidos no próprio HTML.
 *
 * Por que isso existe?
 *   Abrir `index.html` por duplo clique (file://) funciona na maioria dos
 *   navegadores, mas depende de os arquivos `style.css` e `game.js` estarem
 *   na mesma pasta e de o navegador permitir scripts locais. A versão de
 *   arquivo único não depende de nada: é um único `.html` autocontido,
 *   perfeito para compartilhar, e-mailar ou abrir em qualquer máquina.
 *
 * Uso:  node build-single-file.js
 */
const fs = require('fs');
const path = require('path');

const root = __dirname;
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'style.css'), 'utf8');
const js = fs.readFileSync(path.join(root, 'game.js'), 'utf8');

const banner = `<!--
  ============================================================================
   NEON RACER — versão de arquivo único (gerada por build-single-file.js)
   CSS e JavaScript estão embutidos: basta abrir este arquivo no navegador.
   Para editar o jogo, altere index.html / style.css / game.js e rode:
       node build-single-file.js
  ============================================================================
-->
`;

const output = html
  .replace(
    '<link rel="stylesheet" href="style.css" />',
    `<style>\n${css}\n  </style>`
  )
  .replace(
    '<script src="game.js"></script>',
    `<script>\n${js}\n  </script>`
  );

const target = path.join(root, 'jogo-completo.html');
fs.writeFileSync(target, banner + output, 'utf8');

console.log('✔ jogo-completo.html gerado (' + fs.statSync(target).size + ' bytes)');
