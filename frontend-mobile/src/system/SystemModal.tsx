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
  /**
   * Use this when modal content already owns its scrolling. It prevents nested
   * scroll containers from leaving a bottom sheet without a bounded height.
   */
  keyboardAware?: boolean
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
  keyboardAware = true,
  ...props
}: SystemModalProps) {
  const safeContent = keyboardAware ? (
    <KeyboardAwareScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ flexGrow: 1 }}
      keyboardDismissMode="on-drag"
    >
      {children}
    </KeyboardAwareScrollView>
  ) : children

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
        {safeContent}
      </SafeAreaView>}
    </Modal>
  )
}
