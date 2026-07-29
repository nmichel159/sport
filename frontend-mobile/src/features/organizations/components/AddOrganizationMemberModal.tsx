import { Pressable, Text, View } from 'react-native'
import { AppTextInput } from '../../../components/AppTextInput'
import { SystemModal } from '../../../system/SystemModal'
import { formStyles } from '../../../styles/formStyles'
import { useAccentStyles } from '../../../theme/useAccentStyles'

type Props = {
  visible: boolean
  nickname: string
  onNicknameChange: (nickname: string) => void
  onClose: () => void
  onAdd: () => void
}

export function AddOrganizationMemberModal({
  visible,
  nickname,
  onNicknameChange,
  onClose,
  onAdd,
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
          <Text style={formStyles.modalTitle}>Pridať člena</Text>
          <AppTextInput
            value={nickname}
            onChangeText={onNicknameChange}
            placeholder="Nick nového člena"
            placeholderTextColor="#9aa0a8"
            style={formStyles.input}
            autoCapitalize="none"
          />
          <View style={formStyles.modalActions}>
            <Pressable onPress={onClose}>
              <Text style={formStyles.cancelText}>Zrušiť</Text>
            </Pressable>
            <Pressable
              style={[formStyles.saveDateButton, accent.primaryButton]}
              onPress={onAdd}
            >
              <Text style={[formStyles.saveDateText, accent.primaryText]}>Pridať</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </SystemModal>
  )
}
