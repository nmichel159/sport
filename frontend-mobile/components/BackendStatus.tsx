import { Text } from 'react-native'
import { useHealth } from '../hooks/useHealth'

export function BackendStatus() { return <Text>{useHealth()}</Text> }
