import { useEffect } from 'react'
import { Modal, type ModalProps } from 'react-native'
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
      {children}
    </Modal>
  )
}

