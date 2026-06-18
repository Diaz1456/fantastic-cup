/* ═══════════════════════════════════════════════
   FANTASTIC CUP – Special Events Module
   ═══════════════════════════════════════════════ */

(function () {
  'use strict';

  let socket = null;
  let activeEventId = null;
  let countdownInterval = null;

  /* ─── Socket.IO Setup ─── */

  function initSocket() {
    if (socket) return;
    socket = io();
    socket.on('connect', () => console.log('Socket connected'));

    socket.on('timer:sync', (data) => {
      if (activeEventId && data.eventId === activeEventId) {
        updateCountdownDisplay(data);
      }
    });

    socket.on('coins:awarded', (data) => {
      const bal = document.getElementById('player-coin-balance');
      if (bal) {
        bal.textContent = data.balance;
        bal.parentElement.classList.add('coin-jingle');
        setTimeout(() => bal.parentElement.classList.remove('coin-jingle'), 600);
      }
      if (typeof window.__showCoinToast === 'function') {
        window.__showCoinToast(data);
      }
    });

    socket.on('leaderboard:update', () => {
      if (window.__eventsApp && window.__eventsApp.loadTop3) {
        window.__eventsApp.loadTop3();
      }
    });
  }

  /* ─── API ─── */

  const API = {
    get: (url) => fetch(url).then(r => r.json()),
    post: (url, body) => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json()),
    put: (url, body) => fetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json()),
    del: (url) => fetch(url, { method: 'DELETE' }).then(r => r.json()),
  };

  /* ─── Admin: Event List ─── */

  async function loadAdminEvents() {
    const res = await API.get('/api/events');
    const list = document.getElementById('admin-event-list');
    if (!res.events || res.events.length === 0) {
      list.innerHTML = '<p class="text-muted" style="text-align:center;padding:2rem;">No events yet. Click "+ New Event" to start.</p>';
      return;
    }
    list.innerHTML = res.events.map(ev => `
      <div class="event-card glass ${ev.active ? 'event-active' : ''}" data-id="${ev._id}">
        <div class="event-card-header">
          <div>
            <strong>${ev.name}</strong>
            <span class="event-status ${ev.active ? 'status-live' : 'status-draft'}">${ev.active ? '🔴 LIVE' : 'Draft'}</span>
          </div>
          <div class="event-card-actions">
            <button class="btn btn-sm btn-edit-event" data-id="${ev._id}">✏️ Edit</button>
            <button class="btn btn-sm btn-danger btn-del-event" data-id="${ev._id}">🗑️</button>
          </div>
        </div>
        <div class="event-card-meta">${ev.description || ''} · ${ev.categories?.length || 0} categories · ${(ev.categories || []).reduce((s, c) => s + (c.teams?.length || 0), 0)} teams</div>
      </div>
    `).join('');

    list.querySelectorAll('.btn-edit-event').forEach(btn => {
      btn.addEventListener('click', () => openEventEditor(btn.dataset.id));
    });
    list.querySelectorAll('.btn-del-event').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Delete this event?')) return;
        await API.del(`/api/events/${btn.dataset.id}`);
        loadAdminEvents();
      });
    });
  }

  /* ─── Admin: Event Editor ─── */

  let editingEventId = null;

  async function openEventEditor(eventId) {
    editingEventId = eventId;
    document.getElementById('admin-event-list').style.display = 'none';
    document.getElementById('admin-event-editor').style.display = 'block';

    const res = await API.get('/api/events');
    const event = (res.events || []).find(e => e._id === eventId);
    if (!event) return;

    document.getElementById('event-editor-title').textContent = 'Edit: ' + event.name;
    document.getElementById('event-name-input').value = event.name || '';
    document.getElementById('event-desc-input').value = event.description || '';
    document.getElementById('event-active-toggle').checked = event.active || false;
    if (event.deadline) {
      document.getElementById('event-deadline-input').value = new Date(event.deadline).toISOString().slice(0, 16);
    }
    document.getElementById('timer-pause-toggle').checked = event.timerPaused || false;
    document.getElementById('timer-surprise-toggle').checked = event.surpriseMode || false;

    renderCategories(event);
    updateTimerPreview(event);
  }

  function closeEventEditor() {
    editingEventId = null;
    document.getElementById('admin-event-list').style.display = '';
    document.getElementById('admin-event-editor').style.display = 'none';
  }

  async function saveEventChanges() {
    if (!editingEventId) return;
    const body = {
      name: document.getElementById('event-name-input').value || 'Unnamed Event',
      description: document.getElementById('event-desc-input').value,
      active: document.getElementById('event-active-toggle').checked,
    };
    await API.put(`/api/events/${editingEventId}`, body);
    loadAdminEvents();
    toast('Event saved');
  }

  /* ─── Admin: Categories & Teams ─── */

  async function renderCategories(event) {
    const container = document.getElementById('event-categories-list');
    if (!event.categories || event.categories.length === 0) {
      container.innerHTML = '<p class="text-muted" style="padding:1rem;">No categories yet.</p>';
      return;
    }
    container.innerHTML = event.categories.map((cat, ci) => `
      <div class="category-block glass">
        <div class="category-header">
          <strong>${cat.name}</strong>
          <button class="btn btn-sm btn-danger del-cat-btn" data-ci="${ci}">✕</button>
        </div>
        <div class="team-list" id="team-list-${ci}">
          ${(cat.teams || []).map((team, ti) => `
            <div class="team-row">
              <span class="team-logo-display">${team.logo || '🏆'}</span>
              <input type="text" class="team-name-input" value="${team.name}" data-ci="${ci}" data-ti="${ti}">
              <input type="number" class="team-score-input" value="${team.score || 0}" data-ci="${ci}" data-ti="${ti}" min="0">
              <button class="btn btn-sm btn-danger del-team-btn" data-ci="${ci}" data-ti="${ti}">✕</button>
            </div>
          `).join('')}
        </div>
        <div class="add-team-row">
          <input type="text" class="new-team-name" placeholder="Team name" data-ci="${ci}">
          <input type="text" class="new-team-logo" placeholder="Logo (emoji)" data-ci="${ci}" maxlength="2" style="width:60px">
          <button class="btn btn-sm add-team-btn" data-ci="${ci}">+ Add Team</button>
        </div>
      </div>
    `).join('');

    container.querySelectorAll('.del-cat-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Delete this category?')) return;
        await API.del(`/api/events/${editingEventId}/categories/${btn.dataset.ci}`);
        refreshEditor();
      });
    });

    container.querySelectorAll('.add-team-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const ci = btn.dataset.ci;
        const nameInput = container.querySelector(`.new-team-name[data-ci="${ci}"]`);
        const logoInput = container.querySelector(`.new-team-logo[data-ci="${ci}"]`);
        const name = nameInput.value.trim();
        if (!name) { toast('Enter team name', 'error'); return; }
        await API.post(`/api/events/${editingEventId}/categories/${ci}/teams`, { name, logo: logoInput.value || '🏆' });
        nameInput.value = '';
        logoInput.value = '';
        refreshEditor();
      });
    });

    container.querySelectorAll('.del-team-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Remove this team?')) return;
        await API.del(`/api/events/${editingEventId}/categories/${btn.dataset.ci}/teams/${btn.dataset.ti}`);
        refreshEditor();
      });
    });

    container.querySelectorAll('.team-name-input').forEach(inp => {
      let timer;
      inp.addEventListener('input', () => {
        clearTimeout(timer);
        timer = setTimeout(async () => {
          await API.put(`/api/events/${editingEventId}/categories/${inp.dataset.ci}/teams/${inp.dataset.ti}`, { name: inp.value });
        }, 500);
      });
    });

    container.querySelectorAll('.team-score-input').forEach(inp => {
      let timer;
      inp.addEventListener('input', () => {
        clearTimeout(timer);
        timer = setTimeout(async () => {
          await API.put(`/api/events/${editingEventId}/categories/${inp.dataset.ci}/teams/${inp.dataset.ti}`, { score: Number(inp.value) || 0 });
        }, 500);
      });
    });
  }

  async function refreshEditor() {
    const res = await API.get('/api/events');
    const event = (res.events || []).find(e => e._id === editingEventId);
    if (event) renderCategories(event);
  }

  /* ─── Admin: Timer ─── */

  function updateTimerPreview(event) {
    const el = document.getElementById('timer-preview-admin');
    if (!event.deadline) {
      el.textContent = 'No deadline set';
      return;
    }
    const diff = new Date(event.deadline).getTime() - Date.now();
    if (diff <= 0) { el.textContent = '⏰ EXPIRED'; return; }
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    el.textContent = `${String(d).padStart(2,'0')}d ${String(h).padStart(2,'0')}h ${String(m).padStart(2,'0')}m ${String(s).padStart(2,'0')}s`;
  }

  /* ─── Admin: Coin Awarding ─── */

  async function loadCoinLeaderboard() {
    const res = await API.get('/api/coins/leaderboard');
    const container = document.getElementById('coin-leaderboard-admin');
    if (!res.balances || res.balances.length === 0) {
      container.innerHTML = '<p class="text-muted">No coins awarded yet.</p>';
      return;
    }
    container.innerHTML = '<table class="data-table compact"><thead><tr><th>Player</th><th>Coins</th></tr></thead><tbody>' +
      res.balances.slice(0, 20).map(b => `<tr><td>${b._id}</td><td><strong>${b.total}</strong> 🪙</td></tr>`).join('') +
      '</tbody></table>';
  }

  /* ─── Player: Countdown Display ─── */

  function updateCountdownDisplay(data) {
    const container = document.getElementById('player-countdown');
    const surprise = document.getElementById('countdown-surprise');
    if (data.surpriseMode) {
      container.style.display = 'none';
      surprise.style.display = 'flex';
      return;
    }
    container.style.display = 'flex';
    surprise.style.display = 'none';

    if (!data.deadline) {
      ['cd-days','cd-hours','cd-mins','cd-secs'].forEach(id => document.getElementById(id).textContent = '--');
      return;
    }

    const diff = data.deadline - Date.now();
    if (diff <= 0) {
      ['cd-days','cd-hours','cd-mins','cd-secs'].forEach(id => document.getElementById(id).textContent = '00');
      triggerCountdownEnd();
      return;
    }

    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);

    document.getElementById('cd-days').textContent = String(d).padStart(2, '0');
    document.getElementById('cd-hours').textContent = String(h).padStart(2, '0');
    document.getElementById('cd-mins').textContent = String(m).padStart(2, '0');
    document.getElementById('cd-secs').textContent = String(s).padStart(2, '0');

    // Shake effect in final 10s
    const countdownEl = document.getElementById('player-countdown');
    if (diff < 10000) {
      countdownEl.classList.add('countdown-critical');
    } else {
      countdownEl.classList.remove('countdown-critical');
    }
  }

  let endedLastTime = false;

  function triggerCountdownEnd() {
    if (endedLastTime) return;
    endedLastTime = true;
    // Visual celebration
    const podium = document.getElementById('podium-container');
    if (podium) {
      podium.style.animation = 'none';
      setTimeout(() => { podium.style.animation = 'podium-entrance 0.8s ease-out'; }, 10);
    }
    toast('⏰ THE EVENT HAS ENDED!', 'success');
    // Confetti-like effect
    if (typeof window.__triggerConfetti === 'function') window.__triggerConfetti();
  }

  /* ─── Player: Top 3 Podium ─── */

  async function loadTop3() {
    const res = await API.get(`/api/events/${activeEventId}/top3`);
    const allTeams = res.all || [];
    const top3 = res.top3 || [];

    // Update podium
    const slots = [
      { idx: 1, name: document.querySelector('#podium-1 .podium-name'), score: document.querySelector('#podium-1 .podium-score') },
      { idx: 2, name: document.querySelector('#podium-2 .podium-name'), score: document.querySelector('#podium-2 .podium-score') },
      { idx: 3, name: document.querySelector('#podium-3 .podium-name'), score: document.querySelector('#podium-3 .podium-score') },
    ];

    for (let i = 0; i < 3; i++) {
      const team = top3[i];
      const slot = slots[i];
      if (team) {
        slot.name.textContent = team.logo + ' ' + team.name;
        slot.score.textContent = team.score;
      } else {
        slot.name.textContent = '—';
        slot.score.textContent = '0';
      }
    }

    // All teams list
    const list = document.getElementById('all-teams-list');
    list.innerHTML = allTeams.map(t => `
      <div class="team-mini-row">
        <span>${t.logo || '🏆'} <strong>${t.name}</strong></span>
        <span class="team-mini-cat">${t.category}</span>
        <span class="team-mini-score">${t.score} pts</span>
      </div>
    `).join('');
  }

  /* ─── Confetti Effect ─── */

  window.__triggerConfetti = function () {
    const colors = ['#ffd700', '#ff6b6b', '#48dbfb', '#ff9ff3', '#feca57', '#54a0ff'];
    for (let i = 0; i < 60; i++) {
      const el = document.createElement('div');
      el.style.cssText = `
        position:fixed; width:${Math.random()*8+4}px; height:${Math.random()*8+4}px;
        background:${colors[Math.floor(Math.random()*colors.length)]};
        left:${Math.random()*100}vw; top:-10px; border-radius:${Math.random()>0.5?'50%':'2px'};
        pointer-events:none; z-index:9999;
        animation: confetti-fall ${Math.random()*2+2}s ease-out forwards;
        animation-delay:${Math.random()*0.5}s;
      `;
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 4000);
    }
  };

  /* ─── Coin Toast Notification ─── */

  window.__showCoinToast = function (data) {
    const container = document.getElementById('toast-container') || document.body;
    const el = document.createElement('div');
    el.className = 'coin-toast glass';
    el.innerHTML = `
      <span class="coin-toast-stamp">${data.stamp || '⭐'}</span>
      <span class="coin-toast-amount">+${data.amount}</span>
      <span class="coin-toast-label">Coins</span>
      ${data.note ? `<span class="coin-toast-note">${data.note}</span>` : ''}
    `;
    container.appendChild(el);
    setTimeout(() => {
      el.classList.add('coin-toast-exit');
      setTimeout(() => el.remove(), 400);
    }, 3500);
  };

  /* ─── Public API ─── */

  window.__eventsApp = {
    loadAdminEvents,
    openEventEditor,
    closeEventEditor,
    saveEventChanges,
    loadCoinLeaderboard,
    loadTop3,
    initSocket,
    get activeEventId() { return activeEventId; },
    set activeEventId(v) { activeEventId = v; },
    get editingEventId() { return editingEventId; },
    set editingEventId(v) { editingEventId = v; },
    refreshEditor,
  };

})();
