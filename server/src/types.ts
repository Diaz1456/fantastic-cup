export interface Team {
  id: string;
  name: string;
  logo: string;
  color: string;
  points: number;
  rank: number;
}

export interface CoinTransaction {
  id: string;
  playerId: string;
  playerName: string;
  amount: number;
  reason: string;
  emoji: string;
  timestamp: number;
}

export interface Tank {
  id: string;
  name: string;
  color: string;
  accent: string;
  status: 'alive' | 'destroyed' | 'victorious';
  rank: number | null;
  eliminatedAt: number | null;
}

export type GamePhase = 'countdown' | 'standby' | 'active';
export type ActiveModule = 'team-arena' | 'tank-warfare' | null;

export interface TimerState {
  deadline: number | null;
  paused: boolean;
  mysteryMode: boolean;
  pausedRemaining: number | null;
}

export interface TankBattleState {
  phase: 'idle' | 'battle' | 'victory';
  tanks: Tank[];
  battleStartedAt: number | null;
  lastEliminationAt: number | null;
  eliminationCooldown: number;
  tankUnderAttackId: string | null;
}

export interface EventState {
  phase: GamePhase;
  activeModule: ActiveModule;
  timer: TimerState;
  teams: Team[];
  coins: CoinTransaction[];
  playerBalances: Record<string, number>;
  tankBattle: TankBattleState;
}

export interface ServerToClientEvents {
  stateSync: (state: EventState) => void;
  timerTick: (remaining: number, display: string) => void;
  phaseChange: (phase: GamePhase) => void;
  moduleChange: (module: ActiveModule) => void;
  teamsUpdate: (teams: Team[]) => void;
  coinAwarded: (transaction: CoinTransaction, newBalance: number) => void;
  battleStarted: () => void;
  tankUnderAttack: (tankId: string) => void;
  tankEliminated: (tankId: string, rank: number) => void;
  battleVictory: (winner: Tank, rankings: Tank[]) => void;
  error: (message: string) => void;
}

export interface ClientToServerEvents {
  join: () => void;
  adminLogin: (password: string) => void;
  adminSetTimer: (data: { deadline: number; mysteryMode: boolean }) => void;
  adminPauseTimer: () => void;
  adminResumeTimer: () => void;
  adminResetTimer: () => void;
  adminExtendTimer: (seconds: number) => void;
  adminSwitchModule: (module: ActiveModule) => void;
  adminUpdateTeams: (teams: Team[]) => void;
  adminAwardCoin: (data: { playerId: string; playerName: string; amount: number; reason: string; emoji: string }) => void;
  adminStartBattle: () => void;
  adminEliminateTank: (tankId: string) => void;
  adminResetBattle: () => void;
}

export const JWT_SECRET = process.env.JWT_SECRET || 'fc-secret-2024';
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'commander48';
export const PORT = parseInt(process.env.PORT || '3001');
