import { useState } from 'react'
import { sendBatch } from '../services/api'
import { useConcept } from '../context/ConceptContext'

const EXPERIMENTS = [
  {
    label: 'Disparar 100 pedidos',
    count: 100,
    failureRate: 0,
    concept: 'BEB',
    conceptColor: 'text-sky-600 bg-sky-50',
    conceptId: 'beb',
    description: 'Producer publica sem aguardar processamento -> Best Effort Broadcast.',
  },
  {
    label: 'Disparar 1000 pedidos (carga)',
    count: 1000,
    failureRate: 0,
    concept: 'Backpressure',
    conceptColor: 'text-indigo-600 bg-indigo-50',
    conceptId: 'backpressure',
    description: 'Observe prefetch_count=10: filas crescem mas workers não sobrecarregam.',
  },
  {
    label: 'Simular falhas (30%)',
    count: 100,
    failureRate: 0.3,
    concept: 'DLQ + Retry',
    conceptColor: 'text-rose-600 bg-rose-50',
    conceptId: 'retry',
    description: 'Cada falha: retry com x-retry-count++. Após 3 tentativas → DLQ.',
  },
  {
    label: 'Carga com falhas (30%) -> 500',
    count: 500,
    failureRate: 0.3,
    concept: 'BEB + DLQ',
    conceptColor: 'text-orange-600 bg-orange-50',
    conceptId: 'dlq',
    description: 'Lote grande: observe o balanço entre confirmados e dead-letter-queue.',
  },
]

function ExperimentButton({ exp, onComplete }) {
  const [state, setState] = useState('idle')
  const showConcept = useConcept()

  async function run() {
    setState('running')
    showConcept(exp.conceptId)
    try {
      const res = await sendBatch(exp.count, exp.failureRate)
      onComplete?.(res)
    } catch (e) {
      console.error(e)
    } finally {
      setState('idle')
    }
  }

  return (
    <button
      onClick={run}
      disabled={state === 'running'}
      className="flex flex-col gap-2 bg-white border border-gray-200 hover:border-brand-100 hover:bg-brand-50 disabled:opacity-50 rounded-xl px-5 py-4 text-left transition-all w-full"
    >
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${exp.failureRate > 0 ? 'bg-red-50' : 'bg-brand-50'}`}>
          {state === 'running' ? (
            <div className="w-4 h-4 border-2 border-brand-300 border-t-transparent rounded-full animate-spin" />
          ) : (
            <span className="text-base">{''}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-800 text-sm">{exp.label}</p>
          <p className="text-xs text-gray-400">
            {exp.count.toLocaleString('pt-BR')} pedidos
            {exp.failureRate > 0 && ` · ${(exp.failureRate * 100).toFixed(0)}% com falha`}
          </p>
        </div>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${exp.conceptColor}`}>
          {exp.concept}
        </span>
      </div>
      <p className="text-xs text-gray-400 leading-snug pl-11">{exp.description}</p>
    </button>
  )
}

export default function AcademicPanel({ onBatch }) {
  const [lastResult, setLastResult] = useState(null)

  function handleComplete(res) {
    setLastResult(res)
    onBatch?.()
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {EXPERIMENTS.map(exp => (
          <ExperimentButton key={exp.label} exp={exp} onComplete={handleComplete} />
        ))}
      </div>
      {lastResult && (
        <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-600">
          Último lote: <strong>{lastResult.published}</strong> publicados,{' '}
          <strong>{lastResult.failed}</strong> com erro ao publicar.
          {lastResult.sample_ids?.length > 0 && (
            <p className="text-xs text-gray-400 mt-1 font-mono">
              IDs: {lastResult.sample_ids.slice(0, 2).join(', ')}…
            </p>
          )}
        </div>
      )}
    </div>
  )
}
