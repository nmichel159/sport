import { StyleSheet } from 'react-native'

export const loginStyles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#0b0c0e',
  },
  card: {
    backgroundColor: '#17181c',
    borderColor: '#2b2e34',
    borderWidth: 1,
    borderRadius: 20,
    padding: 22,
    gap: 16,
  },
  brand: { color: '#f3f4f6', fontSize: 20, fontWeight: '800' },
  accent: { color: '#ffd400' },
  title: { color: '#f3f4f6', fontSize: 34, fontWeight: '800' },
  subtitle: { color: '#9aa0a8', fontSize: 16, lineHeight: 23 },
  note: { color: '#9aa0a8', fontSize: 13, lineHeight: 19 },
  button: {
    backgroundColor: '#ffd400',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
  },
  buttonText: { color: '#171400', fontSize: 15, fontWeight: '800' },
})

