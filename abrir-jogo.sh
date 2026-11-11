#!/bin/bash
# ============================================================================
#  abrir-jogo.sh — abre o Neon Racer no navegador
# ----------------------------------------------------------------------------
#  Por que este script existe?
#    Neste ambiente, os navegadores estão "embrulhados" por scripts que
#    sempre abrem junto a plataforma https://www.educacao.pr.gov.br/iniciar.
#    Consequência: qualquer HTML aberto pelo duplo clique acaba mostrando
#    essa página em vez do jogo (ou junto com ele).
#
#    A solução é chamar os binários REAIS dos navegadores, que não têm o
#    wrapper:
#       Chrome  -> /opt/google/chrome/chrome
#       Firefox -> /usr/lib/firefox/firefox
#
#    Além disso, este script sobe um servidor local (http://localhost:8000),
#    o que faz o jogo conseguir entrar em tela cheia automaticamente.
#
#    Uso:  ./abrir-jogo.sh
# ============================================================================
set -e

cd "$(dirname "$0")"

PORTA="${PORTA:-8000}"
PAGINA="http://localhost:${PORTA}/jogo-completo.html"

# --- 1) Sobe o servidor local ---------------------------------------------
if ! curl -s -o /dev/null "http://localhost:${PORTA}" 2>/dev/null; then
  echo "Iniciando servidor local na porta ${PORTA}..."
  python3 -m http.server "$PORTA" --bind 127.0.0.1 >/dev/null 2>&1 &
  SERVER_PID=$!
  sleep 1
  trap 'kill $SERVER_PID 2>/dev/null || true' EXIT
fi

# --- 2) Abre no navegador real (sem wrapper) ------------------------------
if [ -x /opt/google/chrome/chrome ]; then
  echo "Abrindo no Chrome..."
  exec /opt/google/chrome/chrome --new-window --start-fullscreen "$PAGINA"
elif [ -x /usr/lib/firefox/firefox ]; then
  echo "Abrindo no Firefox..."
  exec /usr/lib/firefox/firefox --new-window "$PAGINA"
else
  echo "Navegador nao encontrado; abrindo o arquivo direto..."
  exec xdg-open "jogo-completo.html"
fi
