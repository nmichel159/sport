import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { formStyles } from '../../../styles/formStyles'
import { teamStyles } from '../../../styles/teamStyles'
import type {
  ApiOrganization,
  AuthenticatedFetch,
} from '../../../types/domain'
import { CreateOrganizationModal } from '../components/CreateOrganizationModal'
import { OrganizationDetailModal } from '../components/OrganizationDetailModal'
import { requestOrganization } from '../services/organizationApi'

type Props = {
  organizations: ApiOrganization[]
  setOrganizations: React.Dispatch<React.SetStateAction<ApiOrganization[]>>
  fetcher: AuthenticatedFetch
}

export function ProfileOrganizationManagerScreen({
  organizations,
  setOrganizations,
  fetcher,
}: Props) {
  const [organizationName, setOrganizationName] = useState('')
  const [nickname, setNickname] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [showMemberForm, setShowMemberForm] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [message, setMessage] = useState('')

  const selected = organizations.find(
    (organization) => organization.id === selectedId,
  )

  const create = async () => {
    if (!organizationName.trim()) return

    try {
      const item = await requestOrganization(
        fetcher,
        '/organizations',
        'POST',
        { name: organizationName.trim() },
      )
      setOrganizations((current) => [item, ...current])
      setOrganizationName('')
      setShowCreateForm(false)
      setSelectedId(item.id)
      setMessage('Organizácia je vytvorená.')
    } catch {
      setMessage('Organizáciu sa nepodarilo vytvoriť.')
    }
  }

  const addMember = async () => {
    if (!selected || !nickname.trim()) return

    try {
      const item = await requestOrganization(
        fetcher,
        `/organizations/${selected.id}/members`,
        'POST',
        { nickname: nickname.trim() },
      )
      setOrganizations((current) =>
        current.map((organization) =>
          organization.id === item.id ? item : organization,
        ),
      )
      setNickname('')
      setMessage('Člen je pridaný.')
    } catch {
      setMessage(
        'Člena sa nepodarilo pridať. Pridávať môže iba vlastník organizácie.',
      )
    }
  }

  const closeDetail = () => {
    setSelectedId(null)
    setMessage('')
  }

  if (selected) {
    return (
      <OrganizationDetailModal
        organization={selected}
        message={message}
        nickname={nickname}
        memberFormVisible={showMemberForm}
        onNicknameChange={setNickname}
        onClose={closeDetail}
        onOpenMemberForm={() => setShowMemberForm(true)}
        onCloseMemberForm={() => setShowMemberForm(false)}
        onAddMember={() => {
          void addMember()
          setShowMemberForm(false)
        }}
      />
    )
  }

  return (
    <View style={teamStyles.section}>
      <Text style={teamStyles.sectionTitle}>ORGANIZÁCIE</Text>
      {organizations.map((organization) => (
        <Pressable
          key={organization.id}
          style={teamStyles.card}
          onPress={() => setSelectedId(organization.id)}
        >
          <View style={teamStyles.info}>
            <Text style={teamStyles.title}>{organization.name}</Text>
            <Text style={teamStyles.muted}>
              {organization.members.length} členovia
            </Text>
          </View>
          <Text style={teamStyles.buttonText}>›</Text>
        </Pressable>
      ))}
      <Pressable
        style={teamStyles.button}
        onPress={() => setShowCreateForm(true)}
      >
        <Text style={teamStyles.buttonText}>+ Vytvoriť organizáciu</Text>
      </Pressable>
      {message ? <Text style={formStyles.error}>{message}</Text> : null}

      <CreateOrganizationModal
        visible={showCreateForm}
        name={organizationName}
        onNameChange={setOrganizationName}
        onClose={() => setShowCreateForm(false)}
        onCreate={() => void create()}
      />
    </View>
  )
}
