import { useState, useMemo } from 'react';
import type { MonopolyState, MonopolyStock } from '../types';

interface Props {
  socket: any;
  onBack: () => void;
}

export default function MonopolyAdmin({ socket, onBack }: Props) {
  const state: MonopolyState | null = socket.monopolyState;
  const [stockEdits, setStockEdits] = useState<Record<string, { name?: string; price?: string; volume?: string }>>({});
  const [companyEdits, setCompanyEdits] = useState<Record<string, { name?: string; color?: string }>>({});

  const sortedStocks = useMemo(() => {
    if (!state) return [];
    return [...state.stocks].sort((a, b) => b.price - a.price);
  }, [state?.stocks]);

  if (!state) {
    return (
      <div className="mp-admin-panel">
        <div className="mp-admin-header">
          <h1 className="mp-admin-title">📈 MONOPOLY — ADMIN DESK</h1>
          <button className="mp-admin-back" onClick={onBack}>EXIT</button>
        </div>
        <p style={{ color: '#6e8bb8', textAlign: 'center', padding: '40px' }}>Loading state...</p>
      </div>
    );
  }

  const getCompany = (companyId: string) => state.companies.find(c => c.id === companyId);
  const activeCompanyId = state.lastTrade?.companyId || null;
  const lastAction = state.lastTrade?.action || null;

  const handleStockEdit = (stockId: string, field: string, value: string) => {
    setStockEdits(prev => ({
      ...prev,
      [stockId]: { ...(prev[stockId] || {}), [field]: value },
    }));
  };

  const submitStockEdit = (stockId: string) => {
    const edit = stockEdits[stockId];
    if (!edit) return;
    const data: { stockId: string; name?: string; price?: number; volume?: number } = { stockId };
    if (edit.name !== undefined) data.name = edit.name;
    if (edit.price !== undefined) data.price = Number(edit.price);
    if (edit.volume !== undefined) data.volume = Number(edit.volume);
    socket.updateStock(data);
  };

  const submitCompanyEdit = (companyId: string) => {
    const edit = companyEdits[companyId];
    if (!edit) return;
    const data: { companyId: string; name?: string; color?: string } = { companyId };
    if (edit.name !== undefined) data.name = edit.name;
    if (edit.color !== undefined) data.color = edit.color;
    socket.updateCompany(data);
  };

  const formatVolume = (v: number) => v.toLocaleString();

  return (
    <div className="mp-admin-panel">
      <div className="mp-admin-header">
        <h1 className="mp-admin-title">📈 MONOPOLY — ADMIN DESK</h1>
        <button className="mp-admin-back" onClick={onBack}>EXIT</button>
      </div>

      {/* Leaderboard Table */}
      <div className="mp-table-wrapper" style={{ marginBottom: 20 }}>
        <table className="mp-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Company</th>
              <th>Stock</th>
              <th>Price</th>
              <th>Change</th>
              <th>Vol</th>
              <th>Trade</th>
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
                  <td>
                    <div className="mp-actions">
                      <button className="mp-btn mp-btn-buy" onClick={() => socket.trade(stock.id, 'buy')}>Buy</button>
                      <button className="mp-btn mp-btn-sell" onClick={() => socket.trade(stock.id, 'sell')}>Sell</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Admin Edit Grid */}
      <div className="mp-admin-grid">
        {/* Company Editor */}
        {state.companies.map(company => (
          <div key={company.id} className="mp-admin-card" style={{ borderLeft: `4px solid ${company.color}` }}>
            <h3>● {company.name}</h3>
            <div className="mp-admin-row">
              <label>Name:</label>
              <input
                type="text"
                className="mp-admin-input"
                style={{ width: 140 }}
                value={companyEdits[company.id]?.name ?? ''}
                placeholder={company.name}
                onChange={e => setCompanyEdits(prev => ({ ...prev, [company.id]: { ...(prev[company.id] || {}), name: e.target.value } }))}
              />
              <button className="mp-admin-btn primary" onClick={() => submitCompanyEdit(company.id)}>SET</button>
            </div>
            <div className="mp-admin-row">
              <label>Color:</label>
              <input
                type="text"
                className="mp-admin-input"
                style={{ width: 100 }}
                value={companyEdits[company.id]?.color ?? ''}
                placeholder={company.color}
                onChange={e => setCompanyEdits(prev => ({ ...prev, [company.id]: { ...(prev[company.id] || {}), color: e.target.value } }))}
              />
              <button className="mp-admin-btn primary" onClick={() => submitCompanyEdit(company.id)}>SET</button>
            </div>
            <div style={{ fontSize: 10, color: '#6e8bb8', marginTop: 8 }}>
              Stocks: {state.stocks.filter(s => s.companyId === company.id).length}
            </div>
          </div>
        ))}

        {/* Per-Stock Editor */}
        {state.stocks.map(stock => (
          <div key={stock.id} className="mp-admin-card">
            <div className="mp-admin-stock-row">
              <span className="stock-label">{stock.name}</span>
              <span style={{ color: '#88a0c0', fontSize: 12, fontWeight: 'bold' }}>${stock.price}</span>
              <span style={{ color: '#6e8bb8', fontSize: 11 }}>Vol: {stock.volume}</span>
            </div>
            <div className="mp-admin-row">
              <label>Name:</label>
              <input
                type="text"
                className="mp-admin-input"
                style={{ width: 90 }}
                value={stockEdits[stock.id]?.name ?? ''}
                placeholder={stock.name}
                onChange={e => handleStockEdit(stock.id, 'name', e.target.value)}
              />
            </div>
            <div className="mp-admin-row">
              <label>Price:</label>
              <input
                type="number"
                className="mp-admin-input"
                style={{ width: 80 }}
                value={stockEdits[stock.id]?.price ?? ''}
                placeholder={String(stock.price)}
                onChange={e => handleStockEdit(stock.id, 'price', e.target.value)}
              />
            </div>
            <div className="mp-admin-row">
              <label>Volume:</label>
              <input
                type="number"
                className="mp-admin-input"
                style={{ width: 80 }}
                value={stockEdits[stock.id]?.volume ?? ''}
                placeholder={String(stock.volume)}
                onChange={e => handleStockEdit(stock.id, 'volume', e.target.value)}
              />
            </div>
            <div className="mp-admin-row">
              <button className="mp-admin-btn primary" onClick={() => submitStockEdit(stock.id)}>UPDATE STOCK</button>
            </div>
          </div>
        ))}
      </div>

      {socket.error && <div className="mp-toast">{socket.error}</div>}
    </div>
  );
}
