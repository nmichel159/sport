import type { FormEvent } from 'react'

type Props = { name: string; saving: boolean; onNameChange: (value: string) => void; onSubmit: (event: FormEvent) => void }
export function OrganizationPicker({ name, saving, onNameChange, onSubmit }: Props) { return <section className="organization-picker"><div><h2>Tvoje organizácie</h2><p>Vyber organizáciu, ktorej eventy chceš spravovať.</p></div><form onSubmit={onSubmit}><input value={name} onChange={(event) => onNameChange(event.target.value)} placeholder="Názov novej organizácie" maxLength={180} /><button disabled={saving}>Pridať organizáciu</button></form></section> }
