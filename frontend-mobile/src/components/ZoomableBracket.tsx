import {
  type ReactNode,
  useState,
} from 'react'
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler'
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'

const minScale = 0.4
const maxScale = 2.5

type Props = {
  children: ReactNode
  contentWidth: number
  contentHeight?: number
  title?: string
}

export function ZoomableBracket({
  children,
  contentWidth,
  contentHeight = 520,
  title = 'Turnajový pavúk',
}: Props) {
  const [visible, setVisible] = useState(true)
  const translateX = useSharedValue(0)
  const translateY = useSharedValue(0)
  const scale = useSharedValue(1)
  const panStartX = useSharedValue(0)
  const panStartY = useSharedValue(0)
  const pinchStartScale = useSharedValue(1)
  const pinchContentX = useSharedValue(0)
  const pinchContentY = useSharedValue(0)

  const reset = () => {
    translateX.value = withTiming(0, { duration: 160 })
    translateY.value = withTiming(0, { duration: 160 })
    scale.value = withTiming(1, { duration: 160 })
  }

  const open = () => {
    reset()
    setVisible(true)
  }

  const panGesture = Gesture.Pan()
    .minDistance(2)
    .maxPointers(1)
    .averageTouches(true)
    .shouldCancelWhenOutside(false)
    .onBegin(() => {
      panStartX.value = translateX.value
      panStartY.value = translateY.value
    })
    .onUpdate((event) => {
      translateX.value = panStartX.value + event.translationX
      translateY.value = panStartY.value + event.translationY
    })

  const pinchGesture = Gesture.Pinch()
    .shouldCancelWhenOutside(false)
    .onBegin((event) => {
      pinchStartScale.value = scale.value
      pinchContentX.value = (event.focalX - translateX.value) / scale.value
      pinchContentY.value = (event.focalY - translateY.value) / scale.value
    })
    .onUpdate((event) => {
      const nextScale = Math.min(
        maxScale,
        Math.max(minScale, pinchStartScale.value * event.scale),
      )
      scale.value = nextScale
      translateX.value = event.focalX - pinchContentX.value * nextScale
      translateY.value = event.focalY - pinchContentY.value * nextScale
    })

  const canvasGesture = Gesture.Simultaneous(panGesture, pinchGesture)
  const animatedContentStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }))

  return (
    <>
      <Pressable
        accessibilityRole="button"
        onPress={open}
        style={({ pressed }) => [
          styles.openButton,
          pressed && styles.openButtonPressed,
        ]}
      >
        <View>
          <Text style={styles.openEyebrow}>CELÁ OBRAZOVKA</Text>
          <Text style={styles.openTitle}>Otvoriť pavúka</Text>
        </View>
        <Text style={styles.openIcon}>↗</Text>
      </Pressable>

      <Modal
        animationType="slide"
        navigationBarTranslucent
        onRequestClose={() => setVisible(false)}
        statusBarTranslucent
        visible={visible}
      >
        <GestureHandlerRootView style={styles.modal}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modal}
          >
            <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
              <View style={styles.header}>
                <View style={styles.headerText}>
                  <Text numberOfLines={1} style={styles.title}>
                    {title}
                  </Text>
                </View>
                <Pressable
                  accessibilityLabel="Zavrieť pavúka"
                  accessibilityRole="button"
                  hitSlop={8}
                  onPress={() => setVisible(false)}
                  style={({ pressed }) => [
                    styles.closeButton,
                    pressed && styles.closeButtonPressed,
                  ]}
                >
                  <Text style={styles.closeIcon}>×</Text>
                  <Text style={styles.closeText}>ZAVRIEŤ</Text>
                </Pressable>
              </View>

              <GestureDetector gesture={canvasGesture}>
                <View style={styles.viewport}>
                  <Animated.View
                    style={[
                      styles.content,
                      animatedContentStyle,
                      {
                        minWidth: contentWidth,
                        minHeight: contentHeight,
                        transformOrigin: 'top left',
                      },
                    ]}
                  >
                    {children}
                  </Animated.View>
                </View>
              </GestureDetector>
            </SafeAreaView>
          </KeyboardAvoidingView>
        </GestureHandlerRootView>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  openButton: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderColor: '#ffd400',
    borderWidth: 2,
    borderRadius: 16,
    backgroundColor: '#29270f',
  },
  openButtonPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.99 }],
  },
  openEyebrow: {
    color: '#c8a900',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  openTitle: {
    color: '#fff6b3',
    fontSize: 19,
    fontWeight: '900',
  },
  openIcon: {
    color: '#ffd400',
    fontSize: 32,
    fontWeight: '900',
  },
  modal: {
    flex: 1,
    backgroundColor: '#0b0c0e',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    minHeight: 78,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomColor: '#2b2e34',
    borderBottomWidth: 1,
    backgroundColor: '#17181c',
  },
  headerText: {
    flex: 1,
  },
  title: {
    color: '#f3f4f6',
    fontSize: 18,
    fontWeight: '900',
  },
  closeButton: {
    minWidth: 96,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderRadius: 12,
    backgroundColor: '#ffd400',
  },
  closeButtonPressed: {
    backgroundColor: '#e1bb00',
  },
  closeIcon: {
    color: '#171400',
    fontSize: 30,
    fontWeight: '900',
    lineHeight: 32,
  },
  closeText: {
    color: '#171400',
    fontSize: 11,
    fontWeight: '900',
  },
  viewport: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#0f1013',
  },
  content: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
})
