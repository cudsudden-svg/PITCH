import { useEffect, useMemo, useState } from 'react'
import { supabase, supabaseConfigError } from '../supabase'

const cardAttributes = [
  ['pace', 'PAC'],
  ['shooting', 'SHO'],
  ['passing', 'PAS'],
  ['dribbling', 'DRI'],
  ['defending', 'DEF'],
  ['physical', 'PHY']
]

const defaultCard = {
  overall: 60,
  nationality: '',
  preferred_foot: 'Right',
  height_cm: '',
  photo_url: '',
  pace: 60,
  shooting: 60,
  passing: 60,
  dribbling: 60,
  defending: 60,
  physical: 60
}

function cardValues(card) {
  return { ...defaultCard, ...card }
}

function isMissingAuthSession(error) {
  return error?.name === 'AuthSessionMissingError' ||
    error?.message === 'Auth session missing!'
}

function getPositionCode(position) {
  return {
    Goalkeeper: 'GK',
    Defender: 'CB',
    Midfielder: 'CM',
    Forward: 'ST'
  }[position] || 'CM'
}

function PlayerCard({ player, card, selected, canEdit, onSelect }) {
  function handleKeyDown(event) {
    if (!canEdit || !['Enter', ' '].includes(event.key)) return

    event.preventDefault()
    onSelect(player.id)
  }

  return (
    <article
      className={`fifa-card${canEdit && selected ? ' selected' : ''}${canEdit ? ' editable' : ''}`}
      onClick={canEdit ? () => onSelect(player.id) : undefined}
      onKeyDown={canEdit ? handleKeyDown : undefined}
      role={canEdit ? 'button' : undefined}
      tabIndex={canEdit ? 0 : undefined}
      aria-pressed={canEdit ? selected : undefined}
    >
      <div className="fifa-card-art">
        <div className="fifa-card-top">
          <div className="fifa-card-rating">
            <strong>{card.overall}</strong>
            <span>{getPositionCode(player.position)}</span>
            <i className="fifa-card-mark">✦</i>
          </div>
          <div className="fifa-card-details">
            {card.nationality && <span>{card.nationality.toUpperCase()}</span>}
            <span>{card.preferred_foot} FOOT</span>
          </div>
        </div>
        <div className="fifa-card-portrait">
          {card.photo_url ? (
            <img src={card.photo_url} alt={`${player.name} portrait`} loading="lazy" />
          ) : (
            <div className="fifa-card-silhouette" aria-hidden="true" />
          )}
        </div>
        <div className="fifa-card-player">
          <span>PITCH PLAYER</span>
          <h2>{player.name}</h2>
          <div className="fifa-card-stats">
            <div className="fifa-card-stat-column">
              {cardAttributes.slice(0, 3).map(([field, label]) => (
                <div className="fifa-card-stat" key={field}>
                  <span>{label}</span>
                  <strong>{card[field]}</strong>
                </div>
              ))}
            </div>
            <span className="fifa-card-stat-divider" aria-hidden="true" />
            <div className="fifa-card-stat-column">
              {cardAttributes.slice(3).map(([field, label]) => (
                <div className="fifa-card-stat" key={field}>
                  <span>{label}</span>
                  <strong>{card[field]}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>
        <span className="fifa-card-crest" aria-hidden="true">P</span>
      </div>
      <div className="fifa-card-caption">
        <span>#{player.shirt_number ?? '—'} / {player.position || 'PLAYER'}</span>
        <span>PITCH · 2026</span>
      </div>
      {canEdit && (
        <span className="fifa-card-edit-hint">
          {selected ? 'SELECTED FOR EDITING' : 'SELECT TO EDIT'}
        </span>
      )}
    </article>
  )
}

export default function PlayerCardsPage({ selectedPlayerId, onNavigate }) {
  const [players, setPlayers] = useState([])
  const [cards, setCards] = useState({})
  const [activePlayerId, setActivePlayerId] = useState(selectedPlayerId || '')
  const [loading, setLoading] = useState(Boolean(supabase))
  const [saving, setSaving] = useState(false)
  const [canEdit, setCanEdit] = useState(false)
  const [error, setError] = useState(supabaseConfigError)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!supabase) return

    let active = true

    async function loadCards() {
      try {
        const [
          { data: playerData, error: playerError },
          { data: cardData, error: cardError },
          { data: { session }, error: authError }
        ] = await Promise.all([
          supabase
            .from('players')
            .select('id, name, shirt_number, position, is_active')
            .eq('is_active', true)
            .order('shirt_number', { ascending: true }),
          supabase
            .from('player_cards')
            .select('player_id, overall, nationality, preferred_foot, height_cm, photo_url, pace, shooting, passing, dribbling, defending, physical'),
          supabase.auth.getSession()
        ])

        if (playerError) throw playerError
        if (cardError) throw cardError
        if (authError && !isMissingAuthSession(authError)) throw authError

        let isEditor = false
        if (session?.user) {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .maybeSingle()

          if (profileError) throw profileError
          isEditor = ['owner', 'editor'].includes(profile?.role)
        }

        if (!active) return

        const loadedPlayers = playerData || []
        setPlayers(loadedPlayers)
        setCards(Object.fromEntries(
          (cardData || []).map(card => [card.player_id, cardValues(card)])
        ))
        setCanEdit(isEditor)
        setActivePlayerId(currentId => (
          loadedPlayers.some(player => player.id === currentId)
            ? currentId
            : loadedPlayers.some(player => player.id === selectedPlayerId)
              ? selectedPlayerId
              : loadedPlayers[0]?.id || ''
        ))
        setError('')
      } catch (loadError) {
        if (active) {
          setError(
            typeof loadError?.message === 'string'
              ? loadError.message
              : 'Could not load player cards.'
          )
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    loadCards()

    return () => {
      active = false
    }
  }, [selectedPlayerId])

  const activePlayer = players.find(player => player.id === activePlayerId)
  const activeCard = useMemo(
    () => cardValues(cards[activePlayerId]),
    [cards, activePlayerId]
  )

  function selectPlayerCard(playerId) {
    setActivePlayerId(playerId)
    setMessage('')
    setError('')
  }

  function updateCard(field, value) {
    setCards(current => ({
      ...current,
      [activePlayerId]: {
        ...cardValues(current[activePlayerId]),
        [field]: value
      }
    }))
  }

  async function saveCard(event) {
    event.preventDefault()
    if (!supabase || !activePlayer || !canEdit) return

    setSaving(true)
    setError('')
    setMessage('')

    const numericFields = ['overall', ...cardAttributes.map(([field]) => field)]
    const invalidField = numericFields.find(field => {
      const value = Number(activeCard[field])
      return !Number.isInteger(value) || value < 1 || value > 99
    })

    if (invalidField) {
      setError(`${invalidField.replace('_', ' ')} must be between 1 and 99.`)
      setSaving(false)
      return
    }

    const payload = {
      player_id: activePlayer.id,
      overall: Number(activeCard.overall),
      nationality: activeCard.nationality.trim() || null,
      preferred_foot: activeCard.preferred_foot,
      height_cm: activeCard.height_cm === '' ? null : Number(activeCard.height_cm),
      photo_url: activeCard.photo_url.trim() || null,
      pace: Number(activeCard.pace),
      shooting: Number(activeCard.shooting),
      passing: Number(activeCard.passing),
      dribbling: Number(activeCard.dribbling),
      defending: Number(activeCard.defending),
      physical: Number(activeCard.physical),
      updated_at: new Date().toISOString()
    }

    try {
      const { error: saveError } = await supabase
        .from('player_cards')
        .upsert(payload, { onConflict: 'player_id' })

      if (saveError) throw saveError

      setCards(current => ({ ...current, [activePlayer.id]: cardValues(payload) }))
      setMessage(`${activePlayer.name}'s FIFA card was saved.`)
    } catch (saveError) {
      setError(
        typeof saveError?.message === 'string'
          ? saveError.message
          : 'Could not save this player card.'
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="inner-page fifa-page">
      <div className="fifa-heading">
        <div>
          <span className="inner-label">PITCH / PLAYER COLLECTION</span>
          <h1>FIFA CARDS</h1>
          <p>THE SQUAD, BUILT INTO PLAYER CARDS.</p>
        </div>
        {canEdit && <span className="fifa-admin-badge">ADMIN EDITING ENABLED</span>}
      </div>

      {error && <p className="fifa-message fifa-error" role="alert">{error}</p>}
      {message && <p className="fifa-message fifa-success" role="status">{message}</p>}
      {loading ? (
        <p className="fifa-message">Loading player cards…</p>
      ) : error ? (
        <div className="fifa-empty">
          <h2>Cards unavailable</h2>
          <p>Check the FIFA card database migration and your Supabase access policies, then refresh.</p>
        </div>
      ) : players.length === 0 ? (
        <div className="fifa-empty">
          <h2>No player cards yet</h2>
          <p>Players will appear here after they are added to the squad.</p>
        </div>
      ) : (
        <>
          {canEdit && (
            <p className="fifa-edit-instruction">
              Select any card below to edit that player.
            </p>
          )}

          <div className="fifa-card-grid" aria-label="All active player cards">
            {players.map(player => {
              const card = cardValues(cards[player.id])
              return (
                <PlayerCard
                  key={player.id}
                  player={player}
                  card={card}
                  selected={player.id === activePlayerId}
                  canEdit={canEdit}
                  onSelect={selectPlayerCard}
                />
              )
            })}
          </div>

          {activePlayer && (
            canEdit ? (
              <form className="fifa-editor" onSubmit={saveCard}>
                <span className="admin-section-label">CARD DESIGN / ADMIN ONLY</span>
                <h2>EDIT {activePlayer.name.toUpperCase()}'S CARD</h2>
                <div className="fifa-form-grid">
                  <label>
                    OVERALL
                    <input type="number" min="1" max="99" value={activeCard.overall} onChange={event => updateCard('overall', event.target.value)} required />
                  </label>
                  {cardAttributes.map(([field, label]) => (
                    <label key={field}>
                      {label}
                      <input type="number" min="1" max="99" value={activeCard[field]} onChange={event => updateCard(field, event.target.value)} required />
                    </label>
                  ))}
                  <label>
                    NATIONALITY
                    <input maxLength="40" value={activeCard.nationality} onChange={event => updateCard('nationality', event.target.value)} placeholder="e.g. Kenyan" />
                  </label>
                  <label>
                    PREFERRED FOOT
                    <select value={activeCard.preferred_foot} onChange={event => updateCard('preferred_foot', event.target.value)}>
                      <option>Right</option>
                      <option>Left</option>
                      <option>Both</option>
                    </select>
                  </label>
                  <label>
                    HEIGHT (CM)
                    <input type="number" min="100" max="250" value={activeCard.height_cm} onChange={event => updateCard('height_cm', event.target.value)} placeholder="Optional" />
                  </label>
                  <label className="fifa-photo-input">
                    PHOTO URL
                    <input type="url" maxLength="2048" value={activeCard.photo_url} onChange={event => updateCard('photo_url', event.target.value)} placeholder="https://…" />
                  </label>
                </div>
                <button type="submit" className="fifa-save-button" disabled={saving}>
                  {saving ? 'SAVING…' : 'SAVE PLAYER CARD'}
                </button>
              </form>
            ) : (
              <div className="fifa-readonly-note">
                <p>Player card edits are available to PITCH admins only.</p>
                <button type="button" onClick={() => onNavigate('admin')}>
                  OPEN ADMIN PANEL <span>↗</span>
                </button>
              </div>
            )
          )}
        </>
      )}
    </section>
  )
}
