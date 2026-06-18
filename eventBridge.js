// ═══════════════════════════════════════════════════════════════
// EVENT MODULE BRIDGE — Integrates real‑time event features
// (countdown, team arena, tank warfare) into the existing server
// ═══════════════════════════════════════════════════════════════

const { v4: uuidv4 } = require('uuid');

const TANK_TEMPLATES = [
  { name: 'Ironclad', color: '#4a7c59', accent: '#8bc34a' },
  { name: 'Warhound', color: '#7c4a4a', accent: '#ff5722' },
  { name: 'Crimson Dozer', color: '#4a4a7c', accent: '#e91e63' },
];

function createTanks() {
  return TANK_TEMPLATES.map(t => ({
    id: uuidv4(), name: t.name, color: t.color, accent: t.accent,
    status: 'alive', rank: null, eliminatedAt: null,
  }));
}

function defaultState() {
  return {
    phase: 'countdown',
    activeModule: null,
    timer: { deadline: null, paused: false, mysteryMode: false, pausedRemaining: null },
    teams: [
      { id: uuidv4(), name: 'Elite Division', logo: '🦅', color: '#ffd700', points: 0, rank: 1 },
      { id: uuidv4(), name: 'Legends Cup', logo: '👑', color: '#c0c0c0', points: 0, rank: 2 },
      { id: uuidv4(), name: 'Storm Brigade', logo: '⚡', color: '#cd7f32', points: 0, rank: 3 },
    ],
    coins: [],
    playerBalances: {},
    tankBattle: {
      phase: 'idle', tanks: createTanks(), battleStartedAt: null,
      lastEliminationAt: null, eliminationCooldown: 5000, tankUnderAttackId: null,
    },
  };
}

class EventBridge {
  constructor() {
    this.state = defaultState();
    this.listeners = [];
    this.timerInterval = null;
  }

  on(fn) { this.listeners.push(fn); }
  emit() { this.listeners.forEach(fn => fn(this.state)); }

  getState() { return JSON.parse(JSON.stringify(this.state)); }

  setPhase(p) { this.state.phase = p; this.emit(); }

  setActiveModule(m) { this.state.activeModule = m; this.emit(); }

  // Timer
  setTimer(deadline, mysteryMode) {
    this.state.timer.deadline = deadline;
    this.state.timer.mysteryMode = !!mysteryMode;
    this.state.timer.paused = false;
    this.state.timer.pausedRemaining = null;
    this.emit();
    this._startTimer();
  }

  pauseTimer() {
    if (!this.state.timer.paused && this.state.timer.deadline) {
      this.state.timer.paused = true;
      this.state.timer.pausedRemaining = Math.max(0, this.state.timer.deadline - Date.now());
      this.emit();
      this._stopTimer();
    }
  }

  resumeTimer() {
    if (this.state.timer.paused && this.state.timer.pausedRemaining !== null) {
      this.state.timer.deadline = Date.now() + this.state.timer.pausedRemaining;
      this.state.timer.paused = false;
      this.state.timer.pausedRemaining = null;
      this.emit();
      this._startTimer();
    }
  }

  resetTimer() {
    this.state.timer.deadline = null;
    this.state.timer.paused = false;
    this.state.timer.pausedRemaining = null;
    this._stopTimer();
    this.emit();
  }

  extendTimer(sec) {
    if (this.state.timer.deadline) {
      this.state.timer.deadline += sec * 1000;
      this.emit();
    }
  }

  getRemaining() {
    if (this.state.timer.paused && this.state.timer.pausedRemaining !== null) return this.state.timer.pausedRemaining;
    if (!this.state.timer.deadline) return 0;
    return Math.max(0, this.state.timer.deadline - Date.now());
  }

  _startTimer() {
    this._stopTimer();
    this.timerInterval = setInterval(() => {
      const remaining = this.getRemaining();
      const state = this.state;
      const d = Math.floor(remaining / 86400000);
      const h = Math.floor((remaining % 86400000) / 3600000);
      const m = Math.floor((remaining % 3600000) / 60000);
      const s = Math.floor((remaining % 60000) / 1000);
      const pad = n => String(n).padStart(2, '0');
      const display = state.timer.mysteryMode && remaining > 10000
        ? '? ? : ? ? : ? ? : ? ?'
        : `${pad(d)} : ${pad(h)} : ${pad(m)} : ${pad(s)}`;

      this.listeners.forEach(fn => fn({ ...this.state, _timerRemaining: remaining, _timerDisplay: display }));

      if (remaining <= 0 && state.phase === 'countdown') {
        this.setPhase('standby');
        this._stopTimer();
      }
    }, 1000);
  }

  _stopTimer() { if (this.timerInterval) { clearInterval(this.timerInterval); this.timerInterval = null; } }

  // Teams
  updateTeams(teams) {
    this.state.teams = teams.map((t, i) => ({ ...t, rank: i + 1 }));
    this.emit();
  }

  // Coins
  awardCoin(data) {
    const tx = { id: uuidv4(), ...data, timestamp: Date.now() };
    this.state.coins.push(tx);
    const current = this.state.playerBalances[data.playerId] || 0;
    const newBalance = current + data.amount;
    this.state.playerBalances[data.playerId] = newBalance;
    this.emit();
    return { tx, newBalance };
  }

  // Tank Battle
  resetTankBattle() {
    this.state.tankBattle = { phase: 'idle', tanks: createTanks(), battleStartedAt: null, lastEliminationAt: null, eliminationCooldown: 5000, tankUnderAttackId: null };
    this.emit();
  }

  startBattle() {
    const b = this.state.tankBattle;
    b.phase = 'battle';
    b.battleStartedAt = Date.now();
    b.lastEliminationAt = null;
    b.tankUnderAttackId = null;
    b.tanks.forEach(t => { t.status = 'alive'; t.rank = null; t.eliminatedAt = null; });
    this.emit();
  }

  setTankUnderAttack(tankId) { this.state.tankBattle.tankUnderAttackId = tankId; this.emit(); }

  eliminateTank(tankId) {
    const tank = this.state.tankBattle.tanks.find(t => t.id === tankId);
    if (!tank || tank.status !== 'alive') return null;
    tank.status = 'destroyed';
    tank.eliminatedAt = Date.now();
    this.state.tankBattle.lastEliminationAt = Date.now();
    this.state.tankBattle.tankUnderAttackId = null;
    const destroyedCount = this.state.tankBattle.tanks.filter(t => t.status === 'destroyed').length;
    tank.rank = 4 - destroyedCount;
    if (destroyedCount === 2) {
      const winner = this.state.tankBattle.tanks.find(t => t.status === 'alive');
      if (winner) { winner.status = 'victorious'; winner.rank = 1; this.state.tankBattle.phase = 'victory'; }
    }
    this.emit();
    return tank;
  }

  getTanksSortedByRank() { return [...this.state.tankBattle.tanks].sort((a, b) => a.rank !== null && b.rank !== null ? a.rank - b.rank : a.rank === null ? 1 : -1); }

  resetEvent() { this.state = defaultState(); this._stopTimer(); this.emit(); }
}

module.exports = { EventBridge };
