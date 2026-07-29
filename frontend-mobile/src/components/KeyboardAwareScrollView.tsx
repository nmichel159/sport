import {
  createContext,
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react'
import {
  Keyboard,
  ScrollView,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollViewProps,
  type TextInput,
} from 'react-native'

const keyboardClearance = 24

export const KeyboardAwareScrollContext = createContext<
  (input: TextInput | null) => void
>(() => undefined)

/**
 * Keeps the focused field visible when the software keyboard opens.
 *
 * React Native resizes the available screen, but nested layouts (for example
 * the horizontally scrolling tournament bracket) do not automatically tell
 * their outer vertical ScrollView which field needs to stay visible.
 */
export const KeyboardAwareScrollView = forwardRef<
  ScrollView,
  ScrollViewProps
>(function KeyboardAwareScrollView(
  {
    children,
    keyboardDismissMode = 'on-drag',
    keyboardShouldPersistTaps = 'handled',
    onScroll,
    scrollEventThrottle = 16,
    ...props
  },
  forwardedRef,
) {
  const scrollRef = useRef<ScrollView>(null)
  const focusedInput = useRef<TextInput | null>(null)
  const revealTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const keyboardTop = useRef(Number.POSITIVE_INFINITY)
  const keyboardVisible = useRef(false)
  const scrollOffset = useRef(0)
  const restoreOffset = useRef(0)
  const [keyboardSpace, setKeyboardSpace] = useState(0)

  useImperativeHandle(forwardedRef, () => scrollRef.current as ScrollView)

  const revealFocusedInput = useCallback((delay = 80) => {
    if (revealTimer.current) clearTimeout(revealTimer.current)

    revealTimer.current = setTimeout(() => {
      const input = focusedInput.current
      const scroll = scrollRef.current
      if (!input || !scroll) return

      input.measureInWindow((_inputX, inputY, _inputWidth, inputHeight) => {
        scroll.getNativeScrollRef()?.measureInWindow(
          (_scrollX, scrollY, _scrollWidth, scrollHeight) => {
            const visibleTop = scrollY + keyboardClearance
            const visibleBottom =
              Math.min(
                scrollY + scrollHeight,
                keyboardTop.current,
              ) - keyboardClearance
            const inputBottom = inputY + inputHeight

            let delta = 0
            if (inputBottom > visibleBottom) {
              delta = inputBottom - visibleBottom
            } else if (inputY < visibleTop) {
              delta = inputY - visibleTop
            }

            if (Math.abs(delta) < 1) return
            scroll.scrollTo({
              y: Math.max(0, scrollOffset.current + delta),
              animated: true,
            })
          },
        )
      })
    }, delay)
  }, [])

  const registerFocusedInput = useCallback(
    (input: TextInput | null) => {
      focusedInput.current = input
      revealFocusedInput()
    },
    [revealFocusedInput],
  )

  useEffect(() => {
    const showSubscription = Keyboard.addListener('keyboardDidShow', (event) => {
      if (!keyboardVisible.current) {
        restoreOffset.current = scrollOffset.current
      }
      keyboardVisible.current = true
      keyboardTop.current = event.endCoordinates.screenY

      // The spacer gives the last field enough scroll range even on Android
      // builds that still use window panning instead of native resize.
      setKeyboardSpace(event.endCoordinates.height + keyboardClearance)
      revealFocusedInput(120)
    })
    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
      keyboardVisible.current = false
      keyboardTop.current = Number.POSITIVE_INFINITY
      focusedInput.current = null
      setKeyboardSpace(0)

      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({
          y: restoreOffset.current,
          animated: true,
        })
      })
    })

    return () => {
      showSubscription.remove()
      hideSubscription.remove()
      if (revealTimer.current) clearTimeout(revealTimer.current)
    }
  }, [revealFocusedInput])

  const handleScroll = (
    event: NativeSyntheticEvent<NativeScrollEvent>,
  ) => {
    scrollOffset.current = event.nativeEvent.contentOffset.y
    onScroll?.(event)
  }

  return (
    <KeyboardAwareScrollContext.Provider value={registerFocusedInput}>
      <ScrollView
        {...props}
        ref={scrollRef}
        keyboardDismissMode={keyboardDismissMode}
        keyboardShouldPersistTaps={keyboardShouldPersistTaps}
        onScroll={handleScroll}
        scrollEventThrottle={scrollEventThrottle}
      >
        {children}
        {keyboardSpace > 0 ? (
          <View
            pointerEvents="none"
            style={{ height: keyboardSpace }}
          />
        ) : null}
      </ScrollView>
    </KeyboardAwareScrollContext.Provider>
  )
})
