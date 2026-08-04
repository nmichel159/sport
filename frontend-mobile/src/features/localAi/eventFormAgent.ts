import { z } from 'zod'
import {
  AGE_GROUPS,
  GENDER_CATEGORIES,
  SLOVAK_REGIONS,
  TEAM_FORMATS,
} from '../organizations/eventFormOptions'
import type {
  AssistantHistoryTurn,
  AssistantOption,
  AssistantScreenContext,
  EventFormAssistantPatch,
  EventFormAssistantPlan,
  EventFormAssistantSnapshot,
} from './types'

const assistantCategorySchema = z.object({
  age_group: z.enum(['kids', 'junior', 'open', 'veterani', '']),
  team_format: z.enum(['1v1', '2v2', '3v3', '3v3g', '4v4', '5v5', '']),
  gender_category: z.enum(['muzi', 'zeny', 'mix', '']),
  fee: z.string(),
  capacity: z.string(),
}).strict()

const assistantPatchSchema = z.object({
  eventType: z.enum(['TOURNAMENT', 'LEAGUE']).optional(),
  name: z.string().max(180).optional(),
  sport: z.string().optional(),
  eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  eventTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
  region: z.string().optional(),
  city: z.string().optional(),
  venue: z.string().max(240).optional(),
  coverImageUrl: z.string().max(1000).optional(),
  description: z.string().max(2000).optional(),
  categories: z.array(assistantCategorySchema).max(12).optional(),
}).strict()

const assistantPlanSchema = z.object({
  actions: z.array(z.object({
    type: z.literal('update_event_form'),
    patch: assistantPatchSchema,
  }).strict()).max(1),
}).strict()

const SPORT_ALIASES: Record<string, string[]> = {
  Futbal: ['futbalový', 'football', 'soccer'],
  Florbal: ['florbalový', 'floorball'],
  'Basketbal 3x3': ['basketbal', 'basketball', 'basket', 'basketbalový', 'basketballový', 'basketball 3x3', '3x3 basketball'],
  Volejbal: ['volejbalový', 'volleyball', 'volley'],
  Beh: ['behanie', 'running', 'run'],
  Bedminton: ['badminton'],
  Tenis: ['tennis'],
  'Stolný tenis': ['table tennis', 'ping pong', 'pingpong'],
  '3x3sportgames': ['3x3 sport games', 'sport games'],
}

const EVENT_TYPE_OPTIONS: AssistantOption[] = [
  { value: 'TOURNAMENT', label: 'Turnaj', aliases: ['turnaj', 'tournament', 'pohár'] },
  { value: 'LEAGUE', label: 'Liga', aliases: ['liga', 'league', 'season'] },
]

const REGION_ALIASES: Record<string, string[]> = {
  'Celé Slovensko': ['slovensko', 'celoslovensky', 'nationwide slovakia'],
  'Bratislavský kraj': ['bratislavsky', 'bratislava region'],
  'Trnavský kraj': ['trnavsky', 'trnava region'],
  'Trenčiansky kraj': ['trenciansky', 'trencin region'],
  'Nitriansky kraj': ['nitriansky', 'nitra region'],
  'Žilinský kraj': ['zilinsky', 'zilina region'],
  'Banskobystrický kraj': ['banskobystricky', 'banska bystrica region'],
  'Prešovský kraj': ['presovsky', 'presov region'],
  'Košický kraj': ['kosicky', 'kosice region'],
}

const AGE_ALIASES: Record<string, string[]> = {
  kids: ['deti', 'detská', 'detsky', 'children'],
  junior: ['juniori', 'juniorská', 'juniorsky', 'youth'],
  open: ['otvorená', 'dospelí', 'adult'],
  veterani: ['veteráni', 'veteránska', 'masters'],
}

const GENDER_ALIASES: Record<string, string[]> = {
  muzi: ['muži', 'mužská', 'men'],
  zeny: ['ženy', 'ženská', 'women'],
  mix: ['zmiešaná', 'mixed'],
}

function option(value: string, label = value, aliases: string[] = []): AssistantOption {
  return { value, label, aliases: [...new Set([value, label, ...aliases])] }
}

function sportOptions(allowedSports: string[]) {
  return allowedSports.map((sport) => option(sport, sport, SPORT_ALIASES[sport]))
}

function regionOptions() {
  return SLOVAK_REGIONS.map((region) => option(region, region, REGION_ALIASES[region]))
}

