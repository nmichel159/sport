import { Stack } from 'expo-router'
import { AuthProvider } from '../auth'
import { I18nProvider } from '../i18n'

export default function RootLayout() {
  return <I18nProvider><AuthProvider><Stack><Stack.Screen name="index" options={{ headerShown: false }} /><Stack.Screen name="oauth2redirect" options={{ headerShown: false }} /></Stack></AuthProvider></I18nProvider>
}
