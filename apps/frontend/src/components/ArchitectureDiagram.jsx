import { useState } from 'react'

const W = 110, H = 40, R = 7

const TYPES = {
  client:   { fill: '#F3F4F6', stroke: '#9CA3AF', text: '#374151', selFill: '#6B7280' },
  api:      { fill: '#DBEAFE', stroke: '#2563EB', text: '#1E40AF', selFill: '#2563EB' },
  exchange: { fill: '#EDE9FE', stroke: '#7C3AED', text: '#4C1D95', selFill: '#7C3AED' },
  queue:    { fill: '#FEF9C3', stroke: '#B45309', text: '#78350F', selFill: '#B45309' },
  worker:   { fill: '#D1FAE5', stroke: '#059669', text: '#065F46', selFill: '#059669' },
  database: { fill: '#ECFDF5', stroke: '#16A34A', text: '#14532D', selFill: '#16A34A' },
  dlx:      { fill: '#FEE2E2', stroke: '#DC2626', text: '#7F1D1D', selFill: '#DC2626' },
  dlq:      { fill: '#FFE4E6', stroke: '#E11D48', text: '#881337', selFill: '#E11D48' },
}

const NODES = [
  { id: 'browser',  x: 10,  y: 30,  label: 'Browser',          sub: 'usuário',           type: 'client',   concept: 'beb'            },
  { id: 'producer', x: 150, y: 30,  label: 'Producer',         sub: 'FastAPI',            type: 'api',      concept: 'beb'            },
  { id: 'ex-ts',    x: 290, y: 30,  label: 'ticket-sales',     sub: 'exchange (durable)', type: 'exchange', concept: 'perfect-links'  },
  { id: 'q-pay',    x: 430, y: 30,  label: 'payment-queue',    sub: 'durable · FIFO',    type: 'queue',    concept: 'perfect-links'  },
  { id: 'w-pay',    x: 570, y: 30,  label: 'payment-worker',   sub: 'prefetch_count=10',  type: 'worker',   concept: 'crash-stop'     },
  { id: 'dlx',      x: 720, y: 30,  label: 'dead-letter',      sub: 'exchange',           type: 'dlx',      concept: 'dlq'            },
  { id: 'ex-pa',    x: 570, y: 150, label: 'payment-approved', sub: 'exchange',           type: 'exchange', concept: 'fifo'           },
  { id: 'q-stock',  x: 430, y: 150, label: 'stock-queue',      sub: 'durable · FIFO',    type: 'queue',    concept: 'fifo'           },
  { id: 'w-stock',  x: 290, y: 150, label: 'stock-worker',     sub: 'SELECT FOR UPDATE',  type: 'worker',   concept: 'race-condition' },
  { id: 'ex-sc',    x: 150, y: 150, label: 'stock-confirmed',  sub: 'exchange',           type: 'exchange', concept: 'fifo'           },
  { id: 'dlq',      x: 720, y: 150, label: 'dead-letter-queue',sub: 'DLQ',                type: 'dlq',      concept: 'dlq'            },
  { id: 'q-notif',  x: 150, y: 270, label: 'notif-queue',      sub: 'durable',            type: 'queue',    concept: 'idempotency'    },
  { id: 'w-notif',  x: 290, y: 270, label: 'notif-worker',     sub: 'gera ticket_code',   type: 'worker',   concept: 'idempotency'    },
  { id: 'db',       x: 430, y: 270, label: 'PostgreSQL',        sub: 'confirmed ✓',        type: 'database', concept: 'crash-recovery' },
]

const LINES = [
  { x1: 120, y1: 50, x2: 150, y2: 50 },
  { x1: 260, y1: 50, x2: 290, y2: 50, label: 'PERSISTENT', lx: 275, ly: 42 },
  { x1: 400, y1: 50, x2: 430, y2: 50 },
  { x1: 540, y1: 50, x2: 570, y2: 50 },
  { x1: 680, y1: 50, x2: 720, y2: 50, dashed: true, label: 'retry x3 → NACK', lx: 700, ly: 42 },
  { x1: 775, y1: 70, x2: 775, y2: 150, dashed: true },
  { x1: 625, y1: 70, x2: 625, y2: 150, label: '✓ sucesso', lx: 645, ly: 112 },
  { x1: 570, y1: 170, x2: 540, y2: 170 },
  { x1: 430, y1: 170, x2: 400, y2: 170 },
  { x1: 290, y1: 170, x2: 260, y2: 170 },
  { x1: 205, y1: 190, x2: 205, y2: 270 },
  { x1: 260, y1: 290, x2: 290, y2: 290 },
  { x1: 400, y1: 290, x2: 430, y2: 290, label: 'ticket_code', lx: 415, ly: 282 },
]

