import { StyleSheet, Text, View } from 'react-native'
import { BackendStatus } from '../components/BackendStatus'

export default function HomeScreen() {
  return <View style={styles.container}><Text style={styles.title}>Sport</Text><Text>Expo mobile client is running.</Text><BackendStatus /></View>
}

const styles = StyleSheet.create({ container: { flex: 1, justifyContent: 'center', gap: 12, padding: 24 }, title: { fontSize: 32, fontWeight: '700' } })
