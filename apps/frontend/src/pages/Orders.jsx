import { useState, useCallback } from 'react'
import { getOrders } from '../services/api'
import { usePolling } from '../hooks/usePolling'
import OrdersTable from '../components/OrdersTable'

const STATUS_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'pending', label: 'Pendente' },
  { value: 'processing', label: 'Processando' },
  { value: 'confirmed', label: 'Confirmado' },
  { value: 'payment_failed', label: 'Falha pagamento' },
  { value: 'out_of_stock', label: 'Sem estoque' },
  { value: 'dead_letter', label: 'Dead Letter' },
]

export default function Orders() {
  const [statusFilter, setStatusFilter] = useState('')
  const fetch = useCallback(() => getOrders({ status: statusFilter || undefined }), [statusFilter])
  const { data: orders, loading, error } = usePolling(fetch, 3000)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Pedidos</h1>
          <p className="text-gray-500 mt-1 text-sm">Atualizado automaticamente a cada 3 segundos</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Filtrar:</span>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-100"
          >
            {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        {loading && !orders && (
          <div className="flex items-center gap-2 text-sm text-gray-400 py-8 justify-center">
            <div className="w-4 h-4 border-2 border-brand-200 border-t-transparent rounded-full animate-spin" />
            Carregando pedidos...
          </div>
        )}
        {error && <p className="text-red-500 text-sm text-center py-8">Erro: {error}</p>}
        {orders && <OrdersTable orders={orders} />}
      </div>
    </div>
  )
}
