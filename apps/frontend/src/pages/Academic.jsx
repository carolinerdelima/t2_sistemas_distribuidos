import { useCallback } from 'react'
import { getStats } from '../services/api'
import { usePolling } from '../hooks/usePolling'
import MetricsBar from '../components/MetricsBar'
import ThroughputChart from '../components/ThroughputChart'
import AcademicPanel from '../components/AcademicPanel'

export default function Academic() {
  const fetch = useCallback(getStats, [])
  const { data: stats, refetch } = usePolling(fetch, 2000)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Painel Acadêmico</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Experimentos ao vivo para demonstração de conceitos de Sistemas Distribuídos
        </p>
      </div>

      <section>
        <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">
          Métricas ao vivo
        </h2>
        <MetricsBar stats={stats} />
      </section>

      <section>
        <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">
          Throughput (pedidos/tick · 2s)
        </h2>
        <ThroughputChart stats={stats} />
      </section>

      <section>
        <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">
          Experimentos
        </h2>
        <AcademicPanel onBatch={refetch} />
      </section>

      <section className="bg-brand-50 rounded-2xl p-6">
        <h2 className="text-sm font-semibold text-brand-500 mb-3">
          Conceitos demonstrados neste painel
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-gray-600">
          {[
            ['Best Effort Broadcast', 'Os botões de lote publicam sem aguardar processamento'],
            ['Backpressure', 'Envie 1000 pedidos e observe as filas crescerem no RabbitMQ UI'],
            ['DLQ', 'Lote com falhas → mensagens acumulam em dead-letter-queue'],
            ['Escalabilidade', 'make scale-workers N=5 e veja a fila drenar mais rápido'],
          ].map(([title, desc]) => (
            <div key={title} className="bg-white rounded-xl p-4">
              <p className="font-medium text-brand-500 text-xs mb-1">{title}</p>
              <p className="text-xs text-gray-500">{desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
