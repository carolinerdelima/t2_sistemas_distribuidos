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

// Happy path pipeline stages
const PIPELINE = [
  { status: 'pending',          label: 'pending',          concept: 'BEB',    color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  { status: 'processing',       label: 'processing',       concept: 'Unacked', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { status: 'payment_approved', label: 'payment_approved', concept: 'PL/ACK', color: 'bg-brand-50 text-brand-500 border-brand-100' },
  { status: 'stock_reserved',   label: 'stock_reserved',   concept: 'MUTEX',  color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
  { status: 'confirmed',        label: 'confirmed',      concept: 'IDEM',   color: 'bg-green-100 text-green-700 border-green-200' },
]

function PipelineBanner({ orders }) {
  if (!orders?.length) return null
  const counts = {}
  orders.forEach(o => { counts[o.status] = (counts[o.status] || 0) + 1 })

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-6">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
        Pipeline de pedidos: caminho normal
      </p>
      <div className="flex items-center gap-1 flex-wrap">
        {PIPELINE.map((stage, i) => (
          <div key={stage.status} className="flex items-center gap-1">
            <div className={`flex flex-col items-center px-3 py-2 rounded-xl border text-xs ${stage.color}`}>
              <span className="font-mono font-semibold leading-tight">{stage.label}</span>
              <span className="font-light opacity-60 text-[10px]">{stage.concept}</span>
              {counts[stage.status] > 0 && (
                <span className="font-bold text-sm mt-0.5">{counts[stage.status]}</span>
              )}
            </div>
            {i < PIPELINE.length - 1 && (
              <span className="text-gray-300 text-xs flex-shrink-0">→</span>
            )}
          </div>
        ))}
        <div className="flex items-center gap-1 ml-2">
          <span className="text-gray-200 text-xs">|</span>
          <div className="flex flex-col items-center px-3 py-2 rounded-xl border border-red-200 bg-red-50 text-red-700 text-xs">
            <span className="font-mono font-semibold leading-tight">payment_failed</span>
            <span className="font-light opacity-60 text-[10px]">DLQ</span>
            {counts['payment_failed'] > 0 && (
              <span className="font-bold text-sm mt-0.5">{counts['payment_failed']}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Orders() {
  const [statusFilter, setStatusFilter] = useState('')
  const fetchAll = useCallback(() => getOrders({}), [])
  const { data: allOrders } = usePolling(fetchAll, 3000)

  const fetch = useCallback(() => getOrders({ status: statusFilter || undefined }), [statusFilter])
  const { data: orders, loading, error } = usePolling(fetch, 3000)

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Pedidos</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Atualizado a cada 3s · passe o mouse sobre o status para ver o conceito SD
          </p>
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

      <PipelineBanner orders={allOrders} />

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
