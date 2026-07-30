import type { ConfigContext } from 'expo/config'

function isHttpsUrl(value: string | undefined) {
  if (!value) return false

  try {
    return new URL(value).protocol === 'https:'
  } catch {
    return false
  }
}

/**
 * A release must never silently ship authentication over plain HTTP.
 * Development builds still receive Expo's debug-only cleartext override.
 */
export default ({ config }: ConfigContext) => {
  if (
    process.env.APP_ENV === 'production' &&
    !isHttpsUrl(process.env.EXPO_PUBLIC_API_BASE_URL)
  ) {
    throw new Error(
      'Production build requires EXPO_PUBLIC_API_BASE_URL to use HTTPS.',
    )
  }

  return config
}
