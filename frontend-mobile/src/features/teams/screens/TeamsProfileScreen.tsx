import { Pressable, Text } from 'react-native'
import { ProfileOrganizationManagerScreen } from '../../organizations/screens/ProfileOrganizationManagerScreen'
import { teamStyles } from '../../../styles/teamStyles'
import { mainStyles } from '../../../styles/mainStyles'
import type {
  ApiOrganization,
  ApiTeam,
  AuthenticatedFetch,
} from '../../../types/domain'
import { TeamsProfileContent } from '../components/TeamsProfileContent'

type Props = {
  name: string
  teams: ApiTeam[]
  onCreate: (name: string) => Promise<void>
  onOpen: (id: string) => void
  onSignOut: () => Promise<void>
  organizations: ApiOrganization[]
  setOrganizations: React.Dispatch<React.SetStateAction<ApiOrganization[]>>
  fetcher: AuthenticatedFetch
}

export function TeamsProfileScreen({
  organizations,
  setOrganizations,
  fetcher,
  onSignOut,
  ...profileProps
}: Props) {

  return (
    <>
      <TeamsProfileContent {...profileProps} />
      <Text style={teamStyles.sectionTitle}>MOJE ORGANIZÁCIE</Text>
      <ProfileOrganizationManagerScreen
        organizations={organizations}
        setOrganizations={setOrganizations}
        fetcher={fetcher}
      />
      <Pressable
        style={mainStyles.signOutButton}
        onPress={() => void onSignOut()}
      >
        <Text style={mainStyles.signOutText}>Odhlásiť sa</Text>
      </Pressable>
    </>
  )
}