function DiagramNode({ node, isSelected, onClick }) {
  const t = TYPES[node.type]
  const cx = node.x + W / 2
  return (
    <g onClick={onClick} style={{ cursor: 'pointer' }}>
      {isSelected && (
        <rect x={node.x - 4} y={node.y - 4} width={W + 8} height={H + 8}
              rx={R + 3} fill="none" stroke={t.stroke} strokeWidth="2.5" opacity="0.4" />
      )}
      <rect x={node.x} y={node.y} width={W} height={H} rx={R}
            fill={isSelected ? t.selFill : t.fill}
            stroke={t.stroke} strokeWidth={isSelected ? 0 : 1} />
      <text x={cx} y={node.y + 16} textAnchor="middle"
            fontSize="10" fontWeight="700"
            fill={isSelected ? 'white' : t.text}
            fontFamily="ui-monospace, 'Cascadia Code', monospace">
        {node.label}
      </text>
      <text x={cx} y={node.y + 30} textAnchor="middle"
            fontSize="8.5" fill={isSelected ? 'rgba(255,255,255,0.8)' : '#6B7280'}
            fontFamily="ui-sans-serif, system-ui, sans-serif">
        {node.sub}
      </text>
    </g>
  )
}

export default function ArchitectureDiagram({ selectedConcept, onSelect }) {
  function toggle(concept) {
    onSelect(selectedConcept === concept ? null : concept)
  }
  return (
    <svg viewBox="0 0 850 330" width="100%" className="overflow-visible select-none">
      <defs>
        <marker id="arr" viewBox="0 0 10 6" refX="9" refY="3"
                markerWidth="7" markerHeight="7" orient="auto">
          <path d="M0,0 L10,3 L0,6 Z" fill="#9CA3AF" />
        </marker>
        <marker id="arr-red" viewBox="0 0 10 6" refX="9" refY="3"
                markerWidth="7" markerHeight="7" orient="auto">
          <path d="M0,0 L10,3 L0,6 Z" fill="#DC2626" />
        </marker>
      </defs>

      <text x="10"  y="20"  fontSize="8" fill="#CBD5E1" fontFamily="sans-serif">&#x2460; Publicação &#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x25BA;</text>
      <text x="10"  y="142" fontSize="8" fill="#CBD5E1" fontFamily="sans-serif">&#x25C4;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500; &#x2462; Confirmação (sucesso)</text>
      <text x="10"  y="262" fontSize="8" fill="#CBD5E1" fontFamily="sans-serif">&#x2462; Notificação &#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x25BA;</text>
      <text x="723" y="142" fontSize="8" fill="#FECACA" fontFamily="sans-serif">&#x2191; Falhas</text>

      {LINES.map((l, i) => (
        <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
              stroke={l.dashed ? '#DC2626' : '#CBD5E1'} strokeWidth="1.5"
              strokeDasharray={l.dashed ? '4 3' : undefined}
              markerEnd={l.dashed ? 'url(#arr-red)' : 'url(#arr)'} />
      ))}

      {LINES.filter(l => l.label).map((l, i) => (
        <text key={`cl${i}`} x={l.lx} y={l.ly} fontSize="7.5"
              fill={l.dashed ? '#DC2626' : '#94A3B8'}
              textAnchor="middle" fontFamily="ui-monospace, monospace">
          {l.label}
        </text>
      ))}

      {NODES.map(node => (
        <DiagramNode key={node.id} node={node}
                     isSelected={selectedConcept === node.concept}
                     onClick={() => toggle(node.concept)} />
      ))}
    </svg>
  )
}
