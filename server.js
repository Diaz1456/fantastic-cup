const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data.json');

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

const DEFAULT_DATA = {
  users: [
    { username: 'admin', password: 'admin123', role: 'admin', enabled: true },
    { username: 'player1', password: 'pass123', role: 'player', enabled: true },
    { username: 'player2', password: 'pass123', role: 'player', enabled: true },
    { username: 'player3', password: 'pass123', role: 'player', enabled: true },
  ],
  achievementCategories: [
    { id: 'cat_goals', title: 'Goals' },
    { id: 'cat_assists', title: 'Assists' },
    { id: 'cat_points', title: 'Points' },
  ],
  achievements: {
    player1: { cat_goals: 12, cat_assists: 8, cat_points: 45 },
    player2: { cat_goals: 8, cat_assists: 15, cat_points: 32 },
    player3: { cat_goals: 20, cat_assists: 5, cat_points: 55 },
  },
  feedback: [],
  playerNotes: {},
};

function readData() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    writeData(DEFAULT_DATA);
    return DEFAULT_DATA;
  }
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

function generateId() {
  return 'cat_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
}

/* ───────────── AUTH ───────────── */
app.post('/login', (req, res) => {
  const { username, password, role } = req.body;
  const data = readData();
  const user = data.users.find(
    u => u.username === username && u.password === password && u.role === role && u.enabled !== false
  );
  if (!user) {
    return res.json({ success: false, message: 'Invalid credentials or user disabled.' });
  }
  res.json({ success: true, user: { username: user.username, role: user.role } });
});

/* ───────────── PLAYERS (admin) ───────────── */
app.get('/players', (req, res) => {
  const data = readData();
  const players = data.users.filter(u => u.role === 'player');
  res.json({ players: players.map(p => ({ username: p.username, enabled: p.enabled !== false })) });
});

app.post('/add-player', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.json({ success: false, message: 'Username and password required.' });
  }
  const data = readData();
  if (data.users.find(u => u.username === username)) {
    return res.json({ success: false, message: 'Username already exists.' });
  }
  data.users.push({ username, password, role: 'player', enabled: true });
  data.achievements[username] = {};
  data.achievementCategories.forEach(cat => { data.achievements[username][cat.id] = 0; });
  writeData(data);
  res.json({ success: true });
});

app.delete('/player/:username', (req, res) => {
  const data = readData();
  const idx = data.users.findIndex(u => u.username === req.params.username && u.role === 'player');
  if (idx === -1) return res.json({ success: false, message: 'Player not found.' });
  data.users.splice(idx, 1);
  delete data.achievements[req.params.username];
  if (data.playerNotes) delete data.playerNotes[req.params.username];
  writeData(data);
  res.json({ success: true });
});

app.post('/toggle-player', (req, res) => {
  const { username } = req.body;
  const data = readData();
  const user = data.users.find(u => u.username === username && u.role === 'player');
  if (!user) return res.json({ success: false, message: 'Player not found.' });
  user.enabled = user.enabled === false ? true : false;
  writeData(data);
  res.json({ success: true, enabled: user.enabled });
});

/* ───────────── PLAYER NOTES ───────────── */
app.get('/player-notes', (req, res) => {
  const data = readData();
  res.json({ notes: data.playerNotes || {} });
});

app.post('/player-notes', (req, res) => {
  const { username, notes } = req.body;
  if (!username) return res.json({ success: false, message: 'Username required.' });
  const data = readData();
  if (!data.playerNotes) data.playerNotes = {};
  data.playerNotes[username] = notes || '';
  writeData(data);
  res.json({ success: true });
});

/* ───────────── ACHIEVEMENT CATEGORIES ───────────── */
app.get('/achievement-categories', (req, res) => {
  const data = readData();
  res.json({ categories: data.achievementCategories });
});

