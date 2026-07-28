import { Pressable, Text, View } from 'react-native'
import { formStyles } from '../../../styles/formStyles'
import type { Gender } from '../../../types/onboarding'

const options: ReadonlyArray<[Gender, string]> = [
  ['male', 'Muž'],
  ['female', 'Žena'],
  ['other', 'Iné'],
  ['prefer_not_to_say', 'Nechcem uviesť'],
]

type Props = {
  value: Gender | null
  onChange: (value: Gender) => void
}

export function GenderSelector({ value, onChange }: Props) {
  return (
    <View style={formStyles.genderRow}>
      {options.map(([option, label]) => (
        <Pressable
          key={option}
          style={[
            formStyles.genderChip,
            value === option && formStyles.genderChipSelected,
          ]}
          onPress={() => onChange(option)}
        >
          <Text style={formStyles.genderText}>{label}</Text>
        </Pressable>
      ))}
    </View>
  )
}

