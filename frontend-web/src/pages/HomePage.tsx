import { BackendStatus } from '../components/BackendStatus'
import { useAuth } from '../auth'
import { useI18n } from '../i18n'

export function HomePage() {
  const { user, logout } = useAuth(); const { t } = useI18n()
  return <main><button className="logout" onClick={() => void logout()}>{t.signOut}</button><h1>{t.welcome}{user?.display_name ? `, ${user.display_name}` : ''}</h1><BackendStatus /></main>
}
