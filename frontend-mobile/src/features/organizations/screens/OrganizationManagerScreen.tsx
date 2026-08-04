import { useEffect, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { AppTextInput } from '../../../components/AppTextInput'
import { formStyles } from '../../../styles/formStyles'
import { teamStyles } from '../../../styles/teamStyles'
import { useAccentStyles } from '../../../theme/useAccentStyles'
import type {
  ApiOrganization,
  AuthenticatedFetch,
  EventPayload,
} from '../../../types/domain'
import { requestOrganization } from '../services/organizationApi'
import { OrganizationEventManagerScreen } from './OrganizationEventManagerScreen'

type Props = {
  organizations: ApiOrganization[]
  setOrganizations: React.Dispatch<React.SetStateAction<ApiOrganization[]>>
  fetcher: AuthenticatedFetch
  createEventRequest?: number
}

export function OrganizationManagerScreen({
  organizations,
  setOrganizations,
  fetcher,
  createEventRequest = 0,
}: Props) {
  const accent = useAccentStyles()
  const [name, setName] = useState('')
  const [active, setActive] = useState<ApiOrganization | null>(
    () => organizations[0] ?? null,
  )
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!active && organizations.length) setActive(organizations[0])
  }, [active, organizations])

  const create = async () => {
    try {
      const item = await requestOrganization(
        fetcher,
        '/organizations',
        'POST',
        { name },
      )
      setOrganizations((current) => [item, ...current])
      setActive(item)
      setName('')
    } catch {
      setMessage('Organizáciu sa nepodarilo vytvoriť.')
    }
  }

  const update = async (
    path: string,
    method: string,
    body?: EventPayload,
  ) => {
    try {
      const item = await requestOrganization(fetcher, path, method, body)
      setOrganizations((current) =>
        current.map((organization) =>
          organization.id === item.id ? item : organization,
        ),
      )
      setActive(item)
    } catch {
      setMessage('Zmenu sa nepodarilo uložiť.')
      throw Error('ORGANIZATION_UPDATE_FAILED')
    }
  }

  if (active) {
    return (
      <OrganizationEventManagerScreen
        organization={active}
        fetcher={fetcher}
        onCreate={(payload) =>
          update(`/organizations/${active.id}/events`, 'POST', payload)
        }
        onUpdate={(eventId, payload) =>
          update(
            `/organizations/${active.id}/events/${eventId}`,
            'PUT',
            payload,
          )
        }
        message={message}
        createEventRequest={createEventRequest}
      />
    )
  }

  return (
    <>
      <View style={teamStyles.form}>
        <Text style={teamStyles.title}>Nová organizácia</Text>
        <AppTextInput
          value={name}
          onChangeText={setName}
          placeholder="Názov organizácie"
          placeholderTextColor="#9aa0a8"
          style={formStyles.input}
        />
        <Pressable
          style={[teamStyles.primary, accent.primaryButton]}
          onPress={() => void create()}
        >
          <Text style={[teamStyles.primaryText, accent.primaryText]}>Vytvoriť organizáciu</Text>
        </Pressable>
      </View>
      {message ? <Text style={formStyles.error}>{message}</Text> : null}
    </>
  )
}
