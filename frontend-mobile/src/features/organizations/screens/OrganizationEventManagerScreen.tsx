import { useState } from 'react'
import { Text, View } from 'react-native'
import { teamStyles } from '../../../styles/teamStyles'
import type {
  ApiEvent,
  ApiOrganization,
  EventPayload,
} from '../../../types/domain'
import { CreateEventForm } from '../components/CreateEventForm'
import { OrganizationEventList } from '../components/OrganizationEventList'
import { OrganizationEventDetailScreen } from './OrganizationEventDetailScreen'

type Props = {
  organization: ApiOrganization
  onCreate: (payload: EventPayload) => Promise<void>
  onUpdate: (eventId: string, payload: EventPayload) => Promise<void>
  message: string
}

export function OrganizationEventManagerScreen({
  organization,
  onCreate,
  onUpdate,
  message,
}: Props) {
  const [openedEvent, setOpenedEvent] = useState<ApiEvent | null>(null)

  if (openedEvent) {
    return (
      <OrganizationEventDetailScreen
        event={openedEvent}
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
      <CreateEventForm onCreate={onCreate} message={message} />
    </>
  )
}
