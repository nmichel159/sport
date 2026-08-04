import { Text, View } from 'react-native'
import { mainStyles } from '../../../styles/mainStyles'
import { useTheme } from '../../../theme/ThemeContext'
import type { ApiTeam } from '../../../types/domain'
import { MyTeamsPanel } from './MyTeamsPanel'
import { ThemeSettings } from './ThemeSettings'

type Props = { name: string; teams: ApiTeam[]; onCreate: (name: string) => Promise<void>; onOpen: (id: string) => void }

export function TeamsProfileContent({ name, teams, onCreate, onOpen }: Props) {
  const { theme } = useTheme()
  return <><View style={mainStyles.profileCard}><View style={[mainStyles.avatar, { backgroundColor: theme.primary }]}><Text style={mainStyles.avatarText}>{name.slice(0, 1).toUpperCase()}</Text></View><Text style={mainStyles.profileName}>{name}</Text></View><ThemeSettings /><MyTeamsPanel teams={teams} onCreate={onCreate} onOpen={onOpen} /></>
}
