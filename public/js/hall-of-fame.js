(function () {
  'use strict';

  let activeInstance = null;

  window.startHallOfFame = function (players) {
    if (activeInstance) {
      activeInstance.destroy();
      activeInstance = null;
    }
    activeInstance = new HallOfFame(players);
    activeInstance.init();
  };

  window.stopHallOfFame = function () {
    if (activeInstance) {
      activeInstance.destroy();
      activeInstance = null;
    }
  };

  class HallOfFame {
    constructor(players) {
      this.players = players || [];
      this.overlay = document.getElementById('hof-overlay');
      this.container = document.getElementById('hof-canvas-container');
      this.currentIndex = 0;
      this.isDragging = false;
      this.startX = 0;
      this.currentX = 0;
      this.autoRotateTimer = null;
      this.ceremonyPhase = 'idle';
      this.audioCtx = null;
      this.confettiInterval = null;
      this.crownEl = null;
      this.rotationAngle = 0;
    }

    init() {
      if (!this.container) return;
      this.overlay.style.display = 'flex';
      this.container.innerHTML = '';
      this.container.className = 'hof-canvas-container';

      this.closeBtn = document.getElementById('hof-close-btn');
      if (this.closeBtn) {
        this.closeBtn.addEventListener('click', () => this.destroy());
      }

      this._buildHTML();
      this._setupControls();
      this._setupAudio();
      this._startCeremony();
    }

    _buildHTML() {
      const html = `
        <div class="hof-gallery-container">
          <div class="hof-rotate-hint">↻ Drag to rotate</div>
          <div class="hof-gallery" id="hof-gallery">
            ${this.players.map((p, i) => {
              const isFirst = i === 0;
              const rankLabel = i === 0 ? '1ST' : i === 1 ? '2ND' : '3RD';
              const rankClass = i === 0 ? 'gold' : i === 1 ? 'silver' : 'bronze';
              const avatarHtml = p.avatarUrl
                ? `<img src="${p.avatarUrl}" class="hof-card-avatar-img" onerror="this.style.display='none'">`
                : '';
              const badges = p.badges || [];
              const badgeHtml = badges.length > 0
                ? `<div class="hof-card-badges">${badges.map(b => `<span class="hof-badge-icon" title="${b.name}: ${b.description || ''}" style="border-color:${window.RARITY_COLORS && window.RARITY_COLORS[b.rarity] ? window.RARITY_COLORS[b.rarity].border : '#b4b4be'};${b.rarity === 'legendary' ? 'animation:badgeLegendaryGlow 2s ease-in-out infinite;' : ''}">${b.icon}</span>`).join('')}</div>`
                : '';
              return `
                <div class="hof-card ${rankClass} ${isFirst ? 'hof-card-center' : ''}" data-index="${i}" style="--card-index:${i}">
                  <div class="hof-card-glow"></div>
                  <div class="hof-card-rank">#${i + 1}</div>
                  <div class="hof-card-avatar player-stats-trigger" data-username="${p.username}">
                    ${avatarHtml}
                    <span class="hof-card-avatar-fallback" ${avatarHtml ? 'style="display:none"' : ''}>${i === 0 ? '👑' : i === 1 ? '🥈' : '🥉'}</span>
                  </div>
                  <div class="hof-card-name player-stats-trigger" data-username="${p.username}"><span class="hof-name-token">${window.getPlayerToken ? window.getPlayerToken(p.username).icon : '👑'}</span>${p.username}</div>
                  ${badgeHtml}
                  <div class="hof-card-score">${p.total} pts</div>
                  <div class="hof-card-pedestal">
                    <span class="hof-pedestal-label">${rankLabel}</span>
                  </div>
                  ${isFirst ? `<div class="hof-crown" id="hof-crown">👑</div>` : ''}
                </div>
              `;
            }).join('')}
          </div>
          <div class="hof-particles" id="hof-particles"></div>
          <div class="hof-confetti-container" id="hof-confetti"></div>
        </div>
      `;
      this.container.innerHTML = html;
      this.gallery = document.getElementById('hof-gallery');
      this.crownEl = document.getElementById('hof-crown');
    }

    _setupControls() {
      if (!this.gallery) return;

      const onStart = (x) => {
        this.isDragging = true;
        this.startX = x;
        this.currentX = x;
        this.gallery.style.transition = 'none';
        clearInterval(this.autoRotateTimer);
      };

      const onMove = (x) => {
        if (!this.isDragging) return;
        this.currentX = x;
        const diff = this.currentX - this.startX;
        this.rotationAngle += diff * 0.005;
        this._applyRotation();
        this.startX = x;
      };

      const onEnd = () => {
        this.isDragging = false;
        this.gallery.style.transition = 'transform 0.8s cubic-bezier(0.22, 1, 0.36, 1)';
        this._startAutoRotate();
      };

      // Mouse events
      this.gallery.addEventListener('mousedown', (e) => {
        e.preventDefault();
        onStart(e.clientX);
      });
      document.addEventListener('mousemove', (e) => {
        onMove(e.clientX);
      });
      document.addEventListener('mouseup', onEnd);

      // Touch events
      this.gallery.addEventListener('touchstart', (e) => {
        onStart(e.touches[0].clientX);
      }, { passive: true });
      document.addEventListener('touchmove', (e) => {
        onMove(e.touches[0].clientX);
      }, { passive: true });
      document.addEventListener('touchend', onEnd);

      this._startAutoRotate();
    }

    _applyRotation() {
      if (!this.gallery) return;
      this.gallery.style.transform = `perspective(1200px) rotateY(${this.rotationAngle}rad)`;
    }

    _startAutoRotate() {
      clearInterval(this.autoRotateTimer);
      this.autoRotateTimer = setInterval(() => {
        if (!this.isDragging) {
          this.rotationAngle += 0.003;
          this.gallery.style.transition = 'transform 0.1s linear';
          this._applyRotation();
        }
      }, 50);
    }

    _setupAudio() {
      try {
        const Ctor = window.AudioContext || window.webkitAudioContext;
        if (!Ctor) return;
        this.audioCtx = new Ctor();

        const masterGain = this.audioCtx.createGain();
        masterGain.gain.setValueAtTime(0.06, this.audioCtx.currentTime);
        masterGain.connect(this.audioCtx.destination);

        // Ambient drone
        const oscs = [];
        const freqs = [55, 82.5, 110, 165];
        freqs.forEach((freq) => {
          const osc = this.audioCtx.createOscillator();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);

          const gain = this.audioCtx.createGain();
          gain.gain.setValueAtTime(0.03, this.audioCtx.currentTime);
          gain.gain.linearRampToValueAtTime(0.01, this.audioCtx.currentTime + 3);

          osc.connect(gain);
          gain.connect(masterGain);
          osc.start();
          oscs.push(osc);
        });

        this.audioOscs = oscs;
        this.audioMaster = masterGain;
      } catch {}
    }

    _startCeremony() {
      // Phase 1: Particles sweep
      this._spawnParticles(40);

      // Phase 2: Confetti starts after a delay
      setTimeout(() => {
        this._startConfetti();

        // Phase 3: Music sting
        this._playCeremonySting();

        // Phase 4: Crown animation
        if (this.crownEl) {
          this.crownEl.classList.add('hof-crown-visible');
        }
      }, 500);

      // Stop confetti after a while
      setTimeout(() => {
        this._stopConfetti();
      }, 6000);

      // Show rotate hint briefly
      setTimeout(() => {
        const hint = this.container.querySelector('.hof-rotate-hint');
        if (hint) hint.style.opacity = '0';
      }, 4000);
    }

    _spawnParticles(count) {
      const container = document.getElementById('hof-particles');
      if (!container) return;
      for (let i = 0; i < count; i++) {
        const p = document.createElement('div');
        p.className = 'hof-particle';
        const size = Math.random() * 4 + 2;
        p.style.width = size + 'px';
        p.style.height = size + 'px';
        p.style.left = Math.random() * 100 + '%';
        p.style.top = Math.random() * 100 + '%';
        p.style.animationDelay = Math.random() * 1 + 's';
        p.style.animationDuration = (Math.random() * 2 + 1.5) + 's';
        p.style.background = ['#ffd700', '#ff6b6b', '#48dbfb', '#a855f7', '#22d3ee'][Math.floor(Math.random() * 5)];
        container.appendChild(p);
        setTimeout(() => p.remove(), 3500);
      }
    }

    _startConfetti() {
      const container = document.getElementById('hof-confetti');
      if (!container) return;
      const colors = ['#ffd700', '#ff6b6b', '#48dbfb', '#a855f7', '#22d3ee', '#10b981', '#f59e0b'];

      this.confettiInterval = setInterval(() => {
        for (let i = 0; i < 3; i++) {
          const c = document.createElement('div');
          c.className = 'hof-confetti-piece';
          c.style.left = Math.random() * 100 + '%';
          c.style.background = colors[Math.floor(Math.random() * colors.length)];
          c.style.width = (Math.random() * 6 + 3) + 'px';
          c.style.height = (Math.random() * 10 + 5) + 'px';
          c.style.animationDuration = (Math.random() * 2 + 2) + 's';
          c.style.animationDelay = Math.random() * 0.5 + 's';
          c.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
          container.appendChild(c);
          setTimeout(() => c.remove(), 4000);
        }
      }, 200);
    }

    _stopConfetti() {
      if (this.confettiInterval) {
        clearInterval(this.confettiInterval);
        this.confettiInterval = null;
      }
    }

    _playCeremonySting() {
      if (!this.audioCtx) return;
      try {
        const now = this.audioCtx.currentTime;
        const notes = [261.63, 329.63, 392, 523.25, 659.25];
        notes.forEach((freq, i) => {
          const osc = this.audioCtx.createOscillator();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now + i * 0.12);
          const gain = this.audioCtx.createGain();
          gain.gain.setValueAtTime(0, now + i * 0.12);
          gain.gain.linearRampToValueAtTime(0.12, now + i * 0.12 + 0.03);
          gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.6);
          osc.connect(gain);
          if (this.audioMaster) gain.connect(this.audioMaster);
          else gain.connect(this.audioCtx.destination);
          osc.start(now + i * 0.12);
          osc.stop(now + i * 0.12 + 0.6);
        });
      } catch {}
    }

    destroy() {
      this._stopConfetti();
      if (this.autoRotateTimer) clearInterval(this.autoRotateTimer);

      if (this.audioOscs) {
        this.audioOscs.forEach(osc => { try { osc.stop(); } catch {} });
        this.audioOscs = null;
      }
      if (this.audioCtx) {
        try { this.audioCtx.close(); } catch {}
        this.audioCtx = null;
      }

      if (this.overlay) {
        this.overlay.style.display = 'none';
      }
      if (this.container) {
        this.container.innerHTML = '';
      }
      activeInstance = null;
    }
  }
})();
