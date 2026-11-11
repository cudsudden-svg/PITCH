
import { useState } from 'react'
import './App.css'

import HomePage from './pages/HomePage'
import PlayersPage from './pages/PlayersPage'
import MatchesPage from './pages/MatchesPage'
import RankingsPage from './pages/RankingsPage'

export default function App() {
  const [page, setPage] = useState('home')

  return (
    <main className="site">
      <div className="frame">
        <header className="header">
          <div className="menu-icon">
            <span />
            <span />
            <span />
          </div>

          <a
            className="logo"
            href="#"
            onClick={(e) => {
              e.preventDefault()
              setPage('home')
            }}
          >
            PITCH<span>.</span>
          </a>

          <nav>
            <button onClick={() => setPage('home')}>Home</button>
            <button onClick={() => setPage('players')}>Players</button>
            <button onClick={() => setPage('matches')}>Matches</button>
            <button onClick={() => setPage('rankings')}>Rankings</button>
          </nav>

          <span className="season-label">SEASON 01 / 2026</span>
        </header>

        {page === 'home' && (
          <HomePage onNavigate={setPage} />
        )}

        {page === 'players' && (
          <PlayersPage onBack={() => setPage('home')} />
        )}

        {page === 'matches' && (
          <MatchesPage onBack={() => setPage('home')} />
        )}

        {page === 'rankings' && (
          <RankingsPage onBack={() => setPage('home')} />
        )}
      </div>

      <footer className="outside-footer">
        <span>PITCH. © 2026</span>
        <span>THE GAME NEVER LIES.</span>
      </footer>
    </main>
  )
}
