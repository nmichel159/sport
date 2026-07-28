import { useEffect, useState } from 'react'
import { ScrollView, Text, View } from 'react-native'
import { BottomNavigation } from '../../../components/BottomNavigation'
import { EventsHubScreen } from '../../events/screens/EventsHubScreen'
import { HomeTab } from '../../home/components/HomeTab'
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
import { loadDashboard } from '../services/dashboardApi'

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
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    void loadDashboard(authenticatedFetch)
      .then((data) => {
        setTeams(data.teams)
        setOrganizations(data.organizations)
        setEvents(data.events)
      })
      .catch(() => setError('Dáta sa nepodarilo načítať.'))
  }, [authenticatedFetch])

  const create = async (teamName: string) => {
    const team = await createTeam(authenticatedFetch, teamName)
    setTeams((current) => [team, ...current])
    setSelectedTeamId(team.id)
  }

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
  const title = selectedTeam?.name ?? tabTitles[tab]

  return (
    <View style={mainStyles.mainApp}>
      <AppHeader title={title} />
      <ScrollView contentContainerStyle={mainStyles.mainContent}>
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
          />
        ) : tab === 'home' ? (
          <HomeTab name={name} />
        ) : tab === 'events' ? (
          <EventsHubScreen
            organizations={organizations}
            setOrganizations={setOrganizations}
            events={events}
            setEvents={setEvents}
            teams={teams}
            userId={userId}
            fetcher={authenticatedFetch}
          />
        ) : (
          <RankingScreen fetcher={authenticatedFetch} />
        )}
      </ScrollView>

      {!selectedTeam ? (
        <BottomNavigation
          active={tab}
          onChange={setTab}
          organizerVisible={organizations.length > 0}
        />
      ) : null}
    </View>
  )
}

