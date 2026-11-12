import { useEffect, useState } from 'react'
import { supabase, supabaseConfigError } from '../supabase'

const formerGoldenBootWinners = [
  { edition: '2018', winner: 'Leon' },
  { edition: '2019', winner: 'Manu' },
  { edition: '2020', winner: 'Bradley' },
  { edition: '2021', winner: 'Ryan' },
  { edition: '2022', winner: 'Lenny' },
  { edition: '2023', winner: 'Bradley' },
  { edition: '2024', winner: 'Ryan' },
  { edition: '2025', winner: 'Bradley' },
  { edition: '2026 (Apr)', winner: 'Ryan' },
  { edition: '2026 (Aug)', winner: 'Bradley' },
  { edition: '2026 (Oct)', winner: 'Bradley' }
]

const ballonDorWinners = [
  { edition: '2018', winner: 'Richard' },
  { edition: '2019', winner: 'Ryan' },
  { edition: '2020', winner: 'Bradley' },
  { edition: '2021', winner: 'Lenny' },
  { edition: '2022', winner: 'Bradley' },
  { edition: '2023', winner: 'Ryan' },
  { edition: '2024', winner: 'Kelly' },
  { edition: '2025', winner: 'Bradley' }
]

const leaderboardTypes = [
  { id: 'rating', label: 'OVERALL RATING', metric: 'averageRating', unit: 'AVG RATING' },
  { id: 'goals', label: 'TOP SCORERS', metric: 'goals', unit: 'GOALS' },
  { id: 'assists', label: 'MOST ASSISTS', metric: 'assists', unit: 'ASSISTS' },
  { id: 'appearances', label: 'MOST APPEARANCES', metric: 'appearances', unit: 'APPS' },
  { id: 'minutes', label: 'MOST MINUTES', metric: 'minutes', unit: 'MINUTES' },
  { id: 'saves', label: 'MOST SAVES', metric: 'saves', unit: 'SAVES' }
]

function getPeriodKey(period, date = new Date()) {
  if (period === 'month') {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
  }
  if (period === 'year') return String(date.getFullYear())
  return ''
}

function buildRankings(players, stats, includeUnplayed = false, period = 'all') {
  const periodKey = getPeriodKey(period)
  const totals = new Map(
    players.map(player => [
      player.id,
      {
        ...player,
        appearances: 0,
        minutes: 0,
        goals: 0,
        assists: 0,
        saves: 0,
        cleanSheets: 0,
        yellowCards: 0,
        redCards: 0,
        ratingTotal: 0,
        ratedAppearances: 0
      }
    ])
  )

  stats.forEach(row => {
    if (
      period !== 'all' &&
      (!row.match_date || row.match_date.slice(0, periodKey.length) !== periodKey)
    ) return

    const player = totals.get(row.player_id)
    if (!player) return

    const minutes = Number(row.minutes_played) || 0
    player.minutes += minutes
    player.goals += Number(row.goals) || 0
    player.assists += Number(row.assists) || 0
    player.saves += Number(row.saves) || 0
    player.yellowCards += Number(row.yellow_cards) || 0
    player.redCards += Number(row.red_cards) || 0

    if (minutes > 0) {
      player.appearances += 1
      if (row.clean_sheet) player.cleanSheets += 1

      const rating = Number(row.rating)
      if (row.rating != null && Number.isFinite(rating)) {
        player.ratingTotal += rating
        player.ratedAppearances += 1
      }
    }
  })

  return [...totals.values()]
    .filter(player => includeUnplayed || player.appearances > 0)
    .map(player => ({
      ...player,
      averageRating: player.ratedAppearances
        ? player.ratingTotal / player.ratedAppearances
        : null
    }))
    .sort((a, b) => (
      (b.averageRating ?? -1) - (a.averageRating ?? -1) ||
      b.goals - a.goals ||
      b.assists - a.assists ||
      a.name.localeCompare(b.name)
    ))
}

