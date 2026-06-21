import { useState, useEffect, useRef } from 'react';
import type { ShowdownState, ShowdownTeam, RankChangeEvent } from '../types';

interface Props {
  socket: any;
}

function JSTClock() {
  const [time, setTime] = useState('');
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const jst = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));
      setTime(jst.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return <div className="sd-clock">🇯🇵 JST {time}</div>;
}

function ConfettiBurst() {
  const pieces = Array.from({ length: 40 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 0.5,
    color: ['#ffd700', '#ff6b6b', '#48dbfb', '#ff9ff3', '#54a0ff'][Math.floor(Math.random() * 5)],
    size: 4 + Math.random() * 8,
  }));

  return (
    <div className="sd-confetti">
      {pieces.map(p => (
        <div
          key={p.id}
          className="sd-confetti-piece"
          style={{
            left: `${p.left}%`,
            top: '-10px',
            animationDelay: `${p.delay}s`,
            background: p.color,
            width: p.size,
            height: p.size,
          }}
        />
      ))}
    </div>
  );
}

export default function ShowdownPage({ socket }: Props) {
  const state: ShowdownState | null = socket.showdownState;
  const rankChangeEvent: RankChangeEvent | null = socket.rankChange;

  const [animatingCards, setAnimatingCards] = useState<Record<string, string>>({});
  const [flashVisible, setFlashVisible] = useState(false);
  const [confettiVisible, setConfettiVisible] = useState(false);
  const prevRankRef = useRef<Record<string, number>>({});
  const prevStateRef = useRef<ShowdownTeam[]>([]);

  // Detect rank changes and trigger animations
  useEffect(() => {
    if (!state || state.teams.length === 0) return;

    const newRanks: Record<string, number> = {};
    state.teams.forEach(t => { newRanks[t.id] = t.rank; });

    const prevRanks = prevRankRef.current;
    const hadChanges = Object.keys(newRanks).some(id => prevRanks[id] !== undefined && prevRanks[id] !== newRanks[id]);

    if (hadChanges) {
      // Determine which team moved up (smaller rank number = better)
      const movedUp: string[] = [];
      const movedDown: string[] = [];
      state.teams.forEach(t => {
        const prev = prevRanks[t.id];
        if (prev !== undefined && prev !== t.rank) {
          if (t.rank < prev) {
            movedUp.push(t.id);
          } else {
            movedDown.push(t.id);
          }
        }
      });

      const animState: Record<string, string> = {};

      // Animate takeoff for moving-up teams
      movedUp.forEach(id => { animState[id] = 'flying-takeoff'; });
      movedDown.forEach(id => { animState[id] = 'sliding-down'; });

      setAnimatingCards(animState);

      // Screen flash
      setFlashVisible(true);
      setTimeout(() => setFlashVisible(false), 800);

      // Confetti if #1 changed
      const topChanged = state.teams.some(t => t.rank === 1 && prevRanks[t.id] !== undefined && prevRanks[t.id] !== 1);
      if (topChanged) {
        setConfettiVisible(true);
        setTimeout(() => setConfettiVisible(false), 2000);
      }

      // Play sound using Web Audio API
      try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.4);
      } catch {}
    }

    prevRankRef.current = newRanks;
  }, [state?.teams]);

  // Clear animation classes after they complete
  useEffect(() => {
    if (Object.keys(animatingCards).length === 0) return;
    const timer = setTimeout(() => {
      setAnimatingCards({});
      // Also trigger rank pop
      const popState: Record<string, string> = {};
      state?.teams.forEach(t => { popState[t.id] = 'rank-pop'; });
      setAnimatingCards(popState);
      setTimeout(() => setAnimatingCards({}), 600);
    }, 900);
    return () => clearTimeout(timer);
  }, [animatingCards, state?.teams]);

  if (!state) {
    return (
      <div className="showdown-page">
        <div className="sd-empty">
          <div className="sd-empty-icon">🏆</div>
          <div className="sd-empty-text">INITIALIZING SHOWDOWN...</div>
        </div>
        <div className="sd-connection">
          <span className={`dot ${socket.connected ? 'connected' : 'disconnected'}`} />
          {socket.connected ? 'LIVE' : '...'}
        </div>
      </div>
    );
  }

  const teams: ShowdownTeam[] = state.teams;

  // Build rank-order display
  const rankOrder: ShowdownTeam[] = [];
  const rankMap: Record<number, ShowdownTeam> = {};
  teams.forEach(t => { rankMap[t.rank] = t; });
  for (let r = 1; r <= 3; r++) {
    if (rankMap[r]) rankOrder.push(rankMap[r]);
    else rankOrder.push({ id: `empty-${r}`, name: 'No Team', logo: '🚫', color: '#333', stockValue: 0, change: 0, rank: r });
  }

  const getCardClass = (team: ShowdownTeam) => {
    const isReal = !team.id.startsWith('empty-');
    const anim = animatingCards[team.id] || '';
    return `sd-card rank-${team.rank}${isReal ? '' : ' empty'}${anim ? ' ' + anim : ''}`;
  };

  const formatValue = (v: number) => v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const formatChange = (v: number) => {
    const s = v.toFixed(2);
    return v >= 0 ? `+${s}` : s;
  };

  return (
    <div className="showdown-page">
      <div className="sd-bg-grid" />
      <div className="sd-particles" />

      {flashVisible && <div className="sd-flash-overlay" />}
      {confettiVisible && <ConfettiBurst />}

      <div className="sd-header">
        <div className="sd-badge">🏆 LIVE</div>
        <h1 className="sd-title">TEAM STOCK SHOWDOWN</h1>
        <JSTClock />
      </div>

      <div className="sd-scoreboard">
        {rankOrder.map((team, idx) => (
          <div key={team.id} className={getCardClass(team)}>
            <div className="sd-card-glow" />
            <div className="sd-rank-number">#{team.rank}</div>
            {team.id.startsWith('empty-') ? (
              <div className="sd-card-content" style={{ opacity: 0.3 }}>
                <span className="sd-card-logo">{team.logo}</span>
                <span className="sd-card-name">{team.name}</span>
              </div>
            ) : (
              <div className="sd-card-content">
                <span className="sd-card-logo">{team.logo}</span>
                <span className="sd-card-name">{team.name}</span>
                <div className="sd-value-row">
                  <span className="sd-stock-value">{formatValue(team.stockValue)}</span>
                  <span className={`sd-change ${team.change >= 0 ? 'up' : 'down'}`}>
                    {team.change >= 0 ? '▲' : '▼'} {formatChange(team.change)}
                  </span>
                </div>
                <span className="sd-members-label">
                  {team.members ? `${team.members.length} members` : ''}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="sd-connection">
        <span className={`dot ${socket.connected ? 'connected' : 'disconnected'}`} />
        {socket.connected ? 'LIVE' : '...'}
        <span style={{ marginLeft: 8, opacity: 0.5 }}>
          {state.simulationActive ? '● SIM' : '○ PAUSED'}
        </span>
      </div>
    </div>
  );
}
