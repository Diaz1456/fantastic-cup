import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import path from 'path';

import { eventManager } from './gameState';
import {
  ServerToClientEvents,
  ClientToServerEvents,
  JWT_SECRET,
  ADMIN_PASSWORD,
  PORT,
} from './types';

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());

const io = new Server<ClientToServerEvents, ServerToClientEvents>(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

let timerInterval: NodeJS.Timeout | null = null;

function broadcastState() {
  io.emit('stateSync', eventManager.getState());
}

function broadcastTimerTick() {
  const remaining = eventManager.getRemainingTime();
  const state = eventManager.getState();

  if (state.timer.mysteryMode && remaining > 10000) {
    io.emit('timerTick', remaining, '? ? : ? ? : ? ? : ? ?');
    return;
  }

  const d = Math.floor(remaining / 86400000);
  const h = Math.floor((remaining % 86400000) / 3600000);
  const m = Math.floor((remaining % 3600000) / 60000);
  const s = Math.floor((remaining % 60000) / 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  const display = state.timer.mysteryMode && remaining > 10000
    ? '? ? : ? ? : ? ? : ? ?'
    : `${pad(d)} : ${pad(h)} : ${pad(m)} : ${pad(s)}`;

  io.emit('timerTick', remaining, display);

  if (remaining <= 0 && state.phase === 'countdown') {
    eventManager.setPhase('standby');
    io.emit('phaseChange', 'standby');
    broadcastState();
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
  }
}

function startTimer() {
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(broadcastTimerTick, 1000);
  broadcastTimerTick();
}

io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);
  socket.emit('stateSync', eventManager.getState());

  socket.on('join', () => socket.emit('stateSync', eventManager.getState()));

  socket.on('adminLogin', (password) => {
    if (password !== ADMIN_PASSWORD) {
      socket.emit('error', 'Invalid admin password');
      return;
    }
    const token = jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '24h' });
    socket.emit('stateSync', { ...eventManager.getState(), adminToken: token } as any);
  });

  socket.on('adminSetTimer', (data) => {
    eventManager.setTimer(data);
    broadcastState();
    startTimer();
  });

  socket.on('adminPauseTimer', () => {
    eventManager.pauseTimer();
    broadcastState();
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
    broadcastTimerTick();
  });

  socket.on('adminResumeTimer', () => {
    eventManager.resumeTimer();
    broadcastState();
    startTimer();
  });

  socket.on('adminResetTimer', () => {
    eventManager.resetTimer();
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
    broadcastState();
  });

  socket.on('adminExtendTimer', (seconds) => {
    eventManager.extendTimer(seconds);
    broadcastState();
    broadcastTimerTick();
  });

  socket.on('adminUpdateTeams', (teams) => {
    eventManager.updateTeams(teams);
    io.emit('teamsUpdate', eventManager.getState().teams);
    broadcastState();
  });

  socket.on('adminAwardCoin', (data) => {
    const { tx, newBalance } = eventManager.awardCoin(data);
    io.emit('coinAwarded', tx, newBalance);
    broadcastState();
  });

  // ─── SQUID GAME ─────────────────────────────────────────

  socket.on('adminStartSquidGame', () => {
    eventManager.startSquidGame();
    io.emit('squidGameStarted');
    broadcastState();
  });

  socket.on('adminResetSquidGame', () => {
    eventManager.resetSquidGame();
    io.emit('squidGameReset');
    broadcastState();
  });

  socket.on('adminAddSquidPlayer', (data) => {
    const player = eventManager.addSquidPlayer(data.username, data.avatarUrl);
    if (player) {
      io.emit('squidPlayerAdded', player);
      broadcastState();
    }
  });

  socket.on('adminRemoveSquidPlayer', (playerId) => {
    eventManager.removeSquidPlayer(playerId);
    io.emit('squidPlayerRemoved', playerId);
    broadcastState();
  });

  socket.on('adminEliminateSquidPlayer', (data) => {
    const state = eventManager.getState();
    if (state.squidGame.phase !== 'active') {
      socket.emit('error', 'Game not started');
      return;
    }

    eventManager.setSquidTarget(data.playerId);
    io.emit('squidPlayerTargeted', data.playerId);

    setTimeout(() => {
      const eliminated = eventManager.eliminateSquidPlayer(data.playerId, data.adminName);
      if (eliminated) {
        io.emit('squidPlayerEliminated', { player: eliminated, rank: data.rank || null });

        const gs = eventManager.getState().squidGame;
        if (gs.phase === 'victory') {
          const winner = eventManager.getSquidWinner();
          const remaining = eventManager.getAliveSquidPlayers();
          io.emit('squidGameVictory', { winner, remaining });
        }
        broadcastState();
      }
    }, 2500);
  });

  socket.on('disconnect', () => console.log(`Disconnected: ${socket.id}`));
});

app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  if (password !== ADMIN_PASSWORD) return res.status(401).json({ error: 'Invalid password' });
  const token = jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '24h' });
  res.json({ token });
});

app.get('/api/state', (_req, res) => res.json(eventManager.getState()));

const clientDist = path.join(__dirname, '../../client/dist');
app.use(express.static(clientDist));
app.get('*', (_req, res) => res.sendFile(path.join(clientDist, 'index.html')));

server.listen(PORT, () => {
  console.log(`fantastic-cup server on port ${PORT}`);
  startTimer();
});
