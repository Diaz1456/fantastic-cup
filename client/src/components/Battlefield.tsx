import { useEffect, useRef } from 'react';
import { Tank } from '../types';

interface Props {
  tanks: Tank[];
  tankUnderAttack: string | null;
  lastElimination: { tankId: string; rank: number } | null;
  phase: string;
}

export default function Battlefield({ tanks, tankUnderAttack, lastElimination, phase }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = canvas.offsetWidth * 2;
    canvas.height = canvas.offsetHeight * 2;
    ctx.scale(2, 2);

    let particles: Array<{ x: number; y: number; vx: number; vy: number; life: number; maxLife: number; r: number }> = [];
    let rain: Array<{ x: number; y: number; speed: number; len: number }> = [];
    let frame = 0;

    for (let i = 0; i < 80; i++) {
      rain.push({ x: Math.random() * canvas.width, y: Math.random() * canvas.height, speed: 4 + Math.random() * 6, len: 10 + Math.random() * 20 });
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width / 2, canvas.height / 2);
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(0, 0, canvas.width / 2, canvas.height / 2);

      const skyGrad = ctx.createLinearGradient(0, 0, 0, 200);
      skyGrad.addColorStop(0, '#1a1010');
      skyGrad.addColorStop(0.5, '#2a1515');
      skyGrad.addColorStop(1, '#1a0a0a');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, canvas.width / 2, 200);

      ctx.fillStyle = '#1a0a05';
      ctx.beginPath();
      ctx.rect(0, 200, canvas.width / 2, canvas.height / 2 - 200);
      ctx.fill();

      if (phase === 'battle') {
        if (Math.random() > 0.97) {
          for (let i = 0; i < 3; i++) {
            particles.push({
              x: Math.random() * (canvas.width / 2), y: 180 + Math.random() * 50,
              vx: (Math.random() - 0.5) * 2, vy: -Math.random() * 3 - 1,
              life: 0, maxLife: 30 + Math.random() * 30, r: 2 + Math.random() * 4,
            });
          }
        }
      }

      particles = particles.filter(p => {
        p.life++; p.x += p.vx; p.y += p.vy;
        const alpha = 1 - p.life / p.maxLife;
        ctx.fillStyle = ['#ff4500', '#ff6347', '#ff8c00', '#ffff00'][Math.floor(Math.random() * 4)];
        ctx.globalAlpha = alpha * 0.6;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * (1 - p.life / p.maxLife), 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        return p.life < p.maxLife;
      });

      rain.forEach(r => {
        r.y += r.speed;
        if (r.y > canvas.height / 2) { r.y = 0; r.x = Math.random() * (canvas.width / 2); }
        ctx.strokeStyle = 'rgba(100, 120, 140, 0.06)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(r.x, r.y);
        ctx.lineTo(r.x - 2, r.y + r.len);
        ctx.stroke();
      });

      frame++;
      requestAnimationFrame(draw);
    };

    const anim = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(anim);
  }, [phase]);

  return (
    <div className="battlefield-container">
      <canvas ref={canvasRef} className="battlefield-canvas" />

      <div className="bf-terrain">
        <div className="bf-craters">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bf-crater" style={{ left: `${10 + i * 20}%`, top: `${60 + Math.sin(i) * 10}%`, width: `${20 + Math.random() * 30}px`, height: `${10 + Math.random() * 15}px` }} />
          ))}
        </div>
      </div>

      {phase === 'battle' && (
        <div className="muzzle-flashes">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="muzzle-flash" style={{ left: `${25 + i * 18}%`, animationDelay: `${Math.random() * 3}s` }} />
          ))}
        </div>
      )}
    </div>
  );
}
