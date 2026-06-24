import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import EduModal from '../components/EduModal'
import StepProgress from '../components/StepProgress'
import TerminalBlock from '../components/TerminalBlock'
import { usePolling } from '../hooks/usePolling'
import {
  createOrder, getOrder, getOrders, sendBatch, getStats, getEvents,
  debugKillWorker, debugScaleWorker,
} from '../services/api'

// ─── Animação etapa 1 ────────────────────────────────────────────────────────

function SyncAnimation() {
  return (
    <div className="bg-gray-950 rounded-xl p-5 overflow-hidden select-none">
      <p className="text-xs text-gray-500 mb-4 font-mono">// 50.000 usuários simultâneos, arquitetura síncrona</p>
      <div className="flex items-center gap-4">
        <div className="flex flex-col gap-1.5">
          {[1,2,3,4,5].map(i => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-gray-400 text-xs w-5">u{i}</span>
              <div className={`h-2 w-2 rounded-full bg-blue-400 anim-req anim-req-${i}`} />
            </div>
          ))}
          <p className="text-[10px] text-gray-600 mt-1">usuários</p>
        </div>
        <div className="flex-1 space-y-1">
          {['Thread 1', 'Thread 2', 'Thread 3', 'Thread 4'].map((t, i) => (
            <div key={t} className="flex items-center gap-2">
              <span className="text-[10px] text-gray-500 w-14">{t}</span>
              <div className="flex-1 h-3 bg-gray-800 rounded overflow-hidden">
                <div
                  className={`h-full bg-red-500 anim-thread anim-thread-${i + 1}`}
                  style={{ width: 0 }}
                />
              </div>
              <span className="text-[10px] text-red-400 anim-pulse-red px-1 rounded">BLOQUEADA</span>
            </div>
          ))}
        </div>
        <div className="flex flex-col items-center gap-1">
          <div className="w-16 h-14 rounded-xl border-2 border-red-500 bg-red-950 flex flex-col items-center justify-center anim-pulse-red">
            <p className="text-[10px] text-red-300 font-bold">DB</p>
            <p className="text-[10px] text-red-400">timeout</p>
          </div>
          <p className="text-[10px] text-gray-600">banco</p>
        </div>
      </div>
      <p className="text-xs text-red-400 mt-4 text-center font-mono">
        503 Service Unavailable, o servidor esgotou o pool de threads
      </p>
    </div>
  )
}

// ─── CodeBlock inline ─────────────────────────────────────────────────────────

function Code({ children }) {
  return (
    <pre className="bg-gray-900 text-green-300 text-xs font-mono rounded-xl px-5 py-4 overflow-x-auto leading-relaxed whitespace-pre">
      {children}
    </pre>
  )
}

// ─── StatusPill ───────────────────────────────────────────────────────────────

const STATUS_COLORS = {
  pending:          'bg-yellow-100 text-yellow-800',
  processing:       'bg-blue-100 text-blue-800',
  payment_approved: 'bg-indigo-100 text-indigo-800',
  stock_reserved:   'bg-purple-100 text-purple-800',
  confirmed:        'bg-green-100 text-green-800',
  payment_failed:   'bg-red-100 text-red-800',
  out_of_stock:     'bg-orange-100 text-orange-800',
}

