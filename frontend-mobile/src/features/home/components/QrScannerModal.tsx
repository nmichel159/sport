import { useState } from 'react'
import { CameraView, useCameraPermissions } from 'expo-camera'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { SystemModal } from '../../../system/SystemModal'
import { teamStyles } from '../../../styles/teamStyles'

type Pass = {
  type: 'sport-pass'
  version: number
  event: { id: string; name: string; sport: string; date: string | null; location: string | null }
  participant: { id: string; name: string; type: string } | null
}

export function QrScannerModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const insets = useSafeAreaInsets()
  const [permission, requestPermission] = useCameraPermissions()
  const [result, setResult] = useState<Pass | null>(null)
  const [error, setError] = useState('')
  const read = ({ data }: { data: string }) => {
    if (result) return
    try {
      const value = JSON.parse(data) as Pass
      if (value.type !== 'sport-pass' || value.version !== 1 || !value.event?.name) throw Error()
      setResult(value)
      setError('')
    } catch { setError('Tento QR kód nie je vstupenka z aplikácie Sport.') }
  }
  const close = () => { setResult(null); setError(''); onClose() }
  const safePadding = { paddingTop: insets.top + 16, paddingBottom: Math.max(insets.bottom, 16) + 12 }

  return <SystemModal visible={visible} transparent edgeToEdge animationType="slide" onRequestClose={close}>
    <View style={styles.root}>
      {permission?.granted && !result ? <CameraView style={StyleSheet.absoluteFill} facing="back" barcodeScannerSettings={{ barcodeTypes: ['qr'] }} onBarcodeScanned={read} /> : null}
      <View style={[styles.content, safePadding]}>
        <View style={teamStyles.scannerHeader}><Text style={teamStyles.qrTitle}>Načítať QR vstupenku</Text><Pressable onPress={close}><Text style={teamStyles.cancel}>Zavrieť</Text></Pressable></View>
        {!permission ? <Text style={teamStyles.muted}>Pripravujem kameru…</Text> : !permission.granted ? <View style={teamStyles.scannerNotice}><Text style={teamStyles.muted}>Povoľ kameru, aby sa dala načítať QR vstupenka.</Text><Pressable style={teamStyles.primary} onPress={() => void requestPermission()}><Text style={teamStyles.primaryText}>Povoliť kameru</Text></Pressable></View> : result ? <View style={teamStyles.scannerResult}><Text style={teamStyles.qrSubtitle}>TURNAJ</Text><Text style={teamStyles.qrTitle}>{result.event.name}</Text><Text style={teamStyles.muted}>{result.event.sport} · {result.event.date ?? 'termín sa doplní'}</Text><Text style={teamStyles.muted}>{result.event.location ?? ''}</Text><Text style={teamStyles.qrSubtitle}>ÚČASTNÍK</Text><Text style={teamStyles.qrParticipant}>{result.participant?.name ?? 'Bez účastníka'}</Text><Text style={teamStyles.muted}>{result.participant?.type === 'TEAM' ? 'Tím' : 'Hráč'}</Text><Pressable style={teamStyles.primary} onPress={() => setResult(null)}><Text style={teamStyles.primaryText}>Načítať ďalší kód</Text></Pressable></View> : <View style={styles.cameraFooter}><Text style={styles.cameraHint}>Nasmeruj kameru na QR vstupenku.</Text>{error ? <Text style={teamStyles.qrError}>{error}</Text> : null}</View>}
      </View>
    </View>
  </SystemModal>
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#101114' },
  content: { flex: 1, justifyContent: 'space-between', paddingHorizontal: 20 },
  cameraFooter: { gap: 8, alignItems: 'center' },
  cameraHint: { color: '#f3f4f6', fontSize: 14, fontWeight: '700', textAlign: 'center', textShadowColor: '#000000', textShadowRadius: 5 },
})
