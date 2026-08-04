import { useRef, useState } from 'react'
import { Platform, Pressable, Text, View } from 'react-native'
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition'
import { SystemModal } from '../../../system/SystemModal'
import { useLocalAi } from '../LocalAiContext'
import { localAiStyles } from '../localAiStyles'
import type {
  EventFormAssistantApplyResult,
  EventFormAssistantPatch,
  EventFormAssistantSnapshot,
} from '../types'

type Props = {
  snapshot: EventFormAssistantSnapshot
  avoidCloseButton?: boolean
  onApply: (
    patch: EventFormAssistantPatch,
  ) => Promise<EventFormAssistantApplyResult>
}

function friendlySpeechError(code: string) {
  if (code === 'not-allowed') return 'Povoľ prístup k mikrofónu v nastaveniach zariadenia.'
  if (code === 'no-speech' || code === 'speech-timeout') return 'Nezachytil som reč. Skús hovoriť o trochu hlasnejšie.'
  if (code === 'network') return 'Rozpoznávanie reči teraz nemá pripojenie. Skús to znova.'
  if (code === 'language-not-supported') return 'Zariadenie nepodporuje slovenské rozpoznávanie reči.'
  if (code === 'aborted') return ''
  return 'Hlas sa nepodarilo rozpoznať. Skús to znova.'
}

