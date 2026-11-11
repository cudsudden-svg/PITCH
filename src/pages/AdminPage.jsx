
import { useEffect, useState } from 'react'
import { supabase } from '../supabase'

const positions = ['Goalkeeper', 'Defender', 'Midfielder', 'Forward']

export default function AdminPage({ onBack }) {
  const [loading, setLoading] = useState(true)
  const [authorized, setAuthorized] = useState(false)
  const [user, setUser] = useState(null)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loggingIn, setLoggingIn] = useState(false)

  const [players, setPlayers] = useState([])
  const [name, setName] = useState('')
  const [shirtNumber, setShirtNumber] = useState('')
  const [position, setPosition] = useState('Midfielder')
  const [saving, setSaving] = useState(false)

  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function verifyUser(currentUser) {
    setError('')
    setMessage('')
    setAuthorized(false)

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', currentUser.id)
      .single()

    if (profileError || !profile) {
      setError('Could not find your account profile. Contact the owner.')
      setUser(currentUser)
      return
    }

    if (!['owner', 'editor'].includes(profile.role)) {
      setError('Your account does not have admin permissions.')
      setUser(currentUser)
      return
    }

    setUser(currentUser)
    setAuthorized(true)
    await loadPlayers()
  }

  useEffect(() => {
    async function initialize() {
      const { data: { user: currentUser }, error: authError } =
        await supabase.auth.getUser()

      if (authError) {
        setError(authError.message)
      } else if (currentUser) {
        await verifyUser(currentUser)
      }

      setLoading(false)
    }

    initialize()
  }, [])

  async function login(e) {
    e.preventDefault()
    setError('')
    setMessage('')
    setLoggingIn(true)

    const { data, error: loginError } = await supabase.auth
      .signInWithPassword({
        email: email.trim(),
        password
      })

    if (loginError) {
      setError(loginError.message)
    } else if (data.user) {
      await verifyUser(data.user)
    }

    setPassword('')
    setLoggingIn(false)
  }

  async function logout() {
    await supabase.auth.signOut()
    setUser(null)
    setAuthorized(false)
    setPlayers([])
    setEmail('')
    setPassword('')
    setError('')
    setMessage('')
  }

  async function loadPlayers() {
    const { data, error: loadError } = await supabase
      .from('players')
      .select('id, name, shirt_number, position, is_active')
      .order('shirt_number', { ascending: true })

    if (loadError) {
      setError(loadError.message)
      return
    }

    setPlayers(data || [])
  }

  async function addPlayer(e) {
    e.preventDefault()
    setMessage('')
    setError('')

    if (!name.trim() || !shirtNumber) {
      setError('Enter a player name and shirt number.')
      return
    }

    const number = Number(shirtNumber)

    if (!Number.isInteger(number) || number < 1 || number > 99) {
      setError('Shirt number must be between 1 and 99.')
      return
    }

    setSaving(true)

    const { error: insertError } = await supabase
      .from('players')
      .insert({
        name: name.trim(),
        shirt_number: number,
        position,
        is_active: true
      })

    if (insertError) {
      setError(insertError.message)
    } else {
      setName('')
      setShirtNumber('')
      setPosition('Midfielder')
      setMessage('Player added successfully.')
      await loadPlayers()
    }

    setSaving(false)
  }

  async function updatePlayerStatus(player) {
    setError('')
    setMessage('')

    const { error: updateError } = await supabase
      .from('players')
      .update({ is_active: !player.is_active })
      .eq('id', player.id)

    if (updateError) {
      setError(updateError.message)
      return
    }

    setMessage(
      player.is_active
        ? `${player.name} has been archived.`
        : `${player.name} has been restored.`
    )

    await loadPlayers()
  }

  if (loading) {
    return (
      <section className="inner-page admin-page">
        <span className="inner-label">PITCH / CONTROL CENTRE</span>
        <h1>ADMIN PANEL</h1>
        <p>Checking session...</p>
      </section>
    )
  }

  if (!authorized) {
    return (
      <section className="inner-page admin-page">
        <div className="admin-login">
          <span className="inner-label">PITCH / RESTRICTED ACCESS</span>
          <h1>ADMIN LOGIN</h1>
          <p>Sign in with your authorized PITCH account.</p>

          {user && (
            <p className="admin-error">
              {error}
            </p>
          )}

          {!user && error && (
            <p className="admin-error">{error}</p>
          )}

          {!user && (
            <form className="admin-login-form" onSubmit={login}>
              <label>
                EMAIL ADDRESS
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  autoComplete="username"
                  required
                />
              </label>

              <label>
                PASSWORD
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                />
              </label>

              <button type="submit" disabled={loggingIn}>
                {loggingIn ? 'SIGNING IN...' : 'SIGN IN'}
              </button>
            </form>
          )}

          {user && (
            <button onClick={logout}>SIGN OUT</button>
          )}

          <button className="admin-back" onClick={onBack}>
            ← BACK HOME
          </button>
        </div>
      </section>
    )
  }

  const activePlayers = players.filter(player => player.is_active)

  return (
    <section className="inner-page admin-page">
      <div className="admin-heading">
        <div>
          <span className="inner-label">PITCH / CONTROL CENTRE</span>
          <h1>ADMIN PANEL</h1>
          <p>MANAGE YOUR SQUAD AND PLAYER DATABASE.</p>
        </div>

        <div className="admin-actions">
          <button onClick={logout}>SIGN OUT</button>
          <button onClick={onBack}>← BACK</button>
        </div>
      </div>

      <div className="admin-stats">
        <div>
          <span>ACTIVE PLAYERS</span>
          <strong>{activePlayers.length}</strong>
        </div>
        <div>
          <span>TOTAL REGISTERED</span>
          <strong>{players.length}</strong>
        </div>
      </div>

      <div className="admin-section">
        <span className="admin-section-label">01 / PLAYER REGISTRATION</span>
        <h2>ADD NEW PLAYER</h2>

        <form className="player-form" onSubmit={addPlayer}>
          <label>
            PLAYER NAME
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Enter full name"
              maxLength={60}
              required
            />
          </label>

          <label>
            SHIRT NUMBER
            <input
              type="number"
              min="1"
              max="99"
              value={shirtNumber}
              onChange={e => setShirtNumber(e.target.value)}
              placeholder="e.g. 10"
              required
            />
          </label>

          <label>
            POSITION
            <select
              value={position}
              onChange={e => setPosition(e.target.value)}
            >
              {positions.map(item => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </label>

          <button type="submit" disabled={saving}>
            {saving ? 'ADDING...' : '+ ADD PLAYER'}
          </button>
        </form>

        {message && <p className="admin-success">{message}</p>}
        {error && <p className="admin-error">{error}</p>}
      </div>

      <div className="admin-section">
        <span className="admin-section-label">02 / SQUAD DATABASE</span>
        <h2>REGISTERED PLAYERS</h2>

        <div className="admin-player-list">
          {players.length === 0 ? (
            <p>No players registered yet.</p>
          ) : (
            players.map(player => (
              <div className="admin-player" key={player.id}>
                <div className="admin-player-number">
                  {player.shirt_number ?? '--'}
                </div>

                <div className="admin-player-info">
                  <strong>{player.name}</strong>
                  <span>{player.position || 'Position not set'}</span>
                </div>

                <span className={
                  player.is_active
                    ? 'player-status active'
                    : 'player-status archived'
                }>
                  {player.is_active ? 'ACTIVE' : 'ARCHIVED'}
                </span>

                <button
                  className="archive-button"
                  onClick={() => updatePlayerStatus(player)}
                >
                  {player.is_active ? 'ARCHIVE' : 'RESTORE'}
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <p className="admin-note">
        Players are never permanently deleted.
      </p>
    </section>
  )
}
