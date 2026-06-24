import { useState } from 'react'
import ArchitectureDiagram from '../components/ArchitectureDiagram'

const CONCEPTS = {
  beb: {
    tag: 'BEB', tagColor: 'bg-sky-100 text-sky-700',
    title: 'Best Effort Broadcast',
    description:
      'O Producer publica a mensagem no exchange e retorna HTTP 200 imediatamente, sem aguardar que nenhum worker processe. Se todos os workers caírem antes de processar, a mensagem ainda está na fila, o Producer não sabe disso. Equivale a "enviar e torcer".',
    formal:
      'BEB1 (Validade): Se p correto difunde m, então p eventualmente entrega m.\nBEB2 (Sem duplicação): Nenhuma m é entregue mais de uma vez.\nBEB3 (Sem criação): Se m é entregue, então m foi difundida.',
    code: 'POST /orders\n  → channel.basic_publish(body, exchange="ticket-sales")\n  → return HTTP 200  # sem await nos workers',
    observe:
      'Dispare 1000 pedidos no Painel SD. O botão retorna instantaneamente. Observe a fila payment-queue crescer no RabbitMQ UI enquanto os workers ainda processam.',
    nodes: ['browser', 'producer'],
  },
  'perfect-links': {
    tag: 'PL', tagColor: 'bg-violet-100 text-violet-700',
    title: 'Fair-Loss → Perfect Links',
    description:
      'Por padrão redes podem perder mensagens (Fair-Loss Link). Convertemos em Perfect Link usando três garantias: (1) delivery_mode=PERSISTENT: mensagem gravada em disco antes do ACK, (2) exchange e fila durable: sobrevivem ao reinício do broker, (3) ACK manual: mensagem só é removida da fila após processamento com sucesso.',
    formal:
      'PL1 (Entrega confiável): Se p e q corretos e p envia m a q, então q eventualmente entrega m.\nPL2 (Sem duplicação): m é entregue no máximo uma vez.\nPL3 (Sem criação): m não é criada.',
    code: 'Message(\n  body=payload,\n  delivery_mode=DeliveryMode.PERSISTENT,  # ← grava em disco\n)\nawait exchange.publish(msg, routing_key="payment")\n...\nawait msg.ack()  # ← só remove após processar',
    observe:
      'Rode "make send-1000" e depois "make restart-rabbit". Após o broker reiniciar (~5s), todas as mensagens continuam na fila, nenhuma perdida.',
  },
  'crash-stop': {
    tag: 'CS', tagColor: 'bg-red-100 text-red-700',
    title: 'Crash-Stop Failure Model',
    description:
      'No modelo crash-stop, um processo que falha para permanentemente (não reinicia). O RabbitMQ detecta o crash via timeout TCP: mensagens que estavam "unacked" (consumidas mas não confirmadas) voltam automaticamente para o estado ready e são re-entregues a outro worker, sem perda de mensagens.',
    formal:
      'Propriedades: (1) Um processo falhado não emite mais ações.\n(2) Processos corretos não falham.\n(3) Detector de falhas suspeita de processos silenciosos.',
    code: '# RabbitMQ: timeout TCP detecta o crash\n# Unacked messages → retornam ao estado "ready"\n# Outros workers consomem automaticamente\n\nawait channel.set_qos(prefetch_count=10)  # ← limita unacked',
    observe:
      'Rode "make send-1000" e imediatamente "make kill-payment". No RabbitMQ UI → Queues → payment-queue: consumer count cai, mas Unacked messages migram para Ready e são processadas pelos workers restantes.',
  },
  'crash-recovery': {
    tag: 'CR', tagColor: 'bg-amber-100 text-amber-700',
    title: 'Crash-Recovery + Persistência',
    description:
      'No modelo crash-recovery, processos podem crashar e reiniciar com estado durável preservado. Mensagens PERSISTENT são gravadas no disco do broker antes do ACK. Workers usam connect_robust() que reconecta automaticamente com backoff exponencial após o broker reiniciar.',
    formal:
      'Propriedades: processos podem crashar e reiniciar. Estado marcado como durável sobrevive ao crash. Processos recomeçam a partir do último estado durável.',
    code: 'conn = await aio_pika.connect_robust(\n  url,\n  reconnect_interval=5,  # ← backoff automático\n)\n\n# Mensagens PERSISTENT sobrevivem ao reinício do broker',
    observe:
      'Rode "make restart-rabbit" com 1000 pedidos na fila. Workers reconectam em ~5s e processamento continua do ponto onde parou, estado preservado em disco.',
  },
  fifo: {
    tag: 'FIFO', tagColor: 'bg-emerald-100 text-emerald-700',
    title: 'FIFO Ordering por Canal',
    description:
      'FIFO garante que mensagens de um processo são entregues na mesma ordem em que foram enviadas. O RabbitMQ garante FIFO por fila para cada consumer individual. Com múltiplos workers, a ordem GLOBAL é quebrada: o worker A pode confirmar o pedido 50 antes do worker B confirmar o pedido 3.',
    formal:
      'FIFO Broadcast: Se p difunde m antes de m\', então todo processo correto que entrega m\' já entregou m.',
    code: '# Com 1 worker: FIFO garantido\n# payment-queue → [worker-1] → confirma na ordem de chegada\n\n# Com N workers: FIFO POR WORKER, não global\n# payment-queue → [worker-1, worker-2, worker-3]\n# → confirmações fora de ordem',
    observe:
      'Rode "make scale-workers N=5" e "make send-100". Compare created_at vs updated_at no banco, a ordem de confirmação não respeita a de criação. Volte para N=1 e veja FIFO restaurado.',
  },
  'race-condition': {
    tag: 'MUTEX', tagColor: 'bg-orange-100 text-orange-700',
    title: 'Race Condition + Exclusão Mútua',
    description:
      'Com múltiplos workers processando em paralelo, dois podem ler available_tickets=1 simultaneamente e ambos decrementarem, vendendo o mesmo ingresso duas vezes (overbooking). SELECT FOR UPDATE obtém um lock exclusivo na linha do banco: apenas um worker por vez pode ler e modificar o estoque.',
    formal:
      'Exclusão mútua: no máximo um processo está na seção crítica (leitura + decremento de estoque) em um dado momento.',
    code: '# Sem lock: race condition!\n# Worker A: SELECT tickets → 1\n# Worker B: SELECT tickets → 1  (lê antes de A decrementar!)\n# Worker A: UPDATE tickets = 0  ← vende\n# Worker B: UPDATE tickets = 0  ← overbooking!\n\n# Com SELECT FOR UPDATE:\nasync with session.begin():\n    event = await session.execute(\n        select(Event).where(Event.id == event_id).with_for_update()\n    )',
    observe:
      'Rode "make scale-workers N=10" e "make send-100" para um evento com poucos ingressos. Veja no banco: nenhum overbooking, os últimos pedidos ficam com status out_of_stock.',
  },
  idempotency: {
    tag: 'IDEM', tagColor: 'bg-teal-100 text-teal-700',
    title: 'Idempotência',
    description:
      'Com at-least-once delivery, um worker pode processar a mesma mensagem mais de uma vez (crash logo antes do ACK). A verificação do status antes de processar garante idempotência: reprocessar um pedido já confirmado não gera um segundo ingresso nem altera o ticket_code.',
    formal:
      'Uma operação é idempotente se f(f(x)) = f(x). Aplicar múltiplas vezes tem o mesmo efeito que aplicar uma vez.',
    code: '# notification-worker.py\nasync def _handle(msg):\n    order = await get_order(order_id)\n\n    if order.status == "confirmed":  # ← idempotency check\n        await msg.ack()\n        return  # já processado: não faz nada\n\n    # só processa se ainda não confirmado\n    ticket_code = uuid.uuid4()\n    await confirm_order(order_id, ticket_code)',
    observe:
      'Simule crash no notification-worker durante processamento ("docker compose kill notification-worker"). A mensagem é re-entregue, mas o pedido não é confirmado duas vezes.',
  },
  dlq: {
    tag: 'DLQ', tagColor: 'bg-rose-100 text-rose-700',
    title: 'Dead Letter Queue + Bounded Retry',
    description:
      'Após MAX_RETRIES (3) tentativas com falha, a mensagem não é descartada, é enviada para a Dead Letter Queue via Dead Letter Exchange. O worker republica com x-retry-count++ no header AMQP a cada falha. Isso evita loop infinito de retentativas e preserva mensagens problemáticas para inspeção ou reprocessamento manual.',
    formal:
      'Bounded Retry: limitar retentativas via contador no header (x-retry-count). Após o limite, mensagem vai para fila de quarentena (DLQ).',
    code: 'retry_count = int(msg.headers.get("x-retry-count", 0))\n\nif retry_count < MAX_RETRIES:  # MAX_RETRIES = 3\n    retry_msg = Message(\n        body=msg.body,\n        headers={**headers, "x-retry-count": retry_count + 1},\n        delivery_mode=PERSISTENT,\n    )\n    await exchange.publish(retry_msg, routing_key="payment")\nelse:\n    await msg.nack(requeue=False)  # → DLX → DLQ',
    observe:
      'Rode "make send-failures" (30% de falha). Aguarde ~30s (3 retries × delay). Rode "make inspect-dlq", mensagens com x-retry-count=3 acumuladas na DLQ.',
  },
}

