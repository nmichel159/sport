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
  EventType,
} from '../../../types/domain'
import { toIsoDate } from '../../../utils/date'
import { eventCreationFormSchema } from '../../../shared/validation/formSchemas'
import {
  NATIONWIDE_REGIONS,
  districtBelongsToRegion,
  emptyCategory,
  participationTypeForSport,
  type EventCategoryDraft,
} from '../eventFormOptions'

export function useEventCreationForm(
  _fetcher: AuthenticatedFetch,
  onCreate: (payload: EventPayload) => Promise<void>,
) {
  const [sports, setSports] = useState<Sport[]>([])
  const [eventType, setEventType] = useState<EventType>('TOURNAMENT')
  const [coverImageUrl, setCoverImageUrl] = useState('')
  const [name, setName] = useState('')
  const [sport, setSport] = useState('')
  const mode = participationTypeForSport(sport)
  const [eventDate, setEventDate] = useState<Date | null>(null)
  const [eventTime, setEventTime] = useState('')
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [region, setRegionValue] = useState('')
  const [cityQuery, setCityQuery] = useState('')
  const [cities, setCities] = useState<DistrictCity[]>([])
  const [city, setCity] = useState<DistrictCity | null>(null)
  const [venue, setVenue] = useState('')
  const [categories, setCategories] = useState<EventCategoryDraft[]>([])
  const [description, setDescription] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    void loadSports()
      .then(setSports)
      .catch(() => setError('Číselník športov sa nepodarilo načítať.'))
  }, [])

  useEffect(() => {
    if (
      !region ||
      NATIONWIDE_REGIONS.has(region) ||
      city ||
      cityQuery.trim().length < 2
    ) {
      setCities([])
      return
    }

    const timeout = setTimeout(() => {
      void searchDistrictCities(cityQuery)
        .then((items) =>
          setCities(
            items.filter((item) =>
              districtBelongsToRegion(item.district, region),
            ),
          ),
        )
        .catch(() => setCities([]))
    }, 250)

    return () => clearTimeout(timeout)
  }, [cityQuery, city, region])

  const setRegion = (nextRegion: string) => {
    setRegionValue(nextRegion)
    setCity(null)
    setCityQuery('')
    setCities([])
  }

  const updateCategory = (
    index: number,
    patch: Partial<EventCategoryDraft>,
  ) => {
    setCategories((current) =>
      current.map((category, categoryIndex) =>
        categoryIndex === index ? { ...category, ...patch } : category,
      ),
    )
  }

  const addCategory = () => {
    setCategories((current) => [...current, emptyCategory()])
  }

  const removeCategory = (index: number) => {
    setCategories((current) =>
      current.filter((_, categoryIndex) => categoryIndex !== index),
    )
  }

  const submit = async () => {
    const requiresCity = !NATIONWIDE_REGIONS.has(region)
    const result = eventCreationFormSchema.safeParse({
      name,
      eventType,
      sport,
      mode,
      eventDate,
      eventTime,
      region,
      requiresCity,
      city,
      categories,
    })

    if (!result.success) {
      setError(
        'Vyplň typ, názov, šport, termín, lokalitu a všetky údaje kategórií.',
      )
      return false
    }

    setBusy(true)
    setError('')

    try {
      await onCreate({
        name: result.data.name,
        event_type: result.data.eventType,
        sport: result.data.sport,
        participation_type: result.data.mode,
        event_date: toIsoDate(result.data.eventDate),
        event_time: result.data.eventType === 'TOURNAMENT' ? result.data.eventTime : null,
        region: result.data.region,
        city_id: result.data.city?.id ?? null,
        city: result.data.city?.name ?? null,
        venue: venue.trim() || null,
        cover_image_url: coverImageUrl.trim() || null,
        categories: result.data.categories,
        description: description.trim() || null,
      })
      setEventType('TOURNAMENT')
      setCoverImageUrl('')
      setName('')
      setSport('')
      setEventDate(null)
      setEventTime('')
      setRegionValue('')
      setCityQuery('')
      setCity(null)
      setVenue('')
      setCategories([])
      setDescription('')
      return true
    } catch {
      setError('Event sa nepodarilo vytvoriť.')
      return false
    } finally {
      setBusy(false)
    }
  }

  return {
    sports,
    eventType,
    setEventType,
    coverImageUrl,
    setCoverImageUrl,
    name,
    setName,
    sport,
    setSport,
    mode,
    eventDate,
    setEventDate,
    eventTime,
    setEventTime,
    showDatePicker,
    setShowDatePicker,
    region,
    setRegion,
    cityQuery,
    setCityQuery,
    cities,
    city,
    setCity,
    venue,
    setVenue,
    categories,
    updateCategory,
    addCategory,
    removeCategory,
    description,
    setDescription,
    busy,
    error,
    submit,
  }
}
