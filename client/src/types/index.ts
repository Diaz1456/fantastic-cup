export interface MonopolyCompany {
  id: string;
  name: string;
  color: string;
}

export interface MonopolyStock {
  id: string;
  companyId: string;
  name: string;
  price: number;
  volume: number;
  lastDelta: number;
  lastAction: string;
}

export interface MonopolyState {
  companies: MonopolyCompany[];
  stocks: MonopolyStock[];
  lastTrade: { stockId: string; companyId: string; action: string } | null;
}

export interface ServerToClientEvents {
  monopolyUpdate: (state: MonopolyState) => void;
  error: (message: string) => void;
}

export interface ClientToServerEvents {
  'monopoly:join': () => void;
  'monopoly:adminLogin': (password: string) => void;
  'monopoly:trade': (data: { stockId: string; action: string }) => void;
  'monopoly:updateStock': (data: { stockId: string; name?: string; price?: number; volume?: number }) => void;
  'monopoly:updateCompany': (data: { companyId: string; name?: string; color?: string }) => void;
}
