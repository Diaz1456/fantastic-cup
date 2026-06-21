require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const { User, Category, Achievement, Feedback, PlayerNote, Event, CoinTransaction, DailyCompletion, DailyTaskConfig, Badge, BadgeAssignment, Team, connectDB } = require('./db');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// ─── TOP 3 TEAMS STOCK SHOWDOWN ───

let showdownState = {
  teams: [],           // { id, name, logo, color, members, stockValue, change, rank }
  baseValues: {},      // teamId -> admin-set base value
  simulationActive: true,
  interval: null,
  prevRanks: {},       // teamId -> previous rank for change detection
};

function syncShowdownTeams() {
  const allTeams = JSON.parse(JSON.stringify(teamsData.teams));
  for (const team of allTeams) {
    if (showdownState.baseValues[team.id] !== undefined) {
      team.stockValue = showdownState.baseValues[team.id];
    } else {
      team.stockValue = team.silverCoins || 0;
    }
  }
  allTeams.sort((a, b) => (b.stockValue || 0) - (a.stockValue || 0));
  const top3 = allTeams.slice(0, 3);
  const rankChanges = [];
  for (let i = 0; i < top3.length; i++) {
    const team = top3[i];
    const oldRank = showdownState.prevRanks[team.id];
    team.rank = i + 1;
    if (oldRank !== undefined && oldRank !== team.rank) {
      rankChanges.push({ teamId: team.id, name: team.name, logo: team.logo, fromRank: oldRank, toRank: team.rank });
    }
    showdownState.prevRanks[team.id] = team.rank;
  }
  showdownState.teams = top3;
  broadcastShowdown(rankChanges);
}

function broadcastShowdown(rankChanges) {
  const state = {
    teams: showdownState.teams.map(t => ({
      id: t.id, name: t.name, logo: t.logo, color: t.color,
      stockValue: t.stockValue, change: t._change || 0, rank: t.rank,
      members: t.members || [],
    })),
    baseValues: { ...showdownState.baseValues },
    simulationActive: showdownState.simulationActive,
  };
  io.emit('showdownUpdate', state);
  if (rankChanges && rankChanges.length > 0) {
    io.emit('showdownRankChange', { changes: rankChanges, teams: state.teams });
  }
}

function applyFluctuation() {
  if (!showdownState.simulationActive) return;
  if (showdownState.teams.length === 0) return;
  for (const team of showdownState.teams) {
    const fluctuation = (Math.random() * 10 - 5);
    const newValue = Math.max(0, team.stockValue + fluctuation);
    team._change = Math.round(fluctuation * 100) / 100;
    team.stockValue = Math.round(newValue * 100) / 100;
    if (showdownState.baseValues[team.id] !== undefined) {
      showdownState.baseValues[team.id] += fluctuation;
    }
  }
  syncShowdownTeams();
}

function startShowdownSimulation() {
  stopShowdownSimulation();
  showdownState.interval = setInterval(applyFluctuation, 3000);
}

function stopShowdownSimulation() {
  if (showdownState.interval) {
    clearInterval(showdownState.interval);
    showdownState.interval = null;
  }
}

// Initial sync after teams load
setTimeout(() => {
  syncShowdownTeams();
  startShowdownSimulation();
}, 1000);

let mongoReady = false;

function isMongoConnected() {
  try {
    const mongoose = require('mongoose');
    return mongoose.connection.readyState === 1;
  } catch { return false; }
}

// ─── COUNTDOWN TIMER (Admin Dashboard) ───
let countdownTimer = null;
let countdownDeadline = null;
let countdownPaused = false;
let countdownPausedRemaining = null;
let countdownMystery = false;

function startCountdownInterval() {
  stopCountdownInterval();
  countdownTimer = setInterval(() => {
    const remaining = getCountdownRemaining();
    const h = Math.floor(remaining / 3600000);
    const m = Math.floor((remaining % 3600000) / 60000);
    const s = Math.floor((remaining % 60000) / 1000);
    const pad = n => String(n).padStart(2, '0');
    const display = countdownMystery && remaining > 10000 ? '? ? : ? ? : ? ?' : `${pad(h)}:${pad(m)}:${pad(s)}`;
    io.emit('countdownTick', remaining);
    io.emit('timerTick', remaining, display);
    if (remaining <= 0) {
      io.emit('countdownStop');
      stopCountdownInterval();
    }
  }, 1000);
}

function stopCountdownInterval() {
  if (countdownTimer) { clearInterval(countdownTimer); countdownTimer = null; }
}

function getCountdownRemaining() {
  if (countdownPaused) return countdownPausedRemaining || 0;
  if (!countdownDeadline) return 0;
  return Math.max(0, countdownDeadline - Date.now());
}

const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/fantastic-cup';
const DATA_FILE = path.join(__dirname, 'data.json');
let ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'commander48';

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const name = Date.now() + '_' + Math.random().toString(36).substr(2, 6) + ext;
    cb(null, name);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.gif'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowed.includes(ext)) return cb(new Error('Only JPG, PNG, and GIF files allowed.'));
    cb(null, true);
  },
});

