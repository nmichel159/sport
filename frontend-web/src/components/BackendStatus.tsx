import { useHealth } from '../hooks/useHealth'

export function BackendStatus() {
  const { status, error } = useHealth()
  if (status === 'loading') return <p>Checking backend…</p>
  if (status === 'error') return <p role="alert">Backend is unavailable: {error}</p>
  return <p>Backend status: <strong>online</strong></p>
}
