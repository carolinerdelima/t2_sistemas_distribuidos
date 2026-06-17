export default function MetricsBar({ stats }) {
  if (!stats) return null

  const items = [
    { label: 'Total publicados', value: stats.total ?? 0, color: 'text-gray-800' },
    { label: 'Confirmados', value: stats.by_status?.confirmed ?? 0, color: 'text-green-600' },
    { label: 'Processando', value: (stats.by_status?.processing ?? 0) + (stats.by_status?.pending ?? 0), color: 'text-blue-600' },
    { label: 'Falhas pagamento', value: stats.by_status?.payment_failed ?? 0, color: 'text-red-500' },
    { label: 'Sem estoque', value: stats.by_status?.out_of_stock ?? 0, color: 'text-orange-500' },
    { label: 'Dead Letter', value: stats.by_status?.dead_letter ?? 0, color: 'text-gray-400' },
  ]

  const queues = [
    { label: 'payment-queue', value: stats.queue_depths?.['payment-queue'] ?? 0 },
    { label: 'stock-queue', value: stats.queue_depths?.['stock-queue'] ?? 0 },
    { label: 'notification-queue', value: stats.queue_depths?.['notification-queue'] ?? 0 },
    { label: 'dead-letter-queue', value: stats.queue_depths?.['dead-letter-queue'] ?? 0 },
  ]

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {items.map(item => (
          <div key={item.label} className="bg-white rounded-xl border border-gray-100 p-4 text-center">
            <p className={`text-2xl font-bold ${item.color}`}>{item.value.toLocaleString('pt-BR')}</p>
            <p className="text-xs text-gray-400 mt-1 leading-tight">{item.label}</p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {queues.map(q => (
          <div key={q.label} className="bg-brand-50 rounded-xl p-3 flex items-center justify-between">
            <span className="text-xs text-brand-400 font-medium truncate">{q.label}</span>
            <span className="text-sm font-bold text-brand-500 ml-2">{q.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
