import { useState } from 'react';

interface Props {
  socket: any;
  onBack: () => void;
}

export default function AdminPanel({ socket, onBack }: Props) {
  const state = socket.gameState;
  const [dateStr, setDateStr] = useState(() => new Date(Date.now() + 3600000).toISOString().slice(0, 16));
  const [mysteryMode, setMysteryMode] = useState(false);
  const [confirmEliminate, setConfirmEliminate] = useState<string | null>(null);
  const [extendSeconds, setExtendSeconds] = useState(30);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [playerFilter, setPlayerFilter] = useState('');
  const [showSquidControls, setShowSquidControls] = useState(true);
  const [showRoster, setShowRoster] = useState(true);

  if (!state) return <div className="admin-panel"><h2>Loading...</h2></div>;

  const phase = state.phase;
  const teams = socket.teams || state.teams || [];
  const squid = state.squidGame || {};
  const players = squid.players || [];

  const filteredPlayers = players.filter((p: any) =>
    p.username.toLowerCase().includes(playerFilter.toLowerCase())
  );

  const handleSetTimer = () => {
    const deadline = new Date(dateStr).getTime();
    if (!isNaN(deadline)) socket.adminSetTimer(deadline, mysteryMode);
  };

  const handleAddPlayer = () => {
    const name = newPlayerName.trim();
    if (name) {
      socket.adminAddSquidPlayer(name);
      setNewPlayerName('');
    }
  };

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <h1 className="admin-title">🎴 FANTASTIC CUP — COMMAND CENTER</h1>
        <button className="admin-back-btn" onClick={onBack}>EXIT</button>
      </div>

      <div className="admin-grid">
        {/* TIMER CARD */}
        <div className="admin-card timer-card">
          <h2>⏱ GLOBAL COUNTDOWN</h2>
          <div className="admin-row">
            <label>Deadline:</label>
            <input type="datetime-local" value={dateStr} onChange={e => setDateStr(e.target.value)} className="admin-input" />
          </div>
          <div className="admin-row">
            <label>Mystery Mode:</label>
            <label className="toggle-switch">
              <input type="checkbox" checked={mysteryMode} onChange={e => setMysteryMode(e.target.checked)} />
              <span className="toggle-slider" />
            </label>
          </div>
          <div className="admin-actions">
            <button onClick={handleSetTimer} className="admin-btn primary">SET</button>
            {state.timer?.deadline && (
              <>
                {state.timer.paused
                  ? <button onClick={socket.adminResumeTimer} className="admin-btn">RESUME</button>
                  : <button onClick={socket.adminPauseTimer} className="admin-btn warning">PAUSE</button>
                }
                <button onClick={socket.adminResetTimer} className="admin-btn danger">RESET</button>
              </>
            )}
          </div>
          {state.timer?.deadline && (
            <div className="admin-row">
              <label>Extend (s):</label>
              <input type="number" value={extendSeconds} onChange={e => setExtendSeconds(Number(e.target.value))} className="admin-input small" min={1} />
              <button onClick={() => socket.adminExtendTimer(extendSeconds)} className="admin-btn small">+ADD</button>
            </div>
          )}
          <div className="admin-timer-display">
            <span className="timer-label">TIMER:</span>
            <span className={`timer-value ${socket.timerRemaining <= 10000 ? 'urgent' : ''}`}>{socket.timerDisplay || '-- : --'}</span>
          </div>
        </div>

        {/* SQUID GAME ADMIN — reorganised with collapsible sections */}
        <div className="admin-card squid-admin-card">
          <h2>🎴 SQUID GAME</h2>
          <div className="phase-indicator">
            GAME: <span className={`phase-badge ${squid.phase}`}>{(squid.phase || 'idle').toUpperCase()}</span>
            | PHASE: <span className={`phase-badge ${phase}`}>{phase.toUpperCase()}</span>
          </div>

          {/* ─── Collapsible: Game Controls ─── */}
          <div className="squid-collapsible">
            <button
              className="squid-collapse-header"
              onClick={() => setShowSquidControls(!showSquidControls)}
            >
              <span>🎮 Game Controls</span>
              <span className={`collapse-arrow ${showSquidControls ? 'open' : ''}`}>▼</span>
            </button>
            {showSquidControls && (
              <div className="squid-collapse-body">
                <div className="admin-actions">
                  {squid.phase === 'idle' && (
                    <button onClick={socket.adminStartSquidGame} className="admin-btn start-game">START GAME</button>
                  )}
                  {squid.phase === 'active' && (
                    <button onClick={socket.adminStartSquidGame} className="admin-btn warning">RESTART GAME</button>
                  )}
                  <button onClick={socket.adminResetSquidGame} className="admin-btn danger">RESET GAME</button>
                </div>

                {/* Add player inline */}
                <div className="admin-row" style={{ marginTop: '0.5rem' }}>
                  <input
                    type="text"
                    value={newPlayerName}
                    onChange={e => setNewPlayerName(e.target.value)}
                    placeholder="Player username..."
                    className="admin-input small"
                    onKeyDown={e => { if (e.key === 'Enter') handleAddPlayer(); }}
                  />
                  <button onClick={handleAddPlayer} className="admin-btn small">ADD</button>
                </div>
              </div>
            )}
          </div>

          {/* ─── Collapsible: Player Roster ─── */}
          <div className="squid-collapsible">
            <button
              className="squid-collapse-header"
              onClick={() => setShowRoster(!showRoster)}
            >
              <span>👥 Player Roster ({players.length})</span>
              <span className={`collapse-arrow ${showRoster ? 'open' : ''}`}>▼</span>
            </button>
            {showRoster && (
              <div className="squid-collapse-body">
                {players.length === 0 && <p className="text-muted">No players added yet.</p>}

                {players.length > 0 && (
                  <>
                    {/* Search / filter */}
                    <input
                      type="text"
                      value={playerFilter}
                      onChange={e => setPlayerFilter(e.target.value)}
                      placeholder="🔍 Filter players..."
                      className="admin-input small"
                      style={{ width: '100%', marginBottom: '0.5rem' }}
                    />

                    <div className="squid-roster-grid">
                      {filteredPlayers.map((p: any) => {
                        const isEliminated = p.status === 'eliminated';
                        return (
                          <div key={p.id} className={`squid-roster-card ${isEliminated ? 'eliminated' : ''}`}>
                            <div className="squid-roster-avatar">
                              {p.avatarUrl
                                ? <img src={p.avatarUrl} alt="" className="squid-roster-img" />
                                : <span className="squid-roster-fallback">🎭</span>
                              }
                            </div>
                            <div className="squid-roster-info">
                              <span className="squid-roster-name">{p.username}</span>
                              <span className={`squid-roster-status ${p.status}`}>{p.status.toUpperCase()}</span>
                            </div>
                            <div className="squid-roster-actions">
                              {!isEliminated && squid.phase === 'active' && (
                                <>
                                  {confirmEliminate === p.id ? (
                                    <div className="confirm-group">
                                      <button
                                        onClick={() => { socket.adminEliminateSquidPlayer(p.id); setConfirmEliminate(null); }}
                                        className="admin-btn danger small"
                                      >✕ CONFIRM</button>
                                      <button onClick={() => setConfirmEliminate(null)} className="admin-btn small">CANCEL</button>
                                    </div>
                                  ) : (
                                    <button onClick={() => setConfirmEliminate(p.id)} className="admin-btn eliminate-btn">ELIMINATE</button>
                                  )}
                                </>
                              )}
                              <button
                                onClick={() => socket.adminRemoveSquidPlayer(p.id)}
                                className="admin-btn small danger"
                                title="Remove player"
                              >✕</button>
                            </div>
                          </div>
                        );
                      })}
                      {filteredPlayers.length === 0 && (
                        <p className="text-muted">No players match filter.</p>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* TEAMS (read-only) */}
        <div className="admin-card team-admin-card">
          <h2>🏟 TEAMS</h2>
          <div className="team-edit-list">
            {teams.length === 0 && <p className="text-muted">No teams configured.</p>}
            {teams.map((team: any) => (
              <div key={team.id} className="team-edit-row">
                <span className="team-edit-logo">{team.logo}</span>
                <span className="team-edit-name">{team.name}</span>
                <span className="status-value">{team.points} pts</span>
                <span className="status-badge">#{team.rank}</span>
              </div>
            ))}
          </div>
        </div>

        {/* STATUS OVERVIEW */}
        <div className="admin-card status-card wide">
          <h2>📊 EVENT STATUS</h2>
          <div className="status-grid">
            <div className="status-col">
              <h3>Teams</h3>
              {teams.length === 0 && <p className="text-muted">No teams</p>}
              {teams.map((t: any) => (
                <div key={t.id} className="status-item">
                  <span className="status-dot" style={{ background: t.color }} />
                  <span>{t.name}</span>
                  <span className="status-value">{t.points} pts</span>
                  <span className="status-badge">#{t.rank}</span>
                </div>
              ))}
            </div>
            <div className="status-col">
              <h3>Players ({players.length})</h3>
              {players.length === 0 && <p className="text-muted">No players</p>}
              {players.map((p: any) => (
                <div key={p.id} className="status-item">
                  <span className="status-dot" style={{ background: p.status === 'alive' ? '#10b981' : p.status === 'winner' ? '#ffd700' : '#ef4444' }} />
                  <span>{p.username}</span>
                  <span className={`status-tag ${p.status}`}>{p.status.toUpperCase()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {socket.error && <div className="admin-toast">{socket.error}</div>}
    </div>
  );
}
