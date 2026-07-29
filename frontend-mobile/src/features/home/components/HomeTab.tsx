import { Text, View } from 'react-native'
import { mainStyles } from '../../../styles/mainStyles'
import { useTheme } from '../../../theme/ThemeContext'

export function HomeTab({ name }: { name: string }) {
  const { theme } = useTheme()

  return (
    <>
      <View
        style={[
          mainStyles.mainCard,
          mainStyles.heroCard,
          { backgroundColor: theme.soft, borderColor: theme.softBorder },
        ]}
      >
        <Text style={[mainStyles.cardKicker, { color: theme.primary }]}>VITAJ SPÄŤ</Text>
        <Text style={mainStyles.homeGreeting}>{name}</Text>
        <Text style={mainStyles.mainMuted}>
          Pripravený vyraziť na ihrisko?
        </Text>
      </View>
      <Text style={mainStyles.sectionTitle}>NAJBLIŽŠIE PRE TEBA</Text>
      <View style={mainStyles.mainCard}>
        <Text style={mainStyles.cardTitle}>Žiadne udalosti zatiaľ nemáš</Text>
        <Text style={mainStyles.mainMuted}>
          Keď pridáme eventy, uvidíš ich tu.
        </Text>
      </View>
    </>
  )
}
