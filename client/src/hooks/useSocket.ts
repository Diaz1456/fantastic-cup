import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { ServerToClientEvents, ClientToServerEvents, MonopolyState } from '../types';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || '';

export function useSocket() {
  const socketRef = useRef<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);
  const [connected, setConnected] = useState(false);
  const [monopolyState, setMonopolyState] = useState<MonopolyState | null>(null);
  const [adminGranted, setAdminGranted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
    socketRef.current = socket as any;

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socket.on('monopolyUpdate', (state) => {
      setMonopolyState(state);
    });

    socket.on('monopoly:adminGranted', () => setAdminGranted(true));

    socket.on('error', (msg) => {
      setError(msg);
      setTimeout(() => setError(null), 5000);
    });

    socket.emit('monopoly:join');

    return () => { socket.disconnect(); };
  }, []);

  const adminLogin = useCallback((pw: string) => socketRef.current?.emit('monopoly:adminLogin', pw), []);
  const trade = useCallback((stockId: string, action: string) => {
    socketRef.current?.emit('monopoly:trade', { stockId, action });
  }, []);
  const updateStock = useCallback((data: { stockId: string; name?: string; price?: number; volume?: number }) => {
    socketRef.current?.emit('monopoly:updateStock', data);
  }, []);
  const updateCompany = useCallback((data: { companyId: string; name?: string; color?: string }) => {
    socketRef.current?.emit('monopoly:updateCompany', data);
  }, []);

  return {
    connected, monopolyState, adminGranted, error,
    adminLogin, trade, updateStock, updateCompany,
  };
}