const DEFAULT_USERS = [
  { username: 'admin', password: ADMIN_PASSWORD, role: 'admin', enabled: true },
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
  const [players, categories, achievements, coinBalances] = await Promise.all([
    User.find({ role: 'player', enabled: { $ne: false } }).lean(),
    Category.find().lean(),
    Achievement.find().lean(),
    CoinTransaction.aggregate([
      { $group: { _id: '$playerUsername', total: { $sum: '$amount' } } },
    ]),
  ]);

  const coinMap = {};
  coinBalances.forEach(c => { coinMap[c._id] = c.total; });

  const achMap = {};
  achievements.forEach(a => { achMap[a.playerUsername] = a.values || {}; });

  const ranked = players.map(p => {
    const ach = achMap[p.username] || {};
    let total = 0;
    categories.forEach(cat => {
      total += Number(ach[cat.id]) || 0;
    });
    total += coinMap[p.username] || 0;
    return { username: p.username, total, achievements: ach };
  });

  ranked.sort((a, b) => b.total - a.total);
  return ranked;
}

// ---- Routes ----

app.post('/login', async (req, res) => {
  const { username, password, role } = req.body;
  let success = false;
  let userData = null;
  if (!isMongoConnected()) {
    // Fallback: admin login when MongoDB is unavailable
    if (username === 'admin' && password === ADMIN_PASSWORD && role === 'admin') {
      success = true;
      userData = { username: 'admin', role: 'admin' };
    }
    if (username === 'player1' && password === 'pass123' && role === 'player') {
      success = true;
      userData = { username: 'player1', role: 'player' };
    }
    if (!success) return res.json({ success: false, message: 'Invalid credentials (offline mode).' });
  } else {
    try {
      const user = await User.findOne({ username, role, enabled: { $ne: false } }).lean();
      if (!user) return res.json({ success: false, message: 'Invalid credentials or user disabled.' });

      const passwordMatch = await bcrypt.compare(password, user.password).catch(() => false);
      if (!passwordMatch && user.password !== password) {
        return res.json({ success: false, message: 'Invalid credentials or user disabled.' });
      }
      success = true;
      userData = { username: user.username, role: user.role };
    } catch {
      return res.json({ success: false, message: 'Server error.' });
    }
  }

  // Track login for presence
  if (success && userData) {
    const now = Date.now();
    loginHistory.unshift({ username: userData.username, timestamp: now });
    if (loginHistory.length > MAX_LOGIN_HISTORY) loginHistory.length = MAX_LOGIN_HISTORY;
    userPresence.set(userData.username, { username: userData.username, onlineAt: now, lastSeen: now });
    broadcastPresence();
  }

  res.json({ success, user: userData });
});

