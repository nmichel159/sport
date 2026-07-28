import { useEffect, useState } from 'react'
import {
  type DistrictCity,
  type Sport,
  loadSports,
  searchDistrictCities,
} from '../../../services/catalogs'
import type {
  EventPayload,
  ParticipationType,
} from '../../../types/domain'
import { toIsoDate } from '../../../utils/date'

export function useEventCreationForm(
  onCreate: (payload: EventPayload) => Promise<void>,
) {
  const [sports, setSports] = useState<Sport[]>([])
  const [name, setName] = useState('')
  const [sport, setSport] = useState('')
  const [mode, setMode] = useState<ParticipationType>('TEAM')
  const [eventDate, setEventDate] = useState<Date | null>(null)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [cityQuery, setCityQuery] = useState('')
  const [cities, setCities] = useState<DistrictCity[]>([])
  const [city, setCity] = useState<DistrictCity | null>(null)
  const [description, setDescription] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    void loadSports()
      .then(setSports)
      .catch(() =>
        setError('Číselník športov sa nepodarilo načítať.'),
      )
  }, [])

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
    if (!name.trim() || !sport || !eventDate || !city) {
      setError('Vyplň názov, šport, termín a mesto zo zoznamu.')
      return
    }

    setBusy(true)
    setError('')

    try {
      await onCreate({
        name: name.trim(),
        sport,
        participation_type: mode,
        event_date: toIsoDate(eventDate),
        location: city.name,
        description: description.trim() || null,
      })
      setName('')
      setSport('')
      setMode('TEAM')
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
    name,
    setName,
    sport,
    setSport,
    mode,
    setMode,
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

