require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { User, Category, Achievement, Feedback, PlayerNote, connectDB } = require('./db');

const app = express();
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

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ---- Start ----

async function start() {
  try {
    await connectDB(MONGO_URI);
    console.log('Connected to MongoDB');
    await migrateFromFile();
  } catch (err) {
    console.error('Failed to connect to MongoDB:', err.message);
    console.log('Falling back to file-based storage');
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

start();
