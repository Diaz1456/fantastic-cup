import GlobalCountdown from './GlobalCountdown';
import ModuleTeamArena from './ModuleTeamArena';
import ModuleSquidGame from './ModuleSquidGame';

interface Props {
  socket: any;
}

export default function EventPage({ socket }: Props) {
  const state = socket.gameState;

  if (!state) {
    return (
      <div className="event-page loading">
        <div className="loading-screen">
          <div className="loading-emblem">🎴</div>
          <div className="loading-text">CONNECTING TO EVENT...</div>
          <div className="loading-bar"><div className="loading-fill" /></div>
        </div>
      </div>
    );
  }

  const { phase, activeModule, timer } = state;

  return (
    <div className={`event-page phase-${phase}`}>
      <div className="event-header">
        <div className="event-badge">LIVE EVENT</div>
        <h1 className="event-title">FANTASTIC CUP</h1>
        <div className="connection-status">
          <span className={`dot ${socket.connected ? 'connected' : 'disconnected'}`} />
          {socket.connected ? 'LIVE' : '...'}
        </div>
      </div>

      <div className="event-body">
        {phase === 'countdown' && (
          <div className="countdown-section">
            <GlobalCountdown
              display={socket.timerDisplay}
              remaining={socket.timerRemaining}
              mysteryMode={timer.mysteryMode}
              phase={phase}
            />
            <div className="countdown-subtitle">
              <span>The arena is being prepared</span>
              <span>A deadly game awaits</span>
            </div>
          </div>
        )}

        {phase === 'standby' && (
          <div className="standby-section">
            <div className="standby-message">
              <div className="standby-icon">🎴</div>
              <h2>EVENT PRIMED</h2>
              <p>Waiting for the commander's signal...</p>
            </div>
            {activeModule && (
              <div className="active-module-indicator">
                Active Module: <strong>{activeModule === 'team-arena' ? 'Team Arena' : 'Squid Game'}</strong>
              </div>
            )}
          </div>
        )}

        {phase === 'active' && activeModule === 'team-arena' && (
          <ModuleTeamArena socket={socket} />
        )}

        {phase === 'active' && activeModule === 'squid-game' && (
          <ModuleSquidGame socket={socket} />
        )}

        {phase === 'active' && !activeModule && (
          <div className="standby-section">
            <div className="standby-message">
              <h2>SELECT A MODULE</h2>
              <p>Admin will choose the event module</p>
            </div>
          </div>
        )}
      </div>

      <div className="event-footer">
        <div className="footer-scanlines" />
        <div className="footer-text">FANTASTIC CUP — EVENT BROADCAST</div>
      </div>
    </div>
  );
}
