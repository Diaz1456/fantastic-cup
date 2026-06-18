import { useState } from 'react';
import CoinAwardModal from './CoinAwardModal';

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
  const [showCoinAward, setShowCoinAward] = useState(false);
  const [teamEditMode, setTeamEditMode] = useState(false);

  if (!state) return <div className="admin-panel"><h2>Loading...</h2></div>;

  const phase = state.phase;
  const activeModule = state.activeModule;
  const teams = socket.teams || state.teams || [];
  const battle = state.tankBattle;

  const handleSetTimer = () => {
    const deadline = new Date(dateStr).getTime();
    if (!isNaN(deadline)) socket.adminSetTimer(deadline, mysteryMode);
  };

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <h1 className="admin-title">⚔ FANTASTIC CUP — COMMAND CENTER</h1>
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
                  if (phase === 'standby') socket.adminSwitchModule('team-arena');
                }}
              >
                🏟 TEAM ARENA
              </button>
              <button
                className={`module-btn ${activeModule === 'tank-warfare' ? 'active' : ''}`}
                onClick={() => {
                  socket.adminSwitchModule('tank-warfare');
                }}
              >
                💥 TANK WARFARE
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
            <button onClick={() => setShowCoinAward(!showCoinAward)} className="admin-btn">
              {showCoinAward ? 'HIDE COINS' : 'AWARD COINS'}
            </button>
            <button onClick={() => setTeamEditMode(!teamEditMode)} className="admin-btn">
              {teamEditMode ? 'DONE EDITING' : 'EDIT TEAMS'}
            </button>
          </div>

          {showCoinAward && <CoinAwardModal onAward={(data) => socket.adminAwardCoin(data)} />}

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

        {/* TANK WARFARE ADMIN */}
        <div className="admin-card tank-admin-card">
          <h2>💥 TANK WARFARE</h2>
          <div className="phase-indicator">
            BATTLE: <span className={`phase-badge ${battle?.phase}`}>{(battle?.phase || 'idle').toUpperCase()}</span>
          </div>

          {battle?.phase === 'idle' && (
            <button onClick={socket.adminStartBattle} className="admin-btn battle-start">START BATTLE</button>
          )}

          {battle?.phase === 'battle' && (
            <div className="elimination-section">
              <h3>ELIMINATE TANK</h3>
              {battle.tanks.filter((t: any) => t.status === 'alive').map((tank: any) => (
                <div key={tank.id} className="eliminate-row">
                  <span className="tank-name-label" style={{ color: tank.accent }}>{tank.name}</span>
                  {confirmEliminate === tank.id ? (
                    <div className="confirm-group">
                      <button onClick={() => { socket.adminEliminateTank(tank.id); setConfirmEliminate(null); }} className="admin-btn danger small">CONFIRM</button>
                      <button onClick={() => setConfirmEliminate(null)} className="admin-btn small">CANCEL</button>
                    </div>
                  ) : (
                    <button onClick={() => setConfirmEliminate(tank.id)} className="admin-btn eliminate-btn">ELIMINATE</button>
                  )}
                </div>
              ))}
              <div className="cooldown-info">Min 5s between eliminations</div>
            </div>
          )}

          <button onClick={socket.adminResetBattle} className="admin-btn danger full-width">RESET BATTLE</button>
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
              <h3>Tanks</h3>
              {(battle?.tanks || []).map((t: any) => (
                <div key={t.id} className="status-item">
                  <span className="status-dot" style={{ background: t.accent }} />
                  <span>{t.name}</span>
                  <span className={`status-tag ${t.status}`}>{t.status.toUpperCase()}</span>
                  {t.rank && <span className="status-badge">#{t.rank}</span>}
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
