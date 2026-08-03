import { Pressable, StyleSheet, Text, View } from 'react-native'
import { mainStyles } from '../styles/mainStyles'
import { useTheme } from '../theme/ThemeContext'
import type { MainTab } from '../types/domain'

type TabIcon = 'home' | 'calendar' | 'ranking' | 'profile'

const items: ReadonlyArray<{ key: MainTab; icon: TabIcon; label: string }> = [
  { key: 'home', icon: 'home', label: 'Domov' },
  { key: 'events', icon: 'calendar', label: 'Eventy' },
  { key: 'ranking', icon: 'ranking', label: 'Ranking' },
  { key: 'profile', icon: 'profile', label: 'Profil' },
]

type Props = {
  active: MainTab
  onChange: (tab: MainTab) => void
}

function TabIconGlyph({ icon, color }: { icon: TabIcon; color: string }) {
  if (icon === 'calendar') {
    return (
      <View style={[styles.calendar, { borderColor: color }]}>
        <View style={[styles.calendarDivider, { borderBottomColor: color }]} />
        <View
          style={[styles.calendarRing, styles.calendarRingLeft, { backgroundColor: color }]}
        />
        <View
          style={[styles.calendarRing, styles.calendarRingRight, { backgroundColor: color }]}
        />
      </View>
    )
  }

  const glyph = icon === 'home' ? '⌂' : icon === 'ranking' ? '♜' : '♙'
  return <Text style={[mainStyles.tabIconText, { color }]}>{glyph}</Text>
}

const styles = StyleSheet.create({
  calendar: {
    width: 18,
    height: 17,
    borderWidth: 1.8,
    borderRadius: 4,
    position: 'relative',
  },
  calendarDivider: {
    position: 'absolute',
    top: 4,
    left: 0,
    right: 0,
    borderBottomWidth: 1.6,
  },
  calendarRing: {
    position: 'absolute',
    top: -3,
    width: 2.5,
    height: 5,
    borderRadius: 2,
  },
  calendarRingLeft: { left: 4 },
  calendarRingRight: { right: 4 },
})

export function BottomNavigation({ active, onChange }: Props) {
  const { theme } = useTheme()

  return (
    <View style={mainStyles.tabBar}>
      {items.map((item) => {
        const selected = active === item.key
        const iconColor = selected ? theme.onPrimary : '#7d818a'

        return (
          <Pressable
            key={item.key}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            style={mainStyles.tabItem}
            onPress={() => onChange(item.key)}
          >
            <View
              style={[
                mainStyles.tabIcon,
                selected && mainStyles.tabIconActive,
                selected && { backgroundColor: theme.primary },
              ]}
            >
              <TabIconGlyph icon={item.icon} color={iconColor} />
            </View>
            <Text
              style={[
                mainStyles.tabLabel,
                selected && mainStyles.tabLabelActive,
                selected && { color: theme.primary },
              ]}
            >
              {item.label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}
