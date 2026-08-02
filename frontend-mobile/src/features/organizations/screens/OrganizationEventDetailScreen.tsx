import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { teamStyles } from '../../../styles/teamStyles'
import { useAccentStyles } from '../../../theme/useAccentStyles'
import type {
  ApiEvent,
  AuthenticatedFetch,
  EventPayload,
} from '../../../types/domain'
import { EventEditForm } from '../components/EventEditForm'
import { EventManagementMenu } from '../components/EventManagementMenu'
import { TournamentPanel } from '../components/TournamentPanel'

type DetailSection = 'menu' | 'edit' | 'tournament'

type Props = {
  event: ApiEvent
  organizationId: string
  fetcher: AuthenticatedFetch
  onBack: () => void
  onSave: (eventId: string, payload: EventPayload) => Promise<void>
}

export function OrganizationEventDetailScreen({
  event,
  organizationId,
  fetcher,
  onBack,
  onSave,
}: Props) {
  const accent = useAccentStyles()
  const [section, setSection] = useState<DetailSection>('menu')
  const [name, setName] = useState(event.name)
  const [description, setDescription] = useState(event.description ?? '')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const save = async () => {
    if (
      !event.event_date ||
      !event.region ||
      !event.categories.length ||
      (event.event_type === 'TOURNAMENT' && !event.event_time)
    ) {
      setMessage(
        'Starší event nemá všetky nové povinné údaje. Vytvor ho cez nový formulár.',
      )
      return
    }
    setSaving(true)
    setMessage('')

    try {
      await onSave(event.id, {
        name,
        event_type: event.event_type,
        sport: event.sport,
        participation_type: event.participation_type,
        format_id: event.format_id,
        event_date: event.event_date,
        event_time: event.event_time,
        region: event.region,
        city_id: event.city_id,
        city: event.city,
        venue: event.venue,
        cover_image_url: event.cover_image_url,
        categories: event.categories.map(
          ({ age_group, team_format, gender_category, fee, capacity }) => ({
            age_group,
            team_format,
            gender_category,
            fee,
            capacity,
          }),
        ),
        description,
      })
      setMessage('Základné údaje sú uložené.')
    } catch {
      setMessage('Zmeny sa nepodarilo uložiť.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Pressable onPress={onBack}>
        <Text style={[teamStyles.back, accent.accentText]}>
          ← Späť na eventy organizácie
        </Text>
      </Pressable>
      <View style={teamStyles.card}>
        <View style={teamStyles.info}>
          <Text style={teamStyles.title}>{event.name}</Text>
          <Text style={teamStyles.muted}>
            {event.sport} · {event.event_date} · {event.location}
          </Text>
        </View>
      </View>

      {section === 'menu' ? (
        <EventManagementMenu
          onEdit={() => setSection('edit')}
          onOpenTournament={() => setSection('tournament')}
        />
      ) : section === 'edit' ? (
        <EventEditForm
          name={name}
          description={description}
          saving={saving}
          message={message}
          onNameChange={setName}
          onDescriptionChange={setDescription}
          onSave={() => void save()}
          onBack={() => setSection('menu')}
        />
      ) : (
        <TournamentPanel
          event={event}
          organizationId={organizationId}
          fetcher={fetcher}
          onBack={() => setSection('menu')}
        />
      )}
    </>
  )
}
