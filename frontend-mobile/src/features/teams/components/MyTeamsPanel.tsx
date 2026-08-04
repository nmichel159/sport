import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { AppTextInput } from '../../../components/AppTextInput'
import { teamColors } from '../../../constants/teamColors'
import { formStyles } from '../../../styles/formStyles'
import { teamStyles } from '../../../styles/teamStyles'
import { useAccentStyles } from '../../../theme/useAccentStyles'
import { useTheme } from '../../../theme/ThemeContext'
import type { ApiTeam } from '../../../types/domain'

type Props = { teams: ApiTeam[]; onCreate: (name: string) => Promise<void>; onOpen: (id: string) => void }

export function MyTeamsPanel({ teams, onCreate, onOpen }: Props) {
  const accent = useAccentStyles()
  const { theme } = useTheme()
  const [adding, setAdding] = useState(false)
  const [teamName, setTeamName] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const create = async () => {
    const name = teamName.trim()
    if (!name) return
    setBusy(true); setMessage('')
    try { await onCreate(name); setTeamName(''); setAdding(false) }
    catch { setMessage('Tím sa nepodarilo pridať.') }
    finally { setBusy(false) }
  }
  return <View style={teamStyles.teamHub}>
    <View style={teamStyles.teamHubHeader}><View><Text style={teamStyles.sectionTitle}>MOJE TÍMY</Text><Text style={teamStyles.teamHubSubtitle}>{teams.length ? `${teams.length} ${teams.length === 1 ? 'tím' : 'tímy'}` : 'Zatiaľ nemáš žiadny tím'}</Text></View><View style={[teamStyles.teamHubCount, { backgroundColor: theme.soft }]}><Text style={[teamStyles.teamHubCountText, accent.accentText]}>{teams.length}</Text></View></View>
    {teams.map((team, index) => <Pressable key={team.id} style={teamStyles.teamHubCard} onPress={() => onOpen(team.id)}><View style={[teamStyles.badge, { backgroundColor: teamColors[index % teamColors.length] }]}><Text style={teamStyles.badgeText}>{team.name.slice(0, 2).toUpperCase()}</Text></View><View style={teamStyles.info}><Text style={teamStyles.title}>{team.name}</Text><Text style={teamStyles.muted}>{team.members.length} členovia</Text></View><Text style={[teamStyles.teamHubArrow, accent.accentText]}>›</Text></Pressable>)}
    {adding ? <View style={teamStyles.teamAddForm}><Text style={teamStyles.title}>Pridať nový tím</Text><AppTextInput value={teamName} onChangeText={setTeamName} placeholder="Názov tímu" placeholderTextColor="#9aa0a8" style={formStyles.input} autoFocus /><View style={teamStyles.actions}><Pressable onPress={() => { setAdding(false); setTeamName('') }}><Text style={teamStyles.cancel}>Zrušiť</Text></Pressable><Pressable style={[teamStyles.primary, accent.primaryButton]} onPress={() => void create()} disabled={busy}><Text style={[teamStyles.primaryText, accent.primaryText]}>{busy ? 'Pridávam…' : 'Pridať tím'}</Text></Pressable></View></View> : <Pressable style={[teamStyles.teamAddButton, accent.outlineButton]} onPress={() => setAdding(true)}><View style={[teamStyles.teamAddIcon, { backgroundColor: theme.soft }]}><Text style={[teamStyles.teamAddIconText, accent.accentText]}>+</Text></View><View style={teamStyles.info}><Text style={[teamStyles.teamAddTitle, accent.accentText]}>Pridať tím</Text><Text style={teamStyles.teamHubSubtitle}>Založ tím pre svojich spoluhráčov</Text></View></Pressable>}
    {message ? <Text style={formStyles.error}>{message}</Text> : null}
  </View>
}
