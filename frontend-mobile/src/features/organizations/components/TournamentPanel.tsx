import { useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Pressable,
  Text,
  View,
} from 'react-native'
import { AppTextInput } from '../../../components/AppTextInput'
import { ZoomableBracket } from '../../../components/ZoomableBracket'
import { bracketStyles } from '../../../styles/bracketStyles'
import { formStyles } from '../../../styles/formStyles'
import { teamStyles } from '../../../styles/teamStyles'
import { useAccentStyles } from '../../../theme/useAccentStyles'
import type {
  ApiEvent,
  AuthenticatedFetch,
  BracketMatch,
  EventBracket,
  EventGroupStage,
  GroupMatch,
} from '../../../types/domain'
import {
  requestEventBracket,
  requestEventGroupStage,
} from '../services/organizationApi'
import { GroupStageBoard } from './GroupStageBoard'
import { MatchResultModal } from './MatchResultModal'

type Props = {
  event: ApiEvent
  organizationId: string
  fetcher: AuthenticatedFetch
  onBack: () => void
  backLabel?: string
}

const errorMessages: Record<string, string> = {
  NOT_ENOUGH_PARTICIPANTS:
    'Na vygenerovanie pavúka sú potrební aspoň dvaja účastníci.',
  SINGLE_ELIMINATION_REQUIRED:
    'Tento event nemá zvolený systém Pavúk.',
  GROUPS_THEN_ELIMINATION_REQUIRED:
    'Tento event nemá zvolený systém Skupiny + pavúk.',
  UNEQUAL_GROUP_SIZES:
    'Počet účastníkov sa musí dať rozdeliť do rovnako veľkých skupín.',
  NOT_ENOUGH_PARTICIPANTS_PER_GROUP:
    'V každej skupine musia byť aspoň dvaja účastníci.',
  TOO_MANY_ADVANCING_PARTICIPANTS:
    'Do pavúka nemôže postúpiť viac účastníkov, než je prihlásených.',
  GROUP_RESULTS_INCOMPLETE:
    'Pred uzavretím skupín vyplň výsledok každého zápasu.',
  GROUP_STAGE_LOCKED:
    'Skupinová časť je uzavretá a jej výsledky sa už nedajú meniť.',
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

function SingleEliminationTournamentPanel({
  event,
  organizationId,
  fetcher,
  onBack,
  backLabel = 'Späť na možnosti',
}: Props) {
  const accent = useAccentStyles()
  const [bracket, setBracket] = useState<EventBracket | null>(null)
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null)
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

  return (
    <View style={bracketStyles.screen}>
      <Pressable onPress={onBack}>
        <Text style={[teamStyles.back, accent.accentText]}>
          ← {backLabel}
        </Text>
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
        <ActivityIndicator color={accent.accentText.color} size="large" />
      ) : !['SINGLE_ELIMINATION', 'GROUPS_THEN_ELIMINATION'].includes(
          event.format_code ?? '',
        ) ? (
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
            style={[teamStyles.primary, accent.primaryButton]}
            disabled={busyId === 'generate'}
            onPress={() => void generate()}
          >
            <Text style={[teamStyles.primaryText, accent.primaryText]}>
              {busyId === 'generate'
                ? 'Generujem…'
                : 'Generovať zápasy'}
            </Text>
          </Pressable>
        </View>
      ) : (
        <ZoomableBracket
          contentWidth={rounds.length * 272}
          title={event.name}
        >
          <View style={bracketStyles.bracket}>
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
                    <Pressable
                      key={match.id}
                      disabled={!ready}
                      onPress={() => setSelectedMatchId(match.id)}
                      style={({ pressed }) => [
                        bracketStyles.match,
                        ready && bracketStyles.matchClickable,
                        pressed && bracketStyles.matchPressed,
                      ]}
                    >
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
                              <Text style={bracketStyles.readonlyScore}>
                                {side === 'a'
                                  ? match.score_a ?? '–'
                                  : match.score_b ?? '–'}
                              </Text>
                            ) : null}
                          </View>
                        )
                      })}
                      {ready ? (
                        <View style={bracketStyles.matchActionRow}>
                          <Text style={bracketStyles.saveButtonText}>
                            {match.winner_registration_id
                              ? 'Upraviť detail zápasu'
                              : 'Zapísať výsledok'}
                          </Text>
                          <Text style={bracketStyles.matchChevron}>›</Text>
                        </View>
                      ) : (
                        <Text style={bracketStyles.waiting}>
                          {match.is_bye
                            ? 'Automatický postup'
                            : 'Čaká sa na predošlé kolo'}
                        </Text>
                      )}
                    </Pressable>
                  )
                })}
              </View>
            </View>
            ))}
          </View>
        </ZoomableBracket>
      )}
      {error ? <Text style={formStyles.error}>{error}</Text> : null}
      <MatchResultModal
        visible={selectedMatchId !== null}
        match={
          selectedMatchId
            ? { id: selectedMatchId, kind: 'BRACKET' }
            : null
        }
        organizationId={organizationId}
        eventId={event.id}
        fetcher={fetcher}
        onClose={() => setSelectedMatchId(null)}
        onSaved={async () => {
          setBracket(
            await requestEventBracket(fetcher, organizationId, event.id),
          )
        }}
      />
    </View>
  )
}

