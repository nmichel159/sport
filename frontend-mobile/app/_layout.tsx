import { Stack } from 'expo-router'
import { StyleSheet } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { KeyboardProvider } from 'react-native-keyboard-controller'
import {
  SafeAreaProvider,
  SafeAreaView,
} from 'react-native-safe-area-context'
import { DismissKeyboardView } from '../src/components/DismissKeyboardView'
import { AppProviders } from '../src/providers/AppProviders'

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={styles.flex}>
        <KeyboardProvider>
          <AppProviders>
            <SafeAreaView
              edges={['top', 'right', 'bottom', 'left']}
              style={styles.safeArea}
            >
              <DismissKeyboardView>
                <Stack
                  screenOptions={{
                    contentStyle: styles.screen,
                  }}
                >
                  <Stack.Screen name="index" options={{ headerShown: false }} />
                  <Stack.Screen
                    name="oauth2redirect"
                    options={{ headerShown: false }}
                  />
                </Stack>
              </DismissKeyboardView>
            </SafeAreaView>
          </AppProviders>
        </KeyboardProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: '#0b0c0e' },
  screen: { backgroundColor: '#0b0c0e' },
})
