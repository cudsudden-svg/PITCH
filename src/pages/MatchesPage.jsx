import { useEffect, useState } from 'react'
import { supabase, supabaseConfigError } from '../supabase'

const matchColumns = [
  'id',
  'opponent',
  'match_date',
  'competition',
  'venue',
  'our_score',
  'opponent_score',
  'duration_minutes',
  'match_type',
  'side_a_name',
  'side_b_name',
  'status'
].join(',')

function formatMatchDate(value) {
  if (!value) return 'Date unavailable'

  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat('en', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(date)
}

function getResult(match) {
  const sideAScore = Number(match.our_score) || 0
  const sideBScore = Number(match.opponent_score) || 0

  if (sideAScore > sideBScore) return 'win'
  if (sideAScore < sideBScore) return 'loss'
  return 'draw'
}

export default function MatchesPage({ onBack, onNavigate }) {
  const [matches, setMatches] = useState([])
  const [statsByMatch, setStatsByMatch] = useState({})
  const [playersById, setPlayersById] = useState({})
  const [loading, setLoading] = useState(Boolean(supabase))
  const [error, setError] = useState(supabaseConfigError)
  const [refreshCount, setRefreshCount] = useState(0)

  useEffect(() => {
    if (!supabase) return

    let active = true

    async function loadMatches() {
      setLoading(true)
      setError('')

      try {
        const { data: matchData, error: matchError } = await supabase
          .from('matches')
          .select(matchColumns)
          .order('match_date', { ascending: false })

        if (matchError) throw matchError
        if (!active) return

        const loadedMatches = matchData || []
        setMatches(loadedMatches)

        if (loadedMatches.length === 0) {
          setStatsByMatch({})
          setPlayersById({})
          return
        }

        const matchIds = loadedMatches.map(match => match.id)
        const { data: statsData, error: statsError } = await supabase
          .from('player_match_stats')
          .select('match_id, player_id, side, minutes_played, goals, assists, saves, yellow_cards, red_cards, clean_sheet, rating')
          .in('match_id', matchIds)

        if (statsError) throw statsError
        if (!active) return

        const playerIds = [...new Set((statsData || []).map(row => row.player_id))]
        let playerData = []

        if (playerIds.length > 0) {
          const { data, error: playersError } = await supabase
            .from('players')
            .select('id, name, shirt_number, position')
            .in('id', playerIds)

          if (playersError) throw playersError
          playerData = data || []
        }

        if (!active) return

        const groupedStats = (statsData || []).reduce((groups, row) => {
          if (!groups[row.match_id]) groups[row.match_id] = []
          groups[row.match_id].push(row)
          return groups
        }, {})

        setStatsByMatch(groupedStats)
        setPlayersById(
          Object.fromEntries(playerData.map(player => [player.id, player]))
        )
      } catch (loadError) {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'Could not load match history.'
          )
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    loadMatches()

    return () => {
      active = false
    }
  }, [refreshCount])

  const results = matches.reduce(
    (totals, match) => {
      totals[getResult(match)] += 1
      return totals
    },
    { win: 0, draw: 0, loss: 0 }
  )

  return (
    <section className="inner-page matches-page">
      <div className="matches-heading">
        <div>
          <span className="inner-label">PITCH / MATCH CENTRE</span>
          <h1>MATCH HISTORY</h1>
          <p>RESULTS, FIXTURES AND PLAYER PERFORMANCES.</p>
        </div>
        <div className="matches-actions">
          <button
            type="button"
            className="matches-refresh"
            onClick={() => setRefreshCount(count => count + 1)}
            disabled={loading || !supabase}
          >
            {loading ? 'UPDATING…' : 'REFRESH'}
          </button>
          <button type="button" className="matches-back" onClick={onBack}>
            ← HOME
          </button>
        </div>
      </div>

      {error && (
        <div className="matches-message matches-error" role="alert">
          {error}
        </div>
      )}

      <div className="match-summary">
        <div><span>RECORDED MATCHES</span><strong>{matches.length}</strong></div>
        <div><span>WINS</span><strong>{results.win}</strong></div>
        <div><span>DRAWS</span><strong>{results.draw}</strong></div>
        <div><span>LOSSES</span><strong>{results.loss}</strong></div>
      </div>

      {loading ? (
        <p className="matches-message">Loading match history…</p>
      ) : matches.length === 0 ? (
        <div className="matches-empty">
          <span className="matches-empty-index">01 / MATCH CENTRE</span>
          <h2>{error ? 'Match history is unavailable' : 'No matches recorded yet'}</h2>
          <p>
            {error
              ? 'Refresh the page to try again. If the problem continues, check Supabase access policies.'
              : 'Once a match is saved in the admin panel, its score and player performances will appear here.'}
          </p>
          {!error && (
            <button type="button" onClick={() => onNavigate('admin')}>
              OPEN ADMIN PANEL <span>↗</span>
            </button>
          )}
        </div>
      ) : (
        <div className="match-list">
          {matches.map(match => {
            const result = getResult(match)
            const performances = (statsByMatch[match.id] || [])
              .slice()
              .sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0))

            return (
              <article className={`match-card match-card-${result}`} key={match.id}>
                <div className="match-card-heading">
                  <div>
                    <span className="match-date">{formatMatchDate(match.match_date)}</span>
                    <span className={`match-result match-result-${result}`}>
                      {result}
                    </span>
                  </div>
                  <span className="match-type">{match.match_type || 'Match'}</span>
                </div>

                <div className="match-scoreboard">
                  <div className="match-side match-side-a">
                    <span>SIDE A</span>
                    <strong>{match.side_a_name || 'Our Team'}</strong>
                  </div>
                  <div className="match-score">
                    <strong>{match.our_score ?? 0}</strong>
                    <span>:</span>
                    <strong>{match.opponent_score ?? 0}</strong>
                  </div>
                  <div className="match-side match-side-b">
                    <span>SIDE B</span>
                    <strong>{match.side_b_name || match.opponent || 'Opponent'}</strong>
                  </div>
                </div>

                <div className="match-meta">
                  {match.competition && <span>{match.competition}</span>}
                  {match.venue && <span>{match.venue}</span>}
                  {match.duration_minutes != null && (
                    <span>{match.duration_minutes} MIN</span>
                  )}
                </div>

                <details className="match-performances">
                  <summary>
                    <span>PLAYER PERFORMANCES</span>
                    <span>{performances.length} PLAYERS <b>＋</b></span>
                  </summary>
                  {performances.length > 0 ? (
                    <div className="match-performance-list">
                      {performances.map(performance => {
                        const player = playersById[performance.player_id]
                        const rating = Number(performance.rating)
                        const hasRating =
                          performance.rating != null && Number.isFinite(rating)

                        return (
                          <div className="match-performance-row" key={performance.player_id}>
                            <div className="match-performance-player">
                              <strong>{player?.name || 'Player'}</strong>
                              <span>
                                {player?.shirt_number != null
                                  ? `#${player.shirt_number} · `
                                  : ''}
                                SIDE {performance.side || '—'}
                              </span>
                            </div>
                            <div className="match-performance-stats">
                              <span>{Number(performance.minutes_played) || 0} MIN</span>
                              <span>{Number(performance.goals) || 0} G</span>
                              <span>{Number(performance.assists) || 0} A</span>
                              <span>{Number(performance.saves) || 0} SAV</span>
                              <span>
                                {Number(performance.yellow_cards) || 0}Y / {Number(performance.red_cards) || 0}R
                              </span>
                              {performance.clean_sheet && <span>CS</span>}
                            </div>
                            <strong className="match-performance-rating">
                              {hasRating ? rating.toFixed(1) : '—'}
                            </strong>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="match-no-performances">
                      No player statistics were saved for this match.
                    </p>
                  )}
                </details>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}
