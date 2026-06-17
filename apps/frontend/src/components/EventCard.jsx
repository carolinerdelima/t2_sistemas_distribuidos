import { useNavigate } from 'react-router-dom'

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

function formatPrice(price) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(price)
}

export default function EventCard({ event }) {
  const navigate = useNavigate()
  const low = event.available_tickets < 10

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col hover:shadow-md transition-shadow">
      <div className="bg-brand-50 h-40 flex items-center justify-center relative">
        <svg className="w-16 h-16 text-brand-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
        </svg>
        {low && (
          <span className="absolute top-3 right-3 bg-red-500 text-white text-xs font-semibold px-2 py-1 rounded-full">
            Esgotando!
          </span>
        )}
      </div>
      <div className="p-5 flex flex-col flex-1">
        <h3 className="font-semibold text-gray-900 text-lg leading-tight mb-1">{event.name}</h3>
        <p className="text-sm text-gray-500 mb-1">📍 {event.venue}</p>
        <p className="text-sm text-gray-500 mb-3">🗓 {formatDate(event.event_date)}</p>
        <div className="flex items-center justify-between mt-auto">
          <div>
            <p className="text-xl font-bold text-brand-500">{formatPrice(event.price)}</p>
            <p className={`text-xs ${low ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
              {event.available_tickets.toLocaleString('pt-BR')} ingressos restantes
            </p>
          </div>
          <button
            onClick={() => navigate(`/buy/${event.id}`, { state: { event } })}
            disabled={event.available_tickets === 0}
            className="bg-brand-100 hover:bg-brand-200 disabled:opacity-40 disabled:cursor-not-allowed text-brand-500 font-semibold px-4 py-2 rounded-xl text-sm transition-colors"
          >
            {event.available_tickets === 0 ? 'Esgotado' : 'Comprar'}
          </button>
        </div>
      </div>
    </div>
  )
}
