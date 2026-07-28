import * as NavigationBar from 'expo-navigation-bar'
import { useEffect } from 'react'
import { AppState, Keyboard, Platform } from 'react-native'

const isAndroid = Platform.OS === 'android'

export async function applySystemUiSettings() {
  if (!isAndroid) return

  await Promise.allSettled([
    NavigationBar.setVisibilityAsync('hidden'),
    NavigationBar.setButtonStyleAsync('light'),
  ])
}

export function SystemUiController() {
  const navigationBarVisibility = NavigationBar.useVisibility()

  useEffect(() => {
    void applySystemUiSettings()

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void applySystemUiSettings()
    })
    const keyboardHideSubscription = Keyboard.addListener('keyboardDidHide', () => {
      // Android may restore a light navigation bar after the keyboard closes.
      setTimeout(() => void applySystemUiSettings(), 100)
    })

    return () => {
      subscription.remove()
      keyboardHideSubscription.remove()
    }
  }, [])

  useEffect(() => {
    if (navigationBarVisibility === 'visible') {
      void applySystemUiSettings()
    }
  }, [navigationBarVisibility])

  return null
}
