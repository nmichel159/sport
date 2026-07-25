import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth'
import { useI18n } from '../i18n'

declare global { interface Window { google?: { accounts: { id: { initialize: (o: { client_id: string; callback: (r: { credential: string }) => void }) => void; renderButton: (e: HTMLElement, o: object) => void } } } } }
export function LoginPage() {
  const { login, user } = useAuth(); const navigate = useNavigate(); const { language, setLanguage, t } = useI18n(); const [error, setError] = useState(false); const [busy, setBusy] = useState(false)
  useEffect(() => { if (user) navigate(user.onboarding_completed ? '/' : '/onboarding', { replace: true }) }, [user, navigate])
  useEffect(() => { const id = import.meta.env.VITE_GOOGLE_CLIENT_ID; if (!id) return; const render = () => { const el = document.getElementById('google-login'); if (!el || !window.google) return; window.google.accounts.id.initialize({ client_id: id, callback: async ({ credential }) => { setBusy(true); setError(false); try { await login(credential) } catch { setError(true) } finally { setBusy(false) } } }); window.google.accounts.id.renderButton(el, { theme: 'outline', size: 'large', text: 'continue_with', width: 300 }) }; const script = document.createElement('script'); script.src = 'https://accounts.google.com/gsi/client'; script.async = true; script.onload = render; document.head.append(script); return () => script.remove() }, [login])
  return <main className="login"><div className="language"><button onClick={() => setLanguage('sk')} aria-pressed={language === 'sk'}>SK</button><button onClick={() => setLanguage('en')} aria-pressed={language === 'en'}>EN</button></div><section><div className="mark">S</div><h1>{t.title}</h1><p>{t.subtitle}</p><div id="google-login" className={busy ? 'disabled' : ''} />{!import.meta.env.VITE_GOOGLE_CLIENT_ID && <p className="error">Google client ID is not configured.</p>}{busy && <p>{t.loading}</p>}{error && <p className="error">{t.loginError}</p>}<footer><a href="#privacy">{t.privacy}</a><a href="#terms">{t.terms}</a></footer></section></main>
}
