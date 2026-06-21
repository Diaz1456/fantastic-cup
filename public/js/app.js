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
    applyTheme();
    localStorage.setItem('fc_theme', isDark ? 'dark' : 'light');
  }

  function applyTheme() {
    document.body.classList.toggle('light-theme', !isDark);
    const btns = $$('#theme-toggle, #theme-toggle-player');
    btns.forEach(b => { b.textContent = isDark ? '🌙' : '☀️'; });
  }

  // Restore saved theme on load
  const savedTheme = localStorage.getItem('fc_theme');
  if (savedTheme === 'light') {
    isDark = false;
  }
  // Apply after DOM ready so elements exist
  if (typeof document !== 'undefined' && document.body) {
    applyTheme();
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
        if (typeof startHeartbeat === 'function') startHeartbeat();
        // Notify server of login for presence tracking
        fetch('/api/presence/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: res.user.username }),
        }).catch(() => {});
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
    fetchLeaderboardAvatars(top15).then(avatarMap => {
      container.innerHTML = renderLeaderboardHTML(top15, adminDataCache.categories, avatarMap, true);
    });
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

    const cacheBust = Date.now();
    const avatarMap = {};
    await Promise.all(players.map(async (p) => {
      try {
        const res = await fetch('/api/avatar/' + encodeURIComponent(p.username) + '?t=' + cacheBust).then(r => r.json());
        avatarMap[p.username] = res.avatar ? res.avatar + '?t=' + cacheBust : '';
      } catch { avatarMap[p.username] = ''; }
    }));

    tbody.innerHTML = players.map(p => {
      const playerNotes = notes[p.username] || '';
      const notesId = 'notes-' + p.username.replace(/[^a-zA-Z0-9]/g, '_');
      const avatarUrl = avatarMap[p.username] || '';
      const avatarHtml = avatarUrl
        ? `<span class="avatar-loading" style="display:inline-flex;width:36px;height:36px;border-radius:50%;overflow:hidden;flex-shrink:0;border:2px solid var(--accent);"><img src="${avatarUrl}" style="width:100%;height:100%;object-fit:cover;" onload="this.parentElement.classList.remove('avatar-loading')" onerror="this.parentElement.classList.remove('avatar-loading');this.style.display='none'" loading="lazy"></span>`
        : `<span style="font-size:1.5rem;">👤</span>`;
      return `
      <tr>
        <td><strong class="player-stats-trigger" data-username="${p.username}">${p.username}</strong></td>
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

  let _avatarInputActive = false;

  window.__promptAvatar = async (username) => {
    if (_avatarInputActive) {
      toast('Please finish the current upload first.', 'info');
      return;
    }
    _avatarInputActive = true;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg,image/png,image/gif';
    input.onchange = async () => {
      const file = input.files[0];
      if (!file) { _avatarInputActive = false; return; }
      if (file.size > 2 * 1024 * 1024) {
        toast('File too large. Max 2MB.', 'error');
        _avatarInputActive = false;
        return;
      }
      const formData = new FormData();
      formData.append('avatar', file);
      formData.append('username', username);
      try {
        const res = await fetch('/api/avatar/upload?t=' + Date.now(), {
          method: 'POST',
          body: formData,
        }).then(r => r.json());
        if (res.success) {
          toast('Avatar uploaded for ' + username + '!');
          renderPlayersTable();
        } else {
          toast(res.message || 'Upload failed', 'error');
        }
      } catch {
        toast('Upload failed', 'error');
      }
      _avatarInputActive = false;
    };
    setTimeout(() => { _avatarInputActive = false; }, 120000);
    input.click();
  };

  window.__removeAvatar = async (username) => {
    if (!confirm(`Remove avatar for "${username}"?`)) return;
    const res = await fetch('/api/avatar/remove?t=' + Date.now(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username }),
    }).then(r => r.json());
    if (res.success) {
      toast('Avatar removed for ' + username);
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
                <span class="player-name player-stats-trigger" data-username="${a.username}">${a.username}</span>
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
    const avatarMap = await fetchLeaderboardAvatars(data);
    container.innerHTML = renderLeaderboardHTML(data, adminDataCache.categories, avatarMap, true);
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
  function renderLeaderboardHTML(leaderboard, categories, avatarMap, animate, opts = {}) {
    if (!leaderboard || leaderboard.length === 0) {
      return '<p style="color:var(--text-muted);text-align:center;padding:2rem;">No data yet.</p>';
    }
    const maxScore = Math.max(...leaderboard.map(e => e.total), 1);
    const displayLb = opts.topN ? leaderboard.slice(0, opts.topN) : leaderboard;
    const totalPlayers = leaderboard.length;
    return displayLb.map((entry, i) => {
      const rank = i + 1;
      const rankClass = rank === 1 ? 'lb-rank-1' : rank === 2 ? 'lb-rank-2' : rank === 3 ? 'lb-rank-3' : 'lb-rank-other';
      const topClass = rank === 1 ? 'lb-top1' : rank === 2 ? 'lb-top2' : rank === 3 ? 'lb-top3' : '';
      const pct = (entry.total / maxScore) * 100;
      const delay = i * 0.06;
      const medal = rank === 1 ? '👑' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '👤';
      const avatarUrl = avatarMap ? (avatarMap[entry.username] || '') : '';
      const avatarHtml = avatarUrl
        ? `<span class="avatar-loading" style="display:inline-flex;width:44px;height:44px;border-radius:50%;overflow:hidden;flex-shrink:0;"><img src="${avatarUrl}" class="lb-avatar-img" onload="this.parentElement.classList.remove('avatar-loading')" onerror="this.parentElement.classList.remove('avatar-loading');this.style.display='none'" loading="lazy"></span>`
        : `<span class="lb-avatar-emoji">${medal}</span>`;
      return `
        <div class="lb-card ${topClass}${animate ? ' lb-animate' : ''}" style="${animate ? `animation-delay:${delay}s` : ''}">
          <div class="lb-rank ${rankClass}">${rank}</div>
          <div class="lb-avatar player-stats-trigger" data-username="${entry.username}">
            ${avatarHtml}
          </div>
          <div class="lb-info">
            <div class="lb-name player-stats-trigger" data-username="${entry.username}">${entry.username}<span class="lb-badges-placeholder" data-username="${entry.username}"></span></div>
            <div class="lb-score-bar-wrapper">
              <div class="lb-score-bar">
                <div class="lb-score-bar-fill" style="width:${pct}%"></div>
              </div>
              <span class="lb-score">${entry.total}</span>
            </div>
          </div>
        </div>
      `;
    }).join('') + (opts.showPersonalRank && opts.playerEntry && opts.playerRank > 0 && opts.playerRank > (opts.topN || 0) ? `
      <div class="lb-card lb-personal-rank-card">
        <div class="lb-rank lb-rank-other">${opts.playerRank}</div>
        <div class="lb-avatar">
          <span class="lb-avatar-emoji">🎯</span>
        </div>
        <div class="lb-info">
          <div class="lb-name lb-personal-rank-name">${opts.playerEntry.username}<span class="lb-badges-placeholder" data-username="${opts.playerEntry.username}"></span></div>
          <div class="lb-score-bar-wrapper">
            <div class="lb-score-bar">
              <div class="lb-score-bar-fill" style="width:${(opts.playerEntry.total / maxScore) * 100}%"></div>
            </div>
            <span class="lb-score">${opts.playerEntry.total}</span>
          </div>
          <div class="lb-personal-rank-label">Your Rank · ${totalPlayers} players</div>
        </div>
      </div>
    ` : '');
  }

  async function fetchLeaderboardAvatars(leaderboard) {
    const avatarMap = {};
    await Promise.all(leaderboard.map(async (entry) => {
      try {
        const res = await fetch('/api/avatar/' + encodeURIComponent(entry.username) + '?t=' + Date.now()).then(r => r.json());
        avatarMap[entry.username] = res.avatar || '';
      } catch {
        avatarMap[entry.username] = '';
      }
    }));
    return avatarMap;
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

    document.getElementById('motivational-quote').textContent = randomQuote();

    _lastLbHash = '';
    _lbRendered = false;
    await refreshPlayerData();
    await refreshPlayerMeta();
    loadPlayerBadges();
    loadLeaderboardBadges();
    loadPlayerTeams();
    startPlayerPolling();
  }

  async function refreshPlayerData() {
    // Full refresh on initial load (avatar, coins, daily task, etc.)
    // Leaderboard is handled by refreshPlayerMeta on poll
    try {
      const [lbRes, achRes, notesRes] = await Promise.all([
        API.getLeaderboard(),
        API.getPlayerAchievements(authState.username),
        API.getPlayerNotes(),
      ]);
      const leaderboard = lbRes.leaderboard || [];
      const playerAch = achRes.achievements || {};

      // Avatar
      try {
        const avatarRes = await fetch('/api/avatar/' + encodeURIComponent(authState.username) + '?t=' + Date.now()).then(r => r.json());
        const avatarImg = document.getElementById('hero-avatar-img');
        const avatarFallback = document.getElementById('hero-avatar-fallback');
        const removeBtn = document.getElementById('player-avatar-remove');
        if (avatarRes.avatar && avatarRes.avatar.trim()) {
          avatarImg.src = avatarRes.avatar + '?t=' + Date.now();
          avatarImg.style.display = '';
          avatarImg.onload = function () {
            const wrapper = this.closest('.hero-avatar-img-wrap');
            if (wrapper) wrapper.classList.remove('avatar-loading');
          };
          avatarImg.onerror = function () {
            const wrapper = this.closest('.hero-avatar-img-wrap');
            if (wrapper) wrapper.classList.remove('avatar-loading');
            this.style.display = 'none';
            if (avatarFallback) avatarFallback.style.display = '';
          };
          const wrapper = avatarImg.closest('.hero-avatar-img-wrap');
          if (wrapper) wrapper.classList.add('avatar-loading');
          avatarFallback.style.display = 'none';
          if (removeBtn) removeBtn.style.display = '';
        } else {
          avatarImg.style.display = 'none';
          const wrapper = avatarImg.closest('.hero-avatar-img-wrap');
          if (wrapper) wrapper.classList.remove('avatar-loading');
          avatarFallback.style.display = '';
          if (removeBtn) removeBtn.style.display = 'none';
        }
      } catch {};

      // Coin balance
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

      // Daily task
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

  let _lastLbHash = '';
  let _lbRendered = false;

  function _lbHash(data) {
    return data.map(e => e.username + ':' + e.total).join('|');
  }

  function startPlayerPolling() {
    if (pollTimer) clearInterval(pollTimer);
    playerPollActive = true;
    pollTimer = setInterval(async () => {
      if (!playerPollActive) return;
      await refreshPlayerMeta();
    }, POLL_INTERVAL);
  }

  async function refreshPlayerMeta() {
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

      // Update player-specific data
      const myEntry = leaderboard.find(e => e.username === authState.username);
      const myTotal = myEntry ? myEntry.total : 0;
      const myRank = leaderboard.findIndex(e => e.username === authState.username) + 1;
      document.getElementById('hero-name').textContent = authState.username;
      document.getElementById('hero-score').textContent = myTotal;
      document.getElementById('hero-badge').textContent = '🏅 YOUR SCORE';

      const rankInfo = document.getElementById('hero-rank-info');
      if (myRank > 0) {
        rankInfo.innerHTML = `You're ranked <strong>#${myRank}</strong> out of ${leaderboard.length} players`;
      } else {
        rankInfo.innerHTML = '';
      }

      // Check if leaderboard needs update
      const newHash = _lbHash(leaderboard);
      if (newHash !== _lastLbHash || !_lbRendered) {
        _lastLbHash = newHash;
        const shouldAnimate = !_lbRendered;
        _lbRendered = true;
        const lbContainer = document.getElementById('player-leaderboard');
        const avatarMap = await fetchLeaderboardAvatars(leaderboard);
        lbContainer.innerHTML = renderLeaderboardHTML(leaderboard, categories, avatarMap, shouldAnimate, {
          topN: 5,
          showPersonalRank: true,
          playerEntry: myEntry,
          playerRank: myRank,
        });
      }

      // Bottom 3 danger zone alarm
      const bottom3 = leaderboard.slice(-3);
      const inDanger = myEntry && bottom3.some(e => e.username === authState.username);
      const dangerEl = document.getElementById('danger-zone-overlay');
      if (inDanger && myRank > 0) {
        dangerEl.style.display = '';
        SoundManager.alarmStart();
      } else {
        dangerEl.style.display = 'none';
        SoundManager.alarmStop();
      }

      // Player achievements
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
    } catch (err) {
      console.error('Player meta refresh failed', err);
    }
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
    const lb = res.leaderboard || [];
    const cats = res.categories || [];
    const avatarMap = await fetchLeaderboardAvatars(lb);
    container.innerHTML = renderLeaderboardHTML(lb, cats, avatarMap, true);
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

  /* ─── PLAYER STATS PANEL ─── */
  let _statsPlayer = null;

  function openPlayerStats(username) {
    if (!username) return;
    _statsPlayer = username;
    const overlay = document.getElementById('stats-panel-overlay');
    const panel = document.getElementById('stats-panel');
    const content = document.getElementById('stats-panel-content');
    if (!overlay || !panel || !content) return;
    overlay.style.display = 'flex';
    content.innerHTML = '<div class="stats-loading"><span class="stats-spinner"></span> Loading stats...</div>';
    requestAnimationFrame(() => {
      panel.classList.add('stats-panel-open');
      overlay.classList.add('stats-overlay-visible');
    });
    fetchStats(username);
  }

  function closePlayerStats() {
    const overlay = document.getElementById('stats-panel-overlay');
    const panel = document.getElementById('stats-panel');
    if (overlay) overlay.style.display = 'none';
    if (panel) panel.classList.remove('stats-panel-open');
    _statsPlayer = null;
  }

  async function fetchStats(username) {
    const content = document.getElementById('stats-panel-content');
    try {
      const res = await fetch('/api/player/' + encodeURIComponent(username) + '/stats').then(r => r.json());
      if (!res || !res.username) {
        content.innerHTML = '<div class="stats-error">Failed to load stats.</div>';
        return;
      }
      const isAdmin = authState && authState.role === 'admin';
      const isSelf = authState && authState.username === username;
      const showNote = isAdmin || isSelf;
      const c = window.RARITY_COLORS || {};

      let html = '<div class="stats-header">';
      html += '<div class="stats-avatar-wrap">';
      if (res.avatarUrl) {
        html += `<img src="${res.avatarUrl}" class="stats-avatar-img" onerror="this.style.display='none'">`;
        html += '<span class="stats-avatar-fallback" style="display:none;">👤</span>';
      } else {
        html += '<span class="stats-avatar-fallback">👤</span>';
      }
      html += '</div>';
      html += `<div class="stats-name-row">`;
      html += `<h2 class="stats-name">${res.username}</h2>`;
      html += `<span class="stats-coin-badge"><span class="stats-coin-icon">🪙</span> ${res.coinBalance}</span>`;
      html += `</div>`;
      html += '</div>';

      // Badges section
      if (res.badges && res.badges.length > 0) {
        html += '<div class="stats-section"><h3 class="stats-section-title">🏅 Badges</h3><div class="stats-badges-row">';
        for (const b of res.badges) {
          const bc = c[b.rarity] || c.common || { bg: 'rgba(180,180,190,0.15)', border: '#b4b4be', text: '#b4b4be' };
          const legendaryClass = b.rarity === 'legendary' ? 'stats-badge-legendary' : '';
          html += `<div class="stats-badge ${legendaryClass}" style="border-color:${bc.border};background:${bc.bg}" title="${b.description || ''}">`;
          html += `<span class="stats-badge-icon">${b.icon}</span>`;
          html += `<span class="stats-badge-name" style="color:${bc.text}">${b.name}</span>`;
          html += `<span class="stats-badge-rarity" style="background:${bc.border}">${b.rarity.toUpperCase()}</span>`;
          html += `</div>`;
        }
        html += '</div></div>';
      } else {
        html += '<div class="stats-section"><h3 class="stats-section-title">🏅 Badges</h3><p class="stats-empty">No badges earned yet</p></div>';
      }

      // Achievements section
      html += '<div class="stats-section"><h3 class="stats-section-title">📊 Achievements</h3>';
      const cats = res.categories || [];
      const ach = res.achievements || {};
      if (cats.length > 0) {
        const allVals = cats.map(c => Number(ach[c.id]) || 0);
        const maxVal = Math.max(...allVals, 1);
        html += '<div class="stats-ach-grid">';
        for (const cat of cats) {
          const val = Number(ach[cat.id]) || 0;
          const pct = (val / maxVal) * 100;
          html += `<div class="stats-ach-item">`;
          html += `<div class="stats-ach-title">${cat.title}</div>`;
          html += `<div class="stats-ach-value">${val}</div>`;
          html += `<div class="stats-ach-bar"><div class="stats-ach-bar-fill" style="width:${pct}%"></div></div>`;
          html += `</div>`;
        }
        html += '</div>';
      } else {
        html += '<p class="stats-empty">No achievement categories configured.</p>';
      }
      html += '</div>';

      // Daily streak
      html += '<div class="stats-section"><h3 class="stats-section-title">🔥 Daily Streak</h3>';
      const streak = res.dailyStreak || 0;
      html += `<div class="stats-streak-display"><span class="stats-streak-count">${streak}</span><span class="stats-streak-label">day${streak !== 1 ? 's' : ''}</span></div>`;
      html += '</div>';

      // Admin note
      if (showNote && res.adminNote && res.adminNote.trim()) {
        html += '<div class="stats-section"><h3 class="stats-section-title">📋 Message from Admin</h3>';
        html += `<div class="stats-note">${res.adminNote}</div>`;
        html += '</div>';
      }

      content.innerHTML = html;
    } catch {
      content.innerHTML = '<div class="stats-error">Failed to load player stats.</div>';
    }
  }

  // Delegated click handler for player stats triggers
  document.addEventListener('click', function (e) {
    const trigger = e.target.closest('.player-stats-trigger, .lb-name, .lb-avatar, .lb-avatar-emoji, .hof-card-name, .hof-card-avatar, .hof-card-avatar-fallback, .hof-card-avatar-img, .achievement-row .player-name');
    if (trigger) {
      const username = trigger.dataset.username || trigger.textContent.trim();
      if (username && !e.target.closest('.lb-badges-placeholder, .badge-lb-icon, .badge-icon-sm')) {
        e.preventDefault();
        e.stopPropagation();
        openPlayerStats(username);
      }
    }
  });

  // Close button
  document.getElementById('stats-panel-close')?.addEventListener('click', closePlayerStats);

  // Click overlay to close
  document.getElementById('stats-panel-overlay')?.addEventListener('click', function (e) {
    if (e.target === this) closePlayerStats();
  });

  // Escape key to close
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closePlayerStats();
  });

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

    // ── Countdown / Alarm Sounds ──

    alarmStart() {
      this._alarmInterval = setInterval(() => {
        this._playTone(180, 0.3, 'sawtooth', 0.08);
        this._playTone(160, 0.3, 'sawtooth', 0.06, 0.15);
      }, 600);
    },

    alarmStop() {
      if (this._alarmInterval) { clearInterval(this._alarmInterval); this._alarmInterval = null; }
    },

    countdownStart() {
      this._playTone(200, 0.6, 'sawtooth', 0.12);
      this._playTone(150, 0.4, 'sawtooth', 0.08, 0.1);
    },

    countdownBeep() {
      this._playTone(1000, 0.08, 'square', 0.06);
    },

    countdownFinalBeep() {
      this._playTone(600, 0.15, 'square', 0.1);
    },

    countdownZero() {
      this._playTone(300, 0.3, 'sawtooth', 0.15);
      this._playTone(200, 0.5, 'sawtooth', 0.12, 0.15);
      this._playTone(100, 0.8, 'sawtooth', 0.1, 0.3);
      // Second burst
      setTimeout(() => {
        this._playTone(400, 0.2, 'square', 0.12);
        this._playTone(250, 0.3, 'square', 0.1, 0.1);
      }, 500);
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

  /* ─── BADGES FUNCTIONS ─── */

  const RARITY_COLORS = {
    common: { bg: 'rgba(180,180,190,0.15)', border: '#b4b4be', text: '#b4b4be', glow: 'rgba(180,180,190,0.3)' },
    rare: { bg: 'rgba(59,130,246,0.15)', border: '#3b82f6', text: '#60a5fa', glow: 'rgba(59,130,246,0.3)' },
    epic: { bg: 'rgba(168,85,247,0.15)', border: '#a855f7', text: '#c084fc', glow: 'rgba(168,85,247,0.3)' },
    legendary: { bg: 'rgba(245,158,11,0.15)', border: '#f59e0b', text: '#fbbf24', glow: 'rgba(245,158,11,0.5)' },
  };
  window.RARITY_COLORS = RARITY_COLORS;

  // Admin: Load badges management UI
  async function loadBadgesAdmin() {
    const container = document.getElementById('badges-admin-container');
    if (!container) return;
    try {
      const [badgesRes, playersRes] = await Promise.all([
        fetch('/api/badges').then(r => r.json()),
        fetch('/players').then(r => r.json()),
      ]);
      const badges = badgesRes.badges || [];
      const players = playersRes.players || [];
      const assRes = await fetch('/api/badges/assignments').then(r => r.json());
      const assignments = assRes.assignments || {};

      let html = '<div class="badges-admin-toolbar">';
      html += '<button class="btn btn-primary btn-sm" onclick="window.__showCreateBadge()">+ Create Badge</button>';
      html += '</div>';
      html += '<div id="badge-create-form" style="display:none;margin-bottom:1rem;"></div>';
      html += '<div class="badges-grid">';
      for (const b of badges) {
        const c = RARITY_COLORS[b.rarity] || RARITY_COLORS.common;
        html += `<div class="badge-admin-card" style="border-color:${c.border};background:${c.bg}">`;
        html += `<div class="badge-admin-icon">${b.icon}</div>`;
        html += `<div class="badge-admin-info">`;
        html += `<div class="badge-admin-name" style="color:${c.text}">${b.name}</div>`;
        html += `<div class="badge-admin-rarity" style="color:${c.text}">${b.rarity.toUpperCase()}</div>`;
        html += `<div class="badge-admin-desc">${b.description || ''}</div>`;
        html += `</div>`;
        html += `<div class="badge-admin-actions">`;
        html += `<button class="btn btn-sm" onclick="window.__editBadge('${b.id}')">✏️</button>`;
        html += `<button class="btn btn-sm btn-danger" onclick="window.__deleteBadge('${b.id}')">✕</button>`;
        html += `</div>`;
        html += `</div>`;
        // Assign section
        html += `<div class="badge-assign-row" style="padding:0.25rem 0.5rem 0.5rem 0.5rem;border-left:2px solid ${c.border}">`;
        html += `<select class="badge-assign-select" id="badge-assign-${b.id}" style="margin-right:0.25rem;">`;
        html += `<option value="">Assign to...</option>`;
        for (const p of players) {
          const has = (assignments[p.username] || []).some(ab => ab.id === b.id);
          html += `<option value="${p.username}" ${has ? 'disabled' : ''}>${p.username} ${has ? '(has)' : ''}</option>`;
        }
        html += `</select>`;
        html += `<button class="btn btn-sm btn-primary" onclick="window.__assignBadge('${b.id}')">+</button>`;
        // Show holders with remove buttons
        const holders = Object.entries(assignments).filter(([, list]) => list.some(ab => ab.id === b.id)).map(([u]) => u);
        if (holders.length > 0) {
          html += `<span style="margin-left:0.5rem;font-size:0.75rem;color:${c.text}">`;
          html += `Holders: `;
          html += holders.map(h =>
            `<span class="badge-holder-tag" style="display:inline-flex;align-items:center;gap:0.2rem;margin:0.1rem 0.2rem;padding:0.1rem 0.4rem;border-radius:4px;background:rgba(255,255,255,0.06);">${h}<button class="btn-badge-remove" onclick="window.__removeBadgeFromPlayer('${b.id}','${h}')" title="Remove ${b.name} from ${h}" style="background:none;border:none;cursor:pointer;color:#ef4444;font-size:0.7rem;padding:0;line-height:1;">✕</button></span>`
          ).join('');
          html += `</span>`;
        }
        html += `</div>`;
      }
      html += '</div>';
      container.innerHTML = html;
    } catch { container.innerHTML = '<p class="text-muted">Failed to load badges.</p>'; }
  }

  window.__showCreateBadge = function () {
    const form = document.getElementById('badge-create-form');
    form.style.display = form.style.display === 'none' ? 'block' : 'none';
    if (form.style.display === 'block') {
      form.innerHTML = `
        <div class="badge-create-form glass" style="padding:1rem;">
          <h4 style="margin-bottom:0.5rem;color:var(--accent)">Create New Badge</h4>
          <div style="display:flex;gap:0.5rem;flex-wrap:wrap;margin-bottom:0.5rem;">
            <input type="text" id="badge-new-name" placeholder="Badge name" class="admin-input" style="flex:1;min-width:120px;">
            <select id="badge-new-rarity" class="admin-input" style="width:120px;">
              <option value="common">Common</option>
              <option value="rare">Rare</option>
              <option value="epic">Epic</option>
              <option value="legendary">Legendary</option>
            </select>
            <input type="text" id="badge-new-icon" placeholder="Icon emoji" class="admin-input" style="width:60px;" value="🏅">
          </div>
          <input type="text" id="badge-new-desc" placeholder="Description" class="admin-input" style="width:100%;margin-bottom:0.5rem;">
          <div style="display:flex;gap:0.5rem;">
            <button class="btn btn-primary btn-sm" onclick="window.__createBadge()">Create</button>
            <button class="btn btn-sm" onclick="document.getElementById('badge-create-form').style.display='none'">Cancel</button>
          </div>
        </div>
      `;
    }
  };

  window.__createBadge = async function () {
    const name = document.getElementById('badge-new-name').value.trim();
    const rarity = document.getElementById('badge-new-rarity').value;
    const icon = document.getElementById('badge-new-icon').value.trim() || '🏅';
    const description = document.getElementById('badge-new-desc').value.trim();
    if (!name) return toast('Enter a badge name.', 'error');
    const res = await fetch('/api/badges/create', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, rarity, icon, description }),
    }).then(r => r.json());
    if (res.success) {
      toast('Badge created!');
      document.getElementById('badge-create-form').style.display = 'none';
      loadBadgesAdmin();
    } else {
      toast(res.message || 'Failed', 'error');
    }
  };

  window.__editBadge = async function (id) {
    const name = prompt('Badge name:');
    if (!name) return;
    const rarity = prompt('Rarity (common/rare/epic/legendary):');
    if (!rarity) return;
    const icon = prompt('Icon emoji:');
    const description = prompt('Description:');
    const res = await fetch('/api/badges/update', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, name, rarity, icon, description }),
    }).then(r => r.json());
    if (res.success) { toast('Badge updated!'); loadBadgesAdmin(); }
    else toast(res.message || 'Failed', 'error');
  };

  window.__deleteBadge = async function (id) {
    if (!confirm('Delete this badge? It will be removed from all players.')) return;
    const res = await fetch('/api/badges/delete', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    }).then(r => r.json());
    if (res.success) { toast('Badge deleted.'); loadBadgesAdmin(); }
    else toast(res.message || 'Failed', 'error');
  };

  window.__assignBadge = async function (badgeId) {
    const select = document.getElementById('badge-assign-' + badgeId);
    const username = select.value;
    if (!username) return toast('Select a player.', 'error');
    const res = await fetch('/api/badges/assign', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, badgeId }),
    }).then(r => r.json());
    if (res.success) { toast(`Assigned to ${username}!`); loadBadgesAdmin(); }
    else toast(res.message || 'Failed', 'error');
  };

  window.__removeBadgeFromPlayer = async function (badgeId, username) {
    const badgesRes = await fetch('/api/badges').then(r => r.json());
    const badge = (badgesRes.badges || []).find(b => b.id === badgeId);
    const badgeName = badge ? badge.name : badgeId;
    if (!confirm(`Remove "${badgeName}" from ${username}?`)) return;
    const res = await fetch('/api/badges/remove', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, badgeId }),
    }).then(r => r.json());
    if (res.success) { toast(`Removed "${badgeName}" from ${username}`); loadBadgesAdmin(); }
    else toast(res.message || 'Failed', 'error');
  };

  // Leaderboard badges helper
  async function loadLeaderboardBadges() {
    try {
      const assRes = await fetch('/api/badges/assignments').then(r => r.json());
      const assignments = assRes.assignments || {};
      document.querySelectorAll('.lb-badges-placeholder').forEach(placeholder => {
        const username = placeholder.dataset.username;
        const userBadges = assignments[username] || [];
        if (userBadges.length > 0) {
          let badgeHtml = '';
          for (const b of userBadges) {
            const c = RARITY_COLORS[b.rarity] || RARITY_COLORS.common;
            const legendaryClass = b.rarity === 'legendary' ? 'badge-lb-legendary' : '';
            badgeHtml += `<span class="badge-lb-icon ${legendaryClass}" style="border-color:${c.border}" title="${b.name}: ${b.description || ''}">${b.icon}</span>`;
          }
          placeholder.innerHTML = badgeHtml;
        }
      });
    } catch {}
  }

  // Player: Load badges display
  async function loadPlayerBadges() {
    if (!authState) return;
    const container = document.getElementById('player-badges-display');
    const heroContainer = document.getElementById('hero-badges-display');
    try {
      const res = await fetch('/api/badges/player/' + encodeURIComponent(authState.username)).then(r => r.json());
      const badges = res.badges || [];
      // Player dashboard section badges
      if (container) {
        if (badges.length === 0) {
          container.innerHTML = '<div class="badges-empty"><span class="badge-locked">🔒</span><span class="badges-empty-text">No badges earned yet</span></div>';
        } else {
          let html = '<div class="player-badges-grid">';
          for (const b of badges) {
            const c = RARITY_COLORS[b.rarity] || RARITY_COLORS.common;
            const legendaryClass = b.rarity === 'legendary' ? 'badge-legendary-glow' : '';
            html += `<div class="player-badge ${legendaryClass}" style="border-color:${c.border};background:${c.bg}">`;
            html += `<div class="player-badge-icon">${b.icon}</div>`;
            html += `<div class="player-badge-info">`;
            html += `<div class="player-badge-name" style="color:${c.text}">${b.name}</div>`;
            html += `<div class="player-badge-rarity" style="color:${c.text}">${b.rarity.toUpperCase()}</div>`;
            html += `<div class="player-badge-desc">${b.description || ''}</div>`;
            html += `</div>`;
            html += `</div>`;
          }
          html += '</div>';
          container.innerHTML = html;
        }
      }
      // Hero section - large prominent badges
      if (heroContainer) {
        if (badges.length === 0) {
          heroContainer.innerHTML = '';
        } else {
          let html = '<div class="hero-badges-row">';
          for (const b of badges) {
            const c = RARITY_COLORS[b.rarity] || RARITY_COLORS.common;
            const legendaryClass = b.rarity === 'legendary' ? 'badge-hero-legendary' : '';
            html += `<div class="hero-badge-item ${legendaryClass}" style="border-color:${c.border};background:${c.bg}" title="${b.name}: ${b.description || ''}">`;
            html += `<span class="hero-badge-icon">${b.icon}</span>`;
            html += `<span class="hero-badge-label" style="color:${c.text}">${b.name}</span>`;
            html += `<span class="hero-badge-rarity-tag" style="background:${c.border}">${b.rarity.toUpperCase()}</span>`;
            html += `</div>`;
          }
          html += '</div>';
          heroContainer.innerHTML = html;
        }
      }
    } catch {
      if (container) container.innerHTML = '';
    }
  }

  /* ─── TEAMS FUNCTIONS ─── */

  async function loadTeamsAdmin() {
    const container = document.getElementById('teams-admin-container');
    if (!container) return;
    try {
      const res = await fetch('/api/teams').then(r => r.json());
      const teams = res.teams || [];
      const playersRes = await fetch('/players').then(r => r.json());
      const allPlayers = playersRes.players || [];

      let html = `
      <div class="teams-grid">
        <div class="team-create-card glass">
          <h4>Create Team</h4>
          <div class="team-create-form">
            <input type="text" id="team-create-name" placeholder="Team name" class="form-input" />
            <input type="text" id="team-create-logo" placeholder="Emoji logo (e.g. 🦅)" class="form-input" style="max-width:80px" />
            <input type="color" id="team-create-color" value="#667eea" class="form-input" style="width:60px;height:40px;padding:2px" />
            <button class="btn btn-primary btn-sm" id="btn-team-create-submit">Create</button>
          </div>
        </div>
      `;
      for (const team of teams) {
        html += `
        <div class="team-card glass" data-team-id="${team.id}" style="border-left:4px solid ${team.color}">
          <div class="team-card-header">
            <span class="team-logo">${team.logo}</span>
            <span class="team-name">${team.name}</span>
            <div class="team-actions">
              <button class="btn btn-sm btn-icon team-edit-btn" data-team-id="${team.id}" title="Edit Team">✏️</button>
              <button class="btn btn-sm btn-icon team-delete-btn" data-team-id="${team.id}" title="Delete Team">🗑️</button>
            </div>
          </div>
          <div class="team-members">
            <div class="team-members-title">Members (${team.members.length})</div>
            <div class="team-member-list">
              ${team.members.map(m => `
                <span class="team-member-tag">
                  ${m}
                  <button class="team-member-remove" data-team-id="${team.id}" data-username="${m}">✕</button>
                </span>
              `).join('')}
            </div>
            <div class="team-add-member">
              <select class="form-input team-member-select" data-team-id="${team.id}">
                <option value="">Add member...</option>
                ${allPlayers.map(p => `<option value="${p.username}">${p.username}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="team-stats">
            <label class="team-stat-label">Silver Coins</label>
            <input type="number" class="form-input team-silver-input" data-team-id="${team.id}" value="${team.silverCoins || 0}" min="0" />
            <textarea class="form-input team-notes-input" data-team-id="${team.id}" placeholder="Team notes...">${team.notes || ''}</textarea>
            <button class="btn btn-sm btn-primary team-save-btn" data-team-id="${team.id}">Save</button>
          </div>
        </div>`;
      }
      html += '</div>';
      container.innerHTML = html;
      attachTeamAdminEvents(allPlayers);
    } catch (e) {
      container.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:2rem;">Failed to load teams.</p>';
      console.error('Teams admin load failed', e);
    }
  }

  function attachTeamAdminEvents(allPlayers) {
    // Create team
    const createBtn = document.getElementById('btn-team-create-submit');
    if (createBtn) {
      createBtn.addEventListener('click', async () => {
        const name = document.getElementById('team-create-name').value.trim();
        const logo = document.getElementById('team-create-logo').value.trim() || '🏳️';
        const color = document.getElementById('team-create-color').value;
        if (!name) { toast('Enter a team name', 'error'); return; }
        const res = await fetch('/api/teams/create', {
          method: 'POST', headers: {'Content-Type':'application/json'},
          body: JSON.stringify({ name, logo, color })
        }).then(r => r.json());
        if (res.success) { toast(`Team "${name}" created!`); loadTeamsAdmin(); }
        else toast(res.message || 'Failed', 'error');
      });
    }

    // Delete team
    document.querySelectorAll('.team-delete-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.teamId;
        const name = btn.closest('.team-card').querySelector('.team-name').textContent;
        if (!confirm(`Delete team "${name}"?`)) return;
        const res = await fetch('/api/teams/delete', {
          method: 'POST', headers: {'Content-Type':'application/json'},
          body: JSON.stringify({ id })
        }).then(r => r.json());
        if (res.success) { toast(`Team "${name}" deleted.`); loadTeamsAdmin(); }
      });
    });

    // Edit team (opens inline editor)
    document.querySelectorAll('.team-edit-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const card = btn.closest('.team-card');
        const header = card.querySelector('.team-card-header');
        const nameEl = card.querySelector('.team-name');
        const logoEl = card.querySelector('.team-logo');
        const currentName = nameEl.textContent;
        const currentLogo = logoEl.textContent;
        const currentColor = card.style.borderLeftColor || '#667eea';
        const id = btn.dataset.teamId;
        header.innerHTML = `
          <input type="text" class="form-input team-edit-name" value="${currentName}" placeholder="Name" />
          <input type="text" class="form-input team-edit-logo" value="${currentLogo}" style="max-width:50px" placeholder="Logo" />
          <input type="color" class="form-input team-edit-color" value="${currentColor}" style="width:50px;height:38px;padding:2px" />
          <button class="btn btn-sm btn-primary team-edit-save" data-team-id="${id}">Save</button>
          <button class="btn btn-sm team-edit-cancel">Cancel</button>
        `;
      });
    });

    // Save inline edit
    document.addEventListener('click', (e) => {
      const saveBtn = e.target.closest('.team-edit-save');
      if (saveBtn) {
        const card = saveBtn.closest('.team-card');
        const id = saveBtn.dataset.teamId;
        const name = card.querySelector('.team-edit-name').value.trim();
        const logo = card.querySelector('.team-edit-logo').value.trim();
        const color = card.querySelector('.team-edit-color').value;
        if (!name) { toast('Name required', 'error'); return; }
        fetch('/api/teams/update', {
          method: 'POST', headers: {'Content-Type':'application/json'},
          body: JSON.stringify({ id, name, logo, color })
        }).then(r => r.json()).then(res => {
          if (res.success) { toast('Team updated!'); loadTeamsAdmin(); }
          else toast(res.message || 'Failed', 'error');
        });
      }
      const cancelBtn = e.target.closest('.team-edit-cancel');
      if (cancelBtn) { loadTeamsAdmin(); }
    });

    // Add member
    document.querySelectorAll('.team-member-select').forEach(sel => {
      sel.addEventListener('change', async () => {
        const username = sel.value;
        if (!username) return;
        const teamId = sel.dataset.teamId;
        const res = await fetch('/api/teams/add-member', {
          method: 'POST', headers: {'Content-Type':'application/json'},
          body: JSON.stringify({ teamId, username })
        }).then(r => r.json());
        if (res.success) { toast(`Added ${username}!`); loadTeamsAdmin(); }
        else toast(res.message || 'Failed', 'error');
      });
    });

    // Remove member
    document.querySelectorAll('.team-member-remove').forEach(btn => {
      btn.addEventListener('click', async () => {
        const teamId = btn.dataset.teamId;
        const username = btn.dataset.username;
        if (!confirm(`Remove ${username} from this team?`)) return;
        const res = await fetch('/api/teams/remove-member', {
          method: 'POST', headers: {'Content-Type':'application/json'},
          body: JSON.stringify({ teamId, username })
        }).then(r => r.json());
        if (res.success) { toast(`Removed ${username}.`); loadTeamsAdmin(); }
      });
    });

    // Save silver coins / notes
    document.querySelectorAll('.team-save-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const teamId = btn.dataset.teamId;
        const card = btn.closest('.team-card');
        const silverCoins = parseInt(card.querySelector('.team-silver-input').value) || 0;
        const notes = card.querySelector('.team-notes-input').value.trim();
        const res = await fetch('/api/teams/update', {
          method: 'POST', headers: {'Content-Type':'application/json'},
          body: JSON.stringify({ id: teamId, silverCoins, notes })
        }).then(r => r.json());
        if (res.success) { toast('Team saved!'); loadTeamsAdmin(); }
        else toast(res.message || 'Failed', 'error');
      });
    });
  }

  async function loadPlayerTeams() {
    if (!authState) return;
    const container = document.getElementById('player-teams-display');
    if (!container) return;
    try {
      const res = await fetch('/api/teams/player/' + encodeURIComponent(authState.username)).then(r => r.json());
      const teams = res.teams || [];
      const silverBalance = res.silverBalance || 0;
      if (teams.length === 0) {
        container.innerHTML = '<div class="badges-empty"><span class="badge-locked">👥</span><span class="badges-empty-text">Not on any team yet</span></div>';
        return;
      }
      let html = '<div class="player-teams-grid">';
      for (const team of teams) {
        const memberCount = team.members ? team.members.length : 0;
        html += `
        <div class="player-team-card glass" style="border-left:4px solid ${team.color || '#667eea'}">
          <div class="player-team-header">
            <span class="player-team-logo">${team.logo}</span>
            <span class="player-team-name">${team.name}</span>
            <span class="player-team-members-count">${memberCount} member${memberCount === 1 ? '' : 's'}</span>
          </div>
          ${team.notes ? `<div class="player-team-notes">${team.notes}</div>` : ''}
          <div class="player-team-coins">
            <span class="player-team-coin-icon">🥈</span> Team Silver Coins: <strong>${team.silverCoins || 0}</strong>
          </div>
        </div>`;
      }
      html += '</div>';
      if (silverBalance > 0) {
        html += `<div class="player-teams-total"><span class="player-team-coin-icon">🥈</span> Your Total Team Silver: <strong>${silverBalance}</strong></div>`;
      }
      container.innerHTML = html;
    } catch {
      container.innerHTML = '';
    }
  }

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

    // ── Populate coin player searchable combo ──
    async function populateCoinPlayerCombo() {
      const searchInput = document.getElementById('coin-player-search');
      const hiddenInput = document.getElementById('coin-player-input');
      const dropdown = document.getElementById('coin-player-dropdown');
      if (!searchInput || !dropdown) return;

      let allPlayers = [];
      try {
        const [lbRes, playersRes] = await Promise.all([
          fetch('/api/coins/leaderboard').then(r => r.json()),
          fetch('/players').then(r => r.json()),
        ]);
        const balances = lbRes.balances || [];
        const balanceMap = {};
        for (const b of balances) balanceMap[b._id] = b.total;
        const allP = playersRes.players || [];
        const seen = new Set();
        for (const p of allP) { seen.add(p.username); }
        allPlayers = Array.from(seen).map(u => ({ username: u, balance: balanceMap[u] || 0 }));
        // Sort by balance descending
        allPlayers.sort((a, b) => b.balance - a.balance);
      } catch { allPlayers = []; }

      function renderDropdown(query) {
        const q = (query || '').toLowerCase();
        const filtered = q ? allPlayers.filter(p => p.username.toLowerCase().includes(q)) : allPlayers;
        if (filtered.length === 0) {
          dropdown.innerHTML = '<div class="coin-dropdown-item disabled" style="padding:0.5rem;color:var(--text-muted);text-align:center;">No players found</div>';
          dropdown.style.display = 'block';
          return;
        }
        dropdown.innerHTML = filtered.map(p =>
          `<div class="coin-dropdown-item" data-username="${p.username}" data-balance="${p.balance}" style="padding:0.4rem 0.7rem;cursor:pointer;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid rgba(255,255,255,0.04);transition:background 0.15s;" onmouseover="this.style.background='rgba(255,255,255,0.08)'" onmouseout="this.style.background=''">
            <span>${p.username}</span>
            <span style="font-size:0.8rem;color:var(--accent);font-weight:600;">${p.balance} 🪙</span>
          </div>`
        ).join('');
        dropdown.style.display = 'block';
        // Click handler
        dropdown.querySelectorAll('.coin-dropdown-item').forEach(el => {
          el.addEventListener('click', () => {
            const username = el.dataset.username;
            const balance = el.dataset.balance;
            searchInput.value = username;
            hiddenInput.value = username;
            dropdown.style.display = 'none';
            // Update amount placeholder hint
            document.getElementById('coin-amount-input').placeholder = `Amount (${username} has ${balance} 🪙)`;
          });
        });
      }

      searchInput.addEventListener('input', () => {
        if (hiddenInput.value && hiddenInput.value !== searchInput.value) {
          hiddenInput.value = '';
        }
        renderDropdown(searchInput.value);
      });

      searchInput.addEventListener('focus', () => renderDropdown(searchInput.value));
      searchInput.addEventListener('blur', () => {
        setTimeout(() => { dropdown.style.display = 'none'; }, 200);
      });

      searchInput.value = '';
      hiddenInput.value = '';
    }

    // ── Coin Awarding ──
    document.getElementById('btn-award-coins')?.addEventListener('click', async () => {
      const playerUsername = document.getElementById('coin-player-input').value.trim();
      const amount = parseInt(document.getElementById('coin-amount-input').value);
      const stamp = document.getElementById('coin-stamp-select').value;
      if (!playerUsername || !amount || amount <= 0) { toast('Select a player and enter a positive amount.', 'error'); return; }
      if (!confirm(`Award ${amount} 🪙 to ${playerUsername}?`)) return;
      const res = await fetch('/api/coins/award', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerUsername, amount, stamp, note: 'Admin award' }),
      }).then(r => r.json());
      if (res.success) {
        toast(`Awarded ${amount} 🪙 to ${playerUsername}`);
        document.getElementById('coin-amount-input').value = '';
        document.getElementById('coin-player-search').value = '';
        document.getElementById('coin-player-input').value = '';
        document.getElementById('coin-amount-input').placeholder = 'Amount';
        window.__loadCoinLeaderboard();
        populateCoinPlayerCombo();
      } else {
        toast(res.message || 'Failed', 'error');
      }
    });

    // ── Coin Removal ──
    document.getElementById('btn-remove-coins')?.addEventListener('click', async () => {
      const playerUsername = document.getElementById('coin-player-input').value.trim();
      const amount = parseInt(document.getElementById('coin-amount-input').value);
      const stamp = document.getElementById('coin-stamp-select').value;
      if (!playerUsername || !amount || amount <= 0) { toast('Select a player and enter a positive amount.', 'error'); return; }
      if (!confirm(`Remove ${amount} 🪙 from ${playerUsername}? (Cannot go below zero)`)) return;
      const res = await fetch('/api/coins/award', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerUsername, amount: -Math.abs(amount), stamp, note: 'Admin removal' }),
      }).then(r => r.json());
      if (res.success) {
        const remaining = res.balance;
        toast(`Removed ${amount} 🪙 from ${playerUsername}. Balance: ${remaining} 🪙`);
        document.getElementById('coin-amount-input').value = '';
        document.getElementById('coin-player-search').value = '';
        document.getElementById('coin-player-input').value = '';
        document.getElementById('coin-amount-input').placeholder = 'Amount';
        window.__loadCoinLeaderboard();
        populateCoinPlayerCombo();
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

    // "Show all players" toggle removed — searchable combo now shows all players

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

    // Load coin leaderboard + populate combo when achievements tab is shown
    const achievementsBtn = document.querySelector('#view-admin .nav-btn[data-section="achievements"]');
    if (achievementsBtn) {
      achievementsBtn.addEventListener('click', () => {
        setTimeout(() => {
          window.__loadCoinLeaderboard();
          populateCoinPlayerCombo();
        }, 500);
      });
    }

    // "Show all players" toggle removed — searchable combo now shows all players

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

    // ── Local Clock ──
    function updateClock() {
      const now = new Date();
      const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const adminEl = document.getElementById('admin-clock-time');
      const playerEl = document.getElementById('player-clock-time');
      if (adminEl) adminEl.textContent = time;
      if (playerEl) playerEl.textContent = time;
    }
    updateClock();
    setInterval(updateClock, 1000);

    // ── Admin Countdown Timer ──
    let countdownActive = false;
    let countdownInterval = null;

    function updateCountdownDisplay(remaining) {
      if (remaining <= 0) {
        [document.getElementById('admin-countdown-time'), document.getElementById('player-countdown-time')].forEach(el => {
          if (el) el.textContent = '00:00:00';
        });
        return;
      }
      const h = Math.floor(remaining / 3600000);
      const m = Math.floor((remaining % 3600000) / 60000);
      const s = Math.floor((remaining % 60000) / 1000);
      const str = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
      [document.getElementById('admin-countdown-time'), document.getElementById('player-countdown-time')].forEach(el => {
        if (el) el.textContent = str;
      });
    }

    function showCountdownMode(show) {
      const adminClock = document.getElementById('admin-clock');
      const adminCountdown = document.getElementById('admin-countdown');
      const playerClock = document.getElementById('player-clock');
      const playerCountdown = document.getElementById('player-countdown');
      if (adminClock) adminClock.style.display = show ? 'none' : '';
      if (adminCountdown) adminCountdown.style.display = show ? '' : 'none';
      if (playerClock) playerClock.style.display = show ? 'none' : '';
      if (playerCountdown) playerCountdown.style.display = show ? '' : 'none';
    }

    let _lastCountdownSec = -1;
    let _zeroFlashTimeout = null;

    function applyCountdownEffects(remainingMs) {
      const totalSec = Math.floor(remainingMs / 1000);
      const explosionEl = document.getElementById('countdown-explosion-overlay');
      const digitsEl = document.getElementById('countdown-explosion-digits');
      const zeroFlash = document.getElementById('countdown-zero-flash');

      if (totalSec <= 0 && remainingMs > -2000) {
        // ZERO moment
        if (_lastCountdownSec !== -2) {
          _lastCountdownSec = -2;
          if (explosionEl) explosionEl.style.display = 'none';
          if (zeroFlash) {
            zeroFlash.style.display = '';
            if (_zeroFlashTimeout) clearTimeout(_zeroFlashTimeout);
            _zeroFlashTimeout = setTimeout(() => { zeroFlash.style.display = 'none'; }, 2000);
          }
          SoundManager.countdownZero();
        }
        return;
      }

      if (totalSec <= 10 && totalSec > 0) {
        // Last 10 seconds – explosion mode
        if (explosionEl) explosionEl.style.display = '';
        if (digitsEl) digitsEl.textContent = totalSec;
        if (explosionEl) {
          explosionEl.classList.remove('countdown-explosion-bounce');
          void explosionEl.offsetWidth;
          explosionEl.classList.add('countdown-explosion-bounce');
        }
        if (totalSec !== _lastCountdownSec) {
          if (totalSec <= 3) {
            SoundManager.countdownFinalBeep();
          } else {
            SoundManager.countdownBeep();
          }
        }
      } else if (explosionEl) {
        explosionEl.style.display = 'none';
      }

      _lastCountdownSec = totalSec;
    }

    // ── Socket Setup ──
    const socket = io();

    socket.on('countdownStart', (remaining) => {
      countdownActive = true;
      showCountdownMode(true);
      updateCountdownDisplay(remaining);
      _lastCountdownSec = -1;
      applyCountdownEffects(remaining);

      // Dramatic start effect
      const explosionEl = document.getElementById('countdown-explosion-overlay');
      const zeroFlash = document.getElementById('countdown-zero-flash');
      if (zeroFlash) zeroFlash.style.display = 'none';
      if (explosionEl) explosionEl.style.display = 'none';
      if (remaining > 10000) {
        SoundManager.countdownStart();
      }

      if (countdownInterval) clearInterval(countdownInterval);
      countdownInterval = setInterval(() => {
        if (document.getElementById('admin-countdown') && document.getElementById('admin-countdown').style.display !== 'none') {
          const el = document.getElementById('admin-countdown-time');
          if (el && el.textContent !== '00:00:00') {
            const parts = el.textContent.split(':');
            let totalSec = parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2]);
            if (totalSec > 0) {
              totalSec--;
              updateCountdownDisplay(totalSec * 1000);
              applyCountdownEffects(totalSec * 1000);
            } else {
              // Zero reached
              applyCountdownEffects(0);
            }
          }
        }
      }, 1000);
    });

    socket.on('countdownTick', (remaining) => {
      updateCountdownDisplay(remaining);
      applyCountdownEffects(remaining);
    });

    socket.on('countdownStop', () => {
      countdownActive = false;
      if (countdownInterval) { clearInterval(countdownInterval); countdownInterval = null; }
      showCountdownMode(false);
      const explosionEl = document.getElementById('countdown-explosion-overlay');
      const zeroFlash = document.getElementById('countdown-zero-flash');
      if (explosionEl) explosionEl.style.display = 'none';
      if (zeroFlash) zeroFlash.style.display = 'none';
    });

    socket.on('countdownCancel', () => {
      countdownActive = false;
      if (countdownInterval) { clearInterval(countdownInterval); countdownInterval = null; }
      showCountdownMode(false);
      const explosionEl = document.getElementById('countdown-explosion-overlay');
      const zeroFlash = document.getElementById('countdown-zero-flash');
      if (explosionEl) explosionEl.style.display = 'none';
      if (zeroFlash) zeroFlash.style.display = 'none';
    });

    // Admin countdown controls
    document.getElementById('admin-countdown-start')?.addEventListener('click', () => {
      const dtInput = document.getElementById('admin-countdown-datetime');
      const mysteryCheck = document.getElementById('admin-countdown-mystery');
      if (!dtInput || !dtInput.value) return;
      const deadline = new Date(dtInput.value).getTime();
      if (isNaN(deadline)) return;
      socket.emit('adminSetTimer', { deadline, mysteryMode: mysteryCheck?.checked || false });
    });

    document.getElementById('admin-countdown-pause')?.addEventListener('click', () => {
      socket.emit('adminPauseTimer');
    });

    document.getElementById('admin-countdown-resume')?.addEventListener('click', () => {
      socket.emit('adminResumeTimer');
    });

    document.getElementById('admin-countdown-cancel')?.addEventListener('click', () => {
      socket.emit('adminResetTimer');
    });

    document.getElementById('admin-countdown-extend')?.addEventListener('click', () => {
      const input = document.getElementById('admin-countdown-extend-input');
      if (input) socket.emit('adminExtendTimer', parseInt(input.value) || 30);
    });

    // Presence heartbeat
    let heartbeatInterval;
    function startHeartbeat() {
      if (heartbeatInterval) clearInterval(heartbeatInterval);
      if (!authState?.username) return;
      socket.emit('userOnline', { username: authState.username });
      heartbeatInterval = setInterval(() => {
        socket.emit('heartbeat', { username: authState.username });
      }, 15000);
    }
    if (authState?.username) {
      setTimeout(startHeartbeat, 1000);
    }

    socket.on('presenceUpdate', (data) => {
      const online = document.getElementById('presence-online-count');
      const onlineList = document.getElementById('presence-online-list');
      const recentList = document.getElementById('presence-recent-list');
      if (online) online.textContent = data.online.length;
      if (onlineList) {
        onlineList.innerHTML = data.online.length === 0
          ? '<li class="text-muted">No players online</li>'
          : data.online.map(u => `<li><span class="presence-dot online"></span>${u.username}</li>`).join('');
      }
      if (recentList) {
        recentList.innerHTML = data.recent.length === 0
          ? '<li class="text-muted">No recent activity</li>'
          : data.recent.map(u => {
              const ago = Math.floor((Date.now() - u.lastSeen) / 1000);
              const timeStr = ago < 60 ? `${ago}s ago` : ago < 3600 ? `${Math.floor(ago / 60)}m ago` : ago < 86400 ? `${Math.floor(ago / 3600)}h ago` : `${Math.floor(ago / 86400)}d ago`;
              const dotClass = u.isOnline ? 'online' : 'offline';
              return `<li><span class="presence-dot ${dotClass}"></span>${u.username} <span class="presence-time">${timeStr}</span></li>`;
            }).join('');
      }
      // Also show login history
      const loginList = document.getElementById('presence-login-list');
      if (loginList && data.loginHistory) {
        loginList.innerHTML = data.loginHistory.length === 0
          ? '<li class="text-muted">No logins recorded</li>'
          : data.loginHistory.map(l => {
              const ago = Math.floor((Date.now() - l.timestamp) / 1000);
              const timeStr = ago < 60 ? `${ago}s ago` : ago < 3600 ? `${Math.floor(ago / 60)}m ago` : ago < 86400 ? `${Math.floor(ago / 3600)}h ago` : `${Math.floor(ago / 86400)}d ago`;
              return `<li><span class="presence-dot login"></span>${l.username} <span class="presence-time">${timeStr}</span></li>`;
            }).join('');
      }
    });

    // Fallback: poll presence every 30s as backup
    function pollPresence() {
      fetch('/api/presence').then(r => r.json()).then(data => {
        // Only update if socket hasn't provided data recently
        socket.emit('ping'); // just check connection
        const online = document.getElementById('presence-online-count');
        const onlineList = document.getElementById('presence-online-list');
        const recentList = document.getElementById('presence-recent-list');
        if (online && data.online) online.textContent = data.online.length;
        if (onlineList && data.online) {
          onlineList.innerHTML = data.online.length === 0
            ? '<li class="text-muted">No players online</li>'
            : data.online.map(u => `<li><span class="presence-dot online"></span>${u.username}</li>`).join('');
        }
        if (recentList && data.recent) {
          recentList.innerHTML = data.recent.length === 0
            ? '<li class="text-muted">No recent activity</li>'
            : data.recent.map(u => {
                const ago = Math.floor((Date.now() - u.lastSeen) / 1000);
                const timeStr = ago < 60 ? `${ago}s ago` : ago < 3600 ? `${Math.floor(ago / 60)}m ago` : ago < 86400 ? `${Math.floor(ago / 3600)}h ago` : `${Math.floor(ago / 86400)}d ago`;
                const dotClass = u.isOnline ? 'online' : 'offline';
                return `<li><span class="presence-dot ${dotClass}"></span>${u.username} <span class="presence-time">${timeStr}</span></li>`;
              }).join('');
        }
        const loginList = document.getElementById('presence-login-list');
        if (loginList && data.loginHistory) {
          loginList.innerHTML = data.loginHistory.length === 0
            ? '<li class="text-muted">No logins recorded</li>'
            : data.loginHistory.map(l => {
                const ago = Math.floor((Date.now() - l.timestamp) / 1000);
                const timeStr = ago < 60 ? `${ago}s ago` : ago < 3600 ? `${Math.floor(ago / 60)}m ago` : ago < 86400 ? `${Math.floor(ago / 3600)}h ago` : `${Math.floor(ago / 86400)}d ago`;
                return `<li><span class="presence-dot login"></span>${l.username} <span class="presence-time">${timeStr}</span></li>`;
              }).join('');
        }
      }).catch(() => {});
    }
    setInterval(pollPresence, 30000);

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
      const res = await fetch('/api/avatar/upload?t=' + Date.now(), {
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
      const res = await fetch('/api/avatar/remove?t=' + Date.now(), {
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
    async function fetchBadgesForPlayers(players) {
      try {
        const assRes = await fetch('/api/badges/assignments').then(r => r.json());
        const assignments = assRes.assignments || {};
        for (const p of players) {
          p.badges = assignments[p.username] || [];
        }
      } catch {}
    }

    function openHallOfFame() {
      const leaderboard = adminDataCache.leaderboard;
      const top3 = leaderboard.slice(0, 3).map(e => ({
        username: e.username,
        total: e.total,
      }));
      const cacheBust = Date.now();
      Promise.all(top3.map(async (p) => {
        try {
          const res = await fetch('/api/avatar/' + encodeURIComponent(p.username) + '?t=' + cacheBust).then(r => r.json());
          p.avatarUrl = res.avatar ? res.avatar + '?t=' + cacheBust : '';
        } catch { p.avatarUrl = ''; }
      })).then(async () => {
        await fetchBadgesForPlayers(top3);
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
      const cacheBust = Date.now();
      await Promise.all(top3.map(async (p) => {
        try {
          const res = await fetch('/api/avatar/' + encodeURIComponent(p.username) + '?t=' + cacheBust).then(r => r.json());
          p.avatarUrl = res.avatar ? res.avatar + '?t=' + cacheBust : '';
        } catch { p.avatarUrl = ''; }
      }));
      await fetchBadgesForPlayers(top3);
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

    // ── Socket: Note Updated (real-time player display) ──
    socket.on('noteUpdated', (data) => {
      if (authState && data.username === authState.username) {
        const notesCard = document.getElementById('player-notes-card');
        const notesText = document.getElementById('player-notes-text');
        if (data.notes && data.notes.trim()) {
          notesCard.style.display = 'block';
          notesText.textContent = data.notes;
        } else {
          notesCard.style.display = 'none';
        }
      }
    });

    // ── Socket: Badges Updated ──
    socket.on('badgesUpdated', () => {
      if (authState && authState.role === 'admin') {
        loadBadgesAdmin();
      }
      if (authState && authState.role === 'player') {
        loadPlayerBadges();
        loadLeaderboardBadges();
      }
    });

    // ── Socket: Teams Updated ──
    socket.on('teamsUpdate', () => {
      if (authState && authState.role === 'admin') {
        loadTeamsAdmin();
      }
      if (authState && authState.role === 'player') {
        loadPlayerTeams();
      }
    });

    // Load badges & teams on admin/player nav
    const adminBadgesNav = document.querySelector('#view-admin .nav-btn[data-section="badges"]');
    if (adminBadgesNav) {
      adminBadgesNav.addEventListener('click', () => {
        setTimeout(loadBadgesAdmin, 300);
      });
    }
    const adminTeamsNav = document.querySelector('#view-admin .nav-btn[data-section="teams"]');
    if (adminTeamsNav) {
      adminTeamsNav.addEventListener('click', () => {
        setTimeout(loadTeamsAdmin, 300);
      });
    }

    // Start router
    router.start();
  });

})();
