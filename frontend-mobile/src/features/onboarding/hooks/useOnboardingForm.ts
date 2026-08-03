import { useEffect, useState } from 'react'
import {
  type DistrictCity,
  type School,
  searchDistrictCities,
  searchSchools,
} from '../../../services/catalogs'
import type { Gender, OnboardingData } from '../../../types/onboarding'
import { toIsoDate } from '../../../utils/date'
import { onboardingFormSchema } from '../../../shared/validation/formSchemas'

type Options = {
  defaultName: string
  completeOnboarding: (data: OnboardingData) => Promise<void>
}

export function useOnboardingForm({
  defaultName,
  completeOnboarding,
}: Options) {
  const [nickname, setNickname] = useState('')
  const [firstName, setFirstName] = useState(defaultName)
  const [lastName, setLastName] = useState('')
  const [birthDate, setBirthDate] = useState<Date | null>(null)
  const [gender, setGender] = useState<Gender | null>(null)
  const [schoolQuery, setSchoolQuery] = useState('')
  const [cityQuery, setCityQuery] = useState('')
  const [schools, setSchools] = useState<School[]>([])
  const [cities, setCities] = useState<DistrictCity[]>([])
  const [school, setSchool] = useState<School | null>(null)
  const [city, setCity] = useState<DistrictCity | null>(null)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (school || schoolQuery.trim().length < 2) {
      setSchools([])
      return
    }

    const timeout = setTimeout(() => {
      void searchSchools(schoolQuery)
        .then(setSchools)
        .catch(() => setSchools([]))
    }, 300)

    return () => clearTimeout(timeout)
  }, [schoolQuery, school])

  useEffect(() => {
    if (city || !cityQuery.trim()) {
      setCities([])
      return
    }

    const timeout = setTimeout(() => {
      void searchDistrictCities(cityQuery)
        .then(setCities)
        .catch(() => setCities([]))
    }, 300)

    return () => clearTimeout(timeout)
  }, [cityQuery, city])

  const submit = async () => {
    const result = onboardingFormSchema.safeParse({
      nickname,
      firstName,
      lastName,
      birthDate,
      gender,
      school,
      city,
    })
    if (!result.success) {
      setError('Vyplň všetky údaje a zvoľ školu a mesto zo zoznamu.')
      return
    }

    setBusy(true)
    setError('')

    try {
      await completeOnboarding({
        nickname: result.data.nickname,
        first_name: result.data.firstName,
        last_name: result.data.lastName,
        birth_date: toIsoDate(result.data.birthDate),
        gender: result.data.gender,
        school_code: result.data.school.code,
        district_city: result.data.city.name,
      })
    } catch {
      setError('Údaje sa nepodarilo uložiť.')
    } finally {
      setBusy(false)
    }
  }

  return {
    nickname,
    setNickname,
    firstName,
    setFirstName,
    lastName,
    setLastName,
    birthDate,
    setBirthDate,
    gender,
    setGender,
    schoolQuery,
    setSchoolQuery,
    cityQuery,
    setCityQuery,
    schools,
    cities,
    school,
    setSchool,
    city,
    setCity,
    showDatePicker,
    setShowDatePicker,
    busy,
    error,
    submit,
  }
}
