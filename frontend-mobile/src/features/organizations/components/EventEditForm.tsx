import { Pressable, Text, View } from 'react-native'
import { AppTextInput } from '../../../components/AppTextInput'
import { formStyles } from '../../../styles/formStyles'
import { teamStyles } from '../../../styles/teamStyles'
import { useAccentStyles } from '../../../theme/useAccentStyles'

type Props = {
  name: string
  description: string
  saving: boolean
  message: string
  onNameChange: (name: string) => void
  onDescriptionChange: (description: string) => void
  onSave: () => void
  onBack: () => void
}

export function EventEditForm({
  name,
  description,
  saving,
  message,
  onNameChange,
  onDescriptionChange,
  onSave,
  onBack,
}: Props) {
  const accent = useAccentStyles()
  return (
    <View style={teamStyles.form}>
      <Text style={teamStyles.title}>Základné údaje</Text>
      <AppTextInput
        value={name}
        onChangeText={onNameChange}
        placeholder="Názov eventu"
        placeholderTextColor="#9aa0a8"
        style={formStyles.input}
      />
      <AppTextInput
        value={description}
        onChangeText={onDescriptionChange}
        placeholder="Popis eventu"
        placeholderTextColor="#9aa0a8"
        style={[
          formStyles.input,
          { minHeight: 100, textAlignVertical: 'top' },
        ]}
        multiline
      />
      <Pressable
        style={[teamStyles.primary, accent.primaryButton]}
        disabled={saving}
        onPress={onSave}
      >
        <Text style={[teamStyles.primaryText, accent.primaryText]}>
          {saving ? 'Ukladám…' : 'Uložiť zmeny'}
        </Text>
      </Pressable>
      <Pressable onPress={onBack}>
        <Text style={[teamStyles.back, accent.accentText]}>← Späť na možnosti</Text>
      </Pressable>
      {message ? <Text style={formStyles.error}>{message}</Text> : null}
    </View>
  )
}
