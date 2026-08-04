import { Pressable, Text, View } from 'react-native'
import { toIsoDate } from '../../../utils/date'
import { useTheme } from '../../../theme/ThemeContext'
import type { ApiEvent } from '../../../types/domain'
import { homeTournamentStyles as styles } from '../../../styles/homeTournamentStyles'

function dateLabel(event: ApiEvent) {
  if (!event.event_date) return 'Termín sa doplní'
  const [year, month, day] = event.event_date.split('-')
  return `${day}.${month}.${year}${event.event_time ? ` · ${event.event_time.slice(0, 5)}` : ''}`
}

type TournamentListProps = {
  title: string
  events: ApiEvent[]
  past?: boolean
  onOpen: (event: ApiEvent) => void
}

function TournamentList({ title, events, past, onOpen }: TournamentListProps) {
  const { theme } = useTheme()

  return (
    <View style={styles.section}>
      <View style={styles.heading}>
        <Text style={styles.title}>{title}</Text>
        <Text style={[styles.count, { color: theme.primary }]}>{events.length}</Text>
      </View>
      {events.length ? events.slice(0, 4).map((event) => (
        <Pressable
          key={event.id}
          accessibilityRole="button"
          accessibilityLabel={`Otvoriť detail eventu ${event.name}`}
          onPress={() => onOpen(event)}
          style={({ pressed }) => [styles.card, pressed && { opacity: 0.76 }]}
        >
          <View style={[styles.dateBadge, { backgroundColor: past ? '#2a2d33' : theme.soft }]}>
            <Text style={[styles.dateBadgeText, { color: past ? '#aeb2b9' : theme.primary }]}>{event.event_date?.slice(8, 10) ?? '—'}</Text>
            <Text style={styles.month}>{event.event_date ? event.event_date.slice(5, 7) : ''}</Text>
          </View>
          <View style={styles.info}>
            <Text numberOfLines={1} style={styles.name}>{event.name}</Text>
            <Text numberOfLines={1} style={styles.meta}>{event.sport} · {dateLabel(event)}</Text>
            <Text numberOfLines={1} style={styles.meta}>{event.city ?? event.location ?? event.venue ?? 'Miesto sa doplní'}</Text>
          </View>
          <View style={[styles.status, { backgroundColor: past ? '#2a2d33' : theme.soft }]}>
            <Text style={[styles.statusText, { color: past ? '#aeb2b9' : theme.primary }]}>{past ? 'Odohrané' : 'Ideš'}</Text>
          </View>
        </Pressable>
      )) : (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>{past ? 'Ešte nemáš žiadny odohraný turnaj.' : 'Zatiaľ nie si prihlásený na žiadny turnaj.'}</Text>
        </View>
      )}
    </View>
  )
}

export function HomeTournamentLists({ events, onOpen }: { events: ApiEvent[]; onOpen: (event: ApiEvent) => void }) {
  const today = toIsoDate(new Date())
  const upcoming = events.filter((event) => !event.event_date || event.event_date >= today).sort((a, b) => (a.event_date ?? '9999').localeCompare(b.event_date ?? '9999'))
  const past = events.filter((event) => Boolean(event.event_date && event.event_date < today)).sort((a, b) => (b.event_date ?? '').localeCompare(a.event_date ?? ''))

  return <><TournamentList title="ČOSKORO HRÁŠ" events={upcoming} onOpen={onOpen} /><TournamentList title="ZÚČASTNIL SI SA" events={past} past onOpen={onOpen} /></>
}
