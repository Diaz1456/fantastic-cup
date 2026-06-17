const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, unique: true },
  password: String,
  role: String,
  enabled: { type: Boolean, default: true },
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

const User = mongoose.model('User', userSchema);
const Category = mongoose.model('Category', categorySchema);
const Achievement = mongoose.model('Achievement', achievementSchema);
const Feedback = mongoose.model('Feedback', feedbackSchema);
const PlayerNote = mongoose.model('PlayerNote', playerNoteSchema);

async function connectDB(uri) {
  await mongoose.connect(uri);
}

module.exports = { User, Category, Achievement, Feedback, PlayerNote, connectDB };
