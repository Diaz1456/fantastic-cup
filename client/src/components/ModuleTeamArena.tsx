import { useSound } from '../hooks/useSound';

interface Props {
  socket: any;
}

const QUICK_REWARDS = [
  { label: 'Top Performer', amount: 100, emoji: '🔥' },
  { label: 'Clutch Play', amount: 50, emoji: '⭐' },
  { label: 'Sportsmanship', amount: 25, emoji: '🤝' },
];

export default function ModuleTeamArena({ socket }: Props) {
  const state = socket.gameState;
  const teams = socket.teams || state?.teams || [];
  const coinNotification = socket.coinNotification;

  return (
    <div className="team-arena">
      <div className="arena-header">
        <h2 className="arena-title">TEAM ARENA</h2>
      </div>

      <div className="arena-content">
        <div className="teams-row">
          {teams.map((team: any, i: number) => (
            <div
              key={team.id}
              className={`team-card rank-${team.rank}`}
              style={{ borderColor: team.color, '--team-color': team.color } as React.CSSProperties}
            >
              <div className="team-rank-badge">#{team.rank}</div>
              <div className="team-logo">{team.logo}</div>
              <div className="team-name" style={{ color: team.color }}>{team.name}</div>
              <div className="team-points">{team.points.toLocaleString()} pts</div>
              <div className="team-bar">
                <div className="team-bar-fill" style={{ width: `${Math.min(100, (team.points / Math.max(1, ...teams.map((t: any) => t.points))) * 100)}%`, background: team.color }} />
              </div>
            </div>
          ))}
        </div>

        {teams.length > 0 && (
          <div className="leaderboard-section">
            <TeamLeaderboard teams={teams} />
          </div>
        )}
      </div>

      {coinNotification && (
        <div className="coin-notification">
          <div className="coin-icon">
            <span className="coin-emoji">{coinNotification.tx.emoji}</span>
          </div>
          <div className="coin-details">
            <div className="coin-amount">+{coinNotification.tx.amount} coins</div>
            <div className="coin-reason">{coinNotification.tx.reason}</div>
            <div className="coin-player">{coinNotification.tx.playerName}</div>
          </div>
          <div className="coin-balance-update">Balance: {coinNotification.balance}</div>
        </div>
      )}
    </div>
  );
}

function TeamLeaderboard({ teams }: { teams: any[] }) {
  const sorted = [...teams].sort((a, b) => b.points - a.points);

  return (
    <div className="leaderboard-podium">
      <h3 className="podium-title">TOP TEAMS</h3>
      <div className="podium-container">
        {sorted.slice(0, 3).map((team, i) => {
          const height = i === 0 ? 200 : i === 1 ? 150 : 120;
          return (
            <div
              key={team.id}
              className={`podium-item rank-${i + 1}`}
              style={{ animationDelay: `${i * 0.2}s` }}
            >
              <div className="podium-icon" style={{ borderColor: team.color }}>
                <span className="podium-emoji">{team.logo}</span>
              </div>
              <div className="podium-bar" style={{ height, '--bar-color': team.color } as React.CSSProperties}>
                <span className="podium-rank-num">#{i + 1}</span>
                <span className="podium-points">{team.points.toLocaleString()}</span>
              </div>
              <div className="podium-team-name" style={{ color: team.color }}>
                {team.name}
              </div>
            </div>
          );
        })}
      </div>
      {teams.length > 3 && (
        <div className="remaining-teams">
          {sorted.slice(3).map((team: any) => (
            <div key={team.id} className="remaining-team-row">
              <span className="remaining-rank">#{team.rank}</span>
              <span className="remaining-logo">{team.logo}</span>
              <span className="remaining-name" style={{ color: team.color }}>{team.name}</span>
              <span className="remaining-points">{team.points.toLocaleString()} pts</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
