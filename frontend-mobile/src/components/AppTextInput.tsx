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

/**
 * Shared text-entry behavior and colors for every form field in the app.
 * Individual fields can still provide a compact or multiline layout.
 */
export const AppTextInput = forwardRef<TextInput, TextInputProps>(
  function AppTextInput(
    {
      cursorColor = '#ffd400',
      placeholderTextColor = '#9aa0a8',
      selectionColor = '#ffd400',
      underlineColorAndroid = 'transparent',
      onFocus,
      ...props
    },
    ref,
  ) {
    const registerFocusedInput = useContext(KeyboardAwareScrollContext)
    const inputRef = useRef<TextInput>(null)

    useImperativeHandle(ref, () => inputRef.current as TextInput)

    return (
      <TextInput
        {...props}
        ref={inputRef}
        cursorColor={cursorColor}
        placeholderTextColor={placeholderTextColor}
        selectionColor={selectionColor}
        underlineColorAndroid={underlineColorAndroid}
        onFocus={(event) => {
          registerFocusedInput(inputRef.current)
          onFocus?.(event)
        }}
      />
    )
  },
)
