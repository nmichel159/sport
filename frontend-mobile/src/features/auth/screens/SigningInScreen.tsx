import { ActivityIndicator, Text, View } from 'react-native'
import { loginStyles } from '../../../styles/loginStyles'
import { Brand } from '../components/Brand'

export function SigningInScreen() {
  return (
    <View style={loginStyles.screen}>
      <View style={loginStyles.card}>
        <Brand />
        <ActivityIndicator color="#ffd400" size="large" />
        <Text style={loginStyles.title}>Prihlasujem ťa…</Text>
        <Text style={loginStyles.subtitle}>
          Overujeme účet a pripravujeme tvoj profil.
        </Text>
      </View>
    </View>
  )
}

