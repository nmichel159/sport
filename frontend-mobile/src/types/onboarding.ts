export type Gender =
  | 'male'
  | 'female'
  | 'other'
  | 'prefer_not_to_say'

export type OnboardingData = {
  nickname: string
  first_name: string
  last_name: string
  birth_date: string
  gender: Gender
  school_code: string
  district_city: string
}

