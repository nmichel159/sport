import { Pressable, Text, View } from 'react-native'
import { mainStyles } from '../styles/mainStyles'
import type { MainTab } from '../types/domain'

const items: ReadonlyArray<{ key: MainTab; icon: string; label: string }> = [
  { key: 'home', icon: '⌂', label: 'Domov' },
  { key: 'events', icon: '▣', label: 'Eventy' },
  { key: 'ranking', icon: '♜', label: 'Ranking' },
  { key: 'profile', icon: '♙', label: 'Profil' },
]

type Props = {
  active: MainTab
  onChange: (tab: MainTab) => void
  organizerVisible?: boolean
}

export function BottomNavigation({ active, onChange }: Props) {
  return (
    <View style={mainStyles.tabBar}>
      {items.map((item) => (
        <Pressable
          key={item.key}
          style={mainStyles.tabItem}
          onPress={() => onChange(item.key)}
        >
          <View
            style={[
              mainStyles.tabIcon,
              active === item.key && mainStyles.tabIconActive,
            ]}
          >
            <Text
              style={[
                mainStyles.tabIconText,
                active === item.key && mainStyles.tabIconTextActive,
              ]}
            >
              {item.icon}
            </Text>
          </View>
          <Text
            style={[
              mainStyles.tabLabel,
              active === item.key && mainStyles.tabLabelActive,
            ]}
          >
            {item.label}
          </Text>
        </Pressable>
      ))}
    </View>
  )
}

