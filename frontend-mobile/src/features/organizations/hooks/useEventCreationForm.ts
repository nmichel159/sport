import { useEffect, useState } from 'react'
import {
  type DistrictCity,
  type Sport,
  loadSports,
  searchDistrictCities,
} from '../../../services/catalogs'
import type {
  AuthenticatedFetch,
  EventPayload,
  ParticipationType,
  TournamentFormat,
} from '../../../types/domain'
import { toIsoDate } from '../../../utils/date'
import { requestEventFormats } from '../services/organizationApi'

export function useEventCreationForm(
  fetcher: AuthenticatedFetch,
  onCreate: (payload: EventPayload) => Promise<void>,
) {
  const [sports, setSports] = useState<Sport[]>([])
  const [formats, setFormats] = useState<TournamentFormat[]>([])
  const [name, setName] = useState('')
  const [sport, setSport] = useState('')
  const [mode, setMode] = useState<ParticipationType>('TEAM')
  const [formatId, setFormatId] = useState('')
  const [eventDate, setEventDate] = useState<Date | null>(null)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [cityQuery, setCityQuery] = useState('')
  const [cities, setCities] = useState<DistrictCity[]>([])
  const [city, setCity] = useState<DistrictCity | null>(null)
  const [description, setDescription] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    void Promise.all([loadSports(), requestEventFormats(fetcher)])
      .then(([sportItems, formatItems]) => {
        setSports(sportItems)
        setFormats(formatItems)
        const singleElimination = formatItems.find(
          (item) => item.code === 'SINGLE_ELIMINATION',
        )
        setFormatId(singleElimination?.id ?? formatItems[0]?.id ?? '')
      })
      .catch(() => setError('Číselníky sa nepodarilo načítať.'))
  }, [fetcher])

  useEffect(() => {
    if (city || cityQuery.trim().length < 2) {
      setCities([])
      return
    }

    const timeout = setTimeout(() => {
      void searchDistrictCities(cityQuery)
        .then(setCities)
        .catch(() => setCities([]))
    }, 250)

    return () => clearTimeout(timeout)
  }, [cityQuery, city])

  const submit = async () => {
    if (!name.trim() || !sport || !formatId || !eventDate || !city) {
      setError('Vyplň názov, šport, herný systém, termín a mesto.')
      return
    }

    setBusy(true)
    setError('')

    try {
      await onCreate({
        name: name.trim(),
        sport,
        participation_type: mode,
        format_id: formatId,
        event_date: toIsoDate(eventDate),
        location: city.name,
        description: description.trim() || null,
      })
      setName('')
      setSport('')
      setMode('TEAM')
      const singleElimination = formats.find(
        (item) => item.code === 'SINGLE_ELIMINATION',
      )
      setFormatId(singleElimination?.id ?? formats[0]?.id ?? '')
      setEventDate(null)
      setCityQuery('')
      setCity(null)
      setDescription('')
    } catch {
      setError('Event sa nepodarilo vytvoriť.')
    } finally {
      setBusy(false)
    }
  }

  return {
    sports,
    formats,
    name,
    setName,
    sport,
    setSport,
    mode,
    setMode,
    formatId,
    setFormatId,
    eventDate,
    setEventDate,
    showDatePicker,
    setShowDatePicker,
    cityQuery,
    setCityQuery,
    cities,
    city,
    setCity,
    description,
    setDescription,
    busy,
    error,
    submit,
  }
}
