import * as NavigationBar from 'expo-navigation-bar'
import { useEffect, useRef } from 'react'
import { AppState, Keyboard, Platform } from 'react-native'

const isAndroid = Platform.OS === 'android'
const navigationBarRevealDuration = 4000

export async function applySystemUiSettings() {
  if (!isAndroid) return

  await Promise.allSettled([
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
