
import { useEffect, useState } from 'react'
import './App.css'
import { supabase, supabaseConfigError } from './supabase'

import HomePage from './pages/HomePage'
import PlayersPage from './pages/PlayersPage'
import MatchesPage from './pages/MatchesPage'
import RankingsPage from './pages/RankingsPage'
import PlayerProfilePage from './pages/PlayerProfilePage'
import AdminPage from './pages/AdminPage'
import PlayerCardsPage from './pages/PlayerCardsPage'

const identityStorageKey = 'pitch-player-id'

export default function App() {
  const [page, setPage] = useState('home')
  const [selectedPlayerId, setSelectedPlayerId] = useState(null)
  const [profilePlayerId, setProfilePlayerId] = useState(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [players, setPlayers] = useState([])
  const [playersLoading, setPlayersLoading] = useState(Boolean(supabase))
  const [playersError, setPlayersError] = useState(supabaseConfigError)
  const [playerRefreshCount, setPlayerRefreshCount] = useState(0)
  const [identityOpen, setIdentityOpen] = useState(
    () => !window.localStorage.getItem(identityStorageKey)
  )

  useEffect(() => {
    if (!supabase) return

    let active = true

    async function loadPlayers() {
      setPlayersLoading(true)
      try {
        const { data, error } = await supabase
          .from('players')
          .select('id, name, shirt_number, position, is_active')
          .eq('is_active', true)
          .order('shirt_number', { ascending: true })

        if (error) throw error
        if (!active) return

        const activePlayers = data || []
        setPlayers(activePlayers)
        setPlayersError('')

        const savedPlayerId = window.localStorage.getItem(identityStorageKey)
        if (savedPlayerId && !activePlayers.some(player => player.id === savedPlayerId)) {
          window.localStorage.removeItem(identityStorageKey)
          setSelectedPlayerId(null)
          setIdentityOpen(true)
        } else if (savedPlayerId) {
          setSelectedPlayerId(savedPlayerId)
        } else {
          setSelectedPlayerId(null)
          setIdentityOpen(true)
        }
      } catch (loadError) {
        if (active) {
          setPlayersError(
            typeof loadError?.message === 'string'
              ? loadError.message
              : 'Could not load players.'
          )
        }
      } finally {
        if (active) setPlayersLoading(false)
      }
    }

    loadPlayers()

    return () => {
      active = false
    }
  }, [playerRefreshCount])

  function navigate(destination) {
    setPage(destination)
    setSettingsOpen(false)
    if (destination === 'home') {
      setPlayerRefreshCount(count => count + 1)
    }
  }

  function choosePlayer(playerId) {
    window.localStorage.setItem(identityStorageKey, playerId)
    setSelectedPlayerId(playerId)
    setIdentityOpen(false)
  }

  function openPlayer(playerId) {
    setProfilePlayerId(playerId)
    navigate('player')
  }

  const selectedPlayer = players.find(player => player.id === selectedPlayerId) || null

  return (
    <main className="site">
      <div className="frame">
        <header className="header">
          <div className="menu-icon">
            <span />
            <span />
            <span />
          </div>

          <a className="logo" href="#" onClick={(e) => {
            e.preventDefault()
            navigate('home')
          }}>
            PITCH<span>.</span>
          </a>

          <nav>
            <button
              className={page === 'home' ? 'active' : ''}
              aria-current={page === 'home' ? 'page' : undefined}
              onClick={() => navigate('home')}
            >
              Home
            </button>
            <button
              className={page === 'players' || page === 'player' ? 'active' : ''}
              aria-current={page === 'players' || page === 'player' ? 'page' : undefined}
              onClick={() => navigate('players')}
            >
              Players
            </button>
            <button
              className={page === 'matches' ? 'active' : ''}
              aria-current={page === 'matches' ? 'page' : undefined}
              onClick={() => navigate('matches')}
            >
              Matches
            </button>
            <button
              className={page === 'rankings' ? 'active' : ''}
              aria-current={page === 'rankings' ? 'page' : undefined}
              onClick={() => navigate('rankings')}
            >
              Rankings
            </button>
            <button
              className={page === 'cards' ? 'active' : ''}
              aria-current={page === 'cards' ? 'page' : undefined}
              onClick={() => navigate('cards')}
            >
              FIFA Cards
            </button>
          </nav>

          <button
            type="button"
            className="identity-trigger"
            onClick={() => setIdentityOpen(true)}
            aria-label={selectedPlayer ? `Playing as ${selectedPlayer.name}. Change player` : 'Choose player'}
          >
            {selectedPlayer ? `#${selectedPlayer.shirt_number ?? '—'} ${selectedPlayer.name}` : 'CHOOSE PLAYER'}
          </button>

          <div className="settings-container">
            <button
              className="settings-trigger"
              onClick={() => setSettingsOpen(!settingsOpen)}
              aria-label="Settings"
            >
              ⚙
            </button>

            {settingsOpen && (
              <div className="settings-dropdown">
                <span className="settings-menu-label">CONTROL CENTRE</span>
                <button onClick={() => navigate('admin')}>
                  <strong>ADMIN PANEL</strong>
                  <span>Manage players and data</span>
                </button>
                <button onClick={() => navigate('settings')}>
                  <strong>SETTINGS</strong>
                  <span>Website preferences</span>
                </button>
              </div>
            )}
          </div>

          <span className="season-label">SEASON 01 / 2026</span>
        </header>

        {page === 'home' && <HomePage onNavigate={navigate} />}
        {page === 'players' && (
          <PlayersPage
            onBack={() => navigate('home')}
            onSelectPlayer={openPlayer}
          />
        )}
        {page === 'player' && (
          <PlayerProfilePage
            playerId={profilePlayerId}
            onBack={() => navigate('players')}
          />
        )}
        {page === 'matches' && (
          <MatchesPage
            onBack={() => navigate('home')}
            onNavigate={navigate}
            selectedPlayer={selectedPlayer}
            onChoosePlayer={() => setIdentityOpen(true)}
          />
        )}
        {page === 'rankings' && (
          <RankingsPage
            onBack={() => navigate('home')}
            onNavigate={navigate}
            onSelectPlayer={openPlayer}
          />
        )}

        {page === 'admin' && (
          <AdminPage onBack={() => navigate('home')} />
        )}

        {page === 'cards' && (
          <PlayerCardsPage
            selectedPlayerId={selectedPlayerId}
            onNavigate={navigate}
          />
        )}

        {page === 'settings' && (
          <section className="inner-page">
            <span className="inner-label">PITCH / CONTROL CENTRE</span>
            <h1>SETTINGS</h1>
            <p>Website preferences and account settings.</p>
            <button onClick={() => navigate('home')}>← BACK HOME</button>
          </section>
        )}

        {identityOpen && (
          <div className="identity-overlay">
            <section
              className="identity-dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby="identity-title"
            >
              <span className="identity-eyebrow">PITCH / PLAYER IDENTIFICATION</span>
              <h1 id="identity-title">WHO ARE YOU?</h1>
              <p>Choose your player so match results and performances are yours, not the whole squad’s.</p>

              {playersLoading ? (
                <p className="identity-status">Loading players…</p>
              ) : playersError ? (
                <p className="identity-status identity-error" role="alert">{playersError}</p>
              ) : players.length === 0 ? (
                <>
                  <p className="identity-status">No active players are registered yet. Ask an admin to add the squad.</p>
                  <button
                    type="button"
                    className="identity-admin-link"
                    onClick={() => {
                      setIdentityOpen(false)
                      navigate('admin')
                    }}
                  >
                    OPEN ADMIN PANEL <span>↗</span>
                  </button>
                </>
              ) : (
                <div className="identity-player-list">
                  {players.map(player => (
                    <button
                      type="button"
                      key={player.id}
                      className="identity-player"
                      onClick={() => choosePlayer(player.id)}
                    >
                      <span className="identity-shirt-number">{player.shirt_number ?? '—'}</span>
                      <span>
                        <strong>{player.name}</strong>
                        <small>{player.position || 'Player'}</small>
                      </span>
                      <span className="identity-select-mark">↗</span>
                    </button>
                  ))}
                </div>
              )}

              {selectedPlayer && (
                <button
                  type="button"
                  className="identity-cancel"
                  onClick={() => setIdentityOpen(false)}
                >
                  KEEP PLAYING AS {selectedPlayer.name.toUpperCase()}
                </button>
              )}
              {playersError && (
                <button
                  type="button"
                  className="identity-cancel"
                  onClick={() => setIdentityOpen(false)}
                >
                  CONTINUE WITHOUT PLAYER
                </button>
              )}
            </section>
          </div>
        )}
      </div>

      <footer className="outside-footer">
        <span>PITCH. © 2026</span>
        <span>THE GAME NEVER LIES.</span>
      </footer>
    </main>
  )
}
