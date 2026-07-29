import Constants from 'expo-constants'

const configuredApiBaseUrl =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:8000'

/**
 * A development client loads JavaScript from Metro. On a physical device,
 * Metro's host is also the computer that runs the local Docker backend.
 * Deriving the host here prevents a stale DHCP/Ethernet address in `.env`
 * from silently sending login requests to the wrong network interface.
 */
function developmentApiBaseUrl() {
  if (!__DEV__) return null

  const metroHost = Constants.expoConfig?.hostUri
    ?.replace(/^[a-z]+:\/\//i, '')
    .split(':')[0]

  if (!metroHost || metroHost === 'localhost' || metroHost === '127.0.0.1') {
    return null
  }

  return `http://${metroHost}:8000`
}

export const apiBaseUrl =
  developmentApiBaseUrl() ?? configuredApiBaseUrl
