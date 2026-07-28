import { useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native'
import { AppTextInput } from '../../../components/AppTextInput'
import { bracketStyles } from '../../../styles/bracketStyles'
import { formStyles } from '../../../styles/formStyles'
import { teamStyles } from '../../../styles/teamStyles'
import type {
  ApiEvent,
  AuthenticatedFetch,
  BracketMatch,
  EventBracket,
} from '../../../types/domain'
import { requestEventBracket } from '../services/organizationApi'

type Props = {
  event: ApiEvent
  organizationId: string
  fetcher: AuthenticatedFetch
  onBack: () => void
}

type ScoreDraft = { a: string; b: string }

const errorMessages: Record<string, string> = {
  NOT_ENOUGH_PARTICIPANTS:
    'Na vygenerovanie pavúka sú potrební aspoň dvaja účastníci.',
  SINGLE_ELIMINATION_REQUIRED:
    'Tento event nemá zvolený systém Pavúk.',
  DRAW_NOT_ALLOWED:
    'V pavúkovom systéme nemôže zápas skončiť remízou.',
  MATCH_NOT_READY: 'Najprv musia byť známi obaja súperi.',
}

function roundTitle(round: number, total: number) {
  const remaining = total - round
  if (remaining === 0) return 'Finále'
  if (remaining === 1) return 'Semifinále'
  if (remaining === 2) return 'Štvrťfinále'
  return `${round}. kolo`
}

function participantName(
  match: BracketMatch,
  side: 'a' | 'b',
) {
  const participant =
    side === 'a' ? match.participant_a : match.participant_b
  if (participant) return participant.name
  if (match.is_bye) return 'BYE · voľný postup'
  return 'Čaká na víťaza'
}

export function TournamentPanel({
  event,
  organizationId,
  fetcher,
  onBack,
}: Props) {
  const [bracket, setBracket] = useState<EventBracket | null>(null)
  const [drafts, setDrafts] = useState<Record<string, ScoreDraft>>({})
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    void requestEventBracket(fetcher, organizationId, event.id)
      .then((result) => {
        if (active) setBracket(result)
      })
      .catch(() => {
        if (active) setError('Rozpis zápasov sa nepodarilo načítať.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [event.id, fetcher, organizationId])

  const rounds = useMemo(
    () =>
      Array.from({ length: bracket?.round_count ?? 0 }, (_, index) => {
        const number = index + 1
        return {
          number,
          matches:
            bracket?.matches.filter(
              (match) => match.round_number === number,
            ) ?? [],
        }
      }),
    [bracket],
  )

  const champion = useMemo(() => {
    const final = bracket?.matches.find(
      (match) => match.round_number === bracket.round_count,
    )
    if (!final?.winner_registration_id) return null
    return [final.participant_a, final.participant_b].find(
      (participant) =>
        participant?.registration_id === final.winner_registration_id,
    )
  }, [bracket])

  const showError = (caught: unknown, fallback: string) => {
    const code = caught instanceof Error ? caught.message : ''
    setError(errorMessages[code] ?? fallback)
  }

  const generate = async () => {
    setBusyId('generate')
    setError('')
    try {
      setBracket(
        await requestEventBracket(
          fetcher,
          organizationId,
          event.id,
          'POST',
          '/generate',
        ),
      )
    } catch (caught) {
      showError(caught, 'Pavúka sa nepodarilo vygenerovať.')
    } finally {
      setBusyId('')
    }
  }

  const saveScore = async (match: BracketMatch) => {
    const draft = drafts[match.id]
    const rawScoreA =
      draft?.a ?? match.score_a?.toString() ?? ''
    const rawScoreB =
      draft?.b ?? match.score_b?.toString() ?? ''
    const scoreA = Number(rawScoreA)
    const scoreB = Number(rawScoreB)
    if (
      rawScoreA === '' ||
      rawScoreB === '' ||
      !Number.isInteger(scoreA) ||
      !Number.isInteger(scoreB) ||
      scoreA < 0 ||
      scoreB < 0
    ) {
      setError('Zadaj platné nezáporné celé skóre.')
      return
    }

    setBusyId(match.id)
    setError('')
    try {
      const result = await requestEventBracket(
        fetcher,
        organizationId,
        event.id,
        'PUT',
        `/matches/${match.id}`,
        { score_a: scoreA, score_b: scoreB },
      )
      setBracket(result)
      setDrafts({})
    } catch (caught) {
      showError(caught, 'Výsledok sa nepodarilo uložiť.')
    } finally {
      setBusyId('')
    }
  }

  const updateDraft = (
    match: BracketMatch,
    side: keyof ScoreDraft,
    value: string,
  ) => {
    if (!/^\d*$/.test(value)) return
    setDrafts((current) => ({
      ...current,
      [match.id]: {
        a:
          side === 'a'
            ? value
            : current[match.id]?.a ?? match.score_a?.toString() ?? '',
        b:
          side === 'b'
            ? value
            : current[match.id]?.b ?? match.score_b?.toString() ?? '',
      },
    }))
  }

  const scoreValue = (
    match: BracketMatch,
    side: keyof ScoreDraft,
  ) =>
    drafts[match.id]?.[side] ??
    (side === 'a' ? match.score_a : match.score_b)?.toString() ??
    ''

  return (
    <View style={bracketStyles.screen}>
      <Pressable onPress={onBack}>
        <Text style={teamStyles.back}>← Späť na možnosti</Text>
      </Pressable>
      <View style={bracketStyles.header}>
        <View style={teamStyles.info}>
          <Text style={bracketStyles.eyebrow}>ROZPIS ZÁPASOV</Text>
          <Text style={bracketStyles.heading}>{event.name}</Text>
          <Text style={teamStyles.muted}>
            {event.registrations.length} účastníkov ·{' '}
            {event.format_code === 'SINGLE_ELIMINATION'
              ? 'Pavúk'
              : event.format_name ?? 'Bez systému'}
          </Text>
        </View>
        {champion ? (
          <View style={bracketStyles.championBadge}>
            <Text style={bracketStyles.championIcon}>★</Text>
            <View>
              <Text style={bracketStyles.championLabel}>VÍŤAZ</Text>
              <Text style={bracketStyles.championName}>
                {champion.name}
              </Text>
            </View>
          </View>
        ) : null}
      </View>

      {loading ? (
        <ActivityIndicator color="#ffd400" size="large" />
      ) : event.format_code !== 'SINGLE_ELIMINATION' ? (
        <View style={bracketStyles.empty}>
          <Text style={bracketStyles.emptyIcon}>◇</Text>
          <Text style={teamStyles.title}>
            {event.format_name ?? 'Zvolený herný systém'}
          </Text>
          <Text style={bracketStyles.centeredHint}>
            Generovanie rozpisu pre tento systém zatiaľ nie je
            implementované. Aktuálne je dostupný systém Pavúk.
          </Text>
        </View>
      ) : !bracket?.generated ? (
        <View style={bracketStyles.empty}>
          <Text style={bracketStyles.emptyIcon}>⌘</Text>
          <Text style={teamStyles.title}>Pavúk ešte nie je vytvorený</Text>
          <Text style={bracketStyles.centeredHint}>
            Účastníci sa rozdelia do vyraďovacích dvojíc. Pri neúplnom
            počte dostanú vybraní účastníci voľný postup (BYE).
          </Text>
          <Pressable
            style={teamStyles.primary}
            disabled={busyId === 'generate'}
            onPress={() => void generate()}
          >
            <Text style={teamStyles.primaryText}>
              {busyId === 'generate'
                ? 'Generujem…'
                : 'Generovať zápasy'}
            </Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator
          contentContainerStyle={bracketStyles.bracket}
        >
          {rounds.map((round) => (
            <View key={round.number} style={bracketStyles.round}>
              <View style={bracketStyles.roundHeader}>
                <Text style={bracketStyles.roundNumber}>
                  KOLO {round.number}
                </Text>
                <Text style={bracketStyles.roundTitle}>
                  {roundTitle(round.number, bracket.round_count)}
                </Text>
              </View>
              <View style={bracketStyles.matchStack}>
                {round.matches.map((match) => {
                  const ready = Boolean(
                    match.participant_a && match.participant_b,
                  )
                  return (
                    <View key={match.id} style={bracketStyles.match}>
                      <View style={bracketStyles.matchMeta}>
                        <Text style={bracketStyles.matchLabel}>
                          ZÁPAS {match.position + 1}
                        </Text>
                        {match.is_bye ? (
                          <Text style={bracketStyles.byeBadge}>BYE</Text>
                        ) : null}
                      </View>
                      {(['a', 'b'] as const).map((side) => {
                        const participant =
                          side === 'a'
                            ? match.participant_a
                            : match.participant_b
                        const isWinner =
                          participant?.registration_id ===
                          match.winner_registration_id
                        return (
                          <View
                            key={side}
                            style={[
                              bracketStyles.participant,
                              isWinner &&
                                bracketStyles.participantWinner,
                            ]}
                          >
                            <Text
                              numberOfLines={1}
                              style={[
                                bracketStyles.participantName,
                                !participant &&
                                  bracketStyles.participantPending,
                              ]}
                            >
                              {participantName(match, side)}
                            </Text>
                            {ready ? (
                              <AppTextInput
                                value={scoreValue(match, side)}
                                onChangeText={(value) =>
                                  updateDraft(match, side, value)
                                }
                                keyboardType="number-pad"
                                maxLength={3}
                                placeholder="–"
                                placeholderTextColor="#6f747d"
                                style={bracketStyles.score}
                              />
                            ) : null}
                          </View>
                        )
                      })}
                      {ready ? (
                        <Pressable
                          style={bracketStyles.saveButton}
                          disabled={busyId === match.id}
                          onPress={() => void saveScore(match)}
                        >
                          <Text style={bracketStyles.saveButtonText}>
                            {busyId === match.id
                              ? 'Ukladám…'
                              : match.winner_registration_id
                                ? 'Upraviť výsledok'
                                : 'Uložiť výsledok'}
                          </Text>
                        </Pressable>
                      ) : (
                        <Text style={bracketStyles.waiting}>
                          {match.is_bye
                            ? 'Automatický postup'
                            : 'Čaká sa na predošlé kolo'}
                        </Text>
                      )}
                    </View>
                  )
                })}
              </View>
            </View>
          ))}
        </ScrollView>
      )}
      {error ? <Text style={formStyles.error}>{error}</Text> : null}
    </View>
  )
}
