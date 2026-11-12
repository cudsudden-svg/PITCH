
import { useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Text, Billboard, Html } from '@react-three/drei'
import { supabase, supabaseConfigError } from '../supabase'

function aggregatePlayerStats(players, rows) {
  const totals = new Map(
    players.map(player => [
      player.id,
      {
        appearances: 0,
        goals: 0,
        assists: 0,
        minutes: 0,
        ratingTotal: 0,
        ratedAppearances: 0
      }
    ])
  )

  rows.forEach(row => {
    const stats = totals.get(row.player_id)
    if (!stats) return

    const minutes = Number(row.minutes_played) || 0
    stats.goals += Number(row.goals) || 0
    stats.assists += Number(row.assists) || 0
    stats.minutes += minutes

    if (minutes > 0) {
      stats.appearances += 1

      const rating = Number(row.rating)
      if (row.rating != null && Number.isFinite(rating)) {
        stats.ratingTotal += rating
        stats.ratedAppearances += 1
      }
    }
  })

  return Object.fromEntries(
    [...totals].map(([playerId, stats]) => [
      playerId,
      {
        ...stats,
        averageRating: stats.ratedAppearances
          ? stats.ratingTotal / stats.ratedAppearances
          : null
      }
    ])
  )
}

function isMissingPitchCoordinateError(error) {
  const message = error?.message?.toLowerCase() || ''
  return (
    (message.includes('pitch_x') || message.includes('pitch_z')) &&
    (
      message.includes('does not exist') ||
      message.includes('could not find') ||
      message.includes('schema cache')
    )
  )
}

function PitchLines() {
  return (
    <group position={[0, 0.03, 0]}>
      <mesh>
        <boxGeometry args={[68, 0.02, 105]} />
        <meshBasicMaterial color="white" wireframe />
      </mesh>

      <mesh>
        <boxGeometry args={[68, 0.02, 0.15]} />
        <meshBasicMaterial color="white" />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[9.05, 9.2, 128]} />
        <meshBasicMaterial color="white" />
      </mesh>

      {[-1, 1].map((side) => (
        <group key={side} position={[0, 0, side * 39]}>
          <mesh>
            <boxGeometry args={[40.3, 0.02, 16.5]} />
            <meshBasicMaterial color="white" wireframe />
          </mesh>

          <mesh position={[0, 0, side * 8.25]}>
            <boxGeometry args={[18.3, 0.02, 5.5]} />
            <meshBasicMaterial color="white" wireframe />
          </mesh>
        </group>
      ))}
    </group>
  )
}

