import { Image, Pressable, Text, View } from 'react-native'
import { useState } from 'react'
import { AppTextInput } from '../../../components/AppTextInput'
import { DatePickerModal } from '../../../components/DatePickerModal'
import { ValidatedCatalogInput } from '../../../components/ValidatedCatalogInput'
import { formStyles } from '../../../styles/formStyles'
import { teamStyles } from '../../../styles/teamStyles'
import { SystemModal } from '../../../system/SystemModal'
import { useAccentStyles } from '../../../theme/useAccentStyles'
import type { AuthenticatedFetch, EventPayload } from '../../../types/domain'
import {
  AGE_GROUPS,
  EVENT_TYPES,
  GENDER_CATEGORIES,
  NATIONWIDE_REGIONS,
  SLOVAK_REGIONS,
  TEAM_FORMATS,
} from '../eventFormOptions'
import { useEventCreationForm } from '../hooks/useEventCreationForm'

type Props = {
  onCreate: (payload: EventPayload) => Promise<void>
  fetcher: AuthenticatedFetch
  message: string
  onCreated?: () => void
  inModal?: boolean
}

type ChipOption = { value: string; label: string }

const PRIMARY_SPORT_CODES = new Set(['FOOTBALL', 'FLOORBALL', 'BASKETBALL', 'VOLLEYBALL'])
const SPORT_EMOJIS: Record<string, string> = {
  FOOTBALL: '⚽', FLOORBALL: '🏑', BASKETBALL: '🏀', VOLLEYBALL: '🏐',
  RUNNING: '🏃', BADMINTON: '🏸', TENNIS: '🎾', TABLE_TENNIS: '🏓',
  SPORT_GAMES: '🏅', PICKLEBALL: '🥎',
}

function formatTimeInput(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 4)
  return digits.length > 2 ? `${digits.slice(0, 2)}:${digits.slice(2)}` : digits
}

function SportPicker({ sports, value, onChange }: { sports: { code: string; name: string }[]; value: string; onChange: (value: string) => void }) {
  const accent = useAccentStyles()
  const [expanded, setExpanded] = useState(false)
  const primarySports = sports.filter((sport) => PRIMARY_SPORT_CODES.has(sport.code))
  const extraSports = sports.filter((sport) => !PRIMARY_SPORT_CODES.has(sport.code))
  const visibleSports = expanded ? [...primarySports, ...extraSports] : primarySports

  return <View style={formStyles.sportPicker}>
    <View style={formStyles.sportGrid}>
      {visibleSports.map((item) => {
        const selected = item.name === value
        return <Pressable key={item.code} accessibilityRole="button" accessibilityState={{ selected }} onPress={() => onChange(item.name)} style={[formStyles.sportOption, selected && formStyles.sportOptionSelected, selected && accent.selectedChip]}>
          <Text style={formStyles.sportOptionEmoji}>{SPORT_EMOJIS[item.code] ?? '🏅'}</Text>
          <Text numberOfLines={1} style={[formStyles.sportOptionText, selected && formStyles.sportOptionTextSelected, selected && accent.primaryText]}>{item.name === 'Basketbal 3x3' ? 'Basketbal' : item.name}</Text>
        </Pressable>
      })}
    </View>
    {extraSports.length ? <Pressable accessibilityRole="button" onPress={() => setExpanded((current) => !current)} style={formStyles.expandSportsButton}>
      <Text style={[formStyles.expandSportsText, accent.accentText]}>{expanded ? 'Zobraziť menej športov ↑' : `Ďalšie športy (${extraSports.length}) ↓`}</Text>
    </Pressable> : null}
  </View>
}

