import { Pressable, Text, View } from 'react-native'
import { bracketStyles } from '../../../styles/bracketStyles'
import type {
  EventGroupStage,
  GroupMatch,
} from '../../../types/domain'

type Props = {
  stage: EventGroupStage
  editable?: boolean
  onOpenMatch?: (match: GroupMatch) => void
}

export function GroupStageBoard({
  stage,
  editable = false,
  onOpenMatch,
}: Props) {
  return (
    <View style={bracketStyles.groupCollection}>
      {stage.groups.map((group) => (
        <View key={group.id} style={bracketStyles.groupCard}>
          <View style={bracketStyles.groupHeader}>
            <Text style={bracketStyles.groupTitle}>{group.name}</Text>
            <Text style={bracketStyles.groupCount}>
              {group.standings.length} účastníkov
            </Text>
          </View>

          <View style={bracketStyles.table}>
            <Text style={bracketStyles.subsectionTitle}>TABUĽKA</Text>
            <View style={bracketStyles.tableHeader}>
              <Text style={[bracketStyles.tableHeaderText, { width: 24 }]}>#</Text>
              <Text
                style={[
                  bracketStyles.tableHeaderText,
                  { flex: 1, textAlign: 'left' },
                ]}
              >
                ÚČASTNÍK
              </Text>
              <Text style={[bracketStyles.tableHeaderText, { width: 30 }]}>
                Z
              </Text>
              <Text style={[bracketStyles.tableHeaderText, { width: 30 }]}>
                +/−
              </Text>
              <Text style={[bracketStyles.tableHeaderText, { width: 30 }]}>
                B
              </Text>
            </View>
            {group.standings.map((standing) => (
              <View
                key={standing.participant.registration_id}
                style={[
                  bracketStyles.tableRow,
                  standing.qualified && bracketStyles.tableRowQualified,
                ]}
              >
                <Text style={bracketStyles.tableRank}>{standing.rank}</Text>
                <Text numberOfLines={1} style={bracketStyles.tableName}>
                  {standing.participant.name}
                  {standing.qualified ? '  ✓' : ''}
                </Text>
                <Text style={bracketStyles.tableStat}>{standing.played}</Text>
                <Text style={bracketStyles.tableStat}>
                  {standing.score_difference > 0 ? '+' : ''}
                  {standing.score_difference}
                </Text>
                <Text style={bracketStyles.tablePoints}>{standing.points}</Text>
              </View>
            ))}
          </View>

          <View style={bracketStyles.groupMatches}>
            <Text style={bracketStyles.subsectionTitle}>ZÁPASY</Text>
            {group.matches.map((match) => {
              const resultSaved =
                match.score_a !== null && match.score_b !== null
              return (
                <Pressable
                  key={match.id}
                  disabled={!onOpenMatch}
                  onPress={() => onOpenMatch?.(match)}
                  style={({ pressed }) => [
                    bracketStyles.groupMatch,
                    onOpenMatch && bracketStyles.matchClickable,
                    pressed && bracketStyles.matchPressed,
                  ]}
                >
                  <Text style={bracketStyles.matchLabel}>
                    ZÁPAS {match.position + 1}
                  </Text>
                  {(['a', 'b'] as const).map((side) => {
                    const participant =
                      side === 'a'
                        ? match.participant_a
                        : match.participant_b
                    const isWinner =
                      participant.registration_id ===
                      match.winner_registration_id
                    return (
                      <View
                        key={side}
                        style={[
                          bracketStyles.participant,
                          isWinner && bracketStyles.participantWinner,
                        ]}
                      >
                        <Text style={bracketStyles.participantName}>
                          {participant.name}
                        </Text>
                        <Text style={bracketStyles.readonlyScore}>
                          {side === 'a'
                            ? match.score_a ?? '–'
                            : match.score_b ?? '–'}
                        </Text>
                      </View>
                    )
                  })}
                  {onOpenMatch ? (
                    <View style={bracketStyles.matchActionRow}>
                      <Text style={bracketStyles.saveButtonText}>
                        {!editable
                          ? 'Zobraziť detail zápasu'
                          : resultSaved
                          ? 'Upraviť detail zápasu'
                          : 'Zapísať výsledok'}
                      </Text>
                      <Text style={bracketStyles.matchChevron}>›</Text>
                    </View>
                  ) : null}
                </Pressable>
              )
            })}
          </View>
        </View>
      ))}
    </View>
  )
}
