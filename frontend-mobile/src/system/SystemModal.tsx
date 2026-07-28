import { useEffect } from 'react'
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  type ModalProps,
} from 'react-native'
import { KeyboardAwareScrollView } from '../components/KeyboardAwareScrollView'
import { applySystemUiSettings } from './SystemUiController'

/**
 * React Native modals use a separate Android window. Reapply the global
 * immersive policy whenever that window opens or closes.
 */
export function SystemModal({
  children,
  visible = true,
  onShow,
  onDismiss,
  ...props
}: ModalProps) {
  useEffect(() => {
    if (!visible) return

    void applySystemUiSettings()
    const afterAnimation = setTimeout(() => {
      void applySystemUiSettings()
    }, 350)

    return () => clearTimeout(afterAnimation)
  }, [visible])

  return (
    <Modal
      {...props}
      visible={visible}
      onShow={(event) => {
        void applySystemUiSettings()
        onShow?.(event)
      }}
      onDismiss={() => {
        void applySystemUiSettings()
        onDismiss?.()
      }}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <KeyboardAwareScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ flexGrow: 1 }}
          automaticallyAdjustKeyboardInsets
          keyboardDismissMode="on-drag"
        >
          {children}
        </KeyboardAwareScrollView>
      </KeyboardAvoidingView>
    </Modal>
  )
}
