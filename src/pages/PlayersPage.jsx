
import FootballPitch from '../components/FootballPitch'

export default function PlayersPage({ onBack }) {
  return (
    <section className="inner-page players-page">
      <div className="players-heading">
        <div>
          <span className="inner-label">PITCH / PLAYER HUB</span>
          <h1>THE SQUAD</h1>
        </div>

        <p>MEET THE PLAYERS. TRACK THE GAME.</p>
      </div>

      <FootballPitch />

      <button onClick={onBack}>← BACK HOME</button>
    </section>
  )
}
