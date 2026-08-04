import { useEffect, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { teamStyles } from '../../../styles/teamStyles'
import { useAccentStyles } from '../../../theme/useAccentStyles'
import type {
  ApiEvent,
  ApiOrganization,
  AuthenticatedFetch,
  EventPayload,
} from '../../../types/domain'
import { CreateEventModal } from '../components/CreateEventModal'
import { OrganizationEventList } from '../components/OrganizationEventList'
import { OrganizationEventDetailScreen } from './OrganizationEventDetailScreen'

type Props = {
  organization: ApiOrganization
  fetcher: AuthenticatedFetch
  onCreate: (payload: EventPayload) => Promise<void>
  onUpdate: (eventId: string, payload: EventPayload) => Promise<void>
  message: string
  createEventRequest?: number
}

export function OrganizationEventManagerScreen({
  organization,
  fetcher,
  onCreate,
  onUpdate,
  message,
  createEventRequest = 0,
}: Props) {
  const accent = useAccentStyles()
  const [openedEvent, setOpenedEvent] = useState<ApiEvent | null>(null)
  const [creatingEvent, setCreatingEvent] = useState(false)

  useEffect(() => {
    if (createEventRequest > 0) setCreatingEvent(true)
  }, [createEventRequest])

  if (openedEvent) {
    return (
      <OrganizationEventDetailScreen
        event={openedEvent}
        organizationId={organization.id}
        fetcher={fetcher}
        onBack={() => setOpenedEvent(null)}
        onSave={onUpdate}
      />
    )
  }

  return (
    <>
      <View style={teamStyles.card}>
        <View style={teamStyles.info}>
          <Text style={teamStyles.title}>{organization.name}</Text>
          <Text style={teamStyles.muted}>Eventy organizácie</Text>
        </View>
      </View>
      <OrganizationEventList
        events={organization.events}
        onOpen={setOpenedEvent}
      />
      <CreateEventModal
        visible={creatingEvent}
        onClose={() => setCreatingEvent(false)}
        onCreate={onCreate}
        fetcher={fetcher}
        message={message}
      />
    </>
  )
}
