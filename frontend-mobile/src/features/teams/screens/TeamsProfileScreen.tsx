import { useEffect, useState } from 'react'
import { Text } from 'react-native'
import { useAuth } from '../../auth/context/AuthContext'
import { ProfileOrganizationManagerScreen } from '../../organizations/screens/ProfileOrganizationManagerScreen'
import { teamStyles } from '../../../styles/teamStyles'
import type { ApiOrganization, ApiTeam } from '../../../types/domain'
import { TeamsProfileContent } from '../components/TeamsProfileContent'

type Props = {
  name: string
  teams: ApiTeam[]
  onCreate: (name: string) => Promise<void>
  onOpen: (id: string) => void
  onSignOut: () => Promise<void>
}

export function TeamsProfileScreen(props: Props) {
  const { authenticatedFetch } = useAuth()
  const [organizations, setOrganizations] = useState<ApiOrganization[]>([])

  useEffect(() => {
    void authenticatedFetch('/organizations/mine')
      .then((response) =>
        response.ok
          ? (response.json() as Promise<ApiOrganization[]>)
          : [],
      )
      .then(setOrganizations)
      .catch(() => setOrganizations([]))
  }, [authenticatedFetch])

  return (
    <>
      <TeamsProfileContent {...props} />
      <Text style={teamStyles.sectionTitle}>MOJE ORGANIZÁCIE</Text>
      <ProfileOrganizationManagerScreen
        organizations={organizations}
        setOrganizations={setOrganizations}
        fetcher={authenticatedFetch}
      />
    </>
  )
}
