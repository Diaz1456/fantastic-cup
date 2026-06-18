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
    container.innerHTML = renderLeaderboardHTML(adminDataCache.leaderboard, adminDataCache.categories);
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
            <button class="avatar-set-btn btn btn-sm" onclick="window.__promptAvatar('${p.username}')">Set</button>
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
          <button class="btn btn-sm" onclick="window.__openPlayerTasks('${p.username}')">📋 Tasks</button>
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
    const url = prompt(`Enter image URL for "${username}":`);
    if (url === null) return;
    if (!url.trim()) {
      const res = await fetch('/api/avatar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, avatar: '' }),
      }).then(r => r.json());
      if (res.success) {
        toast('Avatar cleared');
        renderPlayersTable();
      }
      return;
    }
    const res = await fetch('/api/avatar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, avatar: url.trim() }),
    }).then(r => r.json());
    if (res.success) {
      toast('Avatar updated');
      renderPlayersTable();
    } else {
      toast(res.message || 'Failed to set avatar', 'error');
    }
  };

  window.__openPlayerTasks = async (username) => {
    const section = document.querySelector('#view-admin .nav-btn[data-section="achievements"]');
    if (section) section.click();

    const select = document.getElementById('admin-task-player-select');
    if (select) {
      select.value = username;
      select.dispatchEvent(new Event('change'));
    }

    // Scroll to task manager
    setTimeout(() => {
      const el = document.querySelector('.admin-tasks-section');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 300);
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

  /* ─── ADMIN: Tasks ─── */
  function setupAdminTasks() {
    const select = document.getElementById('admin-task-player-select');
    const taskList = document.getElementById('admin-task-list');
    const addBtn = document.getElementById('btn-admin-add-task');
    const taskInput = document.getElementById('admin-task-input');

    if (!select) return;

    // Populate player select when achievements tab opens
    const loadPlayersIntoSelect = () => {
      select.innerHTML = '<option value="">-- Select a player --</option>';
      adminDataCache.players.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.username;
        opt.textContent = p.username;
        select.appendChild(opt);
      });
    };

    select.addEventListener('change', async () => {
      const player = select.value;
      if (!player) {
        taskList.innerHTML = '<p class="text-muted" style="padding:1rem;text-align:center;">Select a player to manage tasks.</p>';
        return;
      }
      const res = await fetch('/api/tasks/' + encodeURIComponent(player)).then(r => r.json());
      renderAdminTasks(player, res.tasks || []);
    });

    addBtn.addEventListener('click', async () => {
      const player = select.value;
      const text = taskInput.value.trim();
      if (!player) { toast('Select a player first', 'error'); return; }
      if (!text) { toast('Enter a task description', 'error'); return; }

      const res = await fetch('/api/tasks/' + encodeURIComponent(player)).then(r => r.json());
      const tasks = res.tasks || [];
      tasks.push({ id: 'task_' + Date.now(), text, completed: false });

      const saveRes = await fetch('/api/tasks/' + encodeURIComponent(player), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks }),
      }).then(r => r.json());

      if (saveRes.success) {
        taskInput.value = '';
        renderAdminTasks(player, tasks);
        toast('Task added');
      }
    });

    taskInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') addBtn.click();
    });

    // Hook into achievements section being shown to refresh player list
    const achievementsNavBtn = document.querySelector('#view-admin .nav-btn[data-section="achievements"]');
    if (achievementsNavBtn) {
      achievementsNavBtn.addEventListener('click', () => {
        setTimeout(loadPlayersIntoSelect, 100);
      });
    }
  }

  async function renderAdminTasks(player, tasks) {
    const taskList = document.getElementById('admin-task-list');
    if (!tasks || tasks.length === 0) {
      taskList.innerHTML = '<p class="text-muted" style="padding:1rem;text-align:center;">No tasks for this player. Add one above.</p>';
      return;
    }
    taskList.innerHTML = tasks.map(t => `
      <div class="admin-task-item ${t.completed ? 'completed' : ''}">
        <input type="checkbox" ${t.completed ? 'checked' : ''}
          onchange="window.__toggleAdminTask('${player}', '${t.id}', this.checked)">
        <span class="admin-task-text">${t.text}</span>
        <button class="admin-task-del-btn" onclick="window.__deleteAdminTask('${player}', '${t.id}')">✕</button>
      </div>
    `).join('');
  }

  window.__toggleAdminTask = async (player, taskId, completed) => {
    const res = await fetch(`/api/tasks/${encodeURIComponent(player)}/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed }),
    }).then(r => r.json());
    if (res.success) {
      renderAdminTasks(player, res.tasks);
    }
  };

  window.__deleteAdminTask = async (player, taskId) => {
    const res = await fetch('/api/tasks/' + encodeURIComponent(player)).then(r => r.json());
    const tasks = (res.tasks || []).filter(t => t.id !== taskId);
    const saveRes = await fetch('/api/tasks/' + encodeURIComponent(player), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tasks }),
    }).then(r => r.json());
    if (saveRes.success) {
      renderAdminTasks(player, tasks);
      toast('Task removed');
    }
  };

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
  async function renderAdminFullLeaderboard() {
    await refreshAdminData();
    const container = document.getElementById('admin-leaderboard-full');
    container.innerHTML = renderLeaderboardHTML(adminDataCache.leaderboard, adminDataCache.categories);
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
        if (avatarRes.avatar && avatarRes.avatar.trim()) {
          avatarImg.src = avatarRes.avatar;
          avatarImg.style.display = '';
          avatarFallback.style.display = 'none';
        } else {
          avatarImg.style.display = 'none';
          avatarFallback.style.display = '';
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

      // Player Tasks
      try {
        const taskRes = await fetch('/api/tasks/' + encodeURIComponent(authState.username)).then(r => r.json());
        const tasks = taskRes.tasks || [];
        const taskContainer = document.getElementById('player-task-checklist');
        if (tasks.length === 0) {
          taskContainer.innerHTML = '<p class="text-muted" style="padding:0.5rem;font-size:0.85rem;">No tasks assigned yet.</p>';
        } else {
          taskContainer.innerHTML = tasks.map(t => `
            <label class="player-task-item ${t.completed ? 'completed' : ''}">
              <input type="checkbox" ${t.completed ? 'checked' : ''}
                onchange="window.__togglePlayerTask('${t.id}', this.checked)">
              <span class="player-task-text">${t.text}</span>
            </label>
          `).join('');
        }
      } catch {}

      window.__togglePlayerTask = async (taskId, completed) => {
        const res = await fetch(`/api/tasks/${encodeURIComponent(authState.username)}/${taskId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ completed }),
        }).then(r => r.json());
        if (res.success) {
          // Re-render tasks
          const taskContainer = document.getElementById('player-task-checklist');
          taskContainer.innerHTML = res.tasks.map(t => `
            <label class="player-task-item ${t.completed ? 'completed' : ''}">
              <input type="checkbox" ${t.completed ? 'checked' : ''}
                onchange="window.__togglePlayerTask('${t.id}', this.checked)">
              <span class="player-task-text">${t.text}</span>
            </label>
          `).join('');
        }
      };

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
    } catch (err) {
      console.error('Player data refresh failed', err);
    }
  }

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

  /* ─── STARTUP ─── */
  document.addEventListener('DOMContentLoaded', () => {
    // Init particles
    const stopParticles = initParticles();

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

    // ── Admin Tasks Setup ──
    setupAdminTasks();

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

    // ── Admin Change Password ──
    const adminPwToggle = document.getElementById('admin-pw-toggle');
    const adminPwCollapse = document.getElementById('admin-pw-collapse');
    if (adminPwToggle) {
      adminPwToggle.addEventListener('click', () => {
        adminPwToggle.classList.toggle('open');
        adminPwCollapse.classList.toggle('open');
      });
    }
    document.getElementById('admin-password-change-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const msg = document.getElementById('admin-pw-message');
      const currentPassword = document.getElementById('admin-pw-current').value;
      const newPassword = document.getElementById('admin-pw-new').value;
      const confirmPassword = document.getElementById('admin-pw-confirm').value;

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

      const res = await fetch('/admin/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      }).then(r => r.json());

      if (res.success) {
        msg.textContent = 'Admin password updated successfully! It takes effect immediately.';
        msg.className = 'pw-change-message success';
        document.getElementById('admin-password-change-form').reset();
      } else {
        msg.textContent = res.message || 'Failed to update password.';
        msg.className = 'pw-change-message error';
      }
    });

    // Start router
    router.start();
  });

})();