function PlayerMarker({
  position,
  player,
  index,
  stats,
  statsAvailable,
  canManagePlayers,
  pitchPositionsAvailable,
  moveTarget,
  onSelectPlayer,
  onRequestMove
}) {
  const number = player.shirt_number ?? index + 1
  const rating = stats?.averageRating
  const canMovePlayer = canManagePlayers && pitchPositionsAvailable

  return (
    <group position={position}>

      {/* Head */}
      <mesh position={[0, 2.85, 0]}>
        <sphereGeometry args={[0.32, 32, 32]} />
        <meshStandardMaterial color="#bd8968" roughness={0.8} />
      </mesh>

      {/* Neck */}
      <mesh position={[0, 2.48, 0]}>
        <cylinderGeometry args={[0.12, 0.13, 0.25, 24]} />
        <meshStandardMaterial color="#bd8968" />
      </mesh>

      {/* Jersey */}
      <mesh position={[0, 1.85, 0]}>
        <cylinderGeometry args={[0.48, 0.38, 1.05, 32]} />
        <meshStandardMaterial color="#f4f4f4" roughness={0.65} />
      </mesh>

      {/* Shirt number on back */}
      <Text
        position={[0, 2.0, 0.405]}
        fontSize={0.55}
        color="#111111"
        anchorX="center"
        anchorY="middle"
        fontWeight="bold"
        outlineWidth={0.015}
        outlineColor="white"
        depthOffset={-1}
      >
        {String(number)}
      </Text>

      <Billboard position={[0, 5.1, 0]}>
        <Html center style={{ pointerEvents: 'auto' }}>
          <div
            className="pitch-player-tag-wrap"
            style={{
              '--pitch-player-card-offset': `${position[0] * 4.5}px`,
              '--pitch-player-card-offset-y': `${index % 2 === 0 ? -48 : 48}px`
            }}
          >
            <button
              type="button"
              className={`pitch-player-card${moveTarget ? ' pitch-player-card-selected' : ''}`}
              aria-label={`View ${player.name}'s player profile${canMovePlayer ? ', right-click to move' : ''}`}
              onPointerDown={event => event.stopPropagation()}
              onContextMenu={canMovePlayer ? event => {
                event.preventDefault()
                event.stopPropagation()
                onRequestMove(player)
              } : undefined}
              onClick={event => {
                event.stopPropagation()
                onSelectPlayer(player.id)
              }}
            >
              <div className="pitch-player-card-heading">
                <div className="pitch-player-overall">
                  <span>OVR</span>
                  <strong>{rating == null ? '—' : rating.toFixed(1)}</strong>
                </div>
                <div className="pitch-player-card-name">
                  <strong>{player.name}</strong>
                  <span>
                    {player.position || 'PLAYER'} · #{number}
                  </span>
                </div>
              </div>
              {statsAvailable ? (
                <div className="pitch-player-card-stats">
                  <span><strong>{stats?.appearances || 0}</strong><small>APP</small></span>
                  <span><strong>{stats?.goals || 0}</strong><small>G</small></span>
                  <span><strong>{stats?.assists || 0}</strong><small>A</small></span>
                  <span><strong>{stats?.minutes || 0}</strong><small>MIN</small></span>
                </div>
              ) : (
                <span className="pitch-player-card-unavailable">STATS UNAVAILABLE</span>
              )}
            </button>
            {canMovePlayer && (
              <button
                type="button"
                className="pitch-player-move-button"
                aria-label={`Move ${player.name} to a different pitch location`}
                onPointerDown={event => event.stopPropagation()}
                onClick={event => {
                  event.stopPropagation()
                  onRequestMove(player)
                }}
              >
                {moveTarget ? 'SELECT SPOT' : 'MOVE'}
              </button>
            )}
          </div>
        </Html>
      </Billboard>

      {/* Arms */}
      {[-1, 1].map((side) => (
        <group key={side}>
          <mesh
            position={[side * 0.55, 1.85, 0]}
            rotation={[0, 0, side * 0.18]}
          >
            <cylinderGeometry args={[0.12, 0.14, 0.85, 24]} />
            <meshStandardMaterial color="#f4f4f4" />
          </mesh>

          <mesh position={[side * 0.59, 1.38, 0]}>
            <sphereGeometry args={[0.13, 20, 20]} />
            <meshStandardMaterial color="#bd8968" />
          </mesh>
        </group>
      ))}

      {/* Shorts */}
      <mesh position={[0, 1.12, 0]}>
        <cylinderGeometry args={[0.38, 0.35, 0.42, 32]} />
        <meshStandardMaterial color="#171717" />
      </mesh>

      {/* Legs, socks and boots */}
      {[-0.19, 0.19].map((x) => (
        <group key={x}>
          <mesh position={[x, 0.68, 0]}>
            <cylinderGeometry args={[0.14, 0.12, 0.65, 24]} />
            <meshStandardMaterial color="#bd8968" />
          </mesh>

          <mesh position={[x, 0.25, 0]}>
            <cylinderGeometry args={[0.13, 0.12, 0.28, 24]} />
            <meshStandardMaterial color="#f4f4f4" />
          </mesh>

          <mesh position={[x, 0.09, 0.12]}>
            <boxGeometry args={[0.22, 0.16, 0.38]} />
            <meshStandardMaterial color="#111111" />
          </mesh>
        </group>
      ))}
    </group>
  )
}

function getPositionGroup(position) {
  const normalized = (position || '').toLowerCase()

  if (normalized.includes('keeper') || normalized.includes('goalie')) {
    return 'Goalkeeper'
  }
  if (normalized.includes('defend') || normalized.includes('back')) {
    return 'Defender'
  }
  if (
    normalized.includes('forward') ||
    normalized.includes('striker') ||
    normalized.includes('attack')
  ) {
    return 'Forward'
  }

  return 'Midfielder'
}

