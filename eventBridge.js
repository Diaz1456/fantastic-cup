// ═══════════════════════════════════════════════════════════════
// EVENT MODULE BRIDGE — Realtime Squid Game elimination event
// ═══════════════════════════════════════════════════════════════

const { v4: uuidv4 } = require('uuid');

function defaultState() {
  return {
    phase: 'countdown',
    activeModule: 'squid-game',
    timer: { deadline: null, paused: false, mysteryMode: false, pausedRemaining: null },
    teams: [
      { id: uuidv4(), name: 'Elite Division', logo: '🦅', color: '#ffd700', points: 0, rank: 1 },
      { id: uuidv4(), name: 'Legends Cup', logo: '👑', color: '#c0c0c0', points: 0, rank: 2 },
      { id: uuidv4(), name: 'Storm Brigade', logo: '⚡', color: '#cd7f32', points: 0, rank: 3 },
    ],
    coins: [],
    playerBalances: {},
    squidGame: {
      phase: 'idle', // 'idle' | 'active' | 'victory'
      players: [],
      gameStartedAt: null,
      lastEliminationAt: null,
      currentlyTargetedId: null,
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
        this.setPhase('active');
        this.setActiveModule('squid-game');
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

  // ─── SQUID GAME ─────────────────────────────────────────

  resetSquidGame() {
    this.state.squidGame = {
      phase: 'idle',
      players: [],
      gameStartedAt: null,
      lastEliminationAt: null,
      currentlyTargetedId: null,
    };
    this.emit();
  }

  startSquidGame() {
    const g = this.state.squidGame;
    g.phase = 'active';
    g.gameStartedAt = Date.now();
    g.lastEliminationAt = null;
    g.currentlyTargetedId = null;
    g.players.forEach(p => {
      p.status = 'alive';
      p.eliminatedAt = null;
    });
    this.emit();
  }

  addSquidPlayer(username, avatarUrl) {
    const g = this.state.squidGame;
    if (g.players.find(p => p.username === username)) return null;
    const player = {
      id: uuidv4(),
      username,
      avatarUrl: avatarUrl || '',
      status: 'alive',
      eliminatedAt: null,
      eliminatedBy: null,
    };
    g.players.push(player);
    this.emit();
    return player;
  }

  removeSquidPlayer(playerId) {
    const g = this.state.squidGame;
    const idx = g.players.findIndex(p => p.id === playerId);
    if (idx === -1) return false;
    g.players.splice(idx, 1);
    this.emit();
    return true;
  }

  setSquidTarget(playerId) {
    this.state.squidGame.currentlyTargetedId = playerId;
    this.emit();
  }

  eliminateSquidPlayer(playerId, adminName) {
    const g = this.state.squidGame;
    const player = g.players.find(p => p.id === playerId);
    if (!player || player.status !== 'alive') return null;

    player.status = 'eliminated';
    player.eliminatedAt = Date.now();
    player.eliminatedBy = adminName || 'admin';
    g.lastEliminationAt = Date.now();
    g.currentlyTargetedId = null;

    // Check for victory (only 1 alive left)
    const aliveCount = g.players.filter(p => p.status === 'alive').length;
    if (aliveCount <= 1) {
      const winner = g.players.find(p => p.status === 'alive');
      if (winner) {
        winner.status = 'winner';
      }
      g.phase = 'victory';
    }

    this.emit();
    return player;
  }

  getSquidWinner() {
    return this.state.squidGame.players.find(p => p.status === 'winner') || null;
  }

  getAliveSquidPlayers() {
    return this.state.squidGame.players.filter(p => p.status === 'alive');
  }

  resetEvent() { this.state = defaultState(); this._stopTimer(); this.emit(); }
}

module.exports = { EventBridge };
