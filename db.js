const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, unique: true },
  password: String,
  role: String,
  enabled: { type: Boolean, default: true },
  avatar: { type: String, default: '' },
});

const categorySchema = new mongoose.Schema({
  id: { type: String, unique: true },
  title: String,
});

const achievementSchema = new mongoose.Schema({
  playerUsername: { type: String, unique: true },
  values: { type: Map, of: Number, default: {} },
});

const feedbackSchema = new mongoose.Schema({
  id: { type: String, unique: true },
  player: String,
  message: String,
  timestamp: Number,
});

const playerNoteSchema = new mongoose.Schema({
  username: { type: String, unique: true },
  notes: { type: String, default: '' },
});

const eventSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  active: { type: Boolean, default: false },
  deadline: Date,
  timerPaused: { type: Boolean, default: false },
  surpriseMode: { type: Boolean, default: false },
  categories: [{
    name: String,
    teams: [{
      name: String,
      logo: { type: String, default: '🏆' },
      score: { type: Number, default: 0 },
    }],
  }],
  createdAt: { type: Date, default: Date.now },
});

const coinSchema = new mongoose.Schema({
  playerUsername: { type: String, index: true },
  amount: Number,
  note: String,
  stamp: { type: String, default: '⭐' },
  timestamp: { type: Number, default: Date.now },
});

const dailyCompletionSchema = new mongoose.Schema({
  playerUsername: { type: String, required: true },
  date: { type: String, required: true },
  completedAt: { type: Number, default: Date.now },
});
dailyCompletionSchema.index({ playerUsername: 1, date: 1 }, { unique: true });

const dailyTaskConfigSchema = new mongoose.Schema({
  key: { type: String, default: 'config', unique: true },
  text: { type: String, default: 'Daily Task' },
});

const badgeSchema = new mongoose.Schema({
  id: { type: String, unique: true },
  name: String,
  rarity: { type: String, default: 'common' },
  description: { type: String, default: '' },
  icon: { type: String, default: '🏅' },
});

const badgeAssignmentSchema = new mongoose.Schema({
  username: { type: String, unique: true },
  badgeIds: [{ type: String }],
});

const teamSchema = new mongoose.Schema({
  id: { type: String, unique: true },
  name: String,
  logo: { type: String, default: '🏳️' },
  color: { type: String, default: '#667eea' },
  members: [{ type: String }],
  silverCoins: { type: Number, default: 0 },
  notes: { type: String, default: '' },
});

const monopolyCompanySchema = new mongoose.Schema({
  id: { type: String, unique: true },
  name: String,
  color: { type: String, default: '#5b8def' },
  stocks: [{
    id: String,
    name: String,
    price: { type: Number, default: 50 },
    volume: { type: Number, default: 1000 },
  }],
});

const User = mongoose.model('User', userSchema);
const Category = mongoose.model('Category', categorySchema);
const Achievement = mongoose.model('Achievement', achievementSchema);
const Feedback = mongoose.model('Feedback', feedbackSchema);
const PlayerNote = mongoose.model('PlayerNote', playerNoteSchema);
const Event = mongoose.model('Event', eventSchema);
const CoinTransaction = mongoose.model('CoinTransaction', coinSchema);
const DailyCompletion = mongoose.model('DailyCompletion', dailyCompletionSchema);
const DailyTaskConfig = mongoose.model('DailyTaskConfig', dailyTaskConfigSchema);
const Badge = mongoose.model('Badge', badgeSchema);
const BadgeAssignment = mongoose.model('BadgeAssignment', badgeAssignmentSchema);
const Team = mongoose.model('Team', teamSchema);
const MonopolyCompany = mongoose.model('MonopolyCompany', monopolyCompanySchema);

async function connectDB(uri) {
  await mongoose.connect(uri);
}

module.exports = { User, Category, Achievement, Feedback, PlayerNote, Event, CoinTransaction, DailyCompletion, DailyTaskConfig, Badge, BadgeAssignment, Team, MonopolyCompany, connectDB };
