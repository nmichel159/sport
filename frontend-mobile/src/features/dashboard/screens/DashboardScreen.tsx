import { useCallback, useEffect, useRef, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { BottomNavigation } from '../../../components/BottomNavigation'
import { KeyboardAwareScrollView } from '../../../components/KeyboardAwareScrollView'
import { EventsHubScreen } from '../../events/screens/EventsHubScreen'
import { HomeTab } from '../../home/components/HomeTab'
import { QrScannerModal } from '../../home/components/QrScannerModal'
import { RankingScreen } from '../../rankings/screens/RankingScreen'
import { TeamDetailScreen } from '../../teams/screens/TeamDetailScreen'
import { TeamsProfileScreen } from '../../teams/screens/TeamsProfileScreen'
import { useAuth } from '../../auth/context/AuthContext'
import { formStyles } from '../../../styles/formStyles'
import { mainStyles } from '../../../styles/mainStyles'
import type {
  ApiEvent,
  ApiOrganization,
  ApiTeam,
  MainTab,
} from '../../../types/domain'
import { addTeamPlayer, createTeam } from '../../teams/services/teamApi'
import { AppHeader } from '../components/AppHeader'
import { loadDashboard, refreshParticipatingEvents } from '../services/dashboardApi'

type Props = {
  name: string
  userId: string
  onSignOut: () => Promise<void>
}

const tabTitles: Record<MainTab, string> = {
  home: 'Domov',
  events: 'Organizátor',
  ranking: 'Ranking',
  profile: 'Profil',
}

export function DashboardScreen({ name, userId, onSignOut }: Props) {
  const { authenticatedFetch } = useAuth()
  const [tab, setTab] = useState<MainTab>('home')
  const [teams, setTeams] = useState<ApiTeam[]>([])
  const [organizations, setOrganizations] = useState<ApiOrganization[]>([])
  const [events, setEvents] = useState<ApiEvent[]>([])
  const [participatingEvents, setParticipatingEvents] = useState<ApiEvent[]>([])
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<ApiEvent | null>(null)
  const [qrScannerVisible, setQrScannerVisible] = useState(false)
  const [error, setError] = useState('')
  const hasOpenedHome = useRef(false)

  useEffect(() => {
    void loadDashboard(authenticatedFetch, userId)
      .then((data) => {
        setTeams(data.teams)
        setOrganizations(data.organizations)
        setEvents(data.events)
        setParticipatingEvents(data.participatingEvents)
      })
      .catch(() => setError('Dáta sa nepodarilo načítať.'))
  }, [authenticatedFetch, userId])

  const create = async (teamName: string) => {
    const team = await createTeam(authenticatedFetch, teamName)
    setTeams((current) => [team, ...current])
    setSelectedTeamId(team.id)
  }

  const refreshHomeParticipations = useCallback(async () => {
    if (!hasOpenedHome.current) {
      hasOpenedHome.current = true
      return
    }
    const refreshed = await refreshParticipatingEvents(authenticatedFetch, userId)
    setParticipatingEvents(refreshed)
  }, [authenticatedFetch, userId])

  const addPlayer = async (teamId: string, playerNickname: string) => {
    const changed = await addTeamPlayer(
      authenticatedFetch,
      teamId,
      playerNickname,
    )
    setTeams((current) =>
      current.map((team) => (team.id === changed.id ? changed : team)),
    )
  }

  const selectedTeam = teams.find((team) => team.id === selectedTeamId)
  return (
    <View style={mainStyles.mainApp}>
      <AppHeader name={name} />
      <KeyboardAwareScrollView
        contentContainerStyle={mainStyles.mainContent}
        automaticallyAdjustKeyboardInsets
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
      >
        {error ? <Text style={formStyles.error}>{error}</Text> : null}
        {selectedTeam ? (
          <TeamDetailScreen
            team={selectedTeam}
            onBack={() => setSelectedTeamId(null)}
            onAdd={addPlayer}
          />
        ) : tab === 'profile' ? (
          <TeamsProfileScreen
            name={name}
            teams={teams}
            onCreate={create}
            onOpen={setSelectedTeamId}
            onSignOut={onSignOut}
            organizations={organizations}
            setOrganizations={setOrganizations}
            fetcher={authenticatedFetch}
          />
        ) : tab === 'home' ? (
          <HomeTab
            name={name}
            teams={teams}
            participatingEvents={participatingEvents}
            onEnterHome={refreshHomeParticipations}
            onCreateTeam={create}
            onOpenTeam={setSelectedTeamId}
            onOpenEvent={(event) => {
              setSelectedEvent(event)
              setTab('events')
            }}
          />
        ) : tab === 'events' ? (
          <EventsHubScreen
            organizations={organizations}
            setOrganizations={setOrganizations}
            events={events}
            setEvents={setEvents}
            teams={teams}
            userId={userId}
            fetcher={authenticatedFetch}
            activeEvent={selectedEvent}
            onActiveEventChange={setSelectedEvent}
          />
        ) : (
          <RankingScreen fetcher={authenticatedFetch} />
        )}
      </KeyboardAwareScrollView>

      {tab === 'home' && !selectedTeam ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Čítačka QR vstupeniek"
          onPress={() => setQrScannerVisible(true)}
          style={mainStyles.qrScannerFab}
        >
          <Text style={mainStyles.qrScannerFabIcon}>▦</Text>
          <Text style={mainStyles.qrScannerFabText}>Čítačka QR</Text>
        </Pressable>
      ) : null}
      <QrScannerModal
        visible={qrScannerVisible}
        onClose={() => setQrScannerVisible(false)}
        fetcher={authenticatedFetch}
        onOpenEvent={(event) => {
          setSelectedEvent(event)
          setTab('events')
        }}
      />

      {!selectedTeam ? (
        <BottomNavigation
          active={tab}
          onChange={setTab}
        />
      ) : null}
    </View>
  )
}
