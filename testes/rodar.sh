#!/usr/bin/env bash
# Roda todos os testes do jogo (sem navegador).
# Uso: ./testes/rodar.sh
set -e
cd "$(dirname "$0")/.."

falhas=0
for t in testes/*.test.js; do
  echo ""
  echo "=== $t ==="
  node "$t" || falhas=1
done

echo ""
if [ "$falhas" -eq 0 ]; then
  echo "✔ Todos os testes passaram"
else
  echo "✘ Houve falhas nos testes"
fi
exit "$falhas"
