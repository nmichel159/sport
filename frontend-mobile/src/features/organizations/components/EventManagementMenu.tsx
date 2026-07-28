import { Pressable, Text, View } from 'react-native'
import { teamStyles } from '../../../styles/teamStyles'

type Props = {
  onEdit: () => void
  onOpenTournament: () => void
}

export function EventManagementMenu({
  onEdit,
  onOpenTournament,
}: Props) {
  return (
    <View style={teamStyles.section}>
      <Pressable style={teamStyles.card} onPress={onEdit}>
        <View style={teamStyles.info}>
          <Text style={teamStyles.title}>Upraviť základné údaje</Text>
          <Text style={teamStyles.muted}>
            Názov, popis a ostatné nastavenia eventu.
          </Text>
        </View>
        <Text style={teamStyles.buttonText}>›</Text>
      </Pressable>
      <Pressable style={teamStyles.card} onPress={onOpenTournament}>
        <View style={teamStyles.info}>
          <Text style={teamStyles.title}>Vnútro konania turnaja</Text>
          <Text style={teamStyles.muted}>
            Zápasy, výsledky, tabuľky a priebeh turnaja.
          </Text>
        </View>
        <Text style={teamStyles.buttonText}>›</Text>
      </Pressable>
    </View>
  )
}

