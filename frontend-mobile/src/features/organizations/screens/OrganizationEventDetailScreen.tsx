import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import QRCode from 'react-native-qrcode-svg'
import { teamStyles } from '../../../styles/teamStyles'
import { useAccentStyles } from '../../../theme/useAccentStyles'
import { SystemModal } from '../../../system/SystemModal'
import type {
  ApiEvent,
  AuthenticatedFetch,
  EventPayload,
} from '../../../types/domain'
import { EventEditForm } from '../components/EventEditForm'
import { EventManagementMenu } from '../components/EventManagementMenu'
import { TournamentPanel } from '../components/TournamentPanel'
import { eventInviteUrl, shareEventInvite } from '../../events/services/eventInvite'

type DetailSection = 'menu' | 'edit' | 'tournament'

type Props = {
  event: ApiEvent
  organizationId: string
  fetcher: AuthenticatedFetch
  onSave: (eventId: string, payload: EventPayload) => Promise<void>
}

export function OrganizationEventDetailScreen({
  event,
  organizationId,
  fetcher,
  onSave,
}: Props) {
  const accent = useAccentStyles()
  const [section, setSection] = useState<DetailSection>('menu')
  const [name, setName] = useState(event.name)
  const [description, setDescription] = useState(event.description ?? '')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [showInviteQr, setShowInviteQr] = useState(false)
  const [inviteShareError, setInviteShareError] = useState('')
  const inviteQrValue = eventInviteUrl(event.invite_token)

  const save = async () => {
    if (
      !event.event_date ||
      !event.region ||
      !event.categories.length ||
      (event.event_type === 'TOURNAMENT' && !event.event_time)
    ) {
      setMessage(
        'Starší event nemá všetky nové povinné údaje. Vytvor ho cez nový formulár.',
      )
      return
    }
    setSaving(true)
    setMessage('')

    try {
      await onSave(event.id, {
        name,
        event_type: event.event_type,
        sport: event.sport,
        participation_type: event.participation_type,
        format_id: event.format_id,
        event_date: event.event_date,
        event_time: event.event_time,
        region: event.region,
        city_id: event.city_id,
        city: event.city,
        venue: event.venue,
        cover_image_url: event.cover_image_url,
        categories: event.categories.map(
          ({ age_group, team_format, gender_category, fee, capacity }) => ({
            age_group,
            team_format,
            gender_category,
            fee,
            capacity,
          }),
        ),
        description,
      })
      setMessage('Základné údaje sú uložené.')
    } catch {
      setMessage('Zmeny sa nepodarilo uložiť.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <View style={teamStyles.card}>
        <View style={teamStyles.eventTitleRow}>
          <View style={teamStyles.info}>
            <Text style={teamStyles.title}>{event.name}</Text>
            <Text style={teamStyles.muted}>
              {event.sport} · {event.event_date} · {event.location}
            </Text>
          </View>
          <Pressable accessibilityLabel="Zobraziť QR pozvánku na event" onPress={() => setShowInviteQr(true)} style={[teamStyles.qrButton, accent.outlineButton]}>
            <Text style={[teamStyles.qrButtonText, accent.accentText]}>▦ Zdieľať</Text>
          </Pressable>
        </View>
      </View>

      {section === 'menu' ? (
        <EventManagementMenu
          onEdit={() => setSection('edit')}
          onOpenTournament={() => setSection('tournament')}
        />
      ) : section === 'edit' ? (
        <EventEditForm
          name={name}
          description={description}
          saving={saving}
          message={message}
          onNameChange={setName}
          onDescriptionChange={setDescription}
          onSave={() => void save()}
          onBack={() => setSection('menu')}
        />
      ) : (
        <TournamentPanel
          event={event}
          organizationId={organizationId}
          fetcher={fetcher}
          onBack={() => setSection('menu')}
        />
      )}
      <SystemModal visible={showInviteQr} transparent animationType="fade" onRequestClose={() => setShowInviteQr(false)}>
        <Pressable style={teamStyles.qrOverlay} onPress={() => setShowInviteQr(false)}>
          <Pressable style={teamStyles.qrSheet} onPress={(pressEvent) => pressEvent.stopPropagation()}>
            <Text style={teamStyles.qrTitle}>QR pozvánka na event</Text>
            <Text style={teamStyles.qrSubtitle}>{event.name}</Text>
            {inviteQrValue ? <><View style={teamStyles.qrCodeWrap}><QRCode value={inviteQrValue} size={220} backgroundColor="#ffffff" color="#101114" /></View><Pressable onPress={() => void shareEventInvite(event).catch(() => setInviteShareError('Zdieľanie sa nepodarilo otvoriť. Skús to prosím ešte raz.'))} style={[teamStyles.primary, accent.primaryButton]}><Text style={[teamStyles.primaryText, accent.primaryText]}>Zdieľať cez aplikácie</Text></Pressable><Text selectable style={teamStyles.qrLink}>{inviteQrValue}</Text></> : <Text style={teamStyles.qrError}>Pozvánka ešte nemá platný token. Pripoj sa k aktuálnemu serveru a obnov event.</Text>}
            {inviteShareError ? <Text style={teamStyles.qrError}>{inviteShareError}</Text> : null}
            <Text style={teamStyles.muted}>Po načítaní sa druhému používateľovi otvorí detail eventu s prihlásením.</Text>
            <Pressable onPress={() => setShowInviteQr(false)} style={[teamStyles.primary, accent.primaryButton]}><Text style={[teamStyles.primaryText, accent.primaryText]}>Zavrieť</Text></Pressable>
          </Pressable>
        </Pressable>
      </SystemModal>
    </>
  )
}
