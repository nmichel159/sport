import { Text, View } from 'react-native'
import { formStyles } from '../../../styles/formStyles'
import { mainStyles } from '../../../styles/mainStyles'
import { useTheme } from '../../../theme/ThemeContext'

export function AppHeader({ title }: { title: string }) {
  const { theme } = useTheme()

  return (
    <View style={mainStyles.mainHeader}>
      <View>
        <Text style={mainStyles.headerBrand}>
          3x3 <Text style={[formStyles.accent, { color: theme.primary }]}>SPORT</Text>
        </Text>
        <Text style={mainStyles.headerTitle}>{title}</Text>
      </View>
    </View>
  )
}
