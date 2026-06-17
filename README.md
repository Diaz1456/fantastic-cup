# Fantastic Cup – Score Lead

A web application for managing player scores, achievements, and leaderboards with a stunning animated intro.

## Features

- **Stunning Intro**: Animated scene of a child falling and rising with the Holy Quran, light rays, and golden particles
- **Admin Dashboard**: Full control over players, achievements, leaderboard, and feedback
- **Player Dashboard**: MVP of the week, personal achievements with progress bars, leaderboard (Top 15)
- **Real-time Updates**: Player view auto-refreshes when admin updates achievements
- **Beautiful Design**: Dark theme, glassmorphism, gold accents, smooth animations

## Quick Start

```bash
npm install
npm start
```

Visit `http://localhost:3000`

## Default Accounts

| Role   | Username | Password |
|--------|----------|----------|
| Admin  | admin    | admin123 |
| Player | player1  | pass123  |
| Player | player2  | pass123  |
| Player | player3  | pass123  |

## Deploy to Render (Free)

1. Push this repo to GitHub
2. Go to [render.com](https://render.com) and sign up
3. Click **New +** → **Web Service**
4. Connect your GitHub repo
5. Set:
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
6. Click **Create Web Service**

Your app will be live at `https://your-app.onrender.com`

## Tech Stack

- **Backend**: Node.js + Express
- **Frontend**: Vanilla HTML/CSS/JS
- **Storage**: JSON file
