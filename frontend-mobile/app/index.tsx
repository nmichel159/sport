import { ActivityIndicator, Button, Platform, StyleSheet, Text, View } from 'react-native'
import * as Google from 'expo-auth-session/providers/google'
import * as AuthSession from 'expo-auth-session'
import Constants from 'expo-constants'
import { useEffect, useState } from 'react'
import { BackendStatus } from '../components/BackendStatus'
import { useAuth } from '../auth'
import { useI18n } from '../i18n'

export default function HomeScreen() {
  const { user, loading, signOut } = useAuth(); const { lang, setLang, t } = useI18n()
  if (loading) return <View style={styles.container}><ActivityIndicator /><Text>{t.loading}</Text></View>
  if (user) return <View style={styles.container}><Text style={styles.title}>Sport</Text><Text>{user.display_name}</Text><Button title={t.signout} onPress={() => void signOut()} /><BackendStatus /></View>
  return <LoginScreen lang={lang} setLang={setLang} t={t} />
}

function LoginScreen({ lang, setLang, t }: { lang: 'sk' | 'en'; setLang: (lang: 'sk' | 'en') => void; t: { subtitle: string; google: string; error: string } }) {
  const { developmentSignIn } = useAuth()
  if (Constants.appOwnership === 'expo') return <View style={styles.container}><Text style={styles.title}>Sport</Text><Text style={styles.subtitle}>{t.subtitle}</Text><Button title="Pokračovať v testovacom režime" onPress={() => void developmentSignIn()} /><Text style={styles.note}>Expo Go je určené na rýchle testovanie. Google login funguje v development builde Sport.</Text></View>
  return <GoogleLogin lang={lang} setLang={setLang} t={t} />
}

function GoogleLogin({ lang, setLang, t }: { lang: 'sk' | 'en'; setLang: (lang: 'sk' | 'en') => void; t: { subtitle: string; google: string; error: string } }) {
  const { signIn } = useAuth(); const androidClientId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? ''
  // Return to the root route so the login component remains mounted to receive
  // the AuthSession result instead of leaving the user on a blank callback page.
  const redirectUri = AuthSession.makeRedirectUri({ native: 'com.nmichel.sport:/' })
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({ androidClientId, webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID, redirectUri })
  const [error, setError] = useState(false)
  useEffect(() => { if (response?.type === 'success' && response.params.id_token) void signIn(response.params.id_token).catch(() => setError(true)) }, [response, signIn])
  return <View style={styles.container}><View style={styles.languages}><Button title="SK" onPress={() => setLang('sk')} /><Button title="EN" onPress={() => setLang('en')} /></View><Text style={styles.title}>Sport</Text><Text style={styles.subtitle}>{t.subtitle}</Text><Button title={t.google} disabled={!request || !androidClientId} onPress={() => { setError(false); void promptAsync() }} />{error && <Text style={styles.error}>{t.error}</Text>}</View>
}
const styles = StyleSheet.create({ container: { flex: 1, justifyContent: 'center', gap: 16, padding: 24, backgroundColor: '#f5f7fb' }, title: { fontSize: 36, fontWeight: '800', color: '#172033' }, subtitle: { color: '#566074', fontSize: 16 }, note: { color: '#566074', fontSize: 13 }, error: { color: '#b42318' }, languages: { flexDirection: 'row', gap: 8, position: 'absolute', top: 60, right: 16 } })
