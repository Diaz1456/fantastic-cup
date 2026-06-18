import Battlefield from './Battlefield';
import TankDisplay from './TankDisplay';
import VictoryScreen from './VictoryScreen';

interface Props {
  socket: any;
}

export default function ModuleTankWarfare({ socket }: Props) {
  const state = socket.gameState;
  if (!state) return null;

  const battle = state.tankBattle;
  const tanks = battle?.tanks || [];
  const victoryData = socket.victoryData;
  const phase = battle?.phase || 'idle';

  if (phase === 'victory' && victoryData) {
    return (
      <div className="tank-warfare-module victory">
        <VictoryScreen winner={victoryData.winner} rankings={victoryData.rankings} />
      </div>
    );
  }

  return (
    <div className={`tank-warfare-module phase-${phase}`}>
      <div className="tw-header">
        <h2 className="tw-title">TANK WARFARE</h2>
        <div className="tw-status">
          {phase === 'idle' && <span className="status-standby">STANDING BY</span>}
          {phase === 'battle' && <span className="status-battle">⚔ BATTLE IN PROGRESS</span>}
        </div>
      </div>

      <Battlefield
        tanks={tanks}
        tankUnderAttack={socket.tankUnderAttack}
        lastElimination={socket.lastElimination}
        phase={phase}
      />

      <div className="tanks-status-row">
        {tanks.map((tank: any) => (
          <TankDisplay
            key={tank.id}
            tank={tank}
            underAttack={socket.tankUnderAttack === tank.id}
            justEliminated={socket.lastElimination?.tankId === tank.id}
            isWinner={victoryData?.winner?.id === tank.id}
          />
        ))}
      </div>
    </div>
  );
}