export function buildEventFormScreenContext(
  snapshot: EventFormAssistantSnapshot,
  currentDate: string,
): AssistantScreenContext {
  return {
    protocolVersion: 1,
    screenId: 'event.create',
    title: 'Vytvoriť event',
    purpose: 'Create a sports tournament or league by editing the currently visible form.',
    locale: 'sk-SK; spoken input may also contain Czech or English words',
    currentDate,
    capabilities: [
      {
        id: 'update_event_form',
        description: 'Update one or more visible form fields. This never submits or creates the event.',
        confirmation: 'none',
      },
    ],
    constraints: [
      'Preserve every field the user did not ask to change.',
      'A short instruction containing only an option name is a valid request to select that option.',
      'Resolve translations, grammatical forms, and common synonyms to the exact option value exposed by the field.',
      'Tolerate obvious speech-recognition or spelling mistakes when the intended value is still unambiguous; normalize dates, times, cities, and option values to the required format.',
      'For a user-provided event name, correct only an unmistakable transcription typo and otherwise preserve the wording.',
      'Infer values that are unambiguous from ordinary context, such as event type from “turnaj” or a region from a well-known Slovak city.',
      'Do not invent a name, date, time, fee, capacity, venue, URL, or description that the user did not provide.',
      'Never submit the form. Submission is a separate confirmation-required capability and is not available on this screen.',
      'When editing categories, return the complete category list after the requested changes and preserve unrelated values in existing categories.',
      'An incomplete category is allowed while the user is still filling the form; use an empty string only for a category value that remains unknown.',
    ],
    fields: [
      {
        id: 'eventType', label: 'Typ eventu', control: 'single_select', required: true,
        description: 'Whether this event is a one-off tournament or a seasonal league.',
        currentValue: snapshot.eventType, options: EVENT_TYPE_OPTIONS,
      },
      {
        id: 'name', label: 'Názov', control: 'text', required: true,
        description: 'User-provided public name of the tournament or league.', currentValue: snapshot.name,
      },
      {
        id: 'sport', label: 'Šport', control: 'single_select', required: true,
        description: 'The sport played at the event. Participation type is derived automatically.',
        currentValue: snapshot.sport, options: sportOptions(snapshot.allowedSports),
      },
      {
        id: 'eventDate', label: 'Dátum', control: 'date', required: true,
        description: 'Event date or league start date, encoded as YYYY-MM-DD.', currentValue: snapshot.eventDate,
      },
      {
        id: 'eventTime', label: 'Čas', control: 'time', required: snapshot.eventType === 'TOURNAMENT',
        description: 'Tournament start time in 24-hour HH:MM format. A league does not require it.', currentValue: snapshot.eventTime,
      },
      {
        id: 'region', label: 'Kraj', control: 'single_select', required: true,
        description: 'Slovak region or the nationwide option.', currentValue: snapshot.region, options: regionOptions(),
      },
      {
        id: 'city', label: 'Mesto', control: 'text', required: snapshot.region !== 'Celé Slovensko',
        description: 'Slovak city resolved later against the city catalogue.', currentValue: snapshot.city,
      },
      {
        id: 'venue', label: 'Presné miesto konania', control: 'text', required: false,
        description: 'Venue, sports hall, school, field, or more precise address.', currentValue: snapshot.venue,
      },
      {
        id: 'coverImageUrl', label: 'Titulovka', control: 'url', required: false,
        description: 'Direct URL supplied by the user for the cover image.', currentValue: snapshot.coverImageUrl,
      },
      {
        id: 'categories', label: 'Kategórie', control: 'collection', required: false,
        description: 'Participant groups. Each item has age_group, team_format, gender_category, fee, and capacity.',
        currentValue: snapshot.categories,
        itemFields: [
          {
            id: 'age_group', label: 'Veková kategória', control: 'single_select', required: true,
            description: 'Age group for this category.', currentValue: null,
            options: AGE_GROUPS.map(({ value, label }) => option(value, label, AGE_ALIASES[value])),
          },
          {
            id: 'team_format', label: 'Formát', control: 'single_select', required: true,
            description: 'Number and format of participants on each side.', currentValue: null,
            options: TEAM_FORMATS.map(({ value, label }) => option(value, label, [label.replace('vs', 'proti')])),
          },
          {
            id: 'gender_category', label: 'Pohlavie', control: 'single_select', required: true,
            description: 'Gender category.', currentValue: null,
            options: GENDER_CATEGORIES.map(({ value, label }) => option(value, label, GENDER_ALIASES[value])),
          },
          {
            id: 'fee', label: 'Štartovné', control: 'text', required: true,
            description: 'Non-negative entry fee in euros, encoded as a numeric string.', currentValue: null,
          },
          {
            id: 'capacity', label: 'Kapacita', control: 'text', required: true,
            description: 'Positive maximum number of teams or players, encoded as an integer string.', currentValue: null,
          },
        ],
      },
      {
        id: 'description', label: 'Popis a pravidlá', control: 'long_text', required: false,
        description: 'Public description or rules explicitly dictated by the user.', currentValue: snapshot.description,
      },
    ],
  }
}

