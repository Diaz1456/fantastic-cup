import { useState, useEffect, useRef } from 'react';
import type { ShowdownTeam, ShowdownState } from '../types';

interface Props {
  socket: any;
  onBack: () => void;
}

export default function ShowdownAdmin({ socket, onBack }: Props) {
  const state: ShowdownState | null = socket.showdownState;
  const [valueInputs, setValueInputs] = useState<Record<string, string>>({});

  if (!state) {
    return (
      <div className="sd-admin-panel">
        <div className="sd-admin-header">
          <h1 className="sd-admin-title">🏆 SHOWDOWN — ADMIN DESK</h1>
          <button className="sd-admin-back" onClick={onBack}>EXIT</button>
        </div>
        <p style={{ color: '#667788', textAlign: 'center', padding: '40px' }}>Loading state...</p>
      </div>
    );
  }

  const teams: ShowdownTeam[] = state.teams;

  const handleSetValue = (teamId: string) => {
    const val = parseFloat(valueInputs[teamId] || '0');
    if (!isNaN(val)) {
      socket.setValue({ teamId, value: val });
    }
  };

  return (
    <div className="sd-admin-panel">
      <div className="sd-admin-header">
        <h1 className="sd-admin-title">🏆 TOP 3 SHOWDOWN — ADMIN DESK</h1>
        <button className="sd-admin-back" onClick={onBack}>EXIT</button>
      </div>

      <div className="sd-admin-grid">
        {/* Simulation Control */}
        <div className="sd-admin-card">
          <h3>⚡ SIMULATION</h3>
          <div className="sd-toggle-row">
            <span className="sd-toggle-label">Auto Fluctuations</span>
            <label className="sd-toggle-switch">
              <input
                type="checkbox"
                checked={state.simulationActive}
                onChange={() => socket.toggleSimulation()}
              />
              <span className="sd-toggle-slider" />
            </label>
            <span style={{ fontSize: 11, color: state.simulationActive ? '#22c55e' : '#ef4444' }}>
              {state.simulationActive ? 'ON' : 'OFF'}
            </span>
          </div>
          <div className="sd-admin-actions">
            <button className="sd-admin-btn danger" onClick={() => socket.reset()}>
              🔄 RESET ALL VALUES
            </button>
          </div>
        </div>

        {/* Per-team controls */}
        {teams.map((team: ShowdownTeam) => (
          <div
            key={team.id}
            className="sd-admin-card sd-team-admin-card"
            style={{ borderLeftColor: team.color }}
          >
            <div className="sd-team-admin-header">
              <span className="sd-team-admin-logo">{team.logo}</span>
              <span className="sd-team-admin-name">{team.name}</span>
              <span className="sd-team-admin-value">
                #{team.rank} — {team.stockValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="sd-admin-row">
              <label>Stock Value:</label>
              <input
                type="number"
                className="sd-admin-input"
                value={valueInputs[team.id] ?? ''}
                placeholder={String(team.stockValue)}
                onChange={e => setValueInputs(prev => ({ ...prev, [team.id]: e.target.value }))}
                onKeyDown={e => { if (e.key === 'Enter') handleSetValue(team.id); }}
              />
              <button className="sd-admin-btn primary" onClick={() => handleSetValue(team.id)}>
                SET
              </button>
            </div>
          </div>
        ))}

        {teams.length === 0 && (
          <div className="sd-admin-card">
            <h3>📭 NO TEAMS</h3>
            <p className="text-muted">Create teams in the admin dashboard first.</p>
          </div>
        )}
      </div>

      {socket.error && <div className="sd-toast">{socket.error}</div>}
    </div>
  );
}
