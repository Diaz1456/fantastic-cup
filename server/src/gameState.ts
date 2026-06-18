import { EventState, Team, TankBattleState, Tank, GamePhase, ActiveModule, CoinTransaction } from './types';
import { v4 as uuidv4 } from 'uuid';

const TANK_TEMPLATES = [
  { name: 'Ironclad', color: '#4a7c59', accent: '#8bc34a' },
  { name: 'Warhound', color: '#7c4a4a', accent: '#ff5722' },
  { name: 'Crimson Dozer', color: '#4a4a7c', accent: '#e91e63' },
];

const DEFAULT_TEAMS: Team[] = [
  { id: uuidv4(), name: 'Elite Division', logo: '🦅', color: '#ffd700', points: 0, rank: 1 },
  { id: uuidv4(), name: 'Legends Cup', logo: '👑', color: '#c0c0c0', points: 0, rank: 2 },
  { id: uuidv4(), name: 'Storm Brigade', logo: '⚡', color: '#cd7f32', points: 0, rank: 3 },
];

function createTanks(): Tank[] {
  return TANK_TEMPLATES.map((t, i) => ({
    id: uuidv4(),
    name: t.name,
    color: t.color,
    accent: t.accent,
    status: 'alive' as const,
    rank: null,
    eliminatedAt: null,
  }));
}

function defaultTankBattle(): TankBattleState {
  return {
    phase: 'idle',
    tanks: createTanks(),
    battleStartedAt: null,
    lastEliminationAt: null,
    eliminationCooldown: 5000,
    tankUnderAttackId: null,
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
    tankBattle: defaultTankBattle(),
  };
}

class EventStateManager {
  private state: EventState;

  constructor() {
    this.state = defaultState();
  }

  getState(): EventState {
    return { ...this.state, tankBattle: { ...this.state.tankBattle, tanks: [...this.state.tankBattle.tanks] } };
  }

  setPhase(phase: GamePhase) { this.state.phase = phase; }

  setActiveModule(mod: ActiveModule) { this.state.activeModule = mod; }

  // Timer
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

  // Teams
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

  // Coins
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

  // Tank Battle
  resetTankBattle() {
    this.state.tankBattle = defaultTankBattle();
  }

  startBattle() {
    this.state.tankBattle.phase = 'battle';
    this.state.tankBattle.battleStartedAt = Date.now();
    this.state.tankBattle.lastEliminationAt = null;
    this.state.tankBattle.tankUnderAttackId = null;
    this.state.tankBattle.tanks.forEach(t => { t.status = 'alive'; t.rank = null; t.eliminatedAt = null; });
  }

  setTankUnderAttack(tankId: string | null) {
    this.state.tankBattle.tankUnderAttackId = tankId;
  }

  eliminateTank(tankId: string): Tank | null {
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
      if (winner) {
        winner.status = 'victorious';
        winner.rank = 1;
        this.state.tankBattle.phase = 'victory';
      }
    }

    return tank;
  }

  getTanksSortedByRank(): Tank[] {
    return [...this.state.tankBattle.tanks].sort((a, b) => {
      if (a.rank === null && b.rank === null) return 0;
      if (a.rank === null) return 1;
      if (b.rank === null) return -1;
      return a.rank - b.rank;
    });
  }

  resetEvent() {
    this.state = defaultState();
  }
}

export const eventManager = new EventStateManager();
