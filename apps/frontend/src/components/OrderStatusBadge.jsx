const STATUS_CONFIG = {
  pending:         { label: 'Pendente',        cls: 'bg-yellow-100 text-yellow-800' },
  processing:      { label: 'Processando',     cls: 'bg-blue-100 text-blue-800' },
  payment_approved:{ label: 'Pgto aprovado',   cls: 'bg-brand-50 text-brand-500' },
  stock_reserved:  { label: 'Estoque OK',      cls: 'bg-indigo-100 text-indigo-800' },
  confirmed:       { label: 'Confirmado ✓',    cls: 'bg-green-100 text-green-800' },
  payment_failed:  { label: 'Pgto falhou',     cls: 'bg-red-100 text-red-800' },
  out_of_stock:    { label: 'Esgotado',        cls: 'bg-orange-100 text-orange-800' },
  dead_letter:     { label: 'Dead Letter',     cls: 'bg-gray-200 text-gray-600' },
}

export default function OrderStatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, cls: 'bg-gray-100 text-gray-700' }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.cls}`}>
      {cfg.label}
    </span>
  )
}
