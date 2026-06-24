import { useCallback } from 'react'
import { Link } from 'react-router-dom'
import { getEvents } from '../services/api'
import { usePolling } from '../hooks/usePolling'
import EventCard from '../components/EventCard'

export default function Home() {
  const fetch = useCallback(getEvents, [])
  const { data: events, loading, error } = usePolling(fetch, 10000)

  return (
    <div>
      <div className="mb-8 bg-gradient-to-r from-brand-50 to-sky-50 border border-brand-100 rounded-2xl px-6 py-5 flex items-start gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-gray-900">TicketLab: demonstração de RabbitMQ como plataforma distribuída</h1>
          <p className="text-sm text-gray-500 mt-1 leading-relaxed">
            Compre um ingresso abaixo e observe os balões explicando cada conceito de SD em tempo real.
            Para entender a teoria completa (perguntas 1-6 do trabalho), acesse a aba <strong>Plataforma SD</strong>.
          </p>
          <Link to="/plataforma" className="inline-flex items-center gap-1.5 mt-3 text-xs font-semibold text-brand-600 bg-white border border-brand-200 rounded-lg px-3 py-1.5 hover:bg-brand-50 transition-colors">
            Ver Plataforma SD →
          </Link>
        </div>
      </div>

      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-700">Eventos disponíveis</h2>
        <p className="text-gray-400 text-sm mt-0.5">Escolha um evento para iniciar a demonstração ao vivo</p>
      </div>
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-gray-100 rounded-2xl h-72 animate-pulse" />
          ))}
        </div>
      )}
      {error && <p className="text-red-500 text-sm">Erro ao carregar eventos: {error}</p>}
      {events && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {events.map(event => <EventCard key={event.id} event={event} />)}
        </div>
      )}
    </div>
  )
}
