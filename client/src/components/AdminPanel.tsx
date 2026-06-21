import { useState, useMemo } from 'react';
import type { StockMarketState, StockTeam } from '../types';

interface Props {
  socket: any;
  onBack: () => void;
}

export default function AdminPanel({ socket, onBack }: Props) {
  const marketState: StockMarketState | null = socket.marketState;
  const [multiplier, setMultiplier] = useState(5);
  const [baseValue, setBaseValue] = useState(100);
  const [performanceInputs, setPerformanceInputs] = useState<Record<string, Record<string, string>>>({});
  const [sentimentInputs, setSentimentInputs] = useState<Record<string, string>>({});
  const [spikeInputs, setSpikeInputs] = useState<Record<string, string>>({});

  if (!marketState) return <div className="admin-panel"><h2>Loading...</h2></div>;

  const teams = marketState.teams;

  const handlePerformance = (teamId: string, username: string, score: string) => {
    setPerformanceInputs(prev => ({
      ...prev,
      [teamId]: { ...(prev[teamId] || {}), [username]: score }
    }));
  };

  const submitPerformance = (teamId: string, username: string) => {
    const score = parseFloat(performanceInputs[teamId]?.[username] || '0');
    if (!isNaN(score)) {
      socket.updatePerformance({ teamId, username, score });
    }
  };

  const submitSentiment = (teamId: string) => {
    const val = parseFloat(sentimentInputs[teamId] || '0');
    if (!isNaN(val)) {
      socket.setSentiment({ teamId, sentiment: val });
    }
  };

  const submitSpike = (teamId: string) => {
    const val = parseFloat(spikeInputs[teamId] || '0');
    if (!isNaN(val)) {
      socket.spike({ teamId, amount: val });
      setSpikeInputs(prev => ({ ...prev, [teamId]: '' }));
    }
  };

  const handleConfigSave = () => {
    socket.updateConfig({
      multiplier: multiplier,
      baseValue: baseValue,
    });
  };

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <h1 className="admin-title">📈 FANTASTIC CUP — TRADING DESK</h1>
        <button className="admin-back-btn" onClick={onBack}>EXIT</button>
      </div>

      <div className="admin-grid">
        {/* CONFIG CARD */}
        <div className="admin-card config-card">
          <h2>⚙️ MARKET CONFIG</h2>
          <div className="admin-row">
            <label>Multiplier:</label>
            <input
              type="number"
              value={multiplier}
              onChange={e => setMultiplier(Number(e.target.value))}
              className="admin-input small"
              min={1}
            />
          </div>
          <div className="admin-row">
            <label>Base Value:</label>
            <input
              type="number"
              value={baseValue}
              onChange={e => setBaseValue(Number(e.target.value))}
              className="admin-input small"
              min={1}
            />
          </div>
          <div className="admin-actions">
            <button onClick={handleConfigSave} className="admin-btn primary">APPLY CONFIG</button>
            <button onClick={socket.resetPrices} className="admin-btn danger">RESET ALL PRICES</button>
          </div>
        </div>

        {/* PER-TEAM ADMIN */}
        {teams.map((team: StockTeam) => {
          const price = marketState.prices[team.id] || marketState.config.baseValue;
          const hist = marketState.history[team.id] || [];
          const oldPrice = hist.length > 1 ? hist[hist.length - 2].price : price;
          const change = price - oldPrice;
          const pct = oldPrice > 0 ? ((change / oldPrice) * 100) : 0;
          const isUp = change >= 0;
          const isFrozen = marketState.frozen[team.id];
          const members = team.members || [];
          const currentPerf = marketState.playerPerformance[team.id] || {};

          return (
            <div key={team.id} className="admin-card team-admin-card" style={{ borderLeft: `4px solid ${team.color}` }}>
              <div className="team-admin-header">
                <span className="team-admin-logo">{team.logo}</span>
                <span className="team-admin-name">{team.name}</span>
                <span className={`stock-change-admin ${isUp ? 'up' : 'down'}`}>
                  {price.toLocaleString()} {isUp ? '▲' : '▼'} {Math.abs(pct).toFixed(1)}%
                </span>
              </div>

              {/* Player Performance */}
              <div className="team-perf-section">
                <h4>Player Performance</h4>
                {members.length === 0 && <p className="text-muted">No members in this team.</p>}
                {members.map((username: string) => (
                  <div key={username} className="perf-row">
                    <span className="perf-username">{username}</span>
                    <span className="perf-current">Current: {currentPerf[username] ?? 0}</span>
                    <input
                      type="number"
                      className="admin-input small"
                      placeholder="Score"
                      value={performanceInputs[team.id]?.[username] ?? ''}
                      onChange={e => handlePerformance(team.id, username, e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') submitPerformance(team.id, username); }}
                    />
                    <button onClick={() => submitPerformance(team.id, username)} className="admin-btn small">SET</button>
                  </div>
                ))}
              </div>

              {/* Sentiment + Freeze + Spike */}
              <div className="team-admin-controls">
                <div className="admin-row">
                  <label>Sentiment:</label>
                  <input
                    type="number"
                    className="admin-input small"
                    value={sentimentInputs[team.id] ?? ''}
                    placeholder={String(marketState.sentiment[team.id] || 0)}
                    onChange={e => setSentimentInputs(prev => ({ ...prev, [team.id]: e.target.value }))}
                  />
                  <button onClick={() => submitSentiment(team.id)} className="admin-btn small">SET</button>
                </div>
                <div className="admin-row">
                  <label>Spike:</label>
                  <input
                    type="number"
                    className="admin-input small"
                    value={spikeInputs[team.id] ?? ''}
                    placeholder="+/- amount"
                    onChange={e => setSpikeInputs(prev => ({ ...prev, [team.id]: e.target.value }))}
                  />
                  <button onClick={() => submitSpike(team.id)} className="admin-btn small warning">APPLY</button>
                </div>
                <div className="admin-actions">
                  <button
                    onClick={() => socket.setFrozen({ teamId: team.id, frozen: !isFrozen })}
                    className={`admin-btn ${isFrozen ? 'danger' : 'warning'}`}
                  >
                    {isFrozen ? 'UNFREEZE' : 'FREEZE'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {socket.error && <div className="admin-toast">{socket.error}</div>}
    </div>
  );
}
