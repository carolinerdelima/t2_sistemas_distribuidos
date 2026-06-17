import { useState } from 'react'
import { createOrder } from '../services/api'
import OrderStatusBadge from './OrderStatusBadge'
import { usePolling } from '../hooks/usePolling'
import { getOrder } from '../services/api'

export default function OrderForm({ event }) {
  const [form, setForm] = useState({
    buyer_name: '',
    buyer_email: '',
    quantity: 1,
    payment_method: 'credit_card',
    simulate_failure: false,
  })
  const [submitting, setSubmitting] = useState(false)
  const [orderId, setOrderId] = useState(null)
  const [error, setError] = useState(null)

  const { data: orderStatus } = usePolling(
    () => (orderId ? getOrder(orderId) : Promise.resolve(null)),
    2000,
  )

  const terminal = ['confirmed', 'payment_failed', 'out_of_stock', 'dead_letter']
  const isDone = orderStatus && terminal.includes(orderStatus.status)

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const res = await createOrder({ ...form, event_id: event.id })
      setOrderId(res.id)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (orderId) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
        <h3 className="font-semibold text-gray-900">Acompanhamento do pedido</h3>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">Status:</span>
          {orderStatus ? <OrderStatusBadge status={orderStatus.status} /> : <span className="text-sm text-gray-400">carregando...</span>}
        </div>
        {orderStatus?.ticket_code && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <p className="text-sm font-medium text-green-800">Ingresso gerado!</p>
            <p className="text-xs text-green-600 font-mono mt-1">{orderStatus.ticket_code}</p>
          </div>
        )}
        {isDone && !orderStatus?.ticket_code && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-sm text-red-700">
              Pedido finalizado com status: <strong>{orderStatus.status}</strong>
            </p>
          </div>
        )}
        {!isDone && (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <div className="w-3 h-3 rounded-full bg-brand-100 animate-pulse" />
            Processando de forma assíncrona...
          </div>
        )}
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Nome completo</label>
        <input
          required
          value={form.buyer_name}
          onChange={e => setForm(f => ({ ...f, buyer_name: e.target.value }))}
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-100"
          placeholder="Seu nome"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
        <input
          required type="email"
          value={form.buyer_email}
          onChange={e => setForm(f => ({ ...f, buyer_email: e.target.value }))}
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-100"
          placeholder="seu@email.com"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Quantidade</label>
          <select
            value={form.quantity}
            onChange={e => setForm(f => ({ ...f, quantity: Number(e.target.value) }))}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-100"
          >
            {[1,2,3,4].map(n => <option key={n} value={n}>{n} ingresso{n > 1 ? 's' : ''}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Pagamento</label>
          <select
            value={form.payment_method}
            onChange={e => setForm(f => ({ ...f, payment_method: e.target.value }))}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-100"
          >
            <option value="credit_card">Cartão de crédito</option>
            <option value="pix">PIX</option>
          </select>
        </div>
      </div>
      <label className="flex items-center gap-3 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={form.simulate_failure}
          onChange={e => setForm(f => ({ ...f, simulate_failure: e.target.checked }))}
          className="w-4 h-4 rounded border-gray-300 text-red-500"
        />
        <span className="text-sm text-gray-600">
          Simular falha de pagamento <span className="text-gray-400">(fins acadêmicos)</span>
        </span>
      </label>
      {error && <p className="text-sm text-red-600 bg-red-50 px-4 py-2 rounded-xl">{error}</p>}
      <button
        type="submit" disabled={submitting}
        className="w-full bg-brand-100 hover:bg-brand-200 disabled:opacity-50 text-brand-500 font-semibold py-3 rounded-xl text-sm transition-colors"
      >
        {submitting ? 'Enviando...' : `Confirmar pedido · ${form.quantity} ingresso${form.quantity > 1 ? 's' : ''}`}
      </button>
    </form>
  )
}
