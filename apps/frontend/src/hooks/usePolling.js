import { useState, useEffect, useCallback, useRef } from 'react'

export function usePolling(fetchFn, interval = 3000) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const fnRef = useRef(fetchFn)
  fnRef.current = fetchFn

  const execute = useCallback(async () => {
    try {
      const result = await fnRef.current()
      setData(result)
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    execute()
    const timer = setInterval(execute, interval)
    return () => clearInterval(timer)
  }, [execute, interval])

  return { data, loading, error, refetch: execute }
}
