import { useEffect, useState } from 'react'
import { supabase, supabaseConfigError } from '../supabase'

const matchColumns = 'id, opponent, match_date, competition, our_score, opponent_score, side_a_name, side_b_name'

function formatDate(value) {
  if (!value) return 'DATE UNAVAILABLE'
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat('en', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(date)
}

function getTotals(rows) {
  const totals = rows.reduce((result, row) => {
    const minutes = Number(row.minutes_played) || 0
    result.minutes += minutes
    result.goals += Number(row.goals) || 0
    result.assists += Number(row.assists) || 0
    result.saves += Number(row.saves) || 0
    result.yellowCards += Number(row.yellow_cards) || 0
    result.redCards += Number(row.red_cards) || 0

    if (minutes > 0) {
      result.appearances += 1
      if (row.clean_sheet) result.cleanSheets += 1
      const rating = Number(row.rating)
      if (row.rating != null && Number.isFinite(rating)) {
        result.ratingTotal += rating
        result.ratedAppearances += 1
      }
    }

    return result
  }, {
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
  })

  return {
    ...totals,
    averageRating: totals.ratedAppearances
      ? totals.ratingTotal / totals.ratedAppearances
      : null
  }
}

export default function PlayerProfilePage({ playerId, onBack }) {
  const [player, setPlayer] = useState(null)
  const [performances, setPerformances] = useState([])
  const [loading, setLoading] = useState(Boolean(supabase && playerId))
  const [error, setError] = useState(supabaseConfigError)

  useEffect(() => {
    if (!supabase) return
    if (!playerId) return

    let active = true

    async function loadProfile() {
      setLoading(true)
      setError('')
      setPlayer(null)
      setPerformances([])

      try {
        const [playerResult, statsResult] = await Promise.all([
          supabase
            .from('players')
            .select('id, name, shirt_number, position, photo_url, is_active')
            .eq('id', playerId)
            .single(),
          supabase
            .from('player_match_stats')
            .select('match_id, player_id, side, minutes_played, goals, assists, saves, yellow_cards, red_cards, clean_sheet, rating')
            .eq('player_id', playerId)
        ])

        if (playerResult.error) throw playerResult.error
        if (statsResult.error) throw statsResult.error
        if (!active) return

        const stats = statsResult.data || []
        const matchIds = [...new Set(stats.map(row => row.match_id).filter(Boolean))]
        let matchesById = {}

        if (matchIds.length > 0) {
          const { data: matches, error: matchesError } = await supabase
            .from('matches')
            .select(matchColumns)
            .in('id', matchIds)

          if (matchesError) throw matchesError
          matchesById = Object.fromEntries((matches || []).map(match => [match.id, match]))
        }

        if (!active) return
        setPlayer(playerResult.data)
        setPerformances(stats
          .map(row => ({ ...row, match: matchesById[row.match_id] }))
          .sort((a, b) => (
            (b.match?.match_date || '').localeCompare(a.match?.match_date || '')
          )))
      } catch (loadError) {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'Could not load this player profile.'
          )
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    void loadProfile()
    return () => { active = false }
  }, [playerId])

  const totals = getTotals(performances)
  const profileError = playerId ? error : 'No player was selected.'

  return (
    <section className="inner-page player-profile-page">
      <div className="player-profile-heading">
        <button type="button" className="player-profile-back" onClick={onBack}>
          ← BACK TO SQUAD
        </button>
        <span className="inner-label">PITCH / PLAYER PROFILE</span>
      </div>

      {profileError && <div className="profile-message profile-error" role="alert">{profileError}</div>}
      {loading ? (
        <p className="profile-message">Loading player profile…</p>
      ) : player ? (
        <>
          <div className="player-profile-hero">
            <div className="player-profile-avatar">
              {player.photo_url
                ? <img src={player.photo_url} alt={`${player.name}`} />
                : <span>{player.name.split(/\s+/).map(part => part[0]).join('').slice(0, 2)}</span>}
            </div>
            <div className="player-profile-identity">
              <span className="player-profile-kicker">
                {player.position || 'PLAYER'}{player.shirt_number != null ? ` · #${player.shirt_number}` : ''}
              </span>
              <h1>{player.name}</h1>
              <span className={player.is_active ? 'player-profile-status' : 'player-profile-status archived'}>
                {player.is_active ? 'ACTIVE SQUAD' : 'ARCHIVED PLAYER'}
              </span>
            </div>
            <div className="player-profile-rating">
              <strong>{totals.averageRating == null ? '—' : totals.averageRating.toFixed(1)}</strong>
              <span>AVG RATING</span>
            </div>
          </div>

          <section className="profile-stats" aria-label="Career statistics">
            {[
              ['APPEARANCES', totals.appearances],
              ['MINUTES', totals.minutes],
              ['GOALS', totals.goals],
              ['ASSISTS', totals.assists],
              ['SAVES', totals.saves],
              ['CLEAN SHEETS', totals.cleanSheets],
              ['YELLOW CARDS', totals.yellowCards],
              ['RED CARDS', totals.redCards]
            ].map(([label, value]) => (
              <div className="profile-stat" key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </section>

          <section className="profile-performances">
            <div className="profile-section-heading">
              <div>
                <span className="inner-label">MATCH CENTRE</span>
                <h2>MATCH BY MATCH</h2>
              </div>
              <span>{performances.length} RECORDED</span>
            </div>

            {performances.length === 0 ? (
              <p className="profile-empty">No match performances have been recorded for this player yet.</p>
            ) : (
              <div className="profile-performance-list">
                {performances.map((row, index) => (
                  <article className="profile-performance" key={row.match_id || index}>
                    <div className="profile-match-info">
                      <strong>{row.match?.side_b_name || row.match?.opponent || 'Match performance'}</strong>
                      <span>
                        {formatDate(row.match?.match_date)}
                        {row.match?.competition ? ` · ${row.match.competition}` : ''}
                        {row.side ? ` · SIDE ${row.side}` : ''}
                      </span>
                    </div>
                    <strong className="profile-match-score">
                      {row.match
                        ? `${row.match.our_score ?? 0} – ${row.match.opponent_score ?? 0}`
                        : '—'}
                    </strong>
                    <div className="profile-match-stats">
                      <span><b>{Number(row.minutes_played) || 0}</b> MIN</span>
                      <span><b>{Number(row.goals) || 0}</b> G</span>
                      <span><b>{Number(row.assists) || 0}</b> A</span>
                      <span><b>{Number(row.saves) || 0}</b> SAV</span>
                      <span><b>{Number(row.yellow_cards) || 0}/{Number(row.red_cards) || 0}</b> CARDS</span>
                      {row.clean_sheet && <span className="profile-clean-sheet">CLEAN SHEET</span>}
                      <strong className="profile-match-rating">
                        {row.rating == null ? '—' : Number(row.rating).toFixed(1)}
                      </strong>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      ) : !profileError ? (
        <div className="profile-message">Player not found.</div>
      ) : null}
    </section>
  )
}
