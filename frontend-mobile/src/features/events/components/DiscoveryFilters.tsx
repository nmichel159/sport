import { useEffect, useState } from 'react'
import { Image, Pressable, ScrollView, Text, View } from 'react-native'
import { getSportImage } from '../../../assets/sportImages'
import { getStoredValue, setStoredValue } from '../../../services/storage'
import { SystemModal } from '../../../system/SystemModal'
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
const featuredSportCount = 4

const toggle = (items: string[], item: string) =>
  items.includes(item) ? items.filter((value) => value !== item) : [...items, item]

type SportOptionProps = {
  sport: string
  selected: boolean
  onPress: () => void
}

function SportOption({ sport, selected, onPress }: SportOptionProps) {
  const { theme } = useTheme()
  const image = getSportImage(sport)

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={`Filtrovať šport: ${sport}`}
      onPress={onPress}
      style={[
        styles.sportOption,
        selected && { borderColor: theme.primary, backgroundColor: theme.soft },
      ]}
    >
      <View style={[styles.sportImageWrap, { backgroundColor: selected ? theme.primary : '#272a30' }]}>
        {image ? (
          <Image source={image} style={styles.sportImage} resizeMode="contain" />
        ) : (
          <Text style={[styles.sportFallback, { color: selected ? theme.onPrimary : theme.primary }]}>
            {sport.slice(0, 1).toUpperCase()}
          </Text>
        )}
      </View>
      <Text numberOfLines={2} style={styles.sportName}>{sport}</Text>
      {selected ? <View style={[styles.sportCheck, { backgroundColor: theme.primary }]}><Text style={[styles.sportCheckText, { color: theme.onPrimary }]}>✓</Text></View> : null}
    </Pressable>
  )
}

export function DiscoveryFilters({ sports, regions, value, onChange }: Props) {
  const { theme } = useTheme()
  const [open, setOpen] = useState(false)
  const [showMoreSports, setShowMoreSports] = useState(false)

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
  const featuredSports = sports.slice(0, featuredSportCount)
  const additionalSports = sports.slice(featuredSportCount)
  const close = () => setOpen(false)

  return <>
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Filtrovať eventy"
      style={[styles.trigger, { borderColor: theme.primary }]}
      onPress={() => setOpen(true)}
    >
      <Text style={[styles.triggerIcon, { color: theme.primary }]}>☷</Text>
      {selectedCount ? <View style={[styles.count, { backgroundColor: theme.primary }]}><Text style={[styles.countText, { color: theme.onPrimary }]}>{selectedCount}</Text></View> : null}
    </Pressable>

    <SystemModal visible={open} transparent animationType="fade" keyboardAware={false} onRequestClose={close}>
      <View style={styles.overlay}>
        <Pressable accessibilityLabel="Zavrieť filtre" onPress={close} style={styles.backdrop} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <Text style={styles.title}>Objavovať eventy</Text>
              <Text style={styles.hint}>Vyber športy a oblasti, ktoré ťa zaujímajú.</Text>
            </View>
            <Pressable accessibilityLabel="Zavrieť filtre" onPress={close} style={styles.closeButton}>
              <Text style={styles.closeText}>×</Text>
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
            <View style={styles.sectionHeader}>
              <Text style={styles.label}>HLAVNÉ ŠPORTY</Text>
              {selectedCount ? <Pressable onPress={() => change({ sports: [], regions: [] })}><Text style={[styles.clear, { color: theme.primary }]}>Vymazať filtre</Text></Pressable> : null}
            </View>
            <View style={styles.sportGrid}>
              {featuredSports.map((sport) => <SportOption key={sport} sport={sport} selected={value.sports.includes(sport)} onPress={() => change({ ...value, sports: toggle(value.sports, sport) })} />)}
            </View>

            {additionalSports.length ? <>
              <Pressable onPress={() => setShowMoreSports((current) => !current)} style={styles.moreSports}>
                <Text style={[styles.moreSportsText, { color: theme.primary }]}>{showMoreSports ? 'Menej športov' : `Viac športov (${additionalSports.length})`}</Text>
                <Text style={[styles.moreSportsChevron, { color: theme.primary }]}>{showMoreSports ? '↑' : '↓'}</Text>
              </Pressable>
              {showMoreSports ? <View style={styles.sportGrid}>
                {additionalSports.map((sport) => <SportOption key={sport} sport={sport} selected={value.sports.includes(sport)} onPress={() => change({ ...value, sports: toggle(value.sports, sport) })} />)}
              </View> : null}
            </> : null}

            <Text style={styles.label}>KDE SA TO HRÁ</Text>
            <Text style={styles.regionHint}>Celé Slovensko zobrazí eventy zo všetkých krajov.</Text>
            <View style={styles.regionGrid}>
              {regions.map((region) => {
                const selected = value.regions.includes(region)
                const isAllSlovakia = region === 'Celé Slovensko'
                return <Pressable key={region} accessibilityRole="checkbox" accessibilityState={{ checked: selected }} onPress={() => change({ ...value, regions: toggle(value.regions, region) })} style={[styles.regionOption, isAllSlovakia && styles.regionOptionWide, selected && { backgroundColor: theme.primary, borderColor: theme.primary }]}><Text style={[styles.regionText, selected && { color: theme.onPrimary }]}>{region}</Text></Pressable>
              })}
            </View>
          </ScrollView>
        </View>
      </View>
    </SystemModal>
  </>
}
