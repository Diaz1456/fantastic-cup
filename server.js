require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const { User, Category, Achievement, Feedback, PlayerNote, Event, CoinTransaction, connectDB } = require('./db');
const { EventBridge } = require('./eventBridge');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
const eventBridge = new EventBridge();

let mongoReady = false;

// Broadcast state through Socket.IO when bridge changes
eventBridge.on((state) => {
  const { _timerRemaining, _timerDisplay, ...clean } = state;
  io.emit('stateSync', clean);
});

// Emit timer ticks separately
eventBridge.on((state) => {
  if (state._timerRemaining !== undefined) {
    io.emit('timerTick', state._timerRemaining, state._timerDisplay || '');
  }
});

const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/fantastic-cup';
const DATA_FILE = path.join(__dirname, 'data.json');

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

const DEFAULT_USERS = [
  { username: 'admin', password: 'admin123', role: 'admin', enabled: true },
  { username: 'player1', password: 'pass123', role: 'player', enabled: true },
  { username: 'player2', password: 'pass123', role: 'player', enabled: true },
  { username: 'player3', password: 'pass123', role: 'player', enabled: true },
];

const DEFAULT_CATEGORIES = [
  { id: 'cat_goals', title: 'Goals' },
  { id: 'cat_assists', title: 'Assists' },
  { id: 'cat_points', title: 'Points' },
];

function generateId() {
  return 'cat_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
}

// ---- Migrate existing data.json to MongoDB ----

async function migrateFromFile() {
  const count = await User.countDocuments();
  if (count > 0) return;
  try {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));

    if (data.users && data.users.length > 0) {
      await User.insertMany(data.users);
    } else {
      await User.insertMany(DEFAULT_USERS);
    }

    if (data.achievementCategories && data.achievementCategories.length > 0) {
      await Category.insertMany(data.achievementCategories);
    } else {
      await Category.insertMany(DEFAULT_CATEGORIES);
    }

    if (data.achievements) {
      const docs = Object.entries(data.achievements).map(([playerUsername, values]) => ({
        playerUsername,
        values,
      }));
      if (docs.length > 0) await Achievement.insertMany(docs);
    }

    if (data.feedback && data.feedback.length > 0) {
      await Feedback.insertMany(data.feedback);
    }

    if (data.playerNotes) {
      const notes = Object.entries(data.playerNotes).map(([username, text]) => ({
        username,
        notes: text,
      }));
      if (notes.length > 0) await PlayerNote.insertMany(notes);
    }

    console.log('Migrated data from data.json');
  } catch {
    await User.insertMany(DEFAULT_USERS);
    await Category.insertMany(DEFAULT_CATEGORIES);
  }
}

// ---- Helpers ----

async function buildLeaderboard() {
  const [players, categories, achievements] = await Promise.all([
    User.find({ role: 'player', enabled: { $ne: false } }).lean(),
    Category.find().lean(),
    Achievement.find().lean(),
  ]);

  const achMap = {};
  achievements.forEach(a => { achMap[a.playerUsername] = a.values || {}; });

  const ranked = players.map(p => {
    const ach = achMap[p.username] || {};
    let total = 0;
    categories.forEach(cat => {
      total += Number(ach[cat.id]) || 0;
    });
    return { username: p.username, total, achievements: ach };
  });

  ranked.sort((a, b) => b.total - a.total);
  return ranked.slice(0, 15);
}

// ---- Routes ----

app.post('/login', async (req, res) => {
  const { username, password, role } = req.body;
  const user = await User.findOne({ username, password, role, enabled: { $ne: false } }).lean();
  if (!user) {
    return res.json({ success: false, message: 'Invalid credentials or user disabled.' });
  }
  res.json({ success: true, user: { username: user.username, role: user.role } });
});

app.get('/players', async (req, res) => {
  const players = await User.find({ role: 'player' }).lean();
  res.json({ players: players.map(p => ({ username: p.username, enabled: p.enabled !== false })) });
});

app.post('/add-player', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.json({ success: false, message: 'Username and password required.' });
    }

    const existing = await User.findOne({ username });
    if (existing) {
      return res.json({ success: false, message: 'Username already exists.' });
    }

    await User.create({ username, password, role: 'player', enabled: true });

    const categories = await Category.find().lean();
    const values = {};
    categories.forEach(cat => { values[cat.id] = 0; });
    await Achievement.create({ playerUsername: username, values });

    res.json({ success: true });
  } catch { res.json({ success: false, message: 'Something went wrong.' }); }
});