function StatusPill({ status }) {
  const cls = STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-700'
  return (
    <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${cls}`}>
      {status}
    </span>
  )
}

// ─── Conteúdo dos modais ──────────────────────────────────────────────────────

const PRE_MODALS = {
  1: {
    title: 'Por que mensageria assíncrona?',
    concept: 'Motivação',
    conceptTag: 'Problema',
    tagColor: 'bg-red-100 text-red-700',
    formalDefinition: null,
    confirmLabel: 'Entendido, ver o RabbitMQ resolvendo isso →',
    content: () => (
      <div className="space-y-4">
        <p>
          Imagine o lançamento de ingressos para um show. Em poucos segundos, 50.000 pessoas clicam "Comprar" ao mesmo tempo. Em uma arquitetura síncrona tradicional, cada clique abre uma conexão HTTP que bloqueia uma thread no servidor enquanto espera o banco de dados responder.
        </p>
        <p>
          O servidor tem um pool de threads limitado (tipicamente 200 a 500). Com 50.000 requisições simultâneas, as threads se esgotam em milissegundos. As novas requisições ficam na fila de accept do SO, e quando o timeout chega, o servidor começa a retornar 503.
        </p>
        <SyncAnimation />
        <p>
          A solução não é comprar um servidor maior. É mudar a arquitetura. O cliente não precisa esperar o banco confirmar, ele precisa apenas saber que o pedido foi <strong>recebido e enfileirado</strong>. O processamento acontece de forma assíncrona.
        </p>
        <p>
          É aqui que o RabbitMQ entra: o Producer aceita o pedido, publica uma mensagem na fila e retorna imediatamente. Os workers consomem e processam no seu próprio ritmo. O cliente acompanha o status via polling.
        </p>
      </div>
    ),
  },

  2: {
    title: 'Best Effort Broadcast: publicar e seguir em frente',
    concept: 'Best Effort Broadcast (BEB)',
    conceptTag: 'BEB',
    tagColor: 'bg-blue-100 text-blue-800',
    formalDefinition:
      'BEB1 (Validade): Se p e q são processos corretos e p difunde a mensagem m, então q eventualmente entrega m. BEB2 (Sem duplicação): Nenhuma mensagem é entregue mais de uma vez. BEB3 (Sem criação): Se uma mensagem m é entregue, então m foi previamente difundida por algum processo.',
    confirmLabel: 'Entendido, quero comprar um ingresso →',
    content: () => (
      <div className="space-y-4">
        <p>
          Quando o Producer publica uma mensagem no exchange do RabbitMQ, ele está executando um <strong>Best Effort Broadcast</strong>. O producer envia a mensagem e retorna ao cliente imediatamente, sem aguardar que nenhum worker processe, sem confirmar que a mensagem chegou a algum consumer.
        </p>
        <p>
          A propriedade de "melhor esforço" significa: <em>se o producer não falha durante a publicação</em>, todos os consumers corretos que estão subscritos eventualmente receberão a mensagem. Se o producer crashar no meio de um lote de 1000 mensagens, as mensagens não publicadas até o momento do crash são perdidas, não há garantia de entrega para elas.
        </p>
        <p>
          A analogia clássica é o <strong>UDP</strong>: você envia o pacote e não sabe se chegou. O RabbitMQ é mais robusto que UDP (tem filas em disco, ACK de nível de protocolo AMQP), mas a semântica de broadcast do Producer é BEB.
        </p>
        <Code>{`# publisher.py -> o BEB acontece aqui
async def publish_order(self, envelope: dict) -> None:
    msg = Message(
        body=body,
        delivery_mode=DeliveryMode.PERSISTENT,  # grava em disco
        message_id=envelope["message_id"],
    )
    await self._exchange.publish(msg, routing_key="payment")
    # retorna imediatamente, nenhum worker foi consultado`}</Code>
        <p>
          O HTTP 201 que o cliente recebe após clicar "Comprar" significa apenas que a mensagem foi aceita pelo broker, não que o pagamento foi processado.
        </p>
      </div>
    ),
  },

  3: {
    title: 'Perfect Links: nunca perder uma mensagem',
    concept: 'Perfect Links',
    conceptTag: 'Perfect Links',
    tagColor: 'bg-green-100 text-green-800',
    formalDefinition:
      'PL1 (Entrega confiável): Se p e q são processos corretos e p envia m para q, então q eventualmente entrega m. PL2 (Sem duplicação): Nenhuma mensagem é entregue mais de uma vez. PL3 (Sem criação): Nenhuma mensagem é entregue a menos que tenha sido enviada.',
    confirmLabel: 'Entendido, acompanhar o pipeline →',
    content: () => (
      <div className="space-y-4">
        <p>
          No nível do canal ponto-a-ponto entre o broker e um worker, o TicketLab implementa <strong>Perfect Links</strong>. A combinação de três mecanismos converte o canal físico (que é Fair-Loss por natureza) em um canal confiável.
        </p>
        <p>
          <strong>1. Mensagem PERSISTENT:</strong> o RabbitMQ grava a mensagem em disco antes de confirmar o recebimento ao producer. Se o broker reiniciar antes do worker consumir, a mensagem ainda está na fila.
        </p>
        <p>
          <strong>2. Fila durable:</strong> a fila sobrevive ao reinício do broker. Sem esse flag, a fila e todas as mensagens nela seriam destruídas com o processo.
        </p>
        <p>
          <strong>3. ACK manual:</strong> o worker confirma para o broker (<code className="bg-gray-100 px-1 rounded text-xs font-mono">msg.ack()</code>) somente depois de salvar o resultado no banco. Se o worker crashar antes do ACK, o broker reentrega a mensagem a outro worker.
        </p>
        <Code>{`# payment-worker/worker.py -> ACK após persistência
await payment_approved_exchange.publish(next_msg, ...)
# salvar no banco acontece antes desta linha
await msg.ack()  # só aqui a mensagem sai da fila`}</Code>
        <p>
          Acompanhe abaixo as transições de status do seu pedido em tempo real. Cada transição corresponde a um ACK de um worker diferente na cadeia de processamento.
        </p>
      </div>
    ),
  },

  4: {
    title: 'Crash-stop: quando um worker simplesmente para',
    concept: 'Modelo de falha Crash-stop',
    conceptTag: 'Crash-stop',
    tagColor: 'bg-orange-100 text-orange-700',
    formalDefinition:
      'No modelo crash-stop, um processo correto executa passos de acordo com seu algoritmo até eventualmente falhar (crash), após o qual não executa mais nenhum passo. Um processo que não falha é dito "correto".',
    confirmLabel: 'Entendido, ver como simular o crash →',
    content: () => (
      <div className="space-y-4">
        <p>
          O modelo de falha <strong>crash-stop</strong> (ou fail-stop) assume que um processo falho simplesmente para de executar, não envia mensagens erradas, não age de forma maliciosa, apenas cessa. É o modelo mais simples e o mais comum em sistemas reais.
        </p>
        <p>
          Quando um payment-worker crasha, ele fecha a conexão TCP com o broker. O RabbitMQ detecta a desconexão (via TCP keepalive ou timeout) e marca todas as mensagens que estavam <em>unacked</em> (consumidas mas não confirmadas) como <strong>ready</strong> novamente. Elas voltam para o início da fila.
        </p>
        <p>
          Se há outras réplicas do worker, elas assumem imediatamente. Se havia apenas uma réplica, as mensagens acumulam na fila até que o worker reinicie. O Docker garante o reinício via <code className="bg-gray-100 px-1 rounded text-xs font-mono">restart: on-failure</code>.
        </p>
        <Code>{`# worker.py -> reconexão automática com backoff
async def run_worker() -> None:
    while True:
        try:
            conn = await aio_pika.connect_robust(
                settings.rabbitmq_url,
                reconnect_interval=5,  # tenta a cada 5s
            )
            async with conn:
                # ... consume ...
                await asyncio.Future()  # aguarda indefinidamente
        except Exception:
            await asyncio.sleep(5)  # backoff antes de tentar novamente`}</Code>
        <p>
          O <code className="bg-gray-100 px-1 rounded text-xs font-mono">connect_robust()</code> do aio-pika implementa reconexão automática com backoff exponencial. O worker reestabelece a conexão sem necessidade de intervenção manual.
        </p>
      </div>
    ),
  },

  5: {
    title: 'Dead Letter Queue: isolando mensagens problemáticas',
    concept: 'DLQ e Bounded Retry',
    conceptTag: 'DLQ',
    tagColor: 'bg-red-100 text-red-700',
    formalDefinition: null,
    confirmLabel: 'Entendido, disparar pedidos com falha →',
    content: () => (
      <div className="space-y-4">
        <p>
          Nem toda falha é temporária. Uma mensagem com dados corrompidos, ou cujo destinatário não existe mais, falhará em todas as tentativas. Sem um mecanismo de contenção, ela causaria um <strong>loop infinito</strong> de retry, consumindo recursos indefinidamente.
        </p>
        <p>
          O TicketLab usa <strong>Bounded Retry</strong>: o header AMQP <code className="bg-gray-100 px-1 rounded text-xs font-mono">x-retry-count</code> é incrementado a cada republish. Após 3 tentativas (<code className="bg-gray-100 px-1 rounded text-xs font-mono">MAX_RETRIES=3</code>), o worker emite um <code className="bg-gray-100 px-1 rounded text-xs font-mono">nack(requeue=False)</code>. O broker encaminha a mensagem para o Dead Letter Exchange.
        </p>
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm font-mono text-gray-600 space-y-1">
          <p>payment-queue → worker → <span className="text-red-500">falha</span></p>
          <p className="pl-4">republica com x-retry-count: 1</p>
          <p>payment-queue → worker → <span className="text-red-500">falha</span></p>
          <p className="pl-4">republica com x-retry-count: 2</p>
          <p>payment-queue → worker → <span className="text-red-500">falha</span></p>
          <p className="pl-4">republica com x-retry-count: 3</p>
          <p>payment-queue → worker → <span className="text-red-500">falha</span> → nack(requeue=False)</p>
          <p className="pl-4 text-red-600">dead-letter-exchange → dead-letter-queue</p>
        </div>
        <Code>{`# payment-worker/worker.py
if retry_count < settings.max_retries:  # max_retries = 3
    retry_msg = Message(
        headers={"x-retry-count": retry_count + 1},
        ...
    )
    await ticket_sales_exchange.publish(retry_msg, routing_key="payment")
    await msg.ack()
else:
    await update_order_status(order_id, "payment_failed", ...)
    await msg.nack(requeue=False)  # → DLX → DLQ`}</Code>
        <p>
          Mensagens na DLQ ficam em quarentena indefinidamente. Elas podem ser inspecionadas, reenfileiradas manualmente após corrigir a causa raiz, ou descartadas. Isso é o que protege o sistema de <strong>poison messages</strong>.
        </p>
      </div>
    ),
  },

  6: {
    title: 'Ordenação FIFO: garantida por fila, não por sistema',
    concept: 'Ordenação de mensagens',
    conceptTag: 'FIFO',
    tagColor: 'bg-purple-100 text-purple-700',
    formalDefinition:
      'FIFO Broadcast: Se um processo p difunde m antes de m\', então nenhum processo correto entrega m\' a menos que tenha entregue m previamente.',
    confirmLabel: 'Entendido, disparar pedidos e ver a tabela →',
    content: () => (
      <div className="space-y-4">
        <p>
          O RabbitMQ garante que a <em>fila</em> é FIFO: mensagens são entregues a um consumer na mesma ordem em que chegaram. A mensagem publicada primeiro é consumida primeiro, por aquele consumer específico.
        </p>
        <p>
          O problema aparece com <strong>múltiplos consumers</strong>. O broker distribui mensagens em round-robin. Se o Worker A recebe as mensagens 1, 3, 5 e o Worker B recebe 2, 4, 6, e o Worker A termina mais rápido, os ACKs chegam na ordem 1, 3, 5, 2, 4, 6. A ordem global de <em>confirmação</em> não preserva a ordem de publicação.
        </p>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="bg-green-50 border border-green-200 rounded-xl p-3">
            <p className="font-bold text-green-700 mb-2">1 worker: FIFO garantido</p>
            <p className="text-gray-500">Publicação: 1 2 3 4 5</p>
            <p className="text-green-600">Processamento: 1 2 3 4 5 (ok)</p>
          </div>
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-3">
            <p className="font-bold text-orange-700 mb-2">N workers, ordem global quebrada</p>
            <p className="text-gray-500">Publicação: 1 2 3 4 5</p>
            <p className="text-orange-600">ACKs: 1 3 5 2 4 (variável)</p>
          </div>
        </div>
        <p>
          Para sistemas que precisam de ordem global, a solução é usar um único consumer por fila (sem escala horizontal) ou usar <strong>Kafka com particionamento por chave</strong>, onde mensagens com a mesma chave sempre vão para a mesma partição e são consumidas por um único consumer.
        </p>
        <p>
          No TicketLab, a ordem de processamento não importa para correção, o SELECT FOR UPDATE do stock-worker garante que dois workers não vendam o mesmo ingresso, independentemente da ordem.
        </p>
      </div>
    ),
  },

  7: {
    title: 'Escalabilidade horizontal: adicionar workers sem mudar o producer',
    concept: 'Escalabilidade e balanceamento implícito',
    conceptTag: 'Escala',
    tagColor: 'bg-cyan-100 text-cyan-700',
    formalDefinition: null,
    confirmLabel: 'Entendido, disparar carga e escalar →',
    content: () => (
      <div className="space-y-4">
        <p>
          Uma das maiores vantagens de arquiteturas orientadas a mensagens é a <strong>escalabilidade horizontal transparente</strong>. Para dobrar a capacidade de processamento, basta iniciar mais réplicas do worker, nenhuma mudança no producer, no cliente, nem no RabbitMQ é necessária.
        </p>
        <p>
          O broker automaticamente distribui as mensagens em round-robin entre todos os consumers ativos na mesma fila. Cada réplica tem seu próprio canal e seu próprio <code className="bg-gray-100 px-1 rounded text-xs font-mono">prefetch_count=10</code> (máximo de 10 mensagens não confirmadas por réplica por vez).
        </p>
        <p>
          Compare com chamadas HTTP diretas: se o serviço de pagamento está sobrecarregado, o chamador precisa implementar retry, circuit breaker, e descoberta de serviço. Com RabbitMQ, adicionar uma réplica é suficiente, ela se registra como consumer e começa a processar imediatamente.
        </p>
        <Code>{`# Para escalar manualmente:
docker compose up -d --scale payment-worker=3 --no-recreate
# O broker detecta o novo consumer e começa a distribuir
# mensagens entre as 3 réplicas automaticamente`}</Code>
      </div>
    ),
  },
}

