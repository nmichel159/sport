import { Pressable, Text, View } from 'react-native'
import { PlaceholderTab } from '../../../components/PlaceholderTab'
import { teamStyles } from '../../../styles/teamStyles'
import type { ApiEvent } from '../../../types/domain'

type Props = {
  events: ApiEvent[]
  onOpen: (event: ApiEvent) => void
  emptyTitle: string
  emptyDescription: string
}

export function EventList({
  events,
  onOpen,
  emptyTitle,
  emptyDescription,
}: Props) {
  if (!events.length) {
    return (
      <PlaceholderTab
        icon="⌕"
        title={emptyTitle}
        description={emptyDescription}
      />
    )
  }

  return (
    <View style={teamStyles.section}>
      {events.map((event) => (
        <Pressable
          key={event.id}
          style={teamStyles.card}
          onPress={() => onOpen(event)}
        >
          <View style={[teamStyles.badge, { backgroundColor: '#ffd400' }]}>
            <Text style={teamStyles.badgeText}>
              {event.sport.slice(0, 1).toUpperCase()}
            </Text>
          </View>
          <View style={teamStyles.info}>
            <Text style={teamStyles.title}>{event.name}</Text>
            <Text style={teamStyles.muted}>
              {event.sport} ·{' '}
              {event.participation_type === 'TEAM'
                ? 'Tímový'
                : 'Individuálny'}
            </Text>
            <Text style={teamStyles.muted}>
              {event.event_date ?? 'Termín sa doplní'}
              {event.location ? ` · ${event.location}` : ''}
            </Text>
          </View>
          <Text style={teamStyles.buttonText}>›</Text>
        </Pressable>
      ))}
    </View>
  )
}