function suggestedGroupCount(participantCount: number) {
  for (
    let candidate = 2;
    candidate <= Math.min(4, Math.floor(participantCount / 2));
    candidate += 1
  ) {
    if (participantCount % candidate === 0) return candidate
  }
  return 1
}

function GroupTournamentPanel({
  event,
  organizationId,
  fetcher,
  onBack,
}: Props) {
  const accent = useAccentStyles()
  const suggestedGroups = suggestedGroupCount(event.registrations.length)
  const [stage, setStage] = useState<EventGroupStage | null>(null)
  const [groupCount, setGroupCount] = useState(suggestedGroups.toString())
  const [advancingCount, setAdvancingCount] = useState(
    Math.min(
      event.registrations.length,
      Math.max(2, suggestedGroups * 2),
    ).toString(),
  )
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null)
  const [view, setView] = useState<'groups' | 'bracket'>('groups')
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    void requestEventGroupStage(fetcher, organizationId, event.id)
      .then((result) => {
        if (active) setStage(result)
      })
      .catch(() => {
        if (active) setError('Skupinovú časť sa nepodarilo načítať.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [event.id, fetcher, organizationId])

  const showError = (caught: unknown, fallback: string) => {
    const code = caught instanceof Error ? caught.message : ''
    setError(errorMessages[code] ?? fallback)
  }

  const generateGroups = async () => {
    const groups = Number(groupCount)
    const advancing = Number(advancingCount)
    const participants = event.registrations.length
    if (
      !Number.isInteger(groups) ||
      groups < 1 ||
      !Number.isInteger(advancing) ||
      advancing < 2
    ) {
      setError('Zadaj platný počet skupín a aspoň dvoch postupujúcich.')
      return
    }
    if (participants % groups !== 0) {
      setError(
        'Počet účastníkov sa musí dať rozdeliť do rovnako veľkých skupín.',
      )
      return
    }
    if (participants / groups < 2) {
      setError('V každej skupine musia byť aspoň dvaja účastníci.')
      return
    }
    if (advancing > participants) {
      setError('Počet postupujúcich je vyšší než počet účastníkov.')
      return
    }

    setBusyId('generate-groups')
    setError('')
    try {
      setStage(
        await requestEventGroupStage(
          fetcher,
          organizationId,
          event.id,
          'POST',
          '/generate',
          { group_count: groups, advancing_count: advancing },
        ),
      )
    } catch (caught) {
      showError(caught, 'Skupiny sa nepodarilo vytvoriť.')
    } finally {
      setBusyId('')
    }
  }

  const finalize = async () => {
    setBusyId('finalize')
    setError('')
    try {
      setStage(
        await requestEventGroupStage(
          fetcher,
          organizationId,
          event.id,
          'POST',
          '/finalize',
        ),
      )
      setConfirming(false)
    } catch (caught) {
      showError(caught, 'Skupiny sa nepodarilo uzavrieť.')
    } finally {
      setBusyId('')
    }
  }

  if (view === 'bracket') {
    return (
      <SingleEliminationTournamentPanel
        event={event}
        organizationId={organizationId}
        fetcher={fetcher}
        onBack={() => setView('groups')}
        backLabel="Späť na výsledky skupín"
      />
    )
  }

  const complete =
    stage?.generated &&
    stage.total_matches > 0 &&
    stage.completed_matches === stage.total_matches

  return (
    <View style={bracketStyles.screen}>
      <Pressable onPress={onBack}>
        <Text style={[teamStyles.back, accent.accentText]}>
          ← Späť na možnosti
        </Text>
      </Pressable>
      <View style={bracketStyles.header}>
        <View style={teamStyles.info}>
          <Text style={bracketStyles.eyebrow}>SKUPINY + PAVÚK</Text>
          <Text style={bracketStyles.heading}>{event.name}</Text>
          <Text style={teamStyles.muted}>
            {event.registrations.length} účastníkov · dve fázy turnaja
          </Text>
        </View>
        {stage?.locked ? (
          <Text style={bracketStyles.lockedBadge}>SKUPINY UZAVRETÉ</Text>
        ) : null}
      </View>

      {stage?.locked ? (
        <View style={bracketStyles.phaseTabs}>
          <Pressable
            style={[
              bracketStyles.phaseTab,
              bracketStyles.phaseTabActive,
            ]}
            onPress={() => setView('groups')}
          >
            <Text
              style={[
                bracketStyles.phaseTabText,
                bracketStyles.phaseTabTextActive,
              ]}
            >
              1. Skupiny
            </Text>
          </Pressable>
          <Pressable
            style={bracketStyles.phaseTab}
            onPress={() => setView('bracket')}
          >
            <Text style={bracketStyles.phaseTabText}>2. Pavúk</Text>
          </Pressable>
        </View>
      ) : null}

      {loading ? (
        <ActivityIndicator color={accent.accentText.color} size="large" />
      ) : !stage?.generated ? (
        <View style={bracketStyles.setupCard}>
          <Text style={teamStyles.title}>Nastavenie skupinovej fázy</Text>
          <Text style={bracketStyles.readonlyNotice}>
            Účastníci sa náhodne rozdelia do rovnako veľkých skupín a v
            každej odohrá každý zápas s každým. Po vytvorení skupín sa už
            zoznam prihlásených nemení.
          </Text>
          <View style={bracketStyles.setupRow}>
            <View style={bracketStyles.setupField}>
              <Text style={bracketStyles.setupLabel}>POČET SKUPÍN</Text>
              <AppTextInput
                value={groupCount}
                onChangeText={(value) => {
                  if (/^\d*$/.test(value)) setGroupCount(value)
                }}
                keyboardType="number-pad"
                maxLength={3}
                style={bracketStyles.setupInput}
              />
            </View>
            <View style={bracketStyles.setupField}>
              <Text style={bracketStyles.setupLabel}>POSTUPUJE DO PAVÚKA</Text>
              <AppTextInput
                value={advancingCount}
                onChangeText={(value) => {
                  if (/^\d*$/.test(value)) setAdvancingCount(value)
                }}
                keyboardType="number-pad"
                maxLength={3}
                style={bracketStyles.setupInput}
              />
            </View>
          </View>
          <Pressable
            style={[teamStyles.primary, accent.primaryButton]}
            disabled={busyId === 'generate-groups'}
            onPress={() => void generateGroups()}
          >
            <Text style={[teamStyles.primaryText, accent.primaryText]}>
              {busyId === 'generate-groups'
                ? 'Vytváram…'
                : 'Vytvoriť skupiny a zápasy'}
            </Text>
          </Pressable>
        </View>
      ) : (
        <>
          <View style={bracketStyles.progressCard}>
            <Text style={bracketStyles.progressTitle}>
              {stage.locked
                ? 'Skupinová fáza je uzavretá'
                : 'Priebeh skupinovej fázy'}
            </Text>
            <Text style={bracketStyles.progressText}>
              {stage.completed_matches} / {stage.total_matches} výsledkov ·{' '}
              {stage.advancing_count} postupujúcich
            </Text>
            {stage.locked ? (
              <Text style={bracketStyles.readonlyNotice}>
                Výsledky ostávajú uložené na prezeranie a už sa nedajú
                upravovať.
              </Text>
            ) : null}
          </View>

          <GroupStageBoard
            stage={stage}
            editable={!stage.locked}
            onOpenMatch={(match) => setSelectedMatchId(match.id)}
          />

          {stage.locked ? (
            <Pressable
              style={[teamStyles.primary, accent.primaryButton]}
              onPress={() => setView('bracket')}
            >
              <Text style={[teamStyles.primaryText, accent.primaryText]}>
                Zobraziť vyraďovací pavúk
              </Text>
            </Pressable>
          ) : (
            <View style={bracketStyles.finalizeCard}>
              <Text style={teamStyles.title}>
                {complete
                  ? 'Skupiny sú pripravené na uzavretie'
                  : 'Najprv doplň všetky výsledky'}
              </Text>
              <Text style={bracketStyles.readonlyNotice}>
                Po uzavretí už výsledky skupín nebude možné meniť.
                Postupujúci sa vyberú podľa poradia a automaticky sa vytvorí
                nasadený pavúk.
              </Text>
              {confirming ? (
                <>
                  <Text style={bracketStyles.progressText}>
                    Naozaj uzavrieť skupiny? Tento krok je nevratný.
                  </Text>
                  <Pressable
                    style={[teamStyles.primary, accent.primaryButton]}
                    disabled={busyId === 'finalize'}
                    onPress={() => void finalize()}
                  >
                    <Text
                      style={[teamStyles.primaryText, accent.primaryText]}
                    >
                      {busyId === 'finalize'
                        ? 'Vytváram pavúka…'
                        : 'Áno, uzavrieť a vytvoriť pavúka'}
                    </Text>
                  </Pressable>
                  <Pressable onPress={() => setConfirming(false)}>
                    <Text style={[teamStyles.back, accent.accentText]}>
                      Zrušiť
                    </Text>
                  </Pressable>
                </>
              ) : (
                <Pressable
                  style={[teamStyles.primary, accent.primaryButton]}
                  disabled={!complete}
                  onPress={() => setConfirming(true)}
                >
                  <Text style={[teamStyles.primaryText, accent.primaryText]}>
                    Uzavrieť skupiny a vytvoriť pavúka
                  </Text>
                </Pressable>
              )}
            </View>
          )}
        </>
      )}
      {error ? <Text style={formStyles.error}>{error}</Text> : null}
      <MatchResultModal
        visible={selectedMatchId !== null}
        match={
          selectedMatchId
            ? { id: selectedMatchId, kind: 'GROUP' }
            : null
        }
        organizationId={organizationId}
        eventId={event.id}
        fetcher={fetcher}
        editable={!stage?.locked}
        onClose={() => setSelectedMatchId(null)}
        onSaved={async () => {
          setStage(
            await requestEventGroupStage(fetcher, organizationId, event.id),
          )
        }}
      />
    </View>
  )
}

export function TournamentPanel(props: Props) {
  return props.event.format_code === 'GROUPS_THEN_ELIMINATION' ? (
    <GroupTournamentPanel {...props} />
  ) : (
    <SingleEliminationTournamentPanel {...props} />
  )
}
