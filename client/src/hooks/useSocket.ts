import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { EventState, ServerToClientEvents, ClientToServerEvents, SquidPlayer, Team, CoinTransaction } from '../types';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || '';

export function useSocket() {
  const socketRef = useRef<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);
  const [connected, setConnected] = useState(false);
  const [gameState, setGameState] = useState<EventState | null>(null);
  const [timerDisplay, setTimerDisplay] = useState<string>('');
  const [timerRemaining, setTimerRemaining] = useState<number>(0);
  const [teams, setTeams] = useState<Team[]>([]);
  const [squidTargeted, setSquidTargeted] = useState<string | null>(null);
  const [lastElimination, setLastElimination] = useState<{ player: SquidPlayer; rank: number | null } | null>(null);
  const [victoryData, setVictoryData] = useState<{ winner: SquidPlayer | null; remaining: SquidPlayer[] } | null>(null);
  const [coinNotification, setCoinNotification] = useState<{ tx: CoinTransaction; balance: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
    socketRef.current = socket as any;

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socket.on('stateSync', (state) => {
      setGameState(state);
      setTeams(state.teams);
      setVictoryData(null);
      setLastElimination(null);
      setSquidTargeted(null);
    });

    socket.on('timerTick', (remaining, display) => {
      setTimerRemaining(remaining);
      setTimerDisplay(display);
    });

    socket.on('teamsUpdate', (updated) => setTeams(updated));

    socket.on('coinAwarded', (tx, balance) => {
      setCoinNotification({ tx, balance });
      setTimeout(() => setCoinNotification(null), 4000);
    });

    socket.on('squidPlayerTargeted', (id) => setSquidTargeted(id));
    socket.on('squidPlayerEliminated', (data) => {
      setLastElimination(data);
      setSquidTargeted(null);
    });
    socket.on('squidGameVictory', (data) => setVictoryData(data));

    socket.on('error', (msg) => {
      setError(msg);
      setTimeout(() => setError(null), 5000);
    });

    socket.emit('join');

    return () => { socket.disconnect(); };
  }, []);

  const adminLogin = useCallback((pw: string) => socketRef.current?.emit('adminLogin', pw), []);
  const adminSetTimer = useCallback((deadline: number, mysteryMode: boolean) => socketRef.current?.emit('adminSetTimer', { deadline, mysteryMode }), []);
  const adminPauseTimer = useCallback(() => socketRef.current?.emit('adminPauseTimer'), []);
  const adminResumeTimer = useCallback(() => socketRef.current?.emit('adminResumeTimer'), []);
  const adminResetTimer = useCallback(() => socketRef.current?.emit('adminResetTimer'), []);
  const adminExtendTimer = useCallback((s: number) => socketRef.current?.emit('adminExtendTimer', s), []);
  const adminUpdateTeams = useCallback((t: Team[]) => socketRef.current?.emit('adminUpdateTeams', t), []);
  const adminAwardCoin = useCallback((d: any) => socketRef.current?.emit('adminAwardCoin', d), []);
  const adminStartSquidGame = useCallback(() => socketRef.current?.emit('adminStartSquidGame'), []);
  const adminResetSquidGame = useCallback(() => socketRef.current?.emit('adminResetSquidGame'), []);
  const adminAddSquidPlayer = useCallback((username: string, avatarUrl?: string) => socketRef.current?.emit('adminAddSquidPlayer', { username, avatarUrl }), []);
  const adminRemoveSquidPlayer = useCallback((playerId: string) => socketRef.current?.emit('adminRemoveSquidPlayer', playerId), []);
  const adminEliminateSquidPlayer = useCallback((playerId: string, adminName?: string) => socketRef.current?.emit('adminEliminateSquidPlayer', { playerId, adminName }), []);

  return {
    connected, gameState, teams, timerDisplay, timerRemaining,
    squidTargeted, lastElimination, victoryData, coinNotification, error,
    adminLogin, adminSetTimer, adminPauseTimer, adminResumeTimer,
    adminResetTimer, adminExtendTimer, adminUpdateTeams,
    adminAwardCoin, adminStartSquidGame, adminResetSquidGame,
    adminAddSquidPlayer, adminRemoveSquidPlayer, adminEliminateSquidPlayer,
  };
}
