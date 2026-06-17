# Roteiro de Apresentação — 15 Minutos

**Foco:** conceitos de Sistemas Distribuídos demonstrados no projeto  
**Contexto:** outro grupo apresenta RabbitMQ em detalhe — aqui ele é só infraestrutura

---

## Slide 1 — Problema (2 min)

> "Imagine o Lollapalooza abrindo vendas às 10h. 50.000 pessoas clicando 'Comprar' ao mesmo tempo."

**Arquitetura síncrona (o que não funciona):**
```
Usuário → API → chama pagamento → aguarda → chama estoque → aguarda → chama email → responde
```
- Se qualquer etapa demorar ou cair: timeout, erro 500
- Dois usuários chegam ao estoque ao mesmo tempo → overbooking
- Escalar é difícil: cada requisição segura o thread até o fim

**Pergunta para a turma:** como desacoplar essas etapas sem perder garantias?

---

## Slide 2 — Solução: comunicação assíncrona via fila (1 min)

```
Usuário → API → fila → workers independentes processam em paralelo
```

- API responde imediatamente com `status: pending`
- Cada etapa é um worker independente
- Falha em um worker não derruba os outros

**RabbitMQ** é o broker de mensagens que usamos — recebe, armazena e entrega as mensagens entre os serviços. Não vamos nos aprofundar nele pois outro grupo cobre isso.

Arquitetura do projeto:
```
Frontend → Producer (FastAPI)
  → payment-worker → stock-worker → notification-worker
cada etapa separada por uma fila
```

---

## Slide 3 — Fair-Loss vs Perfect Links (2 min)

**Questão:** mensagens podem se perder?

### Fair-Loss Link
```python
# exchange non-durable, delivery_mode=NON_PERSISTENT
# → mensagem só na RAM
# → broker reinicia → mensagem some
```
Sem garantia. Se o broker cair entre publicação e entrega, a mensagem desaparece silenciosamente.

### Perfect Link (nossa implementação)
Três propriedades necessárias: validade, ausência de duplicatas*, ausência de criação espontânea.

```python
# exchange durable + fila durable + delivery_mode=PERSISTENT
# → RabbitMQ grava em disco antes de confirmar
# → ACK manual: worker só confirma após salvar no banco
# → connect_robust: reconexão automática após queda da rede
```

**Demonstração:** `make restart-rabbit` — mensagens na fila sobrevivem ao reinício.

> *at-least-once: duplicatas são possíveis após crash antes do ACK. A idempotência (Slide 8) trata isso.

---

## Slide 4 — Best Effort Broadcast (1 min)

**Definição:** o emissor dispara para todos os destinatários mas não garante entrega se ele mesmo falhar.

**No projeto — endpoint `POST /batch`:**
```python
# producer publica N mensagens e retorna ao cliente
# sem publisher confirms
# se o broker cair durante a publicação: mensagens não enviadas se perdem
# o producer não sabe quais chegaram
```

Análogo a UDP em broadcast: "enviei, torço para chegar."

**Contraste:** com *publisher confirms* (`channel.confirm_delivery()`), o broker confirmaria cada mensagem — mas não implementamos isso.

---

## Slide 5 — Reliable Broadcast (aproximação) (1 min)

**Definição formal:** se um processo correto entrega `m`, todos os processos corretos entregam `m`.

**Nossa aproximação:**
- Mensagem PERSISTENT + fila durable → se chegou ao broker, não some
- ACK manual → broker só remove após o worker processar com sucesso
- Logo: qualquer mensagem que chegou ao broker **será eventualmente processada** por algum worker ativo

**O que falta para ser RB formal:** se o producer falha no meio de um batch, as mensagens ainda não publicadas se perdem (o crash do emissor impede a entrega das não-enviadas).

**O que falta para ser Uniform RB:** um worker pode processar parcialmente e falhar antes do ACK — a mensagem volta à fila mas o efeito parcial ocorreu.

---

## Slide 6 — Ordenação FIFO (1 min)

**Questão:** os pedidos são processados na ordem em que chegaram?

### Com 1 worker — FIFO garantido
```
Pedido 1 → processado 1º
Pedido 2 → processado 2º
...
```
A fila entrega em ordem. Um único consumer processa em sequência.

### Com N workers — ordem global quebrada
```bash
make scale-workers N=5 && make send-100
make db-query
# processed_at NÃO respeita a ordem de created_at
# Worker A confirmou pedido 50 antes de Worker B confirmar pedido 3
```

