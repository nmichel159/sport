import { Pressable, Text, TextInput, View } from 'react-native'
import { SystemModal } from '../../../system/SystemModal'
import { formStyles } from '../../../styles/formStyles'

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
          <TextInput
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
              style={formStyles.saveDateButton}
              onPress={onCreate}
            >
              <Text style={formStyles.saveDateText}>Vytvoriť</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </SystemModal>
  )
}
