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
  const [teamEditMode, setTeamEditMode] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState('');

  if (!state) return <div className="admin-panel"><h2>Loading...</h2></div>;

  const phase = state.phase;
  const activeModule = state.activeModule;
  const teams = socket.teams || state.teams || [];
  const squid = state.squidGame || {};
  const players = squid.players || [];
  const alivePlayers = players.filter((p: any) => p.status === 'alive');

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

        {/* MODULE CONTROL CARD */}
        <div className="admin-card module-card">
          <h2>🎯 EVENT MODULES</h2>
          <div className="phase-indicator">PHASE: <span className={`phase-badge ${phase}`}>{phase.toUpperCase()}</span></div>

          <div className="module-switch-section">
            <h3>ACTIVE MODULE</h3>
            <div className="module-buttons">
              <button
                className={`module-btn ${activeModule === 'team-arena' ? 'active' : ''}`}
                onClick={() => {
                  socket.adminSwitchModule('team-arena');
                }}
              >
                🏟 TEAM ARENA
              </button>
              <button
                className={`module-btn ${activeModule === 'squid-game' ? 'active' : ''}`}
                onClick={() => {
                  socket.adminSwitchModule('squid-game');
                }}
              >
                🎴 SQUID GAME
              </button>
            </div>

            {(phase === 'standby' || phase === 'countdown') && (
              <p className="module-hint">Activate a module above to begin the event</p>
            )}

            {phase === 'countdown' && (
              <div className="admin-row">
                <label>Force Start:</label>
                <button onClick={() => {
                  const fake = Date.now() - 1000;
                  socket.adminSetTimer(fake, false);
                }} className="admin-btn danger small">OVERRIDE TIMER</button>
              </div>
            )}
          </div>
        </div>

        {/* TEAM ARENA ADMIN */}
        <div className="admin-card team-admin-card">
          <h2>🏟 TEAM ARENA</h2>
          <div className="admin-actions">
            <button onClick={() => setTeamEditMode(!teamEditMode)} className="admin-btn">
              {teamEditMode ? 'DONE EDITING' : 'EDIT TEAMS'}
            </button>
          </div>

          {teamEditMode && (
            <div className="team-edit-list">
              {teams.map((team: any) => (
                <div key={team.id} className="team-edit-row">
                  <span className="team-edit-logo">{team.logo}</span>
                  <input
                    value={team.name}
                    onChange={e => {
                      const updated = teams.map((t: any) => t.id === team.id ? { ...t, name: e.target.value } : t);
                      socket.adminUpdateTeams(updated);
                    }}
                    className="admin-input small"
                  />
                  <input
                    type="number"
                    value={team.points}
                    onChange={e => {
                      const updated = teams.map((t: any) => t.id === team.id ? { ...t, points: parseInt(e.target.value) || 0 } : t);
                      socket.adminUpdateTeams(updated);
                    }}
                    className="admin-input small"
                    style={{ width: 80 }}
                  />
                  <button
                    onClick={() => {
                      const updated = teams.map((t: any) => t.id === team.id ? { ...t, points: t.points + 10 } : t);
                      socket.adminUpdateTeams(updated);
                    }}
                    className="admin-btn small"
                  >+10</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SQUID GAME ADMIN */}
        <div className="admin-card squid-admin-card">
          <h2>🎴 SQUID GAME</h2>
          <div className="phase-indicator">
            GAME: <span className={`phase-badge ${squid.phase}`}>{(squid.phase || 'idle').toUpperCase()}</span>
          </div>

          <div className="admin-actions">
            {squid.phase === 'idle' && (
              <button onClick={socket.adminStartSquidGame} className="admin-btn start-game">START GAME</button>
            )}
            <button onClick={socket.adminResetSquidGame} className="admin-btn danger">RESET GAME</button>
          </div>

          {/* Add player */}
          <div className="admin-row">
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

          {/* Player roster */}
          <div className="squid-roster">
            <h3>PLAYER ROSTER ({players.length})</h3>
            {players.length === 0 && <p className="text-muted">No players added yet.</p>}
            <div className="squid-roster-grid">
              {players.map((p: any) => {
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
            </div>
          </div>
        </div>

        {/* STATUS OVERVIEW */}
        <div className="admin-card status-card wide">
          <h2>📊 EVENT STATUS</h2>
          <div className="status-grid">
            <div className="status-col">
              <h3>Teams</h3>
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
