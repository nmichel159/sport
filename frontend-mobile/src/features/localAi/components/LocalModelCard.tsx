import { ActivityIndicator, Pressable, Text, View } from 'react-native'
import {
  formatModelSize,
  LOCAL_MODEL,
  useLocalAi,
} from '../LocalAiContext'
import { localAiStyles } from '../localAiStyles'

export function LocalModelCard() {
  const {
    status,
    progress,
    error,
    downloadModel,
    pauseDownload,
    removeModel,
  } = useLocalAi()
  const percentage = Math.round(progress * 100)
  const isReady = status === 'ready' || status === 'loading' || status === 'processing'

  return (
    <View style={localAiStyles.modelCard}>
      <View style={localAiStyles.modelHeader}>
        <View style={localAiStyles.modelIcon}>
          <Text style={localAiStyles.modelIconText}>AI</Text>
        </View>
        <View style={localAiStyles.modelCopy}>
          <Text style={localAiStyles.eyebrow}>LOKÁLNY ASISTENT</Text>
          <Text style={localAiStyles.modelTitle}>{LOCAL_MODEL.shortName}</Text>
          <Text style={localAiStyles.modelDescription}>
            Hlasom vyplní formulár eventu. Model zostáva v zariadení · {formatModelSize(LOCAL_MODEL.sizeBytes)}.
          </Text>
        </View>
      </View>

      {status === 'checking' ? <ActivityIndicator color="#ffd400" /> : null}

      {status === 'downloading' || status === 'paused' ? (
        <>
          <View style={localAiStyles.progressTrack}>
            <View style={[localAiStyles.progressFill, { width: `${percentage}%` }]} />
          </View>
          <Text style={localAiStyles.progressLabel}>
            {status === 'paused' ? 'Pozastavené' : 'Sťahujem'} · {percentage} %
          </Text>
        </>
      ) : null}

      {isReady ? (
        <View style={localAiStyles.readyRow}>
          <View style={localAiStyles.readyDot} />
          <Text style={localAiStyles.readyText}>
            {status === 'loading'
              ? 'Model sa spúšťa…'
              : status === 'processing'
                ? 'Model spracúva pokyn…'
                : 'Pripravený na hlasové vypĺňanie'}
          </Text>
        </View>
      ) : null}

      {error ? <Text style={localAiStyles.error}>{error}</Text> : null}

      <View style={localAiStyles.actions}>
        {status === 'missing' || status === 'error' || status === 'paused' ? (
          <Pressable
            accessibilityRole="button"
            style={localAiStyles.primaryAction}
            onPress={() => { void downloadModel() }}
          >
            <Text style={localAiStyles.primaryActionText}>
              {status === 'paused' ? 'Pokračovať v sťahovaní' : 'Stiahnuť jazykový model'}
            </Text>
          </Pressable>
        ) : null}
        {status === 'downloading' ? (
          <Pressable style={localAiStyles.secondaryAction} onPress={() => { void pauseDownload() }}>
            <Text style={localAiStyles.secondaryActionText}>Pozastaviť</Text>
          </Pressable>
        ) : null}
        {isReady ? (
          <Pressable style={localAiStyles.secondaryAction} onPress={() => { void removeModel() }}>
            <Text style={localAiStyles.secondaryActionText}>Odstrániť</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  )
}
