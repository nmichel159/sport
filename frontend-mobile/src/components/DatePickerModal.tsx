import { useEffect, useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { SystemModal } from '../system/SystemModal'
import { formStyles } from '../styles/formStyles'

const months = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'Máj',
  'Jún',
  'Júl',
  'Aug',
  'Sep',
  'Okt',
  'Nov',
  'Dec',
]

type Props = {
  visible: boolean
  initialDate: Date | null
  onClose: () => void
  onSelect: (date: Date) => void
}

export function DatePickerModal({
  visible,
  initialDate,
  onClose,
  onSelect,
}: Props) {
  const base = initialDate ?? new Date(2000, 0, 1)
  const [year, setYear] = useState(base.getFullYear())
  const [month, setMonth] = useState(base.getMonth())
  const [day, setDay] = useState(base.getDate())

  useEffect(() => {
    if (!visible) return

    const date = initialDate ?? new Date(2000, 0, 1)
    setYear(date.getFullYear())
    setMonth(date.getMonth())
    setDay(date.getDate())

  }, [visible, initialDate])

  const days = Array.from(
    { length: new Date(year, month + 1, 0).getDate() },
    (_, index) => index + 1,
  )

  return (
    <SystemModal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={formStyles.modalOverlay}>
        <View style={formStyles.modalSheet}>
          <Text style={formStyles.modalTitle}>Vyber dátum narodenia</Text>
          <Text style={formStyles.modalHint}>
            Rok, mesiac a deň vyber kliknutím.
          </Text>

          <Text style={formStyles.pickerLabel}>Rok</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={formStyles.optionRow}
          >
            {Array.from(
              { length: 100 },
              (_, index) => new Date().getFullYear() - index,
            ).map((value) => (
              <Pressable
                key={value}
                style={[
                  formStyles.dateOption,
                  year === value && formStyles.dateOptionSelected,
                ]}
                onPress={() => setYear(value)}
              >
                <Text
                  style={[
                    formStyles.dateOptionText,
                    year === value && formStyles.dateOptionTextSelected,
                  ]}
                >
                  {value}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <Text style={formStyles.pickerLabel}>Mesiac</Text>
          <View style={formStyles.monthGrid}>
            {months.map((name, index) => (
              <Pressable
                key={name}
                style={[
                  formStyles.monthOption,
                  month === index && formStyles.dateOptionSelected,
                ]}
                onPress={() => setMonth(index)}
              >
                <Text
                  style={[
                    formStyles.dateOptionText,
                    month === index && formStyles.dateOptionTextSelected,
                  ]}
                >
                  {name}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={formStyles.pickerLabel}>Deň</Text>
          <View style={formStyles.dayGrid}>
            {days.map((value) => (
              <Pressable
                key={value}
                style={[
                  formStyles.dayOption,
                  day === value && formStyles.dateOptionSelected,
                ]}
                onPress={() => setDay(value)}
              >
                <Text
                  style={[
                    formStyles.dateOptionText,
                    day === value && formStyles.dateOptionTextSelected,
                  ]}
                >
                  {value}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={formStyles.modalActions}>
            <Pressable onPress={onClose}>
              <Text style={formStyles.cancelText}>Zrušiť</Text>
            </Pressable>
            <Pressable
              style={formStyles.saveDateButton}
              onPress={() =>
                onSelect(new Date(year, month, Math.min(day, days.length)))
              }
            >
              <Text style={formStyles.saveDateText}>OK</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </SystemModal>
  )
}
