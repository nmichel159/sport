import { StyleSheet } from 'react-native'

export const discoveryFilterStyles = StyleSheet.create({
  wrap: { position: 'relative', zIndex: 4 },
  trigger: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: 22, backgroundColor: '#17181c' },
  triggerIcon: { fontSize: 21, fontWeight: '900' },
  count: { position: 'absolute', top: -4, right: -4, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', borderRadius: 9 },
  countText: { fontSize: 10, fontWeight: '900' },
  panel: { gap: 10, marginTop: 10, padding: 14, borderWidth: 1, borderColor: '#34373e', borderRadius: 18, backgroundColor: '#17181c' },
  panelHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  title: { color: '#f3f4f6', fontSize: 14, fontWeight: '900' },
  hint: { marginTop: 2, color: '#9aa0a8', fontSize: 10 },
  clear: { fontSize: 11, fontWeight: '900' },
  label: { marginTop: 3, color: '#9aa0a8', fontSize: 10, fontWeight: '900', letterSpacing: 0.7 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  chip: { paddingHorizontal: 10, paddingVertical: 7, borderWidth: 1, borderColor: '#34373e', borderRadius: 999, backgroundColor: '#202228' },
  chipText: { color: '#d9dce1', fontSize: 11, fontWeight: '700' },
})
