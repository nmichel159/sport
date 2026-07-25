import { Platform } from 'react-native'
// Do not load the native module in a browser bundle.
const secureStore = Platform.OS === 'web' ? null : require('expo-secure-store') as typeof import('expo-secure-store')

export async function getStoredValue(key: string): Promise<string | null> {
  if (Platform.OS === 'web') return globalThis.localStorage?.getItem(key) ?? null
  return secureStore!.getItemAsync(key)
}

export async function setStoredValue(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') { globalThis.localStorage?.setItem(key, value); return }
  await secureStore!.setItemAsync(key, value)
}

export async function removeStoredValue(key: string): Promise<void> {
  if (Platform.OS === 'web') { globalThis.localStorage?.removeItem(key); return }
  await secureStore!.deleteItemAsync(key)
}
