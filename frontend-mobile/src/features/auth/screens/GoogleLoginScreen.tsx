import * as AuthSession from 'expo-auth-session'
import * as Google from 'expo-auth-session/providers/google'
import { useEffect, useRef, useState } from 'react'
import { Button, Pressable, Text, View } from 'react-native'
import { useAuth } from '../context/AuthContext'
import type {
  Language,
  Translation,
} from '../../../shared/i18n/I18nContext'
import { formStyles } from '../../../styles/formStyles'
import { loginStyles } from '../../../styles/loginStyles'
import { Brand } from '../components/Brand'

type Props = {
  setLang: (language: Language) => void
  t: Translation
}

export function GoogleLoginScreen({ setLang, t }: Props) {
  const { signIn } = useAuth()
  const androidClientId =
    process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? ''

  // Keep the login screen mounted while AuthSession consumes the callback.
  const redirectUri = AuthSession.makeRedirectUri({
    native: 'com.nmichel.sport:/',
  })
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    androidClientId,
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    redirectUri,
  })
  const [error, setError] = useState(false)
  const handledCredential = useRef<string | null>(null)

  useEffect(() => {
    const credential =
      response?.type === 'success' ? response.params.id_token : undefined
    if (!credential || handledCredential.current === credential) return

    handledCredential.current = credential
    void signIn(credential).catch(() => setError(true))
  }, [response, signIn])

  return (
    <View style={loginStyles.screen}>
      <View style={loginStyles.card}>
        <Brand />
        <Text style={loginStyles.title}>Vitaj v hre.</Text>
        <Text style={loginStyles.subtitle}>{t.subtitle}</Text>
        <View style={formStyles.languages}>
          <Button title="SK" onPress={() => setLang('sk')} />
          <Button title="EN" onPress={() => setLang('en')} />
        </View>
        <Pressable
          style={loginStyles.button}
          disabled={!request || !androidClientId}
          onPress={() => {
            setError(false)
            void promptAsync()
          }}
        >
          <Text style={loginStyles.buttonText}>{t.google}</Text>
        </Pressable>
        {error ? <Text style={formStyles.error}>{t.error}</Text> : null}
      </View>
    </View>
  )
}
