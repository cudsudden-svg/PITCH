
import { useEffect, useState } from 'react'
import { supabase, supabaseConfigError } from '../supabase'
import { FiUserPlus, FiClipboard, FiArchive, FiRotateCcw, FiLogOut, FiArrowLeft } from 'react-icons/fi'

const positions = ['Goalkeeper', 'Defender', 'Midfielder', 'Forward']

const today = () => {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

const emptyStats = player => ({
  player_id: player.id,
  side: 'A',
  minutes_played: 0,
  goals: 0,
  assists: 0,
  saves: 0,
  yellow_cards: 0,
  red_cards: 0,
  clean_sheet: false
})

// Automatic match rating, calculated from recorded statistics.
function calculateRating(row, player) {
  const minutes = Number(row.minutes_played) || 0

  if (minutes <= 0) return null

  let rating = 6

  const goals = Number(row.goals) || 0
  const assists = Number(row.assists) || 0
  const saves = Number(row.saves) || 0
  const yellow = Number(row.yellow_cards) || 0
  const red = Number(row.red_cards) || 0

  rating += goals * 1
  rating += assists * 0.7
  rating += Math.min(saves * 0.15, 1.2)

  if (
    row.clean_sheet &&
    ['Goalkeeper', 'Defender'].includes(player?.position)
  ) {
    rating += 0.7
  }

  rating -= yellow * 0.4
  rating -= red * 1.5

  return Math.max(0, Math.min(10, Math.round(rating * 10) / 10))
}

export default function AdminPage({ onBack }) {
  const [loading, setLoading] = useState(Boolean(supabase))
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
  const [editingPlayerId, setEditingPlayerId] = useState(null)
  const [playerPositionDraft, setPlayerPositionDraft] = useState('')
  const [savingPlayerPosition, setSavingPlayerPosition] = useState(false)

  const [matches, setMatches] = useState([])
  const [selectedMatchId, setSelectedMatchId] = useState('')
  const [matchSaving, setMatchSaving] = useState(false)
  const [statsRows, setStatsRows] = useState([])

  const [activeTab, setActiveTab] = useState('players')

  const [matchForm, setMatchForm] = useState({
    opponent: '',
    match_date: today(),
    competition: '',
    venue: '',
    our_score: 0,
    opponent_score: 0,
    duration_minutes: 90,
    match_type: 'Friendly',
    side_a_name: 'Our Team',
    side_b_name: ''
  })

  const [message, setMessage] = useState('')
  const [error, setError] = useState(supabaseConfigError)

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
    await loadMatches()
  }

  useEffect(() => {
    if (!supabase) return

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
    if (!supabase) {
      setError(supabaseConfigError)
      return
    }

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
    setMatches([])
    setStatsRows([])
    setSelectedMatchId('')
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

    if (!selectedMatchId) {
      setStatsRows((data || []).map(emptyStats))
    }
  }

  async function loadMatches() {
    const { data, error: loadError } = await supabase
      .from('matches')
      .select('*')
      .order('match_date', { ascending: false })

    if (loadError) {
      setError(loadError.message)
      return
    }

    setMatches(data || [])
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

  async function savePlayerPosition(player) {
    setError('')
    setMessage('')
    setSavingPlayerPosition(true)

    try {
      const { error: updateError } = await supabase
        .from('players')
        .update({ position: playerPositionDraft })
        .eq('id', player.id)

      if (updateError) throw updateError

      setPlayers(currentPlayers => currentPlayers.map(item => (
        item.id === player.id
          ? { ...item, position: playerPositionDraft }
          : item
      )))
      setMessage(`${player.name}'s position was updated.`)
      setEditingPlayerId(null)
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : 'Could not update the player position.'
      )
    } finally {
      setSavingPlayerPosition(false)
    }
  }

  function updateMatchField(field, value) {
    setMatchForm(previous => ({
      ...previous,
      [field]: value
    }))
  }

  function updatePlayerStat(playerId, field, value) {
    setStatsRows(previous =>
      previous.map(row =>
        row.player_id === playerId
          ? { ...row, [field]: value }
          : row
      )
    )
  }

  function newMatch() {
    setSelectedMatchId('')
    setMatchForm({
      opponent: '',
      match_date: today(),
      competition: '',
      venue: '',
      our_score: 0,
      opponent_score: 0,
      duration_minutes: 90,
      match_type: 'Friendly',
      side_a_name: 'Our Team',
      side_b_name: ''
    })
    setStatsRows(players.map(emptyStats))
    setMessage('')
    setError('')
  }

  async function selectMatch(matchId) {
    setError('')
    setMessage('')
    setSelectedMatchId(matchId)

    if (!matchId) {
      newMatch()
      return
    }

    const match = matches.find(item => item.id === matchId)
    if (!match) return

    setMatchForm({
      opponent: match.opponent || '',
      match_date: match.match_date || today(),
      competition: match.competition || '',
      venue: match.venue || '',
      our_score: match.our_score ?? 0,
      opponent_score: match.opponent_score ?? 0,
      duration_minutes: match.duration_minutes ?? 90,
      match_type: match.match_type || 'Friendly',
      side_a_name: match.side_a_name || 'Our Team',
      side_b_name: match.side_b_name || match.opponent || ''
    })

    const { data, error: statsError } = await supabase
      .from('player_match_stats')
      .select('*')
      .eq('match_id', matchId)

    if (statsError) {
      setError(statsError.message)
      return
    }

    const savedStats = data || []

    setStatsRows(
      players.map(player => {
        const existing = savedStats.find(
          stat => stat.player_id === player.id
        )

        return existing
          ? {
              ...existing,
              rating: undefined
            }
          : emptyStats(player)
      })
    )
  }

  async function saveMatch(e) {
    e.preventDefault()
    setError('')
    setMessage('')

    if (!matchForm.opponent.trim() || !matchForm.match_date) {
      setError('Enter the opponent and match date.')
      return
    }

    if (!matchForm.side_a_name.trim() || !matchForm.side_b_name.trim()) {
      setError('Enter the names of both sides.')
      return
    }

    setMatchSaving(true)

    const matchPayload = {
      opponent: matchForm.opponent.trim(),
      match_date: matchForm.match_date,
      competition: matchForm.competition.trim() || null,
      venue: matchForm.venue.trim() || null,
      our_score: Number(matchForm.our_score),
      opponent_score: Number(matchForm.opponent_score),
      duration_minutes: Number(matchForm.duration_minutes),
      match_type: matchForm.match_type,
      side_a_name: matchForm.side_a_name.trim(),
      side_b_name: matchForm.side_b_name.trim(),
      status: 'completed'
    }

    let matchId = selectedMatchId

    try {
      if (matchId) {
        const { error: updateError } = await supabase
          .from('matches')
          .update(matchPayload)
          .eq('id', matchId)

        if (updateError) throw updateError
      } else {
        const { data, error: insertError } = await supabase
          .from('matches')
          .insert(matchPayload)
          .select('id')
          .single()

        if (insertError) throw insertError
        matchId = data.id
        setSelectedMatchId(matchId)
      }

      const statsPayload = statsRows.map(row => {
        const player = players.find(item => item.id === row.player_id)

        return {
          player_id: row.player_id,
          match_id: matchId,
          side: row.side,
          minutes_played: Math.max(0, Number(row.minutes_played) || 0),
          goals: Math.max(0, Number(row.goals) || 0),
          assists: Math.max(0, Number(row.assists) || 0),
          rating: calculateRating(row, player),
          saves: Math.max(0, Number(row.saves) || 0),
          yellow_cards: Math.max(0, Number(row.yellow_cards) || 0),
          red_cards: Math.max(0, Number(row.red_cards) || 0),
          clean_sheet: Boolean(row.clean_sheet)
        }
      })

      if (statsPayload.length > 0) {
        const { error: statsError } = await supabase
          .from('player_match_stats')
          .upsert(statsPayload, {
            onConflict: 'player_id,match_id'
          })

        if (statsError) throw statsError
      }

      setMessage('Match and automatically calculated ratings saved successfully.')
      await loadMatches()
    } catch (saveError) {
      setError(saveError.message || 'Could not save the match.')
    }

    setMatchSaving(false)
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

          {error && <p className="admin-error">{error}</p>}

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

          {user && <button onClick={logout}>SIGN OUT</button>}

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
          <p>MANAGE YOUR SQUAD AND MATCHES.</p>
        </div>

        <div className="admin-actions">
          <button onClick={logout}><FiLogOut /> SIGN OUT</button>
          <button onClick={onBack}><FiArrowLeft /> BACK</button>
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
        <div>
          <span>RECORDED MATCHES</span>
          <strong>{matches.length}</strong>
        </div>
      </div>

      {message && <p className="admin-success">{message}</p>}
      {error && <p className="admin-error">{error}</p>}

      <div className="admin-tabs">
        <button
          type="button"
          className={activeTab === 'players' ? 'admin-tab active' : 'admin-tab'}
          onClick={() => {
            setActiveTab('players')
            setMessage('')
            setError('')
          }}
        >
          <FiUserPlus />
          <span>
            <strong>REGISTER PLAYER</strong>
            <small>Add and manage your squad</small>
          </span>
        </button>

        <button
          type="button"
          className={activeTab === 'matches' ? 'admin-tab active' : 'admin-tab'}
          onClick={() => {
            setActiveTab('matches')
            setMessage('')
            setError('')
          }}
        >
          <FiClipboard />
          <span>
            <strong>RECORD MATCH</strong>
            <small>Scores and player performance</small>
          </span>
        </button>
      </div>

      {activeTab === 'players' && (
        <div className="admin-section">
          <span className="admin-section-label">01 / SQUAD MANAGEMENT</span>
          <h2>REGISTER NEW PLAYER</h2>
          <p className="admin-help">
            Add a player to your squad and manage their active status.
          </p>

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

          <div className="admin-list-heading">
            <div>
              <span className="admin-section-label">YOUR SQUAD</span>
              <h3>PLAYER DIRECTORY</h3>
            </div>
            <span>{players.length} REGISTERED</span>
          </div>

          <div className="admin-player-list">
            {players.map(player => (
              <div className="admin-player" key={player.id}>
                <div className="admin-player-number">
                  {player.shirt_number ?? '--'}
                </div>

                <div className="admin-player-info">
                  <strong>{player.name}</strong>
                  <span>{player.position || 'Position not set'}</span>
                </div>

                {player.is_active && (
                  editingPlayerId === player.id ? (
                    <form
                      className="admin-player-position-form"
                      onSubmit={event => {
                        event.preventDefault()
                        void savePlayerPosition(player)
                      }}
                    >
                      <label className="sr-only" htmlFor={`position-${player.id}`}>
                        Position for {player.name}
                      </label>
                      <select
                        id={`position-${player.id}`}
                        value={playerPositionDraft}
                        onChange={event => setPlayerPositionDraft(event.target.value)}
                        disabled={savingPlayerPosition}
                      >
                        {positions.map(item => (
                          <option key={item} value={item}>{item}</option>
                        ))}
                      </select>
                      <button type="submit" disabled={savingPlayerPosition}>
                        {savingPlayerPosition ? 'SAVING…' : 'SAVE'}
                      </button>
                      <button
                        type="button"
                        className="admin-position-cancel"
                        disabled={savingPlayerPosition}
                        onClick={() => setEditingPlayerId(null)}
                      >
                        CANCEL
                      </button>
                    </form>
                  ) : (
                    <button
                      type="button"
                      className="edit-position-button"
                      onClick={() => {
                        setEditingPlayerId(player.id)
                        setPlayerPositionDraft(player.position || 'Midfielder')
                        setError('')
                        setMessage('')
                      }}
                    >
                      EDIT POSITION
                    </button>
                  )
                )}

                <span className={
                  player.is_active
                    ? 'player-status active'
                    : 'player-status archived'
                }>
                  {player.is_active ? 'ACTIVE' : 'ARCHIVED'}
                </span>

                <button
                  type="button"
                  className={player.is_active ? 'archive-button' : 'restore-button'}
                  onClick={() => updatePlayerStatus(player)}
                >
                  {player.is_active ? <FiArchive /> : <FiRotateCcw />}
                  {player.is_active ? 'ARCHIVE' : 'RESTORE'}
                </button>
              </div>
            ))}

            {players.length === 0 && (
              <p className="admin-empty">No players registered yet.</p>
            )}
          </div>
        </div>
      )}

      {activeTab === 'matches' && (
        <div className="admin-section match-editor">
          <span className="admin-section-label">02 / MATCH CENTRE</span>
          <h2>RECORD MATCH</h2>
          <p className="admin-help">
            Create a match or select an existing one to edit its score and player statistics.
            Player ratings are calculated automatically when you save.
          </p>

          <div className="match-toolbar">
            <select
              value={selectedMatchId}
              onChange={e => selectMatch(e.target.value)}
            >
              <option value="">＋ Create a new match</option>
              {matches.map(match => (
                <option key={match.id} value={match.id}>
                  {match.match_date} · {match.opponent} ({match.our_score}-{match.opponent_score})
                </option>
              ))}
            </select>

            <button type="button" onClick={newMatch}>
              + NEW MATCH
            </button>
          </div>

          <form onSubmit={saveMatch}>
            <div className="match-form-grid">
              <label>
                OPPONENT / MATCH NAME
                <input
                  value={matchForm.opponent}
                  onChange={e => updateMatchField('opponent', e.target.value)}
                  placeholder="e.g. Saturday Friendly"
                  required
                />
              </label>

              <label>
                MATCH DATE
                <input
                  type="date"
                  value={matchForm.match_date}
                  onChange={e => updateMatchField('match_date', e.target.value)}
                  required
                />
              </label>

              <label>
                COMPETITION
                <input
                  value={matchForm.competition}
                  onChange={e => updateMatchField('competition', e.target.value)}
                  placeholder="Friendly / League"
                />
              </label>

              <label>
                VENUE
                <input
                  value={matchForm.venue}
                  onChange={e => updateMatchField('venue', e.target.value)}
                  placeholder="Where you played"
                />
              </label>

              <label>
                SIDE A NAME
                <input
                  value={matchForm.side_a_name}
                  onChange={e => updateMatchField('side_a_name', e.target.value)}
                  required
                />
              </label>

              <label>
                SIDE B NAME
                <input
                  value={matchForm.side_b_name}
                  onChange={e => updateMatchField('side_b_name', e.target.value)}
                  placeholder="Opponent or second team"
                  required
                />
              </label>

              <label>
                SIDE A SCORE
                <input
                  type="number"
                  min="0"
                  value={matchForm.our_score}
                  onChange={e => updateMatchField('our_score', e.target.value)}
                  required
                />
              </label>

              <label>
                SIDE B SCORE
                <input
                  type="number"
                  min="0"
                  value={matchForm.opponent_score}
                  onChange={e => updateMatchField('opponent_score', e.target.value)}
                  required
                />
              </label>

              <label>
                DURATION (MINUTES)
                <input
                  type="number"
                  min="0"
                  value={matchForm.duration_minutes}
                  onChange={e => updateMatchField('duration_minutes', e.target.value)}
                />
              </label>

              <label>
                MATCH TYPE
                <select
                  value={matchForm.match_type}
                  onChange={e => updateMatchField('match_type', e.target.value)}
                >
                  <option>Friendly</option>
                  <option>League</option>
                  <option>Tournament</option>
                  <option>Training</option>
                </select>
              </label>
            </div>

            <div className="match-stats-heading">
              <div>
                <span className="admin-section-label">PLAYER PERFORMANCE</span>
                <h3>ENTER PLAYER STATS</h3>
              </div>
              <span>{statsRows.length} PLAYERS</span>
            </div>

            <div className="rating-explainer">
              <strong>AUTOMATIC RATINGS</strong>
              <span>Ratings are generated from goals, assists, saves, clean sheets and cards when you save the match.</span>
            </div>

            <div className="match-player-stats">
              {statsRows.map(row => {
                const player = players.find(item => item.id === row.player_id)
                if (!player) return null

                const rating = calculateRating(row, player)

                return (
                  <div className="match-player-row" key={row.player_id}>
                    <div className="match-player-name">
                      <strong>{player.name}</strong>
                      <span>#{player.shirt_number} · {player.position}</span>
                    </div>

                    <label>
                      SIDE
                      <select
                        value={row.side}
                        onChange={e => updatePlayerStat(row.player_id, 'side', e.target.value)}
                      >
                        <option value="A">A</option>
                        <option value="B">B</option>
                      </select>
                    </label>

                    {[
                      ['minutes_played', 'MIN'],
                      ['goals', 'GOALS'],
                      ['assists', 'ASSISTS'],
                      ['saves', 'SAVES'],
                      ['yellow_cards', 'YELLOW'],
                      ['red_cards', 'RED']
                    ].map(([field, label]) => (
                      <label key={field}>
                        {label}
                        <input
                          type="number"
                          min="0"
                          value={row[field]}
                          onChange={e => updatePlayerStat(row.player_id, field, e.target.value)}
                        />
                      </label>
                    ))}

                    <div className="automatic-rating">
                      <span>RATING</span>
                      <strong>{rating === null ? '—' : rating.toFixed(1)}</strong>
                      <small>AUTO</small>
                    </div>

                    <label className="clean-sheet-control">
                      CLEAN SHEET
                      <input
                        type="checkbox"
                        checked={row.clean_sheet}
                        onChange={e => updatePlayerStat(row.player_id, 'clean_sheet', e.target.checked)}
                      />
                    </label>
                  </div>
                )
              })}

              {statsRows.length === 0 && (
                <p className="admin-empty">Register players before recording match statistics.</p>
              )}
            </div>

            <button className="save-match-button" type="submit" disabled={matchSaving}>
              {matchSaving
                ? 'SAVING MATCH...'
                : selectedMatchId
                  ? 'SAVE MATCH CHANGES'
                  : 'SAVE MATCH & PLAYER STATS'}
            </button>
          </form>
        </div>
      )}

      <p className="admin-note">
        Players are never permanently deleted. Match statistics and automatically calculated ratings are saved separately for each player and match.
      </p>
    </section>
  )
}
