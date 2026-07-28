import * as NavigationBar from 'expo-navigation-bar'
import { useEffect } from 'react'
import { AppState, Platform } from 'react-native'

const isAndroid = Platform.OS === 'android'

export async function applySystemUiSettings() {
  if (!isAndroid) return

  await Promise.allSettled([
    NavigationBar.setVisibilityAsync('hidden'),
    NavigationBar.setButtonStyleAsync('light'),
    NavigationBar.setBehaviorAsync('overlay-swipe'),
  ])
}

export function SystemUiController() {
  const navigationBarVisibility = NavigationBar.useVisibility()

  useEffect(() => {
    void applySystemUiSettings()

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void applySystemUiSettings()
    })

    return () => subscription.remove()
  }, [])

  useEffect(() => {
    if (navigationBarVisibility === 'visible') {
      void applySystemUiSettings()
    }
  }, [navigationBarVisibility])

  return null
}
