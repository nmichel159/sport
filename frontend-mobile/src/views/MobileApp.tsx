import { ActivityIndicator, Text, View } from 'react-native'
import { LoginScreen } from '../features/auth/screens/LoginScreen'
import { SigningInScreen } from '../features/auth/screens/SigningInScreen'
import { useAuth } from '../features/auth/context/AuthContext'
import { DashboardScreen } from '../features/dashboard/screens/DashboardScreen'
import { OnboardingScreen } from '../features/onboarding/screens/OnboardingScreen'
import { useI18n } from '../shared/i18n/I18nContext'
import { formStyles } from '../styles/formStyles'

export default function MobileApp() {
  const {
    user,
    loading,
    signingIn,
    signOut,
    completeOnboarding,
  } = useAuth()
  const { setLang, t } = useI18n()

  if (signingIn) return <SigningInScreen />

  if (user?.onboarding_completed) {
    return (
      <DashboardScreen
        name={user.display_name ?? 'Hrac'}
        userId={user.id}
        onSignOut={signOut}
      />
    )
  }

  if (loading) {
    return (
      <View style={formStyles.loadingContainer}>
        <ActivityIndicator />
        <Text>{t.loading}</Text>
      </View>
    )
  }

  if (user) {
    return (
      <OnboardingScreen
        defaultName={user.display_name ?? ''}
        completeOnboarding={completeOnboarding}
      />
    )
  }

  return <LoginScreen setLang={setLang} t={t} />
}