app.delete('/player/:username', async (req, res) => {
  const result = await User.deleteOne({ username: req.params.username, role: 'player' });
  if (result.deletedCount === 0) return res.json({ success: false, message: 'Player not found.' });

  await Achievement.deleteOne({ playerUsername: req.params.username });
  await PlayerNote.deleteOne({ username: req.params.username });
  res.json({ success: true });
});

app.post('/toggle-player', async (req, res) => {
  const { username } = req.body;
  const user = await User.findOne({ username, role: 'player' });
  if (!user) return res.json({ success: false, message: 'Player not found.' });

  user.enabled = !(user.enabled === false);
  await user.save();
  res.json({ success: true, enabled: user.enabled });
});

app.get('/player-notes', async (req, res) => {
  const notes = await PlayerNote.find().lean();
  const result = {};
  notes.forEach(n => { result[n.username] = n.notes; });
  res.json({ notes: result });
});

app.post('/player-notes', async (req, res) => {
  const { username, notes } = req.body;
  if (!username) return res.json({ success: false, message: 'Username required.' });

  await PlayerNote.findOneAndUpdate(
    { username },
    { username, notes: notes || '' },
    { upsert: true }
  );
  res.json({ success: true });
});

app.get('/achievement-categories', async (req, res) => {
  const categories = await Category.find().lean();
  res.json({ categories });
});

app.post('/achievement-category', async (req, res) => {
  const { title, id } = req.body;

  if (id) {
    const cat = await Category.findOneAndUpdate(
      { id },
      { title },
      { new: true }
    ).lean();
    if (cat) return res.json({ success: true, category: cat });
  }

  const newId = id || generateId();
  const newCat = await Category.create({ id: newId, title: title || 'New Category' });

  const players = await Achievement.find().lean();
  for (const player of players) {
    player.values[newId] = 0;
    await Achievement.updateOne({ playerUsername: player.playerUsername }, { values: player.values });
  }

  res.json({ success: true, category: newCat.toObject() });
});

app.delete('/achievement-category/:id', async (req, res) => {
  const result = await Category.deleteOne({ id: req.params.id });
  if (result.deletedCount === 0) return res.json({ success: false, message: 'Category not found.' });

  const players = await Achievement.find().lean();
  for (const player of players) {
    delete player.values[req.params.id];
    await Achievement.updateOne({ playerUsername: player.playerUsername }, { values: player.values });
  }

  res.json({ success: true });
});

app.get('/achievements/:player', async (req, res) => {
  const [achievement, categories] = await Promise.all([
    Achievement.findOne({ playerUsername: req.params.player }).lean(),
    Category.find().lean(),
  ]);
  res.json({ achievements: achievement?.values || {}, categories });
});

app.post('/update-achievement', async (req, res) => {
  const { playerUsername, categoryId, value } = req.body;

  await Achievement.findOneAndUpdate(
    { playerUsername },
    { $set: { [`values.${categoryId}`]: Number(value) || 0 } },
    { upsert: true }
  );

  const leaderboard = await buildLeaderboard();
  res.json({ success: true, leaderboard });
});

app.get('/leaderboard', async (req, res) => {
  const [leaderboard, categories] = await Promise.all([
    buildLeaderboard(),
    Category.find().lean(),
  ]);
  res.json({ leaderboard, categories });
});

app.post('/feedback', async (req, res) => {
  const { player, message } = req.body;
  if (!player || !message) return res.json({ success: false, message: 'Missing fields.' });

  await Feedback.create({
    id: 'fb_' + Date.now(),
    player,
    message,
    timestamp: Date.now(),
  });
  res.json({ success: true });
});

app.get('/feedbacks', async (req, res) => {
  const feedbacks = await Feedback.find().sort({ timestamp: -1 }).lean();
  res.json({ feedbacks });
});

app.get('/leaderboard/csv', async (req, res) => {
  const [leaderboard, categories] = await Promise.all([
    buildLeaderboard(),
    Category.find().lean(),
  ]);

  let csv = 'Rank,Player,';
  categories.forEach(c => { csv += c.title + ','; });
  csv += 'Total Score\n';

  leaderboard.forEach((entry, i) => {
    csv += `${i + 1},${entry.username},`;
    categories.forEach(c => {
      csv += `${Number(entry.achievements[c.id]) || 0},`;
    });
    csv += `${entry.total}\n`;
  });

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=leaderboard.csv');
  res.send(csv);
});

