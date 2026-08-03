import { useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native'
import { AppTextInput } from '../../../components/AppTextInput'
import { SystemModal } from '../../../system/SystemModal'
import { matchResultStyles as styles } from '../../../styles/matchResultStyles'
import type {
  MatchResultDetail,
  MatchResultPayload,
} from '../../../types/domain'

type Props = {
  visible: boolean
  detail: MatchResultDetail | null
  editable?: boolean
  onClose: () => void
  onSave: (payload: MatchResultPayload) => Promise<void>
}

const errors: Record<string, string> = {
  DRAW_NOT_ALLOWED: 'V pavúku nemôže zápas skončiť remízou.',
  SCORER_TOTAL_MISMATCH:
    'Súčet gólov strelcov musí sedieť s konečným skóre oboch tímov.',
  SCORER_NOT_IN_MATCH: 'Vybraný strelec nepatrí k tomuto zápasu.',
  MVP_NOT_IN_MATCH: 'Vybraný MVP nepatrí k tomuto zápasu.',
  GROUP_STAGE_LOCKED: 'Skupinová fáza je už uzavretá.',
}

export function MatchResultModal({
  visible,
  detail: suppliedDetail,
  editable = true,
  onClose,
  onSave,
}: Props) {
  const [detail, setDetail] = useState<MatchResultDetail | null>(null)
  const [scoreA, setScoreA] = useState('')
  const [scoreB, setScoreB] = useState('')
  const [pitch, setPitch] = useState('')
  const [start, setStart] = useState('')
  const [goals, setGoals] = useState<Record<string, number>>({})
  const [mvpId, setMvpId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!visible || !suppliedDetail) return
    setLoading(false)
    setError('')
    setDetail(suppliedDetail)
    setScoreA(suppliedDetail.score_a?.toString() ?? '')
    setScoreB(suppliedDetail.score_b?.toString() ?? '')
    setPitch(suppliedDetail.pitch ?? '')
    setStart(suppliedDetail.scheduled_start?.slice(0, 5) ?? '')
    setGoals(
      Object.fromEntries(
        suppliedDetail.scorers.map((scorer) => [
          scorer.user_id,
          scorer.goals,
        ]),
      ),
    )
    setMvpId(suppliedDetail.mvp_user_id)
    // Sync status changes must not erase a result currently being typed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suppliedDetail?.match_id, visible])

  const playersBySide = useMemo(
    () => ({
      A: detail?.players.filter((player) => player.side === 'A') ?? [],
      B: detail?.players.filter((player) => player.side === 'B') ?? [],
    }),
    [detail],
  )

  const changeScore = (
    setter: (value: string) => void,
    value: string,
  ) => {
    if (/^\d{0,3}$/.test(value)) setter(value)
  }

  const changeGoals = (userId: string, amount: number) => {
    setGoals((current) => ({
      ...current,
      [userId]: Math.max(0, (current[userId] ?? 0) + amount),
    }))
  }

  const save = async () => {
    if (!detail) return
    const parsedA = Number(scoreA)
    const parsedB = Number(scoreB)
    if (
      scoreA === '' ||
      scoreB === '' ||
      !Number.isInteger(parsedA) ||
      !Number.isInteger(parsedB)
    ) {
      setError('Vyplň konečné skóre oboch strán.')
      return
    }
    if (start && !/^([01]\d|2[0-3]):[0-5]\d$/.test(start)) {
      setError('Čas zadaj vo formáte HH:MM, napríklad 10:20.')
      return
    }

    setSaving(true)
    setError('')
    try {
      await onSave({
        score_a: parsedA,
        score_b: parsedB,
        pitch: pitch.trim() || null,
        scheduled_start: start || null,
        mvp_user_id: detail.supports_mvp ? mvpId : null,
        scorers: detail.supports_scorers
          ? Object.entries(goals)
              .filter(([, count]) => count > 0)
              .map(([userId, count]) => ({
                user_id: userId,
                goals: count,
              }))
          : [],
      })
      onClose()
    } catch (caught) {
      const code = caught instanceof Error ? caught.message : ''
      setError(errors[code] ?? 'Výsledok sa nepodarilo uložiť.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <SystemModal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={styles.sheet}
          onPress={(event) => event.stopPropagation()}
        >
          <View style={styles.handle} />
          <Pressable
            accessibilityLabel="Zavrieť detail zápasu"
            onPress={onClose}
            style={styles.close}
          >
            <Text style={styles.closeText}>×</Text>
          </Pressable>
          {loading ||
          (visible && suppliedDetail?.match_id !== detail?.match_id) ? (
            <View style={{ minHeight: 320, justifyContent: 'center' }}>
              <ActivityIndicator color="#ffd400" size="large" />
            </View>
          ) : suppliedDetail && detail ? (
            <ScrollView
              contentContainerStyle={styles.content}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.header}>
                <Text style={styles.eyebrow}>DETAIL ZÁPASU · {detail.sport}</Text>
                <Text style={styles.title}>
                  {detail.score_a === null ? 'Zapísať výsledok' : 'Upraviť výsledok'}
                </Text>
                <Text style={styles.subtitle}>
                  Konečné skóre, strelci a MVP sa uložia k tomuto zápasu.
                </Text>
              </View>

              <View style={styles.scoreCard}>
                <View style={styles.scoreRow}>
                  <View style={styles.scoreSide}>
                    <Text style={styles.teamName}>{detail.participant_a.name}</Text>
                    <AppTextInput
                      value={scoreA}
                      editable={editable}
                      onChangeText={(value) => changeScore(setScoreA, value)}
                      keyboardType="number-pad"
                      placeholder="0"
                      style={styles.scoreInput}
                    />
                  </View>
                  <Text style={styles.scoreDivider}>:</Text>
                  <View style={styles.scoreSide}>
                    <Text style={styles.teamName}>{detail.participant_b.name}</Text>
                    <AppTextInput
                      value={scoreB}
                      editable={editable}
                      onChangeText={(value) => changeScore(setScoreB, value)}
                      keyboardType="number-pad"
                      placeholder="0"
                      style={styles.scoreInput}
                    />
                  </View>
                </View>
              </View>

              <View style={styles.metaRow}>
                <View style={styles.metaField}>
                  <Text style={styles.label}>IHRISKO / DVOREC</Text>
                  <AppTextInput
                    value={pitch}
                    editable={editable}
                    onChangeText={setPitch}
                    maxLength={40}
                    placeholder="napr. 2"
                    style={styles.input}
                  />
                </View>
                <View style={styles.metaField}>
                  <Text style={styles.label}>ČAS</Text>
                  <AppTextInput
                    value={start}
                    editable={editable}
                    onChangeText={setStart}
                    maxLength={5}
                    placeholder="10:20"
                    keyboardType="numbers-and-punctuation"
                    style={styles.input}
                  />
                </View>
              </View>

              {detail.supports_scorers ? (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Strelci gólov</Text>
                  <Text style={styles.sectionHint}>
                    Pri každom hráčovi nastav počet gólov. Súčet musí zodpovedať skóre tímu.
                  </Text>
                  {(['A', 'B'] as const).map((side) => (
                    <View key={side} style={styles.playerGroup}>
                      <Text style={styles.sideLabel}>
                        {side === 'A'
                          ? detail.participant_a.name
                          : detail.participant_b.name}
                      </Text>
                      {playersBySide[side].map((player) => (
                        <View key={player.id} style={styles.playerRow}>
                          <View style={styles.playerInfo}>
                            <Text style={styles.playerName}>{player.name}</Text>
                            <Text style={styles.playerId}>
                              ID {player.id.slice(0, 8)}
                            </Text>
                          </View>
                          <Pressable
                            disabled={!editable}
                            style={styles.stepButton}
                            onPress={() => changeGoals(player.id, -1)}
                          >
                            <Text style={styles.stepText}>−</Text>
                          </Pressable>
                          <Text style={styles.goalCount}>
                            {goals[player.id] ?? 0}
                          </Text>
                          <Pressable
                            disabled={!editable}
                            style={styles.stepButton}
                            onPress={() => changeGoals(player.id, 1)}
                          >
                            <Text style={styles.stepText}>+</Text>
                          </Pressable>
                        </View>
                      ))}
                    </View>
                  ))}
                </View>
              ) : null}

              {detail.supports_mvp ? (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>MVP zápasu</Text>
                  <Text style={styles.sectionHint}>
                    Vyber najlepšieho hráča zápasu. Pole je voliteľné.
                  </Text>
                  {detail.players.map((player) => {
                    const selected = mvpId === player.id
                    return (
                      <Pressable
                        key={player.id}
                        disabled={!editable}
                        onPress={() => setMvpId(player.id)}
                        style={[
                          styles.mvpRow,
                          selected && styles.mvpRowSelected,
                        ]}
                      >
                        <View
                          style={[
                            styles.radio,
                            selected && styles.radioSelected,
                          ]}
                        />
                        <Text style={styles.mvpName}>{player.name}</Text>
                        <Text style={styles.playerId}>TÍM {player.side}</Text>
                      </Pressable>
                    )
                  })}
                  {mvpId ? (
                    <Pressable
                      disabled={!editable}
                      style={styles.clearMvp}
                      onPress={() => setMvpId(null)}
                    >
                      <Text style={styles.clearMvpText}>Zrušiť výber MVP</Text>
                    </Pressable>
                  ) : null}
                </View>
              ) : null}

              {error ? <Text style={styles.error}>{error}</Text> : null}
              {editable ? (
                <Pressable
                  disabled={saving}
                  onPress={() => void save()}
                  style={[styles.save, saving && styles.saveDisabled]}
                >
                  <Text style={styles.saveText}>
                    {saving ? 'Ukladám…' : 'Uložiť výsledok zápasu'}
                  </Text>
                </Pressable>
              ) : null}
            </ScrollView>
          ) : (
            <View style={{ minHeight: 280, padding: 24 }}>
              <Text style={styles.error}>
                {error || 'Detail zápasu nie je dostupný.'}
              </Text>
            </View>
          )}
        </Pressable>
      </Pressable>
    </SystemModal>
  )
}
