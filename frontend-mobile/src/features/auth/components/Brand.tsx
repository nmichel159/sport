import { Text } from 'react-native'
import { loginStyles } from '../../../styles/loginStyles'

export function Brand() {
  return (
    <Text style={loginStyles.brand}>
      3×3 <Text style={loginStyles.accent}>SPORT</Text>
    </Text>
  )
}

