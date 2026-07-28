import { StyleSheet } from 'react-native'

export const eventTabStyles = StyleSheet.create({
  tabs: {
    flexDirection: 'row',
    gap: 4,
    backgroundColor: '#30333a',
    borderRadius: 999,
    padding: 5,
    marginBottom: 14,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 999,
  },
  tabActive: { backgroundColor: '#ffd400' },
  label: { color: '#9aa0a8', fontSize: 13, fontWeight: '800' },
  labelActive: { color: '#171400' },
})

