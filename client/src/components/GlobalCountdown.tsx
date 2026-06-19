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
  const lastSec = useRef<number>(-1);

  useEffect(() => {
    const sec = Math.floor(remaining / 1000);
    if (sec !== lastSec.current && sec <= 10 && sec > 0) {
      play('tick');
    }
    if (sec === 0 && lastSec.current !== 0 && remaining === 0) {
      play('siren');
    }
    lastSec.current = sec;
  }, [remaining, play]);

  const isMystery = mysteryMode && remaining > 10000;
  const isFrantic = remaining <= 10000 && remaining > 0;
  const showDigits = !isMystery;

  // Parse display string
  let parts: string[] = [];
  if (showDigits && display) {
    parts = display.split(' : ');
  }

  return (
    <div className={`global-countdown ${isMystery ? 'mystery' : ''} ${isFrantic ? 'frantic' : ''}`}>
      <div className="countdown-label">EVENT COUNTDOWN</div>
      <div className="clock-face">
        {isMystery ? (
          <div className="clock-digits mystery">? ? : ? ? : ? ? : ? ?</div>
        ) : parts.length === 4 ? (
          <div className="clock-digits">
            <span className="cd-segment">{parts[0]}</span>
            <span className="cd-sep">:</span>
            <span className="cd-segment">{parts[1]}</span>
            <span className="cd-sep">:</span>
            <span className="cd-segment">{parts[2]}</span>
            <span className="cd-sep">:</span>
            <span className="cd-segment">{parts[3]}</span>
          </div>
        ) : (
          <div className="clock-digits">{display || '-- : -- : -- : --'}</div>
        )}
        {isFrantic && <div className="tick-accelerate-bar"><div className="tick-fill" style={{ width: `${(remaining / 10000) * 100}%` }} /></div>}
      </div>
    </div>
  );
}
