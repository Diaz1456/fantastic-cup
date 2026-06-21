import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { ServerToClientEvents, ClientToServerEvents, StockMarketState, PriceChange } from '../types';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || '';

export function useSocket() {
  const socketRef = useRef<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);
  const [connected, setConnected] = useState(false);
  const [marketState, setMarketState] = useState<StockMarketState | null>(null);
  const [priceChange, setPriceChange] = useState<PriceChange | null>(null);
  const [adminGranted, setAdminGranted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
    socketRef.current = socket as any;

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socket.on('stockMarketUpdate', (state) => {
      setMarketState(state);
    });

    socket.on('stockPriceChange', (change) => {
      setPriceChange(change);
      setTimeout(() => setPriceChange(null), 2000);
      if (marketState && change.history) {
        setMarketState(prev => prev ? {
          ...prev,
          prices: { ...prev.prices, [change.teamId]: change.price },
          history: { ...prev.history, [change.teamId]: change.history },
        } : prev);
      }
    });

    socket.on('stockPerformanceUpdated', (data) => {
      // Update the performance in local state
      setMarketState(prev => {
        if (!prev) return prev;
        const perf = { ...prev.playerPerformance };
        if (!perf[data.teamId]) perf[data.teamId] = {};
        perf[data.teamId] = { ...perf[data.teamId], [data.username]: data.score };
        return { ...prev, playerPerformance: perf };
      });
    });

    socket.on('stockMarket:adminGranted', () => setAdminGranted(true));

    socket.on('error', (msg) => {
      setError(msg);
      setTimeout(() => setError(null), 5000);
    });

    socket.emit('stockMarket:join');

    return () => { socket.disconnect(); };
  }, []);

  const adminLogin = useCallback((pw: string) => socketRef.current?.emit('stockMarket:adminLogin', pw), []);
  const updatePerformance = useCallback((data: { teamId: string; username: string; score: number }) => {
    socketRef.current?.emit('stockMarket:updatePerformance', data);
  }, []);
  const setSentiment = useCallback((data: { teamId: string; sentiment: number }) => {
    socketRef.current?.emit('stockMarket:setSentiment', data);
  }, []);
  const setFrozen = useCallback((data: { teamId: string; frozen: boolean }) => {
    socketRef.current?.emit('stockMarket:setFrozen', data);
  }, []);
  const resetPrices = useCallback(() => socketRef.current?.emit('stockMarket:resetPrices'), []);
  const spike = useCallback((data: { teamId: string; amount: number }) => {
    socketRef.current?.emit('stockMarket:spike', data);
  }, []);
  const updateConfig = useCallback((data: { multiplier?: number; baseValue?: number }) => {
    socketRef.current?.emit('stockMarket:updateConfig', data);
  }, []);

  return {
    connected, marketState, priceChange, adminGranted, error,
    adminLogin, updatePerformance, setSentiment, setFrozen,
    resetPrices, spike, updateConfig,
  };
}
