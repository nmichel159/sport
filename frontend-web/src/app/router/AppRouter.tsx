import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from '../../features/auth/context/AuthContext'
import { LoginView } from '../../views/LoginView'
import { NotFoundView } from '../../views/NotFoundView'
import { OnboardingView } from '../../views/OnboardingView'
import { OrganizationsView } from '../../views/OrganizationsView'

function ProtectedOrganizationsRoute() {
  const { user, loading } = useAuth()
  if (loading) return <main>Loading…</main>
  if (!user) return <Navigate to="/login" replace />
  return user.onboarding_completed ? <OrganizationsView /> : <Navigate to="/onboarding" replace />
}

function OnboardingRoute() {
  const { user, loading } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/login" replace />
  return user.onboarding_completed ? <Navigate to="/" replace /> : <OnboardingView />
}

export function AppRouter() {
  return <Routes><Route path="/" element={<ProtectedOrganizationsRoute />} /><Route path="/login" element={<LoginView />} /><Route path="/onboarding" element={<OnboardingRoute />} /><Route path="*" element={<NotFoundView />} /></Routes>
}
