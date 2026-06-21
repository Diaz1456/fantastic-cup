import { useMemo } from 'react';
import type { MonopolyState, MonopolyStock } from '../types';

interface Props {
  socket: any;
}

export default function MonopolyPage({ socket }: Props) {
  const state: MonopolyState | null = socket.monopolyState;

  const sortedStocks = useMemo(() => {
    if (!state) return [];
    return [...state.stocks].sort((a, b) => b.price - a.price);
  }, [state?.stocks]);

  const activeCompanyId = state?.lastTrade?.companyId || null;
  const lastAction = state?.lastTrade?.action || null;

  if (!state) {
    return (
      <div className="monopoly-page">
        <div className="mp-loading">
          <div className="mp-loading-icon">📈</div>
          <div className="mp-loading-text">Loading Market...</div>
        </div>
      </div>
    );
  }

  const getCompany = (companyId: string) => state.companies.find(c => c.id === companyId);
  const getBadgeText = () => {
    if (!activeCompanyId || !lastAction) return '⚪ NO ACTIVE MARKET';
    const company = getCompany(activeCompanyId);
    const name = company ? company.name : 'Unknown';
    return lastAction === 'buy' ? `🟢 ${name} BULLISH` : `🔴 ${name} BEARISH`;
  };
  const getBadgeClass = () => {
    if (!activeCompanyId || !lastAction) return '';
    return lastAction === 'buy' ? 'mp-badge active-win' : 'mp-badge active-lose';
  };

  const formatVolume = (v: number) => v.toLocaleString();

  return (
    <div className="monopoly-page">
      <div className="monopoly-container">
        <div className="mp-header">
          <h2 className="mp-title">📈 Monopoly Stock Market</h2>
          <span className={getBadgeClass() || 'mp-badge'}>{getBadgeText()}</span>
        </div>

        <div className="mp-table-wrapper">
          <table className="mp-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Company</th>
                <th>Stock</th>
                <th>Price</th>
                <th>Change</th>
                <th>Vol</th>
              </tr>
            </thead>
            <tbody>
              {sortedStocks.map((stock, index) => {
                const rank = index + 1;
                const company = getCompany(stock.companyId);
                const isActive = activeCompanyId === stock.companyId;
                const rowClass = isActive ? (lastAction === 'buy' ? 'mp-row-win' : 'mp-row-lose') : '';
                const rankClass = `mp-rank${rank === 1 ? ' mp-rank-1' : ''}`;
                const rankDisplay = rank === 1 ? '👑' : rank;

                let changeHtml = '';
                if (stock.lastAction === 'buy') {
                  changeHtml = `<span class="up">▲ +${stock.lastDelta}</span>`;
                } else if (stock.lastAction === 'sell') {
                  changeHtml = `<span class="down">▼ -${stock.lastDelta}</span>`;
                } else {
                  changeHtml = `<span class="neutral">--</span>`;
                }

                return (
                  <tr key={stock.id} className={rowClass}>
                    <td className={rankClass}>{rankDisplay}</td>
                    <td className="mp-company-name" style={{ color: company?.color || '#888' }}>
                      ● {company?.name || 'Unknown'}
                    </td>
                    <td className="mp-stock-name">{stock.name}</td>
                    <td className="mp-price">{stock.price}</td>
                    <td className="mp-change" dangerouslySetInnerHTML={{ __html: changeHtml }} />
                    <td className="mp-volume">{formatVolume(stock.volume)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
