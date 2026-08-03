import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker'
import { useEffect, useState } from 'react'
import { Platform, Pressable, Text, View } from 'react-native'
import { SystemModal } from '../system/SystemModal'
import { formStyles } from '../styles/formStyles'
import { useAccentStyles } from '../theme/useAccentStyles'

type Props = {
  visible: boolean
  initialDate: Date | null
  defaultDate?: Date
  minimumDate?: Date
  maximumDate?: Date
  onClose: () => void
  onSelect: (date: Date) => void
}

const fallbackDate = () => new Date()

/**
 * Uses the platform date dialog on Android and the native spinner on iOS.
 * The web target keeps a compact select fallback because the community
 * picker intentionally has no browser implementation.
 */
export function DatePickerModal(props: Props) {
  if (Platform.OS === 'web') return <WebDatePickerModal {...props} />
  return <NativeDatePickerModal {...props} />
}

function NativeDatePickerModal({
  visible,
  initialDate,
  defaultDate,
  minimumDate,
  maximumDate,
  onClose,
  onSelect,
}: Props) {
  const accent = useAccentStyles()
  const [draft, setDraft] = useState(initialDate ?? defaultDate ?? fallbackDate())

  useEffect(() => {
    if (visible) setDraft(initialDate ?? defaultDate ?? fallbackDate())
  }, [visible, initialDate, defaultDate])

  if (!visible) return null

  const handleChange = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') {
      if (event.type === 'set' && date) onSelect(date)
      else onClose()
      return
    }
    if (date) setDraft(date)
  }

  if (Platform.OS === 'android') {
    return (
      <DateTimePicker
        value={draft}
        mode="date"
        display="default"
        minimumDate={minimumDate}
        maximumDate={maximumDate}
        onChange={handleChange}
      />
    )
  }

  return (
    <SystemModal
      visible
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={formStyles.modalOverlay}>
        <View style={formStyles.modalSheet}>
          <Text style={formStyles.modalTitle}>Vyber dátum</Text>
          <DateTimePicker
            value={draft}
            mode="date"
            display="spinner"
            minimumDate={minimumDate}
            maximumDate={maximumDate}
            onChange={handleChange}
          />
          <View style={formStyles.modalActions}>
            <Pressable onPress={onClose}>
              <Text style={formStyles.cancelText}>Zrušiť</Text>
            </Pressable>
            <Pressable
              style={[formStyles.saveDateButton, accent.primaryButton]}
              onPress={() => onSelect(draft)}
            >
              <Text style={[formStyles.saveDateText, accent.primaryText]}>OK</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </SystemModal>
  )
}

const monthNames = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Máj', 'Jún',
  'Júl', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec',
]

function WebDatePickerModal({
  visible,
  initialDate,
  defaultDate,
  onClose,
  onSelect,
}: Props) {
  const accent = useAccentStyles()
  const base = initialDate ?? defaultDate ?? fallbackDate()
  const [year, setYear] = useState(base.getFullYear())
  const [month, setMonth] = useState(base.getMonth())
  const [day, setDay] = useState(base.getDate())

  useEffect(() => {
    if (!visible) return
    const next = initialDate ?? defaultDate ?? fallbackDate()
    setYear(next.getFullYear())
    setMonth(next.getMonth())
    setDay(next.getDate())
  }, [visible, initialDate, defaultDate])

  if (!visible) return null
  const dayCount = new Date(year, month + 1, 0).getDate()

  return (
    <SystemModal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={formStyles.modalOverlay}>
        <View style={formStyles.modalSheet}>
          <Text style={formStyles.modalTitle}>Vyber dátum</Text>
          <View style={formStyles.monthGrid}>
            {monthNames.map((name, index) => (
              <Pressable
                key={name}
                style={[
                  formStyles.monthOption,
                  month === index && formStyles.dateOptionSelected,
                  month === index && accent.selectedChip,
                ]}
                onPress={() => setMonth(index)}
              >
                <Text style={formStyles.dateOptionText}>{name}</Text>
              </Pressable>
            ))}
          </View>
          <View style={formStyles.dayGrid}>
            {Array.from({ length: dayCount }, (_, index) => index + 1).map((value) => (
              <Pressable
                key={value}
                style={[
                  formStyles.dayOption,
                  day === value && formStyles.dateOptionSelected,
                ]}
                onPress={() => setDay(value)}
              >
                <Text style={formStyles.dateOptionText}>{value}</Text>
              </Pressable>
            ))}
          </View>
          <View style={formStyles.optionRow}>
            {Array.from({ length: 115 }, (_, index) => new Date().getFullYear() + 14 - index).map((value) => (
              <Pressable
                key={value}
                style={[
                  formStyles.dateOption,
                  year === value && formStyles.dateOptionSelected,
                ]}
                onPress={() => setYear(value)}
              >
                <Text style={formStyles.dateOptionText}>{value}</Text>
              </Pressable>
            ))}
          </View>
          <View style={formStyles.modalActions}>
            <Pressable onPress={onClose}>
              <Text style={formStyles.cancelText}>Zrušiť</Text>
            </Pressable>
            <Pressable
              style={[formStyles.saveDateButton, accent.primaryButton]}
              onPress={() => onSelect(new Date(year, month, Math.min(day, dayCount)))}
            >
              <Text style={[formStyles.saveDateText, accent.primaryText]}>OK</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </SystemModal>
  )
}
