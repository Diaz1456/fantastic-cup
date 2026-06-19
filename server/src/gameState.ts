import { EventState, Team, SquidGameState, SquidPlayer, GamePhase, ActiveModule, CoinTransaction } from './types';
import { v4 as uuidv4 } from 'uuid';

const DEFAULT_TEAMS: Team[] = [
  { id: uuidv4(), name: 'Elite Division', logo: '🦅', color: '#ffd700', points: 0, rank: 1 },
  { id: uuidv4(), name: 'Legends Cup', logo: '👑', color: '#c0c0c0', points: 0, rank: 2 },
  { id: uuidv4(), name: 'Storm Brigade', logo: '⚡', color: '#cd7f32', points: 0, rank: 3 },
];

function defaultSquidGame(): SquidGameState {
  return {
    phase: 'idle',
    players: [],
    gameStartedAt: null,
    lastEliminationAt: null,
    currentlyTargetedId: null,
  };
}

function defaultState(): EventState {
  return {
    phase: 'countdown',
    activeModule: null,
    timer: {
      deadline: null,
      paused: false,
      mysteryMode: false,
      pausedRemaining: null,
    },
    teams: DEFAULT_TEAMS.map(t => ({ ...t })),
    coins: [],
    playerBalances: {},
    squidGame: defaultSquidGame(),
  };
}

class EventStateManager {
  private state: EventState;

  constructor() {
    this.state = defaultState();
  }

  getState(): EventState {
    return { ...this.state, squidGame: { ...this.state.squidGame, players: [...this.state.squidGame.players] } };
  }

  setPhase(phase: GamePhase) { this.state.phase = phase; }

  setActiveModule(mod: ActiveModule) { this.state.activeModule = mod; }

  setTimer(data: { deadline: number; mysteryMode: boolean }) {
    this.state.timer.deadline = data.deadline;
    this.state.timer.mysteryMode = data.mysteryMode;
    this.state.timer.paused = false;
    this.state.timer.pausedRemaining = null;
  }

  pauseTimer() {
    if (!this.state.timer.paused && this.state.timer.deadline) {
      const remaining = this.state.timer.deadline - Date.now();
      this.state.timer.paused = true;
      this.state.timer.pausedRemaining = Math.max(0, remaining);
    }
  }

  resumeTimer() {
    if (this.state.timer.paused && this.state.timer.pausedRemaining !== null) {
      this.state.timer.deadline = Date.now() + this.state.timer.pausedRemaining;
      this.state.timer.paused = false;
      this.state.timer.pausedRemaining = null;
    }
  }

  resetTimer() { this.state.timer.deadline = null; this.state.timer.paused = false; this.state.timer.pausedRemaining = null; }

  extendTimer(seconds: number) {
    if (this.state.timer.deadline) this.state.timer.deadline += seconds * 1000;
  }

  getRemainingTime(): number {
    if (this.state.timer.paused && this.state.timer.pausedRemaining !== null) return this.state.timer.pausedRemaining;
    if (!this.state.timer.deadline) return 0;
    return Math.max(0, this.state.timer.deadline - Date.now());
  }

  updateTeams(teams: Team[]) {
    this.state.teams = teams.map((t, i) => ({ ...t, rank: i + 1 }));
  }

  addTeamPoints(teamId: string, points: number) {
    const team = this.state.teams.find(t => t.id === teamId);
    if (team) {
      team.points += points;
      this.state.teams.sort((a, b) => b.points - a.points);
      this.state.teams.forEach((t, i) => t.rank = i + 1);
    }
  }

  awardCoin(data: { playerId: string; playerName: string; amount: number; reason: string; emoji: string }): { tx: CoinTransaction; newBalance: number } {
    const tx: CoinTransaction = {
      id: uuidv4(),
      ...data,
      timestamp: Date.now(),
    };
    this.state.coins.push(tx);
    const current = this.state.playerBalances[data.playerId] || 0;
    const newBalance = current + data.amount;
    this.state.playerBalances[data.playerId] = newBalance;
    return { tx, newBalance };
  }

  getPlayerBalance(playerId: string): number {
    return this.state.playerBalances[playerId] || 0;
  }

  // Squid Game
  resetSquidGame() {
    this.state.squidGame = defaultSquidGame();
  }

  startSquidGame() {
    const g = this.state.squidGame;
    g.phase = 'active';
    g.gameStartedAt = Date.now();
    g.lastEliminationAt = null;
    g.currentlyTargetedId = null;
    g.players.forEach(p => { p.status = 'alive'; p.eliminatedAt = null; });
  }

  addSquidPlayer(username: string, avatarUrl?: string): SquidPlayer | null {
    const g = this.state.squidGame;
    if (g.players.find(p => p.username === username)) return null;
    const player: SquidPlayer = {
      id: uuidv4(),
      username,
      avatarUrl: avatarUrl || '',
      status: 'alive',
      eliminatedAt: null,
      eliminatedBy: null,
    };
    g.players.push(player);
    return player;
  }

  removeSquidPlayer(playerId: string): boolean {
    const g = this.state.squidGame;
    const idx = g.players.findIndex(p => p.id === playerId);
    if (idx === -1) return false;
    g.players.splice(idx, 1);
    return true;
  }

  setSquidTarget(playerId: string | null) {
    this.state.squidGame.currentlyTargetedId = playerId;
  }

  eliminateSquidPlayer(playerId: string, adminName?: string): SquidPlayer | null {
    const g = this.state.squidGame;
    const player = g.players.find(p => p.id === playerId);
    if (!player || player.status !== 'alive') return null;

    player.status = 'eliminated';
    player.eliminatedAt = Date.now();
    player.eliminatedBy = adminName || 'Guard';
    g.lastEliminationAt = Date.now();
    g.currentlyTargetedId = null;

    const aliveCount = g.players.filter(p => p.status === 'alive').length;
    if (aliveCount <= 1) {
      const winner = g.players.find(p => p.status === 'alive');
      if (winner) winner.status = 'winner';
      g.phase = 'victory';
    }

    return player;
  }

  getSquidWinner(): SquidPlayer | null {
    return this.state.squidGame.players.find(p => p.status === 'winner') || null;
  }

  getAliveSquidPlayers(): SquidPlayer[] {
    return this.state.squidGame.players.filter(p => p.status === 'alive');
  }

  resetEvent() {
    this.state = defaultState();
  }
}

export const eventManager = new EventStateManager();
