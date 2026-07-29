import { Pressable, Text, View } from 'react-native'
import { AppTextInput } from '../../../components/AppTextInput'
import { SystemModal } from '../../../system/SystemModal'
import { formStyles } from '../../../styles/formStyles'
import { useAccentStyles } from '../../../theme/useAccentStyles'

type Props = {
  visible: boolean
  name: string
  onNameChange: (name: string) => void
  onClose: () => void
  onCreate: () => void
}

export function CreateOrganizationModal({
  visible,
  name,
  onNameChange,
  onClose,
  onCreate,
}: Props) {
  const accent = useAccentStyles()
  return (
    <SystemModal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={formStyles.modalOverlay}>
        <View style={formStyles.modalSheet}>
          <Text style={formStyles.modalTitle}>Vytvoriť organizáciu</Text>
          <AppTextInput
            value={name}
            onChangeText={onNameChange}
            placeholder="Názov organizácie"
            placeholderTextColor="#9aa0a8"
            style={formStyles.input}
          />
          <View style={formStyles.modalActions}>
            <Pressable onPress={onClose}>
              <Text style={formStyles.cancelText}>Zrušiť</Text>
            </Pressable>
            <Pressable
              style={[formStyles.saveDateButton, accent.primaryButton]}
              onPress={onCreate}
            >
              <Text style={[formStyles.saveDateText, accent.primaryText]}>Vytvoriť</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </SystemModal>
  )
}
