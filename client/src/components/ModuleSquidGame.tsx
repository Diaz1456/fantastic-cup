import { useEffect, useRef, useState } from 'react';
import { useSound } from '../hooks/useSound';
import { SquidPlayer } from '../types';

interface Props {
  socket: any;
}

export default function ModuleSquidGame({ socket }: Props) {
  const state = socket.gameState;
  const { play } = useSound();
  const [eliminationAnim, setEliminationAnim] = useState<{ player: SquidPlayer } | null>(null);
  const [showWinner, setShowWinner] = useState(false);
  const [heartbeatActive, setHeartbeatActive] = useState(false);
  const [vignetteActive, setVignetteActive] = useState(false);
  const prevTargetedRef = useRef<string | null>(null);
  const prevVictoryRef = useRef<any>(null);

  if (!state) return null;

  const game = state.squidGame || {};
  const players: SquidPlayer[] = game.players || [];
  const phase = game.phase || 'idle';
  const targeted = socket.squidTargeted;
  const lastElim = socket.lastElimination;
  const victory = socket.victoryData;

  // Heartbeat pulse when targeted
  useEffect(() => {
    if (targeted && targeted !== prevTargetedRef.current) {
      play('heartbeat');
      setHeartbeatActive(true);
      prevTargetedRef.current = targeted;
    } else if (!targeted) {
      setHeartbeatActive(false);
    }
  }, [targeted, play]);

  // Elimination sequence + vignette
  useEffect(() => {
    if (lastElim) {
      play('gunshot');
      setVignetteActive(true);
      setEliminationAnim({ player: lastElim.player });
      const timer = setTimeout(() => {
        setEliminationAnim(null);
        setVignetteActive(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [lastElim, play]);

  // Victory
  useEffect(() => {
    if (victory && victory !== prevVictoryRef.current) {
      prevVictoryRef.current = victory;
      setShowWinner(true);
      setTimeout(() => play('choir'), 300);
    }
  }, [victory, play]);

  if (phase === 'idle') {
    return (
      <div className="sg-module">
        <div className="sg-standing">
          <div className="sg-standing-icon">🎴</div>
          <h2 className="sg-standing-title">SQUID GAME</h2>
          <p className="sg-standing-sub">Waiting for the game to begin...</p>
          {players.length === 0 && (
            <p className="sg-standing-muted">No players registered yet</p>
          )}
          {players.length > 0 && (
            <div className="sg-player-grid">
              {players.map(p => (
                <div key={p.id} className={`sg-player-card ${p.status === 'eliminated' ? 'eliminated' : ''}`}>
                  <div className="sg-player-avatar">
                    {p.avatarUrl
                      ? <img src={p.avatarUrl} alt="" className="sg-player-img" />
                      : <span className="sg-player-icon">🎭</span>
                    }
                  </div>
                  <div className="sg-player-name">{p.username}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (phase === 'victory' && victory) {
    const winner = victory.winner;
    return (
      <div className="sg-module victory">
        <div className="sg-victory-overlay" />
        <div className="sg-victory-container">
          {winner ? (
            <>
              <div className="sg-victory-crown">👑</div>
              <div className="sg-victory-avatar">
                {winner.avatarUrl
                  ? <img src={winner.avatarUrl} alt="" className="sg-victory-img" />
                  : <span className="sg-victory-icon">🏆</span>
                }
              </div>
              <h1 className="sg-victory-title">GAME OVER</h1>
              <div className="sg-victory-name">{winner.username}</div>
              <div className="sg-victory-sub">SURVIVED</div>
              <div className="sg-victory-badge">WINNER</div>
              <div className="sg-confetti-container">
                {Array.from({ length: 40 }).map((_, i) => (
                  <div key={i} className="sg-confetti" style={{
                    left: `${Math.random() * 100}%`,
                    animationDelay: `${Math.random() * 2}s`,
                    animationDuration: `${2 + Math.random() * 3}s`,
                    background: ['#ffd700', '#ff6b6b', '#48dbfb', '#a855f7', '#22d3ee', '#10b981'][Math.floor(Math.random() * 6)],
                    width: `${Math.random() * 8 + 4}px`,
                    height: `${Math.random() * 12 + 6}px`,
                  }} />
                ))}
              </div>
            </>
          ) : (
            <div className="sg-victory-no-winner">
              <h1>GAME OVER</h1>
              <p>No winner — all players eliminated</p>
            </div>
          )}
        </div>
        <div className="sg-eliminated-list">
          <h3>ELIMINATED</h3>
          {players.filter(p => p.status === 'eliminated').map(p => (
            <div key={p.id} className="sg-eliminated-tag">
              ✕ {p.username}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ACTIVE PHASE — main game broadcast
  const isTargeted = (id: string) => targeted === id;
  const isEliminated = (p: SquidPlayer) => p.status === 'eliminated';

  return (
    <div className="sg-module active">
      {/* Heartbeat border overlay */}
      <div className={`sg-heartbeat-overlay ${heartbeatActive ? 'active' : ''}`} />

      {/* Red vignette */}
      <div className={`sg-vignette ${vignetteActive ? 'active' : ''}`} />

      {/* Elimination cinematic overlay */}
      {eliminationAnim && (
        <div className="sg-elimination-cinematic">
          <div className="sg-guard-figure" />
          <div className="sg-crosshair">
            <div className="sg-crosshair-ring" />
            <div className="sg-crosshair-dot" />
          </div>
          <div className="sg-elimination-flash" />
          <div className="sg-elimination-text">ELIMINATED</div>
          <div className="sg-elimination-name">{eliminationAnim.player.username}</div>
        </div>
      )}

      {/* Main game area */}
      <div className={`sg-game-area ${eliminationAnim ? 'sg-trembling' : ''}`}>
        <div className="sg-broadcast-header">
          <div className="sg-broadcast-badge">LIVE</div>
          <h2 className="sg-broadcast-title">SQUID GAME</h2>
          <div className="sg-broadcast-count">
            {players.filter(p => p.status === 'alive').length} / {players.length} ALIVE
          </div>
        </div>

        <div className="sg-dormitory">
          <div className="sg-dormitory-bg" />
          <div className="sg-dormitory-walls" />

          {/* Fluorescent lights */}
          <div className="sg-fluorescent-lights">
            {Array.from({ length: 14 }).map((_, i) => (
              <div
                key={i}
                className="sg-fluo-bar"
                style={{ '--flicker-duration': `${1.5 + Math.random() * 3}s` } as React.CSSProperties}
              />
            ))}
          </div>

          <div className="sg-player-grid">
            {players.map(p => {
              const targeted = isTargeted(p.id);
              const eliminated = isEliminated(p);
              return (
                <div
                  key={p.id}
                  className={`sg-player-card ${eliminated ? 'eliminated' : ''} ${targeted ? 'targeted' : ''}`}
                >
                  {targeted && <div className="sg-target-laser" />}
                  <div className="sg-player-avatar">
                    {eliminated ? (
                      <div className="sg-eliminated-stamp">
                        <span className="sg-skull">💀</span>
                        <div className="sg-eliminated-overlay">ELIMINATED</div>
                      </div>
                    ) : p.avatarUrl ? (
                      <img src={p.avatarUrl} alt="" className="sg-player-img" />
                    ) : (
                      <span className="sg-player-icon">🎭</span>
                    )}
                  </div>
                  <div className="sg-player-name">{p.username}</div>
                  {eliminated && <div className="sg-eliminated-x">✕</div>}
                </div>
              );
            })}
          </div>
        </div>

        <div className="sg-status-bar">
          <div className="sg-status-bar-fill" style={{ width: `${(players.filter(p => p.status === 'alive').length / Math.max(players.length, 1)) * 100}%` }} />
          <span className="sg-status-text">{players.filter(p => p.status === 'alive').length} SURVIVING</span>
        </div>
      </div>
    </div>
  );
}
