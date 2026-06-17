#!/usr/bin/env bash
set -euo pipefail
API="http://localhost:8000"
CYAN='\033[36m'; BOLD='\033[1m'; RESET='\033[0m'

pause() { echo; echo -e "${CYAN}── ENTER para continuar ──${RESET}"; read -r; }
header() { echo; echo -e "${BOLD}${CYAN}══ $1 ══${RESET}"; echo; }

curl -sf "$API/health" > /dev/null || { echo "Producer offline. Execute 'make up'."; exit 1; }

header "Exp 1 — Baseline: 100 pedidos"
echo "Conceito: throughput, FIFO, pipeline payment→stock→notification"
curl -s -X POST "$API/batch?count=100" | python3 -m json.tool
pause

header "Exp 2 — Carga: 1000 pedidos"
echo "Conceito: crescimento de fila, backpressure, balanceamento entre workers"
curl -s -X POST "$API/batch?count=1000" | python3 -m json.tool
pause

header "Exp 3 — Dead Letter Queue (30%% de falha)"
echo "Conceito: retry com x-retry-count, DLX, falha definitiva"
curl -s -X POST "$API/batch?count=100&failure_rate=0.3" | python3 -m json.tool
echo "Aguardando retries (30s)..."
sleep 30
RMQUSER=$(grep RABBITMQ_USER ../.env 2>/dev/null | cut -d= -f2 || echo "admin")
RMQPASS=$(grep RABBITMQ_PASS ../.env 2>/dev/null | cut -d= -f2 || echo "admin123")
curl -s -u "$RMQUSER:$RMQPASS" "http://localhost:15672/api/queues/%2F/dead-letter-queue" | \
    python3 -c "import sys,json; d=json.load(sys.stdin); print(f'  DLQ: {d.get(\"messages\",0)} mensagens')"
pause

header "Exp 4 — Crash-stop: derrubar payment-worker"
echo "Conceito: crash-stop failure model, recuperação automática"
curl -s -X POST "$API/batch?count=200" > /dev/null &
sleep 1
CONTAINER=$(docker ps --filter "name=payment-worker" --format "{{.Names}}" | head -n 1)
if [ -n "$CONTAINER" ]; then
    docker kill "$CONTAINER"
    echo "Worker '$CONTAINER' morto. Mensagens retornam à fila automaticamente."
else
    echo "Nenhum payment-worker ativo."
fi
wait
pause

header "Exp 5 — Escalabilidade horizontal: 5 workers"
echo "Conceito: escalabilidade linear, balanceamento de carga"
docker compose up -d --scale payment-worker=5 --scale stock-worker=5 --scale notification-worker=5 --no-recreate
echo "5 réplicas de cada worker ativas!"
curl -s -X POST "$API/batch?count=1000" | python3 -m json.tool
echo "Observe a fila drenando mais rápido no Grafana."
pause

header "Exp 6 — Crash-recovery: restart do RabbitMQ"
echo "Conceito: persistência de mensagens (delivery_mode=PERSISTENT)"
docker compose stop payment-worker stock-worker notification-worker
curl -s -X POST "$API/batch?count=300" > /dev/null
BEFORE=$(curl -s -u "$RMQUSER:$RMQPASS" "http://localhost:15672/api/queues/%2F/payment-queue" | python3 -c "import sys,json; print(json.load(sys.stdin).get('messages',0))")
echo "Mensagens na fila: $BEFORE"
docker compose restart rabbitmq
until docker compose exec rabbitmq rabbitmq-diagnostics ping > /dev/null 2>&1; do sleep 2; printf "."; done
echo
AFTER=$(curl -s -u "$RMQUSER:$RMQPASS" "http://localhost:15672/api/queues/%2F/payment-queue" 2>/dev/null | python3 -c "import sys,json; print(json.load(sys.stdin).get('messages',0))" 2>/dev/null || echo "?")
echo "Mensagens após restart: $AFTER (devem ser iguais a $BEFORE)"
docker compose up -d payment-worker stock-worker notification-worker
pause

echo -e "${BOLD}Experimentos concluídos! Resultados no banco:${RESET}"
echo "  make db-query   → resumo por status"
echo "  make db-stats   → latências"
