import { useState } from 'react'
import { Pressable, Text, TextInput, View } from 'react-native'
import { teamColors } from '../../../constants/teamColors'
import { formStyles } from '../../../styles/formStyles'
import { mainStyles } from '../../../styles/mainStyles'
import { teamStyles } from '../../../styles/teamStyles'
import type { ApiTeam } from '../../../types/domain'

type Props = {
  name: string
  teams: ApiTeam[]
  onCreate: (name: string) => Promise<void>
  onOpen: (id: string) => void
  onSignOut: () => Promise<void>
}

export function TeamsProfileContent({
  name,
  teams,
  onCreate,
  onOpen,
  onSignOut,
}: Props) {
  const [creating, setCreating] = useState(false)
  const [teamName, setTeamName] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  const create = async () => {
    if (!teamName.trim()) return

    setBusy(true)
    setMessage('')

    try {
      await onCreate(teamName)
      setTeamName('')
      setCreating(false)
    } catch {
      setMessage('Tím sa nepodarilo vytvoriť.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <View style={mainStyles.profileCard}>
        <View style={mainStyles.avatar}>
          <Text style={mainStyles.avatarText}>
            {name.slice(0, 1).toUpperCase()}
          </Text>
        </View>
        <Text style={mainStyles.profileName}>{name}</Text>
      </View>

      <View style={teamStyles.section}>
        <Text style={teamStyles.sectionTitle}>MOJE TÍMY</Text>
        {teams.map((team, index) => (
          <Pressable
            key={team.id}
            style={teamStyles.card}
            onPress={() => onOpen(team.id)}
          >
            <View
              style={[
                teamStyles.badge,
                {
                  backgroundColor:
                    teamColors[index % teamColors.length],
                },
              ]}
            >
              <Text style={teamStyles.badgeText}>
                {team.name.slice(0, 2).toUpperCase()}
              </Text>
            </View>
            <View style={teamStyles.info}>
              <Text style={teamStyles.title}>{team.name}</Text>
              <Text style={teamStyles.muted}>
                {team.members.length} členovia
              </Text>
            </View>
          </Pressable>
        ))}

        {creating ? (
          <View style={teamStyles.form}>
            <Text style={teamStyles.title}>Vytvoriť tím</Text>
            <TextInput
              value={teamName}
              onChangeText={setTeamName}
              placeholder="Názov tímu"
              placeholderTextColor="#9aa0a8"
              style={formStyles.input}
            />
            <View style={teamStyles.actions}>
              <Pressable onPress={() => setCreating(false)}>
                <Text style={teamStyles.cancel}>Zrušiť</Text>
              </Pressable>
              <Pressable
                style={teamStyles.primary}
                onPress={() => void create()}
                disabled={busy}
              >
                <Text style={teamStyles.primaryText}>Vytvoriť</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable
            style={teamStyles.button}
            onPress={() => setCreating(true)}
          >
            <Text style={teamStyles.buttonText}>+ Vytvoriť tím</Text>
          </Pressable>
        )}
      </View>

      {message ? <Text style={formStyles.error}>{message}</Text> : null}
      <Pressable
        style={mainStyles.signOutButton}
        onPress={() => void onSignOut()}
      >
        <Text style={mainStyles.signOutText}>Odhlásiť sa</Text>
      </Pressable>
    </>
  )
}

