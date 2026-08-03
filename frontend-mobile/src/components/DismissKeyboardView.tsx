import type { ReactNode } from 'react'
import { StyleSheet, TextInput, View } from 'react-native'
import { KeyboardController } from 'react-native-keyboard-controller'

/**
 * Dismisses the software keyboard when a touch starts outside the currently
 * focused input. Returning false keeps the touch available to buttons,
 * scroll views, and the next input, so the original interaction still works.
 */
export function DismissKeyboardView({
  children,
}: {
  children: ReactNode
}) {
  return (
    <View
      style={styles.container}
      onStartShouldSetResponderCapture={(event) => {
        const focusedInput = TextInput.State.currentlyFocusedInput()
        if (focusedInput && event.target !== focusedInput) {
          void KeyboardController.dismiss()
        }
        return false
      }}
    >
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
})
