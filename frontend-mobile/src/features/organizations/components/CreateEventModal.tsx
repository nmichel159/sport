import { Pressable, ScrollView, Text } from 'react-native'
import { SystemModal } from '../../../system/SystemModal'
import { formStyles } from '../../../styles/formStyles'
import type { AuthenticatedFetch, EventPayload } from '../../../types/domain'
import { CreateEventForm } from './CreateEventForm'

type Props = {
  visible: boolean
  onClose: () => void
  onCreate: (payload: EventPayload) => Promise<void>
  fetcher: AuthenticatedFetch
  message: string
}

export function CreateEventModal({
  visible,
  onClose,
  onCreate,
  fetcher,
  message,
}: Props) {
  return (
    <SystemModal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable
        style={[formStyles.modalOverlay, formStyles.eventModalOverlay]}
        onPress={onClose}
      >
        <Pressable
          style={formStyles.eventModalSheet}
          onPress={(event) => event.stopPropagation()}
        >
          <Pressable
            accessibilityLabel="Zavrieť vytvorenie eventu"
            accessibilityRole="button"
            onPress={onClose}
            style={formStyles.eventModalClose}
          >
            <Text style={formStyles.eventModalCloseText}>×</Text>
          </Pressable>
          <ScrollView
            contentContainerStyle={{ paddingBottom: 8 }}
            keyboardShouldPersistTaps="handled"
          >
            <CreateEventForm
              onCreate={onCreate}
              fetcher={fetcher}
              message={message}
              onCreated={onClose}
              inModal
            />
          </ScrollView>
        </Pressable>
      </Pressable>
    </SystemModal>
  )
}
