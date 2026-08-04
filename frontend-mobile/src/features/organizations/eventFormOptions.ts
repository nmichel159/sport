export const EVENT_TYPES = [
  { value: 'TOURNAMENT', label: 'Turnaj' },
  { value: 'LEAGUE', label: 'Liga' },
] as const

// Single source of truth for participation. Event creation derives this from
// the selected sport, so organizers never have to classify a sport manually.
const INDIVIDUAL_SPORTS = new Set([
  'Beh',
  'Bedminton',
  'Tenis',
  'Stolný tenis',
  'Pickleball',
])

export function participationTypeForSport(sport: string) {
  return INDIVIDUAL_SPORTS.has(sport) ? 'INDIVIDUAL' as const : 'TEAM' as const
}

export const AGE_GROUPS = [
  { value: 'kids', label: 'Kids', hint: '8–10 rokov' },
  { value: 'junior', label: 'Junior', hint: '11–14 rokov' },
  { value: 'open', label: 'Open', hint: '15+ rokov' },
  { value: 'veterani', label: 'Veteráni', hint: '' },
] as const

export const TEAM_FORMATS = [
  { value: '1v1', label: '1 vs 1' },
  { value: '2v2', label: '2 vs 2' },
  { value: '3v3', label: '3 vs 3' },
  { value: '3v3g', label: '3 vs 3 G' },
  { value: '4v4', label: '4 vs 4' },
  { value: '5v5', label: '5 vs 5' },
] as const

export const GENDER_CATEGORIES = [
  { value: 'muzi', label: 'Muži' },
  { value: 'zeny', label: 'Ženy' },
  { value: 'mix', label: 'MIX' },
] as const

export const SLOVAK_REGIONS = [
  'Celé Slovensko',
  'Bratislavský kraj',
  'Trnavský kraj',
  'Trenčiansky kraj',
  'Nitriansky kraj',
  'Žilinský kraj',
  'Banskobystrický kraj',
  'Prešovský kraj',
  'Košický kraj',
] as const

export const NATIONWIDE_REGIONS = new Set([
  'Celé Slovensko',
  'Celé Česko',
])

const DISTRICTS_BY_REGION: Record<string, ReadonlySet<string>> = {
  'Bratislavský kraj': new Set([
    'Bratislava I',
    'Bratislava II',
    'Bratislava III',
    'Bratislava IV',
    'Bratislava V',
    'Malacky',
    'Pezinok',
    'Senec',
  ]),
  'Trnavský kraj': new Set([
    'Dunajská Streda',
    'Galanta',
    'Hlohovec',
    'Piešťany',
    'Senica',
    'Skalica',
    'Trnava',
  ]),
  'Trenčiansky kraj': new Set([
    'Bánovce nad Bebravou',
    'Ilava',
    'Myjava',
    'Nové Mesto nad Váhom',
    'Partizánske',
    'Považská Bystrica',
    'Prievidza',
    'Púchov',
    'Trenčín',
  ]),
  'Nitriansky kraj': new Set([
    'Komárno',
    'Levice',
    'Nitra',
    'Nové Zámky',
    'Šaľa',
    'Topoľčany',
    'Zlaté Moravce',
  ]),
  'Žilinský kraj': new Set([
    'Bytča',
    'Čadca',
    'Dolný Kubín',
    'Kysucké Nové Mesto',
    'Liptovský Mikuláš',
    'Martin',
    'Námestovo',
    'Ružomberok',
    'Turčianske Teplice',
    'Tvrdošín',
    'Žilina',
  ]),
  'Banskobystrický kraj': new Set([
    'Banská Bystrica',
    'Banská Štiavnica',
    'Brezno',
    'Detva',
    'Krupina',
    'Lučenec',
    'Poltár',
    'Revúca',
    'Rimavská Sobota',
    'Veľký Krtíš',
    'Zvolen',
    'Žarnovica',
    'Žiar nad Hronom',
  ]),
  'Prešovský kraj': new Set([
    'Bardejov',
    'Humenné',
    'Kežmarok',
    'Levoča',
    'Medzilaborce',
    'Poprad',
    'Prešov',
    'Sabinov',
    'Snina',
    'Stará Ľubovňa',
    'Stropkov',
    'Svidník',
    'Vranov nad Topľou',
  ]),
  'Košický kraj': new Set([
    'Gelnica',
    'Košice I',
    'Košice II',
    'Košice III',
    'Košice IV',
    'Košice-okolie',
    'Michalovce',
    'Rožňava',
    'Sobrance',
    'Spišská Nová Ves',
    'Trebišov',
  ]),
}

export function districtBelongsToRegion(
  district: string,
  region: string,
) {
  return DISTRICTS_BY_REGION[region]?.has(district) ?? false
}

export type EventCategoryDraft = {
  age_group: '' | (typeof AGE_GROUPS)[number]['value']
  team_format: '' | (typeof TEAM_FORMATS)[number]['value']
  gender_category: '' | (typeof GENDER_CATEGORIES)[number]['value']
  fee: string
  capacity: string
}

export const emptyCategory = (): EventCategoryDraft => ({
  age_group: '',
  team_format: '',
  gender_category: '',
  fee: '',
  capacity: '',
})
