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

type GoalEntry = {
  id: string
  side: 'A' | 'B'
  scorerId: string | null
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
  const [goalEntries, setGoalEntries] = useState<GoalEntry[]>([])
  const [expandedGoalId, setExpandedGoalId] = useState<string | null>(null)
  const [mvpId, setMvpId] = useState<string | null>(null)
  const [mvpExpanded, setMvpExpanded] = useState(false)
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
    const playerSide = new Map(suppliedDetail.players.map((player) => [player.id, player.side]))
    const restored = suppliedDetail.scorers.flatMap((scorer, scorerIndex) =>
      Array.from({ length: scorer.goals }, (_, goalIndex) => ({
        id: `saved-${scorer.user_id}-${scorerIndex}-${goalIndex}`,
        side: playerSide.get(scorer.user_id) ?? 'A',
        scorerId: scorer.user_id,
      })),
    )
    const addUnassigned = (side: 'A' | 'B', score: number | null) => {
      const missing = Math.max(0, (score ?? 0) - restored.filter((goal) => goal.side === side).length)
      return Array.from({ length: missing }, (_, index) => ({
        id: `saved-${side}-unassigned-${index}`,
        side,
        scorerId: null,
      }))
    }
    setGoalEntries([...restored, ...addUnassigned('A', suppliedDetail.score_a), ...addUnassigned('B', suppliedDetail.score_b)])
    setMvpId(suppliedDetail.mvp_user_id)
    setMvpExpanded(false)
    setExpandedGoalId(null)
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

  const stepScore = (side: 'A' | 'B', amount: number) => {
    const value = side === 'A' ? scoreA : scoreB
    const setter = side === 'A' ? setScoreA : setScoreB
    const next = Math.max(0, Math.min(999, Number(value || 0) + amount))
    setter(String(next))
    if (!detail?.supports_scorers) return
    if (amount > 0) {
      const id = `goal-${Date.now()}-${Math.random().toString(36).slice(2)}`
      setGoalEntries((current) => [...current, { id, side, scorerId: null }])
      setExpandedGoalId(id)
    } else if (amount < 0) {
      setGoalEntries((current) => {
        const index = current.map((goal) => goal.side).lastIndexOf(side)
        return index < 0 ? current : current.filter((_, goalIndex) => goalIndex !== index)
      })
    }
  }

  const selectScorer = (goalId: string, scorerId: string) => {
    setGoalEntries((current) => current.map((goal) => goal.id === goalId ? { ...goal, scorerId } : goal))
    setExpandedGoalId(null)
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
    if (detail.supports_scorers && goalEntries.some((goal) => !goal.scorerId)) {
      setError('Vyber strelca pri každom zaznamenanom góle.')
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
          ? Object.entries(
              goalEntries.reduce<Record<string, number>>((totals, goal) => {
                if (goal.scorerId) totals[goal.scorerId] = (totals[goal.scorerId] ?? 0) + 1
                return totals
              }, {}),
            ).map(([userId, goals]) => ({ user_id: userId, goals }))
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
            <>
            <ScrollView
              style={styles.scrollArea}
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
                    <Pressable disabled={!editable} onPress={() => stepScore('A', 1)} style={styles.scoreTap}>
                      <Text style={styles.scoreValue}>{scoreA || '0'}</Text>
                      <Text style={styles.scoreTapHint}>KLIKNUTÍM +1</Text>
                    </Pressable>
                    {editable ? <Pressable onPress={() => stepScore('A', -1)} style={styles.scoreMinus}><Text style={styles.scoreMinusText}>− odobrať</Text></Pressable> : null}
                  </View>
                  <Text style={styles.scoreDivider}>:</Text>
                  <View style={styles.scoreSide}>
                    <Text style={styles.teamName}>{detail.participant_b.name}</Text>
                    <Pressable disabled={!editable} onPress={() => stepScore('B', 1)} style={styles.scoreTap}>
                      <Text style={styles.scoreValue}>{scoreB || '0'}</Text>
                      <Text style={styles.scoreTapHint}>KLIKNUTÍM +1</Text>
                    </Pressable>
                    {editable ? <Pressable onPress={() => stepScore('B', -1)} style={styles.scoreMinus}><Text style={styles.scoreMinusText}>− odobrať</Text></Pressable> : null}
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
                  {([true] as const).map(() => {
                    const teamGoals = goalEntries
                    const teamName = ''
                    return (
                      <View key="goal-timeline" style={styles.playerGroup}>
                        {teamGoals.length === 0 ? <Text style={styles.scorerSummary}>Zatiaľ bez gólu.</Text> : null}
                        {teamGoals.map((goal, index) => {
                          const goalSide = goal.side
                          const teamName = goalSide === 'A' ? detail.participant_a.name : detail.participant_b.name
                          const open = expandedGoalId === goal.id
                          const scorer = detail.players.find((player) => player.id === goal.scorerId)
                          return (
                            <View key={goal.id} style={[styles.goalEntry, goalSide === 'A' ? styles.goalEntryTeamA : styles.goalEntryTeamB]}>
                              <Pressable disabled={!editable} onPress={() => setExpandedGoalId(open ? null : goal.id)} style={styles.goalEntryHeader}>
                                <View style={[styles.goalNumber, goalSide === 'A' ? styles.goalNumberTeamA : styles.goalNumberTeamB]}>
                                  <Text style={styles.goalNumberText}>{index + 1}</Text>
                                </View>
                                <View style={styles.goalEntryCopy}>
                                  <View style={[styles.teamBadge, goalSide === 'A' ? styles.teamBadgeA : styles.teamBadgeB]}>
                                    <Text numberOfLines={1} style={[styles.teamBadgeText, goalSide === 'A' ? styles.teamBadgeTextA : styles.teamBadgeTextB]}>{teamName}</Text>
                                  </View>
                                  <Text style={styles.goalEntryTitle}>Gól {teamName} · {index + 1}</Text>
                                  <Text style={goal.scorerId ? styles.goalEntrySelected : styles.goalEntryPrompt}>
                                    {scorer ? scorer.name : 'Vybrať strelca'}
                                  </Text>
                                </View>
                                <Text style={styles.scorerChevron}>{open ? '⌃' : '⌄'}</Text>
                              </Pressable>
                              {open ? <View style={styles.rosterList}>
                                <Text style={styles.rosterPrompt}>Kto strelil tento gól?</Text>
                                <View style={styles.rosterGrid}>
                                {playersBySide[goalSide].map((player) => {
                                  const selected = player.id === goal.scorerId
                                  return <Pressable key={player.id} disabled={!editable} onPress={() => selectScorer(goal.id, player.id)} style={[styles.rosterPlayer, selected && styles.rosterPlayerSelected]}>
                                    <Text style={styles.playerName}>{player.name}</Text>
                                    {selected ? <Text style={styles.rosterSelectedMark}>✓</Text> : null}
                                  </Pressable>
                                })}
                                </View>
                              </View> : null}
                            </View>
                          )
                        })}
                      </View>
                    )
                  })}
                </View>
              ) : null}

              {detail.supports_mvp ? (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>MVP zápasu</Text>
                  <Text style={styles.sectionHint}>
                    Vyber najlepšieho hráča zápasu. Pole je voliteľné.
                  </Text>
                  <Pressable style={styles.mvpToggle} onPress={() => setMvpExpanded((current) => !current)}>
                    <Text style={styles.mvpToggleText}>{mvpExpanded ? 'Skryť výber MVP' : mvpId ? 'Zmeniť MVP' : 'Vybrať MVP'}</Text>
                    <Text style={styles.mvpToggleChevron}>{mvpExpanded ? '⌃' : '⌄'}</Text>
                  </Pressable>
                  {mvpExpanded ? detail.players.map((player) => {
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
                  }) : null}
                  {mvpExpanded && mvpId ? (
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
            </>
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
