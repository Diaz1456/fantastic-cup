import { Tank } from '../types';

interface Props {
  tank: Tank;
  underAttack: boolean;
  justEliminated: boolean;
  isWinner: boolean;
}

export default function TankDisplay({ tank, underAttack, justEliminated, isWinner }: Props) {
  return (
    <div
      className={`tank-unit ${tank.status} ${underAttack ? 'under-attack' : ''} ${justEliminated ? 'just-eliminated' : ''} ${isWinner ? 'victorious' : ''}`}
      style={{ '--tank-color': tank.color, '--tank-accent': tank.accent } as React.CSSProperties}
    >
      <div className="tank-svg-container">
        <svg viewBox="0 0 220 120" className="tank-svg">
          {tank.name === 'Ironclad' && (
            <g>
              <rect x="30" y="35" width="140" height="50" rx="8" fill="#3d6b47" stroke="#5a9e6b" strokeWidth="2" className="tank-body" />
              <rect x="50" y="25" width="100" height="20" rx="4" fill="#4a7c59" stroke="#6baf7a" strokeWidth="1.5" className="tank-turret" />
              <line x1="100" y1="25" x2="160" y2="15" stroke="#5a9e6b" strokeWidth="6" strokeLinecap="round" className="tank-barrel" />
              <circle cx="100" cy="35" r="10" fill="#2a5a37" className="tank-hatch" />
              <rect x="40" y="85" width="16" height="20" rx="3" fill="#2a4a37" className="tank-track" />
              <rect x="144" y="85" width="16" height="20" rx="3" fill="#2a4a37" className="tank-track" />
              <circle cx="48" cy="100" r="9" fill="#1a1a1a" stroke="#333" strokeWidth="1" className="tank-wheel" />
              <circle cx="152" cy="100" r="9" fill="#1a1a1a" stroke="#333" strokeWidth="1" className="tank-wheel" />
              <circle cx="100" cy="100" r="9" fill="#1a1a1a" stroke="#333" strokeWidth="1" className="tank-wheel" />
              <text x="90" y="75" fill="#8bc34a" fontSize="10" fontFamily="'Black Ops One', monospace">IRON</text>
            </g>
          )}
          {tank.name === 'Warhound' && (
            <g>
              <rect x="20" y="30" width="160" height="55" rx="6" fill="#5c2e2e" stroke="#d45a2a" strokeWidth="2" className="tank-body" />
              <polygon points="50,30 150,30 130,15 70,15" fill="#6e3a3a" stroke="#d45a2a" strokeWidth="1.5" className="tank-turret" />
              <line x1="130" y1="15" x2="195" y2="5" stroke="#d45a2a" strokeWidth="7" strokeLinecap="round" className="tank-barrel" />
              <circle cx="100" cy="45" r="12" fill="#4a2020" className="tank-hatch" />
              <line x1="30" y1="85" x2="170" y2="85" stroke="#2a1a1a" strokeWidth="8" strokeLinecap="round" className="tank-track" />
              <circle cx="40" cy="100" r="10" fill="#1a1a1a" stroke="#d45a2a" strokeWidth="1" className="tank-wheel" />
              <circle cx="80" cy="102" r="10" fill="#1a1a1a" stroke="#d45a2a" strokeWidth="1" className="tank-wheel" />
              <circle cx="120" cy="102" r="10" fill="#1a1a1a" stroke="#d45a2a" strokeWidth="1" className="tank-wheel" />
              <circle cx="160" cy="100" r="10" fill="#1a1a1a" stroke="#d45a2a" strokeWidth="1" className="tank-wheel" />
              <text x="75" y="72" fill="#ff5722" fontSize="11" fontFamily="'Black Ops One', monospace">HOUND</text>
            </g>
          )}
          {tank.name === 'Crimson Dozer' && (
            <g>
              <rect x="25" y="28" width="150" height="60" rx="10" fill="#4a2050" stroke="#c2185b" strokeWidth="2" className="tank-body" />
              <rect x="55" y="18" width="90" height="25" rx="6" fill="#5a2860" stroke="#e91e63" strokeWidth="1.5" className="tank-turret" />
              <line x1="145" y1="25" x2="200" y2="10" stroke="#e91e63" strokeWidth="8" strokeLinecap="round" className="tank-barrel" />
              <rect x="15" y="88" width="170" height="18" rx="5" fill="#2a1030" stroke="#c2185b" strokeWidth="1" className="tank-track" />
              <circle cx="45" cy="100" r="11" fill="#1a0a20" stroke="#e91e63" strokeWidth="1.5" className="tank-wheel" />
              <circle cx="85" cy="100" r="11" fill="#1a0a20" stroke="#c2185b" strokeWidth="1" className="tank-wheel" />
              <circle cx="125" cy="100" r="11" fill="#1a0a20" stroke="#c2185b" strokeWidth="1" className="tank-wheel" />
              <circle cx="165" cy="100" r="11" fill="#1a0a20" stroke="#e91e63" strokeWidth="1.5" className="tank-wheel" />
              <text x="60" y="68" fill="#e91e63" fontSize="9" fontFamily="'Black Ops One', monospace">DOZER</text>
            </g>
          )}
        </svg>
      </div>

      <div className="tank-info">
        <div className="tank-name" style={{ color: tank.accent }}>{tank.name}</div>
        <div className="tank-status-badge">
          {tank.status === 'alive' && <span className="status-alive">ACTIVE</span>}
          {tank.status === 'destroyed' && <span className="status-destroyed">DESTROYED</span>}
          {tank.status === 'victorious' && <span className="status-victorious">CHAMPION</span>}
        </div>
        {tank.rank && <div className={`tank-rank rank-${tank.rank}`}>#{tank.rank}</div>}
      </div>

      {underAttack && (
        <div className="targeting-laser">
          <div className="laser-beam" />
          <div className="laser-dot" />
        </div>
      )}

      {justEliminated && (
        <div className="elimination-flash">
          <div className="explosion-burst" />
          <div className="explosion-smoke" />
        </div>
      )}

      {isWinner && (
        <div className="victory-aura">
          <div className="golden-spotlight" />
          <div className="confetti-container">
            {Array.from({ length: 15 }).map((_, i) => (
              <div key={i} className="confetti-piece" style={{ left: `${Math.random() * 100}%`, animationDelay: `${Math.random() * 2}s`, backgroundColor: ['#ffd700', '#ff5722', '#e91e63', '#4caf50', '#2196f3'][i % 5] }} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
