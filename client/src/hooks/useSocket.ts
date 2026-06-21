import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { ServerToClientEvents, ClientToServerEvents, ShowdownState, RankChangeEvent } from '../types';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || '';

export function useSocket() {
  const socketRef = useRef<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);
  const [connected, setConnected] = useState(false);
  const [showdownState, setShowdownState] = useState<ShowdownState | null>(null);
  const [rankChange, setRankChange] = useState<RankChangeEvent | null>(null);
  const [adminGranted, setAdminGranted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
    socketRef.current = socket as any;

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socket.on('showdownUpdate', (state) => {
      setShowdownState(state);
    });

    socket.on('showdownRankChange', (event) => {
      setRankChange(event);
      setTimeout(() => setRankChange(null), 3000);
    });

    socket.on('showdown:adminGranted', () => setAdminGranted(true));

    socket.on('error', (msg) => {
      setError(msg);
      setTimeout(() => setError(null), 5000);
    });

    socket.emit('showdown:join');

    return () => { socket.disconnect(); };
  }, []);

  const adminLogin = useCallback((pw: string) => socketRef.current?.emit('showdown:adminLogin', pw), []);
  const setValue = useCallback((data: { teamId: string; value: number }) => {
    socketRef.current?.emit('showdown:setValue', data);
  }, []);
  const toggleSimulation = useCallback(() => socketRef.current?.emit('showdown:toggleSimulation'), []);
  const reset = useCallback(() => socketRef.current?.emit('showdown:reset'), []);

  return {
    connected, showdownState, rankChange, adminGranted, error,
    adminLogin, setValue, toggleSimulation, reset,
  };
}