function ChipPicker({
  options,
  value,
  onChange,
  compact = false,
}: {
  options: readonly ChipOption[]
  value: string
  onChange: (value: string) => void
  compact?: boolean
}) {
  const accent = useAccentStyles()
  return (
    <View style={[formStyles.genderRow, compact && formStyles.compactChipRow]}>
      {options.map((option) => {
        const selected = option.value === value
        return (
          <Pressable
            key={option.value}
            style={[
              formStyles.genderChip,
              compact && formStyles.compactChip,
              selected && formStyles.genderChipSelected,
              selected && accent.selectedChip,
            ]}
            onPress={() => onChange(option.value)}
          >
            <Text
              style={[
                formStyles.genderText,
                compact && formStyles.compactChipText,
                selected && formStyles.genderTextSelected,
                selected && accent.primaryText,
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

export function CreateEventForm({
  onCreate,
  fetcher,
  message,
  onCreated,
  inModal = false,
}: Props) {
  const form = useEventCreationForm(fetcher, onCreate)
  const accent = useAccentStyles()
  const isLeague = form.eventType === 'LEAGUE'
  const cityRequired = !NATIONWIDE_REGIONS.has(form.region)
  const [regionsExpanded, setRegionsExpanded] = useState(false)
  const [openCategories, setOpenCategories] = useState<Set<number>>(() => new Set([0]))
  const [showTimePicker, setShowTimePicker] = useState(false)
  const [timeDraft, setTimeDraft] = useState('')
  const [showCoverPicker, setShowCoverPicker] = useState(false)
  const [coverDraft, setCoverDraft] = useState('')

  const selectRegion = (region: string) => {
    form.setRegion(region)
    setRegionsExpanded(false)
  }

  const addCategory = () => {
    const nextIndex = form.categories.length
    form.addCategory()
    setOpenCategories(new Set([nextIndex]))
  }

  const removeCategory = (index: number) => {
    form.removeCategory(index)
    setOpenCategories((current) => {
      const next = new Set<number>()
      current.forEach((openIndex) => {
        if (openIndex < index) next.add(openIndex)
        if (openIndex > index) next.add(openIndex - 1)
      })
      return next
    })
  }

  const collapseCategories = () => setOpenCategories(new Set())

  const openTimePicker = () => {
    collapseCategories()
    setTimeDraft(form.eventTime)
    setShowTimePicker(true)
  }

  const openCoverPicker = () => {
    collapseCategories()
    setCoverDraft(form.coverImageUrl)
    setShowCoverPicker(true)
  }

  return (
    <>
      <View
        style={inModal ? formStyles.modalEventForm : teamStyles.form}
        onTouchStart={collapseCategories}
      >
        <Text style={[teamStyles.title, inModal && formStyles.modalEventTitle]}>
          Vytvoriť event
        </Text>

        <View style={formStyles.eventFormSection}>
          <Text style={formStyles.eventSectionLabel}>ZÁKLADNÉ ÚDAJE</Text>
        <View style={formStyles.eventFormColumns}>
          <View style={formStyles.eventFormColumn}>
            <Text style={formStyles.pickerLabel}>TYP</Text>
            <ChipPicker
              options={EVENT_TYPES}
              value={form.eventType}
              onChange={(value) => form.setEventType(value as typeof form.eventType)}
              compact
            />
          </View>
        </View>
        <Text style={teamStyles.muted}>
          {isLeague ? 'Sezónna liga v podzáložke Ligy.' : 'Turnaj, ktorý sa zobrazí v Eventoch.'}
        </Text>

        <View style={formStyles.nameCoverRow}>
          <View style={formStyles.nameField}>
            <Text style={formStyles.pickerLabel}>
              {isLeague ? 'NÁZOV LIGY' : 'NÁZOV TURNAJA'}
            </Text>
            <AppTextInput
              value={form.name}
              onChangeText={form.setName}
              onFocus={collapseCategories}
              placeholder={isLeague ? 'Názov ligy' : 'Názov turnaja'}
              style={formStyles.input}
              maxLength={180}
            />
          </View>
          <Pressable accessibilityRole="button" onPress={openCoverPicker} style={formStyles.coverPickerButton}>
            {form.coverImageUrl ? (
              <Image source={{ uri: form.coverImageUrl }} style={formStyles.coverPreview} />
            ) : (
              <Text style={formStyles.coverPickerEmoji}>🖼️</Text>
            )}
            <Text numberOfLines={1} style={formStyles.coverPickerTitle}>
              {form.coverImageUrl ? 'Upraviť' : 'Titulovka'}
            </Text>
          </Pressable>
        </View>

        <Text style={formStyles.pickerLabel}>ŠPORT</Text>
        <SportPicker sports={form.sports} value={form.sport} onChange={(sport) => { collapseCategories(); form.setSport(sport) }} />
        {form.sport ? (
          <Text style={teamStyles.muted}>
            Účasť sa nastavila automaticky: {form.mode === 'TEAM' ? 'tímový šport' : 'individuálny šport'}.
          </Text>
        ) : null}
        </View>

        <View style={formStyles.eventFormSection}>
          <Text style={formStyles.eventSectionLabel}>TERMÍN A MIESTO</Text>
        <Text style={formStyles.pickerLabel}>
          {isLeague ? 'DÁTUM ZAČIATKU SEZÓNY' : 'DÁTUM A ČAS'}
        </Text>
        <View style={formStyles.dateTimeControl}>
        <Pressable style={formStyles.dateTimeDate} onPress={() => { collapseCategories(); form.setShowDatePicker(true) }}>
          <Text
            style={
              form.eventDate
                ? formStyles.dateValue
                : formStyles.datePlaceholder
            }
          >
            {form.eventDate
              ? form.eventDate.toLocaleDateString('sk-SK')
              : 'Vyber dátum'}
          </Text>
        </Pressable>
        {!isLeague ? (
          <Pressable accessibilityRole="button" onPress={openTimePicker} style={formStyles.dateTimeInput}>
            <Text style={form.eventTime ? formStyles.dateValue : formStyles.datePlaceholder}>
              {form.eventTime || 'Čas'}
            </Text>
          </Pressable>
        ) : null}
        </View>

        <Text style={formStyles.pickerLabel}>KRAJ</Text>
        <Pressable accessibilityRole="button" onPress={() => { collapseCategories(); setRegionsExpanded((current) => !current) }} style={formStyles.regionSelect}>
          <Text style={form.region ? formStyles.dateValue : formStyles.datePlaceholder}>{form.region || 'Vyber kraj'}</Text>
          <Text style={formStyles.regionChevron}>{regionsExpanded ? '↑' : '↓'}</Text>
        </Pressable>
        {regionsExpanded ? <View style={formStyles.regionOptions}>
          {SLOVAK_REGIONS.map((region) => <Pressable key={region} onPress={() => selectRegion(region)} style={[formStyles.regionOption, form.region === region && formStyles.regionOptionSelected, form.region === region && accent.selectedChip]}>
            <Text style={[formStyles.regionOptionText, form.region === region && accent.primaryText]}>{region}</Text>
          </Pressable>)}
        </View> : null}

        {cityRequired ? (
          <>
            <Text style={formStyles.pickerLabel}>MESTO</Text>
            <ValidatedCatalogInput
              selected={form.city}
              query={form.cityQuery}
              options={form.cities}
              placeholder={
                form.region ? 'Vyhľadaj mesto' : 'Najprv vyber kraj'
              }
              getKey={(item) => item.id}
              getLabel={(item) => item.name}
              getHint={(item) => `Okres ${item.district}`}
              onQueryChange={form.setCityQuery}
              onSelect={(item) => {
                form.setCity(item)
                form.setCityQuery('')
              }}
              onClearSelection={() => form.setCity(null)}
            />
          </>
        ) : null}

        <Text style={formStyles.pickerLabel}>
          PRESNÉ MIESTO KONANIA · VOLITEĽNÉ
        </Text>
        <AppTextInput
          value={form.venue}
          onChangeText={form.setVenue}
          onFocus={collapseCategories}
          placeholder="Napr. Sídlisko Ťahanovce, hala A"
          maxLength={240}
          style={formStyles.input}
        />
        </View>

        <View style={formStyles.eventFormSection}>
        <View style={formStyles.eventSectionHeading}>
          <View style={formStyles.eventSectionCopy}>
            <Text style={teamStyles.title}>Kategórie</Text>
            <Text style={teamStyles.muted}>
              Voliteľné — event môžeš vytvoriť aj bez kategórií.
            </Text>
          </View>
          <Pressable accessibilityRole="button" onPress={addCategory} style={[formStyles.addCategoryButton, accent.selectedChip]}>
            <Text style={[formStyles.addCategoryText, accent.primaryText]}>+ Pridať kategóriu</Text>
          </Pressable>
        </View>

        {form.categories.map((category, index) => {
          const isOpen = openCategories.has(index)
          const age = AGE_GROUPS.find((option) => option.value === category.age_group)?.label
          const format = TEAM_FORMATS.find((option) => option.value === category.team_format)?.label
          const gender = GENDER_CATEGORIES.find((option) => option.value === category.gender_category)?.label
          const title = age ?? `Kategória ${index + 1}`
          const summary = [format, gender, category.capacity && `${category.capacity} miest`, category.fee && `${category.fee} €`].filter(Boolean).join(' · ') || 'Nastav formát a pohlavie'
          return (
          <View
            key={index}
            style={formStyles.eventCategoryCard}
            onTouchStart={(event) => event.stopPropagation()}
          >
            <View style={formStyles.eventSectionHeading}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded: isOpen }}
                onPress={() => setOpenCategories((current) => current.has(index) ? new Set() : new Set([index]))}
                style={formStyles.categoryCardHeader}
              >
                <View style={formStyles.categoryCardCopy}>
                  <Text style={teamStyles.title}>{isOpen ? `Kategória ${index + 1}` : title}</Text>
                  <Text numberOfLines={1} style={formStyles.categorySummary}>{summary}</Text>
                </View>
                <Text style={[formStyles.categoryAction, accent.accentText]}>{isOpen ? 'Hotovo' : 'Upraviť detail'}</Text>
              </Pressable>
              <Pressable onPress={() => removeCategory(index)}>
                <Text style={formStyles.eventRemoveText}>Odstrániť</Text>
              </Pressable>
            </View>

            {isOpen ? <>
            <Text style={formStyles.pickerLabel}>VEKOVÁ KATEGÓRIA</Text>
            <ChipPicker
              options={AGE_GROUPS}
              value={category.age_group}
              onChange={(value) =>
                form.updateCategory(index, {
                  age_group: value as typeof category.age_group,
                })
              }
            />

            <Text style={formStyles.pickerLabel}>FORMÁT</Text>
            <ChipPicker
              options={TEAM_FORMATS}
              value={category.team_format}
              onChange={(value) =>
                form.updateCategory(index, {
                  team_format: value as typeof category.team_format,
                })
              }
            />

            <Text style={formStyles.pickerLabel}>POHLAVIE</Text>
            <ChipPicker
              options={GENDER_CATEGORIES}
              value={category.gender_category}
              onChange={(value) =>
                form.updateCategory(index, {
                  gender_category:
                    value as typeof category.gender_category,
                })
              }
            />

            <View style={formStyles.eventNumberRow}>
              <View style={formStyles.eventNumberField}>
                <Text style={formStyles.pickerLabel}>ŠTARTOVNÉ €</Text>
                <AppTextInput
                  value={category.fee}
                  onChangeText={(fee) =>
                    form.updateCategory(index, { fee })
                  }
                  placeholder="0"
                  keyboardType="decimal-pad"
                  style={formStyles.input}
                />
              </View>
              <View style={formStyles.eventNumberField}>
                <Text style={formStyles.pickerLabel}>KAPACITA</Text>
                <AppTextInput
                  value={category.capacity}
                  onChangeText={(capacity) =>
                    form.updateCategory(index, { capacity })
                  }
                  placeholder={form.mode === 'TEAM' ? 'Tímy' : 'Hráči'}
                  keyboardType="number-pad"
                  style={formStyles.input}
                />
              </View>
            </View>
            </> : null}
          </View>
          )
        })}
        </View>

        <View style={formStyles.eventFormSection}>
          <Text style={formStyles.eventSectionLabel}>DOPLNKOVÉ INFORMÁCIE</Text>
        <Text style={formStyles.pickerLabel}>
          {isLeague
            ? 'POPIS / PRAVIDLÁ LIGY · VOLITEĽNÉ'
            : 'POPIS / PRAVIDLÁ TURNAJA · VOLITEĽNÉ'}
        </Text>
        <AppTextInput
          value={form.description}
          onChangeText={form.setDescription}
          onFocus={collapseCategories}
          placeholder="Informácie a pravidlá pre účastníkov"
          style={[
            formStyles.input,
            { minHeight: 100, textAlignVertical: 'top' },
          ]}
          multiline
          maxLength={2000}
        />

        <Pressable
          style={[teamStyles.primary, accent.primaryButton]}
          disabled={form.busy}
          onPress={() => {
            void form.submit().then((created) => {
              if (created) onCreated?.()
            })
          }}
        >
          <Text style={[teamStyles.primaryText, accent.primaryText]}>
            {form.busy
              ? 'Ukladám…'
              : isLeague
                ? 'Vytvoriť ligu'
                : 'Vytvoriť turnaj'}
          </Text>
        </Pressable>
        {form.error ? (
          <Text style={formStyles.error}>{form.error}</Text>
        ) : null}
        {message ? <Text style={formStyles.error}>{message}</Text> : null}
        </View>
      </View>

      <DatePickerModal
        visible={form.showDatePicker}
        initialDate={form.eventDate}
        onClose={() => form.setShowDatePicker(false)}
        onSelect={(selected) => {
          form.setEventDate(selected)
          form.setShowDatePicker(false)
        }}
      />
      <SystemModal visible={showTimePicker} transparent animationType="fade" onRequestClose={() => setShowTimePicker(false)}>
        <View style={formStyles.modalOverlay}>
          <View style={formStyles.modalSheet}>
            <Text style={formStyles.modalTitle}>Zadaj čas</Text>
            <Text style={formStyles.modalHint}>Použi formát HH:MM, napríklad 18:30.</Text>
            <AppTextInput
              autoFocus
              value={timeDraft}
              onChangeText={(value) => setTimeDraft(formatTimeInput(value))}
              placeholder="18:30"
              keyboardType="number-pad"
              maxLength={5}
              style={formStyles.input}
            />
            <View style={formStyles.modalActions}>
              <Pressable onPress={() => setShowTimePicker(false)}><Text style={formStyles.cancelText}>Zrušiť</Text></Pressable>
              <Pressable style={[formStyles.saveDateButton, accent.primaryButton]} onPress={() => { form.setEventTime(timeDraft); setShowTimePicker(false) }}>
                <Text style={[formStyles.saveDateText, accent.primaryText]}>Potvrdiť</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </SystemModal>
      <SystemModal visible={showCoverPicker} transparent animationType="fade" onRequestClose={() => setShowCoverPicker(false)}>
        <View style={formStyles.modalOverlay}>
          <View style={formStyles.modalSheet}>
            <Text style={formStyles.modalTitle}>Cover fotka</Text>
            <Text style={formStyles.modalHint}>Vlož odkaz na obrázok. Fotka je voliteľná.</Text>
            <AppTextInput
              autoFocus
              value={coverDraft}
              onChangeText={setCoverDraft}
              placeholder="https://…"
              autoCapitalize="none"
              keyboardType="url"
              style={formStyles.input}
            />
            <View style={formStyles.modalActions}>
              <Pressable onPress={() => { form.setCoverImageUrl(''); setShowCoverPicker(false) }}><Text style={formStyles.cancelText}>Odstrániť</Text></Pressable>
              <Pressable style={[formStyles.saveDateButton, accent.primaryButton]} onPress={() => { form.setCoverImageUrl(coverDraft.trim()); setShowCoverPicker(false) }}>
                <Text style={[formStyles.saveDateText, accent.primaryText]}>Potvrdiť</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </SystemModal>
    </>
  )
}
