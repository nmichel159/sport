import { useEffect, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { mainStyles } from '../../../styles/mainStyles'
import { teamStyles } from '../../../styles/teamStyles'
import { useTheme } from '../../../theme/ThemeContext'
import type { ApiEvent, ApiTeam } from '../../../types/domain'
import { MyTeamsPanel } from '../../teams/components/MyTeamsPanel'
import { HomeTournamentLists } from './HomeTournamentLists'
import { QrScannerModal } from './QrScannerModal'

type Props = {
  name: string
  teams: ApiTeam[]
  participatingEvents: ApiEvent[]
  onEnterHome: () => Promise<void>
  onCreateTeam: (name: string) => Promise<void>
  onOpenTeam: (id: string) => void
}

export function HomeTab({ name, teams, participatingEvents, onEnterHome, onCreateTeam, onOpenTeam }: Props) {
  const { theme } = useTheme()
  const [scannerVisible, setScannerVisible] = useState(false)
  useEffect(() => { void onEnterHome() }, [onEnterHome])
  return <>
    <View style={[mainStyles.mainCard, mainStyles.heroCard, { backgroundColor: theme.soft, borderColor: theme.softBorder }]}>
      <Text style={[mainStyles.cardKicker, { color: theme.primary }]}>VITAJ SPÄŤ</Text>
      <Text style={mainStyles.homeGreeting}>{name}</Text>
      <Text style={mainStyles.mainMuted}>Pripravený vyraziť na ihrisko?</Text>
    </View>
    <Pressable style={[teamStyles.primary, { backgroundColor: theme.primary }]} onPress={() => setScannerVisible(true)}><Text style={[teamStyles.primaryText, { color: theme.onPrimary }]}>▦ Načítať QR vstupenku</Text></Pressable>
    <MyTeamsPanel teams={teams} onCreate={onCreateTeam} onOpen={onOpenTeam} />
    <HomeTournamentLists events={participatingEvents} />
    <QrScannerModal visible={scannerVisible} onClose={() => setScannerVisible(false)} />
  </>
}
