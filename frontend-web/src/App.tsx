import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './auth'
import { I18nProvider } from './i18n'
import { HomePage } from './pages/HomePage'
import { LoginPage } from './pages/LoginPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { OnboardingPage } from './pages/OnboardingPage'

function PrivateHome() { const { user, loading } = useAuth(); if (loading) return <main>Loading…</main>; if (!user) return <Navigate to="/login" replace />; return user.onboarding_completed ? <HomePage /> : <Navigate to="/onboarding" replace /> }
function OnboardingRoute() { const { user, loading } = useAuth(); if (loading) return null; if (!user) return <Navigate to="/login" replace />; return user.onboarding_completed ? <Navigate to="/" replace /> : <OnboardingPage /> }
export default function App() { return <I18nProvider><AuthProvider><Routes><Route path="/" element={<PrivateHome />} /><Route path="/login" element={<LoginPage />} /><Route path="/onboarding" element={<OnboardingRoute />} /><Route path="*" element={<NotFoundPage />} /></Routes></AuthProvider></I18nProvider> }
