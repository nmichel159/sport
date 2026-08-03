import { Modal, Platform, Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
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
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      navigationBarTranslucent={Platform.OS === 'android'}
      statusBarTranslucent={Platform.OS === 'android'}
    >
      <SafeAreaView style={formStyles.eventModalSafeArea}>
        <View style={[formStyles.modalOverlay, formStyles.eventModalOverlay]}>
          <Pressable
            accessibilityLabel="Zavrieť vytvorenie eventu"
            accessibilityRole="button"
            onPress={onClose}
            style={formStyles.eventModalBackdrop}
          />
          <View style={formStyles.eventModalSheet}>
            <Pressable
              accessibilityLabel="Zavrieť vytvorenie eventu"
              accessibilityRole="button"
              onPress={onClose}
              style={formStyles.eventModalClose}
            >
              <Text style={formStyles.eventModalCloseText}>×</Text>
            </Pressable>
            <ScrollView
              style={formStyles.eventModalScroll}
              contentContainerStyle={formStyles.eventModalScrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator
            >
              <CreateEventForm
                onCreate={onCreate}
                fetcher={fetcher}
                message={message}
                onCreated={onClose}
                inModal
              />
            </ScrollView>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  )
}
