import * as NavigationBar from 'expo-navigation-bar'
import { useEffect, useRef } from 'react'
import { AppState, Keyboard, Platform } from 'react-native'

const isAndroid = Platform.OS === 'android'
const navigationBarRevealDuration = 4000

export async function applySystemUiSettings() {
  if (!isAndroid) return

  await Promise.allSettled([
    // A bottom swipe reveals the panel and keeps it available until we hide it.
    // This is essential for the user to be able to leave the app with Home or
    // Recents instead of Android immediately hiding the panel again.
    NavigationBar.setBehaviorAsync('inset-swipe'),
    NavigationBar.setVisibilityAsync('hidden'),
    NavigationBar.setButtonStyleAsync('light'),
  ])
}

export function SystemUiController() {
  const navigationBarVisibility = NavigationBar.useVisibility()
  const hideNavigationBarTimer = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  )

  const clearHideTimer = () => {
    if (!hideNavigationBarTimer.current) return
    clearTimeout(hideNavigationBarTimer.current)
    hideNavigationBarTimer.current = null
  }

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
      clearHideTimer()
    }
  }, [])

  useEffect(() => {
    if (navigationBarVisibility === 'visible') {
      clearHideTimer()
      hideNavigationBarTimer.current = setTimeout(() => {
        void applySystemUiSettings()
        hideNavigationBarTimer.current = null
      }, navigationBarRevealDuration)
      return
    }

    clearHideTimer()
  }, [navigationBarVisibility])

  return null
}
