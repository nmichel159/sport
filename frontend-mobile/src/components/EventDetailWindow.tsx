import type { ReactNode } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { SystemModal } from '../system/SystemModal'
import { KeyboardAwareScrollView } from './KeyboardAwareScrollView'

type Props = {
  visible: boolean
  title?: string
  onClose: () => void
  children: ReactNode
}

/** A consistent, dismissible window for every event-detail experience. */
export function EventDetailWindow({
  visible,
  title = 'Detail eventu',
  onClose,
  children,
}: Props) {
  return (
    <SystemModal
      visible={visible}
      transparent
      animationType="slide"
      keyboardAware={false}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text numberOfLines={1} style={styles.headerTitle}>{title}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Zavrieť detail eventu"
              onPress={onClose}
              style={styles.closeButton}
            >
              <Text style={styles.closeText}>× Zavrieť</Text>
            </Pressable>
          </View>
          <KeyboardAwareScrollView
            style={styles.body}
            contentContainerStyle={styles.content}
            keyboardDismissMode="on-drag"
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </KeyboardAwareScrollView>
        </View>
      </View>
    </SystemModal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.66)',
  },
  sheet: {
    width: '100%',
    height: '92%',
    maxWidth: 600,
    alignSelf: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#3b3e46',
    borderRadius: 24,
    backgroundColor: '#101114',
  },
  header: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2b2e34',
    backgroundColor: '#17181c',
  },
  headerTitle: { flex: 1, color: '#f3f4f6', fontSize: 16, fontWeight: '900' },
  closeButton: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, backgroundColor: '#2a2d33' },
  closeText: { color: '#f3f4f6', fontSize: 12, fontWeight: '900' },
  body: { flex: 1 },
  content: { gap: 12, padding: 16, paddingBottom: 32 },
})
