import {
  KeyboardAwareScrollView as LibraryKeyboardAwareScrollView,
  type KeyboardAwareScrollViewProps,
} from 'react-native-keyboard-controller'

/**
 * App defaults around the native, animation-aware keyboard controller.
 */
export function KeyboardAwareScrollView({
  bottomOffset = 24,
  keyboardDismissMode = 'on-drag',
  keyboardShouldPersistTaps = 'handled',
  ...props
}: KeyboardAwareScrollViewProps) {
  return (
    <LibraryKeyboardAwareScrollView
      {...props}
      bottomOffset={bottomOffset}
      keyboardDismissMode={keyboardDismissMode}
      keyboardShouldPersistTaps={keyboardShouldPersistTaps}
    />
  )
}
