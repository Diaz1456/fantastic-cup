import { useEffect } from 'react';
import { Tank } from '../types';
import { useSound } from '../hooks/useSound';

interface Props {
  winner: Tank;
  rankings: Tank[];
}

export default function VictoryScreen({ winner, rankings }: Props) {
  const { play } = useSound();

  useEffect(() => {
    play('victory');
    const interval = setInterval(() => play('celebration'), 1500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="victory-screen">
      <div className="victory-bg-flash" />
      <div className="victory-header">
        <div className="victory-stars">★ ★ ★</div>
        <h1 className="victory-title">BATTLE CONCLUDED</h1>
        <div className="victory-stars">★ ★ ★</div>
      </div>

      <div className="podium-container">
        {rankings.map((tank, i) => (
          <div key={tank.id} className={`podium-entry ${tank.id === winner.id ? 'gold' : ''}`} style={{ animationDelay: `${i * 0.3}s` }}>
            <div className="podium-avatar" style={{ borderColor: tank.accent }}>
              <div className="podium-avatar-inner" style={{ background: tank.color }}>
                <span style={{ color: tank.accent }}>{tank.name[0]}</span>
              </div>
            </div>
            <div className={`podium-bar rank-${tank.rank}`} style={{ height: tank.rank === 1 ? 200 : tank.rank === 2 ? 150 : 120, '--bar-color': tank.id === winner.id ? '#ffd700' : tank.accent } as React.CSSProperties}>
              <span className="podium-num">#{tank.rank}</span>
            </div>
            <div className="podium-name" style={{ color: tank.accent }}>{tank.name}</div>
            <div className="podium-label">{tank.rank === 1 ? 'CHAMPION' : tank.rank === 2 ? '2ND PLACE' : '3RD PLACE'}</div>
          </div>
        ))}
      </div>

      <div className="fireworks-container">
        {Array.from({ length: 25 }).map((_, i) => (
          <div key={i} className="firework" style={{ left: `${Math.random() * 100}%`, top: `${Math.random() * 60}%`, animationDelay: `${Math.random() * 3}s`, backgroundColor: ['#ffd700', '#ff5722', '#e91e63'][i % 3] }} />
        ))}
      </div>
    </div>
  );
}
