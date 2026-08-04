import { useEffect } from 'react'
import { Text, View } from 'react-native'
import { useTheme } from '../../../theme/ThemeContext'
import type { ApiEvent, ApiTeam } from '../../../types/domain'
import { LocalModelCard } from '../../localAi/components/LocalModelCard'
import { MyTeamsPanel } from '../../teams/components/MyTeamsPanel'
import { homeTournamentStyles as styles } from '../../../styles/homeTournamentStyles'
import { HomeTournamentLists } from './HomeTournamentLists'

type Props = {
  name: string
  teams: ApiTeam[]
  participatingEvents: ApiEvent[]
  onEnterHome: () => Promise<void>
  onCreateTeam: (name: string) => Promise<void>
  onOpenTeam: (id: string) => void
  onOpenEvent: (event: ApiEvent) => void
}

function XpProgressCard() {
  const { theme } = useTheme()
  const xp = 0
  const nextLevelXp = 100
  const progress = (xp / nextLevelXp) * 100

  return (
    <View style={[styles.xpCard, { backgroundColor: theme.soft, borderColor: theme.softBorder }]}>
      <View style={styles.xpTopRow}>
        <View>
          <Text style={[styles.xpEyebrow, { color: theme.primary }]}>TVÔJ POSTUP</Text>
          <Text style={styles.xpTitle}>Zbieraj XP na ihrisku</Text>
        </View>
        <View style={[styles.xpBadge, { backgroundColor: theme.primary }]}>
          <Text style={styles.xpBadgeValue}>{xp}</Text>
          <Text style={styles.xpBadgeLabel}>XP</Text>
        </View>
      </View>
      <View style={styles.xpProgressTrack}>
        <View style={[styles.xpProgressFill, { width: `${progress}%`, backgroundColor: theme.primary }]} />
      </View>
      <View style={styles.xpFooter}>
        <Text style={styles.xpFooterText}>Začni prvým eventom</Text>
        <Text style={[styles.xpFooterText, { color: theme.primary }]}>{nextLevelXp} XP do ďalšieho levelu</Text>
      </View>
    </View>
  )
}

export function HomeTab({ teams, participatingEvents, onEnterHome, onCreateTeam, onOpenTeam, onOpenEvent }: Props) {
  useEffect(() => { void onEnterHome() }, [onEnterHome])

  return (
    <>
      <XpProgressCard />
      <MyTeamsPanel teams={teams} onCreate={onCreateTeam} onOpen={onOpenTeam} />
      <HomeTournamentLists events={participatingEvents} onOpen={onOpenEvent} />
      <LocalModelCard />
    </>
  )
}
