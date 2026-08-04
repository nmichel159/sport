import { useEffect } from 'react'
import { Platform, StatusBar } from 'react-native'
import * as NavigationBar from 'expo-navigation-bar'

/**
 * Keep Android's status bar visible and let the OS own its visibility.
 * The native Expo config provides the matching initial state before React loads.
 */
export function SystemUiController() {
  useEffect(() => {
    if (Platform.OS !== 'android') return
    void NavigationBar.setButtonStyleAsync('light')
  }, [])

  return (
    <StatusBar
      animated
      barStyle="light-content"
      hidden={false}
    />
  )
}
