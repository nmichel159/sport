import { useCallback, useEffect, useMemo, useState } from 'react'
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
import { DiscoveryFilters, type DiscoveryFilterValue } from '../components/DiscoveryFilters'
import { loadSports } from '../../../services/catalogs'
import { SLOVAK_REGIONS } from '../../organizations/eventFormOptions'
import { EventDetailWindow } from '../../../components/EventDetailWindow'

type EventSection = 'mine' | 'discover' | 'organization'

const tabs: ReadonlyArray<{ key: EventSection; label: string }> = [
  { key: 'mine', label: 'Moje eventy' },
  { key: 'discover', label: 'Objavovať' },
  { key: 'organization', label: 'Organizácia' },
]

const ALL_SLOVAKIA_REGION = 'Celé Slovensko'

function normalizedRegion(value: string | null | undefined) {
  return (value ?? '').trim().normalize('NFC').toLocaleLowerCase('sk-SK')
}

export function matchesDiscoveryRegions(
  event: ApiEvent,
  selectedRegions: string[],
) {
  if (!selectedRegions.length) return true
  if (selectedRegions.some((region) => normalizedRegion(region) === normalizedRegion(ALL_SLOVAKIA_REGION))) {
    return true
  }
  const eventRegion = normalizedRegion(event.region)
  if (eventRegion === normalizedRegion(ALL_SLOVAKIA_REGION)) return true
  return selectedRegions.some((region) => normalizedRegion(region) === eventRegion)
}

type Props = {
  organizations: ApiOrganization[]
  setOrganizations: React.Dispatch<React.SetStateAction<ApiOrganization[]>>
  events: ApiEvent[]
  setEvents: React.Dispatch<React.SetStateAction<ApiEvent[]>>
  teams: ApiTeam[]
  userId: string
  fetcher: AuthenticatedFetch
  activeEvent?: ApiEvent | null
  onActiveEventChange?: (event: ApiEvent | null) => void
}

export function EventsHubScreen({
  organizations,
  setOrganizations,
  events,
  setEvents,
  teams,
  userId,
  fetcher,
  activeEvent,
  onActiveEventChange,
}: Props) {
  const { theme } = useTheme()
  const [section, setSection] = useState<EventSection>('discover')
  const [localActive, setLocalActive] = useState<ApiEvent | null>(null)
  const active = activeEvent === undefined ? localActive : activeEvent
  const setActive = (event: ApiEvent | null) => {
    if (onActiveEventChange) onActiveEventChange(event)
    else setLocalActive(event)
  }
  const [message, setMessage] = useState('')
  const [createEventRequest, setCreateEventRequest] = useState(0)
  const [discoveryFilters, setDiscoveryFilters] = useState<DiscoveryFilterValue>({ sports: [], regions: [] })
  const [catalogSports, setCatalogSports] = useState<string[]>([])
  const setFilters = useCallback((value: DiscoveryFilterValue) => setDiscoveryFilters(value), [])

  useEffect(() => {
    void loadSports().then((items) => setCatalogSports(items.map((item) => item.name))).catch(() => undefined)
  }, [])

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
  const eventSports = useMemo(() => [...new Set(events.map((event) => event.sport).filter(Boolean))].sort(), [events])
  const availableSports = catalogSports.length ? catalogSports : eventSports
  const availableRegions = Array.from(SLOVAK_REGIONS)
  const discoveredEvents = events.filter((event) =>
    (!discoveryFilters.sports.length || discoveryFilters.sports.includes(event.sport)) &&
    matchesDiscoveryRegions(event, discoveryFilters.regions),
  )

  return (
    <>
      <View style={eventTabStyles.topActions}>
          <Text style={eventTabStyles.topActionTitle}>Eventy</Text>
          <View style={eventTabStyles.actionButtons}>
          {section === 'discover' ? <DiscoveryFilters sports={availableSports} regions={availableRegions} value={discoveryFilters} onChange={setFilters} /> : null}
          {organizations.length ? (
          <Pressable
            accessibilityLabel="Pridať event"
            onPress={() => {
              setSection('organization')
              setCreateEventRequest((current) => current + 1)
            }}
            style={[eventTabStyles.addButton, { backgroundColor: theme.primary }]}
          >
            <Text style={[eventTabStyles.addButtonText, { color: theme.onPrimary }]}>+</Text>
          </Pressable>
          ) : null}
          </View>
        </View>
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
          createEventRequest={createEventRequest}
        />
      ) : (
        <EventList
          events={section === 'mine' ? myEvents : discoveredEvents}
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
      <EventDetailWindow
        visible={Boolean(active)}
        onClose={() => {
          setActive(null)
          setMessage('')
        }}
      >
        {active ? (
          <EventDetailScreen
            event={active}
            teams={teams.filter((team) => team.owner_user_id === userId)}
            userId={userId}
            fetcher={fetcher}
            onRegister={register}
            message={message}
          />
        ) : null}
      </EventDetailWindow>
    </>
  )
}
