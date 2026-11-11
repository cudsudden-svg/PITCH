
import FootballPitch from '../components/FootballPitch'

export default function PlayersPage({ onBack }) {
  return (
    <section className="inner-page">
      <div className="players-heading">
        <span className="inner-label">PITCH / PLAYER HUB</span>
        <h1>PLAYER DIRECTORY</h1>
        <p>THE SQUAD. THE NUMBERS. THE GAME.</p>
      </div>

      <FootballPitch />

      <button onClick={onBack}>← BACK HOME</button>
    </section>
  )
}
