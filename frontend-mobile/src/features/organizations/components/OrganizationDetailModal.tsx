import { Pressable, ScrollView, Text, View } from 'react-native'
import { SystemModal } from '../../../system/SystemModal'
import { formStyles } from '../../../styles/formStyles'
import { teamStyles } from '../../../styles/teamStyles'
import type { ApiOrganization } from '../../../types/domain'
import { AddOrganizationMemberModal } from './AddOrganizationMemberModal'

type Props = {
  organization: ApiOrganization
  message: string
  nickname: string
  memberFormVisible: boolean
  onNicknameChange: (nickname: string) => void
  onClose: () => void
  onOpenMemberForm: () => void
  onCloseMemberForm: () => void
  onAddMember: () => void
}

export function OrganizationDetailModal({
  organization,
  message,
  nickname,
  memberFormVisible,
  onNicknameChange,
  onClose,
  onOpenMemberForm,
  onCloseMemberForm,
  onAddMember,
}: Props) {
  return (
    <SystemModal
      visible
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={formStyles.modalOverlay}>
        <View style={formStyles.modalSheet}>
          <View style={teamStyles.info}>
            <Text style={formStyles.modalTitle}>{organization.name}</Text>
            <Text style={teamStyles.muted}>
              {organization.members.length} členovia
            </Text>
          </View>
          <Text style={teamStyles.sectionTitle}>ČLENOVIA</Text>
          <ScrollView
            style={{ maxHeight: 260 }}
            contentContainerStyle={teamStyles.section}
          >
            {organization.members.map((member) => (
              <View key={member.id} style={teamStyles.member}>
                <Text style={teamStyles.title}>@{member.nickname}</Text>
                <Text style={teamStyles.muted}>{member.role}</Text>
              </View>
            ))}
          </ScrollView>
          <Pressable style={teamStyles.button} onPress={onOpenMemberForm}>
            <Text style={teamStyles.buttonText}>+ Pridať člena</Text>
          </Pressable>
          <Pressable onPress={onClose}>
            <Text style={formStyles.cancelText}>Zavrieť</Text>
          </Pressable>
          {message ? <Text style={formStyles.error}>{message}</Text> : null}

          <AddOrganizationMemberModal
            visible={memberFormVisible}
            nickname={nickname}
            onNicknameChange={onNicknameChange}
            onClose={onCloseMemberForm}
            onAdd={onAddMember}
          />
        </View>
      </View>
    </SystemModal>
  )
}
