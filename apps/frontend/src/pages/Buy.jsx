import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { useCallback } from 'react'
import { getEvents } from '../services/api'
import { usePolling } from '../hooks/usePolling'
import OrderForm from '../components/OrderForm'

export default function Buy() {
  const { eventId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()

  const fetch = useCallback(() => getEvents(), [])
  const { data: events } = usePolling(fetch, 15000)

  const event = location.state?.event ?? events?.find(e => e.id === eventId)

  if (!event) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-brand-200 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Carregando evento...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto">
      <button onClick={() => navigate(-1)} className="text-sm text-gray-400 hover:text-gray-600 mb-6 flex items-center gap-1">
        ← Voltar
      </button>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{event.name}</h1>
        <p className="text-gray-500 text-sm mt-1">📍 {event.venue}</p>
        <p className="text-xs text-gray-400 mt-1">
          {event.available_tickets.toLocaleString('pt-BR')} ingressos disponíveis ·{' '}
          R$ {Number(event.price).toFixed(2).replace('.', ',')} cada
        </p>
      </div>
      <OrderForm event={event} />
      <p className="text-xs text-gray-300 mt-4 text-center">
        O pedido é processado de forma assíncrona — acompanhe o status em tempo real acima.
      </p>
    </div>
  )
}
