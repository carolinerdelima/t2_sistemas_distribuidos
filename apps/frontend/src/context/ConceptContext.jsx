import { createContext, useCallback, useContext, useEffect, useState } from 'react'

const Ctx = createContext(() => {})

const CONCEPTS = {
  beb: {
    tag: 'BEB',
    bar: 'bg-sky-500',
    badge: 'bg-sky-500 text-white',
    title: 'Best Effort Broadcast',
    desc: 'Pedido publicado no exchange e o Producer retorna imediatamente, sem esperar nenhum worker processar.',
  },
  'at-least-once': {
    tag: 'At-Least-Once',
    bar: 'bg-blue-500',
    badge: 'bg-blue-500 text-white',
    title: 'Entrega garantida',
    desc: 'Worker consumiu a mensagem (unacked), se crashar agora ela volta automaticamente para a fila.',
  },
  'perfect-links': {
    tag: 'Perfect Links',
    bar: 'bg-violet-500',
    badge: 'bg-violet-500 text-white',
    title: 'Mensagem persistida',
    desc: 'ACK enviado somente após gravar em disco e republicar no próximo exchange, convertendo Fair-Loss em Perfect Link.',
  },
  'race-condition': {
    tag: 'MUTEX',
    bar: 'bg-orange-500',
    badge: 'bg-orange-500 text-white',
    title: 'Exclusão Mútua',
    desc: 'SELECT FOR UPDATE bloqueou a linha: nenhum outro worker pode vender o mesmo ingresso simultaneamente.',
  },
  idempotency: {
    tag: 'Idempotência',
    bar: 'bg-teal-500',
    badge: 'bg-teal-500 text-white',
    title: 'Operação idempotente',
    desc: 'ticket_code gerado e status verificado antes de processar: reprocessar este pedido não cria um segundo ingresso.',
  },
  dlq: {
    tag: 'DLQ',
    bar: 'bg-rose-500',
    badge: 'bg-rose-500 text-white',
    title: 'Dead Letter Queue',
    desc: 'x-retry-count esgotado: NACK enviado e a mensagem encaminhada para a dead-letter-queue.',
  },
  backpressure: {
    tag: 'Backpressure',
    bar: 'bg-indigo-500',
    badge: 'bg-indigo-500 text-white',
    title: 'QoS / Backpressure',
    desc: 'prefetch_count=10: cada worker recebe no máximo 10 mensagens não confirmadas, evitando sobrecarga.',
  },
  retry: {
    tag: 'Retry',
    bar: 'bg-amber-500',
    badge: 'bg-amber-500 text-white',
    title: 'Bounded Retry',
    desc: 'x-retry-count++ incrementado no header AMQP a cada falha, e após MAX_RETRIES a mensagem segue para a DLQ.',
  },
}

let nextId = 0

function Toast({ data }) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div
      style={{
        transition: 'opacity 220ms ease, transform 220ms ease',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0) scale(1)' : 'translateY(10px) scale(0.97)',
      }}
      className="bg-white border border-gray-100 shadow-xl rounded-2xl overflow-hidden w-72"
    >
      <div className={`h-1 w-full ${data.bar}`} />
      <div className="px-4 py-3 flex items-start gap-3">
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 mt-0.5 ${data.badge}`}>
          {data.tag}
        </span>
        <div>
          <p className="text-sm font-semibold text-gray-800 leading-tight">{data.title}</p>
          <p className="text-xs text-gray-500 mt-0.5 leading-snug">{data.desc}</p>
        </div>
      </div>
    </div>
  )
}

export function ConceptProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const show = useCallback((conceptId) => {
    const data = CONCEPTS[conceptId]
    if (!data) return
    const id = ++nextId
    setToasts(prev => [...prev, { id, ...data }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 8000)
  }, [])

  return (
    <Ctx.Provider value={show}>
      {children}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 items-end pointer-events-none">
        {toasts.map(t => <Toast key={t.id} data={t} />)}
      </div>
    </Ctx.Provider>
  )
}

export function useConcept() {
  return useContext(Ctx)
}
