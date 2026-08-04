import { useEffect, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { getStoredValue, setStoredValue } from '../../../services/storage'
import { discoveryFilterStyles as styles } from '../../../styles/discoveryFilterStyles'
import { useTheme } from '../../../theme/ThemeContext'

export type DiscoveryFilterValue = { sports: string[]; regions: string[] }

type Props = {
  sports: string[]
  regions: string[]
  value: DiscoveryFilterValue
  onChange: (value: DiscoveryFilterValue) => void
}

const storageKey = 'event-discovery-filters:v1'

const toggle = (items: string[], item: string) =>
  items.includes(item) ? items.filter((value) => value !== item) : [...items, item]

export function DiscoveryFilters({ sports, regions, value, onChange }: Props) {
  const { theme } = useTheme()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    void getStoredValue(storageKey).then((stored) => {
      if (!stored) return
      try {
        const parsed = JSON.parse(stored) as DiscoveryFilterValue
        onChange({ sports: parsed.sports ?? [], regions: parsed.regions ?? [] })
      } catch { /* Ignore malformed device-local filter data. */ }
    })
  }, [onChange])

  const change = (next: DiscoveryFilterValue) => {
    onChange(next)
    void setStoredValue(storageKey, JSON.stringify(next))
  }
  const selectedCount = value.sports.length + value.regions.length

  return <View style={styles.wrap}>
    <Pressable accessibilityLabel="Filtrovať eventy" style={[styles.trigger, { borderColor: theme.primary }]} onPress={() => setOpen((current) => !current)}>
      <Text style={[styles.triggerIcon, { color: theme.primary }]}>☷</Text>
      {selectedCount ? <View style={[styles.count, { backgroundColor: theme.primary }]}><Text style={[styles.countText, { color: theme.onPrimary }]}>{selectedCount}</Text></View> : null}
    </Pressable>
    {open ? <View style={styles.panel}>
      <View style={styles.panelHeader}><View><Text style={styles.title}>Filtrovať objavovanie</Text><Text style={styles.hint}>Nevybraný filter znamená všetko.</Text></View>{selectedCount ? <Pressable onPress={() => change({ sports: [], regions: [] })}><Text style={[styles.clear, { color: theme.primary }]}>Vymazať</Text></Pressable> : null}</View>
      <Text style={styles.label}>ŠPORTY</Text>
      <View style={styles.chips}>{sports.map((sport) => { const selected = value.sports.includes(sport); return <Pressable key={sport} onPress={() => change({ ...value, sports: toggle(value.sports, sport) })} style={[styles.chip, selected && { backgroundColor: theme.primary, borderColor: theme.primary }]}><Text style={[styles.chipText, selected && { color: theme.onPrimary }]}>{sport}</Text></Pressable> })}</View>
      <Text style={styles.label}>KRAJE</Text>
      <View style={styles.chips}>{regions.map((region) => { const selected = value.regions.includes(region); return <Pressable key={region} onPress={() => change({ ...value, regions: toggle(value.regions, region) })} style={[styles.chip, selected && { backgroundColor: theme.primary, borderColor: theme.primary }]}><Text style={[styles.chipText, selected && { color: theme.onPrimary }]}>{region}</Text></Pressable> })}</View>
    </View> : null}
  </View>
}
