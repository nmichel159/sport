import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import QRCode from 'react-native-qrcode-svg'
import { formStyles } from '../../../styles/formStyles'
import { mainStyles } from '../../../styles/mainStyles'
import { teamStyles } from '../../../styles/teamStyles'
import { useAccentStyles } from '../../../theme/useAccentStyles'
import type { ApiEvent, ApiTeam, AuthenticatedFetch } from '../../../types/domain'
import { MyTournamentScreen } from './MyTournamentScreen'
import { SystemModal } from '../../../system/SystemModal'

type Props = {
  event: ApiEvent
  teams: ApiTeam[]
  userId: string
  fetcher: AuthenticatedFetch
  onBack: () => void
  onRegister: (event: ApiEvent, teamId?: string) => Promise<void>
  message: string
}

export function EventDetailScreen({
  event,
  teams,
  userId,
  fetcher,
  onBack,
  onRegister,
  message,
}: Props) {
  const accent = useAccentStyles()
  const [choosing, setChoosing] = useState(false)
  const [showTournament, setShowTournament] = useState(false)
  const [showQr, setShowQr] = useState(false)
  const ownedTeamIds = new Set(teams.map((team) => team.id))
  const isRegistered = event.registrations.some(
    (registration) =>
      registration.user_id === userId ||
      (registration.team_id !== null && ownedTeamIds.has(registration.team_id)),
  )
  const ownRegistration = event.registrations.find(
    (registration) => registration.user_id === userId ||
      (registration.team_id !== null && ownedTeamIds.has(registration.team_id)),
  )
  const qrValue = JSON.stringify({
    type: 'sport-pass', version: 1,
    event: { id: event.id, name: event.name, sport: event.sport, date: event.event_date ?? null, location: event.location ?? null },
    participant: ownRegistration ? { id: ownRegistration.id, name: ownRegistration.name, type: ownRegistration.type } : null,
  })

  if (showTournament) {
    return (
      <MyTournamentScreen
        event={event}
        userId={userId}
        ownedTeamIds={ownedTeamIds}
        fetcher={fetcher}
        onBack={() => setShowTournament(false)}
      />
    )
  }

  return (
    <>
      <Pressable onPress={onBack}>
        <Text style={[teamStyles.back, accent.accentText]}>← Späť na eventy</Text>
      </Pressable>

      <View style={teamStyles.form}>
        <View style={teamStyles.eventTitleRow}>
        <Text style={teamStyles.sectionTitle}>
          {event.sport.toUpperCase()} ·{' '}
          {event.participation_type === 'TEAM'
            ? 'TÍMOVÝ EVENT'
            : 'INDIVIDUÁLNY EVENT'}
        </Text>
        {isRegistered ? <Pressable accessibilityLabel="Zobraziť QR vstupenku" onPress={() => setShowQr(true)} style={[teamStyles.qrButton, accent.outlineButton]}>
          <Text style={[teamStyles.qrButtonText, accent.accentText]}>▦ QR</Text>
        </Pressable> : null}
        </View>
        <Text style={mainStyles.homeGreeting}>{event.name}</Text>
        <Text style={teamStyles.muted}>
          {event.event_date ?? 'Termín sa doplní'}
          {event.location ? ` · ${event.location}` : ''}
        </Text>
        <Text style={teamStyles.muted}>
          {event.fee == null
            ? 'Bez poplatku'
            : `Poplatok ${Number(event.fee).toFixed(2)} €`}
        </Text>
        {event.description ? (
          <Text style={mainStyles.mainMuted}>{event.description}</Text>
        ) : null}

        {isRegistered ? (
          <Pressable
            style={[teamStyles.primary, accent.primaryButton]}
            onPress={() => setShowTournament(true)}
          >
            <Text style={[teamStyles.primaryText, accent.primaryText]}>Môj priebeh turnaja</Text>
          </Pressable>
        ) : event.participation_type === 'INDIVIDUAL' ? (
          <Pressable
            style={[teamStyles.primary, accent.primaryButton]}
            onPress={() => void onRegister(event)}
          >
            <Text style={[teamStyles.primaryText, accent.primaryText]}>Prihlásiť sa</Text>
          </Pressable>
        ) : choosing ? (
          <View style={teamStyles.section}>
            <Text style={teamStyles.muted}>
              Vyber tím, ktorý chceš prihlásiť:
            </Text>
            {teams.length ? (
              teams.map((team) => (
                <Pressable
                  key={team.id}
                  style={[teamStyles.button, accent.outlineButton]}
                  onPress={() => void onRegister(event, team.id)}
                >
                  <Text style={[teamStyles.buttonText, accent.accentText]}>{team.name}</Text>
                </Pressable>
              ))
            ) : (
              <Text style={formStyles.error}>
                Nemáš tím, ktorého si vlastníkom.
              </Text>
            )}
          </View>
        ) : (
          <Pressable
            style={[teamStyles.primary, accent.primaryButton]}
            onPress={() => setChoosing(true)}
          >
            <Text style={[teamStyles.primaryText, accent.primaryText]}>Prihlásiť tím</Text>
          </Pressable>
        )}

        {message ? <Text style={[teamStyles.buttonText, accent.accentText]}>{message}</Text> : null}
      </View>

      <SystemModal visible={showQr} transparent animationType="fade" onRequestClose={() => setShowQr(false)}>
        <Pressable style={teamStyles.qrOverlay} onPress={() => setShowQr(false)}>
          <Pressable style={teamStyles.qrSheet} onPress={(pressEvent) => pressEvent.stopPropagation()}>
            <Text style={teamStyles.qrTitle}>QR vstupenka</Text>
            <Text style={teamStyles.qrSubtitle}>{event.name}</Text>
            <View style={teamStyles.qrCodeWrap}><QRCode value={qrValue} size={220} backgroundColor="#ffffff" color="#101114" /></View>
            <Text style={teamStyles.qrParticipant}>{ownRegistration?.name}</Text>
            <Text style={teamStyles.muted}>Kód funguje offline a obsahuje údaje o turnaji aj účastníkovi.</Text>
            <Pressable onPress={() => setShowQr(false)} style={[teamStyles.primary, accent.primaryButton]}><Text style={[teamStyles.primaryText, accent.primaryText]}>Zavrieť</Text></Pressable>
          </Pressable>
        </Pressable>
      </SystemModal>
      <Text style={teamStyles.sectionTitle}>
        PRIHLÁSENÍ ({event.registrations.length})
      </Text>
      {event.registrations.length ? (
        event.registrations.map((registration) => (
          <View style={teamStyles.member} key={registration.id}>
            <View style={teamStyles.memberAvatar}>
              <Text style={teamStyles.memberAvatarText}>
                {registration.name.slice(0, 1).toUpperCase()}
              </Text>
            </View>
            <View>
              <Text style={teamStyles.title}>{registration.name}</Text>
              <Text style={teamStyles.muted}>
                {registration.type === 'TEAM' ? 'Tím' : 'Hráč'}
              </Text>
            </View>
          </View>
        ))
      ) : (
        <Text style={teamStyles.muted}>
          Zatiaľ nikto nie je prihlásený.
        </Text>
      )}
    </>
  )
}
