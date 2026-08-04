import { useRef, useState } from 'react'
import { CameraView, useCameraPermissions } from 'expo-camera'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { SystemModal } from '../../../system/SystemModal'
import { teamStyles } from '../../../styles/teamStyles'
import type { ApiEvent, AuthenticatedFetch } from '../../../types/domain'
import { eventInviteTokenFromQr } from '../../events/services/eventInvite'

type Pass = {
  type: 'sport-pass'
  version: number
  event: { id: string; name: string; sport: string; date: string | null; location: string | null }
  participant: { id: string; name: string; type: string } | null
}

type ScanResult =
  | { kind: 'pass'; pass: Pass }
  | { kind: 'invite'; event: ApiEvent }

type Props = {
  visible: boolean
  onClose: () => void
  fetcher: AuthenticatedFetch
  onOpenEvent: (event: ApiEvent) => void
}

export function QrScannerModal({ visible, onClose, fetcher, onOpenEvent }: Props) {
  const insets = useSafeAreaInsets()
  const [permission, requestPermission] = useCameraPermissions()
  const [result, setResult] = useState<ScanResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const scanningRef = useRef(false)

  const loadEvent = async (inviteToken: string) => {
    const response = await fetcher(`/organizations/events/invites/${encodeURIComponent(inviteToken)}`)
    if (!response.ok) throw Error('EVENT_NOT_FOUND')
    return (await response.json()) as ApiEvent
  }

  const read = async ({ data }: { data: string }) => {
    if (scanningRef.current || result) return
    scanningRef.current = true
    setLoading(true)
    try {
      const inviteToken = eventInviteTokenFromQr(data)
      if (inviteToken) {
        setResult({ kind: 'invite', event: await loadEvent(inviteToken) })
      } else {
        const value = JSON.parse(data) as Pass
        if (value.type === 'sport-pass' && value.version === 1 && value.event?.name) {
          setResult({ kind: 'pass', pass: value })
        } else {
          throw Error('INVALID_QR')
        }
      }
      setError('')
    } catch {
      setError('Tento QR kód nie je platná vstupenka ani pozvánka na event.')
      scanningRef.current = false
    } finally {
      setLoading(false)
    }
  }

  const reset = () => {
    scanningRef.current = false
    setResult(null)
    setError('')
  }
  const close = () => { reset(); onClose() }
  const openEvent = (event: ApiEvent) => {
    close()
    onOpenEvent(event)
  }
  const safePadding = { paddingTop: insets.top + 16, paddingBottom: Math.max(insets.bottom, 16) + 12 }

  return <SystemModal visible={visible} transparent edgeToEdge animationType="slide" onRequestClose={close}>
    <View style={styles.root}>
      {permission?.granted && !result && !loading ? <CameraView style={StyleSheet.absoluteFill} facing="back" barcodeScannerSettings={{ barcodeTypes: ['qr'] }} onBarcodeScanned={(event) => void read(event)} /> : null}
      <View style={[styles.content, safePadding]}>
        <View style={teamStyles.scannerHeader}><Text style={teamStyles.qrTitle}>Čítačka QR</Text><Pressable onPress={close}><Text style={teamStyles.cancel}>Zavrieť</Text></Pressable></View>
        {!permission ? <Text style={teamStyles.muted}>Pripravujem kameru…</Text> : !permission.granted ? <View style={teamStyles.scannerNotice}><Text style={teamStyles.muted}>Povoľ kameru, aby sa dala načítať QR vstupenka alebo pozvánka na event.</Text><Pressable style={teamStyles.primary} onPress={() => void requestPermission()}><Text style={teamStyles.primaryText}>Povoliť kameru</Text></Pressable></View> : loading ? <View style={teamStyles.scannerResult}><Text style={teamStyles.muted}>Načítavam detail eventu…</Text></View> : result?.kind === 'invite' ? <View style={teamStyles.scannerResult}><Text style={teamStyles.qrSubtitle}>POZVÁNKA NA EVENT</Text><Text style={teamStyles.qrTitle}>{result.event.name}</Text><Text style={teamStyles.muted}>{result.event.sport} · {result.event.event_date ?? 'termín sa doplní'}</Text><Text style={teamStyles.muted}>{result.event.location ?? result.event.city ?? result.event.venue ?? ''}</Text><Pressable style={teamStyles.primary} onPress={() => openEvent(result.event)}><Text style={teamStyles.primaryText}>Zobraziť event a prihlásiť sa</Text></Pressable><Pressable onPress={reset}><Text style={teamStyles.cancel}>Načítať ďalší kód</Text></Pressable></View> : result?.kind === 'pass' ? <View style={teamStyles.scannerResult}><Text style={teamStyles.qrSubtitle}>TURNAJ</Text><Text style={teamStyles.qrTitle}>{result.pass.event.name}</Text><Text style={teamStyles.muted}>{result.pass.event.sport} · {result.pass.event.date ?? 'termín sa doplní'}</Text><Text style={teamStyles.muted}>{result.pass.event.location ?? ''}</Text><Text style={teamStyles.qrSubtitle}>ÚČASTNÍK</Text><Text style={teamStyles.qrParticipant}>{result.pass.participant?.name ?? 'Bez účastníka'}</Text><Text style={teamStyles.muted}>{result.pass.participant?.type === 'TEAM' ? 'Tím' : 'Hráč'}</Text><Pressable style={teamStyles.primary} onPress={reset}><Text style={teamStyles.primaryText}>Načítať ďalší kód</Text></Pressable></View> : <View style={styles.cameraFooter}><Text style={styles.cameraHint}>Nasmeruj kameru na QR vstupenku alebo QR pozvánku na event.</Text>{error ? <Text style={teamStyles.qrError}>{error}</Text> : null}</View>}
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
