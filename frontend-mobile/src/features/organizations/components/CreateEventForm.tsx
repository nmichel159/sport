import { Pressable, Text, View } from 'react-native'
import { AppTextInput } from '../../../components/AppTextInput'
import { DatePickerModal } from '../../../components/DatePickerModal'
import { ValidatedCatalogInput } from '../../../components/ValidatedCatalogInput'
import { formStyles } from '../../../styles/formStyles'
import { teamStyles } from '../../../styles/teamStyles'
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

function ChipPicker({
  options,
  value,
  onChange,
}: {
  options: readonly ChipOption[]
  value: string
  onChange: (value: string) => void
}) {
  const accent = useAccentStyles()
  return (
    <View style={formStyles.genderRow}>
      {options.map((option) => {
        const selected = option.value === value
        return (
          <Pressable
            key={option.value}
            style={[
              formStyles.genderChip,
              selected && formStyles.genderChipSelected,
              selected && accent.selectedChip,
            ]}
            onPress={() => onChange(option.value)}
          >
            <Text
              style={[
                formStyles.genderText,
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

  return (
    <>
      <View style={inModal ? formStyles.modalEventForm : teamStyles.form}>
        <Text style={[teamStyles.title, inModal && formStyles.modalEventTitle]}>
          Vytvoriť event
        </Text>

        <Text style={formStyles.pickerLabel}>TYP</Text>
        <ChipPicker
          options={EVENT_TYPES}
          value={form.eventType}
          onChange={(value) =>
            form.setEventType(value as typeof form.eventType)
          }
        />
        <Text style={teamStyles.muted}>
          {isLeague
            ? 'Sezónna liga v podzáložke Ligy.'
            : 'Turnaj, ktorý sa zobrazí v Eventoch.'}
        </Text>

        <Text style={formStyles.pickerLabel}>COVER FOTKA · VOLITEĽNÉ</Text>
        <AppTextInput
          value={form.coverImageUrl}
          onChangeText={form.setCoverImageUrl}
          placeholder="URL obrázka (inak použijeme emoji športu)"
          autoCapitalize="none"
          keyboardType="url"
          style={formStyles.input}
        />

        <Text style={formStyles.pickerLabel}>
          {isLeague ? 'NÁZOV LIGY' : 'NÁZOV TURNAJA'}
        </Text>
        <AppTextInput
          value={form.name}
          onChangeText={form.setName}
          placeholder={isLeague ? 'Názov ligy' : 'Názov turnaja'}
          style={formStyles.input}
          maxLength={180}
        />

        <Text style={formStyles.pickerLabel}>ŠPORT</Text>
        <ChipPicker
          options={form.sports.map((item) => ({
            value: item.name,
            label: item.name === 'Basketbal 3x3' ? 'Basketbal' : item.name,
          }))}
          value={form.sport}
          onChange={form.setSport}
        />

        <Text style={formStyles.pickerLabel}>ÚČASŤ</Text>
        <ChipPicker
          options={[
            { value: 'TEAM', label: 'Tímové' },
            { value: 'INDIVIDUAL', label: 'Jednotlivci' },
          ]}
          value={form.mode}
          onChange={(value) => form.setMode(value as typeof form.mode)}
        />

        <Text style={formStyles.pickerLabel}>
          {isLeague ? 'DÁTUM ZAČIATKU SEZÓNY' : 'DÁTUM A ČAS'}
        </Text>
        <Pressable
          style={formStyles.dateButton}
          onPress={() => form.setShowDatePicker(true)}
        >
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
          <AppTextInput
            value={form.eventTime}
            onChangeText={form.setEventTime}
            placeholder="Čas vo formáte HH:MM"
            keyboardType="numbers-and-punctuation"
            maxLength={5}
            style={formStyles.input}
          />
        ) : null}

        <Text style={formStyles.pickerLabel}>KRAJ</Text>
        <ChipPicker
          options={SLOVAK_REGIONS.map((region) => ({
            value: region,
            label: region,
          }))}
          value={form.region}
          onChange={form.setRegion}
        />

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
          placeholder="Napr. Sídlisko Ťahanovce, hala A"
          maxLength={240}
          style={formStyles.input}
        />

        <View style={formStyles.eventSectionHeading}>
          <View style={formStyles.eventSectionCopy}>
            <Text style={teamStyles.title}>Kategórie</Text>
            <Text style={teamStyles.muted}>
              Vek • pohlavie • formát
            </Text>
          </View>
          <Pressable onPress={form.addCategory}>
            <Text style={[teamStyles.back, accent.accentText]}>
              + Pridať
            </Text>
          </Pressable>
        </View>

        {form.categories.map((category, index) => (
          <View key={index} style={formStyles.eventCategoryCard}>
            <View style={formStyles.eventSectionHeading}>
              <Text style={teamStyles.title}>Kategória {index + 1}</Text>
              {form.categories.length > 1 ? (
                <Pressable onPress={() => form.removeCategory(index)}>
                  <Text style={formStyles.eventRemoveText}>Odstrániť</Text>
                </Pressable>
              ) : null}
            </View>

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
          </View>
        ))}

        <Text style={formStyles.pickerLabel}>
          {isLeague
            ? 'POPIS / PRAVIDLÁ LIGY · VOLITEĽNÉ'
            : 'POPIS / PRAVIDLÁ TURNAJA · VOLITEĽNÉ'}
        </Text>
        <AppTextInput
          value={form.description}
          onChangeText={form.setDescription}
          placeholder="Informácie a pravidlá pre účastníkov"
          style={[
            formStyles.input,
            { minHeight: 100, textAlignVertical: 'top' },
          ]}
          multiline
          maxLength={2000}
        />

        <Text style={teamStyles.muted}>
          XP priradí platforma dodatočne. Registrácia sa po vytvorení otvorí.
        </Text>

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

      <DatePickerModal
        visible={form.showDatePicker}
        initialDate={form.eventDate}
        onClose={() => form.setShowDatePicker(false)}
        onSelect={(selected) => {
          form.setEventDate(selected)
          form.setShowDatePicker(false)
        }}
      />
    </>
  )
}