app.get('/players', async (req, res) => {
  if (!isMongoConnected()) return res.json({ players: [{ username: 'player1', enabled: true }, { username: 'player2', enabled: true }] });
  try {
    const players = await User.find({ role: 'player' }).lean();
    res.json({ players: players.map(p => ({ username: p.username, enabled: p.enabled !== false })) });
  } catch { res.json({ players: [] }); }
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

    const hashedPassword = await bcrypt.hash(password, 10);
    await User.create({ username, password: hashedPassword, role: 'player', enabled: true });

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
  await DailyCompletion.deleteMany({ playerUsername: req.params.username });
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

// ─── PLAYER NOTES (with in-memory fallback) ───

const playerNotesMemory = new Map(); // username -> note text

app.get('/player-notes', async (req, res) => {
  if (isMongoConnected()) {
    try {
      const notes = await PlayerNote.find().lean();
      const result = {};
      notes.forEach(n => { result[n.username] = n.notes; });
      // Merge in-memory overrides
      for (const [u, t] of playerNotesMemory) result[u] = t;
      return res.json({ notes: result });
    } catch {}
  }
  // Fallback: in-memory only
  const result = {};
  for (const [u, t] of playerNotesMemory) result[u] = t;
  res.json({ notes: result });
});

app.post('/player-notes', async (req, res) => {
  const { username, notes } = req.body;
  if (!username) return res.json({ success: false, message: 'Username required.' });
  // Save to in-memory always
  playerNotesMemory.set(username, notes || '');
  // Try MongoDB if available
  if (isMongoConnected()) {
    try {
      await PlayerNote.findOneAndUpdate(
        { username },
        { username, notes: notes || '' },
        { upsert: true }
      );
    } catch {}
  }
  // Broadcast note update to all clients via socket
  io.emit('noteUpdated', { username, notes: notes || '' });
  res.json({ success: true });
});

// ─── BADGES SYSTEM (in-memory + MongoDB) ───

let badgesData = {
  badges: [],          // { id, name, rarity, description, icon }
  playerBadges: {},    // username -> badgeId[]
};

async function syncBadgesToDB() {
  if (!isMongoConnected()) return;
  try {
    for (const badge of badgesData.badges) {
      await Badge.findOneAndUpdate({ id: badge.id }, badge, { upsert: true });
    }
    for (const [username, badgeIds] of Object.entries(badgesData.playerBadges)) {
      await BadgeAssignment.findOneAndUpdate({ username }, { badgeIds }, { upsert: true });
    }
  } catch (e) { console.error('Badge sync failed:', e.message); }
}

async function loadBadgesFromDB() {
  if (!isMongoConnected()) return false;
  try {
    const dbBadges = await Badge.find().lean();
    if (dbBadges.length > 0) {
      badgesData.badges = dbBadges;
      const assignments = await BadgeAssignment.find().lean();
      for (const a of assignments) {
        badgesData.playerBadges[a.username] = a.badgeIds || [];
      }
      return true;
    }
  } catch { /* ignore */ }
  return false;
}

// Seed default badges if empty (only if nothing in DB)
async function seedBadges() {
  const loaded = await loadBadgesFromDB();
  if (loaded) return;
  if (badgesData.badges.length > 0) return;
  badgesData.badges = [
    { id: 'bdg-1', name: 'Rising Star',  rarity: 'common',    description: 'Showed great potential',           icon: '⭐' },
    { id: 'bdg-2', name: 'Sharpshooter',  rarity: 'rare',      description: 'Deadly accuracy',                  icon: '🎯' },
    { id: 'bdg-3', name: 'Night Owl',     rarity: 'epic',      description: 'Active during the darkest hours',  icon: '🦉' },
    { id: 'bdg-4', name: 'Shadow',        rarity: 'legendary', description: 'The unseen hand of fate',          icon: '🌑' },
    { id: 'bdg-5', name: 'Iron Will',     rarity: 'rare',      description: 'Never gives up',                   icon: '⚔️' },
    { id: 'bdg-6', name: 'Tactician',     rarity: 'epic',      description: 'Outsmarts everyone',               icon: '🧠' },
    { id: 'bdg-7', name: 'Phoenix',       rarity: 'legendary', description: 'Rose from the ashes',              icon: '🔥' },
    { id: 'bdg-8', name: 'Lucky Charm',   rarity: 'common',    description: 'Fortune favours the bold',         icon: '🍀' },
  ];
  syncBadgesToDB();
}
seedBadges();

// GET all badges
app.get('/api/badges', (req, res) => {
  res.json({ badges: badgesData.badges });
});

// GET player badges
app.get('/api/badges/player/:username', (req, res) => {
  const assigned = badgesData.playerBadges[req.params.username] || [];
  const playerBadges = assigned.map(id => badgesData.badges.find(b => b.id === id)).filter(Boolean);
  res.json({ badges: playerBadges });
});

// GET all badge assignments (for leaderboard)
app.get('/api/badges/assignments', (req, res) => {
  const result = {};
  for (const [username, badgeIds] of Object.entries(badgesData.playerBadges)) {
    result[username] = badgeIds.map(id => badgesData.badges.find(b => b.id === id)).filter(Boolean);
  }
  res.json({ assignments: result });
});

// Create badge
app.post('/api/badges/create', (req, res) => {
  const { name, rarity, description, icon } = req.body;
  if (!name || !rarity) return res.json({ success: false, message: 'Name and rarity required.' });
  const id = 'bdg-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
  const badge = { id, name, rarity: rarity || 'common', description: description || '', icon: icon || '🏅' };
  badgesData.badges.push(badge);
  syncBadgesToDB();
  io.emit('badgesUpdated');
  res.json({ success: true, badge });
});

// Update badge
app.post('/api/badges/update', (req, res) => {
  const { id, name, rarity, description, icon } = req.body;
  const badge = badgesData.badges.find(b => b.id === id);
  if (!badge) return res.json({ success: false, message: 'Badge not found.' });
  if (name !== undefined) badge.name = name;
  if (rarity !== undefined) badge.rarity = rarity;
  if (description !== undefined) badge.description = description;
  if (icon !== undefined) badge.icon = icon;
  syncBadgesToDB();
  io.emit('badgesUpdated');
  res.json({ success: true, badge });
});

// Delete badge
app.post('/api/badges/delete', (req, res) => {
  const { id } = req.body;
  badgesData.badges = badgesData.badges.filter(b => b.id !== id);
  for (const username of Object.keys(badgesData.playerBadges)) {
    badgesData.playerBadges[username] = badgesData.playerBadges[username].filter(bId => bId !== id);
  }
  if (isMongoConnected()) {
    Badge.deleteOne({ id }).catch(() => {});
  }
  syncBadgesToDB();
  io.emit('badgesUpdated');
  res.json({ success: true });
});

// Assign badge to player
app.post('/api/badges/assign', (req, res) => {
  const { username, badgeId } = req.body;
  if (!username || !badgeId) return res.json({ success: false, message: 'Username and badgeId required.' });
  if (!badgesData.playerBadges[username]) badgesData.playerBadges[username] = [];
  if (!badgesData.playerBadges[username].includes(badgeId)) {
    badgesData.playerBadges[username].push(badgeId);
  }
  syncBadgesToDB();
  io.emit('badgesUpdated');
  res.json({ success: true });
});

// Remove badge from player
app.post('/api/badges/remove', (req, res) => {
  const { username, badgeId } = req.body;
  if (!username || !badgeId) return res.json({ success: false, message: 'Username and badgeId required.' });
  if (badgesData.playerBadges[username]) {
    badgesData.playerBadges[username] = badgesData.playerBadges[username].filter(id => id !== badgeId);
  }
  syncBadgesToDB();
  io.emit('badgesUpdated');
  res.json({ success: true });
});

// GET all players with their badges (for admin assignment UI)
app.get('/api/badges/players', (req, res) => {
  const result = [];
  const allUsernames = new Set([...playerNotesMemory.keys()]);
  for (const username of allUsernames) {
    const assigned = badgesData.playerBadges[username] || [];
    result.push({ username, badges: assigned.map(id => badgesData.badges.find(b => b.id === id)).filter(Boolean) });
  }
  res.json({ players: result });
});

// ─── TEAMS SYSTEM (in-memory + MongoDB) ───

let teamsData = {
  teams: [],  // { id, name, logo, color, members: [username], silverCoins: number, notes: string }
  memberCoins: {}, // username -> silver coin balance from teams
};

async function syncTeamsToDB() {
  if (!isMongoConnected()) return;
  try {
    for (const team of teamsData.teams) {
      await Team.findOneAndUpdate({ id: team.id }, team, { upsert: true });
    }
  } catch (e) { console.error('Team sync failed:', e.message); }
}

async function loadTeamsFromDB() {
  if (!isMongoConnected()) return;
  try {
    const dbTeams = await Team.find().lean();
    if (dbTeams.length > 0) {
      teamsData.teams = dbTeams;
    }
  } catch { /* ignore */ }
}
loadTeamsFromDB();

function getTeamsForPlayer(username) {
  return teamsData.teams.filter(t => t.members.includes(username));
}

function getTeamMemberBalance(username) {
  let total = 0;
  for (const t of teamsData.teams) {
    if (t.members.includes(username)) {
      total += t.silverCoins || 0;
    }
  }
  return total;
}

function broadcastTeams() {
  io.emit('teamsUpdate', teamsData.teams);
  syncShowdownTeams();
}

// GET all teams
app.get('/api/teams', (req, res) => {
  res.json({ teams: teamsData.teams });
});

// GET teams for a player
app.get('/api/teams/player/:username', (req, res) => {
  const playerTeams = getTeamsForPlayer(req.params.username);
  res.json({ teams: playerTeams, silverBalance: getTeamMemberBalance(req.params.username) });
});

// GET all teams with member details
app.get('/api/teams/admin', (req, res) => {
  // Include all players for the admin assign UI
  const allPlayers = [];
  if (isMongoConnected()) {
    User.find({ role: 'player' }).lean().then(users => {
      users.forEach(u => allPlayers.push(u.username));
    }).catch(() => {});
  } else {
    allPlayers.push('player1', 'player2', 'player3');
  }
  res.json({ teams: teamsData.teams, allPlayers: [...new Set(allPlayers)] });
});

// Create team
app.post('/api/teams/create', (req, res) => {
  const { name, logo, color } = req.body;
  if (!name) return res.json({ success: false, message: 'Team name required.' });
  const id = 'team-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
  const team = { id, name, logo: logo || '🏳️', color: color || '#667eea', members: [], silverCoins: 0, notes: '' };
  teamsData.teams.push(team);
  syncTeamsToDB();
  broadcastTeams();
  res.json({ success: true, team });
});

// Update team
app.post('/api/teams/update', (req, res) => {
  const { id, name, logo, color, silverCoins, notes } = req.body;
  const team = teamsData.teams.find(t => t.id === id);
  if (!team) return res.json({ success: false, message: 'Team not found.' });
  if (name !== undefined) team.name = name;
  if (logo !== undefined) team.logo = logo;
  if (color !== undefined) team.color = color;
  if (silverCoins !== undefined) team.silverCoins = Number(silverCoins) || 0;
  if (notes !== undefined) team.notes = notes;
  broadcastTeams();
  syncTeamsToDB();
  res.json({ success: true, team });
});

// Delete team
app.post('/api/teams/delete', (req, res) => {
  const { id } = req.body;
  teamsData.teams = teamsData.teams.filter(t => t.id !== id);
  broadcastTeams();
  if (isMongoConnected()) {
    Team.deleteOne({ id }).catch(() => {});
  }
  res.json({ success: true });
});

// Add member to team
app.post('/api/teams/add-member', (req, res) => {
  const { teamId, username } = req.body;
  const team = teamsData.teams.find(t => t.id === teamId);
  if (!team) return res.json({ success: false, message: 'Team not found.' });
  if (!team.members.includes(username)) {
    team.members.push(username);
  }
  broadcastTeams();
  syncTeamsToDB();
  res.json({ success: true, team });
});

// Remove member from team
app.post('/api/teams/remove-member', (req, res) => {
  const { teamId, username } = req.body;
  const team = teamsData.teams.find(t => t.id === teamId);
  if (!team) return res.json({ success: false, message: 'Team not found.' });
  team.members = team.members.filter(m => m !== username);
  broadcastTeams();
  syncTeamsToDB();
  res.json({ success: true, team });
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
  if (!isMongoConnected()) return res.json({ achievements: { cat_goals: 15, cat_assists: 8, cat_points: 42 }, categories: [{ id: 'cat_goals', title: 'Goals' }, { id: 'cat_assists', title: 'Assists' }, { id: 'cat_points', title: 'Points' }] });
  try {
    const [achievement, categories] = await Promise.all([
      Achievement.findOne({ playerUsername: req.params.player }).lean(),
      Category.find().lean(),
    ]);
    res.json({ achievements: achievement?.values || {}, categories });
  } catch { res.json({ achievements: {}, categories: [] }); }
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
  if (!isMongoConnected()) {
    return res.json({
      leaderboard: [
        { username: 'player1', total: 42, achievements: {} },
        { username: 'player2', total: 28, achievements: {} },
        { username: 'player3', total: 15, achievements: {} },
      ],
      categories: [{ id: 'cat_goals', title: 'Goals' }],
    });
  }
  try {
    const [leaderboard, categories] = await Promise.all([
      buildLeaderboard(),
      Category.find().lean(),
    ]);
    res.json({ leaderboard, categories });
  } catch { res.json({ leaderboard: [], categories: [] }); }
});

// ─── Player Achievement Stats (for pop-up panel) ───
function getPrevDateStr(dateStr) {
  const d = new Date(dateStr + 'T12:00:00Z');
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

async function getDailyStreak(username) {
  try {
    const completions = await DailyCompletion.find({ playerUsername: username })
      .sort({ date: -1 }).lean();
    if (!completions.length) return 0;
    const taskDate = getTaskDate();
    let streak = 0;
    let expected = null;
    for (let i = 0; i < completions.length; i++) {
      const d = completions[i].date;
      if (i === 0) {
        if (d === taskDate || d === getPrevDateStr(taskDate)) {
          streak = 1;
          expected = getPrevDateStr(d);
        } else break;
      } else {
        if (d === expected) { streak++; expected = getPrevDateStr(d); }
        else break;
      }
    }
    return streak;
  } catch { return 0; }
}

app.get('/api/player/:username/stats', async (req, res) => {
  const { username } = req.params;
  try {
    const [achievement, categories, coinBalance, badges, streak] = await Promise.all([
      Achievement.findOne({ playerUsername: username }).lean().catch(() => null),
      Category.find().lean().catch(() => []),
      CoinTransaction.aggregate([
        { $match: { playerUsername: username } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]).then(r => r.length > 0 ? r[0].total : 0).catch(() => 0),
      Promise.resolve().then(() => {
        const assigned = badgesData.playerBadges[username] || [];
        return assigned.map(id => badgesData.badges.find(b => b.id === id)).filter(Boolean);
      }),
      getDailyStreak(username),
    ]);

    let avatarUrl = '';
    const avatarPath = path.join(__dirname, 'uploads', username + '.jpg');
    if (fs.existsSync(avatarPath)) avatarUrl = '/uploads/' + username + '.jpg';
    else {
      try {
        const files = fs.readdirSync(path.join(__dirname, 'uploads'));
        const match = files.find(f => f.startsWith(username + '.'));
        if (match) avatarUrl = '/uploads/' + match;
      } catch {}
    }

    let adminNote = '';
    const noteUsername = [...playerNotesMemory.keys()].find(k => k.toLowerCase() === username.toLowerCase());
    if (noteUsername) adminNote = playerNotesMemory.get(noteUsername) || '';
    if (!adminNote && isMongoConnected()) {
      try {
        const noteDoc = await PlayerNote.findOne({ username: { $regex: new RegExp('^' + username.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') } }).lean();
        if (noteDoc) adminNote = noteDoc.notes || '';
      } catch {}
    }

    res.json({
      username,
      avatarUrl,
      coinBalance,
      badges,
      achievements: achievement?.values || {},
      categories,
      dailyStreak: streak,
      adminNote,
    });
  } catch {
    res.json({ username, avatarUrl: '', coinBalance: 0, badges: [], achievements: {}, categories: [], dailyStreak: 0, adminNote: '' });
  }
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
// CHANGE PASSWORD
// ═══════════════════════════════════════════════

app.post('/change-password', async (req, res) => {
  try {
    const { username, currentPassword, newPassword } = req.body;
    if (!username || !currentPassword || !newPassword) {
      return res.json({ success: false, message: 'All fields required.' });
    }

    if (newPassword.length < 4) {
      return res.json({ success: false, message: 'New password must be at least 4 characters.' });
    }

    const user = await User.findOne({ username });
    if (!user) return res.json({ success: false, message: 'User not found.' });

    const passwordMatch = await bcrypt.compare(currentPassword, user.password).catch(() => false);
    if (!passwordMatch && user.password !== currentPassword) {
      return res.json({ success: false, message: 'Current password is incorrect.' });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    user.password = hashed;
    await user.save();

    res.json({ success: true });
  } catch {
    res.json({ success: false, message: 'Server error.' });
  }
});

// ═══════════════════════════════════════════════
// AVATAR ROUTES (File Upload)
// ═══════════════════════════════════════════════

app.get('/api/avatar/:username', async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username }).lean();
    res.json({ avatar: user?.avatar || '' });
  } catch {
    res.json({ avatar: '' });
  }
});

app.post('/api/avatar/upload', upload.single('avatar'), async (req, res) => {
  try {
    const { username } = req.body;
    if (!username) return res.json({ success: false, message: 'Username required.' });
    if (!req.file) return res.json({ success: false, message: 'No file uploaded.' });

    const avatarPath = '/uploads/' + req.file.filename;

    // Remove old avatar file if it was uploaded
    const oldUser = await User.findOne({ username }).lean();
    if (oldUser?.avatar && oldUser.avatar.startsWith('/uploads/')) {
      const oldPath = path.join(__dirname, oldUser.avatar);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    await User.findOneAndUpdate({ username }, { avatar: avatarPath });
    res.json({ success: true, avatar: avatarPath });
  } catch (err) {
    res.json({ success: false, message: err.message || 'Failed to upload avatar.' });
  }
});

app.post('/api/avatar/remove', async (req, res) => {
  try {
    const { username } = req.body;
    if (!username) return res.json({ success: false, message: 'Username required.' });

    const user = await User.findOne({ username }).lean();
    if (user?.avatar && user.avatar.startsWith('/uploads/')) {
      const oldPath = path.join(__dirname, user.avatar);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    await User.findOneAndUpdate({ username }, { $set: { avatar: '' } });
    res.json({ success: true });
  } catch {
    res.json({ success: false, message: 'Failed to remove avatar.' });
  }
});

// ═══════════════════════════════════════════════
// DAILY TASK ROUTES
// ═══════════════════════════════════════════════

const SIX_AM = 6; // hour (server local time)

function getTodayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function isBefore6am() {
  return new Date().getHours() < SIX_AM;
}

function getTaskDate() {
  const d = new Date();
  if (d.getHours() < SIX_AM) d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

// Get daily task config (admin)
app.get('/api/daily-task/config', async (req, res) => {
  try {
    let config = await DailyTaskConfig.findOne({ key: 'config' }).lean();
    if (!config) config = { key: 'config', text: 'Daily Task' };
    res.json({ text: config.text });
  } catch {
    res.json({ text: 'Daily Task' });
  }
});

// Set daily task text (admin)
app.post('/api/daily-task/config', async (req, res) => {
  try {
    const { text } = req.body;
    await DailyTaskConfig.findOneAndUpdate(
      { key: 'config' },
      { key: 'config', text: text || 'Daily Task' },
      { upsert: true }
    );
    io.emit('dailyTask:configUpdate', text);
    res.json({ success: true, text });
  } catch {
    res.json({ success: false, message: 'Failed to update task text.' });
  }
});

// Get daily task status for a player
app.get('/api/daily-task/status/:player', async (req, res) => {
  try {
    const taskDate = getTaskDate();
    const completion = await DailyCompletion.findOne({
      playerUsername: req.params.player,
      date: taskDate,
    }).lean();
    const config = await DailyTaskConfig.findOne({ key: 'config' }).lean();
    res.json({
      completed: !!completion,
      date: taskDate,
      text: config?.text || 'Daily Task',
    });
  } catch {
    res.json({ completed: false, date: getTaskDate(), text: 'Daily Task' });
  }
});

// Mark daily task as completed
app.post('/api/daily-task/check/:player', async (req, res) => {
  try {
    const taskDate = getTaskDate();
    const existing = await DailyCompletion.findOne({
      playerUsername: req.params.player,
      date: taskDate,
    });
    if (existing) {
      return res.json({ success: false, message: 'Already completed today.' });
    }
    const config = await DailyTaskConfig.findOne({ key: 'config' }).lean();
    await DailyCompletion.create({
      playerUsername: req.params.player,
      date: taskDate,
      completedAt: Date.now(),
    });
    io.emit('dailyTask:completed', {
      player: req.params.player,
      text: config?.text || 'Daily Task',
      timestamp: Date.now(),
    });
    res.json({ success: true });
  } catch {
    res.json({ success: false, message: 'Failed to record completion.' });
  }
});

// Get daily task log (admin)
app.get('/api/daily-task/log', async (req, res) => {
  try {
    const completions = await DailyCompletion.find()
      .sort({ completedAt: -1 }).limit(200).lean();
    const config = await DailyTaskConfig.findOne({ key: 'config' }).lean();
    res.json({ completions, text: config?.text || 'Daily Task' });
  } catch {
    res.json({ completions: [], text: 'Daily Task' });
  }
});

// ═══════════════════════════════════════════════
// ADMIN CHANGE PASSWORD
// ═══════════════════════════════════════════════

app.post('/admin/change-password', async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.json({ success: false, message: 'All fields required.' });
    }

    if (newPassword.length < 4) {
      return res.json({ success: false, message: 'New password must be at least 4 characters.' });
    }

    if (currentPassword !== ADMIN_PASSWORD) {
      const pwMatch = await User.findOne({ username: 'admin' }).then(u => {
        if (!u) return false;
        return bcrypt.compare(currentPassword, u.password).catch(() => false);
      }).catch(() => false);
      if (!pwMatch) {
        return res.json({ success: false, message: 'Current password is incorrect.' });
      }
    }

    ADMIN_PASSWORD = newPassword;

    if (isMongoConnected()) {
      const hashed = await bcrypt.hash(newPassword, 10);
      await User.findOneAndUpdate(
        { username: 'admin', role: 'admin' },
        { password: hashed }
      );
    }

    res.json({ success: true, message: 'Admin password updated successfully.' });
  } catch {
    res.json({ success: false, message: 'Server error.' });
  }
});

// ═══════════════════════════════════════════════
// ADMIN SET PLAYER PASSWORD
// ═══════════════════════════════════════════════

app.post('/api/admin/set-player-password', async (req, res) => {
  try {
    const { playerUsername, newPassword } = req.body;
    if (!playerUsername || !newPassword) {
      return res.json({ success: false, message: 'Player username and new password required.' });
    }
    if (newPassword.length < 4) {
      return res.json({ success: false, message: 'Password must be at least 4 characters.' });
    }
    const user = await User.findOne({ username: playerUsername, role: 'player' });
    if (!user) return res.json({ success: false, message: 'Player not found.' });

    const hashed = await bcrypt.hash(newPassword, 10);
    user.password = hashed;
    await user.save();

    res.json({ success: true, message: `Password for "${playerUsername}" updated.` });
  } catch {
    res.json({ success: false, message: 'Server error.' });
  }
});

// ═══════════════════════════════════════════════
// RESET COIN LEADERBOARD
// ═══════════════════════════════════════════════

app.post('/api/coins/reset', async (req, res) => {
  try {
    if (!isMongoConnected()) {
      return res.json({ success: false, message: 'MongoDB required for coin reset.' });
    }

    const balances = await CoinTransaction.aggregate([
      { $group: { _id: '$playerUsername', total: { $sum: '$amount' } } },
    ]);

    const resetTransactions = [];
    for (const b of balances) {
      if (b.total > 0) {
        resetTransactions.push({
          playerUsername: b._id,
          amount: -b.total,
          note: 'Leaderboard reset',
          stamp: '🔄',
          timestamp: Date.now(),
        });
      }
    }

    if (resetTransactions.length > 0) {
      await CoinTransaction.insertMany(resetTransactions);
    }

    const leaderboard = await buildLeaderboard();
    io.emit('leaderboard:update');
    io.emit('coins:reset');

    res.json({ success: true, message: `Coin leaderboard reset. ${resetTransactions.length} balances zeroed.`, leaderboard });
  } catch {
    res.json({ success: false, message: 'Failed to reset coin leaderboard.' });
  }
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

  // ─── TOP 3 TEAMS SHOWDOWN SOCKET HANDLERS ───

  socket.on('showdown:join', () => {
    const state = {
      teams: showdownState.teams.map(t => ({
        id: t.id, name: t.name, logo: t.logo, color: t.color,
        stockValue: t.stockValue, change: t._change || 0, rank: t.rank,
        members: t.members || [],
      })),
      baseValues: { ...showdownState.baseValues },
      simulationActive: showdownState.simulationActive,
    };
    socket.emit('showdownUpdate', state);
  });

  socket.on('showdown:adminLogin', (password) => {
    if (password !== ADMIN_PASSWORD) return socket.emit('error', 'Invalid admin password');
    socket.emit('showdown:adminGranted');
  });

  socket.on('showdown:setValue', (data) => {
    if (!data.teamId || data.value === undefined) return;
    showdownState.baseValues[data.teamId] = Math.max(0, Number(data.value) || 0);
    // Update in showdownteams
    const team = showdownState.teams.find(t => t.id === data.teamId);
    if (team) team.stockValue = showdownState.baseValues[data.teamId];
    syncShowdownTeams();
  });

  socket.on('showdown:toggleSimulation', () => {
    showdownState.simulationActive = !showdownState.simulationActive;
    if (showdownState.simulationActive) {
      startShowdownSimulation();
    } else {
      stopShowdownSimulation();
    }
    broadcastShowdown([]);
  });

  socket.on('showdown:reset', () => {
    showdownState.baseValues = {};
    showdownState.prevRanks = {};
    const allTeams = JSON.parse(JSON.stringify(teamsData.teams));
    for (const team of allTeams) {
      showdownState.baseValues[team.id] = team.silverCoins || 0;
    }
    syncShowdownTeams();
  });

  // ─── COUNTDOWN TIMER (Admin Dashboard) ───
  socket.on('adminSetTimer', (data) => {
    countdownDeadline = data.deadline;
    countdownMystery = !!data.mysteryMode;
    countdownPaused = false;
    countdownPausedRemaining = null;
    const remaining = getCountdownRemaining();
    io.emit('countdownStart', remaining);
    startCountdownInterval();
  });

  socket.on('adminPauseTimer', () => {
    if (!countdownPaused && countdownDeadline) {
      countdownPaused = true;
      countdownPausedRemaining = Math.max(0, countdownDeadline - Date.now());
      stopCountdownInterval();
    }
  });

  socket.on('adminResumeTimer', () => {
    if (countdownPaused && countdownPausedRemaining !== null) {
      countdownDeadline = Date.now() + countdownPausedRemaining;
      countdownPaused = false;
      countdownPausedRemaining = null;
      startCountdownInterval();
    }
  });

  socket.on('adminResetTimer', () => {
    countdownDeadline = null;
    countdownPaused = false;
    countdownPausedRemaining = null;
    stopCountdownInterval();
    io.emit('countdownCancel');
  });

  socket.on('adminExtendTimer', (sec) => {
    if (countdownDeadline) {
      countdownDeadline += (Number(sec) || 30) * 1000;
    }
  });
});

// ─── PRESENCE / HEARTBEAT ─────────────────────────────────────

const ONLINE_TIMEOUT = 30000;
const userPresence = new Map();
const socketUserMap = new Map(); // socket.id -> username
const loginHistory = []; // { username, timestamp }
const MAX_LOGIN_HISTORY = 100;

function broadcastPresence() {
  const now = Date.now();
  io.emit('presenceUpdate', {
    online: Array.from(userPresence.values()).filter(u => now - u.lastSeen < ONLINE_TIMEOUT),
    recent: Array.from(userPresence.values())
      .sort((a, b) => b.lastSeen - a.lastSeen)
      .slice(0, 20)
      .map(u => ({ ...u, isOnline: now - u.lastSeen < ONLINE_TIMEOUT })),
    loginHistory: loginHistory.slice(0, 20),
  });
}

io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);

  // If client sends username immediately, mark online
  socket.on('heartbeat', (data) => {
    const username = data?.username;
    if (!username) return;
    const now = Date.now();
    socketUserMap.set(socket.id, username);
    const existing = userPresence.get(username);
    userPresence.set(username, { username, onlineAt: existing ? existing.onlineAt : now, lastSeen: now });
    broadcastPresence();
  });

  socket.on('userOnline', (data) => {
    const username = data?.username;
    if (!username) return;
    const now = Date.now();
    socketUserMap.set(socket.id, username);
    userPresence.set(username, { username, onlineAt: now, lastSeen: now });
    broadcastPresence();
  });

  socket.on('disconnect', () => {
    console.log('Socket disconnected:', socket.id);
    const username = socketUserMap.get(socket.id);
    socketUserMap.delete(socket.id);
    // Check if user has other active sockets
    if (username) {
      const hasOtherSockets = Array.from(socketUserMap.values()).some(u => u === username);
      if (!hasOtherSockets) {
        // Mark offline after a short grace period
        const existing = userPresence.get(username);
        if (existing) {
          userPresence.set(username, { ...existing, lastSeen: Date.now() });
          // Still broadcast so admin sees them fall off "online" immediately
        }
      }
    }
    broadcastPresence();
  });
});

// Login history endpoint
app.post('/api/presence/login', (req, res) => {
  const { username } = req.body;
  if (!username) return res.json({ success: false });
  const now = Date.now();
  loginHistory.unshift({ username, timestamp: now });
  if (loginHistory.length > MAX_LOGIN_HISTORY) loginHistory.length = MAX_LOGIN_HISTORY;
  // Also mark them online
  userPresence.set(username, { username, onlineAt: now, lastSeen: now });
  broadcastPresence();
  res.json({ success: true });
});

// Presence poll endpoint (fallback)
app.get('/api/presence', (req, res) => {
  const now = Date.now();
  res.json({
    online: Array.from(userPresence.values()).filter(u => now - u.lastSeen < ONLINE_TIMEOUT),
    recent: Array.from(userPresence.values())
      .sort((a, b) => b.lastSeen - a.lastSeen)
      .slice(0, 20)
      .map(u => ({ ...u, isOnline: now - u.lastSeen < ONLINE_TIMEOUT })),
    loginHistory: loginHistory.slice(0, 20),
  });
});

// Cleanup stale presence every 15s
setInterval(broadcastPresence, 15000);

// ═══════════════════════════════════════════════

// ─── TOP 3 TEAMS SHOWDOWN REST ROUTES ───

app.get('/api/showdown/state', (req, res) => {
  res.json({
    teams: showdownState.teams.map(t => ({
      id: t.id, name: t.name, logo: t.logo, color: t.color,
      stockValue: t.stockValue, change: t._change || 0, rank: t.rank,
      members: t.members || [],
    })),
    baseValues: showdownState.baseValues,
    simulationActive: showdownState.simulationActive,
  });
});

app.post('/api/showdown/admin/login', (req, res) => {
  const { password } = req.body;
  if (password !== ADMIN_PASSWORD) return res.status(401).json({ error: 'Invalid password' });
  res.json({ token: 'granted' });
});

// Serve the React Event Section (showdown)
const eventDist = path.join(__dirname, 'client', 'dist');
app.use('/event', express.static(eventDist));
app.get('/event/*', (req, res) => {
  res.sendFile(path.join(eventDist, 'index.html'));
});

// ─── END SHOWDOWN SECTION ───

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
    // Ensure default categories exist even if migration was skipped
    try {
      const catCount = await Category.countDocuments();
      if (catCount === 0) {
        await Category.insertMany(DEFAULT_CATEGORIES);
        console.log('✓ Default categories created');
      }
    } catch (e) { console.log('ℹ Could not check categories:', e.message); }
  } else {
    console.log('ℹ MongoDB not available — legacy data features disabled, event section works');
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`✓ Server running on http://0.0.0.0:${PORT}`);
    console.log(`  → Legacy UI:  http://0.0.0.0:${PORT}/`);
    console.log(`  → Event UI:   http://0.0.0.0:${PORT}/event/`);
    console.log(`  → Admin pass: ${ADMIN_PASSWORD}`);
  });
}

start();
