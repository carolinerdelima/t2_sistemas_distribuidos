const STATUS_CONFIG = {
  pending: {
    label: 'Pendente',
    cls: 'bg-yellow-100 text-yellow-800',
    concept: 'BEB: publicado no exchange, aguardando consumo pelo payment-worker',
  },
  processing: {
    label: 'Processando',
    cls: 'bg-blue-100 text-blue-800',
    concept: 'At-Least-Once: worker consumiu a mensagem (unacked), processando pagamento',
  },
  payment_approved: {
    label: 'Pgto aprovado',
    cls: 'bg-brand-50 text-brand-500',
    concept: 'Perfect Links: ACK confirmado → publicado em payment-approved exchange (FIFO)',
  },
  stock_reserved: {
    label: 'Estoque OK',
    cls: 'bg-indigo-100 text-indigo-800',
    concept: 'Exclusão Mútua: SELECT FOR UPDATE reservou ingresso sem race condition',
  },
  confirmed: {
    label: 'Confirmado ✓',
    cls: 'bg-green-100 text-green-800',
    concept: 'Idempotência: notification-worker gerou ticket_code (reprocessável sem duplicar)',
  },
  payment_failed: {
    label: 'Pgto falhou',
    cls: 'bg-red-100 text-red-800',
    concept: 'Bounded Retry: MAX_RETRIES atingido → NACK → Dead Letter Exchange → DLQ',
  },
  out_of_stock: {
    label: 'Esgotado',
    cls: 'bg-orange-100 text-orange-800',
    concept: 'SELECT FOR UPDATE: stock_worker detectou available_tickets=0 → NACK → DLQ',
  },
  dead_letter: {
    label: 'Dead Letter',
    cls: 'bg-gray-200 text-gray-600',
    concept: 'DLQ: mensagem em quarentena após esgotamento de retentativas',
  },
}

export default function OrderStatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, cls: 'bg-gray-100 text-gray-700', concept: '' }
  return (
    <span
      title={cfg.concept}
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium cursor-help ${cfg.cls}`}
    >
      {cfg.label}
    </span>
  )
}