export default function RankingsPage({ onBack, onNavigate, onSelectPlayer }) {
  const [rankings, setRankings] = useState([])
  const [playerCards, setPlayerCards] = useState([])
  const [activeLeaderboard, setActiveLeaderboard] = useState('rating')
  const [activePeriod, setActivePeriod] = useState('all')
  const [monthlyRankings, setMonthlyRankings] = useState([])
  const [yearlyRankings, setYearlyRankings] = useState([])
  const [loading, setLoading] = useState(Boolean(supabase))
  const [error, setError] = useState(supabaseConfigError)
  const [refreshCount, setRefreshCount] = useState(0)

  useEffect(() => {
    if (!supabase) return

    let active = true

    async function loadRankings(showLoading = true) {
      if (showLoading) setLoading(true)
      setError('')

      try {
        const [playersResult, statsResult, matchesResult] = await Promise.all([
          supabase
            .from('players')
            .select('id, name, shirt_number, position, photo_url, is_active'),
          supabase
            .from('player_match_stats')
            .select('match_id, player_id, minutes_played, goals, assists, saves, yellow_cards, red_cards, clean_sheet, rating'),
          supabase
            .from('matches')
            .select('id, match_date')
            .order('match_date', { ascending: false })
        ])

        if (playersResult.error) throw playersResult.error
        if (statsResult.error) throw statsResult.error
        if (matchesResult.error) throw matchesResult.error
        if (!active) return

        const players = playersResult.data || []
        const matchDates = new Map(
          (matchesResult.data || []).map(match => [match.id, match.match_date])
        )
        const stats = (statsResult.data || []).map(row => ({
          ...row,
          match_date: matchDates.get(row.match_id)
        }))
        setRankings(buildRankings(players, stats))
        setPlayerCards(buildRankings(players, stats, true))
        setMonthlyRankings(buildRankings(players, stats, false, 'month'))
        setYearlyRankings(buildRankings(players, stats, false, 'year'))
      } catch (loadError) {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'Could not load player rankings.'
          )
        }
      } finally {
        if (active && showLoading) setLoading(false)
      }
    }

    void loadRankings()

    const channel = supabase
      .channel('rankings-live-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'player_match_stats' },
        () => { void loadRankings(false) }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'players' },
        () => { void loadRankings(false) }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'matches' },
        () => { void loadRankings(false) }
      )
      .subscribe()

    return () => {
      active = false
      void supabase.removeChannel(channel)
    }
  }, [refreshCount])

  const periodPlayers = activePeriod === 'month'
    ? monthlyRankings
    : activePeriod === 'year'
      ? yearlyRankings
      : playerCards
  const periodRankedCount = activePeriod === 'all' ? rankings.length : periodPlayers.length
  const totalGoals = periodPlayers.reduce((total, player) => total + player.goals, 0)
  const leaderboard = leaderboardTypes.find(item => item.id === activeLeaderboard)
  const leaderboardPlayers = [...periodPlayers].sort((a, b) => {
    const aValue = a[leaderboard.metric]
    const bValue = b[leaderboard.metric]
    if (aValue == null && bValue != null) return 1
    if (bValue == null && aValue != null) return -1
    return (
      (Number(bValue) || 0) - (Number(aValue) || 0) ||
      (b.averageRating ?? -1) - (a.averageRating ?? -1) ||
      b.goals - a.goals ||
      b.assists - a.assists ||
      a.name.localeCompare(b.name)
    )
  })
  const leader = leaderboardPlayers[0]
  const today = new Date()
  const currentMonthLabel = new Intl.DateTimeFormat('en', {
    month: 'long',
    year: 'numeric'
  }).format(today)
  const currentYear = String(today.getFullYear())
  const periodTabs = [
    { id: 'all', label: 'ALL TIME', detail: 'CAREER TOTALS' },
    { id: 'month', label: 'MONTHLY', detail: currentMonthLabel.toUpperCase() },
    { id: 'year', label: 'YEARLY', detail: currentYear }
  ]
  const topScorers = [...playerCards]
    .filter(player => player.goals > 0)
    .sort((a, b) => (
      b.goals - a.goals ||
      b.assists - a.assists ||
      a.name.localeCompare(b.name)
    ))

  return (
    <section className="inner-page rankings-page">
      <div className="rankings-heading">
        <div>
          <span className="inner-label">PITCH / PLAYER HUB</span>
          <h1>LEADERBOARDS</h1>
          <p>FIND THE TOP PERFORMERS ACROSS EVERY PART OF THE GAME.</p>
        </div>
        <div className="rankings-actions">
          <button
            type="button"
            className="rankings-refresh"
            onClick={() => setRefreshCount(count => count + 1)}
            disabled={loading || !supabase}
          >
            {loading ? 'UPDATING…' : 'REFRESH'}
          </button>
          <button type="button" className="rankings-back" onClick={onBack}>
            ← HOME
          </button>
        </div>
      </div>

      {error && (
        <div className="rankings-message rankings-error" role="alert">
          {error}
        </div>
      )}

      <div className="rankings-summary">
        <div><span>RANKED PLAYERS</span><strong>{periodRankedCount}</strong></div>
        <div><span>GOALS SCORED</span><strong>{totalGoals}</strong></div>
        <div>
          <span>TOP {leaderboard.unit}</span>
          <strong>
            {leader
              ? `${leader.name} · ${leader.averageRating == null
                ? (leader[leaderboard.metric] || 0)
                : leaderboard.metric === 'averageRating'
                  ? leader.averageRating.toFixed(1)
                  : leader[leaderboard.metric]}`
              : '—'}
          </strong>
        </div>
      </div>

      {loading ? (
        <p className="rankings-message">Loading player rankings…</p>
      ) : rankings.length === 0 ? (
        <div className="rankings-empty">
          <span className="rankings-empty-index">02 / PLAYER HUB</span>
          <h2>{error ? 'Rankings are unavailable' : 'Rankings start with match data'}</h2>
          <p>
            {error
              ? 'Refresh the page to try again. If the problem continues, check Supabase access policies.'
              : 'Record a match and player minutes in the admin panel. Players with appearances will be ranked by their average match rating.'}
          </p>
          {!error && (
            <button type="button" onClick={() => onNavigate('admin')}>
              RECORD A MATCH <span>↗</span>
            </button>
          )}
        </div>
      ) : (
        <div className="leaderboard">
          <div className="leaderboard-period-tabs" role="group" aria-label="Choose a leaderboard period">
            {periodTabs.map(period => (
              <button
                type="button"
                aria-pressed={activePeriod === period.id}
                className={activePeriod === period.id ? 'active' : ''}
                key={period.id}
                onClick={() => setActivePeriod(period.id)}
              >
                <strong>{period.label}</strong>
                <small>{period.detail}</small>
              </button>
            ))}
          </div>

          <div className="leaderboard-tabs" role="group" aria-label="Choose a leaderboard">
            {leaderboardTypes.map(item => (
              <button
                type="button"
                aria-pressed={activeLeaderboard === item.id}
                className={activeLeaderboard === item.id ? 'active' : ''}
                key={item.id}
                onClick={() => setActiveLeaderboard(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>

          {periodRankedCount === 0 ? (
            <p className="leaderboard-no-data">
              No player performances have been recorded for{' '}
              {activePeriod === 'month' ? currentMonthLabel : currentYear} yet.
              New match results will update this board automatically.
            </p>
          ) : (
            <>
              <div className="leaderboard-podium" aria-label={`Top three: ${leaderboard.label}`}>
                {[2, 1, 0].map(index => {
                  const player = leaderboardPlayers[index]
                  if (!player) {
                    return <div className="leaderboard-podium-slot" key={index} />
                  }

                  const value = player[leaderboard.metric]
                  const displayValue = leaderboard.metric === 'averageRating'
                    ? value == null ? '—' : value.toFixed(1)
                    : Number(value) || 0

                  return (
                    <button
                      type="button"
                      className={`leaderboard-podium-slot leaderboard-place-${index + 1}`}
                      key={player.id}
                      onClick={() => onSelectPlayer(player.id)}
                      aria-label={`View ${player.name}'s profile, rank ${index + 1}`}
                    >
                      <span className="leaderboard-avatar">
                        {player.photo_url
                          ? <img src={player.photo_url} alt="" />
                          : player.name.split(/\s+/).map(part => part[0]).join('').slice(0, 2)}
                      </span>
                      <strong className="leaderboard-player-name">{player.name}</strong>
                      <span className="leaderboard-player-score">
                        {displayValue} <small>{leaderboard.unit}</small>
                      </span>
                      <span className="leaderboard-podium-bar">
                        <b>{index + 1}</b>
                      </span>
                    </button>
                  )
                })}
              </div>

              <div className="leaderboard-list">
                {leaderboardPlayers.slice(3).map((player, index) => {
                  const value = player[leaderboard.metric]
                  const displayValue = leaderboard.metric === 'averageRating'
                    ? value == null ? '—' : value.toFixed(1)
                    : Number(value) || 0

                  return (
                    <button
                      type="button"
                      className="leaderboard-row"
                      key={player.id}
                      onClick={() => onSelectPlayer(player.id)}
                    >
                      <span className="leaderboard-row-rank">
                        {String(index + 4).padStart(2, '0')}
                      </span>
                      <span className="leaderboard-row-player">
                        <strong>{player.name}</strong>
                        <small>{displayValue} {leaderboard.unit.toLowerCase()}</small>
                      </span>
                      {!player.is_active && <span className="leaderboard-archived">ARCHIVED</span>}
                      <span className="leaderboard-row-crown" aria-hidden="true">♛</span>
                    </button>
                  )
                })}
              </div>
            </>
          )}
        </div>
      )}

      {rankings.length > 0 && (
        <p className="rankings-footnote">
          Average rating uses saved match ratings from appearances with recorded
          minutes. Archived players remain visible so historical rankings stay complete.
        </p>
      )}

      <div className="rankings-extra-grid">
        <section className="rankings-extra-panel">
          <h2>ALL-TIME TOP SCORERS <span>LIVE MATCH TOTALS</span></h2>
          {topScorers.length === 0 ? (
            <p className="rankings-extra-empty">
              Goals entered for each match will update this list automatically.
            </p>
          ) : (
            <div className="rankings-table-wrap">
              <table className="rankings-table rankings-scorers-table">
                <thead>
                  <tr>
                    <th scope="col">RANK</th>
                    <th scope="col">PLAYER</th>
                    <th scope="col">GOALS</th>
                    <th scope="col">ASSISTS</th>
                  </tr>
                </thead>
                <tbody>
                  {topScorers.map((player, index) => (
                    <tr key={player.id}>
                      <td className="ranking-place">#{index + 1}</td>
                      <td><strong>{player.name}</strong></td>
                      <td className="rankings-scorer-goals">{player.goals}</td>
                      <td>{player.assists}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="rankings-extra-panel">
          <h2>ALL-TIME PLAYER CARDS <span>LIVE MATCH TOTALS</span></h2>
          {playerCards.length === 0 ? (
            <p className="rankings-extra-empty">
              Register players to see their match cards and totals here.
            </p>
          ) : (
            <div className="rankings-player-cards">
              {playerCards.map((player, index) => (
                <article className="rankings-player-card" key={player.id}>
                  <div className="rankings-card-top">
                    <div className="rankings-card-rating">
                      <strong>
                        {player.averageRating == null
                          ? '—'
                          : Math.round(player.averageRating * 10)}
                      </strong>
                      <span>OVR</span>
                    </div>
                    <span className="rankings-card-number">
                      {player.shirt_number ?? index + 1}
                    </span>
                  </div>
                  <div className="rankings-card-player">
                    <strong>{player.name}</strong>
                    <span>{player.position || 'PLAYER'}</span>
                  </div>
                  <div className="rankings-card-stats">
                    <span><strong>{player.goals}</strong><small>G</small></span>
                    <span><strong>{player.assists}</strong><small>A</small></span>
                    <span><strong>{player.appearances}</strong><small>APP</small></span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      <div className="rankings-history-grid">
        {[
          ['FORMER GOLDEN BOOT WINNERS', formerGoldenBootWinners],
          ["BALLON D'OR WINNERS", ballonDorWinners]
        ].map(([title, records]) => (
          <section className="rankings-extra-panel" key={title}>
            <h2>{title}</h2>
            <div className="rankings-table-wrap">
              <table className="rankings-table rankings-history-table">
                <thead>
                  <tr>
                    <th scope="col">YEAR / EDITION</th>
                    <th scope="col">WINNER</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map(record => (
                    <tr key={record.edition}>
                      <td><strong>{record.edition}</strong></td>
                      <td><strong>{record.winner}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))}
      </div>
    </section>
  )
}
