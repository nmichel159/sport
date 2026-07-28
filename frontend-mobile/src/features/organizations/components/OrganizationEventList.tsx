import { Pressable, Text, View } from 'react-native'
import { teamStyles } from '../../../styles/teamStyles'
import type { ApiEvent } from '../../../types/domain'

type Props = {
  events: ApiEvent[]
  onOpen: (event: ApiEvent) => void
}

export function OrganizationEventList({ events, onOpen }: Props) {
  return (
    <>
      <Text style={teamStyles.sectionTitle}>
        VYTVORENÉ EVENTY ({events.length})
      </Text>
      {events.length ? (
        events.map((event) => (
          <Pressable
            style={teamStyles.member}
            key={event.id}
            onPress={() => onOpen(event)}
          >
            <View style={teamStyles.info}>
              <Text style={teamStyles.title}>{event.name}</Text>
              <Text style={teamStyles.muted}>
                {event.sport} ·{' '}
                {event.participation_type === 'TEAM'
                  ? 'Tímový'
                  : 'Jednotlivci'}
              </Text>
              <Text style={teamStyles.muted}>
                {event.event_date ?? 'Termín sa doplní'}
                {event.location ? ` · ${event.location}` : ''}
              </Text>
            </View>
            <Text style={teamStyles.buttonText}>›</Text>
          </Pressable>
        ))
      ) : (
        <Text style={teamStyles.muted}>
          Zatiaľ si nevytvoril žiadny event.
        </Text>
      )}
    </>
  )
}