// ═══════════════════════════════════════════════
// SPECIAL EVENT ROUTES
// ═══════════════════════════════════════════════

const adminOnly = async (req, res, next) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(401).json({ error: 'Auth required' });
  const user = await User.findOne({ username, password, role: 'admin' }).lean();
  if (!user) return res.status(403).json({ error: 'Admin only' });
  req.adminUser = user;
  next();
};

// Get all events
app.get('/api/events', async (req, res) => {
  const events = await Event.find().sort({ createdAt: -1 }).lean();
  res.json({ events });
});

// Create event
app.post('/api/events', async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.json({ success: false, message: 'Name required' });
    const event = await Event.create({ name, description });
    io.emit('events:update');
    res.json({ success: true, event: event.toObject() });
  } catch { res.json({ success: false, message: 'Failed to create event' }); }
});

// Update event
app.put('/api/events/:id', async (req, res) => {
  try {
    const { name, description, active } = req.body;
    const event = await Event.findByIdAndUpdate(
      req.params.id,
      { name, description, active },
      { new: true }
    ).lean();
    if (!event) return res.json({ success: false, message: 'Not found' });
    io.emit('events:update');
    res.json({ success: true, event });
  } catch { res.json({ success: false, message: 'Failed to update' }); }
});

// Delete event
app.delete('/api/events/:id', async (req, res) => {
  await Event.findByIdAndDelete(req.params.id);
  io.emit('events:update');
  res.json({ success: true });
});

// Add category to event
app.post('/api/events/:id/categories', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.json({ success: false, message: 'Name required' });
    const event = await Event.findById(req.params.id);
    if (!event) return res.json({ success: false, message: 'Event not found' });
    event.categories.push({ name, teams: [] });
    await event.save();
    io.emit('events:update');
    res.json({ success: true, event: event.toObject() });
  } catch { res.json({ success: false, message: 'Failed' }); }
});

// Delete category from event
app.delete('/api/events/:id/categories/:catIdx', async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.json({ success: false, message: 'Not found' });
    event.categories.splice(parseInt(req.params.catIdx), 1);
    await event.save();
    io.emit('events:update');
    res.json({ success: true, event: event.toObject() });
  } catch { res.json({ success: false, message: 'Failed' }); }
});

// Add team to category
app.post('/api/events/:id/categories/:catIdx/teams', async (req, res) => {
  try {
    const { name, logo } = req.body;
    if (!name) return res.json({ success: false, message: 'Name required' });
    const event = await Event.findById(req.params.id);
    if (!event) return res.json({ success: false, message: 'Not found' });
    const cat = event.categories[parseInt(req.params.catIdx)];
    if (!cat) return res.json({ success: false, message: 'Category not found' });
    cat.teams.push({ name, logo: logo || '🏆', score: 0 });
    await event.save();
    io.emit('events:update');
    res.json({ success: true, event: event.toObject() });
  } catch { res.json({ success: false, message: 'Failed' }); }
});

// Update team
app.put('/api/events/:id/categories/:catIdx/teams/:teamIdx', async (req, res) => {
  try {
    const { name, logo, score } = req.body;
    const event = await Event.findById(req.params.id);
    if (!event) return res.json({ success: false, message: 'Not found' });
    const cat = event.categories[parseInt(req.params.catIdx)];
    if (!cat) return res.json({ success: false, message: 'Category not found' });
    const team = cat.teams[parseInt(req.params.teamIdx)];
    if (!team) return res.json({ success: false, message: 'Team not found' });
    if (name !== undefined) team.name = name;
    if (logo !== undefined) team.logo = logo;
    if (score !== undefined) team.score = Number(score);
    await event.save();
    io.emit('events:update');
    io.emit('leaderboard:update', { eventId: req.params.id });
    res.json({ success: true, event: event.toObject() });
  } catch { res.json({ success: false, message: 'Failed' }); }
});

// Delete team
app.delete('/api/events/:id/categories/:catIdx/teams/:teamIdx', async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.json({ success: false, message: 'Not found' });
    const cat = event.categories[parseInt(req.params.catIdx)];
    if (!cat) return res.json({ success: false, message: 'Category not found' });
    cat.teams.splice(parseInt(req.params.teamIdx), 1);
    await event.save();
    io.emit('events:update');
    res.json({ success: true, event: event.toObject() });
  } catch { res.json({ success: false, message: 'Failed' }); }
});

