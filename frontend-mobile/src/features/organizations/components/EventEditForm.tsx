import { Pressable, Text, TextInput, View } from 'react-native'
import { formStyles } from '../../../styles/formStyles'
import { teamStyles } from '../../../styles/teamStyles'

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
  return (
    <View style={teamStyles.form}>
      <Text style={teamStyles.title}>Základné údaje</Text>
      <TextInput
        value={name}
        onChangeText={onNameChange}
        placeholder="Názov eventu"
        placeholderTextColor="#9aa0a8"
        style={formStyles.input}
      />
      <TextInput
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
        style={teamStyles.primary}
        disabled={saving}
        onPress={onSave}
      >
        <Text style={teamStyles.primaryText}>
          {saving ? 'Ukladám…' : 'Uložiť zmeny'}
        </Text>
      </Pressable>
      <Pressable onPress={onBack}>
        <Text style={teamStyles.back}>← Späť na možnosti</Text>
      </Pressable>
      {message ? <Text style={formStyles.error}>{message}</Text> : null}
    </View>
  )
}

