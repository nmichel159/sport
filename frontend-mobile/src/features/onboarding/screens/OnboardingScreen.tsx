import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native'
import { DatePickerModal } from '../../../components/DatePickerModal'
import { Field } from '../../../components/Field'
import { ValidatedCatalogInput } from '../../../components/ValidatedCatalogInput'
import { formStyles } from '../../../styles/formStyles'
import type { OnboardingData } from '../../../types/onboarding'
import { GenderSelector } from '../components/GenderSelector'
import { useOnboardingForm } from '../hooks/useOnboardingForm'

type Props = {
  defaultName: string
  completeOnboarding: (data: OnboardingData) => Promise<void>
}

export function OnboardingScreen(props: Props) {
  const form = useOnboardingForm(props)

  return (
    <KeyboardAvoidingView
      style={formStyles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={formStyles.onboardingContainer}
        keyboardShouldPersistTaps="always"
      >
        <Text style={formStyles.brand}>
          3×3 <Text style={formStyles.accent}>SPORT</Text>
        </Text>
        <View style={formStyles.card}>
          <Text style={formStyles.title}>Spoznajme sa.</Text>

          <Field label="Nick">
            <TextInput
              style={formStyles.input}
              value={form.nickname}
              onChangeText={form.setNickname}
              autoCapitalize="none"
            />
          </Field>

          <Field label="Meno">
            <TextInput
              style={formStyles.input}
              value={form.firstName}
              onChangeText={form.setFirstName}
            />
          </Field>

          <Field label="Priezvisko">
            <TextInput
              style={formStyles.input}
              value={form.lastName}
              onChangeText={form.setLastName}
            />
          </Field>

          <Field label="Škola">
            <ValidatedCatalogInput
              selected={form.school}
              query={form.schoolQuery}
              options={form.schools}
              placeholder="Napíš aspoň 2 znaky"
              getKey={(item) => item.code}
              getLabel={(item) => `${item.name} · ${item.municipality}`}
              getHint={(item) => item.municipality}
              onQueryChange={form.setSchoolQuery}
              onSelect={(item) => {
                form.setSchool(item)
                form.setSchoolQuery('')
              }}
              onClearSelection={() => form.setSchool(null)}
            />
          </Field>

          <Field label="Okresné mesto">
            <ValidatedCatalogInput
              selected={form.city}
              query={form.cityQuery}
              options={form.cities}
              placeholder="Napíš mesto"
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
          </Field>

          <Field label="Dátum narodenia">
            <Pressable
              style={formStyles.dateButton}
              onPress={() => form.setShowDatePicker(true)}
            >
              <Text
                style={
                  form.birthDate
                    ? formStyles.dateValue
                    : formStyles.datePlaceholder
                }
              >
                {form.birthDate
                  ? form.birthDate.toLocaleDateString('sk-SK')
                  : 'Vyber dátum'}
              </Text>
            </Pressable>
          </Field>

          <Field label="Pohlavie">
            <GenderSelector
              value={form.gender}
              onChange={form.setGender}
            />
          </Field>

          {form.error ? (
            <Text style={formStyles.error}>{form.error}</Text>
          ) : null}

          <Pressable
            style={formStyles.continueButton}
            disabled={form.busy}
            onPress={() => void form.submit()}
          >
            <Text style={formStyles.continueText}>
              {form.busy ? 'Ukladám…' : 'Pokračovať →'}
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      <DatePickerModal
        visible={form.showDatePicker}
        initialDate={form.birthDate}
        onClose={() => form.setShowDatePicker(false)}
        onSelect={(date) => {
          form.setBirthDate(date)
          form.setShowDatePicker(false)
        }}
      />
    </KeyboardAvoidingView>
  )
}
