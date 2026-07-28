import { useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native'
import { bracketStyles } from '../../../styles/bracketStyles'
import { formStyles } from '../../../styles/formStyles'
import { teamStyles } from '../../../styles/teamStyles'
import type {
  ApiEvent,
  BracketMatch,
  EventBracket,
  AuthenticatedFetch,
} from '../../../types/domain'
import { requestParticipantBracket } from '../../organizations/services/organizationApi'

type Props = {
  event: ApiEvent
  userId: string
  ownedTeamIds: Set<string>
  fetcher: AuthenticatedFetch
  onBack: () => void
}

function roundTitle(round: number, total: number) {
  const remaining = total - round
  if (remaining === 0) return 'Finále'
  if (remaining === 1) return 'Semifinále'
  if (remaining === 2) return 'Štvrťfinále'
  return `${round}. kolo`
}

function participantName(match: BracketMatch, side: 'a' | 'b') {
  const participant = side === 'a' ? match.participant_a : match.participant_b
  if (participant) return participant.name
  return match.is_bye ? 'BYE · voľný postup' : 'Čaká na víťaza'
}

export function MyTournamentScreen({
  event,
  userId,
  ownedTeamIds,
  fetcher,
  onBack,
}: Props) {
  const [bracket, setBracket] = useState<EventBracket | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const myRegistrationIds = useMemo(
    () =>
      new Set(
        event.registrations
          .filter(
            (registration) =>
              registration.user_id === userId ||
              (registration.team_id !== null &&
                ownedTeamIds.has(registration.team_id)),
          )
          .map((registration) => registration.id),
      ),
    [event.registrations, ownedTeamIds, userId],
  )

  useEffect(() => {
    let active = true
    void requestParticipantBracket(fetcher, event.id)
      .then((result) => {
        if (active) setBracket(result)
      })
      .catch(() => {
        if (active) setError('Priebeh turnaja sa nepodarilo načítať.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [event.id, fetcher])

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

  const nextMatch = useMemo(() => {
    if (!bracket) return null
    return bracket.matches
      .filter(
        (match) =>
          !match.winner_registration_id &&
          [match.participant_a, match.participant_b].some((participant) =>
            participant
              ? myRegistrationIds.has(participant.registration_id)
              : false,
          ),
      )
      .sort(
        (left, right) =>
          left.round_number - right.round_number || left.position - right.position,
      )[0]
  }, [bracket, myRegistrationIds])

  const opponent = nextMatch
    ? [nextMatch.participant_a, nextMatch.participant_b].find(
        (participant) =>
          participant && !myRegistrationIds.has(participant.registration_id),
      )
    : null

  return (
    <View style={bracketStyles.screen}>
      <Pressable onPress={onBack}>
        <Text style={teamStyles.back}>← Späť na detail eventu</Text>
      </Pressable>
      <View style={bracketStyles.header}>
        <Text style={bracketStyles.eyebrow}>MÔJ PRIEBEH TURNAJA</Text>
        <Text style={bracketStyles.heading}>{event.name}</Text>
        <Text style={teamStyles.muted}>
          Rozpis je iba na čítanie. Výsledky zapisuje organizátor.
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator color="#ffd400" size="large" />
      ) : !bracket?.generated ? (
        <View style={bracketStyles.empty}>
          <Text style={bracketStyles.emptyIcon}>⌘</Text>
          <Text style={teamStyles.title}>Rozpis sa ešte pripravuje</Text>
          <Text style={bracketStyles.centeredHint}>
            Organizátor zatiaľ nevygeneroval pavúka. Keď tak urobí, tu
            uvidíš svojho súpera aj postup turnajom.
          </Text>
        </View>
      ) : (
        <>
          <View style={bracketStyles.nextMatch}>
            <Text style={bracketStyles.nextMatchLabel}>TVÔJ NAJBLIŽŠÍ ZÁPAS</Text>
            {nextMatch ? (
              <>
                <Text style={bracketStyles.nextMatchTitle}>
                  {roundTitle(nextMatch.round_number, bracket.round_count)}
                </Text>
                <Text style={bracketStyles.nextMatchOpponent}>
                  {opponent ? `Proti: ${opponent.name}` : 'Čaká sa na súpera'}
                </Text>
              </>
            ) : (
              <Text style={bracketStyles.nextMatchTitle}>
                Tvoj turnaj je ukončený alebo čakáš na výsledok iného zápasu.
              </Text>
            )}
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator
            contentContainerStyle={bracketStyles.bracket}
          >
            {rounds.map((round) => (
              <View key={round.number} style={bracketStyles.round}>
                <View style={bracketStyles.roundHeader}>
                  <Text style={bracketStyles.roundNumber}>KOLO {round.number}</Text>
                  <Text style={bracketStyles.roundTitle}>
                    {roundTitle(round.number, bracket.round_count)}
                  </Text>
                </View>
                <View style={bracketStyles.matchStack}>
                  {round.matches.map((match) => (
                    <View key={match.id} style={bracketStyles.match}>
                      <Text style={bracketStyles.matchLabel}>
                        ZÁPAS {match.position + 1}
                      </Text>
                      {(['a', 'b'] as const).map((side) => {
                        const participant =
                          side === 'a'
                            ? match.participant_a
                            : match.participant_b
                        const isMine = participant
                          ? myRegistrationIds.has(participant.registration_id)
                          : false
                        const isWinner =
                          participant?.registration_id ===
                          match.winner_registration_id
                        const score = side === 'a' ? match.score_a : match.score_b
                        return (
                          <View
                            key={side}
                            style={[
                              bracketStyles.participant,
                              isMine && bracketStyles.participantMine,
                              isWinner && bracketStyles.participantWinner,
                            ]}
                          >
                            <Text
                              numberOfLines={1}
                              style={bracketStyles.participantName}
                            >
                              {participantName(match, side)}
                            </Text>
                            <Text style={bracketStyles.readonlyScore}>
                              {score ?? '–'}
                            </Text>
                          </View>
                        )
                      })}
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </ScrollView>
        </>
      )}
      {error ? <Text style={formStyles.error}>{error}</Text> : null}
    </View>
  )
}
