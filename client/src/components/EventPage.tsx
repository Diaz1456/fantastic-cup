import { useMemo } from 'react';
import type { StockMarketState, PriceChange } from '../types';

interface Props {
  socket: any;
}

function MiniSparkline({ history, color }: { history: { price: number }[]; color: string }) {
  if (!history || history.length < 2) return <div className="sparkline-placeholder">—</div>;
  const prices = history.map(p => p.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  const w = 80;
  const h = 24;
  const pts = prices.map((p, i) => `${(i / (prices.length - 1)) * w},${h - ((p - min) / range) * h}`);
  return (
    <svg width={w} height={h} className="sparkline-svg">
      <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function EventPage({ socket }: Props) {
  const marketState: StockMarketState | null = socket.marketState;
  const lastChange: PriceChange | null = socket.priceChange;

  const tickerItems = useMemo(() => {
    if (!marketState) return [];
    return marketState.teams.map(t => {
      const price = marketState.prices[t.id] || marketState.config.baseValue;
      const hist = marketState.history[t.id] || [];
      const oldPrice = hist.length > 1 ? hist[hist.length - 2].price : price;
      const change = price - oldPrice;
      const pct = oldPrice > 0 ? ((change / oldPrice) * 100) : 0;
      const isUp = change >= 0;
      return { ...t, price, change, pct: Math.abs(pct).toFixed(1), isUp };
    });
  }, [marketState]);

  if (!marketState) {
    return (
      <div className="event-page loading">
        <div className="loading-screen">
          <div className="loading-emblem">📈</div>
          <div className="loading-text">INITIALIZING MARKET...</div>
          <div className="loading-bar"><div className="loading-fill" /></div>
        </div>
      </div>
    );
  }

  return (
    <div className="event-page stock-market-page">
      {/* Background Effects */}
      <div className="market-bg-grid" />
      <div className="market-particles" />

      {/* Ticker Tape */}
      <div className="market-ticker">
        <div className="ticker-inner">
          <span className="ticker-label">LIVE</span>
          <div className="ticker-scroll">
            {tickerItems.map(t => (
              <span key={t.id} className="ticker-item" style={{ color: t.color }}>
                {t.logo} {t.name}: <strong>{t.price}</strong>
                <span className={`ticker-pct ${t.isUp ? 'up' : 'down'}`}>
                  {t.isUp ? '▲' : '▼'} {t.pct}%
                </span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="event-header market-header">
        <div className="event-badge market-badge">📈 STOCK MARKET</div>
        <h1 className="event-title market-title">TEAM STOCK EXCHANGE</h1>
        <div className="connection-status">
          <span className={`dot ${socket.connected ? 'connected' : 'disconnected'}`} />
          {socket.connected ? 'LIVE' : '...'}
        </div>
      </div>

      {/* Market Cards Grid */}
      <div className="event-body market-body">
        <div className="market-cards-grid">
          {marketState.teams.length === 0 && (
            <div className="market-empty">
              <span className="market-empty-icon">📭</span>
              <p>No teams on the market yet.</p>
              <p className="text-muted">Ask your admin to create teams.</p>
            </div>
          )}
          {marketState.teams.map(team => {
            const price = marketState.prices[team.id] || marketState.config.baseValue;
            const hist = marketState.history[team.id] || [];
            const oldPrice = hist.length > 1 ? hist[hist.length - 2].price : price;
            const change = price - oldPrice;
            const pct = oldPrice > 0 ? ((change / oldPrice) * 100) : 0;
            const isUp = change >= 0;
            const isFrozen = marketState.frozen[team.id];
            const isFlashing = lastChange?.teamId === team.id;

            return (
              <div
                key={team.id}
                className={`stock-card ${isUp ? 'up' : 'down'} ${isFlashing ? 'flash' : ''} ${isFrozen ? 'frozen' : ''}`}
                style={{ borderColor: team.color }}
              >
                <div className="stock-card-header">
                  <span className="stock-logo">{team.logo}</span>
                  <span className="stock-name">{team.name}</span>
                  {isFrozen && <span className="stock-frozen-badge">🧊 FROZEN</span>}
                </div>
                <div className="stock-price-row">
                  <span className="stock-price">{price.toLocaleString()}</span>
                  <span className={`stock-change ${isUp ? 'up' : 'down'}`}>
                    {isUp ? '▲' : '▼'} {Math.abs(pct).toFixed(2)}%
                  </span>
                </div>
                <div className="stock-sparkline">
                  <MiniSparkline history={hist} color={isUp ? '#22c55e' : '#ef4444'} />
                </div>
                <div className="stock-members">
                  <span className="stock-members-label">{team.members?.length || 0} members</span>
                  {isFrozen && <span className="stock-frozen-text">Trading halted</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Ticker */}
      <div className="market-ticker bottom">
        <div className="ticker-inner">
          <span className="ticker-label">LAST</span>
          <div className="ticker-scroll">
            {tickerItems.filter(t => Math.abs(t.change) > 0).map(t => (
              <span key={t.id} className="ticker-item">
                {t.logo} {t.name}: <strong>{t.price}</strong>
                <span className={`ticker-pct ${t.isUp ? 'up' : 'down'}`}>
                  {t.isUp ? '▲' : '▼'} {t.pct}%
                </span>
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="event-footer market-footer">
        <div className="footer-scanlines" />
        <div className="footer-text">FANTASTIC CUP — STOCK EXCHANGE</div>
      </div>
    </div>
  );
}
