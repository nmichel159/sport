import { Text, View } from 'react-native'
import { formStyles } from '../../../styles/formStyles'
import { mainStyles } from '../../../styles/mainStyles'

export function AppHeader({ title }: { title: string }) {
  return (
    <View style={mainStyles.mainHeader}>
      <View>
        <Text style={mainStyles.headerBrand}>
          3x3 <Text style={formStyles.accent}>SPORT</Text>
        </Text>
        <Text style={mainStyles.headerTitle}>{title}</Text>
      </View>
    </View>
  )
}