export function eventAssistantJsonSchema(allowedSports: string[]) {
  const patchSchema = {
    type: 'object',
    additionalProperties: false,
    properties: {
      eventType: { type: 'string', enum: ['TOURNAMENT', 'LEAGUE'] },
      name: { type: 'string', maxLength: 180 },
      sport: allowedSports.length ? { type: 'string', enum: allowedSports } : { type: 'string' },
      eventDate: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
      eventTime: { type: 'string', pattern: '^([01]\\d|2[0-3]):[0-5]\\d$' },
      region: { type: 'string', enum: SLOVAK_REGIONS },
      city: { type: 'string' },
      venue: { type: 'string', maxLength: 240 },
      coverImageUrl: { type: 'string', maxLength: 1000 },
      description: { type: 'string', maxLength: 2000 },
      categories: {
        type: 'array', maxItems: 12,
        items: {
          type: 'object', additionalProperties: false,
          required: ['age_group', 'team_format', 'gender_category', 'fee', 'capacity'],
          properties: {
            age_group: { type: 'string', enum: ['kids', 'junior', 'open', 'veterani', ''] },
            team_format: { type: 'string', enum: ['1v1', '2v2', '3v3', '3v3g', '4v4', '5v5', ''] },
            gender_category: { type: 'string', enum: ['muzi', 'zeny', 'mix', ''] },
            fee: { type: 'string' },
            capacity: { type: 'string' },
          },
        },
      },
    },
  }

  return {
    type: 'object',
    additionalProperties: false,
    required: ['actions'],
    properties: {
      actions: {
        type: 'array', maxItems: 1,
        items: {
          type: 'object', additionalProperties: false,
          required: ['type', 'patch'],
          properties: {
            type: { type: 'string', enum: ['update_event_form'] },
            patch: patchSchema,
          },
        },
      },
    },
  }
}

export function buildEventAgentPrompt(
  instruction: string,
  screen: AssistantScreenContext,
  history: AssistantHistoryTurn[],
) {
  return [
    'You are a local UI action planner. Understand the user’s goal and operate only through capabilities exposed by the current screen context.',
    'Deliberate internally before producing the action plan. Consider the complete instruction, current field values, option meanings, constraints, and recent turns together.',
    'Return only the structured JSON action plan required by the response schema. Do not chat and do not expose reasoning.',
    'Prefer a useful, high-confidence partial update over returning no action. Ordinary wording, a translated option, or a single spoken option name is sufficient when its meaning is clear.',
    'Do not require the user to quote field labels. Map their intent to fields and exact option values using semantics and aliases.',
    'Omit fields that were not requested. Never erase an existing field unless the user clearly asks to clear it.',
    'Before returning, verify that every clear part of the instruction has a corresponding patch field and every select value exactly matches an exposed option.',
    'Protocol example for the general option-selection rule: “basketball” -> {"actions":[{"type":"update_event_form","patch":{"sport":"Basketbal 3x3"}}]}. The same semantic rule applies to every select field and its aliases.',
    'Protocol example for combined edits: “Zmeň to na ligu a daj volejbal” -> {"actions":[{"type":"update_event_form","patch":{"eventType":"LEAGUE","sport":"Volejbal"}}]}.',
    'Example of multi-field reasoning: a user may dictate type, name, sport, date, time, place, and several categories in one natural sentence; apply every clear part in one update.',
    `CURRENT_SCREEN_CONTEXT=${JSON.stringify(screen)}`,
    `RECENT_SESSION_TURNS=${JSON.stringify(history)}`,
    `USER_INSTRUCTION=${JSON.stringify(instruction)}`,
  ].join('\n')
}

export function parseEventAssistantPlan(output: string): EventFormAssistantPlan {
  const text = output.trim()
  try {
    return assistantPlanSchema.parse(JSON.parse(text))
  } catch {
    const firstBrace = text.indexOf('{')
    const lastBrace = text.lastIndexOf('}')
    if (firstBrace < 0 || lastBrace <= firstBrace) throw Error('INVALID_MODEL_PLAN')
    return assistantPlanSchema.parse(JSON.parse(text.slice(firstBrace, lastBrace + 1)))
  }
}