const LEGEND = [
  { cls: 'bg-gray-100 border-gray-300',   label: 'Cliente / Serviço' },
  { cls: 'bg-violet-100 border-violet-300', label: 'Exchange (RabbitMQ)' },
  { cls: 'bg-yellow-100 border-yellow-300', label: 'Queue (RabbitMQ)' },
  { cls: 'bg-emerald-100 border-emerald-300', label: 'Worker' },
  { cls: 'bg-red-100 border-red-300',     label: 'Dead Letter' },
  { cls: 'bg-green-100 border-green-300', label: 'Banco de Dados' },
]

export default function Teoria() {
  const [selected, setSelected] = useState(null)
  const concept = selected ? CONCEPTS[selected] : null

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Teoria SD, TicketLab</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Clique em qualquer nó do diagrama para ver o conceito de Sistemas Distribuídos que ele demonstra
        </p>
      </div>

      {/* Diagram card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
          Arquitetura do Sistema, clique nos componentes
        </h2>
        <p className="text-xs text-gray-400 mb-4">
          Cada componente implementa um ou mais conceitos de SD. Nós destacados mostram o conceito selecionado.
        </p>
        <div className="overflow-x-auto">
          <ArchitectureDiagram selectedConcept={selected} onSelect={setSelected} />
        </div>
        <div className="mt-4 flex flex-wrap gap-4 text-xs text-gray-500">
          {LEGEND.map(l => (
            <div key={l.label} className="flex items-center gap-1.5">
              <div className={`w-3 h-3 rounded border ${l.cls}`} />
              <span>{l.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Concept detail or card grid */}
      {concept ? (
        <div className="bg-white rounded-2xl border-2 border-gray-100 shadow-sm p-6"
             style={{ borderColor: '' }}>
          <div className="flex items-start justify-between mb-5">
            <div>
              <span className={`inline-block text-xs font-bold px-2.5 py-0.5 rounded-full mb-2 ${concept.tagColor}`}>
                {concept.tag}
              </span>
              <h2 className="text-xl font-bold text-gray-900">{concept.title}</h2>
            </div>
            <button onClick={() => setSelected(null)}
                    className="text-gray-300 hover:text-gray-500 text-2xl leading-none font-light ml-4 flex-shrink-0">
              ×
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">O que é</p>
                <p className="text-sm text-gray-700 leading-relaxed">{concept.description}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Definição formal</p>
                <pre className="text-xs text-gray-500 bg-gray-50 rounded-xl p-4 whitespace-pre-wrap leading-relaxed font-sans">
                  {concept.formal}
                </pre>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">No código</p>
                <pre className="text-xs font-mono bg-gray-900 text-green-300 rounded-xl p-4 overflow-x-auto leading-relaxed">
                  {concept.code}
                </pre>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Como observar ao vivo</p>
                <div className="bg-blue-50 text-blue-800 text-xs rounded-xl p-4 leading-relaxed">
                  {concept.observe}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div>
          <p className="text-xs text-gray-400 mb-3 uppercase tracking-wide font-semibold">
            Ou escolha um conceito diretamente:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {Object.entries(CONCEPTS).map(([id, c]) => (
              <button key={id} onClick={() => setSelected(id)}
                      className="bg-white border border-gray-100 hover:border-gray-200 hover:shadow-sm rounded-xl p-4 text-left transition-all">
                <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded-full mb-2 ${c.tagColor}`}>
                  {c.tag}
                </span>
                <p className="text-sm font-semibold text-gray-800">{c.title}</p>
                <p className="text-xs text-gray-400 mt-1 leading-snug line-clamp-2">
                  {c.description.slice(0, 90)}…
                </p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