export function EventVoiceAssistant({ snapshot, onApply, avoidCloseButton = false }: Props) {
  const { status, runEventFormCommand } = useLocalAi()
  const [visible, setVisible] = useState(false)
  const [listening, setListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [resultMessage, setResultMessage] = useState('')
  const [localError, setLocalError] = useState('')
  const processingRef = useRef(false)
  const lastProcessedRef = useRef('')
  const finalTranscriptRef = useRef('')
  const transcriptRef = useRef('')
  const submittedRef = useRef(false)
  const finishRequestedRef = useRef(false)
  const voiceSessionRef = useRef(false)
  const restartRecognitionRef = useRef<(preserveTranscript: boolean) => Promise<void>>(async () => {})
  const modelReady = status === 'ready' || status === 'loading' || status === 'processing'
  const processing = status === 'loading' || status === 'processing' || processingRef.current

  const processTranscript = async (spokenText: string) => {
    const normalized = spokenText.trim()
    if (!normalized || normalized === lastProcessedRef.current || processingRef.current) return
    lastProcessedRef.current = normalized
    processingRef.current = true
    setLocalError('')
    setResultMessage('')
    try {
      const patch = await runEventFormCommand(normalized, snapshot)
      const application = await onApply(patch)
      if (!application.appliedFields.length) {
        setResultMessage('Pokyn som spracoval, ale nenašiel som jednoznačnú zmenu tejto obrazovky.')
      } else {
        const warning = application.warnings.length
          ? ` ${application.warnings.join(' ')}`
          : ''
        setResultMessage(`Vyplnené: ${application.appliedFields.join(', ')}.${warning}`)
      }
    } catch (error) {
      const code = error instanceof Error ? error.message : ''
      if (code === 'MODEL_NOT_READY') {
        setLocalError('Najprv stiahni jazykový model na domovskej obrazovke.')
      } else {
        setLocalError('Pokyn sa nepodarilo dokončiť. Pôvodný prepis zostal zachovaný, takže ho môžeš skúsiť znova.')
      }
    } finally {
      processingRef.current = false
    }
  }

  const submitTranscript = () => {
    if (submittedRef.current) return
    const spokenText = transcriptRef.current.trim()
    if (!spokenText) return
    submittedRef.current = true
    void processTranscript(spokenText)
  }

  useSpeechRecognitionEvent('start', () => {
    setListening(true)
    setLocalError('')
    setResultMessage('')
  })
  useSpeechRecognitionEvent('end', () => {
    setListening(false)
    if (finishRequestedRef.current) {
      submitTranscript()
      return
    }
    if (voiceSessionRef.current) {
      setTimeout(() => {
        if (voiceSessionRef.current) void restartRecognitionRef.current(true)
      }, 350)
    }
  })
  useSpeechRecognitionEvent('result', (event) => {
    // results contains alternative guesses, not consecutive sentences. Use
    // only the best guess and accumulate final Android segments separately.
    const bestResult = event.results[0]
    const segment = bestResult?.transcript?.trim() ?? ''
    const text = [finalTranscriptRef.current, segment]
      .filter(Boolean)
      .join(' ')
      .trim()
    if (text) {
      transcriptRef.current = text
      setTranscript(text)
    }
    if (event.isFinal && segment) {
      finalTranscriptRef.current = text
      const confidence = bestResult?.confidence ?? -1
      if (confidence > 0 && confidence < 0.35) {
        setLocalError('Prepis si nie je istý. Skús pokyn zopakovať pomalšie a zreteľnejšie.')
        return
      }
      // Keep listening and collect every sentence until the user confirms it.
    }
  })
  useSpeechRecognitionEvent('error', (event) => {
    setListening(false)
    const message = friendlySpeechError(event.error)
    if (message) setLocalError(message)
  })

  const startListening = async (preserveTranscript = false) => {
    if (!modelReady || processing) return
    if (!preserveTranscript) {
      setTranscript('')
      setLocalError('')
      setResultMessage('')
      lastProcessedRef.current = ''
      finalTranscriptRef.current = ''
      transcriptRef.current = ''
      submittedRef.current = false
      finishRequestedRef.current = false
    }
    voiceSessionRef.current = true
    if (!ExpoSpeechRecognitionModule.isRecognitionAvailable()) {
      setLocalError('Na tomto zariadení nie je dostupné rozpoznávanie reči.')
      return
    }
    const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync()
    if (!permission.granted) {
      setLocalError('Bez povolenia mikrofónu sa hlasové vypĺňanie nedá spustiť.')
      return
    }

    let androidRecognitionServicePackage: string | undefined
    if (Platform.OS === 'android') {
      const services = ExpoSpeechRecognitionModule.getSpeechRecognitionServices()
      androidRecognitionServicePackage = [
        'com.google.android.googlequicksearchbox',
        'com.google.android.tts',
      ].find((service) => services.includes(service))
      if (!androidRecognitionServicePackage) {
        setLocalError('Pre slovenský hlasový prepis treba mať nainštalovanú alebo aktualizovanú aplikáciu Google.')
        return
      }
    }
    ExpoSpeechRecognitionModule.start({
      lang: 'sk-SK',
      interimResults: true,
      maxAlternatives: 1,
      continuous: true,
      requiresOnDeviceRecognition: false,
      androidRecognitionServicePackage,
      androidIntentOptions: {
        EXTRA_LANGUAGE_MODEL: 'web_search',
        EXTRA_PREFER_OFFLINE: false,
      },
      contextualStrings: [
        ...snapshot.allowedSports,
        'turnaj',
        'liga',
        'štartovné',
        'kapacita',
        'juniori',
        'veteráni',
      ],
      iosTaskHint: 'dictation',
    })
  }
  restartRecognitionRef.current = startListening

  const close = () => {
    voiceSessionRef.current = false
    if (listening) ExpoSpeechRecognitionModule.abort()
    setListening(false)
    setVisible(false)
  }

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Hlasové vyplnenie eventu"
        onPress={() => setVisible(true)}
        style={[
          localAiStyles.assistantTrigger,
          avoidCloseButton && { right: 42 },
          modelReady && localAiStyles.assistantTriggerReady,
        ]}
      >
        <Text style={[
          localAiStyles.assistantTriggerText,
          modelReady && localAiStyles.assistantTriggerTextReady,
        ]}>
          ✦
        </Text>
      </Pressable>

      <SystemModal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={close}
      >
        <View style={localAiStyles.assistantOverlay}>
          <View style={localAiStyles.assistantPanel}>
            <View style={localAiStyles.assistantHeader}>
              <View style={[
                localAiStyles.assistantOrb,
                listening && localAiStyles.assistantOrbListening,
              ]}>
                <Text style={localAiStyles.assistantOrbText}>{listening ? '●' : 'AI'}</Text>
              </View>
              <View style={localAiStyles.assistantHeaderCopy}>
                <Text style={localAiStyles.assistantTitle}>Vyplniť hlasom</Text>
                <Text style={localAiStyles.assistantStatus}>
                  {!modelReady
                    ? 'Model nie je stiahnutý'
                    : listening
                      ? 'Počúvam…'
                      : processing
                        ? 'Premýšľam nad pokynom…'
                        : 'Gemma 4 je pripravená'}
                </Text>
              </View>
              <Pressable accessibilityLabel="Zavrieť" onPress={close}>
                <Text style={localAiStyles.closeText}>×</Text>
              </Pressable>
            </View>

            <Text style={localAiStyles.transcript}>
              {transcript || 'Napríklad: Vytvor futbalový turnaj Letný pohár 18. augusta o 10:00 v Košiciach.'}
            </Text>
            <Text style={localAiStyles.assistantHint}>
              Model iba doplní polia formulára. Event neodošle ani nevytvorí bez tvojho potvrdenia.
            </Text>

            {!modelReady ? (
              <Text style={localAiStyles.assistantError}>
                Stiahni Gemmu na domovskej obrazovke a potom sa sem vráť.
              </Text>
            ) : (
              <Pressable
                disabled={processing}
                onPress={() => {
                  if (listening) {
                    finishRequestedRef.current = true
                    voiceSessionRef.current = false
                    ExpoSpeechRecognitionModule.stop()
                  }
                  else void startListening()
                }}
                style={[
                  localAiStyles.listenButton,
                  listening && localAiStyles.listenButtonActive,
                  processing && localAiStyles.listenButtonDisabled,
                ]}
              >
                <Text style={localAiStyles.listenButtonText}>
                  {listening ? 'Dokončiť pokyn' : processing ? 'Premýšľam…' : 'Začať hovoriť'}
                </Text>
              </Pressable>
            )}

            {resultMessage ? <Text style={localAiStyles.result}>{resultMessage}</Text> : null}
            {localError ? <Text style={localAiStyles.assistantError}>{localError}</Text> : null}
          </View>
        </View>
      </SystemModal>
    </>
  )
}
