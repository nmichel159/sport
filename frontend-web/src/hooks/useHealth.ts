import { useEffect, useState } from 'react'
import { getHealth } from '../services/api'

export function useHealth() {
  const [status, setStatus] = useState<'loading' | 'online' | 'error'>('loading')
  const [error, setError] = useState<string>()
  useEffect(() => { getHealth().then(() => setStatus('online')).catch((e: Error) => { setStatus('error'); setError(e.message) }) }, [])
  return { status, error }
}
