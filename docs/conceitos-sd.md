# Conceitos de Sistemas Distribuídos — Análise do Projeto

## 1. Que tipos de sistemas utilizam message brokers?

Message brokers como RabbitMQ são usados em:
- **Plataformas de e-commerce** (checkout → pagamento → estoque → notificação) — exatamente nosso projeto
- **Sistemas de reserva** (passagens, hotéis, ingressos) com controle de concorrência em estoque limitado
- **Pipelines de IoT** (ingestão de eventos de sensores)
- **Sistemas bancários** (processamento assíncrono de transações)
- **Microserviços em geral** — desacoplamento entre bounded contexts

**Por que não HTTP síncrono?** Se o serviço de pagamento demorar 5s ou cair, toda a requisição do usuário falha e ele vê erro. Com mensageria, o pedido entra na fila e o cliente recebe confirmação imediata — o processamento ocorre de forma assíncrona.

---

## 2. Quais funcionalidades o RabbitMQ oferece?

| Funcionalidade | Como usada no projeto |
|---|---|
| Exchanges (direct) | `ticket-sales`, `payment-approved`, `stock-confirmed` roteiam para as filas certas |
| Filas durable | Sobrevivem a reinícios do broker |
| Mensagens PERSISTENT | Gravadas em disco antes de qualquer confirmação |
| ACK manual | Consumer só confirma após processamento + persistência |
| Dead Letter Exchange | NACK sem requeue → `dead-letter-exchange` → `dead-letter-queue` |
| QoS / Prefetch | `prefetch_count=10` limita mensagens "em voo" por worker (backpressure) |
| Management HTTP API | Consultada pelo endpoint `/stats` para mostrar profundidade de fila ao frontend |
| Prometheus Plugin | Exposição de métricas de fila para Grafana |

---

## 3. Que tipos de falhas são suportadas?

### Crash-stop do worker
**O que acontece:** container do payment-worker morre abruptamente.  
**Resposta:** RabbitMQ detecta desconexão TCP. Mensagens `unacked` voltam para `ready`. Outros workers processam.  
**Demonstração:** `make kill-payment`

### Crash-recovery do broker
**O que acontece:** RabbitMQ reinicia.  
**Resposta:** Mensagens PERSISTENT + filas durable são recuperadas do disco. Workers reconectam via `connect_robust`.  
**Demonstração:** `make restart-rabbit`

### Falha de processamento (lógica)
**O que acontece:** payment-worker recebe erro simulado (`simulate_failure=True`).  
**Resposta:** Republica com header `x-retry-count++`. Após 3 tentativas: NACK → DLQ.  
**Demonstração:** `make send-failures`

### Race condition de estoque
**O que acontece:** dois stock-workers processam pedidos para o mesmo evento simultaneamente.  
**Resposta:** `SELECT FOR UPDATE` serializa o acesso a `available_tickets`. Nenhum overbooking ocorre.  
**Código:** `stock-worker/src/database.py:reserve_tickets()`

### Network partition (producer → broker)
**O que acontece:** rede entre producer e RabbitMQ fica indisponível.  
**Resposta:** `connect_robust` tenta reconectar com backoff. Producer retorna HTTP 503 durante a partição.  
**Limitação:** pedidos tentados durante a partição são perdidos (sem Outbox Pattern).

---

## 4. Nível de confiabilidade — comparação com modelos formais

### Fair-Loss Links
**Definição:** mensagens podem ser perdidas, mas se enviadas infinitamente, eventualmente chegam.

**No projeto SEM persistência:**
```python
# exchange non-durable + delivery_mode=NON_PERSISTENT
# → mensagem só na RAM → perdida no crash do broker
```
Comportamento: Fair-Loss. O broker pode perder mensagens silenciosamente.

### Perfect Links (at-least-once delivery)
**Definição:** toda mensagem enviada eventualmente é entregue. Sem geração espontânea.

**No projeto COM persistência (nossa implementação):**
- Exchange durable + fila durable + `delivery_mode=PERSISTENT` → mensagem gravada em disco
- ACK manual → RabbitMQ só remove da fila após confirmação do worker
- `connect_robust` → reconexão automática após crashes temporários

**Ressalva:** at-least-once pode gerar duplicatas (worker processa e falha antes do ACK). Nossa idempotência (verificação de status antes de reprocessar) trata isso.

