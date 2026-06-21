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

export const JWT_SECRET = process.env.JWT_SECRET || 'fc-secret-2024';
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'commander48';
export const PORT = parseInt(process.env.PORT || '3001');