function getPlayerPitchPosition(player, players) {
  const hasCustomPosition =
    player.pitch_x != null &&
    player.pitch_z != null &&
    Number.isFinite(Number(player.pitch_x)) &&
    Number.isFinite(Number(player.pitch_z))

  if (hasCustomPosition) {
    return [Number(player.pitch_x), 0, Number(player.pitch_z)]
  }

  const group = getPositionGroup(player.position)
  const groupPlayers = players.filter(item => getPositionGroup(item.position) === group)
  const groupIndex = groupPlayers.findIndex(item => item.id === player.id)
  const span = Math.min(58, Math.max(0, (groupPlayers.length - 1) * 14))
  const x = groupPlayers.length > 1
    ? -span / 2 + groupIndex * span / (groupPlayers.length - 1)
    : 0
  const z = {
    Goalkeeper: 46,
    Defender: 25,
    Midfielder: 0,
    Forward: -25
  }[group]

  return [x, 0, z]
}

function Pitch({
  players,
  playerStats,
  statsAvailable,
  canManagePlayers,
  pitchPositionsAvailable,
  movePlayerId,
  onSelectPlayer,
  onRequestMove,
  onPlacePlayer
}) {
  const displayedPlayers = players.slice(0, 11)

  return (
    <>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.1, 0]}
        onPointerDown={event => {
          if (!movePlayerId) return
          event.stopPropagation()
          event.nativeEvent.stopPropagation()
          onPlacePlayer(movePlayerId, event.point.x, event.point.z)
        }}
      >
        <planeGeometry args={[75, 112]} />
        <meshStandardMaterial color="#247b43" roughness={1} />
      </mesh>

      <PitchLines />

      {displayedPlayers.map((player, index) => (
        <PlayerMarker
          key={player.id}
          position={getPlayerPitchPosition(player, displayedPlayers)}
          player={player}
          index={index}
          stats={playerStats[player.id]}
          statsAvailable={statsAvailable}
          canManagePlayers={canManagePlayers}
          pitchPositionsAvailable={pitchPositionsAvailable}
          moveTarget={movePlayerId === player.id}
          onSelectPlayer={onSelectPlayer}
          onRequestMove={onRequestMove}
        />
      ))}
    </>
  )
}

