import { StyleSheet } from 'react-native'

export const homeTournamentStyles = StyleSheet.create({
  section: { gap: 9, marginTop: 10 },
  heading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { color: '#9aa0a8', fontSize: 12, fontWeight: '800', letterSpacing: 0.8 },
  count: { fontSize: 13, fontWeight: '900' },
  card: { minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 16, borderWidth: 1, borderColor: '#2b2e34', backgroundColor: '#17181c' },
  dateBadge: { width: 42, alignItems: 'center', justifyContent: 'center', paddingVertical: 5, borderRadius: 11 },
  dateBadgeText: { fontSize: 17, fontWeight: '900', lineHeight: 20 },
  month: { color: '#9aa0a8', fontSize: 9, fontWeight: '800' },
  info: { flex: 1, gap: 2 },
  name: { color: '#f3f4f6', fontSize: 13, fontWeight: '800' },
  meta: { color: '#9aa0a8', fontSize: 10 },
  status: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 99 },
  statusText: { fontSize: 9, fontWeight: '900' },
  empty: { padding: 14, borderRadius: 15, borderWidth: 1, borderColor: '#2b2e34', borderStyle: 'dashed' },
  emptyText: { color: '#858a93', fontSize: 11, textAlign: 'center' },
})
