import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { OrganizationManagerScreen } from '../../organizations/screens/OrganizationManagerScreen'
import { eventTabStyles } from '../../../styles/eventTabStyles'
import type {
  ApiEvent,
  ApiOrganization,
  ApiTeam,
  AuthenticatedFetch,
} from '../../../types/domain'
import { EventList } from '../components/EventList'
import { EventDetailScreen } from './EventDetailScreen'
import { useTheme } from '../../../theme/ThemeContext'

type EventSection = 'mine' | 'discover' | 'organization'

const tabs: ReadonlyArray<{ key: EventSection; label: string }> = [
  { key: 'mine', label: 'Moje eventy' },
  { key: 'discover', label: 'Objavovať' },
  { key: 'organization', label: 'Organizácia' },
]

type Props = {
  organizations: ApiOrganization[]
  setOrganizations: React.Dispatch<React.SetStateAction<ApiOrganization[]>>
  events: ApiEvent[]
  setEvents: React.Dispatch<React.SetStateAction<ApiEvent[]>>
  teams: ApiTeam[]
  userId: string
  fetcher: AuthenticatedFetch
}

export function EventsHubScreen({
  organizations,
  setOrganizations,
  events,
  setEvents,
  teams,
  userId,
  fetcher,
}: Props) {
  const { theme } = useTheme()
  const [section, setSection] = useState<EventSection>('discover')
  const [active, setActive] = useState<ApiEvent | null>(null)
  const [message, setMessage] = useState('')

  const register = async (event: ApiEvent, teamId?: string) => {
    try {
      const response = await fetcher(
        `/organizations/events/${event.id}/registrations`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ team_id: teamId ?? null }),
        },
      )
      if (!response.ok) throw Error('EVENT_REGISTRATION_FAILED')

      const changed = (await response.json()) as ApiEvent
      setEvents((current) =>
        current.map((item) => (item.id === changed.id ? changed : item)),
      )
      setActive(changed)
      setMessage('Prihlásenie je potvrdené.')
    } catch {
      setMessage(
        'Prihlásenie sa nepodarilo uložiť alebo už existuje.',
      )
    }
  }

  const ownTeamIds = new Set(
    teams
      .filter((team) => team.owner_user_id === userId)
      .map((team) => team.id),
  )
  const myEvents = events.filter((event) =>
    event.registrations.some(
      (registration) =>
        registration.user_id === userId ||
        (registration.team_id !== null &&
          ownTeamIds.has(registration.team_id)),
    ),
  )

  if (active) {
    return (
      <EventDetailScreen
        event={active}
        teams={teams.filter((team) => team.owner_user_id === userId)}
        userId={userId}
        fetcher={fetcher}
        onBack={() => {
          setActive(null)
          setMessage('')
        }}
        onRegister={register}
        message={message}
      />
    )
  }

  return (
    <>
      <View style={eventTabStyles.tabs}>
        {tabs.map((item) => (
          <Pressable
            key={item.key}
            onPress={() => setSection(item.key)}
            style={[
              eventTabStyles.tab,
              section === item.key && eventTabStyles.tabActive,
              section === item.key && { backgroundColor: theme.primary },
            ]}
          >
            <Text
              style={[
                eventTabStyles.label,
                section === item.key && eventTabStyles.labelActive,
                section === item.key && { color: theme.onPrimary },
              ]}
              numberOfLines={1}
            >
              {item.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {section === 'organization' ? (
        <OrganizationManagerScreen
          organizations={organizations}
          setOrganizations={setOrganizations}
          fetcher={fetcher}
        />
      ) : (
        <EventList
          events={section === 'mine' ? myEvents : events}
          onOpen={setActive}
          emptyTitle={
            section === 'mine'
              ? 'Zatiaľ nemáš eventy'
              : 'Zatiaľ bez eventov'
          }
          emptyDescription={
            section === 'mine'
              ? 'Po prihlásení na event ho nájdeš tu.'
              : 'Nové eventy sa tu zobrazia hneď po vytvorení organizátorom.'
          }
        />
      )}
    </>
  )
}
