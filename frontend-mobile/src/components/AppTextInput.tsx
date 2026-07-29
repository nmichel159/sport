import {
  forwardRef,
  useContext,
  useImperativeHandle,
  useRef,
} from 'react'
import {
  TextInput,
  type TextInputProps,
} from 'react-native'
import { KeyboardAwareScrollContext } from './KeyboardAwareScrollView'
import { useTheme } from '../theme/ThemeContext'

/**
 * Shared text-entry behavior and colors for every form field in the app.
 * Individual fields can still provide a compact or multiline layout.
 */
export const AppTextInput = forwardRef<TextInput, TextInputProps>(
  function AppTextInput(
    {
      cursorColor,
      placeholderTextColor = '#9aa0a8',
      selectionColor,
      underlineColorAndroid = 'transparent',
      onFocus,
      ...props
    },
    ref,
  ) {
    const registerFocusedInput = useContext(KeyboardAwareScrollContext)
    const { theme } = useTheme()
    const inputRef = useRef<TextInput>(null)

    useImperativeHandle(ref, () => inputRef.current as TextInput)

    return (
      <TextInput
        {...props}
        ref={inputRef}
        cursorColor={cursorColor ?? theme.primary}
        placeholderTextColor={placeholderTextColor}
        selectionColor={selectionColor ?? theme.primary}
        underlineColorAndroid={underlineColorAndroid}
        onFocus={(event) => {
          registerFocusedInput(inputRef.current)
          onFocus?.(event)
        }}
      />
    )
  },
)
