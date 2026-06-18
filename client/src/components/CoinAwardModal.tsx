import { useState } from 'react';

interface Props {
  onAward: (data: { playerId: string; playerName: string; amount: number; reason: string; emoji: string }) => void;
}

const QUICK_REWARDS = [
  { label: 'Top Performer', amount: 100, emoji: '🔥' },
  { label: 'Clutch Play', amount: 50, emoji: '⭐' },
  { label: 'Sportsmanship', amount: 25, emoji: '🤝' },
];

export default function CoinAwardModal({ onAward }: Props) {
  const [playerId, setPlayerId] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [customAmount, setCustomAmount] = useState('');
  const [reason, setReason] = useState('');
  const [selectedQuick, setSelectedQuick] = useState<string | null>(null);

  const submitAward = (amount: number, emoji: string, label: string) => {
    if (!playerId.trim() || !playerName.trim()) return;
    onAward({
      playerId: playerId.trim(),
      playerName: playerName.trim(),
      amount,
      reason: reason.trim() || label,
      emoji,
    });
    setSelectedQuick(label);
    setTimeout(() => setSelectedQuick(null), 1500);
  };

  const handleCustom = () => {
    const amt = parseInt(customAmount);
    if (isNaN(amt) || amt <= 0) return;
    submitAward(amt, '🎯', 'Custom Award');
    setCustomAmount('');
  };

  return (
    <div className="coin-award-modal">
      <div className="coin-award-form">
        <div className="award-field">
          <label>Player ID</label>
          <input value={playerId} onChange={e => setPlayerId(e.target.value)} placeholder="Player ID..." className="award-input" />
        </div>
        <div className="award-field">
          <label>Player Name</label>
          <input value={playerName} onChange={e => setPlayerName(e.target.value)} placeholder="Player name..." className="award-input" />
        </div>
        <div className="award-field">
          <label>Reason (optional)</label>
          <input value={reason} onChange={e => setReason(e.target.value)} placeholder="Why?" className="award-input" />
        </div>

        <div className="quick-rewards">
          <label className="award-label">Quick Reward</label>
          <div className="quick-reward-buttons">
            {QUICK_REWARDS.map(q => (
              <button
                key={q.label}
                className={`quick-btn ${selectedQuick === q.label ? 'active' : ''}`}
                onClick={() => submitAward(q.amount, q.emoji, q.label)}
              >
                {q.emoji} {q.label} (+{q.amount})
              </button>
            ))}
          </div>
        </div>

        <div className="custom-award">
          <label className="award-label">Custom Amount</label>
          <div className="custom-row">
            <input
              type="number"
              value={customAmount}
              onChange={e => setCustomAmount(e.target.value)}
              placeholder="Amount"
              className="award-input small"
              min={1}
            />
            <button onClick={handleCustom} className="award-btn">AWARD</button>
          </div>
        </div>
      </div>
    </div>
  );
}
