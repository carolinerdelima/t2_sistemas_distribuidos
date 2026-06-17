# Guia de Demo — TicketLab

Passo a passo para rodar a demonstração durante a apresentação.

---

## Pré-requisitos

- Docker e Docker Compose instalados
- Projeto clonado em `ticket-sales-distributed/`

---

## Subir o ambiente

```bash
cd ticket-sales-distributed
make setup   # cria o .env (só na primeira vez)
make up      # build + start de todos os containers (~90s na 1ª vez)
```

Aguarde todos os containers ficarem healthy:

```bash
make ps
```

---

## URLs

| Serviço | URL | Login |
|---|---|---|
| Frontend | http://localhost:3000 | — |
| API (Swagger) | http://localhost:8000/docs | — |
| RabbitMQ | http://localhost:15672 | admin / admin123 |
| Grafana | http://localhost:3001 | admin / admin123 |
| Prometheus | http://localhost:9090 | — |

---

## Demo 1 — Compra normal (pipeline completo)

**Conceito demonstrado:** pipeline payment → stock → notification, Perfect Links, at-least-once

1. Abrir http://localhost:3000
2. Escolher um evento, preencher nome e comprar
3. Acompanhar o status mudar em tempo real:
   `pending → payment_approved → stock_reserved → confirmed`
4. Ao confirmar, aparece o código do ingresso (UUID)

---

## Demo 2 — Crash-stop (tolerância a falhas)

**Conceito demonstrado:** crash-stop failure model, mensagens `unacked` voltam à fila

```bash
make send-1000     # enche a fila com pedidos
make kill-payment  # mata um payment-worker abruptamente
```

O que observar:
- **RabbitMQ UI** (http://localhost:15672 → Queues → payment-queue): consumer count cai, mensagens ficam em `ready`
- Os pedidos continuam sendo processados pelos workers restantes — nenhuma mensagem perdida

---

## Demo 3 — Dead Letter Queue (retry + falha definitiva)

**Conceito demonstrado:** retry com header `x-retry-count`, DLX, BEB

```bash
make send-failures   # envia pedidos que vão falhar (30% de falha simulada)
```

Aguardar ~30 segundos (3 retries por mensagem com delay entre eles) e então:

```bash
make inspect-dlq     # mostra mensagens acumuladas na dead-letter-queue
```

O que observar:
- **RabbitMQ UI** → Queues → dead-letter-queue: mensagens acumulando
- Cada mensagem foi tentada 3 vezes antes de ir para a DLQ

---

## Demo 4 — Escalabilidade e quebra de FIFO

**Conceito demonstrado:** FIFO garantido com 1 worker, ordem global quebrada com N workers

```bash
make scale-workers N=5   # sobe 5 réplicas de cada worker
make send-100            # envia 100 pedidos
make db-query            # consulta o banco
```

O que observar no resultado do `db-query`:
- `processed_at` **não** respeita a ordem de `created_at`
- Worker mais rápido confirmou pedido 50 antes de outro confirmar o pedido 3

Para voltar a 1 worker e ver FIFO restaurado:

```bash
make scale-workers N=1
make send-100
make db-query
```

---

## Demo 5 — Crash-recovery do broker (persistência de mensagens)

**Conceito demonstrado:** delivery_mode=PERSISTENT, filas durable, Perfect Links

```bash
make send-1000        # enche a fila
make restart-rabbit   # reinicia o RabbitMQ
```

O que observar:
- **RabbitMQ UI**: após reiniciar, as mensagens ainda estão na fila
- Workers reconectam automaticamente via `connect_robust`
- Processamento continua sem intervenção manual

---

## Sequência completa automática

Para rodar todos os experimentos em sequência com pausas interativas:

```bash
./scripts/run-experiments.sh
```

---

## Parar tudo

```bash
make down
```

Para parar e apagar volumes (banco e filas zerados):

```bash
make clean
```
