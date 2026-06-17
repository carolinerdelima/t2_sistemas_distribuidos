#!/usr/bin/env bash
set -euo pipefail
echo -n "Remove containers, volumes e imagens? (s/N): "
read -r CONFIRM
[[ "$CONFIRM" =~ ^[sS]$ ]] || { echo "Cancelado."; exit 0; }
docker compose down --volumes --remove-orphans
docker image rm ticket-sales-distributed-producer \
               ticket-sales-distributed-payment-worker \
               ticket-sales-distributed-stock-worker \
               ticket-sales-distributed-notification-worker \
               ticket-sales-distributed-frontend 2>/dev/null || true
echo "Limpo."
