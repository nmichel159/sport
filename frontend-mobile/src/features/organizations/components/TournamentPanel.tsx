import { Pressable, Text, View } from 'react-native'
import { teamStyles } from '../../../styles/teamStyles'

export function TournamentPanel({ onBack }: { onBack: () => void }) {
  return (
    <View style={teamStyles.form}>
      <Text style={teamStyles.title}>Vnútro turnaja</Text>
      <Text style={teamStyles.muted}>
        Tu bude priebeh turnaja: prihlásené tímy alebo hráči, rozpis
        zápasov, zadávanie výsledkov a tabuľka.
      </Text>
      <View style={teamStyles.card}>
        <View style={teamStyles.info}>
          <Text style={teamStyles.title}>Rozpis zápasov</Text>
          <Text style={teamStyles.muted}>
            Zatiaľ nie sú vytvorené žiadne zápasy.
          </Text>
        </View>
      </View>
      <View style={teamStyles.card}>
        <View style={teamStyles.info}>
          <Text style={teamStyles.title}>Výsledky a tabuľka</Text>
          <Text style={teamStyles.muted}>
            Po pridaní zápasov sa tu budú zapisovať výsledky.
          </Text>
        </View>
      </View>
      <Pressable onPress={onBack}>
        <Text style={teamStyles.back}>← Späť na možnosti</Text>
      </Pressable>
    </View>
  )
}

