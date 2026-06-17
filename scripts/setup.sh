#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

for cmd in docker curl python3; do
    command -v "$cmd" &>/dev/null || { echo "ERRO: $cmd não encontrado."; exit 1; }
done

docker compose version &>/dev/null || { echo "ERRO: docker compose não encontrado."; exit 1; }

[ -f "$ROOT/.env" ] || { cp "$ROOT/.env.example" "$ROOT/.env"; echo ".env criado."; }
chmod +x "$ROOT/scripts/"*.sh
echo "Pronto. Execute: make up"
