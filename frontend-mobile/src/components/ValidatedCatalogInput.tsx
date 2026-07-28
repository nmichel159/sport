import { Keyboard, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'

/**
 * Search-only catalog field. A value becomes valid only after selecting an
 * option; focusing an already selected value starts a clean new search.
 */
export function ValidatedCatalogInput<T>({
  selected,
  query,
  options,
  placeholder,
  getKey,
  getLabel,
  getHint,
  onQueryChange,
  onSelect,
  onClearSelection,
}: {
  selected: T | null
  query: string
  options: T[]
  placeholder: string
  getKey: (option: T) => string
  getLabel: (option: T) => string
  getHint: (option: T) => string
  onQueryChange: (query: string) => void
  onSelect: (option: T) => void
  onClearSelection: () => void
}) {
  const beginNewSearch = () => {
    if (selected) {
      onClearSelection()
      onQueryChange('')
    }
  }

  const suggestions = !selected && options.length > 0 ? (
    <View style={styles.suggestions}>
      {options.map((option) => <Pressable key={getKey(option)} style={styles.option} onPress={() => {
        Keyboard.dismiss()
        onSelect(option)
      }}>
        <Text style={styles.optionTitle}>{getLabel(option)}</Text>
        <Text style={styles.optionHint}>{getHint(option)}</Text>
      </Pressable>)}
    </View>
  ) : null

  return <View style={styles.container}>
    <TextInput
      value={selected ? getLabel(selected) : query}
      onFocus={beginNewSearch}
      onChangeText={onQueryChange}
      placeholder={placeholder}
      placeholderTextColor="#9aa0a8"
      style={styles.input}
    />
    {suggestions}
  </View>
}

const styles = StyleSheet.create({
  container: { position: 'relative', zIndex: 10 },
  suggestions: {
    position: 'absolute',
    bottom: '100%',
    left: 0,
    right: 0,
    gap: 6,
    marginBottom: 6,
    zIndex: 20,
    elevation: 20,
  },
  input: { backgroundColor: '#1d1f24', borderColor: '#2b2e34', borderWidth: 1.5, borderRadius: 12, padding: 13, color: '#f3f4f6', fontSize: 16 },
  option: { backgroundColor: '#22252b', borderColor: '#343841', borderWidth: 1, borderRadius: 10, padding: 10, gap: 2 },
  optionTitle: { color: '#f3f4f6', fontSize: 13, fontWeight: '700' },
  optionHint: { color: '#9aa0a8', fontSize: 12 },
})
