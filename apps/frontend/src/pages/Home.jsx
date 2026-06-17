import { useCallback } from 'react'
import { getEvents } from '../services/api'
import { usePolling } from '../hooks/usePolling'
import EventCard from '../components/EventCard'

export default function Home() {
  const fetch = useCallback(getEvents, [])
  const { data: events, loading, error } = usePolling(fetch, 10000)

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Eventos disponíveis</h1>
        <p className="text-gray-500 mt-1">Escolha um evento e garanta seu ingresso</p>
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
