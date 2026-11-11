
export default function HomePage({ onNavigate }) {
  return (
    <section className="hero">
      <div className="hero-image" />

      <div className="vertical-title">
        <span>PLAYER</span>
        <span className="outline">STATS</span>
      </div>

      <div className="hero-description">
        <span className="small-line" />
        <p>
          Every player has a story.
          <br />
          Every performance counts.
          <br />
          This is where yours lives.
        </p>
      </div>

      <div className="side-card">
        <span className="side-label">THE PLAYER HUB</span>
        <h2>YOUR GAME.<br />YOUR NUMBERS.</h2>
        <p>Track performances. Compare players. Build your legacy.</p>
        <button onClick={() => onNavigate('players')}>
          VIEW PLAYERS <span>↗</span>
        </button>
      </div>

      <div className="hero-bottom">
        <span>01 — PLAYER DATABASE</span>
        <span>BUILT FOR THE GAME.</span>
      </div>
    </section>
  )
}