// Timer: set deadline
app.put('/api/events/:id/timer', async (req, res) => {
  try {
    const { deadline, timerPaused, surpriseMode } = req.body;
    const event = await Event.findById(req.params.id);
    if (!event) return res.json({ success: false, message: 'Not found' });
    if (deadline !== undefined) event.deadline = new Date(deadline);
    if (timerPaused !== undefined) event.timerPaused = timerPaused;
    if (surpriseMode !== undefined) event.surpriseMode = surpriseMode;
    await event.save();
    io.emit('timer:sync', {
      eventId: event._id.toString(),
      deadline: event.deadline?.getTime() || null,
      timerPaused: event.timerPaused,
      surpriseMode: event.surpriseMode,
    });
    res.json({ success: true, event: event.toObject() });
  } catch { res.json({ success: false, message: 'Failed' }); }
});

// Get top-3 teams across all categories
app.get('/api/events/:id/top3', async (req, res) => {
  try {
    const event = await Event.findById(req.params.id).lean();
    if (!event) return res.json({ top3: [] });
    const allTeams = [];
    event.categories.forEach(cat => {
      cat.teams.forEach(team => {
        allTeams.push({ ...team, category: cat.name });
      });
    });
    allTeams.sort((a, b) => b.score - a.score);
    res.json({ top3: allTeams.slice(0, 3), all: allTeams, event });
  } catch { res.json({ top3: [] }); }
});

// ═══════════════════════════════════════════════
// COIN ROUTES
// ═══════════════════════════════════════════════