const POST_MODALS = {
  2: {
    title: 'BEB concluído: seu pedido está na fila',
    concept: 'Best Effort Broadcast',
    conceptTag: 'BEB',
    tagColor: 'bg-blue-100 text-blue-800',
    content: (orderId, orderStatus) => (
      <div className="space-y-4">
        <p>
          O Producer publicou a mensagem no exchange <code className="bg-gray-100 px-1 rounded text-xs font-mono">ticket-sales</code> com routing key <code className="bg-gray-100 px-1 rounded text-xs font-mono">payment</code> e retornou HTTP 201. O BEB está completo do ponto de vista do producer.
        </p>
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-2">
          <p className="text-xs text-gray-500">Pedido criado:</p>
          <p className="font-mono text-xs text-gray-700 break-all">{orderId}</p>
          <div className="flex items-center gap-2">
            <p className="text-xs text-gray-500">Status atual:</p>
            {orderStatus && <StatusPill status={orderStatus.status} />}
          </div>
        </div>
        <p>
          O status <code className="bg-gray-100 px-1 rounded text-xs font-mono">pending</code> confirma que o pedido existe no banco mas nenhum worker processou ainda. A mensagem está na <strong>payment-queue</strong> aguardando o payment-worker.
        </p>
        <p>
          Na próxima etapa, vamos acompanhar as transições de status em tempo real e entender o que cada uma significa para o modelo de confiabilidade.
        </p>
      </div>
    ),
  },

  3: {
    title: 'Pipeline concluído: Perfect Links em ação',
    concept: 'Perfect Links',
    conceptTag: 'Perfect Links',
    tagColor: 'bg-green-100 text-green-800',
    content: (orderStatus) => (
      <div className="space-y-4">
        <p>
          O pedido passou por três workers em sequência. Cada transição de status representa um ACK manual após persistência no banco, a implementação de Perfect Links no TicketLab.
        </p>
        <div className="space-y-2 text-xs">
          {[
            ['pending → processing', 'payment-worker consumiu a mensagem (unacked)', 'bg-blue-50 border-blue-200'],
            ['processing → payment_approved', 'payment-worker: ACK após publish no exchange', 'bg-indigo-50 border-indigo-200'],
            ['payment_approved → stock_reserved', 'stock-worker: SELECT FOR UPDATE + ACK', 'bg-purple-50 border-purple-200'],
            ['stock_reserved → confirmed', 'notification-worker: ticket_code gerado + ACK', 'bg-green-50 border-green-200'],
          ].map(([t, d, cls]) => (
            <div key={t} className={`border rounded-xl px-4 py-2 ${cls}`}>
              <p className="font-semibold font-mono">{t}</p>
              <p className="text-gray-500 mt-0.5">{d}</p>
            </div>
          ))}
        </div>
        {orderStatus?.ticket_code && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <p className="text-xs text-green-600 font-semibold mb-1">Ingresso gerado:</p>
            <p className="font-mono text-xs text-green-700 break-all">{orderStatus.ticket_code}</p>
          </div>
        )}
        <p>
          Se qualquer worker tivesse crashado antes do ACK, a mensagem teria voltado para a fila e sido reprocessada. Isso é o Perfect Link: entrega garantida, sem duplicação.
        </p>
      </div>
    ),
  },

  4: {
    title: 'Crash-stop: zero mensagens perdidas',
    concept: 'Crash-stop e recuperação automática',
    conceptTag: 'Crash-stop',
    tagColor: 'bg-orange-100 text-orange-700',
    content: () => (
      <div className="space-y-4">
        <p>
          Quando o payment-worker foi derrubado, as mensagens que ele tinha consumido mas não confirmado (unacked) voltaram automaticamente para a fila. O RabbitMQ detectou o fechamento da conexão TCP e recolocou essas mensagens no estado <strong>ready</strong>.
        </p>
        <p>
          O Docker reiniciou o container via <code className="bg-gray-100 px-1 rounded text-xs font-mono">restart: on-failure</code>. O worker reconectou ao broker usando <code className="bg-gray-100 px-1 rounded text-xs font-mono">connect_robust()</code> com backoff de 5 segundos. Em cerca de 10 a 15 segundos após o crash, o processamento foi retomado.
        </p>
        <p>
          Este é o comportamento esperado no modelo crash-stop: o sistema <em>para de progredir momentaneamente</em> mas não perde dados. A diferença para crash-recovery é que aqui o worker não mantém estado local entre reinícios, ele é stateless e lê tudo do broker e do banco.
        </p>
        <Code>{`# docker-compose.yml
payment-worker:
  restart: on-failure  # reinicia automaticamente após crash
  # O worker não tem estado local -> é stateless por design`}</Code>
      </div>
    ),
  },

  5: {
    title: 'DLQ: mensagens em quarentena',
    concept: 'Dead Letter Queue',
    conceptTag: 'DLQ',
    tagColor: 'bg-red-100 text-red-700',
    content: (stats) => (
      <div className="space-y-4">
        <p>
          Os 20 pedidos com <code className="bg-gray-100 px-1 rounded text-xs font-mono">simulate_failure=true</code> passaram por 3 tentativas cada. Em cada tentativa, o payment-worker publicou de volta na fila com <code className="bg-gray-100 px-1 rounded text-xs font-mono">x-retry-count++</code>. Na quarta tentativa, emitiu <code className="bg-gray-100 px-1 rounded text-xs font-mono">nack(requeue=False)</code>.
        </p>
        {stats && (
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-red-600">{stats.by_status?.payment_failed ?? 0}</p>
              <p className="text-xs text-red-500 mt-1">status: payment_failed</p>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-gray-700">{stats.queue_depths?.['dead-letter-queue'] ?? 0}</p>
              <p className="text-xs text-gray-500 mt-1">mensagens na DLQ</p>
            </div>
          </div>
        )}
        <p>
          Cada mensagem na DLQ passou 4 vezes pelo payment-worker (1 tentativa original + 3 retries). O custo total de processamento de 20 mensagens com falha foi de <strong>80 tentativas</strong>. Sem o bounded retry, seria infinito.
        </p>
        <p>
          Para reprocessar mensagens da DLQ após corrigir o problema, você precisaria de um consumer dedicado na dead-letter-queue que republique as mensagens na fila original. No TicketLab isso é feito manualmente via RabbitMQ Management UI.
        </p>
      </div>
    ),
  },

  6: {
    title: 'Ordenação: FIFO por consumer, não por sistema',
    concept: 'Ordenação de mensagens',
    conceptTag: 'FIFO',
    tagColor: 'bg-purple-100 text-purple-700',
    content: (orders) => {
      const withTimestamps = (orders || [])
        .filter(o => o.created_at && o.updated_at)
        .slice(0, 8)
        .map(o => ({
          id: o.id?.slice(0, 8),
          created: new Date(o.created_at).toLocaleTimeString('pt-BR'),
          updated: new Date(o.updated_at).toLocaleTimeString('pt-BR'),
          worker: o.processed_by || '-',
          status: o.status,
        }))

      return (
        <div className="space-y-4">
          <p>
            Observe abaixo os últimos pedidos criados. Compare o <code className="bg-gray-100 px-1 rounded text-xs font-mono">created_at</code> (ordem de publicação) com o <code className="bg-gray-100 px-1 rounded text-xs font-mono">updated_at</code> (quando o worker confirmou). Com um único worker, a ordem tende a ser preservada. Com múltiplos, pode não ser.
          </p>
          {withTimestamps.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-gray-400 text-left border-b border-gray-100">
                    <th className="pb-2 pr-3">ID</th>
                    <th className="pb-2 pr-3">Criado</th>
                    <th className="pb-2 pr-3">Processado</th>
                    <th className="pb-2">Worker</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {withTimestamps.map(o => (
                    <tr key={o.id}>
                      <td className="py-1.5 pr-3 font-mono text-gray-500">{o.id}…</td>
                      <td className="py-1.5 pr-3 text-gray-500">{o.created}</td>
                      <td className="py-1.5 pr-3 text-gray-500">{o.updated}</td>
                      <td className="py-1.5 font-mono text-gray-400 text-[10px] truncate max-w-[80px]">{o.worker}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p>
            Para garantia de ordem global no RabbitMQ, a única solução é usar um único consumer. Para escala com ordem, a solução de mercado é o <strong>Apache Kafka</strong> com particionamento por chave: mensagens com a mesma chave sempre vão para a mesma partição, mantendo ordem dentro de cada partição.
          </p>
        </div>
      )
    },
  },

  7: {
    title: 'Escalabilidade confirmada: mais workers, mais throughput',
    concept: 'Escalabilidade horizontal',
    conceptTag: 'Escala',
    tagColor: 'bg-cyan-100 text-cyan-700',
    content: (stats) => (
      <div className="space-y-4">
        <p>
          Com 3 réplicas do payment-worker, cada uma com <code className="bg-gray-100 px-1 rounded text-xs font-mono">prefetch_count=10</code>, o sistema pode processar até 30 mensagens simultaneamente. A fila drena em aproximadamente 1/3 do tempo.
        </p>
        {stats && (
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="bg-cyan-50 border border-cyan-200 rounded-xl p-4">
              <p className="text-2xl font-bold text-cyan-700">{stats.by_status?.confirmed ?? 0}</p>
              <p className="text-xs text-cyan-500 mt-1">confirmados</p>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
              <p className="text-2xl font-bold text-gray-700">{stats.queue_depths?.['payment-queue'] ?? 0}</p>
              <p className="text-xs text-gray-500 mt-1">na payment-queue</p>
            </div>
          </div>
        )}
        <p>
          Nenhuma linha de código no producer ou no cliente foi alterada. O broker detecta automaticamente novos consumers e redistribui o trabalho. Isso é o poder da <strong>transparência de localização</strong> em sistemas orientados a mensagens.
        </p>
        <p>
          O limite prático de escalabilidade horizontal é o banco de dados e o broker. Com múltiplos workers acessando o mesmo banco com SELECT FOR UPDATE, pode haver contenção de lock. Em produção, o próximo passo seria sharding do banco ou uso de cache distribuído.
        </p>
      </div>
    ),
  },
}

// ─── Componente de ação por etapa ─────────────────────────────────────────────

function Step2Action({ events, selectedEvent, setSelectedEvent, orderForm, setOrderForm, orderId, setOrderId, submitting, setSubmitting, submitError, setSubmitError, onOrderCreated }) {
  async function handleSubmit(e) {
    e.preventDefault()
    if (!selectedEvent) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      const res = await createOrder({
        ...orderForm,
        event_id: selectedEvent.id,
        simulate_failure: false,
      })
      setOrderId(res.id)
      onOrderCreated(res)
    } catch (err) {
      setSubmitError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (orderId) {
    return (
      <div className="space-y-4 text-center">
        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto text-xl">ok</div>
        <p className="font-semibold text-gray-800">Pedido enviado com sucesso!</p>
        <p className="text-sm text-gray-500">Clique em "Próximo passo" para ver o que aconteceu.</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-gray-500 mb-2">Escolha um evento e preencha seus dados para criar um pedido real no sistema:</p>
      {events.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Evento</label>
          <select
            value={selectedEvent?.id ?? ''}
            onChange={e => setSelectedEvent(events.find(ev => ev.id === e.target.value))}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100"
          >
            {events.map(ev => (
              <option key={ev.id} value={ev.id}>{ev.name}</option>
            ))}
          </select>
        </div>
      )}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
          <input
            required value={orderForm.buyer_name}
            onChange={e => setOrderForm(f => ({ ...f, buyer_name: e.target.value }))}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100"
            placeholder="Seu nome"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            required type="email" value={orderForm.buyer_email}
            onChange={e => setOrderForm(f => ({ ...f, buyer_email: e.target.value }))}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100"
            placeholder="seu@email.com"
          />
        </div>
      </div>
      {submitError && (
        <p className="text-sm text-red-600 bg-red-50 px-4 py-2 rounded-xl">{submitError}</p>
      )}
      <button
        type="submit" disabled={submitting || events.length === 0}
        className="w-full bg-gray-900 hover:bg-gray-700 disabled:opacity-50 text-white font-semibold py-3.5 rounded-xl text-sm transition-colors"
      >
        {submitting ? 'Enviando...' : 'Comprar ingresso →'}
      </button>
    </form>
  )
}

function Step3Action({ orderStatus }) {
  const STAGES = [
    { key: 'pending',          label: 'pending',          desc: 'Na payment-queue, aguardando worker' },
    { key: 'processing',       label: 'processing',       desc: 'payment-worker consumiu (unacked)' },
    { key: 'payment_approved', label: 'payment_approved', desc: 'ACK do payment, na stock-queue' },
    { key: 'stock_reserved',   label: 'stock_reserved',   desc: 'stock-worker reservou ingresso (SELECT FOR UPDATE)' },
    { key: 'confirmed',        label: 'confirmed',      desc: 'notification-worker gerou ticket_code' },
  ]
  const currentIdx = STAGES.findIndex(s => s.key === orderStatus?.status)

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500 mb-4">Acompanhe as transições de status em tempo real (polling a cada 2s):</p>
      {STAGES.map((s, i) => {
        const done = currentIdx > i
        const active = currentIdx === i
        return (
          <div
            key={s.key}
            className={`flex items-start gap-4 px-5 py-4 rounded-2xl border transition-all ${
              done    ? 'bg-green-50 border-green-200' :
              active  ? 'bg-blue-50 border-blue-300 shadow-sm' :
                        'bg-gray-50 border-gray-100'
            }`}
          >
            <div className={`w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold mt-0.5 ${
              done ? 'bg-green-500 text-white' : active ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-400'
            }`}>
              {i + 1}
            </div>
            <div>
              <p className={`font-mono font-semibold text-sm ${active ? 'text-blue-700' : done ? 'text-green-700' : 'text-gray-400'}`}>
                {s.label}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">{s.desc}</p>
            </div>
            {active && (
              <div className="ml-auto flex-shrink-0">
                <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
        )
      })}
      {orderStatus?.status === 'payment_failed' && (
        <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-4">
          <p className="text-sm text-red-700 font-semibold">Pagamento falhou (simulate_failure=true)</p>
          <p className="text-xs text-red-500 mt-1">Retry count: {orderStatus.retry_count}</p>
        </div>
      )}
    </div>
  )
}

function Step4Action({ stats, debugResult, setDebugResult }) {
  const [loading, setLoading] = useState(false)

  async function handleKill() {
    setLoading(true)
    try {
      const res = await debugKillWorker('payment')
      setDebugResult(res)
    } catch (e) {
      setDebugResult({ status: 'manual', command: 'docker compose kill payment-worker', note: 'Erro ao chamar API' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-5">
      {!debugResult ? (
        <div className="text-center space-y-4">
          <p className="text-sm text-gray-500">
            Clique no botão para obter o comando de crash do payment-worker:
          </p>
          <button
            onClick={handleKill}
            disabled={loading}
            className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold px-8 py-3.5 rounded-xl text-sm transition-colors"
          >
            {loading ? 'Obtendo comando...' : 'Derrubar payment-worker'}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-gray-700 font-medium">
            Execute este comando no terminal do host:
          </p>
          <TerminalBlock
            command={debugResult.command}
            description={debugResult.note}
          />
          <p className="text-sm text-gray-500">
            Após executar, observe a payment-queue crescer abaixo. O worker reiniciará automaticamente em alguns segundos.
          </p>
        </div>
      )}

      {stats && (
        <div className="bg-white border border-gray-100 rounded-2xl p-5">
          <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-3">Profundidade das filas (ao vivo)</p>
          <div className="space-y-2">
            {['payment-queue', 'stock-queue', 'notification-queue', 'dead-letter-queue'].map(q => (
              <div key={q} className="flex items-center justify-between text-sm">
                <span className="font-mono text-gray-600 text-xs">{q}</span>
                <span className={`font-bold ${(stats.queue_depths?.[q] ?? 0) > 0 ? 'text-orange-600' : 'text-gray-400'}`}>
                  {stats.queue_depths?.[q] ?? 0}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function Step5Action({ stats, batchSent, setBatchSent, batchResult, setBatchResult }) {
  const [loading, setLoading] = useState(false)

  async function handleBatch() {
    setLoading(true)
    try {
      const res = await sendBatch(20, 1.0)
      setBatchResult(res)
      setBatchSent(true)
    } catch (e) {
      setBatchSent(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-5">
      {!batchSent ? (
        <div className="text-center space-y-3">
          <p className="text-sm text-gray-500">
            Disparar 20 pedidos com <code className="bg-gray-100 px-1 rounded text-xs font-mono">simulate_failure=true</code> (failure_rate=100%):
          </p>
          <button
            onClick={handleBatch}
            disabled={loading}
            className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold px-8 py-3.5 rounded-xl text-sm transition-colors"
          >
            {loading ? 'Enviando...' : 'Disparar 20 pedidos com falha'}
          </button>
          {batchResult && (
            <p className="text-xs text-gray-400">{batchResult.published} publicados</p>
          )}
        </div>
      ) : (
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700">
          20 pedidos disparados. Aguardando workers processarem e falharem...
        </div>
      )}

      {stats && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-center">
            <p className="text-2xl font-bold text-red-600">{stats.by_status?.payment_failed ?? 0}</p>
            <p className="text-xs text-red-500 mt-1">payment_failed</p>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 text-center">
            <p className="text-2xl font-bold text-gray-700">{stats.queue_depths?.['dead-letter-queue'] ?? 0}</p>
            <p className="text-xs text-gray-500 mt-1">dead-letter-queue</p>
          </div>
        </div>
      )}
    </div>
  )
}

function Step6Action({ orders, batchSent, setBatchSent }) {
  const [loading, setLoading] = useState(false)

  async function handleBatch() {
    setLoading(true)
    try {
      await sendBatch(10, 0)
      setBatchSent(true)
    } catch (e) {
      setBatchSent(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-5">
      {!batchSent ? (
        <div className="text-center space-y-3">
          <p className="text-sm text-gray-500">Disparar 10 pedidos para observar a ordenação de processamento:</p>
          <button
            onClick={handleBatch}
            disabled={loading}
            className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-semibold px-8 py-3.5 rounded-xl text-sm transition-colors"
          >
            {loading ? 'Enviando...' : 'Disparar 10 pedidos'}
          </button>
        </div>
      ) : (
        <div className="bg-purple-50 border border-purple-200 rounded-xl px-4 py-3 text-sm text-purple-700">
          10 pedidos disparados. Aguardando processamento...
        </div>
      )}

      {orders && orders.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Pedidos recentes (ordered by created_at DESC)</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100 text-gray-400 text-left">
                  <th className="px-4 py-2">ID</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Worker</th>
                  <th className="px-4 py-2">Criado</th>
                  <th className="px-4 py-2">Processado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {orders.slice(0, 10).map(o => (
                  <tr key={o.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 font-mono text-gray-400">{o.id?.slice(0,8)}…</td>
                    <td className="px-4 py-2"><StatusPill status={o.status} /></td>
                    <td className="px-4 py-2 font-mono text-gray-400 truncate max-w-[80px]">{o.processed_by || '-'}</td>
                    <td className="px-4 py-2 text-gray-500">{new Date(o.created_at).toLocaleTimeString('pt-BR')}</td>
                    <td className="px-4 py-2 text-gray-500">{new Date(o.updated_at).toLocaleTimeString('pt-BR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function Step7Action({ stats, debugResult, setDebugResult, batchSent, setBatchSent }) {
  const [loadingBatch, setLoadingBatch] = useState(false)
  const [loadingScale, setLoadingScale] = useState(false)

  async function handleBatch() {
    setLoadingBatch(true)
    try {
      await sendBatch(500, 0)
      setBatchSent(true)
    } catch (e) {
      setBatchSent(true)
    } finally {
      setLoadingBatch(false)
    }
  }

  async function handleScale() {
    setLoadingScale(true)
    try {
      const res = await debugScaleWorker('payment', 3)
      setDebugResult(res)
    } catch (e) {
      setDebugResult({ command: 'docker compose up -d --scale payment-worker=3 --no-recreate', note: 'Execute no host' })
    } finally {
      setLoadingScale(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={handleBatch}
          disabled={loadingBatch || batchSent}
          className="bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 text-white font-semibold py-3.5 rounded-xl text-sm transition-colors"
        >
          {loadingBatch ? 'Enviando...' : batchSent ? '500 pedidos enviados' : '1. Disparar 500 pedidos'}
        </button>
        <button
          onClick={handleScale}
          disabled={loadingScale || !!debugResult}
          className="bg-gray-900 hover:bg-gray-700 disabled:opacity-50 text-white font-semibold py-3.5 rounded-xl text-sm transition-colors"
        >
          {loadingScale ? 'Obtendo comando...' : debugResult ? 'Comando obtido' : '2. Escalar para 3 workers'}
        </button>
      </div>

      {debugResult && (
        <TerminalBlock command={debugResult.command} description={debugResult.note} />
      )}

      {stats && (
        <div className="bg-white border border-gray-100 rounded-2xl p-5 space-y-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Métricas ao vivo</p>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-xl font-bold text-cyan-600">{stats.by_status?.confirmed ?? 0}</p>
              <p className="text-xs text-gray-400">confirmados</p>
            </div>
            <div>
              <p className="text-xl font-bold text-orange-500">{stats.queue_depths?.['payment-queue'] ?? 0}</p>
              <p className="text-xs text-gray-400">payment-queue</p>
            </div>
            <div>
              <p className="text-xl font-bold text-gray-700">{stats.total ?? 0}</p>
              <p className="text-xs text-gray-400">total</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Modal da etapa 8 ─────────────────────────────────────────────────────────

function Step8Modal({ isOpen, onConfirm }) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    if (isOpen) {
      const id = requestAnimationFrame(() => setVisible(true))
      return () => cancelAnimationFrame(id)
    }
    setVisible(false)
  }, [isOpen])

  if (!isOpen) return null

  const ROWS = [
    { level: 'Fair-Loss Link',     status: 'Não usado',    cls: 'text-red-500',   how: 'Exchange non-durable + delivery_mode=TRANSIENT (não configurado)' },
    { level: 'Perfect Links',      status: 'Implementado', cls: 'text-green-600', how: 'PERSISTENT + fila durable + ACK manual após commit no banco' },
    { level: 'Best Effort Broadcast', status: 'Implementado', cls: 'text-green-600', how: 'exchange.publish() retorna antes de qualquer worker processar' },
    { level: 'Reliable Broadcast', status: 'Aproximado',   cls: 'text-amber-600', how: 'PERSISTENT + durable + retry com x-retry-count + DLQ' },
    { level: 'Uniform RB',         status: 'Não impl.',    cls: 'text-gray-400',  how: 'Exigiria Quorum Queues (Raft) -> worker pode processar parcialmente antes do ACK' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div style={{ opacity: visible ? 0.72 : 0, transition: 'opacity 200ms ease' }} className="absolute inset-0 bg-black" />
      <div
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(18px)',
          transition: 'opacity 260ms ease, transform 260ms ease',
        }}
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-[720px] max-h-[88vh] flex flex-col"
      >
        <div className="px-8 pt-8 pb-5 border-b border-gray-100 flex-shrink-0">
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-700">Conclusão</span>
          <h2 className="text-[22px] font-bold text-gray-900 mt-3">Onde o TicketLab se encaixa na hierarquia de confiabilidade</h2>
        </div>
        <div className="px-8 py-6 overflow-y-auto flex-1 space-y-5 text-[15px] text-gray-700 leading-relaxed">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="text-xs text-gray-400 uppercase tracking-wide border-b border-gray-100">
                  <th className="text-left pb-2 pr-4">Nível</th>
                  <th className="text-left pb-2 pr-4">Status</th>
                  <th className="text-left pb-2">Como</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {ROWS.map(r => (
                  <tr key={r.level}>
                    <td className="py-3 pr-4 font-semibold text-gray-800 whitespace-nowrap">{r.level}</td>
                    <td className={`py-3 pr-4 font-bold text-sm whitespace-nowrap ${r.cls}`}>{r.status}</td>
                    <td className="py-3 text-xs text-gray-500 leading-relaxed">{r.how}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 text-sm">
            <p className="font-semibold text-amber-800 mb-2">Por que não temos Uniform Reliable Broadcast?</p>
            <p className="text-amber-700 text-sm leading-relaxed">
              No URB, mesmo processos que falham devem ter entregado a mensagem antes de falhar. No TicketLab, um payment-worker pode iniciar o processamento (atualizar status para "processing") e crashar antes de emitir o ACK. A mensagem volta para a fila e é reprocessada, mas o efeito colateral (status="processing" no banco) já ocorreu. Isso viola a propriedade uniforme.
            </p>
            <p className="text-amber-700 text-sm leading-relaxed mt-2">
              Para URB real precisaríamos do padrão <strong>Outbox</strong> (gravar a mensagem no banco junto com a transação, publicar depois) ou <strong>Two-Phase Commit (2PC)</strong> entre o banco e o broker.
            </p>
          </div>
          <p className="text-sm text-gray-500">
            O TicketLab demonstra que mesmo sem URB é possível construir um sistema robusto e correto. O SELECT FOR UPDATE e a verificação de idempotência no notification-worker garantem que, mesmo com reprocessamento, nenhum ingresso é vendido duas vezes e nenhum pedido confirmado é duplicado.
          </p>
        </div>
        <div className="px-8 pb-8 pt-5 border-t border-gray-100 flex-shrink-0">
          <button
            onClick={onConfirm}
            className="w-full bg-gray-900 hover:bg-gray-700 text-white font-semibold py-4 rounded-xl text-sm transition-colors"
          >
            Ver a aplicação completa →
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function GuidedFlow() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [phase, setPhase] = useState('pre')
  const [completedSteps, setCompletedSteps] = useState([])

  // Step 2 state
  const [events, setEvents] = useState([])
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [orderForm, setOrderForm] = useState({ buyer_name: '', buyer_email: '', quantity: 1, payment_method: 'credit_card' })
  const [orderId, setOrderId] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const [step2CreatedOrder, setStep2CreatedOrder] = useState(null)

  // Step 3 state
  const [step3Done, setStep3Done] = useState(false)
  const prevStep3Status = useRef(null)

  // Shared step state
  const [debugResult, setDebugResult] = useState(null)
  const [batchSent, setBatchSent] = useState(false)
  const [batchResult, setBatchResult] = useState(null)

  // Order polling — step 3
  const orderPollEnabled = step === 3 && phase === 'action' && !!orderId
  const { data: orderStatus } = usePolling(
    useCallback(() => orderPollEnabled ? getOrder(orderId) : Promise.resolve(null), [orderPollEnabled, orderId]),
    2000,
  )

  // Orders list polling — step 6
  const ordersPollEnabled = step === 6 && phase === 'action'
  const { data: ordersList } = usePolling(
    useCallback(() => ordersPollEnabled ? getOrders({ limit: 10 }) : Promise.resolve(null), [ordersPollEnabled]),
    3000,
  )

  // Stats polling — steps 4, 5, 7
  const statsPollEnabled = (step === 4 || step === 5 || step === 7) && phase === 'action'
  const { data: stats } = usePolling(
    useCallback(() => statsPollEnabled ? getStats() : Promise.resolve(null), [statsPollEnabled]),
    2000,
  )

  // Detect terminal status for step 3
  useEffect(() => {
    if (!orderStatus || step !== 3 || phase !== 'action') return
    const status = orderStatus.status
    if (status === prevStep3Status.current) return
    prevStep3Status.current = status
    const terminal = ['confirmed', 'payment_failed', 'out_of_stock']
    if (terminal.includes(status)) setStep3Done(true)
  }, [orderStatus, step, phase])

  // Load events for step 2
  useEffect(() => {
    if (step === 2 && phase === 'action' && events.length === 0) {
      getEvents().then(evts => {
        setEvents(evts)
        setSelectedEvent(evts[0] || null)
      }).catch(() => {})
    }
  }, [step, phase, events.length])

  function completeStep() {
    setCompletedSteps(prev => prev.includes(step) ? prev : [...prev, step])
    if (step === 8) {
      navigate('/demo')
      return
    }
    // Reset per-step ephemeral state
    setDebugResult(null)
    setBatchSent(false)
    setBatchResult(null)
    setStep(s => s + 1)
    setPhase('pre')
  }

  function goToAction() {
    if (step === 1) {
      completeStep()
    } else {
      setPhase('action')
    }
  }

  function goToPost() {
    setPhase('post')
  }

  const preData = PRE_MODALS[step]
  const postData = POST_MODALS[step]

  function renderAction() {
    switch (step) {
      case 2:
        return (
          <div className="max-w-lg mx-auto bg-white border border-gray-100 rounded-2xl p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Comprar um ingresso real</h3>
            <Step2Action
              events={events}
              selectedEvent={selectedEvent}
              setSelectedEvent={setSelectedEvent}
              orderForm={orderForm}
              setOrderForm={setOrderForm}
              orderId={orderId}
              setOrderId={setOrderId}
              submitting={submitting}
              setSubmitting={setSubmitting}
              submitError={submitError}
              setSubmitError={setSubmitError}
              onOrderCreated={(order) => {
                setStep2CreatedOrder(order)
                goToPost()
              }}
            />
          </div>
        )
      case 3:
        return (
          <div className="max-w-lg mx-auto space-y-4">
            <Step3Action orderStatus={orderStatus} />
            {step3Done && (
              <button
                onClick={goToPost}
                className="w-full bg-gray-900 hover:bg-gray-700 text-white font-semibold py-3.5 rounded-xl text-sm transition-colors"
              >
                Pipeline concluído, ver análise →
              </button>
            )}
          </div>
        )
      case 4:
        return (
          <div className="max-w-lg mx-auto space-y-4">
            <Step4Action stats={stats} debugResult={debugResult} setDebugResult={setDebugResult} />
            {debugResult && (
              <button
                onClick={goToPost}
                className="w-full bg-gray-900 hover:bg-gray-700 text-white font-semibold py-3.5 rounded-xl text-sm transition-colors"
              >
                Já observei a recuperação →
              </button>
            )}
          </div>
        )
      case 5:
        return (
          <div className="max-w-lg mx-auto space-y-4">
            <Step5Action stats={stats} batchSent={batchSent} setBatchSent={setBatchSent} batchResult={batchResult} setBatchResult={setBatchResult} />
            {batchSent && (
              <button
                onClick={goToPost}
                className="w-full bg-gray-900 hover:bg-gray-700 text-white font-semibold py-3.5 rounded-xl text-sm transition-colors mt-2"
              >
                Ver análise da DLQ →
              </button>
            )}
          </div>
        )
      case 6:
        return (
          <div className="max-w-2xl mx-auto space-y-4">
            <Step6Action orders={ordersList} batchSent={batchSent} setBatchSent={setBatchSent} />
            {batchSent && (
              <button
                onClick={goToPost}
                className="w-full bg-gray-900 hover:bg-gray-700 text-white font-semibold py-3.5 rounded-xl text-sm transition-colors"
              >
                Ver análise de ordenação →
              </button>
            )}
          </div>
        )
      case 7:
        return (
          <div className="max-w-lg mx-auto space-y-4">
            <Step7Action stats={stats} debugResult={debugResult} setDebugResult={setDebugResult} batchSent={batchSent} setBatchSent={setBatchSent} />
            {batchSent && debugResult && (
              <button
                onClick={goToPost}
                className="w-full bg-gray-900 hover:bg-gray-700 text-white font-semibold py-3.5 rounded-xl text-sm transition-colors"
              >
                Ver análise de escalabilidade →
              </button>
            )}
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <StepProgress currentStep={step} completedSteps={completedSteps} />

      <main className="max-w-4xl mx-auto px-6 py-10">
        {phase === 'action' && step !== 8 && renderAction()}

        {phase === 'action' && step !== 8 && (
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-400">
              Etapa {step} de 8 · fase: ação
            </p>
          </div>
        )}
      </main>

      {/* Pre-modal */}
      {phase === 'pre' && step !== 8 && preData && (
        <EduModal
          isOpen
          title={preData.title}
          concept={preData.concept}
          conceptTag={preData.conceptTag}
          tagColor={preData.tagColor}
          formalDefinition={preData.formalDefinition}
          onConfirm={goToAction}
          confirmLabel={preData.confirmLabel}
        >
          {preData.content()}
        </EduModal>
      )}

      {/* Post-modal */}
      {phase === 'post' && postData && (
        <EduModal
          isOpen
          title={postData.title}
          concept={postData.concept}
          conceptTag={postData.conceptTag}
          tagColor={postData.tagColor}
          onConfirm={completeStep}
        >
          {step === 2 && postData.content(orderId, step2CreatedOrder)}
          {step === 3 && postData.content(orderStatus)}
          {step === 4 && postData.content()}
          {step === 5 && postData.content(stats)}
          {step === 6 && postData.content(ordersList)}
          {step === 7 && postData.content(stats)}
        </EduModal>
      )}

      {/* Step 8 combined modal */}
      <Step8Modal isOpen={step === 8} onConfirm={completeStep} />
    </div>
  )
}
