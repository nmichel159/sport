import { Stack } from 'expo-router'
import { AppProviders } from '../src/providers/AppProviders'

export default function RootLayout() {
  return (
    <AppProviders>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen
          name="oauth2redirect"
          options={{ headerShown: false }}
        />
      </Stack>
    </AppProviders>
  )
}