**Como garantir ordem total se necessário:**
- 1 worker por `event_id` (particionamento como Kafka faz)
- Sequencer: nó central atribui número de sequência antes de enfileirar

---

## Slide 7 — Falhas: Crash-stop e Crash-recovery (2 min)

### Crash-stop (worker)
```bash
make send-1000      # enche a fila
make kill-payment   # mata um payment-worker abruptamente
make logs-payment   # outros workers assumem — nenhuma mensagem perdida
```
**Mecanismo:** RabbitMQ detecta desconexão TCP → mensagens `unacked` voltam ao estado `ready` → outros consumers as pegam.

### Crash-recovery (broker)
```bash
make restart-rabbit
# Mensagens que estavam na fila sobrevivem
# Workers reconectam automaticamente via connect_robust
```
**Mecanismo:** delivery_mode=PERSISTENT + fila durable → mensagens gravadas em disco. `connect_robust` usa backoff exponencial para reconectar.

**Modelo de falha suportado:** crash-stop e crash-recovery. Não suportamos Byzantine.

---

## Slide 8 — Race Condition e Idempotência (2 min)

### Overbooking sem controle
```
Worker A lê: 1 ingresso disponível → reserva
Worker B lê: 1 ingresso disponível → reserva (ao mesmo tempo)
Resultado: 2 vendas, 0 ingressos → overbooking
```

### SELECT FOR UPDATE (nossa solução)
```sql
BEGIN;
SELECT * FROM events WHERE id = $1 FOR UPDATE;  -- bloqueia outros
UPDATE events SET available_tickets = available_tickets - 1 WHERE id = $1;
COMMIT;  -- libera o lock
```
O segundo worker fica bloqueado até o primeiro commitar. Se o estoque zerou, recebe `out_of_stock`.

**Código:** `stock-worker/src/database.py → reserve_tickets()`

### Idempotência
At-least-once entrega pode duplicar mensagens. Nossa proteção:
```python
# notification-worker verifica antes de processar
if order.status == "confirmed":
    return  # já processado, ignora duplicata
```

---

## Slide 9 — Demo ao vivo (2 min)

**Sequência:**
1. Abrir http://localhost:3000 — comprar 1 ingresso, ver status mudar em tempo real
2. `make send-failures` → aguardar → `make inspect-dlq` — ver mensagens na Dead Letter Queue após 3 retries
3. `make kill-payment` → Grafana mostra consumer count caindo, fila continua sendo drenada pelos workers restantes

---

## Slide 10 — Conclusão (1 min)

| Conceito | Como demonstramos |
|---|---|
| Fair-Loss vs Perfect Links | Persistência em disco + ACK manual |
| Best Effort Broadcast | `/batch` sem publisher confirms |
| Reliable Broadcast (aprox.) | Pipeline completo com persistência |
| FIFO | Quebra com N workers — `make scale-workers` |
| Crash-stop | `make kill-payment` — sem perda de mensagens |
| Crash-recovery | `make restart-rabbit` — mensagens sobrevivem |
| Race condition | `SELECT FOR UPDATE` no stock-worker |
| Idempotência | Verificação de status antes de reprocessar |

**Limitações e próximos passos:**
- Publisher confirms → sair do BEB para Reliable Broadcast formal
- Outbox Pattern → zero perda durante partição de rede producer↔broker
- Kafka com partições por `event_id` → ordem total por evento

---

## Perguntas esperadas da banca

**P: O sistema é exactly-once?**  
R: Não nativamente. É at-least-once — duplicatas são possíveis após crash antes do ACK. A idempotência via `order.status` garante que o *efeito visível* seja único, mas o processamento pode ocorrer mais de uma vez.

**P: O SELECT FOR UPDATE é distribuído?**  
R: É serializável por banco de dados. Com múltiplos nós PostgreSQL sem coordenação, precisaríamos de 2PC ou similar. Aqui o PostgreSQL é o ponto de serialização central para o estoque.

**P: Por que não HTTP entre os serviços?**  
R: Acoplamento temporal. Se o stock-worker cair, o payment-worker não precisa saber — o pedido aguarda na fila até o serviço voltar. Com HTTP síncrono, a falha se propaga imediatamente.

**P: Como garantir ordem total?**  
R: Particionamento por `event_id` (um worker exclusivo por evento) ou um sequencer central que atribui números antes de publicar. Kafka faz isso nativamente com partition keys.
