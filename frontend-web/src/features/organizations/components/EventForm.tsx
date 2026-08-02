import type { FormEvent } from 'react'
import { ClickDateField } from '../../../components/ClickDateField'
import type { EventCategoryInput, EventInput } from '../../../services/api'

type Props = {
  event: EventInput
  saving: boolean
  onChange: <K extends keyof EventInput>(key: K, value: EventInput[K]) => void
  onSubmit: (event: FormEvent) => void
}

const sports = [
  'Futbal',
  'Florbal',
  'Basketbal 3x3',
  'Volejbal',
  'Beh',
  'Bedminton',
  'Tenis',
  'Stolný tenis',
  '3x3sportgames',
  'Pickleball',
]
const regions = [
  'Celé Slovensko',
  'Bratislavský kraj',
  'Trnavský kraj',
  'Trenčiansky kraj',
  'Nitriansky kraj',
  'Žilinský kraj',
  'Banskobystrický kraj',
  'Prešovský kraj',
  'Košický kraj',
]
const newCategory = (): EventCategoryInput => ({
  age_group: 'open',
  team_format: '3v3',
  gender_category: 'mix',
  fee: 0,
  capacity: 8,
})

export function EventForm({ event, saving, onChange, onSubmit }: Props) {
  const league = event.event_type === 'LEAGUE'
  const changeCategory = (index: number, patch: Partial<EventCategoryInput>) =>
    onChange(
      'categories',
      event.categories.map((category, current) =>
        current === index ? { ...category, ...patch } : category,
      ),
    )

  return (
    <section className="event-form-card">
      <span className="eyebrow">NOVÝ EVENT</span>
      <h2>Vytvor event</h2>
      <p>Turnaj aj liga sa uložia spolu so všetkými kategóriami.</p>
      <form className="event-form" onSubmit={onSubmit}>
        <fieldset>
          <legend>Typ</legend>
          <div className="mode-choice">
            <button
              type="button"
              className={!league ? 'selected' : ''}
              onClick={() => onChange('event_type', 'TOURNAMENT')}
            >
              Turnaj
            </button>
            <button
              type="button"
              className={league ? 'selected' : ''}
              onClick={() => {
                onChange('event_type', 'LEAGUE')
                onChange('event_time', null)
              }}
            >
              Liga
            </button>
          </div>
        </fieldset>
        <label>
          Cover fotka · voliteľné
          <input
            type="url"
            value={event.cover_image_url ?? ''}
            onChange={(input) =>
              onChange('cover_image_url', input.target.value || null)
            }
            placeholder="URL obrázka"
          />
        </label>
        <label>
          {league ? 'Názov ligy' : 'Názov turnaja'}
          <input
            required
            value={event.name}
            onChange={(input) => onChange('name', input.target.value)}
          />
        </label>
        <div className="form-grid">
          <label>
            Šport
            <select
              required
              value={event.sport}
              onChange={(input) => onChange('sport', input.target.value)}
            >
              <option value="">Vyber šport</option>
              {sports.map((sport) => (
                <option key={sport}>{sport}</option>
              ))}
            </select>
          </label>
          <ClickDateField
            label={league ? 'Začiatok sezóny' : 'Dátum'}
            value={event.event_date}
            onChange={(value) => onChange('event_date', value)}
          />
        </div>
        {!league ? (
          <label>
            Čas
            <input
              required
              type="time"
              value={event.event_time ?? ''}
              onChange={(input) =>
                onChange('event_time', input.target.value || null)
              }
            />
          </label>
        ) : null}
        <fieldset>
          <legend>Forma účasti</legend>
          <div className="mode-choice">
            <button
              type="button"
              className={event.participation_type === 'TEAM' ? 'selected' : ''}
              onClick={() => onChange('participation_type', 'TEAM')}
            >
              Tímové
            </button>
            <button
              type="button"
              className={
                event.participation_type === 'INDIVIDUAL' ? 'selected' : ''
              }
              onClick={() => onChange('participation_type', 'INDIVIDUAL')}
            >
              Jednotlivci
            </button>
          </div>
        </fieldset>
        <label>
          Kraj
          <select
            required
            value={event.region}
            onChange={(input) => {
              onChange('region', input.target.value)
              onChange('city_id', null)
              onChange('city', null)
            }}
          >
            <option value="">Vyber kraj</option>
            {regions.map((region) => (
              <option key={region}>{region}</option>
            ))}
          </select>
        </label>
        {event.region !== 'Celé Slovensko' ? (
          <label>
            Mesto
            <input
              required
              value={event.city ?? ''}
              onChange={(input) => {
                const city = input.target.value
                onChange('city', city || null)
                onChange(
                  'city_id',
                  city
                    ? city
                        .normalize('NFD')
                        .replace(/[\u0300-\u036f]/g, '')
                        .toLowerCase()
                        .replace(/[^a-z0-9]+/g, '-')
                    : null,
                )
              }}
            />
          </label>
        ) : null}
        <label>
          Presné miesto konania · voliteľné
          <input
            value={event.venue ?? ''}
            onChange={(input) => onChange('venue', input.target.value || null)}
            placeholder="Hala, ihrisko alebo adresa"
          />
        </label>
        <div className="section-heading">
          <h3>Kategórie</h3>
          <button
            type="button"
            onClick={() =>
              onChange('categories', [...event.categories, newCategory()])
            }
          >
            + Pridať
          </button>
        </div>
        {event.categories.map((category, index) => (
          <fieldset className="event-category" key={index}>
            <legend>Kategória {index + 1}</legend>
            <div className="form-grid">
              <label>
                Vek
                <select
                  value={category.age_group}
                  onChange={(input) =>
                    changeCategory(index, {
                      age_group: input.target
                        .value as EventCategoryInput['age_group'],
                    })
                  }
                >
                  <option value="kids">Kids · 8–10</option>
                  <option value="junior">Junior · 11–14</option>
                  <option value="open">Open · 15+</option>
                  <option value="veterani">Veteráni</option>
                </select>
              </label>
              <label>
                Formát
                <select
                  value={category.team_format}
                  onChange={(input) =>
                    changeCategory(index, {
                      team_format: input.target
                        .value as EventCategoryInput['team_format'],
                    })
                  }
                >
                  {['1v1', '2v2', '3v3', '3v3g', '4v4', '5v5'].map((format) => (
                    <option key={format}>{format}</option>
                  ))}
                </select>
              </label>
              <label>
                Pohlavie
                <select
                  value={category.gender_category}
                  onChange={(input) =>
                    changeCategory(index, {
                      gender_category: input.target
                        .value as EventCategoryInput['gender_category'],
                    })
                  }
                >
                  <option value="muzi">Muži</option>
                  <option value="zeny">Ženy</option>
                  <option value="mix">MIX</option>
                </select>
              </label>
              <label>
                Štartovné (€)
                <input
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  value={category.fee}
                  onChange={(input) =>
                    changeCategory(index, { fee: Number(input.target.value) })
                  }
                />
              </label>
              <label>
                Kapacita
                <input
                  required
                  type="number"
                  min="1"
                  step="1"
                  value={category.capacity}
                  onChange={(input) =>
                    changeCategory(index, {
                      capacity: Number(input.target.value),
                    })
                  }
                />
              </label>
            </div>
            {event.categories.length > 1 ? (
              <button
                type="button"
                onClick={() =>
                  onChange(
                    'categories',
                    event.categories.filter((_, current) => current !== index),
                  )
                }
              >
                Odstrániť kategóriu
              </button>
            ) : null}
          </fieldset>
        ))}
        <label>
          Popis / pravidlá · voliteľné
          <textarea
            value={event.description ?? ''}
            onChange={(input) =>
              onChange('description', input.target.value || null)
            }
            maxLength={2000}
          />
        </label>
        <p>XP doplní platforma; registrácia sa otvorí automaticky.</p>
        <button className="primary" disabled={saving}>
          {saving ? 'Ukladám…' : league ? 'Vytvoriť ligu' : 'Vytvoriť turnaj'}
        </button>
      </form>
    </section>
  )
}
