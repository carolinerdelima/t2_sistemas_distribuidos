const BASE = '/api'

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || 'Erro desconhecido')
  }
  return res.json()
}

export const getEvents = () => request('/events')

export const getOrders = (params = {}) => {
  const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v))
  return request(`/orders?${q}`)
}

export const getOrder = id => request(`/orders/${id}`)

export const createOrder = data =>
  request('/orders', { method: 'POST', body: JSON.stringify(data) })

export const sendBatch = (count, failureRate = 0) =>
  request(`/batch?count=${count}&failure_rate=${failureRate}`, { method: 'POST' })

export const getStats = () => request('/stats')

export const debugKillWorker = (worker) =>
  request(`/debug/kill-worker?worker=${worker}`, { method: 'POST' })

export const debugScaleWorker = (worker, replicas) =>
  request(`/debug/scale?worker=${worker}&replicas=${replicas}`, { method: 'POST' })

export const debugRestartRabbit = () =>
  request('/debug/restart-rabbit', { method: 'POST' })
