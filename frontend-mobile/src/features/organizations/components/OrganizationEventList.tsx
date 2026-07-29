import { Text, View } from 'react-native'
import { EventList } from '../../events/components/EventList'
import { teamStyles } from '../../../styles/teamStyles'
import type { ApiEvent } from '../../../types/domain'

type Props = {
  events: ApiEvent[]
  onOpen: (event: ApiEvent) => void
}

export function OrganizationEventList({ events, onOpen }: Props) {
  return (
    <View>
      <Text style={teamStyles.sectionTitle}>
        VYTVORENÉ EVENTY ({events.length})
      </Text>
      <EventList
        events={events}
        onOpen={onOpen}
        emptyTitle="Zatiaľ bez eventov"
        emptyDescription="Prvý event vytvoríš formulárom nižšie."
      />
    </View>
  )
}