app.post('/achievement-category', (req, res) => {
  const { title, id } = req.body;
  const data = readData();
  if (id) {
    const cat = data.achievementCategories.find(c => c.id === id);
    if (cat) cat.title = title;
    writeData(data);
    return res.json({ success: true, category: cat });
  }
  const newCat = { id: generateId(), title: title || 'New Category' };
  data.achievementCategories.push(newCat);
  Object.keys(data.achievements).forEach(player => {
    data.achievements[player][newCat.id] = 0;
  });
  writeData(data);
  res.json({ success: true, category: newCat });
});

app.delete('/achievement-category/:id', (req, res) => {
  const data = readData();
  const idx = data.achievementCategories.findIndex(c => c.id === req.params.id);
  if (idx === -1) return res.json({ success: false, message: 'Category not found.' });
  data.achievementCategories.splice(idx, 1);
  Object.keys(data.achievements).forEach(player => {
    delete data.achievements[player][req.params.id];
  });
  writeData(data);
  res.json({ success: true });
});

/* ───────────── ACHIEVEMENT VALUES ───────────── */
app.get('/achievements/:player', (req, res) => {
  const data = readData();
  const playerAchievements = data.achievements[req.params.player] || {};
  res.json({ achievements: playerAchievements, categories: data.achievementCategories });
});

app.post('/update-achievement', (req, res) => {
  const { playerUsername, categoryId, value } = req.body;
  const data = readData();
  if (!data.achievements[playerUsername]) {
    data.achievements[playerUsername] = {};
  }
  data.achievements[playerUsername][categoryId] = Number(value) || 0;
  writeData(data);
  const leaderboard = buildLeaderboard(data);
  res.json({ success: true, leaderboard });
});

/* ───────────── LEADERBOARD ───────────── */
function buildLeaderboard(data) {
  const players = data.users.filter(u => u.role === 'player' && u.enabled !== false);
  const ranked = players.map(p => {
    const ach = data.achievements[p.username] || {};
    let total = 0;
    data.achievementCategories.forEach(cat => {
      total += Number(ach[cat.id]) || 0;
    });
    return { username: p.username, total, achievements: ach };
  });
  ranked.sort((a, b) => b.total - a.total);
  return ranked.slice(0, 15);
}

app.get('/leaderboard', (req, res) => {
  const data = readData();
  res.json({ leaderboard: buildLeaderboard(data), categories: data.achievementCategories });
});

/* ───────────── FEEDBACK ───────────── */
app.post('/feedback', (req, res) => {
  const { player, message } = req.body;
  if (!player || !message) return res.json({ success: false, message: 'Missing fields.' });
  const data = readData();
  data.feedback.push({
    id: 'fb_' + Date.now(),
    player,
    message,
    timestamp: Date.now()
  });
  writeData(data);
  res.json({ success: true });
});

app.get('/feedbacks', (req, res) => {
  const data = readData();
  res.json({ feedbacks: data.feedback.reverse() });
});

/* ───────────── CSV EXPORT ───────────── */
app.get('/leaderboard/csv', (req, res) => {
  const data = readData();
  const lb = buildLeaderboard(data);
  let csv = 'Rank,Player,';
  data.achievementCategories.forEach(c => { csv += c.title + ','; });
  csv += 'Total Score\n';
  lb.forEach((entry, i) => {
    csv += `${i + 1},${entry.username},`;
    data.achievementCategories.forEach(c => {
      csv += `${Number(entry.achievements[c.id]) || 0},`;
    });
    csv += `${entry.total}\n`;
  });
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=leaderboard.csv');
  res.send(csv);
});

/* ───────────── SPA fallback ───────────── */
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const os = require('os');

function getNetworkIP() {
  const ifaces = os.networkInterfaces();
  for (const name of Object.keys(ifaces)) {
    for (const iface of ifaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) return iface.address;
    }
  }
  return 'localhost';
}

app.listen(PORT, '0.0.0.0', () => {
  const ip = getNetworkIP();
  console.log(`\n  🏆 Fantastic Cup – Score Lead`);
  console.log(`  ────────────────────────────`);
  console.log(`  Local:    http://localhost:${PORT}`);
  console.log(`  Network:  http://${ip}:${PORT}\n`);
});
