import { useEffect, useMemo, useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { ZoomableBracket } from '../../../components/ZoomableBracket'
import { bracketStyles } from '../../../styles/bracketStyles'
import type { EventGroup, EventGroupStage, GroupMatch } from '../../../types/domain'

type Props = {
  stage: EventGroupStage
  editable?: boolean
  onOpenMatch?: (match: GroupMatch) => void
}

function GroupContent({ group, onOpenMatch, editable }: {
  group: EventGroup
  editable: boolean
  onOpenMatch?: (match: GroupMatch) => void
}) {
  return (
    <View style={bracketStyles.groupCard}>
      <View style={bracketStyles.groupHeader}>
        <View>
          <Text style={bracketStyles.eyebrow}>SKUPINOVÁ FÁZA</Text>
          <Text style={bracketStyles.groupTitle}>{group.name}</Text>
        </View>
        <Text style={bracketStyles.groupCount}>{group.standings.length} účastníkov</Text>
      </View>

      <View style={bracketStyles.groupMatches}>
        <Text style={bracketStyles.subsectionTitle}>ROZPIS · KAŽDÝ S KAŽDÝM</Text>
        <View style={bracketStyles.matchGrid}>
          {group.matches.map((match) => {
            const saved = match.score_a !== null && match.score_b !== null
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
                <View style={bracketStyles.matchMeta}>
                  <Text style={bracketStyles.matchLabel}>ZÁPAS {match.position + 1}</Text>
                  <Text style={saved ? bracketStyles.resultBadge : bracketStyles.pendingBadge}>
                    {saved ? 'ODOHRANÉ' : 'ČAKÁ'}
                  </Text>
                </View>
                {(['a', 'b'] as const).map((side) => {
                  const participant = side === 'a' ? match.participant_a : match.participant_b
                  const winner = participant.registration_id === match.winner_registration_id
                  return (
                    <View key={side} style={[bracketStyles.participant, winner && bracketStyles.participantWinner]}>
                      <Text numberOfLines={1} style={bracketStyles.participantName}>{participant.name}</Text>
                      <Text style={bracketStyles.readonlyScore}>
                        {side === 'a' ? match.score_a ?? '–' : match.score_b ?? '–'}
                      </Text>
                    </View>
                  )
                })}
                {onOpenMatch ? (
                  <View style={bracketStyles.matchActionRow}>
                    <Text style={bracketStyles.saveButtonText}>
                      {!editable ? 'Zobraziť detail' : saved ? 'Upraviť výsledok' : 'Zapísať výsledok'}
                    </Text>
                    <Text style={bracketStyles.matchChevron}>›</Text>
                  </View>
                ) : null}
              </Pressable>
            )
          })}
        </View>
      </View>

      <View style={bracketStyles.table}>
        <Text style={bracketStyles.subsectionTitle}>PORADIE A POSTUP</Text>
        <View style={bracketStyles.tableHeader}>
          <Text style={[bracketStyles.tableHeaderText, { width: 24 }]}>#</Text>
          <Text style={[bracketStyles.tableHeaderText, { flex: 1, textAlign: 'left' }]}>ÚČASTNÍK</Text>
          <Text style={[bracketStyles.tableHeaderText, { width: 30 }]}>Z</Text>
          <Text style={[bracketStyles.tableHeaderText, { width: 30 }]}>+/−</Text>
          <Text style={[bracketStyles.tableHeaderText, { width: 30 }]}>B</Text>
        </View>
        {group.standings.map((standing) => (
          <View key={standing.participant.registration_id} style={[bracketStyles.tableRow, standing.qualified && bracketStyles.tableRowQualified]}>
            <Text style={bracketStyles.tableRank}>{standing.rank}</Text>
            <Text numberOfLines={1} style={bracketStyles.tableName}>
              {standing.participant.name}{standing.qualified ? '  ✓' : ''}
            </Text>
            <Text style={bracketStyles.tableStat}>{standing.played}</Text>
            <Text style={bracketStyles.tableStat}>{standing.score_difference > 0 ? '+' : ''}{standing.score_difference}</Text>
            <Text style={bracketStyles.tablePoints}>{standing.points}</Text>
          </View>
        ))}
      </View>
    </View>
  )
}

export function GroupStageBoard({ stage, editable = false, onOpenMatch }: Props) {
  const [selectedId, setSelectedId] = useState(stage.groups[0]?.id ?? '')
  useEffect(() => {
    if (!stage.groups.some((group) => group.id === selectedId)) setSelectedId(stage.groups[0]?.id ?? '')
  }, [selectedId, stage.groups])
  const group = useMemo(
    () => stage.groups.find((item) => item.id === selectedId) ?? stage.groups[0],
    [selectedId, stage.groups],
  )
  if (!group) return null
  const contentHeight = Math.max(560, 210 + group.matches.length * 190 + group.standings.length * 44)

  return (
    <View style={bracketStyles.groupCollection}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={bracketStyles.groupTabs}>
        {stage.groups.map((item) => {
          const active = item.id === group.id
          return (
            <Pressable key={item.id} onPress={() => setSelectedId(item.id)} style={[bracketStyles.groupTab, active && bracketStyles.groupTabActive]}>
              <Text style={[bracketStyles.groupTabText, active && bracketStyles.groupTabTextActive]}>{item.name}</Text>
            </Pressable>
          )
        })}
      </ScrollView>
      <ZoomableBracket contentWidth={720} contentHeight={contentHeight} title={`${group.name} · rozpis a poradie`} openLabel={`Otvoriť ${group.name} v interaktívnom náhľade ↗`}>
        <View style={bracketStyles.groupCanvas}>
          <GroupContent group={group} editable={editable} onOpenMatch={onOpenMatch} />
        </View>
      </ZoomableBracket>
      <GroupContent group={group} editable={editable} onOpenMatch={onOpenMatch} />
    </View>
  )
}
