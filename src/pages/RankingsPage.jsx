
export default function RankingsPage({ onBack }) {
  return (
    <section className="inner-page">
      <span className="inner-label">PITCH / PLAYER HUB</span>
      <h1>LEADERBOARD</h1>
      <p>Player rankings and statistics will live here.</p>
      <button onClick={onBack}>← BACK HOME</button>
    </section>
  )
}
