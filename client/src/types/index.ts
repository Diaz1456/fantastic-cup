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

export interface SquidPlayer {
  id: string;
  username: string;
  avatarUrl: string;
  status: 'alive' | 'eliminated' | 'winner';
  eliminatedAt: number | null;
  eliminatedBy: string | null;
}

export type GamePhase = 'countdown' | 'standby' | 'active';
export type ActiveModule = 'team-arena' | 'squid-game' | null;

export interface TimerState {
  deadline: number | null;
  paused: boolean;
  mysteryMode: boolean;
  pausedRemaining: number | null;
}

export interface SquidGameState {
  phase: 'idle' | 'active' | 'victory';
  players: SquidPlayer[];
  gameStartedAt: number | null;
  lastEliminationAt: number | null;
  currentlyTargetedId: string | null;
}

export interface EventState {
  phase: GamePhase;
  activeModule: ActiveModule;
  timer: TimerState;
  teams: Team[];
  coins: CoinTransaction[];
  playerBalances: Record<string, number>;
  squidGame: SquidGameState;
  adminToken?: string;
}

export interface ServerToClientEvents {
  stateSync: (state: EventState) => void;
  timerTick: (remaining: number, display: string) => void;
  phaseChange: (phase: GamePhase) => void;
  moduleChange: (module: ActiveModule) => void;
  teamsUpdate: (teams: Team[]) => void;
  coinAwarded: (transaction: CoinTransaction, newBalance: number) => void;
  squidGameStarted: () => void;
  squidGameReset: () => void;
  squidPlayerAdded: (player: SquidPlayer) => void;
  squidPlayerRemoved: (playerId: string) => void;
  squidPlayerTargeted: (playerId: string) => void;
  squidPlayerEliminated: (data: { player: SquidPlayer; rank: number | null }) => void;
  squidGameVictory: (data: { winner: SquidPlayer | null; remaining: SquidPlayer[] }) => void;
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
  adminStartSquidGame: () => void;
  adminResetSquidGame: () => void;
  adminAddSquidPlayer: (data: { username: string; avatarUrl?: string }) => void;
  adminRemoveSquidPlayer: (playerId: string) => void;
  adminEliminateSquidPlayer: (data: { playerId: string; adminName?: string; rank?: number }) => void;
}
