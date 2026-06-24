import { useState } from 'react'
import ArchitectureDiagram from '../components/ArchitectureDiagram'

function SectionHeader({ n, title, highlight }) {
  return (
    <div className="flex items-start gap-4 mb-6">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0
        ${highlight ? 'bg-brand-500 text-white shadow-sm' : 'bg-gray-100 text-gray-500'}`}>
        {n}
      </div>
      <div>
        <h2 className={`text-xl font-bold leading-tight ${highlight ? 'text-brand-500' : 'text-gray-800'}`}>
          {title}
        </h2>
        {highlight && (
          <p className="text-xs text-brand-400 mt-0.5">Ênfase do professor</p>
        )}
      </div>
    </div>
  )
}

// ─── Q1: Que sistemas usam? ───────────────────────────────────────────────────

const USE_CASES = [
  { icon: 'EC', name: 'E-commerce', ex: 'Amazon, Mercado Livre', desc: 'Pedidos, reserva de estoque, notificações de entrega e cobranças processadas de forma assíncrona e independente.' },
  { icon: 'FIN', name: 'Serviços Financeiros', ex: 'Bancos, fintechs', desc: 'Transferências entre contas, alertas de fraude, liquidação de transações sem bloquear o cliente.' },
  { icon: 'IOT', name: 'IoT e Telemetria', ex: 'Fábricas, veículos', desc: 'Ingestão de eventos de milhares de sensores com diferentes velocidades de processamento.' },
  { icon: 'NTF', name: 'Notificações em Tempo Real', ex: 'Apps, SaaS', desc: 'E-mails, SMS e push notifications disparados de forma desacoplada do evento que os originou.' },
  { icon: 'TKT', name: 'TicketLab (este projeto)', ex: 'Demonstração didática', desc: 'Venda de ingressos com workers distribuídos, tolerância a falhas e rastreamento de pedidos em tempo real.', highlight: true },
]

function Q1() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {USE_CASES.map(u => (
        <div key={u.name} className={`rounded-2xl border p-5 ${u.highlight ? 'border-brand-200 bg-brand-50' : 'border-gray-100 bg-white'}`}>
          <span className="text-[10px] font-bold font-mono bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded mb-3 inline-block">{u.icon}</span>
          <p className={`font-semibold text-sm ${u.highlight ? 'text-brand-600' : 'text-gray-800'}`}>{u.name}</p>
          <p className="text-xs text-gray-400 mb-2">{u.ex}</p>
          <p className="text-xs text-gray-500 leading-relaxed">{u.desc}</p>
        </div>
      ))}
    </div>
  )
}

// ─── Q2: Que funcionalidades? ─────────────────────────────────────────────────

const FEATURES = [
  {
    tag: 'Roteamento', icon: 'RTG',
    items: [
      { name: 'Direct Exchange', desc: 'Encaminha a mensagem para a fila com routing key exata. Usado no TicketLab: "payment", "stock", "notification".' },
      { name: 'Fanout Exchange', desc: 'Replica a mensagem para todas as filas vinculadas, independente de routing key. Útil para broadcast.' },
      { name: 'Topic Exchange', desc: 'Roteamento por padrão com wildcards ("*.critico", "pedido.#"). Permite hierarquias de eventos.' },
    ],
  },
  {
    tag: 'Confiabilidade', icon: 'CON',
    items: [
      { name: 'Persistência de mensagens', desc: 'delivery_mode=PERSISTENT grava a mensagem em disco antes de responder ao publisher.' },
      { name: 'Filas duráveis', desc: 'durable=True faz a fila sobreviver ao reinício do broker, preservando todas as mensagens.' },
      { name: 'ACK manual', desc: 'O worker confirma o processamento com msg.ack(). Sem ACK, a mensagem volta para a fila.' },
    ],
  },
  {
    tag: 'Controle de Fluxo', icon: 'FLX',
    items: [
      { name: 'Prefetch / QoS', desc: 'prefetch_count=10 limita mensagens não confirmadas por worker, evitando sobrecarga (backpressure).' },
      { name: 'Dead Letter Queue', desc: 'Mensagens que excedem retentativas ou expiram são encaminhadas para uma fila de quarentena (DLQ).' },
      { name: 'TTL e Prioridade', desc: 'Mensagens podem expirar (TTL) ou ter prioridade diferenciada por fila.' },
    ],
  },
  {
    tag: 'Escalabilidade', icon: 'ESC',
    items: [
      { name: 'Múltiplos consumers', desc: 'Várias instâncias de worker consomem a mesma fila em paralelo. O RabbitMQ distribui em round-robin.' },
      { name: 'Federação e Shovel', desc: 'Conecta brokers em diferentes datacenters para distribuição geográfica.' },
      { name: 'Quorum Queues', desc: 'Replicação baseada em Raft para alta disponibilidade. Usado para Uniform Reliable Broadcast.' },
    ],
  },
]

function Q2() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
      {FEATURES.map(f => (
        <div key={f.tag} className="bg-white border border-gray-100 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-[10px] font-bold font-mono bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{f.icon}</span>
            <span className="font-semibold text-gray-700 text-sm">{f.tag}</span>
          </div>
          <div className="space-y-3">
            {f.items.map(item => (
              <div key={item.name}>
                <p className="text-xs font-semibold text-gray-700">{item.name}</p>
                <p className="text-xs text-gray-400 leading-relaxed mt-0.5">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Q3: Que falhas são suportadas? ──────────────────────────────────────────

const FAILURES = [
  {
    icon: 'CS',
    name: 'Crash-Stop (worker)',
    model: 'Modelo crash-stop: processo para permanentemente',
    tagCls: 'bg-red-100 text-red-700',
    detection: 'Timeout TCP: o broker detecta a desconexão e marca mensagens unacked como ready novamente.',
    recovery: 'Mensagens voltam à fila e são consumidas pelos workers restantes sem nenhuma intervenção manual.',
    demo: 'make kill-payment',
    observe: 'No RabbitMQ UI, o consumer count cai mas o processamento continua nos workers ativos.',
  },
  {
    icon: 'CR',
    name: 'Crash-Recovery (broker)',
    model: 'Modelo crash-recovery: processo para e reinicia com estado durável',
    tagCls: 'bg-amber-100 text-amber-700',
    detection: 'Workers percebem a desconexão e entram em modo de reconexão com backoff exponencial.',
    recovery: 'Mensagens PERSISTENT gravadas em disco são restauradas. Workers reconectam via connect_robust() automaticamente.',
    demo: 'make restart-rabbit',
    observe: 'Após reinício do broker, a fila contém as mesmas mensagens. Workers reconectam em cerca de 5 segundos.',
  },
  {
    icon: 'PN',
    name: 'Partição de Rede',
    model: 'Comunicação entre Producer e broker interrompida temporariamente',
    tagCls: 'bg-orange-100 text-orange-700',
    detection: 'connect_robust() detecta falha de conexão e inicia tentativas de reconexão periódicas.',
    recovery: 'Durante a partição, POST /orders retorna HTTP 503. Ao restabelecer a conexão, a publicação é retomada do ponto parado.',
    demo: 'docker network disconnect messaging producer',
    observe: 'Pedidos retornam 503 durante a partição. Nenhuma mensagem é perdida, pois a falha ocorre antes da publicação.',
  },
]

function Q3() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      {FAILURES.map(f => (
        <div key={f.name} className="bg-white border border-gray-100 rounded-2xl p-5 space-y-4">
          <div>
            <span className="text-[10px] font-bold font-mono bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded mb-2 inline-block">{f.icon}</span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${f.tagCls}`}>{f.name}</span>
            <p className="text-xs text-gray-400 mt-2 italic">{f.model}</p>
          </div>
          <div className="space-y-3 text-xs text-gray-600">
            <div>
              <p className="font-semibold text-gray-500 uppercase tracking-wide text-[10px] mb-1">Detecção</p>
              <p className="leading-relaxed">{f.detection}</p>
            </div>
            <div>
              <p className="font-semibold text-gray-500 uppercase tracking-wide text-[10px] mb-1">Recuperação</p>
              <p className="leading-relaxed">{f.recovery}</p>
            </div>
            <div>
              <p className="font-semibold text-gray-500 uppercase tracking-wide text-[10px] mb-1">Como demonstrar</p>
              <code className="bg-gray-900 text-green-300 px-2 py-1 rounded-lg block font-mono">{f.demo}</code>
              <p className="text-gray-400 mt-1 leading-relaxed">{f.observe}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Q4: Nível de confiabilidade ─────────────────────────────────────────────

const RELIABILITY = [
  {
    id: 'urb',
    level: 5,
    tag: 'Uniform Reliable Broadcast',
    bar: 'bg-slate-300',
    tagCls: 'bg-slate-100 text-slate-500',
    status: 'available',
    statusLabel: 'Disponível no RabbitMQ, não implementado aqui',
    statusCls: 'bg-slate-100 text-slate-500',
    formal: 'Se algum processo, mesmo com falha, entrega M, então todo processo correto eventualmente entrega M.',
    config: 'Quorum Queues com consenso Raft (x-queue-type: quorum)',
    detail: 'Requer que uma maioria de réplicas confirme o recebimento antes de entregar ao consumer. Garante consistência mesmo quando o broker que recebeu a mensagem falha imediatamente após. O RabbitMQ implementa isso via Quorum Queues usando o algoritmo Raft, onde réplicas votam antes de confirmar.',
    inProject: false,
    note: 'Não implementado no TicketLab. Exigiria cluster RabbitMQ com múltiplos nós.',
  },
  {
    id: 'rb',
    level: 4,
    tag: 'Reliable Broadcast',
    bar: 'bg-emerald-500',
    tagCls: 'bg-emerald-100 text-emerald-700',
    status: 'approximate',
    statusLabel: 'Implementado como aproximação',
    statusCls: 'bg-emerald-100 text-emerald-700',
    formal: 'Se algum processo correto entrega M, então todo processo correto eventualmente entrega M.',
    config: 'PERSISTENT + ACK manual + republish com x-retry-count + DLQ após MAX_RETRIES',
    detail: 'Toda mensagem que chegou ao broker será eventualmente processada por algum worker, pois fica na fila até ser confirmada (ACK). Em caso de falha do worker, o retry republicar a mensagem com x-retry-count++. Não é RB puro: um worker pode iniciar o processamento e crashar antes do ACK, causando re-entrega sem que o efeito parcial seja desfeito.',
    inProject: true,
    note: 'O payment-worker republica em caso de falha até MAX_RETRIES=3, depois envia para DLQ.',
  },
  {
    id: 'beb',
    level: 3,
    tag: 'Best Effort Broadcast',
    bar: 'bg-sky-500',
    tagCls: 'bg-sky-100 text-sky-700',
    status: 'present',
    statusLabel: 'Implementado',
    statusCls: 'bg-sky-100 text-sky-700',
    formal: 'Se o remetente não falha, todo processo correto eventualmente recebe a mensagem.',
    config: 'exchange.publish() retorna assim que o broker confirma o recebimento',
    detail: 'O Producer publica no exchange e retorna HTTP 201 ao cliente imediatamente, sem aguardar que nenhum worker processe a mensagem. Se o Publisher crashar após o publish, a mensagem está na fila e será entregue. Se crashar durante o publish, não há garantia. É o ato de "publicar e seguir em frente".',
    inProject: true,
    note: 'POST /orders retorna antes de qualquer worker processar. O ato de publicar é BEB.',
  },
  {
    id: 'pl',
    level: 2,
    tag: 'Perfect Links',
    bar: 'bg-violet-500',
    tagCls: 'bg-violet-100 text-violet-700',
    status: 'present',
    statusLabel: 'Implementado',
    statusCls: 'bg-violet-100 text-violet-700',
    formal: 'Toda mensagem enviada por um processo correto será entregue exatamente uma vez ao destino.',
    config: 'delivery_mode=PERSISTENT + fila durable + ACK manual após processamento',
    detail: 'Três mecanismos juntos convertem o Fair-Loss Link em Perfect Link. Primeiro, PERSISTENT grava a mensagem em disco antes de responder ao publisher. Segundo, durable=True preserva a fila durante reinícios do broker. Terceiro, o ACK manual garante que a mensagem só sai da fila após ser processada com sucesso pelo worker.',
    inProject: true,
    note: 'Toda mensagem do TicketLab é PERSISTENT. msg.ack() é chamado somente após commit no banco.',
  },
  {
    id: 'fl',
    level: 1,
    tag: 'Fair-Loss Link',
    bar: 'bg-red-400',
    tagCls: 'bg-red-100 text-red-600',
    status: 'absent',
    statusLabel: 'Nível mínimo, não utilizado',
    statusCls: 'bg-red-100 text-red-600',
    formal: 'Mensagens podem ser perdidas, duplicadas ou reordenadas. Não há garantias de entrega.',
    config: 'exchange non-durable + delivery_mode=TRANSIENT (configuração padrão sem ajustes)',
    detail: 'Sem configuração adicional, o RabbitMQ opera em Fair-Loss: mensagens em memória se perdem quando o broker reinicia, filas não sobrevivem a crashes, e não há retentativa automática. É o ponto de partida teórico, adequado apenas para dados onde a perda ocasional é aceitável, como métricas de baixa criticidade.',
    inProject: false,
    note: 'Deliberadamente evitado. TicketLab foi configurado para operar no nível Perfect Links e acima.',
  },
]

function Q4() {
  const [selected, setSelected] = useState('rb')
  const detail = RELIABILITY.find(r => r.id === selected)

  const statusIcons = { present: '(sim)', approximate: '(aprox.)', available: '(parcial)', absent: '(nao)' }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
        A hierarquia abaixo é do livro base da disciplina (Cachin, Guerraoui e Rodrigues). Clique em cada nível para ver como o RabbitMQ o implementa e onde o TicketLab se posiciona.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="space-y-2">
          {[...RELIABILITY].reverse().map(r => (
            <button
              key={r.id}
              onClick={() => setSelected(r.id)}
              className={`w-full text-left rounded-2xl border-2 p-4 transition-all ${
                selected === r.id ? 'border-gray-300 bg-white shadow-sm' : 'border-transparent bg-white hover:border-gray-100'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-1.5 self-stretch rounded-full ${r.bar}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${r.tagCls}`}>{r.tag}</span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${r.statusCls}`}>
                      {statusIcons[r.status]} {r.statusLabel}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1.5 leading-snug line-clamp-2">{r.formal}</p>
                </div>
              </div>
            </button>
          ))}
        </div>

        {detail && (
          <div className="bg-white border border-gray-100 rounded-2xl p-6 space-y-5">
            <div>
              <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${detail.tagCls}`}>{detail.tag}</span>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mt-3 mb-1">Definição formal</p>
              <p className="text-sm text-gray-700 italic leading-relaxed">{detail.formal}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Como o RabbitMQ implementa</p>
              <code className="text-xs bg-gray-900 text-green-300 rounded-xl px-3 py-2 block font-mono leading-relaxed">{detail.config}</code>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Explicação</p>
              <p className="text-xs text-gray-600 leading-relaxed">{detail.detail}</p>
            </div>
            <div className={`rounded-xl px-4 py-3 border text-xs leading-relaxed ${detail.inProject ? 'bg-green-50 border-green-200 text-green-800' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
              <span className="font-semibold">TicketLab: </span>{detail.note}
            </div>
          </div>
        )}
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-2xl px-5 py-4 text-sm text-blue-800">
        <span className="font-semibold">Posicionamento do TicketLab: </span>
        o projeto opera sobre Perfect Links (camada de base) e implementa Best Effort Broadcast no nível do Producer. Com retry e DLQ, aproxima Reliable Broadcast. Uniform Reliable Broadcast está disponível no RabbitMQ via Quorum Queues, mas não foi configurado neste projeto.
      </div>
    </div>
  )
}

// ─── Q5: Que ordenação? ───────────────────────────────────────────────────────

function OrderMsg({ n, color }) {
  const colors = {
    blue: 'bg-blue-100 text-blue-700 border-blue-200',
    green: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    orange: 'bg-orange-100 text-orange-700 border-orange-200',
  }
  return (
    <div className={`w-8 h-8 rounded-lg border flex items-center justify-center text-xs font-bold flex-shrink-0 ${colors[color]}`}>
      {n}
    </div>
  )
}

function Q5() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <div className="bg-white border border-emerald-100 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">FIFO garantido</span>
        </div>
        <p className="text-sm font-semibold text-gray-800 mb-1">Um worker por fila</p>
        <p className="text-xs text-gray-500 mb-5 leading-relaxed">
          Com um único consumer, a fila entrega mensagens na exata ordem de chegada. O RabbitMQ garante FIFO por fila para cada consumer individual.
        </p>
        <div className="space-y-3">
          <div>
            <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1.5">Publicação</p>
            <div className="flex gap-1.5">
              {[1,2,3,4,5].map(n => <OrderMsg key={n} n={n} color="blue" />)}
            </div>
          </div>
          <div className="flex items-center gap-1.5 pl-1">
            <div className="flex flex-col items-center">
              <div className="w-px h-3 bg-gray-200" />
              <div className="w-1.5 h-1.5 rounded-full bg-gray-300" />
              <div className="w-px h-3 bg-gray-200" />
            </div>
            <p className="text-[10px] text-gray-400">payment-queue (FIFO)</p>
          </div>
          <div>
            <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1.5">Worker A processa</p>
            <div className="flex gap-1.5">
              {[1,2,3,4,5].map(n => <OrderMsg key={n} n={n} color="green" />)}
            </div>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-4">Ordem preservada: 1 → 2 → 3 → 4 → 5</p>
      </div>

      <div className="bg-white border border-orange-100 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">Ordem global quebrada</span>
        </div>
        <p className="text-sm font-semibold text-gray-800 mb-1">N workers por fila (escala horizontal)</p>
        <p className="text-xs text-gray-500 mb-5 leading-relaxed">
          Com múltiplos consumers, o RabbitMQ distribui em round-robin. Workers processam em paralelo e confirmam na ordem de conclusão, não de chegada.
        </p>
        <div className="space-y-3">
          <div>
            <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1.5">Publicação</p>
            <div className="flex gap-1.5">
              {[1,2,3,4,5].map(n => <OrderMsg key={n} n={n} color="blue" />)}
            </div>
          </div>
          <div className="flex items-start gap-4 pl-1 py-1">
            <div className="text-[10px] text-gray-400">
              <p>Worker A recebe: 1, 3, 5</p>
              <p>Worker B recebe: 2, 4</p>
              <p className="text-orange-500 mt-0.5">Worker A é mais rápido</p>
            </div>
          </div>
          <div>
            <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1.5">Ordem de confirmação (variável)</p>
            <div className="flex gap-1.5">
              {[1,3,5,2,4].map((n,i) => <OrderMsg key={i} n={n} color="orange" />)}
            </div>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-4">Ordem real de confirmação depende da velocidade de cada worker.</p>
      </div>

      <div className="lg:col-span-2 bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-xs text-gray-600 leading-relaxed">
        <span className="font-semibold text-gray-700">O RabbitMQ garante FIFO por fila para cada consumer individualmente.</span> A ordem global entre múltiplos consumers não é garantida, pois cada worker processa de forma independente e o tempo de processamento varia. Para demonstrar: rode <code className="bg-gray-200 px-1 py-0.5 rounded font-mono">make scale-workers N=5</code> e compare os timestamps de <code className="bg-gray-200 px-1 py-0.5 rounded font-mono">created_at</code> com <code className="bg-gray-200 px-1 py-0.5 rounded font-mono">updated_at</code> no banco.
      </div>
    </div>
  )
}

// ─── Q6: Como é implementado? ─────────────────────────────────────────────────

function Q6() {
  const [selected, setSelected] = useState(null)
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-6 space-y-4">
      <p className="text-xs text-gray-400">Clique em qualquer componente para ver o conceito de SD que ele representa.</p>
      <div className="overflow-x-auto">
        <ArchitectureDiagram selectedConcept={selected} onSelect={setSelected} />
      </div>
      <div className="flex flex-wrap gap-3 text-xs text-gray-400">
        {[
          { cls: 'bg-blue-100 border-blue-300',    label: 'API / Serviço' },
          { cls: 'bg-violet-100 border-violet-300', label: 'Exchange (RabbitMQ)' },
          { cls: 'bg-yellow-100 border-yellow-300', label: 'Queue (RabbitMQ)' },
          { cls: 'bg-emerald-100 border-emerald-300', label: 'Worker' },
          { cls: 'bg-red-100 border-red-300',      label: 'Dead Letter' },
          { cls: 'bg-green-100 border-green-300',  label: 'Banco de Dados' },
        ].map(l => (
          <div key={l.label} className="flex items-center gap-1.5">
            <div className={`w-3 h-3 rounded border ${l.cls}`} />
            <span>{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function Plataforma() {
  return (
    <div className="space-y-16">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-3xl font-bold text-gray-900">RabbitMQ como Plataforma Distribuída</h1>
        </div>
        <p className="text-gray-400 text-sm max-w-2xl">
          Análise da plataforma sob a perspectiva de Sistemas Distribuídos, conforme os conceitos do curso. O TicketLab serve como sistema de demonstração ao vivo.
        </p>
      </div>

      <section>
        <SectionHeader n="1" title="Que tipos de sistemas utilizam esta plataforma?" />
        <Q1 />
      </section>

      <section>
        <SectionHeader n="2" title="Que funcionalidades são oferecidas?" />
        <Q2 />
      </section>

      <section>
        <SectionHeader n="3" title="Que tipos de falhas são suportadas?" />
        <Q3 />
      </section>

      <section>
        <SectionHeader n="4" title="Que nível de confiabilidade é oferecido?" highlight />
        <Q4 />
      </section>

      <section>
        <SectionHeader n="5" title="Que tipo de ordenação de mensagens é oferecida?" />
        <Q5 />
      </section>

      <section>
        <SectionHeader n="6" title="Como estas garantias são implementadas?" />
        <Q6 />
      </section>
    </div>
  )
}
