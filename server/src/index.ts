import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server } from 'socket.io';
import path from 'path';

import { EventStateManager } from './gameState';
import { ADMIN_PASSWORD, PORT } from './types';

const app = express();
const server = http.createServer(app);
const eventManager = new EventStateManager();

app.use(cors());
app.use(express.json());

const io = new Server(server, { cors: { origin: '*', methods: ['GET', 'POST'] } });

let timerInterval: NodeJS.Timeout | null = null;

function broadcastState() {
  io.emit('stateSync', eventManager.getState());
}

function broadcastTimerTick() {
  const remaining = eventManager.getRemaining();
  const state = eventManager.getState();

  const h = Math.floor(remaining / 3600000);
  const m = Math.floor((remaining % 3600000) / 60000);
  const s = Math.floor((remaining % 60000) / 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  const display = state.timer.mysteryMode && remaining > 10000
    ? '? ? : ? ? : ? ?'
    : `${pad(h)}:${pad(m)}:${pad(s)}`;

  io.emit('timerTick', remaining, display);

  if (remaining <= 0) {
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
  }
}

function startTimer() {
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(broadcastTimerTick, 1000);
  broadcastTimerTick();
}

io.on('connection', (socket) => {
  socket.emit('stateSync', eventManager.getState());

  socket.on('join', () => socket.emit('stateSync', eventManager.getState()));

  socket.on('adminLogin', (password) => {
    if (password !== ADMIN_PASSWORD) {
      socket.emit('error', 'Invalid admin password');
      return;
    }
    socket.emit('stateSync', { ...eventManager.getState(), adminToken: 'granted' } as any);
  });

  socket.on('adminSetTimer', (data: { deadline: number; mysteryMode: boolean }) => {
    eventManager.setTimer(data.deadline, data.mysteryMode);
    broadcastState();
    startTimer();
  });

  socket.on('adminPauseTimer', () => {
    eventManager.pauseTimer();
    broadcastState();
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
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

  socket.on('adminExtendTimer', (seconds: number) => {
    eventManager.extendTimer(seconds);
  });

  socket.on('disconnect', () => {});
});

app.get('/api/state', (_req, res) => res.json(eventManager.getState()));

const clientDist = path.join(__dirname, '../../client/dist');
app.use(express.static(clientDist));
app.get('*', (_req, res) => res.sendFile(path.join(clientDist, 'index.html')));

server.listen(PORT, () => {
  startTimer();
});
