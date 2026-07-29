import * as NavigationBar from 'expo-navigation-bar'
import { useEffect, useRef } from 'react'
import { AppState, Keyboard, Platform, StatusBar } from 'react-native'

const isAndroid = Platform.OS === 'android'
const systemBarColor = '#0b0c0e'
const reapplyDelays = [0, 100, 500]

export async function applySystemUiSettings() {
  if (!isAndroid) return

  StatusBar.setBarStyle('light-content', true)
  StatusBar.setBackgroundColor(systemBarColor, true)
  StatusBar.setTranslucent(false)
  StatusBar.setHidden(true, 'fade')

  await Promise.allSettled([
    NavigationBar.setBackgroundColorAsync(systemBarColor),
    NavigationBar.setButtonStyleAsync('light'),
    NavigationBar.setBehaviorAsync('overlay-swipe'),
  ])
  await NavigationBar.setVisibilityAsync('hidden').catch(() => undefined)
}

export function SystemUiController() {
  const navigationBarVisibility = NavigationBar.useVisibility()
  const reapplyTimers = useRef<ReturnType<typeof setTimeout>[]>([])

  const clearReapplyTimers = () => {
    reapplyTimers.current.forEach(clearTimeout)
    reapplyTimers.current = []
  }

  const scheduleSystemUiReapply = () => {
    clearReapplyTimers()
    reapplyTimers.current = reapplyDelays.map((delay) =>
      setTimeout(() => void applySystemUiSettings(), delay),
    )
  }

  useEffect(() => {
    scheduleSystemUiReapply()

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') scheduleSystemUiReapply()
    })
    const keyboardHideSubscription = Keyboard.addListener('keyboardDidHide', () => {
      // Android may restore its system bars after the keyboard closes.
      scheduleSystemUiReapply()
    })

    return () => {
      subscription.remove()
      keyboardHideSubscription.remove()
      clearReapplyTimers()
    }
  }, [])

  useEffect(() => {
    if (navigationBarVisibility === 'visible') {
      scheduleSystemUiReapply()
    }
  }, [navigationBarVisibility])

  return null
}
