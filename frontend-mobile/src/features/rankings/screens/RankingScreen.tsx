import { useEffect, useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { formStyles } from '../../../styles/formStyles'
import { teamStyles } from '../../../styles/teamStyles'
import type {
  AuthenticatedFetch,
  RankingKind,
  RankingResponse,
} from '../../../types/domain'

const rankingKinds: ReadonlyArray<[RankingKind, string]> = [
  ['players', 'Hráči'],
  ['teams', 'Tímy'],
]

const emptyRanking: RankingResponse = { items: [], sports: [] }

export function RankingScreen({
  fetcher,
}: {
  fetcher: AuthenticatedFetch
}) {
  const [kind, setKind] = useState<RankingKind>('players')
  const [sport, setSport] = useState('all')
  const [data, setData] = useState<RankingResponse>(emptyRanking)

  useEffect(() => {
    void fetcher(`/rankings?kind=${kind}&sport=${sport}`)
      .then((response) => {
        if (!response.ok) throw Error('RANKING_LOAD_FAILED')
        return response.json() as Promise<RankingResponse>
      })
      .then(setData)
      .catch(() => setData(emptyRanking))
  }, [fetcher, kind, sport])

  return (
    <View style={teamStyles.section}>
      <View style={formStyles.genderRow}>
        {rankingKinds.map(([key, label]) => (
          <Pressable
            key={key}
            style={[
              formStyles.genderChip,
              kind === key && formStyles.genderChipSelected,
            ]}
            onPress={() => setKind(key)}
          >
            <Text style={formStyles.genderText}>{label}</Text>
          </Pressable>
        ))}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={formStyles.optionRow}
      >
        <Pressable
          style={[
            formStyles.genderChip,
            sport === 'all' && formStyles.genderChipSelected,
          ]}
          onPress={() => setSport('all')}
        >
          <Text style={formStyles.genderText}>Celkovo</Text>
        </Pressable>
        {data.sports.map((item) => (
          <Pressable
            key={item.code}
            style={[
              formStyles.genderChip,
              sport === item.code && formStyles.genderChipSelected,
            ]}
            onPress={() => setSport(item.code)}
          >
            <Text style={formStyles.genderText}>{item.name}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {data.items.map((item) => (
        <View
          key={`${kind}-${item.rank}-${item.name}`}
          style={teamStyles.card}
        >
          <Text style={teamStyles.buttonText}>#{item.rank}</Text>
          <View style={teamStyles.info}>
            <Text style={teamStyles.title}>{item.name}</Text>
            <Text style={teamStyles.muted}>
              {sport === 'all' ? 'Celkové XP' : item.sport}
            </Text>
          </View>
          <Text style={teamStyles.title}>{item.xp} XP</Text>
        </View>
      ))}
    </View>
  )
}