// Award coins
app.post('/api/coins/award', async (req, res) => {
  try {
    const { playerUsername, amount, note, stamp } = req.body;
    if (!playerUsername || !amount) return res.json({ success: false, message: 'Player and amount required' });
    const tx = await CoinTransaction.create({
      playerUsername,
      amount: Number(amount),
      note: note || '',
      stamp: stamp || '⭐',
      timestamp: Date.now(),
    });
    const balance = await CoinTransaction.aggregate([
      { $match: { playerUsername } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const total = balance.length > 0 ? balance[0].total : 0;
    io.emit('coins:awarded', { playerUsername, amount: Number(amount), note, stamp: stamp || '⭐', balance: total });
    res.json({ success: true, transaction: tx.toObject(), balance: total });
  } catch { res.json({ success: false, message: 'Failed' }); }
});

// Get coin balance
app.get('/api/coins/balance/:username', async (req, res) => {
  try {
    const balance = await CoinTransaction.aggregate([
      { $match: { playerUsername: req.params.username } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    res.json({ balance: balance.length > 0 ? balance[0].total : 0 });
  } catch { res.json({ balance: 0 }); }
});

// Get coin history
app.get('/api/coins/history/:username', async (req, res) => {
  try {
    const txs = await CoinTransaction.find({ playerUsername: req.params.username })
      .sort({ timestamp: -1 }).limit(50).lean();
    res.json({ transactions: txs });
  } catch { res.json({ transactions: [] }); }
});

// Get all coin balances (admin)
app.get('/api/coins/leaderboard', async (req, res) => {
  try {
    const balances = await CoinTransaction.aggregate([
      { $group: { _id: '$playerUsername', total: { $sum: '$amount' } } },
      { $sort: { total: -1 } },
    ]);
    res.json({ balances });
  } catch { res.json({ balances: [] }); }
});

// ═══════════════════════════════════════════════
// SOCKET.IO
// ═══════════════════════════════════════════════

io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);

  socket.on('join:event', (eventId) => {
    socket.join(`event:${eventId}`);
  });

  socket.on('leave:event', (eventId) => {
    socket.leave(`event:${eventId}`);
  });

  // ─── EVENT BRIDGE SOCKET HANDLERS ───

  socket.emit('stateSync', eventBridge.getState());

  socket.on('join', () => {
    socket.emit('stateSync', eventBridge.getState());
  });

  socket.on('adminLogin', (password) => {
    if (password !== 'commander48') {
      return socket.emit('error', 'Invalid admin password');
    }
    socket.emit('stateSync', { ...eventBridge.getState(), adminToken: 'granted' });
  });

  socket.on('adminSetTimer', (data) => {
    eventBridge.setTimer(data.deadline, data.mysteryMode);
  });

  socket.on('adminPauseTimer', () => eventBridge.pauseTimer());
  socket.on('adminResumeTimer', () => eventBridge.resumeTimer());
  socket.on('adminResetTimer', () => eventBridge.resetTimer());
  socket.on('adminExtendTimer', (s) => eventBridge.extendTimer(s));

  socket.on('adminSwitchModule', (mod) => {
    eventBridge.setActiveModule(mod);
    io.emit('moduleChange', mod);
    if (eventBridge.state.phase === 'standby') {
      eventBridge.setPhase('active');
      io.emit('phaseChange', 'active');
    }
  });

  socket.on('adminUpdateTeams', (teams) => {
    eventBridge.updateTeams(teams);
    io.emit('teamsUpdate', eventBridge.getState().teams);
  });

  socket.on('adminAwardCoin', (data) => {
    const result = eventBridge.awardCoin(data);
    io.emit('coinAwarded', result.tx, result.newBalance);
  });

  socket.on('adminStartBattle', () => {
    eventBridge.startBattle();
    io.emit('battleStarted', Date.now());
  });

  socket.on('adminEliminateTank', (tankId) => {
    const state = eventBridge.state;
    if (state.tankBattle.phase !== 'battle') return socket.emit('error', 'Battle not started');
    const now = Date.now();
    if (state.tankBattle.lastEliminationAt && (now - state.tankBattle.lastEliminationAt) < state.tankBattle.eliminationCooldown) {
      return socket.emit('error', `Cooldown: ${Math.ceil((state.tankBattle.eliminationCooldown - (now - state.tankBattle.lastEliminationAt)) / 1000)}s`);
    }
    eventBridge.setTankUnderAttack(tankId);
    io.emit('tankUnderAttack', tankId);
    setTimeout(() => {
      const eliminated = eventBridge.eliminateTank(tankId);
      if (eliminated) {
        io.emit('tankEliminated', tankId, eliminated.rank);
        if (eventBridge.state.tankBattle.phase === 'victory') {
          const winner = eventBridge.state.tankBattle.tanks.find(t => t.status === 'victorious');
          const rankings = eventBridge.getTanksSortedByRank();
          io.emit('battleVictory', winner, rankings);
        }
      }
    }, 2000);
  });

  socket.on('adminResetBattle', () => eventBridge.resetTankBattle());

  // ─── END EVENT BRIDGE ───

  socket.on('disconnect', () => {
    console.log('Socket disconnected:', socket.id);
  });
});

// Periodically sync timer state for active events (MongoDB only)
const timerSyncInterval = setInterval(async () => {
  try {
    if (typeof Event === 'undefined') return;
    const activeEvents = await Event.find({ active: true }).lean();
    activeEvents.forEach(ev => {
      io.emit('timer:sync', {
        eventId: ev._id.toString(),
        deadline: ev.deadline?.getTime() || null,
        timerPaused: ev.timerPaused,
        surpriseMode: ev.surpriseMode,
      });
    });
  } catch {}
}, 1000);

// ═══════════════════════════════════════════════

// ─── EVENT BRIDGE REST ROUTES ───
app.get('/api/event-bridge/state', (req, res) => res.json(eventBridge.getState()));

app.post('/api/event-bridge/admin/login', (req, res) => {
  const { password } = req.body;
  if (password !== 'commander48') return res.status(401).json({ error: 'Invalid password' });
  res.json({ token: 'granted' });
});

// Serve the new React Event Section
const eventDist = path.join(__dirname, 'client', 'dist');
app.use('/event', express.static(eventDist));
app.get('/event/*', (req, res) => {
  res.sendFile(path.join(eventDist, 'index.html'));
});

// ─── END EVENT BRIDGE ───

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ---- Start ----

async function start() {
  // Try MongoDB with a short timeout (so legacy features work)
  const mongoConnected = await Promise.race([
    connectDB(MONGO_URI).then(() => true).catch(() => false),
    new Promise(resolve => setTimeout(() => resolve(false), 5000)),
  ]);

  if (mongoConnected) {
    console.log('✓ MongoDB connected');
    migrateFromFile().catch(() => {});
  } else {
    console.log('ℹ MongoDB not available — legacy data features disabled, event section works');
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`✓ Server running on http://0.0.0.0:${PORT}`);
    console.log(`  → Legacy UI:  http://0.0.0.0:${PORT}/`);
    console.log(`  → Event UI:   http://0.0.0.0:${PORT}/event/`);
    console.log(`  → Admin pass: commander42`);
  });
}

start();
