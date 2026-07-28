// Physical devices must use your computer's LAN IP, e.g. http://192.168.1.10:8000.
export const apiBaseUrl =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:8000'
