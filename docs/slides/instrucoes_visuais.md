# Materiais Visuais a Coletar — Checklist

Cada item abaixo é um placeholder no PPTX. Depois de coletar o material:
1. Abra o PPTX no PowerPoint
2. Clique com botão direito no placeholder laranja → Delete
3. Insert → Pictures / Online Pictures / Video

---

## IMAGENS (estáticas — PNG ou JPG)

### [ Slide 7 ] Diagrama oficial de arquitetura RabbitMQ
- **O que é:** Producer → Exchange → Queue → Consumer com setas e labels
- **Onde buscar:** Google Imagens → `rabbitmq hello world tutorial diagram`
- **Fonte preferida:** rabbitmq.com/tutorials (primeira imagem do tutorial "Hello World")
- **Dica:** fundo branco, setas claras — vai contrastar bem com o slide escuro

### [ Slide 8 ] Diagrama Direct Exchange
- **O que é:** Producer com routing key → Direct Exchange → fila específica → Consumer
- **Onde buscar:** Google Imagens → `rabbitmq direct exchange diagram cloudamqp`
- **Fonte preferida:** cloudamqp.com/blog/rabbitmq-exchanges-tutorial.html (seção Direct)
- **Dica:** o CloudAMQP tem cores vibrantes que ficam bonitas

### [ Slide 9 ] Diagramas Fanout, Topic e Headers (3 imagens)
- **O que são:** um diagrama por tipo de exchange
- **Onde buscar:**
  - `rabbitmq fanout exchange diagram` → CloudAMQP ou rabbitmq.com
  - `rabbitmq topic exchange diagram` → CloudAMQP ou rabbitmq.com
  - `rabbitmq headers exchange diagram` → CloudAMQP
- **Dica:** o CloudAMQP tem uma série de posts "RabbitMQ Exchanges Tutorial" — use as imagens desse post

---

## SCREENSHOTS do app (subir o TicketLab antes)

```bash
# Na pasta t2_sistemas_distribuidos/
make setup      # cria .env (só primeira vez)
make up         # sobe todos os containers (~30s)
```

### [ Slide 22 ] Tela principal do TicketLab
- **URL:** http://localhost:3000
- **O que capturar:** tela Home com os cards de eventos (Coldplay, Lollapalooza, etc.)
- **Ferramenta:** PrintScreen ou Snipping Tool (Win+Shift+S)

### [ Slide 23 ] Tela de compra
- **URL:** http://localhost:3000/buy (ou clique num evento)
- **O que capturar:** formulário preenchido com nome, e-mail, quantidade — antes de clicar

### [ Slide 23 ] Pedido em progresso
- **URL:** http://localhost:3000/orders
- **O que capturar:** tabela de pedidos mostrando status `processing` ou `payment_approved`
- **Como:** fazer uma compra e rapidamente capturar (o processamento é rápido)

### [ Slide 23 ] Pedido confirmado
- **URL:** http://localhost:3000/orders → clicar no pedido
- **O que capturar:** detalhes do pedido com status `confirmed` e ticket_code

### [ Slide 24 ] Dead Letter Queue
```bash
make send-failures    # 30% de taxa de falha
# aguardar ~10s
```
- **URL:** http://localhost:15672 (login: admin / admin123)
- **O que capturar:** Queues → dead-letter-queue com mensagens acumuladas
- **Aba:** Queues → clicar em "dead-letter-queue" → Get messages

### [ Slide 24 ] Crash-stop no Grafana
```bash
make send-1000
make kill-payment
```
- **URL:** http://localhost:3001 (login: admin / admin123)
- **O que capturar:** painel "Consumer Count" mostrando queda de 2 para 1
- **Alternativa:** screenshot do RabbitMQ UI → Queues → payment-queue → consumer count caindo

### [ Slide 24 ] Crash-recovery — filas intactas
```bash
make restart-rabbit
# aguardar ~15s
```
- **URL:** http://localhost:15672 → Queues
- **O que capturar:** tabela de filas com mensagens ainda presentes após o restart

---

## GIFs (animados)

### [ Slide 3 ] Vídeo Fireship — OPCIONAL
- **O que é:** "RabbitMQ in 100 Seconds" by Fireship (YouTube)
- **Como usar:** abrir no browser ANTES da apresentação, pausado nos primeiros segundos
- **Não inserir no PPTX** — apenas abrir no browser no momento certo (slide 3)
- **Como encontrar:** buscar "RabbitMQ in 100 Seconds Fireship" no YouTube

### [ Slide 11 ] GIF terminal — crash-stop — OPCIONAL
- **Ferramenta Windows:** ScreenToGif (gratuito, screentogifsoftware.com)
- **O que gravar:** janela do terminal executando:
  ```
  make send-1000
  make kill-payment
  make logs-payment
  ```
- **Duração ideal:** 15-20 segundos
- **Como inserir no PPTX:** Insert → Video → Video on my PC (PowerPoint aceita GIF animado como vídeo)

### [ Slide 18 ] GIF de fila FIFO — OPCIONAL
- **Onde buscar:** Google Imagens → `message queue fifo animation gif`
- **Alternativa:** buscar `queue data structure animation gif`
- **Dica:** vários resultados em gfycat.com e giphy.com

---

## Ordem sugerida de coleta (da mais fácil à mais trabalhosa)

1. Imagens do CloudAMQP / rabbitmq.com (10 min — só buscar e salvar)
2. Screenshots do app (20 min — subir containers + capturar)
3. GIF Fireship (0 min — só abrir no browser na hora)
4. GIF terminal crash-stop (30 min — opcional, alto impacto)