export default function FootballPitch({ onSelectPlayer }) {
  const [players, setPlayers] = useState([])
  const [playerStats, setPlayerStats] = useState({})
  const [canManagePlayers, setCanManagePlayers] = useState(false)
  const [pitchPositionsAvailable, setPitchPositionsAvailable] = useState(false)
  const [movePlayerId, setMovePlayerId] = useState(null)
  const [savingPosition, setSavingPosition] = useState(false)
  const [statsAvailable, setStatsAvailable] = useState(true)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [statsError, setStatsError] = useState('')
  const [permissionError, setPermissionError] = useState('')
  const [pitchSetupNotice, setPitchSetupNotice] = useState('')

  useEffect(() => {
    async function fetchPlayers() {
      if (!supabase) {
        setError(supabaseConfigError)
        setLoading(false)
        return
      }

      try {
        let { data: activePlayers, error: playersError } = await supabase
          .from('players')
          .select('id, name, shirt_number, position, photo_url, is_active, pitch_x, pitch_z')
          .eq('is_active', true)
          .order('shirt_number', { ascending: true })

        let hasSavedPitchPositions = true
        if (playersError && isMissingPitchCoordinateError(playersError)) {
          hasSavedPitchPositions = false
          const fallbackResult = await supabase
            .from('players')
            .select('id, name, shirt_number, position, photo_url, is_active')
            .eq('is_active', true)
            .order('shirt_number', { ascending: true })

          activePlayers = fallbackResult.data
          playersError = fallbackResult.error
        }

        if (playersError) throw playersError

        activePlayers = activePlayers || []
        setPitchPositionsAvailable(hasSavedPitchPositions)
        setPitchSetupNotice(
          hasSavedPitchPositions
            ? ''
            : 'Apply the pitch positions Supabase migration to enable player moves.'
        )
        setPlayers(activePlayers)

        const { data: stats, error: statsError } = await supabase
          .from('player_match_stats')
          .select('player_id, minutes_played, goals, assists, rating')

        if (statsError) {
          setStatsAvailable(false)
          setStatsError(statsError.message)
        } else {
          setStatsAvailable(true)
          setStatsError('')
          setPlayerStats(aggregatePlayerStats(activePlayers, stats || []))
        }

        try {
          const { data: { user }, error: userError } = await supabase.auth.getUser()
          if (userError) throw userError

          if (user) {
            const { data: profile, error: profileError } = await supabase
              .from('profiles')
              .select('role')
              .eq('id', user.id)
              .maybeSingle()

            if (profileError) throw profileError
            setCanManagePlayers(['owner', 'editor'].includes(profile?.role))
          }
        } catch (permissionLoadError) {
          setCanManagePlayers(false)
          setPermissionError(
            permissionLoadError instanceof Error
              ? `Could not verify pitch editing permissions: ${permissionLoadError.message}`
              : 'Could not verify pitch editing permissions.'
          )
        }
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : 'Could not load players.'
        )
      } finally {
        setLoading(false)
      }
    }

    fetchPlayers()
  }, [])

  async function placePlayer(playerId, x, z) {
    if (!supabase || !canManagePlayers || savingPosition) return

    if (!Number.isFinite(x) || !Number.isFinite(z)) {
      setError('Select a valid location on the pitch.')
      return
    }

    const pitchX = Math.max(-34, Math.min(34, Number(x.toFixed(1))))
    const pitchZ = Math.max(-52.5, Math.min(52.5, Number(z.toFixed(1))))
    setSavingPosition(true)
    setError('')

    try {
      const { error: updateError } = await supabase
        .from('players')
        .update({ pitch_x: pitchX, pitch_z: pitchZ })
        .eq('id', playerId)

      if (updateError) throw updateError

      setPlayers(currentPlayers => currentPlayers.map(player => (
        player.id === playerId
          ? { ...player, pitch_x: pitchX, pitch_z: pitchZ }
          : player
      )))
      setMovePlayerId(null)
    } catch (moveError) {
      setError(
        moveError instanceof Error
          ? `Could not move player: ${moveError.message}`
          : 'Could not move player.'
      )
    } finally {
      setSavingPosition(false)
    }
  }

  const movingPlayer = players.find(player => player.id === movePlayerId)

  return (
    <div className={`football-pitch-container${movingPlayer ? ' is-moving-player' : ''}`}>
      {permissionError && (
        <div className="pitch-permission-error" role="status">
          {permissionError}
        </div>
      )}

      {canManagePlayers && pitchSetupNotice && (
        <div className="pitch-permission-error" role="status">
          {pitchSetupNotice}
        </div>
      )}

      {movingPlayer && (
        <div className="pitch-move-prompt" role="status">
          <span>
            {savingPosition
              ? `SAVING ${movingPlayer.name.toUpperCase()}…`
              : `SELECT A SPOT FOR ${movingPlayer.name.toUpperCase()}`}
          </span>
          <button
            type="button"
            disabled={savingPosition}
            onClick={() => setMovePlayerId(null)}
          >
            CANCEL
          </button>
        </div>
      )}

      {loading && (
        <div style={{
          position: 'absolute',
          zIndex: 2,
          top: 15,
          left: 15,
          color: 'white',
          fontSize: 12
        }}>
          LOADING PLAYERS...
        </div>
      )}

      {error && (
        <div style={{
          position: 'absolute',
          zIndex: 2,
          top: 15,
          left: 15,
          color: '#ff7777',
          fontSize: 12
        }}>
          Could not load players: {error}
        </div>
      )}

      {statsError && (
        <div className="pitch-stats-error" role="status">
          Could not load player stats: {statsError}
        </div>
      )}

      {!loading && !error && players.length === 0 && (
        <div style={{
          position: 'absolute',
          zIndex: 2,
          top: 15,
          left: 15,
          color: 'white',
          fontSize: 12
        }}>
          NO ACTIVE PLAYERS FOUND
        </div>
      )}

      <Canvas
        camera={{
          position: [0, 65, 85],
          fov: 45,
          near: 0.1,
          far: 300
        }}
        dpr={2}
        gl={{
          antialias: true,
          powerPreference: 'high-performance',
          alpha: false
        }}
      >
        <ambientLight intensity={1.5} />
        <directionalLight position={[20, 30, 20]} intensity={2} />

        <Pitch
          players={players}
          playerStats={playerStats}
          statsAvailable={statsAvailable}
          canManagePlayers={canManagePlayers}
          pitchPositionsAvailable={pitchPositionsAvailable}
          movePlayerId={movePlayerId}
          onSelectPlayer={onSelectPlayer}
          onRequestMove={player => {
            setError('')
            setMovePlayerId(player.id)
          }}
          onPlacePlayer={placePlayer}
        />

        <OrbitControls
          enabled={!movePlayerId}
          enablePan
          enableZoom
          minDistance={25}
          maxDistance={150}
          maxPolarAngle={Math.PI / 2.1}
        />
      </Canvas>
    </div>
  )
}
