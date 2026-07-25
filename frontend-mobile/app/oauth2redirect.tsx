import { useEffect } from 'react'
import { useRouter } from 'expo-router'

// Google returns to this deep-link path. AuthSession consumes the callback;
// the route only prevents Expo Router from showing an unmatched-route screen.
export default function GoogleOAuthRedirect() {
  const router = useRouter()
  useEffect(() => { router.replace('/') }, [router])
  return null
}
