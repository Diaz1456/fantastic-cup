export interface Team {
  id: string;
  name: string;
  logo: string;
  color: string;
  points: number;
  rank: number;
  members?: string[];
  silverCoins?: number;
  notes?: string;
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

export interface StockTeam {
  id: string;
  name: string;
  logo: string;
  color: string;
  members: string[];
  silverCoins: number;
  notes: string;
}

export interface PricePoint {
  price: number;
  timestamp: number;
}

export interface StockMarketState {
  teams: StockTeam[];
  prices: Record<string, number>;
  history: Record<string, PricePoint[]>;
  sentiment: Record<string, number>;
  frozen: Record<string, boolean>;
  config: { multiplier: number; baseValue: number };
  lastUpdate: number | null;
  playerPerformance: Record<string, Record<string, number>>;
}

export interface PriceChange {
  teamId: string;
  price: number;
  oldPrice: number;
  change: number;
  pctChange: number;
  history: PricePoint[];
  spike?: boolean;
}

export interface ServerToClientEvents {
  stockMarketUpdate: (state: StockMarketState) => void;
  stockPriceChange: (change: PriceChange) => void;
  stockPerformanceUpdated: (data: { teamId: string; username: string; score: number }) => void;
  'stockMarket:adminGranted': () => void;
  error: (message: string) => void;
}

export interface ClientToServerEvents {
  'stockMarket:join': () => void;
  'stockMarket:adminLogin': (password: string) => void;
  'stockMarket:updatePerformance': (data: { teamId: string; username: string; score: number }) => void;
  'stockMarket:setSentiment': (data: { teamId: string; sentiment: number }) => void;
  'stockMarket:setFrozen': (data: { teamId: string; frozen: boolean }) => void;
  'stockMarket:resetPrices': () => void;
  'stockMarket:spike': (data: { teamId: string; amount: number }) => void;
  'stockMarket:updateConfig': (data: { multiplier?: number; baseValue?: number }) => void;
}
