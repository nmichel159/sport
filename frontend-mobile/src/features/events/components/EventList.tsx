import { Image, Pressable, Text, View } from 'react-native'
import { getSportImage } from '../../../assets/sportImages'
import { PlaceholderTab } from '../../../components/PlaceholderTab'
import { eventCardStyles } from '../../../styles/eventTabStyles'
import { useTheme } from '../../../theme/ThemeContext'
import type { ApiEvent } from '../../../types/domain'

type Props = {
  events: ApiEvent[]
  onOpen: (event: ApiEvent) => void
  emptyTitle: string
  emptyDescription: string
}

function formatEventDate(value?: string | null) {
  if (!value) return 'Termín sa doplní'

  const date = new Date(`${value}T12:00:00`)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat('sk-SK', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

export function EventList({
  events,
  onOpen,
  emptyTitle,
  emptyDescription,
}: Props) {
  const { theme } = useTheme()
  if (!events.length) {
    return (
      <PlaceholderTab
        icon="◇"
        title={emptyTitle}
        description={emptyDescription}
      />
    )
  }

  return (
    <View style={eventCardStyles.grid}>
      {events.map((event) => {
        const sportImage = getSportImage(event.sport)

        return (
          <Pressable
          key={event.id}
          onPress={() => onOpen(event)}
          style={({ pressed }) => [
            eventCardStyles.card,
            pressed && eventCardStyles.cardPressed,
          ]}
          >
          {sportImage ? (
            <View
              style={[
                eventCardStyles.imagePlaceholder,
                { backgroundColor: theme.soft, borderBottomColor: theme.softBorder },
              ]}
            >
              <Image
                source={sportImage}
                accessibilityLabel={`${event.sport} lopta`}
                style={eventCardStyles.sportImage}
                resizeMode="contain"
              />
            </View>
          ) : (
            <View
              style={[
                eventCardStyles.imagePlaceholder,
                { backgroundColor: theme.soft, borderBottomColor: theme.softBorder },
              ]}
            >
              <View style={[eventCardStyles.sportMark, { backgroundColor: theme.primary }]}>
                <Text style={[eventCardStyles.sportMarkText, { color: theme.onPrimary }]}>
                  {event.sport.slice(0, 1).toUpperCase()}
                </Text>
              </View>
              <Text style={[eventCardStyles.imageHint, { color: theme.secondary }]}>FOTO EVENTU</Text>
              <Text style={[eventCardStyles.imageSport, { color: theme.secondary }]}>
                {event.sport.toUpperCase()}
              </Text>
            </View>
          )}

          <View style={eventCardStyles.body}>
            <Text style={eventCardStyles.type}>
              {event.participation_type === 'TEAM' ? 'TÍMOVÝ' : 'INDIVIDUÁLNY'}
            </Text>
            <Text style={eventCardStyles.title} numberOfLines={2}>
              {event.name}
            </Text>
            <Text style={eventCardStyles.description} numberOfLines={3}>
              {event.description ?? 'Otvor event pre všetky podrobnosti.'}
            </Text>
            <View style={eventCardStyles.meta}>
              <Text style={eventCardStyles.metaText} numberOfLines={1}>
                ◷ {formatEventDate(event.event_date)}
              </Text>
              <Text style={eventCardStyles.metaText} numberOfLines={1}>
                {event.location ? `⌖ ${event.location}` : '⌖ Miesto sa doplní'}
              </Text>
            </View>
          </View>
          </Pressable>
        )
      })}
    </View>
  )
}
