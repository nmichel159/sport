import { type ReactNode, useEffect, useRef, useState } from 'react'
import {
  type LayoutChangeEvent,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import {
  ResumableZoom,
  type ResumableZoomRefType,
} from 'react-native-zoom-toolkit'
import { SafeAreaView } from 'react-native-safe-area-context'

const overviewMinimum = 0.08
const maximumZoom = 2.5

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
  const [visible, setVisible] = useState(false)
  const [viewport, setViewport] = useState({ width: 0, height: 0 })
  const [measuredHeight, setMeasuredHeight] = useState(contentHeight)
  const zoomRef = useRef<ResumableZoomRefType>(null)

  const fitScale = Math.max(
    overviewMinimum,
    Math.min(
      1,
      viewport.width / contentWidth,
      viewport.height / measuredHeight,
    ),
  )

  const libraryFitScale = fitScale / overviewMinimum
  const libraryNormalScale = 1 / overviewMinimum
  const libraryMaximumScale = maximumZoom / overviewMinimum

  const showWholeBracket = (animate = true) => {
    zoomRef.current?.setTransformState(
      {
        translateX: 0,
        translateY: 0,
        scale: libraryFitScale,
      },
      animate,
    )
  }

  const showNormalSize = () => {
    zoomRef.current?.zoom(libraryNormalScale)
  }

  useEffect(() => {
    if (!visible || viewport.width === 0 || viewport.height === 0) return

    requestAnimationFrame(() => {
      showWholeBracket(false)
    })
  }, [
    visible,
    viewport.width,
    viewport.height,
    contentWidth,
    measuredHeight,
  ])

  const handleViewportLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout
    setViewport({ width, height })
  }

  const handleContentLayout = (event: LayoutChangeEvent) => {
    const height = Math.max(
      contentHeight,
      Math.ceil(event.nativeEvent.layout.height),
    )

    setMeasuredHeight((current) =>
      current === height ? current : height,
    )
  }

  return (
    <>
      <Pressable
        accessibilityRole="button"
        onPress={() => setVisible(true)}
        style={styles.openButton}
      >
        <Text style={styles.openText}>Otvoriť pavúka ↗</Text>
      </Pressable>

      <Modal
        animationType="slide"
        visible={visible}
        onRequestClose={() => setVisible(false)}
      >
        <GestureHandlerRootView style={styles.screen}>
          <SafeAreaView style={styles.screen}>
            <View style={styles.header}>
              <Text numberOfLines={1} style={styles.title}>
                {title}
              </Text>

              <Pressable
                style={styles.control}
                onPress={() => showWholeBracket()}
              >
                <Text style={styles.controlText}>Celý</Text>
              </Pressable>

              <Pressable
                style={styles.control}
                onPress={showNormalSize}
              >
                <Text style={styles.controlText}>100 %</Text>
              </Pressable>

              <Pressable
                accessibilityLabel="Zavrieť pavúka"
                style={styles.closeButton}
                onPress={() => setVisible(false)}
              >
                <Text style={styles.closeText}>×</Text>
              </Pressable>
            </View>

            <View
              onLayout={handleViewportLayout}
              style={styles.viewport}
            >
              <ResumableZoom
                ref={zoomRef}
                extendGestures
                minScale={1}
                maxScale={libraryMaximumScale}
                scaleMode="clamp"
                panMode="clamp"
                pinchMode="clamp"
                allowPinchPanning
                decay={false}
                tapsEnabled={false}
              >
                <View
                  style={{
                    width: contentWidth * overviewMinimum,
                    height: measuredHeight * overviewMinimum,
                  }}
                >
                  <View
                    onLayout={handleContentLayout}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: contentWidth,
                      minHeight: contentHeight,
                      transformOrigin: 'top left',
                      transform: [{ scale: overviewMinimum }],
                    }}
                  >
                    {children}
                  </View>
                </View>
              </ResumableZoom>
            </View>
          </SafeAreaView>
        </GestureHandlerRootView>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0f1013',
  },
  viewport: {
    flex: 1,
    overflow: 'hidden',
  },
  openButton: {
    padding: 18,
    borderRadius: 16,
    backgroundColor: '#29270f',
  },
  openText: {
    color: '#ffd400',
    fontSize: 18,
    fontWeight: '900',
  },
  header: {
    height: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    backgroundColor: '#17181c',
  },
  title: {
    flex: 1,
    color: '#f3f4f6',
    fontSize: 17,
    fontWeight: '900',
  },
  control: {
    paddingHorizontal: 11,
    paddingVertical: 9,
    borderRadius: 9,
    backgroundColor: '#303238',
  },
  controlText: {
    color: '#f3f4f6',
    fontSize: 12,
    fontWeight: '800',
  },
  closeButton: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
    backgroundColor: '#ffd400',
  },
  closeText: {
    color: '#171400',
    fontSize: 29,
    fontWeight: '900',
  },
})