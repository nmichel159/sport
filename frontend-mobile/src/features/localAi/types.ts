import type { EventType } from '../../types/domain'
import type { EventCategoryDraft } from '../organizations/eventFormOptions'

export type AssistantOption = {
  value: string
  label: string
  aliases?: string[]
}

export type AssistantFieldContext = {
  id: string
  label: string
  control: 'text' | 'long_text' | 'single_select' | 'date' | 'time' | 'url' | 'collection'
  required: boolean
  description: string
  currentValue: unknown
  options?: AssistantOption[]
  itemFields?: AssistantFieldContext[]
}

export type AssistantCapability = {
  id: string
  description: string
  confirmation: 'none' | 'required'
}

/**
 * Portable description of whichever screen currently owns the voice mode.
 * Future screens can register their own fields and capabilities without
 * changing the model's general UI-planning instructions.
 */
export type AssistantScreenContext = {
  protocolVersion: 1
  screenId: string
  title: string
  purpose: string
  locale: string
  currentDate: string
  fields: AssistantFieldContext[]
  capabilities: AssistantCapability[]
  constraints: string[]
}

export type AssistantActionPlan<TAction> = {
  actions: TAction[]
}

export type AssistantHistoryTurn = {
  screenId: string
  instruction: string
  appliedTargets: string[]
}

export type EventFormAssistantSnapshot = {
  eventType: EventType
  name: string
  sport: string
  eventDate: string | null
  eventTime: string
  region: string
  city: string
  venue: string
  coverImageUrl: string
  description: string
  categories: EventCategoryDraft[]
  allowedSports: string[]
}

export type EventFormAssistantPatch = {
  eventType?: EventType
  name?: string
  sport?: string
  eventDate?: string
  eventTime?: string
  region?: string
  city?: string
  venue?: string
  coverImageUrl?: string
  description?: string
  categories?: EventCategoryDraft[]
}

export type EventFormAssistantAction = {
  type: 'update_event_form'
  patch: EventFormAssistantPatch
}

export type EventFormAssistantPlan = AssistantActionPlan<EventFormAssistantAction>

export type EventFormAssistantApplyResult = {
  appliedFields: string[]
  warnings: string[]
}
