
export default function MatchesPage({ onBack }) {
  return (
    <section className="inner-page">
      <span className="inner-label">PITCH / PLAYER HUB</span>
      <h1>MATCH HISTORY</h1>
      <p>Your matches and performances will live here.</p>
      <button onClick={onBack}>← BACK HOME</button>
    </section>
  )
}
