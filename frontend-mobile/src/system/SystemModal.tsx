import {
  Modal,
  Platform,
  type ModalProps,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { KeyboardAwareScrollView } from '../components/KeyboardAwareScrollView'

type SystemModalProps = ModalProps & {
  /** Lets camera and media views paint behind Android's system bars. */
  edgeToEdge?: boolean
}

/**
 * React Native modals use a separate Android window. Make that window
 * edge-to-edge too, then keep interactive content inside the safe area.
 */
export function SystemModal({
  children,
  visible = true,
  navigationBarTranslucent = Platform.OS === 'android',
  statusBarTranslucent = Platform.OS === 'android',
  edgeToEdge = false,
  ...props
}: SystemModalProps) {
  return (
    <Modal
      {...props}
      visible={visible}
      navigationBarTranslucent={navigationBarTranslucent}
      statusBarTranslucent={statusBarTranslucent}
    >
      {edgeToEdge ? children : <SafeAreaView
        edges={['top', 'right', 'bottom', 'left']}
        style={{ flex: 1 }}
      >
        <KeyboardAwareScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardDismissMode="on-drag"
        >
          {children}
        </KeyboardAwareScrollView>
      </SafeAreaView>}
    </Modal>
  )
}
