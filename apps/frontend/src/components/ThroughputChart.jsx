import { useEffect, useRef, useState } from 'react'

const MAX_POINTS = 60

export default function ThroughputChart({ stats }) {
  const prevTotal = useRef(null)
  const [points, setPoints] = useState([])

  useEffect(() => {
    if (!stats) return
    const total = stats.total ?? 0
    if (prevTotal.current !== null) {
      const rate = Math.max(0, total - prevTotal.current)
      setPoints(prev => [...prev.slice(-(MAX_POINTS - 1)), rate])
    }
    prevTotal.current = total
  }, [stats])

  if (points.length < 2) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-6 flex items-center justify-center h-40">
        <p className="text-sm text-gray-400">Aguardando dados de throughput...</p>
      </div>
    )
  }

  const max = Math.max(...points, 1)
  const W = 600
  const H = 120
  const step = W / (MAX_POINTS - 1)

  const path = points
    .map((v, i) => {
      const x = i * step
      const y = H - (v / max) * H
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')

  const area = path + ` L${((points.length - 1) * step).toFixed(1)},${H} L0,${H} Z`

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-700">Throughput em tempo real (pedidos/tick)</h3>
        <span className="text-xs text-gray-400">últimos {points.length}s</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-28" preserveAspectRatio="none">
        <defs>
          <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#A8C5E8" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#A8C5E8" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#chartGrad)" />
        <path d={path} fill="none" stroke="#A8C5E8" strokeWidth="2" />
      </svg>
      <div className="flex justify-between text-xs text-gray-300 mt-1">
        <span>0</span>
        <span>máx: {max}</span>
      </div>
    </div>
  )
}
