import { Team } from './types';
import { v4 as uuidv4 } from 'uuid';

const DEFAULT_TEAMS: Team[] = [
  { id: uuidv4(), name: 'Elite Division', logo: '🦅', color: '#ffd700', points: 0, rank: 1 },
  { id: uuidv4(), name: 'Legends Cup', logo: '👑', color: '#c0c0c0', points: 0, rank: 2 },
  { id: uuidv4(), name: 'Storm Brigade', logo: '⚡', color: '#cd7f32', points: 0, rank: 3 },
];

interface TimerState {
  deadline: number | null;
  paused: boolean;
  mysteryMode: boolean;
  pausedRemaining: number | null;
}

interface SimpleState {
  timer: TimerState;
  teams: Team[];
}

function defaultState(): SimpleState {
  return {
    timer: {
      deadline: null,
      paused: false,
      mysteryMode: false,
      pausedRemaining: null,
    },
    teams: DEFAULT_TEAMS.map(t => ({ ...t })),
  };
}

class EventStateManager {
  private state: SimpleState;
  private timerInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.state = defaultState();
  }

  getState(): SimpleState {
    return JSON.parse(JSON.stringify(this.state));
  }

  setTimer(deadline: number, mysteryMode: boolean) {
    this.state.timer.deadline = deadline;
    this.state.timer.mysteryMode = mysteryMode;
    this.state.timer.paused = false;
    this.state.timer.pausedRemaining = null;
    this._startTimer();
  }

  pauseTimer() {
    if (!this.state.timer.paused && this.state.timer.deadline) {
      this.state.timer.paused = true;
      this.state.timer.pausedRemaining = Math.max(0, this.state.timer.deadline - Date.now());
      this._stopTimer();
    }
  }

  resumeTimer() {
    if (this.state.timer.paused && this.state.timer.pausedRemaining !== null) {
      this.state.timer.deadline = Date.now() + this.state.timer.pausedRemaining;
      this.state.timer.paused = false;
      this.state.timer.pausedRemaining = null;
      this._startTimer();
    }
  }

  resetTimer() {
    this.state.timer.deadline = null;
    this.state.timer.paused = false;
    this.state.timer.pausedRemaining = null;
    this._stopTimer();
  }

  extendTimer(sec: number) {
    if (this.state.timer.deadline) {
      this.state.timer.deadline += sec * 1000;
    }
  }

  getRemaining(): number {
    if (this.state.timer.paused && this.state.timer.pausedRemaining !== null) return this.state.timer.pausedRemaining;
    if (!this.state.timer.deadline) return 0;
    return Math.max(0, this.state.timer.deadline - Date.now());
  }

  updateTeams(teams: Team[]) {
    this.state.teams = teams.map((t, i) => ({ ...t, rank: i + 1 }));
  }

  private _startTimer() {
    this._stopTimer();
    this.timerInterval = setInterval(() => {
      const remaining = this.getRemaining();
      const h = Math.floor(remaining / 3600000);
      const m = Math.floor((remaining % 3600000) / 60000);
      const s = Math.floor((remaining % 60000) / 1000);
      const pad = (n: number) => String(n).padStart(2, '0');
      const display = this.state.timer.mysteryMode && remaining > 10000
        ? '? ? : ? ? : ? ?'
        : `${pad(h)}:${pad(m)}:${pad(s)}`;
      if (remaining <= 0) this._stopTimer();
    }, 1000);
  }

  private _stopTimer() {
    if (this.timerInterval) { clearInterval(this.timerInterval); this.timerInterval = null; }
  }
}

export { EventStateManager, DEFAULT_TEAMS };
