import { StatusBar } from 'react-native'

/**
 * Keep Android's status bar visible and let the OS own its visibility.
 * The native Expo config provides the matching initial state before React loads.
 */
export function SystemUiController() {
  return (
    <StatusBar
      animated
      barStyle="light-content"
      hidden={false}
    />
  )
}
