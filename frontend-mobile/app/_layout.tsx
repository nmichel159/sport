import { Stack } from 'expo-router'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { DismissKeyboardView } from '../src/components/DismissKeyboardView'
import { AppProviders } from '../src/providers/AppProviders'

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppProviders>
        <DismissKeyboardView>
          <Stack>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen
              name="oauth2redirect"
              options={{ headerShown: false }}
            />
          </Stack>
        </DismissKeyboardView>
      </AppProviders>
    </GestureHandlerRootView>
  )
}
