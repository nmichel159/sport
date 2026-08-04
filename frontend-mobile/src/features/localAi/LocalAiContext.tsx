import AsyncStorage from '@react-native-async-storage/async-storage'
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { Platform } from 'react-native'
import {
  createDownloadResumable,
  deleteAsync,
  documentDirectory,
  getFreeDiskStorageAsync,
  getInfoAsync,
  makeDirectoryAsync,
  type DownloadResumable,
} from 'expo-file-system/legacy'
import { initLlama, loadLlamaModelInfo, type LlamaContext } from 'llama.rn'
import type {
  AssistantHistoryTurn,
  EventFormAssistantPatch,
  EventFormAssistantSnapshot,
} from './types'
import {
  buildEventAgentPrompt,
  buildEventFormScreenContext,
  eventAssistantJsonSchema,
  groundEventAssistantPlan,
  parseEventAssistantPlan,
} from './eventFormAgent'
import { toIsoDate } from '../../utils/date'

export const LOCAL_MODEL = {
  name: 'Gemma 4 E2B Instruct Q4_0',
  shortName: 'Gemma 4 E2B',
  fileName: 'gemma-4-E2B_q4_0-it.gguf',
  sizeBytes: 3_349_516_256,
  sourceUrl:
    'https://huggingface.co/google/gemma-4-E2B-it-qat-q4_0-gguf/resolve/675cff42a74c774d6cb76f76d8eacb49b48c9b93/gemma-4-E2B_q4_0-it.gguf?download=true',
  sourcePage:
    'https://huggingface.co/google/gemma-4-E2B-it-qat-q4_0-gguf',
} as const

const MODEL_DIRECTORY = `${documentDirectory ?? ''}local-models/`
const MODEL_PATH = `${MODEL_DIRECTORY}${LOCAL_MODEL.fileName}`
const MINIMUM_DOWNLOAD_HEADROOM = 1024 * 1024 * 1024
const PARTIAL_DOWNLOAD_KEY = 'sport.local-ai.gemma4.partial'

export type LocalModelStatus =
  | 'checking'
  | 'missing'
  | 'downloading'
  | 'paused'
  | 'ready'
  | 'loading'
  | 'processing'
  | 'error'

type LocalAiValue = {
  status: LocalModelStatus
  progress: number
  error: string
  downloadModel: () => Promise<void>
  pauseDownload: () => Promise<void>
  removeModel: () => Promise<void>
  runEventFormCommand: (
    command: string,
    snapshot: EventFormAssistantSnapshot,
  ) => Promise<EventFormAssistantPatch>
}

const LocalAiContext = createContext<LocalAiValue | null>(null)

