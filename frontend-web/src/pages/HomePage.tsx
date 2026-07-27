import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../auth'
import { createOrganization, createOrganizationEvent, getMyOrganizations, type EventInput, type Organization } from '../services/api'

const emptyEvent: EventInput = { name: '', sport: '', participation_type: 'TEAM', event_date: null, location: null, fee: null, description: null }

export function HomePage() {
  const { user, logout, token } = useAuth()
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [organizationName, setOrganizationName] = useState('')
  const [event, setEvent] = useState<EventInput>(emptyEvent)
  const [error, setError] = useState(''); const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false)
  const selectedOrganization = useMemo(() => organizations.find((organization) => organization.id === selectedId), [organizations, selectedId])

  useEffect(() => { if (!token) return; void getMyOrganizations(token).then((items) => { setOrganizations(items); setSelectedId(items[0]?.id ?? '') }).catch(() => setError('Nepodarilo sa načítať organizácie.')).finally(() => setLoading(false)) }, [token])
  const updateEvent = <K extends keyof EventInput>(key: K, value: EventInput[K]) => setEvent((current) => ({ ...current, [key]: value }))
  const submitOrganization = async (submitEvent: FormEvent) => { submitEvent.preventDefault(); if (!token || !organizationName.trim()) return; setSaving(true); setError(''); try { const organization = await createOrganization(token, organizationName.trim()); setOrganizations((items) => [organization, ...items]); setSelectedId(organization.id); setOrganizationName('') } catch (reason) { setError(reason instanceof Error ? reason.message : 'Organizáciu sa nepodarilo vytvoriť.') } finally { setSaving(false) } }
  const submitEvent = async (submitFormEvent: FormEvent) => { submitFormEvent.preventDefault(); if (!token || !selectedOrganization) return; setSaving(true); setError(''); try { const updated = await createOrganizationEvent(token, selectedOrganization.id, event); setOrganizations((items) => items.map((item) => item.id === updated.id ? updated : item)); setEvent(emptyEvent) } catch (reason) { setError(reason instanceof Error ? reason.message : 'Event sa nepodarilo vytvoriť.') } finally { setSaving(false) } }

  return <main className="organization-page">
    <header className="organization-header"><div><span className="eyebrow">ORGANIZÁCIA</span><h1>Správa eventov</h1><p>{user?.display_name ? `Ahoj, ${user.display_name}.` : 'Vytváraj športové eventy pre svoju komunitu.'}</p></div><button className="logout" onClick={() => void logout()}>Odhlásiť sa</button></header>
    {error && <p className="error">{error}</p>}
    <section className="organization-picker"><div><h2>Tvoje organizácie</h2><p>Vyber organizáciu, ktorej eventy chceš spravovať.</p></div><form onSubmit={submitOrganization}><input value={organizationName} onChange={(e) => setOrganizationName(e.target.value)} placeholder="Názov novej organizácie" maxLength={180} /><button disabled={saving}>Pridať organizáciu</button></form></section>
    {loading ? <p>Načítavam organizácie…</p> : organizations.length === 0 ? <section className="empty"><h2>Začni organizáciou</h2><p>Vytvor si organizáciu a môžeš do nej pridávať eventy.</p></section> : <>
      <nav className="organization-tabs" aria-label="Organizácie">{organizations.map((organization) => <button key={organization.id} className={organization.id === selectedId ? 'active' : ''} onClick={() => setSelectedId(organization.id)}>{organization.name}</button>)}</nav>
      {selectedOrganization && <div className="organization-content"><section className="event-form-card"><span className="eyebrow">NOVÝ EVENT</span><h2>Vytvor event</h2><p>Vyplň základné informácie pre účastníkov.</p><form className="event-form" onSubmit={submitEvent}>
        <label>Názov eventu<input required value={event.name} onChange={(e) => updateEvent('name', e.target.value)} placeholder="Napr. Letný futbalový turnaj" /></label>
        <div className="form-grid"><label>Šport<input required value={event.sport} onChange={(e) => updateEvent('sport', e.target.value)} placeholder="Napr. futbal" /></label><label>Kedy<input type="date" value={event.event_date ?? ''} onChange={(e) => updateEvent('event_date', e.target.value || null)} /></label></div>
        <label>Kde<input value={event.location ?? ''} onChange={(e) => updateEvent('location', e.target.value || null)} placeholder="Miesto konania" /></label>
        <fieldset><legend>Forma účasti</legend><div className="mode-choice"><button type="button" className={event.participation_type === 'TEAM' ? 'selected' : ''} onClick={() => updateEvent('participation_type', 'TEAM')}>Tímové</button><button type="button" className={event.participation_type === 'INDIVIDUAL' ? 'selected' : ''} onClick={() => updateEvent('participation_type', 'INDIVIDUAL')}>Samostatné</button></div></fieldset>
        <label>Poplatok (€)<input type="number" min="0" step="0.01" value={event.fee ?? ''} onChange={(e) => updateEvent('fee', e.target.value === '' ? null : Number(e.target.value))} placeholder="0,00" /></label>
        <label>Pokec / popis<textarea value={event.description ?? ''} onChange={(e) => updateEvent('description', e.target.value || null)} placeholder="Napíš účastníkom, na čo sa môžu tešiť…" maxLength={2000} /></label>
        <button className="primary" disabled={saving}>{saving ? 'Ukladám…' : 'Vytvoriť event'}</button>
      </form></section>
      <section className="events-card"><div className="section-heading"><div><span className="eyebrow">PREHĽAD</span><h2>Vytvorené eventy</h2></div><span className="event-count">{selectedOrganization.events.length}</span></div>{selectedOrganization.events.length === 0 ? <div className="empty"><h3>Zatiaľ bez eventov</h3><p>Prvý event vytvoríš formulárom vedľa.</p></div> : <div className="event-list">{selectedOrganization.events.map((item) => <article className="event-item" key={item.id}><div className="event-icon">{item.sport.charAt(0).toUpperCase()}</div><div><h3>{item.name}</h3><p className="event-meta">{item.sport} · {item.participation_type === 'TEAM' ? 'Tímové' : 'Samostatné'}</p><p className="event-meta">{item.event_date ? new Intl.DateTimeFormat('sk-SK', { dateStyle: 'medium' }).format(new Date(`${item.event_date}T12:00:00`)) : 'Termín sa doplní'}{item.location ? ` · ${item.location}` : ''}</p>{item.description && <p className="event-description">{item.description}</p>}</div><strong>{item.fee === null ? 'Zdarma' : `${Number(item.fee).toFixed(2).replace('.', ',')} €`}</strong></article>)}</div>}</section></div>}
    </>}
  </main>
}
