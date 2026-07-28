import { useEffect, useState } from 'react'
import { getHealth } from '../services/api'

export function useHealth() {
  const [result, setResult] = useState<
    'Checking backend…' | 'Backend: online' | string
  >('Checking backend…')

  useEffect(() => {
    void getHealth()
      .then(() => setResult('Backend: online'))
      .catch((error: Error) =>
        setResult(`Backend unavailable: ${error.message}`),
      )
  }, [])

  return result
}
