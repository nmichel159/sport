import { Pressable, StyleSheet, Text, View } from 'react-native'
import { themes, type ThemeId } from '../../../theme/theme'
import { useTheme } from '../../../theme/ThemeContext'
import { teamStyles } from '../../../styles/teamStyles'

export function ThemeSettings() {
  const { theme, setThemeId } = useTheme()

  return (
    <View style={styles.section}>
      <Text style={[teamStyles.sectionTitle, { color: theme.secondary }]}>VZHĽAD APLIKÁCIE</Text>
      <Text style={styles.hint}>
        Farby sa ukladajú iba lokálne v tomto zariadení.
      </Text>
      <View style={styles.grid}>
        {Object.values(themes).map((palette) => {
          const selected = palette.id === theme.id
          return (
            <Pressable
              key={palette.id}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => setThemeId(palette.id as ThemeId)}
              style={[
                styles.palette,
                { borderColor: selected ? palette.primary : '#2b2e34' },
              ]}
            >
              <View style={styles.swatches}>
                <View style={[styles.swatch, { backgroundColor: palette.primary }]} />
                <View style={[styles.swatch, { backgroundColor: palette.secondary }]} />
              </View>
              <Text style={styles.name}>{palette.name}</Text>
              {selected ? (
                <Text style={[styles.selected, { color: palette.primary }]}>Vybraná</Text>
              ) : null}
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  section: { gap: 8, marginTop: 16 },
  hint: { color: '#9aa0a8', fontSize: 12, lineHeight: 17 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  palette: {
    width: '31%',
    minHeight: 88,
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 10,
    justifyContent: 'space-between',
    backgroundColor: '#17181c',
  },
  swatches: { flexDirection: 'row' },
  swatch: { width: 23, height: 23, borderRadius: 12, marginRight: -6 },
  name: { color: '#f3f4f6', fontSize: 12, fontWeight: '800' },
  selected: { fontSize: 10, fontWeight: '900' },
})
