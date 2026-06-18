import { useEffect, useRef } from 'react';
import { useSound } from '../hooks/useSound';

interface Props {
  display: string;
  remaining: number;
  mysteryMode: boolean;
  phase: string;
}

export default function GlobalCountdown({ display, remaining, mysteryMode, phase }: Props) {
  const { play } = useSound();
  const prevSec = useRef(-1);
  const isRevealed = !mysteryMode || remaining <= 10000;
  const showDigits = phase === 'countdown';

  useEffect(() => {
    const sec = Math.floor(remaining / 1000);
    if (sec !== prevSec.current && sec > 0 && sec <= 10) {
      play('tick');
    }
    if (remaining <= 0 && phase === 'countdown') {
      play('siren');
    }
    prevSec.current = sec;
  }, [remaining, mysteryMode, phase]);

  if (!showDigits) return null;

  return (
    <div className={`global-countdown ${!isRevealed ? 'mystery' : 'revealed'} ${remaining <= 10000 && isRevealed ? 'urgent' : ''}`}>
      <div className="countdown-label">EVENT COUNTDOWN</div>
      <div className="clock-face">
        <div className="clock-digits">
          {!isRevealed ? (
            <span className="mystery-digits">
              <span className="mystery-pulse">?</span>
            </span>
          ) : (
            <span className={`digit-text ${remaining <= 10000 ? 'frantic' : ''}`}>{display}</span>
          )}
        </div>
        <div className="clock-rivets">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rivet" style={{ transform: `rotate(${i * 45}deg) translateY(-38px)` }} />
          ))}
        </div>
      </div>
      {remaining <= 10000 && remaining > 0 && isRevealed && (
        <div className="tick-accelerate-bar" style={{ width: `${(remaining / 10000) * 100}%` }} />
      )}
    </div>
  );
}
