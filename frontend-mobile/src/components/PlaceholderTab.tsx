import { Text, View } from 'react-native'
import { mainStyles } from '../styles/mainStyles'

type Props = {
  icon: string
  title: string
  description: string
}

export function PlaceholderTab({ icon, title, description }: Props) {
  return (
    <View style={mainStyles.emptyState}>
      <Text style={mainStyles.emptyIcon}>{icon}</Text>
      <Text style={mainStyles.emptyTitle}>{title}</Text>
      <Text style={mainStyles.mainMuted}>{description}</Text>
    </View>
  )
}

