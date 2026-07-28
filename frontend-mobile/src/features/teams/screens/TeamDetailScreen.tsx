import { useState } from 'react'
import { Pressable, Text, TextInput, View } from 'react-native'
import { formStyles } from '../../../styles/formStyles'
import { teamStyles } from '../../../styles/teamStyles'
import type { ApiTeam } from '../../../types/domain'

type Props = {
  team: ApiTeam
  onBack: () => void
  onAdd: (id: string, nickname: string) => Promise<void>
}

export function TeamDetailScreen({ team, onBack, onAdd }: Props) {
  const [adding, setAdding] = useState(false)
  const [nickname, setNickname] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const add = async () => {
    if (!nickname.trim()) return

    setBusy(true)
    setError('')

    try {
      await onAdd(team.id, nickname)
      setNickname('')
      setAdding(false)
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'Hráča sa nepodarilo pridať.',
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Pressable onPress={onBack}>
        <Text style={teamStyles.back}>← Späť na profil</Text>
      </Pressable>
      <View style={[teamStyles.card, teamStyles.hero]}>
        <Text style={teamStyles.title}>{team.name}</Text>
        <Text style={teamStyles.muted}>
          {team.members.length} členovia
        </Text>
      </View>
      <Text style={teamStyles.sectionTitle}>HRÁČI TÍMU</Text>
      {team.members.map((member) => (
        <View style={teamStyles.member} key={member.id}>
          <View style={teamStyles.memberAvatar}>
            <Text style={teamStyles.memberAvatarText}>
              {member.nickname.slice(0, 1).toUpperCase()}
            </Text>
          </View>
          <Text style={teamStyles.title}>@{member.nickname}</Text>
        </View>
      ))}

      {adding ? (
        <View style={teamStyles.form}>
          <Text style={teamStyles.title}>Pridať hráča cez nick</Text>
          <Text style={teamStyles.muted}>
            Zadaj presný jedinečný nick hráča.
          </Text>
          <TextInput
            value={nickname}
            onChangeText={setNickname}
            placeholder="nick_hraca"
            placeholderTextColor="#9aa0a8"
            style={formStyles.input}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <View style={teamStyles.actions}>
            <Pressable onPress={() => setAdding(false)}>
              <Text style={teamStyles.cancel}>Zrušiť</Text>
            </Pressable>
            <Pressable
              style={teamStyles.primary}
              onPress={() => void add()}
              disabled={busy}
            >
              <Text style={teamStyles.primaryText}>Pridať</Text>
            </Pressable>
          </View>
          {error ? <Text style={formStyles.error}>{error}</Text> : null}
        </View>
      ) : (
        <Pressable
          style={teamStyles.button}
          onPress={() => setAdding(true)}
        >
          <Text style={teamStyles.buttonText}>
            + Pridať hráča cez nick
          </Text>
        </Pressable>
      )}
    </>
  )
}

