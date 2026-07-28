import type { ReactNode } from 'react'
import { Text, View } from 'react-native'
import { formStyles } from '../styles/formStyles'

export function Field({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <View style={formStyles.field}>
      <Text style={formStyles.label}>{label}</Text>
      {children}
    </View>
  )
}

