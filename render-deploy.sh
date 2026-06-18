#!/bin/bash
# Deploy to Render — one-click setup
# 1. Push this repo to GitHub
# 2. Go to https://dashboard.render.com
# 3. New → Web Service → Connect your repo
# 4. Render auto-detects render.yaml → click "Apply"
# 5. Set MONGO_URI env var (optional — event section works without it)
# 6. Deploy

echo "Render will auto-deploy from render.yaml"
echo "Build: npm install (runs postinstall → builds React client)"
echo "Start: node server.js"
echo ""
echo "After deploy:"
echo "  https://your-app.onrender.com/        → Legacy UI"
echo "  https://your-app.onrender.com/event/  → Event Section"