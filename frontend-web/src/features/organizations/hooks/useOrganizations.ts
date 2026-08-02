import { useEffect, useMemo, useState } from 'react'
import {
  createOrganization,
  createOrganizationEvent,
  getMyOrganizations,
  type EventInput,
  type Organization,
} from '../../../services/api'

const emptyEvent = (): EventInput => ({
  name: '',
  event_type: 'TOURNAMENT',
  sport: '',
  participation_type: 'TEAM',
  event_date: null,
  event_time: null,
  region: '',
  city_id: null,
  city: null,
  venue: null,
  cover_image_url: null,
  categories: [
    {
      age_group: 'open',
      team_format: '3v3',
      gender_category: 'mix',
      fee: 0,
      capacity: 8,
    },
  ],
  description: null,
})
export function useOrganizations(token: string | null) {
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [organizationName, setOrganizationName] = useState('')
  const [event, setEvent] = useState<EventInput>(emptyEvent)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const selectedOrganization = useMemo(
    () => organizations.find((organization) => organization.id === selectedId),
    [organizations, selectedId],
  )
  useEffect(() => {
    if (!token) return
    void getMyOrganizations(token)
      .then((items) => {
        setOrganizations(items)
        setSelectedId(items[0]?.id ?? '')
      })
      .catch(() => setError('Nepodarilo sa načítať organizácie.'))
      .finally(() => setLoading(false))
  }, [token])
  const updateEvent = <K extends keyof EventInput>(
    key: K,
    value: EventInput[K],
  ) => setEvent((current) => ({ ...current, [key]: value }))
  const addOrganization = async () => {
    if (!token || !organizationName.trim()) return
    setSaving(true)
    setError('')
    try {
      const organization = await createOrganization(
        token,
        organizationName.trim(),
      )
      setOrganizations((items) => [organization, ...items])
      setSelectedId(organization.id)
      setOrganizationName('')
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'Organizáciu sa nepodarilo vytvoriť.',
      )
    } finally {
      setSaving(false)
    }
  }
  const addEvent = async () => {
    if (!token || !selectedOrganization) return
    setSaving(true)
    setError('')
    try {
      const updated = await createOrganizationEvent(
        token,
        selectedOrganization.id,
        event,
      )
      setOrganizations((items) =>
        items.map((item) => (item.id === updated.id ? updated : item)),
      )
      setEvent(emptyEvent())
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'Event sa nepodarilo vytvoriť.',
      )
    } finally {
      setSaving(false)
    }
  }
  return {
    organizations,
    selectedId,
    setSelectedId,
    selectedOrganization,
    organizationName,
    setOrganizationName,
    event,
    updateEvent,
    error,
    loading,
    saving,
    addOrganization,
    addEvent,
  }
}
