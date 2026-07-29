import { Stack } from 'expo-router'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { AppProviders } from '../src/providers/AppProviders'

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppProviders>
        <Stack>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen
            name="oauth2redirect"
            options={{ headerShown: false }}
          />
        </Stack>
      </AppProviders>
    </GestureHandlerRootView>
  )
}
