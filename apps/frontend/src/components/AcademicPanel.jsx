import { useState } from 'react'
import { sendBatch } from '../services/api'

function BatchButton({ label, count, failureRate = 0, onComplete }) {
  const [state, setState] = useState('idle')

  async function run() {
    setState('running')
    try {
      const res = await sendBatch(count, failureRate)
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
      className="flex items-center gap-3 bg-white border border-gray-200 hover:border-brand-100 hover:bg-brand-50 disabled:opacity-50 rounded-xl px-5 py-4 text-left transition-all w-full"
    >
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${failureRate > 0 ? 'bg-red-100' : 'bg-brand-50'}`}>
        {state === 'running' ? (
          <div className="w-4 h-4 border-2 border-brand-300 border-t-transparent rounded-full animate-spin" />
        ) : (
          <span className="text-base">{failureRate > 0 ? '⚠️' : '🚀'}</span>
        )}
      </div>
      <div>
        <p className="font-medium text-gray-800 text-sm">{label}</p>
        <p className="text-xs text-gray-400">
          {count.toLocaleString('pt-BR')} pedidos
          {failureRate > 0 && ` · ${(failureRate * 100).toFixed(0)}% com falha`}
        </p>
      </div>
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
        <BatchButton label="Disparar 100 pedidos" count={100} onComplete={handleComplete} />
        <BatchButton label="Disparar 1000 pedidos" count={1000} onComplete={handleComplete} />
        <BatchButton label="Simular falhas (30%)" count={100} failureRate={0.3} onComplete={handleComplete} />
        <BatchButton label="Simular falhas (30%) — lote grande" count={500} failureRate={0.3} onComplete={handleComplete} />
      </div>
      {lastResult && (
        <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-600">
          Último lote: <strong>{lastResult.published}</strong> publicados,{' '}
          <strong>{lastResult.failed}</strong> com erro.
          {lastResult.sample_ids?.length > 0 && (
            <p className="text-xs text-gray-400 mt-1 font-mono">
              Primeiros IDs: {lastResult.sample_ids.slice(0, 2).join(', ')}…
            </p>
          )}
        </div>
      )}
    </div>
  )
}
