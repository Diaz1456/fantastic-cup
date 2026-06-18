/* ═══════════════════════════════════════════════
   FANTASTIC CUP – SCORE LEAD
   Main Application Script
   ═══════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ─── CONFIG ─── */
  const API_BASE = '';
  const POLL_INTERVAL = 5000;
  let authState = null;
  let pollTimer = null;
  let isDark = true;

  const QUOTES = [
    '"The only limit to your impact is your imagination and commitment."',
    '"Success is not final, failure is not fatal: it is the courage to continue that counts."',
    '"Believe you can and you\'re halfway there."',
    '"The future belongs to those who believe in the beauty of their dreams."',
    '"Strive not to be a success, but rather to be of value."',
    '"The best way to predict the future is to create it."',
    '"It always seems impossible until it is done."',
    '"Don\'t watch the clock; do what it does. Keep going."',
    '"The secret of getting ahead is getting started."',
    '"Your time is limited, don\'t waste it living someone else\'s life."',
    '"The only way to do great work is to love what you do."',
    '"If you can dream it, you can do it."',
    '"With faith, hard work, and dedication, anything is possible."',
    '"Every champion was once a contender who refused to give up."',
    '"The harder you work, the luckier you get."',
  ];

  /* ─── API SERVICE ─── */
  const API = {
    async request(method, endpoint, body) {
      const opts = {
        method,
        headers: { 'Content-Type': 'application/json' },
      };
      if (body) opts.body = JSON.stringify(body);
      const res = await fetch(API_BASE + endpoint, opts);
      return res.json();
    },
    login: (data) => API.request('POST', '/login', data),
    getPlayers: () => API.request('GET', '/players'),
    addPlayer: (data) => API.request('POST', '/add-player', data),
    deletePlayer: (username) => API.request('DELETE', `/player/${encodeURIComponent(username)}`),
    togglePlayer: (data) => API.request('POST', '/toggle-player', data),
    getCategories: () => API.request('GET', '/achievement-categories'),
    saveCategory: (data) => API.request('POST', '/achievement-category', data),
    deleteCategory: (id) => API.request('DELETE', `/achievement-category/${encodeURIComponent(id)}`),
    updateAchievement: (data) => API.request('POST', '/update-achievement', data),
    getLeaderboard: () => API.request('GET', '/leaderboard'),
    getPlayerAchievements: (player) => API.request('GET', `/achievements/${encodeURIComponent(player)}`),
    sendFeedback: (data) => API.request('POST', '/feedback', data),
    getFeedbacks: () => API.request('GET', '/feedbacks'),
    getPlayerNotes: () => API.request('GET', '/player-notes'),
    savePlayerNotes: (data) => API.request('POST', '/player-notes', data),
  };

  /* ─── ROUTER ─── */
  class Router {
    constructor() {
      this.routes = {};
      window.addEventListener('hashchange', () => this.resolve());
    }
    add(path, handler) {
      this.routes[path] = handler;
    }
    navigate(path) {
      window.location.hash = path;
    }
    resolve() {
      const hash = window.location.hash.slice(1) || 'landing';
      const handler = this.routes[hash];
      if (handler) handler();
    }
    start() {
      this.resolve();
    }
  }

  /* ─── HELPERS ─── */
  function $(sel) { return document.querySelector(sel); }

  function $$(sel) { return document.querySelectorAll(sel); }

  function showView(id) {
    $$('.view').forEach(v => v.classList.remove('active'));
    const el = document.getElementById('view-' + id);
    if (el) el.classList.add('active');
  }

  window.__toast = function (message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const t = document.createElement('div');
    t.className = 'toast ' + type;
    t.textContent = message;
    container.appendChild(t);
    setTimeout(() => { if (t.parentNode) t.parentNode.removeChild(t); }, 3500);
  };
  const toast = window.__toast;

  function formatTime(ts) {
    const d = new Date(ts);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function randomQuote() {
    return QUOTES[Math.floor(Math.random() * QUOTES.length)];
  }

  /* ─── PARTICLE EFFECT (Canvas) ─── */
  function initParticles() {
    const canvas = document.getElementById('particle-canvas');
    const ctx = canvas.getContext('2d');
    let particles = [];
    let animId;

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }

    function createParticles(count) {
      particles = [];
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.4,
          vy: (Math.random() - 0.5) * 0.4,
          r: Math.random() * 2 + 0.5,
          alpha: Math.random() * 0.5 + 0.1,
        });
      }
    }

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = isDark
          ? `rgba(255, 255, 255, ${p.alpha})`
          : `rgba(102, 126, 234, ${p.alpha * 0.4})`;
        ctx.fill();
      });
      animId = requestAnimationFrame(draw);
    }

    resize();
    createParticles(80);
    draw();
    window.addEventListener('resize', () => { resize(); createParticles(80); });
    return () => cancelAnimationFrame(animId);
  }

  /* ─── THEME TOGGLE ─── */
  function toggleTheme() {
    isDark = !isDark;
    document.body.classList.toggle('light-theme', !isDark);
    const btns = $$('#theme-toggle, #theme-toggle-player');
    btns.forEach(b => { b.textContent = isDark ? '🌙' : '☀️'; });
  }

  /* ─── LANDING PAGE SEQUENCE ─── */
  let landingTimer = null;

  function runLandingSequence() {
    const landing = document.getElementById('view-landing');
    landing.style.display = '';
    showView('landing');

    // Skip button
    const skipBtn = document.getElementById('skip-intro');
    const doSkip = () => {
      if (landingTimer) clearTimeout(landingTimer);
      transitionToLogin(landing);
    };
    skipBtn.addEventListener('click', doSkip);
    document.addEventListener('keydown', function onKey(e) {
      if (e.key === 'Enter' || e.key === ' ') {
        document.removeEventListener('keydown', onKey);
        doSkip();
      }
    });

    // After 10 seconds, auto-transition to login
    landingTimer = setTimeout(() => {
      transitionToLogin(landing);
    }, 10000);
  }

  function transitionToLogin(landing) {
    landing.classList.add('fade-out');
    setTimeout(() => {
      landing.classList.remove('fade-out');
      router.navigate('login');
    }, 1000);
  }

  /* ─── LOGIN HANDLER ─── */
  function setupLogin() {
    const form = document.getElementById('login-form');
    const errorEl = document.getElementById('login-error');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      errorEl.classList.remove('show');
      errorEl.textContent = '';
      form.querySelector('.btn').classList.add('loading');

      const data = {
        username: document.getElementById('login-username').value.trim(),
        password: document.getElementById('login-password').value,
        role: document.getElementById('login-role').value,
      };

      const res = await API.login(data);
      form.querySelector('.btn').classList.remove('loading');

      if (res.success) {
        authState = res.user;
        if (res.user.role === 'admin') {
          router.navigate('admin');
        } else {
          router.navigate('player');
        }
      } else {
        errorEl.textContent = res.message || 'Login failed. Check credentials.';
        errorEl.classList.add('show');
      }
    });
  }

  /* ─── ADMIN DASHBOARD ─── */
  let adminDataCache = { players: [], categories: [], feedbacks: [], leaderboard: [], notes: {} };

  async function loadAdminDashboard() {
    showView('admin');
    activateNavSection('dashboard');
    await refreshAdminData();
    renderAdminDashboard();
    renderAdminLeaderboardPreview();
  }

  async function refreshAdminData() {
    try {
      const [playersRes, catRes, fbRes, lbRes, notesRes] = await Promise.all([
        API.getPlayers(),
        API.getCategories(),
        API.getFeedbacks(),
        API.getLeaderboard(),
        API.getPlayerNotes(),
      ]);
      adminDataCache.players = playersRes.players || [];
      adminDataCache.categories = catRes.categories || [];
      adminDataCache.feedbacks = fbRes.feedbacks || [];
      adminDataCache.leaderboard = lbRes.leaderboard || [];
      adminDataCache.notes = notesRes.notes || {};
    } catch (err) {
      toast('Failed to load data', 'error');
    }
  }

  function renderAdminDashboard() {
    const players = adminDataCache.players;
    const cats = adminDataCache.categories;
    const fbs = adminDataCache.feedbacks;
    const lb = adminDataCache.leaderboard;

    document.getElementById('stat-players').textContent = players.length;
    document.getElementById('stat-categories').textContent = cats.length;
    document.getElementById('stat-feedback').textContent = fbs.length;
    document.getElementById('stat-topscore').textContent = lb.length > 0 ? lb[0].total : 0;
  }

  function renderAdminLeaderboardPreview() {
    const container = document.getElementById('admin-lb-preview');
    const top15 = (adminDataCache.leaderboard || []).slice(0, 15);
    container.innerHTML = renderLeaderboardHTML(top15, adminDataCache.categories);
  }

  /* ─── ADMIN: Nav tabs ─── */
  function setupAdminNav() {
    const navBtns = document.querySelectorAll('#view-admin .nav-btn');
    navBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        activateNavSection(btn.dataset.section);
      });
    });
  }

  function activateNavSection(section) {
    $$('#view-admin .nav-btn').forEach(b => b.classList.remove('active'));
    $$('#view-admin .dashboard-section').forEach(s => s.classList.remove('active'));
    const btn = document.querySelector(`#view-admin .nav-btn[data-section="${section}"]`);
    const sec = document.getElementById('section-' + section);
    if (btn) btn.classList.add('active');
    if (sec) sec.classList.add('active');

    // Load section content
    switch (section) {
      case 'players': renderPlayersTable(); break;
      case 'achievements': renderAchievementCategories(); break;
      case 'leaderboard': renderAdminFullLeaderboard(); break;
      case 'feedback': renderFeedbackList(); break;
      default: break;
    }
  }

  /* ─── ADMIN: Players ─── */
  function setupPlayers() {
    document.getElementById('btn-add-player').addEventListener('click', () => {
      const wrapper = document.getElementById('add-player-form-wrapper');
      wrapper.style.display = wrapper.style.display === 'none' ? 'block' : 'none';
    });
    document.getElementById('btn-cancel-add').addEventListener('click', () => {
      document.getElementById('add-player-form-wrapper').style.display = 'none';
    });

    document.getElementById('add-player-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = document.getElementById('new-player-username').value.trim();
      const password = document.getElementById('new-player-password').value;
      if (!username || !password) { toast('Fill all fields', 'error'); return; }
      const res = await API.addPlayer({ username, password });
      if (res.success) {
        toast(`Player "${username}" created!`);
        document.getElementById('add-player-form-wrapper').style.display = 'none';
        document.getElementById('add-player-form').reset();
        await refreshAdminData();
        renderPlayersTable();
        renderAdminDashboard();
      } else {
        toast(res.message || 'Failed to create player', 'error');
      }
    });
  }

  async function renderPlayersTable() {
    await refreshAdminData();
    const tbody = document.getElementById('players-tbody');
    const players = adminDataCache.players;
    const notes = adminDataCache.notes || {};
    if (players.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--text-muted)">No players yet.</td></tr>';
      return;
    }

    const avatarMap = {};
    await Promise.all(players.map(async (p) => {
      try {
        const res = await fetch('/api/avatar/' + encodeURIComponent(p.username)).then(r => r.json());
        avatarMap[p.username] = res.avatar || '';
      } catch { avatarMap[p.username] = ''; }
    }));

    tbody.innerHTML = players.map(p => {
      const playerNotes = notes[p.username] || '';
      const notesId = 'notes-' + p.username.replace(/[^a-zA-Z0-9]/g, '_');
      const avatarUrl = avatarMap[p.username] || '';
      const avatarHtml = avatarUrl
        ? `<img src="${avatarUrl}" class="player-avatar-thumb" style="width:36px;height:36px;border-radius:50%;object-fit:cover;border:2px solid var(--accent);">`
        : `<span style="font-size:1.5rem;">👤</span>`;
      return `
      <tr>
        <td><strong>${p.username}</strong></td>
        <td>
          <div class="avatar-cell">
            ${avatarHtml}
            <div class="avatar-cell-actions">
              <button class="avatar-set-btn btn btn-sm" onclick="window.__promptAvatar('${p.username}')">Set</button>
              ${avatarUrl ? `<button class="avatar-remove-btn-sm btn btn-sm" onclick="window.__removeAvatar('${p.username}')">✕</button>` : ''}
            </div>
          </div>
        </td>
        <td><span class="status-badge ${p.enabled !== false ? 'active' : 'disabled'}">${p.enabled !== false ? 'Active' : 'Disabled'}</span></td>
        <td>
          <div class="player-notes-textarea-wrapper">
            <textarea class="player-notes-textarea" id="${notesId}" placeholder="Write notes for ${p.username}..." rows="2">${playerNotes}</textarea>
            <button class="notes-save-btn" onclick="window.__saveNotes('${p.username}', '${notesId}')">Save</button>
          </div>
        </td>
        <td>
          <button class="btn btn-sm" onclick="window.__setPlayerPassword('${p.username}')">🔑 Set</button>
        </td>
        <td class="actions-cell">
          <button class="btn btn-sm ${p.enabled !== false ? 'btn-secondary' : 'btn-primary'}" onclick="window.__togglePlayer('${p.username}')">
            ${p.enabled !== false ? 'Disable' : 'Enable'}
          </button>
          <button class="btn btn-sm btn-danger" onclick="window.__deletePlayer('${p.username}')">Delete</button>
        </td>
      </tr>
    `}).join('');
  }

  window.__promptAvatar = async (username) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg,image/png,image/gif';
    input.onchange = async () => {
      const file = input.files[0];
      if (!file) return;
      if (file.size > 2 * 1024 * 1024) {
        toast('File too large. Max 2MB.', 'error');
        return;
      }
      const formData = new FormData();
      formData.append('avatar', file);
      formData.append('username', username);
      const res = await fetch('/api/avatar/upload', {
        method: 'POST',
        body: formData,
      }).then(r => r.json());
      if (res.success) {
        toast('Avatar uploaded!');
        renderPlayersTable();
      } else {
        toast(res.message || 'Upload failed', 'error');
      }
    };
    input.click();
  };

  window.__removeAvatar = async (username) => {
    if (!confirm(`Remove avatar for "${username}"?`)) return;
    const res = await fetch('/api/avatar/remove', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username }),
    }).then(r => r.json());
    if (res.success) {
      toast('Avatar removed');
      renderPlayersTable();
    } else {
      toast('Failed to remove avatar', 'error');
    }
  };

  window.__setPlayerPassword = async (username) => {
    const newPassword = prompt(`Enter new password for "${username}":`);
    if (!newPassword || newPassword.length < 4) {
      toast('Password must be at least 4 characters.', 'error');
      return;
    }
    const confirmPw = prompt('Confirm new password:');
    if (newPassword !== confirmPw) {
      toast('Passwords do not match.', 'error');
      return;
    }
    const res = await fetch('/api/admin/set-player-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerUsername: username, newPassword }),
    }).then(r => r.json());
    if (res.success) {
      toast(res.message || 'Password updated!');
    } else {
      toast(res.message || 'Failed to update password.', 'error');
    }
  };

  window.__saveNotes = async (username, notesId) => {
    const textarea = document.getElementById(notesId);
    if (!textarea) return;
    const notes = textarea.value;
    const btn = textarea.parentElement.querySelector('.notes-save-btn');
    btn.textContent = 'Saving...';
    const res = await API.savePlayerNotes({ username, notes });
    if (res.success) {
      btn.textContent = '✓ Saved';
      btn.classList.add('saved');
      setTimeout(() => {
        btn.textContent = 'Save';
        btn.classList.remove('saved');
      }, 2000);
      toast('Notes saved for ' + username);
    } else {
      btn.textContent = 'Save';
      toast('Failed to save notes', 'error');
    }
  };

  window.__togglePlayer = async (username) => {
    const res = await API.togglePlayer({ username });
    if (res.success) {
      toast(res.enabled ? 'Player enabled' : 'Player disabled');
      await refreshAdminData();
      renderPlayersTable();
    }
  };

  window.__deletePlayer = async (username) => {
    if (!confirm(`Delete player "${username}"? This cannot be undone.`)) return;
    const res = await API.deletePlayer(username);
    if (res.success) {
      toast(`Player "${username}" deleted`);
      await refreshAdminData();
      renderPlayersTable();
      renderAdminDashboard();
    } else {
      toast(res.message || 'Delete failed', 'error');
    }
  };

  /* ─── ADMIN: Daily Task ─── */
  function setupAdminDailyTask() {
    const setBtn = document.getElementById('btn-admin-set-daily-task');
    const input = document.getElementById('admin-daily-task-input');
    if (!setBtn) return;

    setBtn.addEventListener('click', async () => {
      const text = input.value.trim();
      if (!text) { toast('Enter a task description', 'error'); return; }
      const res = await fetch('/api/daily-task/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      }).then(r => r.json());
      if (res.success) {
        toast('Daily task text updated!');
        input.value = '';
        loadDailyTaskLog();
      } else {
        toast('Failed to update', 'error');
      }
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') setBtn.click();
    });

    const achievementsNavBtn = document.querySelector('#view-admin .nav-btn[data-section="achievements"]');
    if (achievementsNavBtn) {
      achievementsNavBtn.addEventListener('click', () => {
        setTimeout(() => {
          loadDailyTaskConfig();
          loadDailyTaskLog();
        }, 100);
      });
    }
  }

  async function loadDailyTaskConfig() {
    try {
      const res = await fetch('/api/daily-task/config').then(r => r.json());
      const input = document.getElementById('admin-daily-task-input');
      if (input) input.placeholder = 'Current: ' + (res.text || 'Daily Task');
    } catch {}
  }

  async function loadDailyTaskLog() {
    const container = document.getElementById('admin-daily-task-log');
    if (!container) return;
    try {
      const res = await fetch('/api/daily-task/log').then(r => r.json());
      const completions = res.completions || [];
      const text = res.text || 'Daily Task';
      if (completions.length === 0) {
        container.innerHTML = '<p class="text-muted" style="padding:0.5rem;text-align:center;">No completions yet.</p>';
        return;
      }
      container.innerHTML = '<table class="data-table compact"><thead><tr><th>Player</th><th>Date</th><th>Time</th></tr></thead><tbody>' +
        completions.map(c => `
          <tr>
            <td><strong>${c.playerUsername}</strong></td>
            <td>${c.date}</td>
            <td>${new Date(c.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
          </tr>
        `).join('') + '</tbody></table>';
    } catch {
      container.innerHTML = '<p class="text-muted" style="padding:0.5rem;">Failed to load log.</p>';
    }
  }

  /* ─── ADMIN: Achievement Categories ─── */
  function setupAchievementCategories() {
    document.getElementById('btn-add-category').addEventListener('click', async () => {
      const res = await API.saveCategory({ title: 'New Category' });
      if (res.success) {
        await refreshAdminData();
        renderAchievementCategories();
        toast('Category added');
      }
    });
  }

  async function renderAchievementCategories() {
    await refreshAdminData();
    const container = document.getElementById('achievement-categories');
    const cats = adminDataCache.categories;
    const players = adminDataCache.players;

    if (cats.length === 0) {
      container.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:2rem;">No categories. Click "+ Add Category" to start.</p>';
      return;
    }

    // Fetch achievements for all players
    const achPromises = players.map(p => API.getPlayerAchievements(p.username));
    const achResults = await Promise.all(achPromises);
    const achMap = {};
    players.forEach((p, i) => {
      achMap[p.username] = achResults[i].achievements || {};
    });

    container.innerHTML = cats.map(cat => {
      const catAchs = players.map(p => ({
        username: p.username,
        value: achMap[p.username][cat.id] || 0,
      }));

      return `
        <div class="achievement-card" data-cat-id="${cat.id}">
          <div class="achievement-card-header">
            <input type="text" class="achievement-title-input" value="${cat.title}" data-cat-id="${cat.id}" placeholder="Category title">
            <div class="achievement-card-actions">
              <button class="delete-cat-btn" onclick="window.__deleteCategory('${cat.id}')">✕</button>
            </div>
          </div>
          <div class="achievement-values">
            ${catAchs.map(a => `
              <div class="achievement-row">
                <span class="player-name">${a.username}</span>
                <input type="range" min="0" max="100" value="${a.value}"
                  data-player="${a.username}" data-cat="${cat.id}"
                  oninput="window.__updateAchSlider(this)">
                <input type="number" min="0" max="99999" value="${a.value}"
                  data-player="${a.username}" data-cat="${cat.id}"
                  onchange="window.__updateAchNumber(this)"
                  class="achievement-number-input">
                <span class="achievement-value-display" id="disp-${a.username}-${cat.id}">${a.value}</span>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }).join('');

    // Title inline editing
    container.querySelectorAll('.achievement-title-input').forEach(input => {
      input.addEventListener('change', async () => {
        const catId = input.dataset.catId;
        const title = input.value.trim() || 'Untitled';
        await API.saveCategory({ id: catId, title });
        toast('Category renamed');
      });
    });
  }

  window.__updateAchSlider = async (slider) => {
    const player = slider.dataset.player;
    const catId = slider.dataset.cat;
    const value = slider.value;
    const display = document.getElementById(`disp-${player}-${catId}`);
    if (display) display.textContent = value;

    // Sync number input with slider
    const row = slider.closest('.achievement-row');
    const numInput = row ? row.querySelector('.achievement-number-input') : null;
    if (numInput) numInput.value = value;

    const res = await API.updateAchievement({ playerUsername: player, categoryId: catId, value: Number(value) });
    if (res.success) {
      adminDataCache.leaderboard = res.leaderboard;
    }
  };

  window.__updateAchNumber = async (input) => {
    const player = input.dataset.player;
    const catId = input.dataset.cat;
    let value = parseInt(input.value) || 0;
    if (value < 0) value = 0;

    const display = document.getElementById(`disp-${player}-${catId}`);
    if (display) display.textContent = value;

    // Sync slider with number input
    const row = input.closest('.achievement-row');
    const slider = row ? row.querySelector('input[type="range"]') : null;
    if (slider) slider.value = value;

    const res = await API.updateAchievement({ playerUsername: player, categoryId: catId, value });
    if (res.success) {
      adminDataCache.leaderboard = res.leaderboard;
    }
  };

  window.__deleteCategory = async (id) => {
    if (!confirm('Delete this category? All values will be lost.')) return;
    const res = await API.deleteCategory(id);
    if (res.success) {
      toast('Category deleted');
      await refreshAdminData();
      renderAchievementCategories();
    }
  };

  /* ─── ADMIN: Full Leaderboard ─── */
  async function renderAdminFullLeaderboard(query = '') {
    await refreshAdminData();
    const container = document.getElementById('admin-leaderboard-full');
    let data = adminDataCache.leaderboard;
    if (query) {
      const q = query.toLowerCase();
      data = data.filter(e => e.username.toLowerCase().includes(q));
    }
    if (data.length === 0) {
      container.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:2rem;">No players match your search.</p>';
      return;
    }
    container.innerHTML = renderLeaderboardHTML(data, adminDataCache.categories);
  }

  /* ─── ADMIN: Feedback List ─── */
  async function renderFeedbackList() {
    await refreshAdminData();
    const container = document.getElementById('feedback-list');
    const fbs = adminDataCache.feedbacks;
    if (fbs.length === 0) {
      container.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:2rem;">No feedback received yet.</p>';
      return;
    }
    container.innerHTML = fbs.map(fb => `
      <div class="feedback-item">
        <div class="feedback-item-header">
          <span class="feedback-author">${fb.player}</span>
          <span class="feedback-time">${formatTime(fb.timestamp)}</span>
        </div>
        <div class="feedback-text">${fb.message}</div>
      </div>
    `).join('');
  }

  /* ─── LEADERBOARD RENDERER ─── */
  function renderLeaderboardHTML(leaderboard, categories) {
    if (!leaderboard || leaderboard.length === 0) {
      return '<p style="color:var(--text-muted);text-align:center;padding:2rem;">No data yet.</p>';
    }
    const maxScore = Math.max(...leaderboard.map(e => e.total), 1);
    return leaderboard.map((entry, i) => {
      const rank = i + 1;
      const rankClass = rank === 1 ? 'lb-rank-1' : rank === 2 ? 'lb-rank-2' : rank === 3 ? 'lb-rank-3' : 'lb-rank-other';
      const topClass = rank === 1 ? 'lb-top1' : rank === 2 ? 'lb-top2' : rank === 3 ? 'lb-top3' : '';
      const pct = (entry.total / maxScore) * 100;
      const delay = i * 0.06;
      const medal = rank === 1 ? '👑' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '👤';
      return `
        <div class="lb-card ${topClass}" style="animation-delay:${delay}s">
          <div class="lb-rank ${rankClass}">${rank}</div>
          <div class="lb-avatar">${medal}</div>
          <div class="lb-info">
            <div class="lb-name">${entry.username}</div>
            <div class="lb-score-bar-wrapper">
              <div class="lb-score-bar">
                <div class="lb-score-bar-fill" style="width:${pct}%"></div>
              </div>
              <span class="lb-score">${entry.total}</span>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  /* ─── CSV EXPORT ─── */
  function setupCSVExport() {
    document.getElementById('btn-export-csv')?.addEventListener('click', () => {
      window.open(API_BASE + '/leaderboard/csv', '_blank');
      toast('Downloading CSV...');
    });
  }

  /* ─── PLAYER DASHBOARD ─── */
  let playerPollActive = false;

  async function loadPlayerDashboard() {
    if (!authState) return;
    showView('player');
    document.getElementById('player-name-display').textContent = authState.username;
    document.querySelector('.player-greeting').innerHTML =
      `Welcome, <strong>${authState.username}</strong>`;

    // Set random quote
    document.getElementById('motivational-quote').textContent = randomQuote();

    await refreshPlayerData();
    startPlayerPolling();
  }

  async function refreshPlayerData() {
    try {
      const [lbRes, achRes, notesRes] = await Promise.all([
        API.getLeaderboard(),
        API.getPlayerAchievements(authState.username),
        API.getPlayerNotes(),
      ]);

      const leaderboard = lbRes.leaderboard || [];
      const categories = lbRes.categories || [];
      const playerAch = achRes.achievements || {};
      const playerCats = achRes.categories || [];

      // Player Hero (shows the logged-in player - biggest name on the page)
      const myEntry = leaderboard.find(e => e.username === authState.username);
      const myTotal = myEntry ? myEntry.total : 0;
      const myRank = leaderboard.findIndex(e => e.username === authState.username) + 1;

      document.getElementById('hero-name').textContent = authState.username;
      document.getElementById('hero-score').textContent = myTotal;

      // Load avatar
      try {
        const avatarRes = await fetch('/api/avatar/' + encodeURIComponent(authState.username)).then(r => r.json());
        const avatarImg = document.getElementById('hero-avatar-img');
        const avatarFallback = document.getElementById('hero-avatar-fallback');
        const removeBtn = document.getElementById('player-avatar-remove');
        if (avatarRes.avatar && avatarRes.avatar.trim()) {
          avatarImg.src = avatarRes.avatar;
          avatarImg.style.display = '';
          avatarFallback.style.display = 'none';
          if (removeBtn) removeBtn.style.display = '';
        } else {
          avatarImg.style.display = 'none';
          avatarFallback.style.display = '';
          if (removeBtn) removeBtn.style.display = 'none';
        }
      } catch {};

      document.getElementById('hero-badge').textContent = '🏅 YOUR SCORE';

      const rankInfo = document.getElementById('hero-rank-info');
      if (myRank > 0) {
        rankInfo.innerHTML = `You're ranked <strong>#${myRank}</strong> out of ${leaderboard.length} players`;
      } else {
        rankInfo.innerHTML = '';
      }

      // Leaderboard
      const lbContainer = document.getElementById('player-leaderboard');
      lbContainer.innerHTML = renderLeaderboardHTML(leaderboard, categories);

      // Coach Notes
      const notesData = notesRes.notes || {};
      const myNotes = notesData[authState.username];
      const notesCard = document.getElementById('player-notes-card');
      const notesText = document.getElementById('player-notes-text');
      if (myNotes && myNotes.trim()) {
        notesCard.style.display = 'block';
        notesText.textContent = myNotes;
      } else {
        notesCard.style.display = 'none';
      }

      // Player's own achievements
      const achContainer = document.getElementById('player-achievements');
      const catList = categories.length > 0 ? categories : playerCats;
      if (catList.length === 0) {
        achContainer.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:2rem;">No achievement categories yet — ask your admin to set them up.</p>';
      } else {
        const allValues = catList.map(cat => Number(playerAch[cat.id]) || 0);
        const maxAch = Math.max(...allValues, 1);
        achContainer.innerHTML = catList.map(cat => {
          const val = Number(playerAch[cat.id]) || 0;
          const pct = (val / maxAch) * 100;
          return `
          <div class="player-ach-card glass">
            <div class="player-ach-title">${cat.title}</div>
            <div class="player-ach-value">${val}</div>
            <div class="player-ach-bar-wrapper">
              <div class="player-ach-bar-fill" style="width:${pct}%"></div>
            </div>
          </div>
        `}).join('');
      }

      // Coin balance inside achievements
      try {
        const coinRes = await fetch('/api/coins/balance/' + encodeURIComponent(authState.username)).then(r => r.json());
        const coinBal = document.getElementById('player-coin-balance-ach');
        if (coinBal) {
          coinBal.textContent = coinRes.balance || 0;
          const parent = coinBal.closest('.coin-balance-display');
          if (parent) {
            parent.classList.add('coin-jingle');
            setTimeout(() => parent.classList.remove('coin-jingle'), 600);
          }
        }
      } catch {}

      // Daily Task
      renderDailyTask();
    } catch (err) {
      console.error('Player data refresh failed', err);
    }
  }

  async function renderDailyTask() {
    const container = document.getElementById('player-daily-task');
    const checkbox = document.getElementById('daily-task-checkbox');
    const textEl = document.getElementById('daily-task-text');
    const hintEl = document.getElementById('daily-task-hint');
    if (!checkbox) return;
    try {
      const res = await fetch('/api/daily-task/status/' + encodeURIComponent(authState.username)).then(r => r.json());
      textEl.textContent = res.text || 'Daily Task';
      if (res.completed) {
        checkbox.checked = true;
        checkbox.disabled = true;
        hintEl.textContent = 'Completed for today ✓ — Resets at 6:00 AM';
        if (container) container.classList.add('completed');
      } else {
        checkbox.checked = false;
        checkbox.disabled = false;
        hintEl.textContent = 'Resets at 6:00 AM';
        if (container) container.classList.remove('completed');
      }
    } catch {
      textEl.textContent = 'Failed to load';
    }
  }

  document.addEventListener('change', async (e) => {
    if (e.target.id === 'daily-task-checkbox' && e.target.checked) {
      e.target.disabled = true;
      const res = await fetch('/api/daily-task/check/' + encodeURIComponent(authState.username), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }).then(r => r.json());
      if (res.success) {
        window.__playSound && window.__playSound('dailyTaskComplete');
        renderDailyTask();
      } else {
        toast(res.message || 'Failed', 'error');
        e.target.checked = false;
        e.target.disabled = false;
      }
    }
  });

  function startPlayerPolling() {
    if (pollTimer) clearInterval(pollTimer);
    playerPollActive = true;
    pollTimer = setInterval(async () => {
      if (!playerPollActive) return;
      await refreshPlayerData();
    }, POLL_INTERVAL);
  }

  function stopPlayerPolling() {
    playerPollActive = false;
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  }

  /* ─── PLAYER: Feedback ─── */
  function setupPlayerFeedback() {
    const toggle = document.getElementById('feedback-toggle');
    const collapse = document.getElementById('feedback-collapse');

    toggle.addEventListener('click', () => {
      toggle.classList.toggle('open');
      collapse.classList.toggle('open');
    });

    document.getElementById('feedback-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const message = document.getElementById('feedback-message').value.trim();
      if (!message) { toast('Please write a message', 'error'); return; }

      const res = await API.sendFeedback({ player: authState.username, message });
      if (res.success) {
        toast('Feedback sent! Thank you.');
        document.getElementById('feedback-form').reset();
        collapse.classList.remove('open');
        toggle.classList.remove('open');
      } else {
        toast('Failed to send feedback', 'error');
      }
    });
  }

  /* ─── PUBLIC LEADERBOARD ─── */
  async function loadPublicLeaderboard() {
    showView('leaderboard');
    const res = await API.getLeaderboard();
    const container = document.getElementById('public-leaderboard');
    container.innerHTML = renderLeaderboardHTML(res.leaderboard || [], res.categories || []);
  }

  /* ─── LOGOUT ─── */
  function setupLogout() {
    const logoutButtons = $$('#logout-btn, #logout-btn-player, #back-from-lb');
    logoutButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        stopPlayerPolling();
        authState = null;
        router.navigate('login');
      });
    });
  }

  /* ─── INIT ROUTER ─── */
  const router = new Router();

  router.add('landing', runLandingSequence);
  router.add('login', () => {
    stopPlayerPolling();
    authState = null;
    showView('login');
  });
  router.add('admin', () => {
    if (!authState || authState.role !== 'admin') {
      router.navigate('login');
      return;
    }
    loadAdminDashboard();
  });
  router.add('player', () => {
    if (!authState || authState.role !== 'player') {
      router.navigate('login');
      return;
    }
    loadPlayerDashboard();
  });
  router.add('leaderboard', loadPublicLeaderboard);

  /* ─── SOUND MANAGER ─── */
  const SoundManager = {
    _ctx: null,
    _enabled: true,

    init() {
      this._enabled = localStorage.getItem('fc_sound') !== 'off';
      const toggle = document.getElementById('sound-toggle');
      if (toggle) toggle.checked = this._enabled;
    },

    _getCtx() {
      if (!this._ctx) {
        const Ctor = window.AudioContext || window.webkitAudioContext;
        if (!Ctor) return null;
        this._ctx = new Ctor();
      }
      return this._ctx;
    },

    _play(freq, duration, type = 'sine', vol = 0.15) {
      if (!this._enabled) return;
      const ctx = this._getCtx();
      if (!ctx) return;
      if (ctx.state === 'suspended') ctx.resume();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(vol, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + duration);
    },

    _playTone(freq, duration, type, vol, startDelay = 0) {
      if (!this._enabled) return;
      const ctx = this._getCtx();
      if (!ctx) return;
      if (ctx.state === 'suspended') ctx.resume();
      const now = ctx.currentTime + startDelay;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(vol, now + 0.01);
      gain.gain.setValueAtTime(vol, now + duration * 0.6);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + duration + 0.02);
    },

    click() {
      this._playTone(1200, 0.06, 'sine', 0.06);
      this._playTone(800, 0.04, 'sine', 0.04, 0.02);
    },
    check() {
      this._playTone(880, 0.1, 'sine', 0.08);
      this._playTone(1320, 0.12, 'sine', 0.07, 0.06);
    },
    dailyTaskComplete() {
      this._playTone(523, 0.1, 'triangle', 0.1);
      this._playTone(659, 0.1, 'triangle', 0.1, 0.08);
      this._playTone(784, 0.15, 'triangle', 0.1, 0.16);
      this._playTone(1047, 0.25, 'triangle', 0.08, 0.26);
    },
    coin() {
      this._playTone(1100, 0.06, 'sine', 0.08);
      this._playTone(1380, 0.06, 'sine', 0.07, 0.04);
      this._playTone(1650, 0.08, 'sine', 0.06, 0.08);
      this._playTone(1980, 0.14, 'sine', 0.05, 0.12);
    },
    notification() {
      this._playTone(660, 0.08, 'sine', 0.06);
      this._playTone(880, 0.06, 'sine', 0.05, 0.06);
      this._playTone(660, 0.12, 'sine', 0.05, 0.1);
    },
    toggle() {
      this._enabled = !this._enabled;
      localStorage.setItem('fc_sound', this._enabled ? 'on' : 'off');
      const toggle = document.getElementById('sound-toggle');
      if (toggle) toggle.checked = this._enabled;
      if (this._enabled) this.click();
    },
  };

  window.__playSound = (name) => {
    if (SoundManager[name]) SoundManager[name]();
  };

  // Hook global clicks for click sound
  document.addEventListener('click', (e) => {
    if (e.target.closest('button') || e.target.closest('.nav-btn') || e.target.closest('.toggle-switch') || e.target.closest('summary')) {
      if (SoundManager._enabled) SoundManager.click();
    }
  });

  // Hook checkboxes for check sound
  document.addEventListener('change', (e) => {
    if (e.target.type === 'checkbox' && SoundManager._enabled) {
      SoundManager.check();
    }
  });

  /* ─── STARTUP ─── */
  document.addEventListener('DOMContentLoaded', () => {
    // Init particles
    const stopParticles = initParticles();

    // Init sounds
    SoundManager.init();

    // Setup login
    setupLogin();

    // Setup admin
    setupAdminNav();
    setupPlayers();
    setupAchievementCategories();
    setupCSVExport();

    // Setup player
    setupPlayerFeedback();

    // Setup logout
    setupLogout();

    // Theme toggle
    const themeBtns = $$('#theme-toggle, #theme-toggle-player');
    themeBtns.forEach(btn => btn.addEventListener('click', toggleTheme));

    // ── Change Password ──
    const pwToggle = document.getElementById('password-toggle');
    const pwCollapse = document.getElementById('password-collapse');
    if (pwToggle) {
      pwToggle.addEventListener('click', () => {
        pwToggle.classList.toggle('open');
        pwCollapse.classList.toggle('open');
      });
    }
    document.getElementById('password-change-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const msg = document.getElementById('pw-change-message');
      const currentPassword = document.getElementById('pw-current').value;
      const newPassword = document.getElementById('pw-new').value;
      const confirmPassword = document.getElementById('pw-confirm').value;

      msg.className = 'pw-change-message';
      msg.textContent = '';

      if (!currentPassword || !newPassword || !confirmPassword) {
        msg.textContent = 'All fields required.';
        msg.className = 'pw-change-message error';
        return;
      }
      if (newPassword !== confirmPassword) {
        msg.textContent = 'New passwords do not match.';
        msg.className = 'pw-change-message error';
        return;
      }
      if (newPassword.length < 4) {
        msg.textContent = 'Password must be at least 4 characters.';
        msg.className = 'pw-change-message error';
        return;
      }

      const res = await fetch('/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: authState.username, currentPassword, newPassword }),
      }).then(r => r.json());

      if (res.success) {
        msg.textContent = 'Password updated successfully!';
        msg.className = 'pw-change-message success';
        document.getElementById('password-change-form').reset();
      } else {
        msg.textContent = res.message || 'Failed to update password.';
        msg.className = 'pw-change-message error';
      }
    });

    // ── Admin Daily Task Setup ──
    setupAdminDailyTask();
    loadDailyTaskConfig();

    // ── Coin Awarding ──
    document.getElementById('btn-award-coins')?.addEventListener('click', async () => {
      const playerUsername = document.getElementById('coin-player-input').value.trim();
      const amount = parseInt(document.getElementById('coin-amount-input').value);
      const stamp = document.getElementById('coin-stamp-select').value;
      if (!playerUsername || !amount) { toast('Enter player and amount', 'error'); return; }
      const res = await fetch('/api/coins/award', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerUsername, amount, stamp, note: 'Admin award' }),
      }).then(r => r.json());
      if (res.success) {
        toast(`Awarded ${amount} 🪙 to ${playerUsername}`);
        document.getElementById('coin-player-input').value = '';
        document.getElementById('coin-amount-input').value = '';
        window.__loadCoinLeaderboard();
      } else {
        toast(res.message || 'Failed', 'error');
      }
    });

    document.querySelectorAll('.quick-coin')?.forEach(btn => {
      btn.addEventListener('click', () => {
        document.getElementById('coin-amount-input').value = btn.dataset.amount;
      });
    });

    // Coin history toggle inside achievements
    document.getElementById('coin-history-toggle-ach')?.addEventListener('click', async () => {
      const collapse = document.getElementById('coin-history-collapse-ach');
      const toggle = document.getElementById('coin-history-toggle-ach');
      toggle.classList.toggle('open');
      collapse.classList.toggle('open');
      if (collapse.classList.contains('open') && authState) {
        const res = await fetch('/api/coins/history/' + encodeURIComponent(authState.username)).then(r => r.json());
        const container = document.getElementById('player-coin-history-ach');
        if (res.transactions && res.transactions.length > 0) {
          container.innerHTML = res.transactions.map(tx => `
            <div class="coin-history-item">
              <span class="coin-tx-stamp">${tx.stamp || '⭐'}</span>
              <span class="coin-tx-amount">+${tx.amount}</span>
              <span class="coin-tx-note">${tx.note || ''}</span>
              <span class="coin-tx-time">${new Date(tx.timestamp).toLocaleDateString()}</span>
            </div>
          `).join('');
        } else {
          container.innerHTML = '<p class="text-muted">No coins yet.</p>';
        }
      }
    });

    // ── War Password Gate ──
    const warBtn = document.getElementById('event-war-btn');
    const warOverlay = document.getElementById('war-password-overlay');
    const warInput = document.getElementById('war-password-input');
    const warSubmit = document.getElementById('war-pw-submit');
    const warCancel = document.getElementById('war-pw-cancel');
    const warError = document.getElementById('war-pw-error');

    if (warBtn) {
      warBtn.addEventListener('click', () => {
        window.location.href = '/event/';
      });
    }

    const closeWarGate = () => {
      warOverlay.style.display = 'none';
      warInput.value = '';
    };

    const submitWarPassword = async () => {
      const pw = warInput.value;
      if (!pw) {
        warError.textContent = 'Access code required.';
        warError.style.display = 'block';
        return;
      }
      try {
        const res = await fetch('/api/verify-war-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: pw }),
        }).then(r => r.json());

        if (res.granted) {
          localStorage.setItem('warToken', res.token);
          closeWarGate();
          window.location.href = '/event/';
        } else {
          warError.textContent = 'Invalid access code.';
          warError.style.display = 'block';
          warInput.value = '';
          warInput.focus();
        }
      } catch {
        warError.textContent = 'Connection error.';
        warError.style.display = 'block';
      }
    };

    if (warSubmit) warSubmit.addEventListener('click', submitWarPassword);
    if (warCancel) warCancel.addEventListener('click', closeWarGate);
    if (warInput) {
      warInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') submitWarPassword();
        if (e.key === 'Escape') closeWarGate();
      });
    }

    // Admin nav EVENT button also goes directly to the event page
    const warBtnAdmin = document.getElementById('event-war-btn-admin');
    if (warBtnAdmin) {
      warBtnAdmin.addEventListener('click', () => {
        window.location.href = '/event/';
      });
    }

    // Coin leaderboard refresh
    window.__loadCoinLeaderboard = async function () {
      const res = await fetch('/api/coins/leaderboard').then(r => r.json());
      const container = document.getElementById('coin-leaderboard-admin');
      if (!container) return;
      if (!res.balances || res.balances.length === 0) {
        container.innerHTML = '<p class="text-muted">No coins awarded yet.</p>';
        return;
      }
      container.innerHTML = '<table class="data-table compact"><thead><tr><th>Player</th><th>Coins</th></tr></thead><tbody>' +
        res.balances.slice(0, 20).map(b => `<tr><td>${b._id}</td><td><strong>${b.total}</strong> 🪙</td></tr>`).join('') +
        '</tbody></table>';
    };

    // Load coin leaderboard when achievements tab is shown
    const achievementsBtn = document.querySelector('#view-admin .nav-btn[data-section="achievements"]');
    if (achievementsBtn) {
      achievementsBtn.addEventListener('click', () => {
        setTimeout(() => window.__loadCoinLeaderboard(), 500);
      });
    }

    // ── Reset Coin Leaderboard ──
    document.getElementById('btn-reset-coins')?.addEventListener('click', async () => {
      if (!confirm('Are you sure you want to reset the coin leaderboard? This will set all coin balances to zero.')) return;
      const btn = document.getElementById('btn-reset-coins');
      btn.textContent = 'Resetting...';
      btn.disabled = true;
      const res = await fetch('/api/coins/reset', { method: 'POST' }).then(r => r.json());
      if (res.success) {
        toast(res.message || 'Coin leaderboard reset!');
        window.__loadCoinLeaderboard();
        // Refresh player coin balances if viewing player
        if (authState && authState.role === 'player') {
          refreshPlayerData();
        }
      } else {
        toast(res.message || 'Failed to reset', 'error');
      }
      btn.textContent = '🔄 Reset Coin Leaderboard';
      btn.disabled = false;
    });

    // ── Socket Listeners ──
    const socket = io();

    socket.on('dailyTask:completed', (data) => {
      if (!data) return;
      const msg = `✅ ${data.player} completed daily task: "${data.text}"`;
      toast(msg, 'success');
      SoundManager.notification();
      if (authState && authState.role === 'admin') {
        loadDailyTaskLog();
      }
    });

    socket.on('dailyTask:configUpdate', (text) => {
      const input = document.getElementById('admin-daily-task-input');
      if (input) input.placeholder = 'Current: ' + text;
    });

    // ── Socket coin award listener ──
    socket.on('coins:awarded', (data) => {
      SoundManager.coin();
      const bal = document.getElementById('player-coin-balance-ach');
      if (bal) {
        bal.textContent = data.balance;
        const parent = bal.closest('.coin-balance-display');
        if (parent) {
          parent.classList.add('coin-jingle');
          setTimeout(() => parent.classList.remove('coin-jingle'), 600);
        }
      }
    });

    // ── Player Avatar Upload ──
    document.getElementById('player-avatar-upload')?.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      if (file.size > 2 * 1024 * 1024) {
        toast('File too large. Max 2MB.', 'error');
        return;
      }
      const formData = new FormData();
      formData.append('avatar', file);
      formData.append('username', authState.username);
      const res = await fetch('/api/avatar/upload', {
        method: 'POST',
        body: formData,
      }).then(r => r.json());
      if (res.success) {
        toast('Photo uploaded!');
        refreshPlayerData();
      } else {
        toast(res.message || 'Upload failed', 'error');
      }
    });

    document.getElementById('player-avatar-remove')?.addEventListener('click', async () => {
      if (!confirm('Remove your profile photo?')) return;
      const res = await fetch('/api/avatar/remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: authState.username }),
      }).then(r => r.json());
      if (res.success) {
        toast('Photo removed');
        refreshPlayerData();
      } else {
        toast('Failed to remove photo', 'error');
      }
    });

    // ── Sound Toggle ──
    document.getElementById('sound-toggle')?.addEventListener('change', (e) => {
      SoundManager._enabled = e.target.checked;
      localStorage.setItem('fc_sound', SoundManager._enabled ? 'on' : 'off');
      if (SoundManager._enabled) SoundManager.click();
    });

    // ── Leaderboard Search ──
    document.getElementById('admin-lb-search')?.addEventListener('input', (e) => {
      renderAdminFullLeaderboard(e.target.value.trim());
    });

    // ── Admin Change Own Password (in Players tab) ──
    document.getElementById('btn-admin-change-pw')?.addEventListener('click', async () => {
      const current = document.getElementById('admin-pw-current').value;
      const newPw = document.getElementById('admin-pw-new').value;
      const confirmPw = document.getElementById('admin-pw-confirm').value;
      const msg = document.getElementById('admin-pw-message');
      msg.className = 'pw-change-message';
      msg.textContent = '';
      if (!current || !newPw || !confirmPw) {
        msg.textContent = 'All fields required.';
        msg.className = 'pw-change-message error';
        return;
      }
      if (newPw !== confirmPw) {
        msg.textContent = 'Passwords do not match.';
        msg.className = 'pw-change-message error';
        return;
      }
      if (newPw.length < 4) {
        msg.textContent = 'Password must be at least 4 characters.';
        msg.className = 'pw-change-message error';
        return;
      }
      const res = await fetch('/admin/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: current, newPassword: newPw }),
      }).then(r => r.json());
      if (res.success) {
        msg.textContent = 'Admin password updated successfully!';
        msg.className = 'pw-change-message success';
        document.getElementById('admin-pw-current').value = '';
        document.getElementById('admin-pw-new').value = '';
        document.getElementById('admin-pw-confirm').value = '';
      } else {
        msg.textContent = res.message || 'Failed to update.';
        msg.className = 'pw-change-message error';
      }
    });

    // ── Hall of Fame ──
    function openHallOfFame() {
      const leaderboard = adminDataCache.leaderboard;
      const top3 = leaderboard.slice(0, 3).map(e => ({
        username: e.username,
        total: e.total,
      }));
      // Fetch avatars for top 3
      Promise.all(top3.map(async (p) => {
        try {
          const res = await fetch('/api/avatar/' + encodeURIComponent(p.username)).then(r => r.json());
          p.avatarUrl = res.avatar || '';
        } catch { p.avatarUrl = ''; }
      })).then(() => {
        if (window.startHallOfFame) {
          window.startHallOfFame(top3);
        } else {
          toast('Hall of Fame loading...', 'info');
          const check = setInterval(() => {
            if (window.startHallOfFame) {
              clearInterval(check);
              window.startHallOfFame(top3);
            }
          }, 200);
        }
      });
    }

    document.getElementById('btn-hof-admin')?.addEventListener('click', openHallOfFame);
    document.getElementById('btn-hof-player')?.addEventListener('click', async () => {
      const lbRes = await API.getLeaderboard();
      const top3 = (lbRes.leaderboard || []).slice(0, 3).map(e => ({
        username: e.username,
        total: e.total,
        avatarUrl: '',
      }));
      Promise.all(top3.map(async (p) => {
        try {
          const res = await fetch('/api/avatar/' + encodeURIComponent(p.username)).then(r => r.json());
          p.avatarUrl = res.avatar || '';
        } catch { p.avatarUrl = ''; }
      })).then(() => {
        if (window.startHallOfFame) {
          window.startHallOfFame(top3);
        } else {
          const check = setInterval(() => {
            if (window.startHallOfFame) {
              clearInterval(check);
              window.startHallOfFame(top3);
            }
          }, 200);
        }
      });
    });

    // Start router
    router.start();
  });

})();
