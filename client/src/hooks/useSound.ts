import { useCallback, useRef, useEffect } from 'react';

type SoundType = 'tick' | 'alarm' | 'explosion' | 'siren' | 'victory' | 'coin' | 'whoosh' | 'celebration';

class SoundEngine {
  private ctx: AudioContext | null = null;
  private initialized = false;

  init() {
    if (this.initialized) return;
    try {
      this.ctx = new AudioContext();
      this.initialized = true;
    } catch { /* silent */ }
  }

  private getCtx() {
    if (!this.ctx) return null;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }

  private noise(ctx: AudioContext, dur: number): AudioBufferSourceNode {
    const len = ctx.sampleRate * dur;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    return src;
  }

  play(type: SoundType) {
    const ctx = this.getCtx();
    if (!ctx) return;

    switch (type) {
      case 'tick': {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'square'; o.frequency.value = 800;
        g.gain.setValueAtTime(0.12, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
        o.connect(g).connect(ctx.destination);
        o.start(); o.stop(ctx.currentTime + 0.05);
        break;
      }
      case 'alarm': {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(440, ctx.currentTime);
        o.frequency.linearRampToValueAtTime(880, ctx.currentTime + 0.2);
        g.gain.setValueAtTime(0.15, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        o.connect(g).connect(ctx.destination);
        o.start(); o.stop(ctx.currentTime + 0.3);
        break;
      }
      case 'explosion': {
        const src = this.noise(ctx, 1.5);
        const g = ctx.createGain();
        const f = ctx.createBiquadFilter();
        f.type = 'lowpass';
        f.frequency.setValueAtTime(800, ctx.currentTime);
        f.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 1);
        g.gain.setValueAtTime(0.4, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);
        src.connect(f).connect(g).connect(ctx.destination);
        src.start(); src.stop(ctx.currentTime + 1.5);
        break;
      }
      case 'siren': {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(300, ctx.currentTime);
        o.frequency.linearRampToValueAtTime(600, ctx.currentTime + 0.5);
        o.frequency.linearRampToValueAtTime(300, ctx.currentTime + 1);
        o.frequency.linearRampToValueAtTime(600, ctx.currentTime + 1.5);
        o.frequency.linearRampToValueAtTime(300, ctx.currentTime + 2);
        g.gain.setValueAtTime(0.15, ctx.currentTime);
        o.connect(g).connect(ctx.destination);
        o.start(); o.stop(ctx.currentTime + 2);
        break;
      }
      case 'victory': {
        [523, 659, 784, 1047].forEach((freq, i) => {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.type = 'square'; o.frequency.value = freq;
          const t = ctx.currentTime + i * 0.3;
          g.gain.setValueAtTime(0.15, t);
          g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
          o.connect(g).connect(ctx.destination);
          o.start(t); o.stop(t + 0.5);
        });
        break;
      }
      case 'coin': {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(1200, ctx.currentTime);
        o.frequency.exponentialRampToValueAtTime(2400, ctx.currentTime + 0.1);
        g.gain.setValueAtTime(0.1, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
        o.connect(g).connect(ctx.destination);
        o.start(); o.stop(ctx.currentTime + 0.15);
        break;
      }
      case 'whoosh': {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(200, ctx.currentTime);
        o.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.3);
        g.gain.setValueAtTime(0.06, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        o.connect(g).connect(ctx.destination);
        o.start(); o.stop(ctx.currentTime + 0.3);
        break;
      }
      case 'celebration': {
        [440, 554, 659, 880].forEach((freq, i) => {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.type = 'triangle'; o.frequency.value = freq;
          const t = ctx.currentTime + i * 0.15;
          g.gain.setValueAtTime(0.1, t);
          g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
          o.connect(g).connect(ctx.destination);
          o.start(t); o.stop(t + 0.2);
        });
        break;
      }
    }
  }
}

const engine = new SoundEngine();

export function useSound() {
  const initRef = useRef(false);
  useEffect(() => {
    const handler = () => {
      if (!initRef.current) { engine.init(); initRef.current = true; }
    };
    window.addEventListener('click', handler, { once: true });
    window.addEventListener('touchstart', handler, { once: true });
    return () => window.removeEventListener('click', handler);
  }, []);
  return { play: useCallback((t: SoundType) => { engine.init(); engine.play(t); }, []) };
}