export function LocalAiProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<LocalModelStatus>('checking')
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const contextRef = useRef<LlamaContext | null>(null)
  const downloadRef = useRef<DownloadResumable | null>(null)
  const assistantHistoryRef = useRef<AssistantHistoryTurn[]>([])

  useEffect(() => {
    let active = true
    void getInfoAsync(MODEL_PATH)
      .then(async (info) => {
        if (!active) return
        if (info.exists && info.size === LOCAL_MODEL.sizeBytes) {
          setProgress(1)
          setStatus('ready')
          return
        }
        const partialState = await AsyncStorage.getItem(PARTIAL_DOWNLOAD_KEY)
        if (!active) return
        if (info.exists && info.size && info.size > 0 && partialState) {
          setProgress(Math.min(info.size / LOCAL_MODEL.sizeBytes, 0.99))
          setStatus('paused')
          return
        }
        if (info.exists) await deleteAsync(MODEL_PATH, { idempotent: true })
        setStatus('missing')
      })
      .catch(() => {
        if (!active) return
        setError('Stav jazykového modelu sa nepodarilo overiť.')
        setStatus('error')
      })
    return () => { active = false }
  }, [])

  const validateDownloadedModel = useCallback(async () => {
    const info = await getInfoAsync(MODEL_PATH)
    if (!info.exists || info.size !== LOCAL_MODEL.sizeBytes) {
      throw new Error('MODEL_SIZE_MISMATCH')
    }
    await loadLlamaModelInfo(MODEL_PATH)
    await AsyncStorage.removeItem(PARTIAL_DOWNLOAD_KEY)
    setProgress(1)
    setStatus('ready')
  }, [])

  const downloadModel = useCallback(async () => {
    if (!documentDirectory || status === 'downloading') return
    setError('')
    try {
      const existing = await getInfoAsync(MODEL_PATH)
      const remainingBytes = Math.max(
        LOCAL_MODEL.sizeBytes - (existing.exists ? existing.size ?? 0 : 0),
        0,
      )
      const freeBytes = await getFreeDiskStorageAsync()
      if (freeBytes < remainingBytes + MINIMUM_DOWNLOAD_HEADROOM) {
        throw new Error('NOT_ENOUGH_STORAGE')
      }

      await makeDirectoryAsync(MODEL_DIRECTORY, { intermediates: true })
      const stored = await AsyncStorage.getItem(PARTIAL_DOWNLOAD_KEY)
      const saved = stored
        ? JSON.parse(stored) as { resumeData?: string }
        : undefined
      const task = createDownloadResumable(
        LOCAL_MODEL.sourceUrl,
        MODEL_PATH,
        {},
        ({ totalBytesWritten, totalBytesExpectedToWrite }) => {
          const expected = totalBytesExpectedToWrite || LOCAL_MODEL.sizeBytes
          setProgress(Math.min(totalBytesWritten / expected, 0.99))
        },
        saved?.resumeData,
      )
      downloadRef.current = task
      setStatus('downloading')
      const result = saved?.resumeData
        ? await task.resumeAsync()
        : await task.downloadAsync()
      downloadRef.current = null
      if (!result) return
      await validateDownloadedModel()
    } catch (downloadError) {
      const interruptedTask = downloadRef.current
      if (interruptedTask) {
        try {
          await AsyncStorage.setItem(
            PARTIAL_DOWNLOAD_KEY,
            JSON.stringify(interruptedTask.savable()),
          )
        } catch {
          // A manual retry can still restart the download if resume data is unavailable.
        }
      }
      downloadRef.current = null
      if (downloadError instanceof Error && downloadError.message === 'NOT_ENOUGH_STORAGE') {
        setError('Na stiahnutie modelu treba približne 4,4 GB voľného miesta.')
        setStatus('missing')
        return
      }
      setError('Sťahovanie sa prerušilo. Môžeš v ňom pokračovať.')
      setStatus('paused')
    }
  }, [status, validateDownloadedModel])

  const pauseDownload = useCallback(async () => {
    const task = downloadRef.current
    if (!task) return
    try {
      const state = await task.pauseAsync()
      await AsyncStorage.setItem(PARTIAL_DOWNLOAD_KEY, JSON.stringify(state))
      downloadRef.current = null
      setStatus('paused')
    } catch {
      setError('Sťahovanie sa nepodarilo pozastaviť.')
    }
  }, [])

  const removeModel = useCallback(async () => {
    if (downloadRef.current) await downloadRef.current.cancelAsync()
    downloadRef.current = null
    if (contextRef.current) await contextRef.current.release()
    contextRef.current = null
    await deleteAsync(MODEL_PATH, { idempotent: true })
    await AsyncStorage.removeItem(PARTIAL_DOWNLOAD_KEY)
    setProgress(0)
    setError('')
    setStatus('missing')
  }, [])

  const ensureContext = useCallback(async () => {
    if (contextRef.current) return contextRef.current
    setStatus('loading')
    setError('')
    const baseOptions = {
      model: MODEL_PATH,
      n_ctx: 6144,
      n_batch: 256,
      n_ubatch: 128,
      use_mlock: false,
    }
    try {
      contextRef.current = await initLlama({
        ...baseOptions,
        n_gpu_layers: 99,
      })
    } catch {
      contextRef.current = await initLlama({
        ...baseOptions,
        n_gpu_layers: 0,
      })
    }
    return contextRef.current
  }, [])

  const runEventFormCommand = useCallback(async (
    command: string,
    snapshot: EventFormAssistantSnapshot,
  ) => {
    if (status === 'missing' || status === 'paused' || status === 'downloading') {
      throw new Error('MODEL_NOT_READY')
    }
    try {
      const context = await ensureContext()
      setStatus('processing')
      await context.clearCache(false)
      const currentDate = toIsoDate(new Date())
      const screen = buildEventFormScreenContext(snapshot, currentDate)
      const schema = eventAssistantJsonSchema(snapshot.allowedSports)
      const result = await context.completion({
        messages: [
          {
            role: 'system',
            content: 'You are a careful local UI action planner. Think through the complete goal and return only actions permitted by the supplied screen context.',
          },
          {
            role: 'user',
            content: buildEventAgentPrompt(
              command,
              screen,
              assistantHistoryRef.current,
            ),
          },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: { strict: true, schema },
        },
        chat_template_kwargs: { preserve_thinking: true },
        enable_thinking: true,
        thinking_forced_open: true,
        reasoning_format: 'auto',
        thinking_budget_tokens: 640,
        thinking_budget_message: 'Finish evaluating the instruction and emit the best valid action plan now.',
        n_predict: 1200,
        temperature: 0.15,
        top_k: 20,
        top_p: 0.9,
        seed: 42,
      })
      let plan
      try {
        plan = parseEventAssistantPlan(result.content || result.text)
      } catch {
        // The deterministic grounding layer can still complete direct option
        // selections if a small local model emitted malformed structure.
        plan = { actions: [] }
      }
      const parsed = groundEventAssistantPlan(command, snapshot, plan)
      assistantHistoryRef.current = [
        ...assistantHistoryRef.current,
        {
          screenId: screen.screenId,
          instruction: command,
          appliedTargets: Object.keys(parsed),
        },
      ].slice(-4)
      setError('')
      setStatus('ready')
      return parsed
    } catch (commandError) {
      if (contextRef.current) {
        setStatus('ready')
      } else {
        setError('Model sa na tomto zariadení nepodarilo spustiť.')
        setStatus('error')
      }
      if (Platform.OS === 'web') {
        throw new Error('MODEL_MOBILE_ONLY')
      }
      throw commandError
    }
  }, [ensureContext, status])

  const value = useMemo<LocalAiValue>(() => ({
    status,
    progress,
    error,
    downloadModel,
    pauseDownload,
    removeModel,
    runEventFormCommand,
  }), [
    downloadModel,
    error,
    pauseDownload,
    progress,
    removeModel,
    runEventFormCommand,
    status,
  ])

  return <LocalAiContext.Provider value={value}>{children}</LocalAiContext.Provider>
}

export function useLocalAi() {
  const value = useContext(LocalAiContext)
  if (!value) throw new Error('useLocalAi must be used inside LocalAiProvider')
  return value
}

export function formatModelSize(bytes: number) {
  return `${(bytes / 1_000_000_000).toFixed(2)} GB`
}
