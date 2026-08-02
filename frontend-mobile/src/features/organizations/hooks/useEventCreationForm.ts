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
  ParticipationType,
} from '../../../types/domain'
import { toIsoDate } from '../../../utils/date'
import {
  NATIONWIDE_REGIONS,
  districtBelongsToRegion,
  emptyCategory,
  type EventCategoryDraft,
} from '../eventFormOptions'

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/

export function useEventCreationForm(
  _fetcher: AuthenticatedFetch,
  onCreate: (payload: EventPayload) => Promise<void>,
) {
  const [sports, setSports] = useState<Sport[]>([])
  const [eventType, setEventType] = useState<EventType>('TOURNAMENT')
  const [coverImageUrl, setCoverImageUrl] = useState('')
  const [name, setName] = useState('')
  const [sport, setSport] = useState('')
  const [mode, setMode] = useState<ParticipationType>('TEAM')
  const [eventDate, setEventDate] = useState<Date | null>(null)
  const [eventTime, setEventTime] = useState('')
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [region, setRegionValue] = useState('')
  const [cityQuery, setCityQuery] = useState('')
  const [cities, setCities] = useState<DistrictCity[]>([])
  const [city, setCity] = useState<DistrictCity | null>(null)
  const [venue, setVenue] = useState('')
  const [categories, setCategories] = useState<EventCategoryDraft[]>([
    emptyCategory(),
  ])
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
      current.length === 1
        ? current
        : current.filter((_, categoryIndex) => categoryIndex !== index),
    )
  }

  const submit = async () => {
    const requiresCity = !NATIONWIDE_REGIONS.has(region)
    const timeIsValid =
      eventType === 'LEAGUE' || TIME_PATTERN.test(eventTime)
    const categoriesAreValid = categories.every(
      (category) =>
        category.age_group &&
        category.team_format &&
        category.gender_category &&
        category.fee !== '' &&
        Number(category.fee) >= 0 &&
        Number.isInteger(Number(category.capacity)) &&
        Number(category.capacity) > 0,
    )

    if (
      !name.trim() ||
      !sport ||
      !eventDate ||
      !region ||
      (requiresCity && !city) ||
      !timeIsValid ||
      !categoriesAreValid
    ) {
      setError(
        'Vyplň typ, názov, šport, termín, lokalitu a všetky údaje kategórií.',
      )
      return false
    }

    setBusy(true)
    setError('')

    try {
      await onCreate({
        name: name.trim(),
        event_type: eventType,
        sport,
        participation_type: mode,
        event_date: toIsoDate(eventDate),
        event_time: eventType === 'TOURNAMENT' ? eventTime : null,
        region,
        city_id: city?.id ?? null,
        city: city?.name ?? null,
        venue: venue.trim() || null,
        cover_image_url: coverImageUrl.trim() || null,
        categories: categories.map((category) => ({
          age_group: category.age_group as EventPayload['categories'][number]['age_group'],
          team_format: category.team_format as EventPayload['categories'][number]['team_format'],
          gender_category: category.gender_category as EventPayload['categories'][number]['gender_category'],
          fee: Number(category.fee),
          capacity: Number(category.capacity),
        })),
        description: description.trim() || null,
      })
      setEventType('TOURNAMENT')
      setCoverImageUrl('')
      setName('')
      setSport('')
      setMode('TEAM')
      setEventDate(null)
      setEventTime('')
      setRegionValue('')
      setCityQuery('')
      setCity(null)
      setVenue('')
      setCategories([emptyCategory()])
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
    setMode,
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
