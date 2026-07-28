import Constants from 'expo-constants'
import { Pressable, Text, View } from 'react-native'
import type {
  Language,
  Translation,
} from '../../../shared/i18n/I18nContext'
import { loginStyles } from '../../../styles/loginStyles'
import { Brand } from '../components/Brand'
import { useAuth } from '../context/AuthContext'
import { GoogleLoginScreen } from './GoogleLoginScreen'

type Props = {
  setLang: (language: Language) => void
  t: Translation
}

export function LoginScreen(props: Props) {
  const { developmentSignIn } = useAuth()

  if (Constants.appOwnership !== 'expo') {
    return <GoogleLoginScreen {...props} />
  }

  return (
    <View style={loginStyles.screen}>
      <View style={loginStyles.card}>
        <Brand />
        <Text style={loginStyles.title}>Vitaj v hre.</Text>
        <Text style={loginStyles.subtitle}>
          Nájdi hráčov, eventy a svoj ranking na jednom mieste.
        </Text>
        <Text style={loginStyles.note}>
          Expo Go je určené na rýchle testovanie. Google login funguje v
          development builde Sport.
        </Text>
        <Pressable
          style={loginStyles.button}
          onPress={() => void developmentSignIn()}
        >
          <Text style={loginStyles.buttonText}>
            Pokračovať v testovacom režime →
          </Text>
        </Pressable>
      </View>
    </View>
  )
}
