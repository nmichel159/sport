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
import type {
  EventFormAssistantApplyResult,
  EventFormAssistantPatch,
} from '../../localAi/types'
import {
  NATIONWIDE_REGIONS,
  districtBelongsToRegion,
  emptyCategory,
  participationTypeForSport,
  regionForDistrict,
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

  const applyAssistantPatch = async (
    patch: EventFormAssistantPatch,
  ): Promise<EventFormAssistantApplyResult> => {
    const appliedFields: string[] = []
    const warnings: string[] = []

    if (patch.eventType) {
      setEventType(patch.eventType)
      appliedFields.push('typ')
    }
    if (patch.name !== undefined) {
      setName(patch.name)
      appliedFields.push('názov')
    }
    if (patch.sport && sports.some((item) => item.name === patch.sport)) {
      setSport(patch.sport)
      appliedFields.push('šport')
    }
    if (patch.eventDate) {
      const [year, month, day] = patch.eventDate.split('-').map(Number)
      const parsedDate = new Date(year, month - 1, day, 12)
      if (
        parsedDate.getFullYear() === year &&
        parsedDate.getMonth() === month - 1 &&
        parsedDate.getDate() === day
      ) {
        setEventDate(parsedDate)
        appliedFields.push('dátum')
      }
    }
    if (patch.eventTime !== undefined) {
      setEventTime(patch.eventTime)
      appliedFields.push('čas')
    }

    const targetRegion = patch.region ?? region
    if (patch.region) {
      setRegionValue(patch.region)
      setCity(null)
      setCityQuery('')
      setCities([])
      appliedFields.push('kraj')
    }
    if (patch.city) {
      if (NATIONWIDE_REGIONS.has(targetRegion)) {
        warnings.push('Pri celoslovenskom evente sa mesto nepoužíva.')
      } else {
        try {
          const matches = await searchDistrictCities(patch.city)
          const normalizedCity = patch.city.trim().toLocaleLowerCase('sk-SK')
          const exactMatch = matches.find((item) =>
            item.name.toLocaleLowerCase('sk-SK') === normalizedCity
          )
          const resolved = matches.find((item) =>
            item.name.toLocaleLowerCase('sk-SK') === normalizedCity &&
            districtBelongsToRegion(item.district, targetRegion),
          ) ?? matches.find((item) =>
            districtBelongsToRegion(item.district, targetRegion),
          ) ?? (!targetRegion ? exactMatch : undefined)
          if (resolved) {
            if (!targetRegion) {
              const inferredRegion = regionForDistrict(resolved.district)
              if (inferredRegion) {
                setRegionValue(inferredRegion)
                appliedFields.push('kraj')
              }
            }
            setCity(resolved)
            setCityQuery('')
            setCities([])
            appliedFields.push('mesto')
          } else {
            setCity(null)
            setCityQuery(patch.city)
            warnings.push('Mesto sa nepodarilo jednoznačne vybrať; skontroluj ho.')
          }
        } catch {
          setCity(null)
          setCityQuery(patch.city)
          warnings.push('Mesto potrebuje potvrdenie po obnovení pripojenia.')
        }
      }
    }
    if (patch.venue !== undefined) {
      setVenue(patch.venue)
      appliedFields.push('miesto konania')
    }
    if (patch.coverImageUrl !== undefined) {
      setCoverImageUrl(patch.coverImageUrl)
      appliedFields.push('titulovka')
    }
    if (patch.description !== undefined) {
      setDescription(patch.description)
      appliedFields.push('popis')
    }
    if (patch.categories) {
      setCategories(patch.categories)
      appliedFields.push('kategórie')
    }

    setError('')
    return { appliedFields, warnings }
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
    assistantSnapshot: {
      eventType,
      name,
      sport,
      eventDate: eventDate ? toIsoDate(eventDate) : null,
      eventTime,
      region,
      city: city?.name ?? '',
      venue,
      coverImageUrl,
      description,
      categories,
      allowedSports: sports.map((item) => item.name),
    },
    applyAssistantPatch,
    busy,
    error,
    submit,
  }
}