### Best Effort Broadcast
**Nossa implementação — endpoint `POST /batch`:**
```python
# publisher.py — publica sem publisher confirms
await self._exchange.publish(message, routing_key="payment")
# Se o broker cair AQUI: mensagem perdida. Producer não sabe.
```
O producer dispara N pedidos e retorna. Não há garantia de que todos foram entregues a algum worker. Análogo a UDP em broadcast.

### Reliable Broadcast Regular
**Definição:** se um processo correto entrega m, todos os processos corretos entregam m.

**Aproximação no projeto:** com persistência + ACK manual, toda mensagem que chega ao broker será eventualmente processada por algum worker (supondo que haja ao menos 1 worker ativo). Isso se aproxima de Reliable Broadcast **para a relação producer→fila**: se o producer entregou ao broker, os workers vão processar.

**O que falta:** se o producer falhar no meio de um batch, as mensagens não publicadas se perdem (diferença do Reliable Broadcast formal, onde um crash do emissor não impede entrega das já enviadas).

### Reliable Broadcast Uniforme
**Definição:** mesmo que um processo falhe no meio da entrega, **todos** (corretos e com falha) entregam a mensagem.

**RabbitMQ NÃO implementa nativamente:** um worker pode iniciar o processamento, executar parte (ex: salvar no banco), e falhar antes do ACK. Outro worker recebe a mensagem novamente. O estado parcial do primeiro worker "ficou" — o sistema não tem consenso sobre "todos entregaram".

**Aproximação:** nossa idempotência (verificação de `order.status` antes de processar) garante que o **efeito visível** seja único, mesmo que a mensagem seja processada múltiplas vezes. Isso implementa semanticamente "exactly-once visible state" sem ser formalmente Uniform Reliable Broadcast.

---

## 5. Ordenação de mensagens

### FIFO dentro de uma fila
**Garantido:** pedidos publicados em `ticket-sales` chegam a `payment-queue` na mesma ordem. Um único payment-worker processa em FIFO.

### Com múltiplos workers (N > 1)
**Ordem global não garantida.** Worker A recebe pedido 1 e Worker B recebe pedido 2. Se B for mais rápido, pedido 2 é confirmado antes de pedido 1.

**Demonstração:**
```bash
make scale-workers N=3 && make send-100
# Observe no banco: processed_at não respeita a ordem de created_at
```

### Total Order (como implementar)
Para garantir ordem total entre pedidos do mesmo evento:
1. **Single worker por evento:** particionamento por `event_id` (como Kafka faz por partition key)
2. **Sequencer:** um nó atribui números de sequência antes de enfileirar
3. **Rejeição de duplicatas em ordem:** vector clocks por evento

---

## 6. Como as garantias são implementadas internamente

### Persistência
```
Publisher → exchange.publish(PERSISTENT) → RabbitMQ escreve em /var/lib/rabbitmq (disco) → retorna
Consumer → processa → session.commit() → ack()
RabbitMQ → remove da fila (disco)
```
Se o broker cair entre "escreve no disco" e "retorna ao publisher", o publisher pode não saber se a mensagem chegou. Com **publisher confirms** (`channel.confirm_delivery()`), o broker confirma explicitamente. Nosso projeto não usa publisher confirms (Best Effort).

### ACK Manual e At-Least-Once
```
msg → worker → tenta processar
  → sucesso: commit DB → ack → RabbitMQ remove
  → falha: republica retry → ack original
  → max retries: nack(requeue=False) → DLX → DLQ
```

### SELECT FOR UPDATE (anti-overbooking)
```sql
BEGIN;
SELECT * FROM events WHERE id = $1 FOR UPDATE;  -- bloqueia outras transações
UPDATE events SET available_tickets = available_tickets - $qty WHERE id = $1;
UPDATE orders SET status = 'stock_reserved' WHERE id = $2;
COMMIT;  -- libera o lock
```
Dois stock-workers processando o mesmo evento ficam enfileirados no nível do banco — o segundo só executa após o primeiro commitar. Se o primeiro esgotou o estoque, o segundo recebe `out_of_stock`.

### Backpressure via QoS
```
prefetch_count = 10 por worker
Worker tem 10 mensagens "em voo"
RabbitMQ para de enviar
Worker processa e envia ACKs
Slots liberam → RabbitMQ envia mais
```
Proteção automática contra worker sobrecarregado.
