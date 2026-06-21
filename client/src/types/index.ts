export interface ShowdownTeam {
  id: string;
  name: string;
  logo: string;
  color: string;
  stockValue: number;
  change: number;
  rank: number;
  members?: string[];
}

export interface ShowdownState {
  teams: ShowdownTeam[];
  baseValues: Record<string, number>;
  simulationActive: boolean;
}

export interface RankChange {
  teamId: string;
  name: string;
  logo: string;
  fromRank: number;
  toRank: number;
}

export interface RankChangeEvent {
  changes: RankChange[];
  teams: ShowdownTeam[];
}

export interface ServerToClientEvents {
  showdownUpdate: (state: ShowdownState) => void;
  showdownRankChange: (event: RankChangeEvent) => void;
  error: (message: string) => void;
}

export interface ClientToServerEvents {
  'showdown:join': () => void;
  'showdown:adminLogin': (password: string) => void;
  'showdown:setValue': (data: { teamId: string; value: number }) => void;
  'showdown:toggleSimulation': () => void;
  'showdown:reset': () => void;
}
