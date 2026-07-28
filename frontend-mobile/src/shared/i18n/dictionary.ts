export const dictionary = {
  sk: {
    subtitle: 'Tvoje miesto pre športové tímy a turnaje.',
    google: 'Pokračovať cez Google',
    loading: 'Overujeme prihlásenie…',
    error: 'Prihlásenie sa nepodarilo.',
  },
  en: {
    subtitle: 'Your place for sports teams and tournaments.',
    google: 'Continue with Google',
    loading: 'Checking sign-in…',
    error: 'Sign-in failed.',
  },
} as const

export type Language = keyof typeof dictionary
export type Translation = {
  [Key in keyof (typeof dictionary)['sk']]: string
}
