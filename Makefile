.PHONY: help up down build logs ps setup clean \
        send-100 send-1000 send-failures \
        kill-payment scale-workers inspect-dlq \
        slow-mode fast-mode restart-rabbit \
        logs-payment logs-stock logs-notification \
        db-query db-stats

API       := http://localhost:8000
RMQAPI    := http://localhost:15672
N         ?= 3
CYAN      := \033[36m
BOLD      := \033[1m
RESET     := \033[0m

help:
	@echo ""
	@echo "$(BOLD)TicketLab — Sistemas Distribuídos$(RESET)"
	@echo ""
	@echo "$(CYAN)Ambiente$(RESET)"
	@echo "  make setup              Configura .env inicial"
	@echo "  make up                 Sobe todos os serviços"
	@echo "  make down               Para os serviços"
	@echo "  make build              Reconstrói imagens"
	@echo "  make ps                 Status dos containers"
	@echo "  make clean              Remove tudo (volumes incluídos)"
	@echo ""
	@echo "$(CYAN)Experimentos$(RESET)"
	@echo "  make send-100           100 pedidos normais"
	@echo "  make send-1000          1000 pedidos"
	@echo "  make send-failures      100 pedidos com 30% de falha"
	@echo "  make kill-payment       Derruba 1 payment-worker"
	@echo "  make scale-workers N=5  Escala os 3 workers para N réplicas"
	@echo "  make inspect-dlq        Inspeciona mensagens na DLQ"
	@echo "  make slow-mode          Workers lentos (1 réplica, delay alto)"
	@echo "  make fast-mode          Workers rápidos (5 réplicas)"
	@echo "  make restart-rabbit     Reinicia RabbitMQ (crash-recovery)"
	@echo ""
	@echo "$(CYAN)Logs$(RESET)"
	@echo "  make logs-payment       Logs do payment-worker"
	@echo "  make logs-stock         Logs do stock-worker"
	@echo "  make logs-notification  Logs do notification-worker"
	@echo ""
	@echo "$(CYAN)Banco$(RESET)"
	@echo "  make db-query           Pedidos por status e worker"
	@echo "  make db-stats           Estatísticas de latência"
	@echo ""

setup:
	@[ -f .env ] || cp .env.example .env && echo ".env criado"
	@chmod +x scripts/*.sh

up:
	docker compose up -d --build
	@echo ""
	@echo "$(BOLD)Serviços:$(RESET)"
	@echo "  Frontend      → http://localhost:3000"
	@echo "  API           → http://localhost:8000/docs"
	@echo "  RabbitMQ UI   → $(RMQAPI)  (admin/admin123)"
	@echo "  Grafana       → http://localhost:3001  (admin/admin123)"
	@echo "  Prometheus    → http://localhost:9090"

down:
	docker compose down

build:
	docker compose build --no-cache

logs:
	docker compose logs -f

ps:
	docker compose ps

clean:
	@./scripts/cleanup.sh

send-100:
	@echo "$(CYAN)Enviando 100 pedidos...$(RESET)"
	curl -s -X POST "$(API)/batch?count=100" | python3 -m json.tool

send-1000:
	@echo "$(CYAN)Enviando 1000 pedidos...$(RESET)"
	curl -s -X POST "$(API)/batch?count=1000" | python3 -m json.tool

send-failures:
	@echo "$(CYAN)Enviando 100 pedidos com 30%% de falha...$(RESET)"
	curl -s -X POST "$(API)/batch?count=100&failure_rate=0.3" | python3 -m json.tool

kill-payment:
	@echo "$(CYAN)Derrubando um payment-worker...$(RESET)"
	@docker ps --filter "name=payment-worker" --format "{{.Names}}" | head -n 1 | xargs -r docker kill
	@echo "Worker morto. Mensagens em voo retornam à fila automaticamente."

scale-workers:
	@echo "$(CYAN)Escalando workers para $(N) réplicas...$(RESET)"
	docker compose up -d \
		--scale payment-worker=$(N) \
		--scale stock-worker=$(N) \
		--scale notification-worker=$(N) \
		--no-recreate
	@docker compose ps | grep worker

inspect-dlq:
	@echo "$(CYAN)Dead Letter Queue:$(RESET)"
	@RMQUSER=$$(grep RABBITMQ_USER .env | cut -d= -f2); \
	RMQPASS=$$(grep RABBITMQ_PASS .env | cut -d= -f2); \
	curl -s -u "$$RMQUSER:$$RMQPASS" \
		"$(RMQAPI)/api/queues/%2F/dead-letter-queue" | \
		python3 -c "import sys,json; d=json.load(sys.stdin); print(f'  Mensagens na DLQ: {d.get(\"messages\",0)}')"

slow-mode:
	@echo "$(CYAN)Modo lento: 1 réplica, delays altos...$(RESET)"
	PAYMENT_DELAY_MIN=4 PAYMENT_DELAY_MAX=8 \
	STOCK_DELAY_MIN=3 STOCK_DELAY_MAX=6 \
	docker compose up -d --force-recreate \
		--scale payment-worker=1 \
		--scale stock-worker=1 \
		--scale notification-worker=1 \
		payment-worker stock-worker notification-worker
	@echo "Use 'make send-1000' para encher a fila."

fast-mode:
	@echo "$(CYAN)Modo rápido: 5 réplicas, delays mínimos...$(RESET)"
	PAYMENT_DELAY_MIN=0 PAYMENT_DELAY_MAX=0.1 \
	STOCK_DELAY_MIN=0 STOCK_DELAY_MAX=0.05 \
	docker compose up -d --force-recreate \
		--scale payment-worker=5 \
		--scale stock-worker=5 \
		--scale notification-worker=5 \
		payment-worker stock-worker notification-worker

restart-rabbit:
	@echo "$(CYAN)Enviando 200 pedidos antes do restart...$(RESET)"
	curl -s -X POST "$(API)/batch?count=200" > /dev/null
	@echo "Reiniciando RabbitMQ..."
	docker compose restart rabbitmq
	@echo "Aguardando..."
	@until docker compose exec rabbitmq rabbitmq-diagnostics ping > /dev/null 2>&1; do sleep 2; printf "."; done
	@echo ""
	@RMQUSER=$$(grep RABBITMQ_USER .env | cut -d= -f2); \
	RMQPASS=$$(grep RABBITMQ_PASS .env | cut -d= -f2); \
	curl -s -u "$$RMQUSER:$$RMQPASS" "$(RMQAPI)/api/queues/%2F/payment-queue" | \
		python3 -c "import sys,json; d=json.load(sys.stdin); print(f'Mensagens persistidas na fila: {d.get(\"messages\",0)}')"

logs-payment:
	docker compose logs -f payment-worker

logs-stock:
	docker compose logs -f stock-worker

logs-notification:
	docker compose logs -f notification-worker

db-query:
	docker compose exec postgres psql \
		-U $$(grep POSTGRES_USER .env | cut -d= -f2) \
		-d $$(grep POSTGRES_DB .env | cut -d= -f2) \
		-c "SELECT status, processed_by, COUNT(*) as total FROM orders GROUP BY status, processed_by ORDER BY status, total DESC;"

db-stats:
	docker compose exec postgres psql \
		-U $$(grep POSTGRES_USER .env | cut -d= -f2) \
		-d $$(grep POSTGRES_DB .env | cut -d= -f2) \
		-c "SELECT status, COUNT(*) as total, MIN(updated_at - created_at) as min_lat, AVG(updated_at - created_at) as avg_lat, MAX(updated_at - created_at) as max_lat FROM orders GROUP BY status ORDER BY status;"
