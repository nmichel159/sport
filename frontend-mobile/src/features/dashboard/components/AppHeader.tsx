import { Text, View } from 'react-native'
import { formStyles } from '../../../styles/formStyles'
import { mainStyles } from '../../../styles/mainStyles'
import { useTheme } from '../../../theme/ThemeContext'

export function AppHeader({ name }: { name: string }) {
  const { theme } = useTheme()

  return (
    <View style={mainStyles.mainHeader}>
      <Text style={mainStyles.headerBrand}>
        3x3 <Text style={[formStyles.accent, { color: theme.primary }]}>SPORT</Text>
      </Text>
      <View style={mainStyles.headerGreeting}>
        <Text style={mainStyles.headerGreetingLabel}>Ahoj,</Text>
        <Text numberOfLines={1} style={[mainStyles.headerGreetingName, { color: theme.primary }]}>{name}</Text>
      </View>
      <View accessibilityLabel="Upozornenia" style={mainStyles.notificationBell}>
        <Text style={mainStyles.notificationBellIcon}>🔔</Text>
      </View>
    </View>
  )
}