function normalizeSpokenValue(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('sk-SK')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function isNegatedPrefix(prefix: string) {
  return /(?:^| )(?:nie|nechcem|bez|not|dont|do not)\s*$/.test(prefix)
}

function editDistance(first: string, second: string) {
  const previous = Array.from({ length: second.length + 1 }, (_, index) => index)
  for (let firstIndex = 1; firstIndex <= first.length; firstIndex += 1) {
    const current = [firstIndex]
    for (let secondIndex = 1; secondIndex <= second.length; secondIndex += 1) {
      current[secondIndex] = Math.min(
        current[secondIndex - 1] + 1,
        previous[secondIndex] + 1,
        previous[secondIndex - 1] + (first[firstIndex - 1] === second[secondIndex - 1] ? 0 : 1),
      )
    }
    previous.splice(0, previous.length, ...current)
  }
  return previous[second.length]
}

function approximateAliasIndex(instruction: string, alias: string) {
  const words = [...instruction.matchAll(/\S+/g)]
  const aliasWordCount = alias.split(' ').length
  const threshold = alias.length >= 6 ? 2 : alias.length >= 4 ? 1 : 0
  let lastIndex = -1

  for (let index = 0; index <= words.length - aliasWordCount; index += 1) {
    const candidateWords = words.slice(index, index + aliasWordCount)
    const candidate = candidateWords.map((match) => match[0]).join(' ')
    if (Math.abs(candidate.length - alias.length) > threshold) continue
    if (editDistance(candidate, alias) <= threshold) {
      lastIndex = candidateWords[0].index ?? -1
    }
  }
  return lastIndex
}

function resolveLastSpokenOption(instruction: string, options: AssistantOption[]) {
  const normalized = normalizeSpokenValue(instruction)
  const aliases = options.flatMap((item) =>
    (item.aliases?.length ? item.aliases : [item.value, item.label]).map((alias) => {
      const normalizedAlias = normalizeSpokenValue(alias)
      const index = normalized.lastIndexOf(normalizedAlias)
      return { value: item.value, alias: normalizedAlias, index, length: normalizedAlias.length }
    }),
  )
  const exactMatches = aliases.filter(({ index }) => index >= 0)
    .filter(({ index, length }) => {
      const before = index === 0 ? '' : normalized[index - 1]
      const afterIndex = index + length
      const after = afterIndex >= normalized.length ? '' : normalized[afterIndex]
      if ((before && /[a-z0-9]/.test(before)) || (after && /[a-z0-9]/.test(after))) return false
      return !isNegatedPrefix(normalized.slice(Math.max(0, index - 18), index))
    })
    .sort((first, second) => second.index - first.index || second.length - first.length)

  if (exactMatches[0]) return exactMatches[0].value

  const approximateMatches = aliases.map((item) => ({
    ...item,
    index: approximateAliasIndex(normalized, item.alias),
  })).filter(({ index }) => index >= 0)
    .filter(({ index }) => !isNegatedPrefix(normalized.slice(Math.max(0, index - 18), index)))
    .sort((first, second) => second.index - first.index || second.length - first.length)

  return approximateMatches[0]?.value
}

export function groundEventAssistantPlan(
  instruction: string,
  snapshot: EventFormAssistantSnapshot,
  plan: EventFormAssistantPlan,
): EventFormAssistantPatch {
  const patch = { ...(plan.actions[0]?.patch ?? {}) }
  const context = buildEventFormScreenContext(snapshot, '')

  if (!patch.sport) {
    const sportField = context.fields.find((field) => field.id === 'sport')
    const groundedSport = resolveLastSpokenOption(instruction, sportField?.options ?? [])
    if (groundedSport) patch.sport = groundedSport
  }
  if (!patch.eventType) {
    const typeField = context.fields.find((field) => field.id === 'eventType')
    const groundedType = resolveLastSpokenOption(instruction, typeField?.options ?? [])
    if (groundedType === 'TOURNAMENT' || groundedType === 'LEAGUE') patch.eventType = groundedType
  }
  if (!patch.region) {
    const regionField = context.fields.find((field) => field.id === 'region')
    const groundedRegion = resolveLastSpokenOption(instruction, regionField?.options ?? [])
    if (groundedRegion) patch.region = groundedRegion
  }

  if (patch.sport && !snapshot.allowedSports.includes(patch.sport)) delete patch.sport
  return assistantPatchSchema.parse(patch)
}
