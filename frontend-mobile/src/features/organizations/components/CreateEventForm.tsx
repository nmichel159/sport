import { Pressable, Text, View } from 'react-native'
import { AppTextInput } from '../../../components/AppTextInput'
import { DatePickerModal } from '../../../components/DatePickerModal'
import { catalogStyles } from '../../../styles/catalogStyles'
import { formStyles } from '../../../styles/formStyles'
import { teamStyles } from '../../../styles/teamStyles'
import type { AuthenticatedFetch, EventPayload } from '../../../types/domain'
import { useEventCreationForm } from '../hooks/useEventCreationForm'

type Props = {
  onCreate: (payload: EventPayload) => Promise<void>
  fetcher: AuthenticatedFetch
  message: string
}

export function CreateEventForm({ onCreate, fetcher, message }: Props) {
  const form = useEventCreationForm(fetcher, onCreate)

  return (
    <>
      <View style={teamStyles.form}>
        <Text style={teamStyles.title}>Vytvoriť event</Text>
        <AppTextInput
          value={form.name}
          onChangeText={form.setName}
          placeholder="Názov eventu"
          placeholderTextColor="#9aa0a8"
          style={formStyles.input}
        />

        <Text style={teamStyles.muted}>Druh eventu / šport</Text>
        <View style={formStyles.genderRow}>
          {form.sports.map((item) => (
            <Pressable
              key={item.code}
              style={[
                formStyles.genderChip,
                form.sport === item.name && formStyles.genderChipSelected,
              ]}
              onPress={() => form.setSport(item.name)}
            >
              <Text style={formStyles.genderText}>{item.name}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={teamStyles.muted}>Účasť</Text>
        <View style={formStyles.genderRow}>
          <Pressable
            style={[
              formStyles.genderChip,
              form.mode === 'TEAM' && formStyles.genderChipSelected,
            ]}
            onPress={() => form.setMode('TEAM')}
          >
            <Text style={formStyles.genderText}>Tímové</Text>
          </Pressable>
          <Pressable
            style={[
              formStyles.genderChip,
              form.mode === 'INDIVIDUAL' && formStyles.genderChipSelected,
            ]}
            onPress={() => form.setMode('INDIVIDUAL')}
          >
            <Text style={formStyles.genderText}>Jednotlivci</Text>
          </Pressable>
        </View>

        <Text style={teamStyles.muted}>Herný systém</Text>
        <View style={formStyles.genderRow}>
          {form.formats.map((item) => {
            const selected = form.formatId === item.id
            return (
              <Pressable
                key={item.id}
                style={[
                  formStyles.genderChip,
                  selected && formStyles.genderChipSelected,
                ]}
                onPress={() => form.setFormatId(item.id)}
              >
                <Text
                  style={[
                    formStyles.genderText,
                    selected && formStyles.genderTextSelected,
                  ]}
                >
                  {item.code === 'SINGLE_ELIMINATION'
                    ? 'Pavúk'
                    : item.name}
                </Text>
              </Pressable>
            )
          })}
        </View>

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
              : 'Vyber dátum konania'}
          </Text>
        </Pressable>

        <AppTextInput
          value={form.city ? form.city.name : form.cityQuery}
          onChangeText={(value) => {
            form.setCity(null)
            form.setCityQuery(value)
          }}
          placeholder="Vyhľadaj mesto"
          placeholderTextColor="#9aa0a8"
          style={formStyles.input}
        />
        {form.cities.map((item) => (
          <Pressable
            key={item.id}
            style={catalogStyles.option}
            onPress={() => {
              form.setCity(item)
              form.setCityQuery('')
            }}
          >
            <View>
              <Text style={catalogStyles.optionTitle}>{item.name}</Text>
              <Text style={catalogStyles.optionHint}>
                Okres {item.district}
              </Text>
            </View>
          </Pressable>
        ))}

        <AppTextInput
          value={form.description}
          onChangeText={form.setDescription}
          placeholder="Popis eventu"
          placeholderTextColor="#9aa0a8"
          style={[
            formStyles.input,
            { minHeight: 88, textAlignVertical: 'top' },
          ]}
          multiline
        />

        <Pressable
          style={teamStyles.primary}
          disabled={form.busy}
          onPress={() => void form.submit()}
        >
          <Text style={teamStyles.primaryText}>
            {form.busy ? 'Ukladám…' : 'Vytvoriť event'}
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
