
import { useState } from 'react'
import './App.css'

import HomePage from './pages/HomePage'
import PlayersPage from './pages/PlayersPage'
import MatchesPage from './pages/MatchesPage'
import RankingsPage from './pages/RankingsPage'
import AdminPage from './pages/AdminPage'

export default function App() {
  const [page, setPage] = useState('home')
  const [settingsOpen, setSettingsOpen] = useState(false)

  function navigate(destination) {
    setPage(destination)
    setSettingsOpen(false)
  }

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
            <button onClick={() => navigate('home')}>Home</button>
            <button onClick={() => navigate('players')}>Players</button>
            <button onClick={() => navigate('matches')}>Matches</button>
            <button onClick={() => navigate('rankings')}>Rankings</button>
          </nav>

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
        {page === 'players' && <PlayersPage onBack={() => navigate('home')} />}
        {page === 'matches' && <MatchesPage onBack={() => navigate('home')} />}
        {page === 'rankings' && <RankingsPage onBack={() => navigate('home')} />}

        {page === 'admin' && (
          <AdminPage onBack={() => navigate('home')} />
        )}

        {page === 'settings' && (
          <section className="inner-page">
            <span className="inner-label">PITCH / CONTROL CENTRE</span>
            <h1>SETTINGS</h1>
            <p>Website preferences and account settings.</p>
            <button onClick={() => navigate('home')}>← BACK HOME</button>
          </section>
        )}
      </div>

      <footer className="outside-footer">
        <span>PITCH. © 2026</span>
        <span>THE GAME NEVER LIES.</span>
      </footer>
    </main>
  )
}
