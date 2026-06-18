(function () {
  'use strict';

  let loadPromise;

  function initLoader() {
    if (loadPromise) return loadPromise;
    loadPromise = (async function () {
      const threeMod = await import('https://cdn.jsdelivr.net/npm/three@0.158.0/build/three.module.js');
      const THREE = threeMod.default || threeMod;
      const orbitMod = await import('https://cdn.jsdelivr.net/npm/three@0.158.0/examples/jsm/controls/OrbitControls.js');
      const OrbitControls = orbitMod.OrbitControls || orbitMod.default;
      return { THREE, OrbitControls };
    })();
    return loadPromise;
  }

  let activeScene = null;

  window.startHallOfFame = async function (players) {
    if (activeScene) {
      activeScene.destroy();
      activeScene = null;
    }
    const lib = await initLoader();
    activeScene = new HallOfFameScene(lib.THREE, lib.OrbitControls, players);
    activeScene.init();
  };

  window.stopHallOfFame = function () {
    if (activeScene) {
      activeScene.destroy();
      activeScene = null;
    }
  };

  class HallOfFameScene {
    constructor(THREE, OrbitControls, players) {
      this.THREE = THREE;
      this.OrbitControls = OrbitControls;
      this.players = players || [];
      this.container = document.getElementById('hof-canvas-container');
      this.overlay = document.getElementById('hof-overlay');
      this.scene = null;
      this.camera = null;
      this.renderer = null;
      this.controls = null;
      this.clock = new THREE.Clock();
      this.crown = null;
      this.statues = [];
      this.pedestals = [];
      this.particleSystem = null;
      this.ceremonyPhase = 'idle';
      this.ceremonyTargetIndex = -1;
      this.ceremonyTimer = 0;
      this.autoRotate = true;
      this.musicEnabled = true;
      this.audioCtx = null;
      this.audioGain = null;
      this.smokeParticles = [];
      this.confettiParticles = [];
      this.animFrameId = null;
      this.mouse = { x: 0, y: 0 };
      this.isDragging = false;
    }

    init() {
      if (!this.container) return;
      this.overlay.style.display = '';

      const W = this.container.clientWidth;
      const H = this.container.clientHeight;

      this.scene = new this.THREE.Scene();
      this.scene.background = new this.THREE.Color(0x0a0a1a);

      this.camera = new this.THREE.PerspectiveCamera(45, W / H, 0.1, 100);
      this.camera.position.set(6, 4, 8);
      this.camera.lookAt(0, 0, 0);

      this.renderer = new this.THREE.WebGLRenderer({ antialias: true, alpha: false });
      this.renderer.setSize(W, H);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = this.THREE.PCFSoftShadowMap;
      this.renderer.toneMapping = this.THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.2;
      this.container.appendChild(this.renderer.domElement);

      this.controls = new this.OrbitControls(this.camera, this.renderer.domElement);
      this.controls.target.set(0, 0.5, 0);
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.05;
      this.controls.minDistance = 3;
      this.controls.maxDistance = 18;
      this.controls.maxPolarAngle = Math.PI / 2.1;
      this.controls.autoRotate = true;
      this.controls.autoRotateSpeed = 0.8;

      this._setupLighting();
      this._buildFloor();
      this._buildPedestals();
      this._buildStatues();
      this._buildCrown();
      this._setupParticles();
      this._setupEventListeners();
      this._playBackgroundMusic();
      this._animate();
      this._startCeremony();
    }

    _setupLighting() {
      const ambient = new this.THREE.AmbientLight(0x222244, 0.5);
      this.scene.add(ambient);

      const dirLight = new this.THREE.DirectionalLight(0xffeedd, 1.5);
      dirLight.position.set(5, 10, 7);
      dirLight.castShadow = true;
      dirLight.shadow.mapSize.width = 1024;
      dirLight.shadow.mapSize.height = 1024;
      this.scene.add(dirLight);

      const fillLight = new this.THREE.DirectionalLight(0x4488ff, 0.4);
      fillLight.position.set(-5, 3, -5);
      this.scene.add(fillLight);

      const rimLight = new this.THREE.DirectionalLight(0xffaa66, 0.3);
      rimLight.position.set(-2, 1, 6);
      this.scene.add(rimLight);

      const hemi = new this.THREE.HemisphereLight(0x4488ff, 0x000022, 0.4);
      this.scene.add(hemi);

      for (let i = 0; i < 3; i++) {
        const spot = new this.THREE.SpotLight(0xffd700, 2, 15, Math.PI / 8, 0.4, 1);
        const angle = (i - 1) * 1.2;
        spot.position.set(Math.sin(angle) * 3, 5, Math.cos(angle) * 3);
        spot.target.position.set(Math.sin(angle) * 1.2, 0.5, Math.cos(angle) * 1.2);
        this.scene.add(spot);
        this.scene.add(spot.target);
      }
    }

    _buildFloor() {
      const geo = new this.THREE.PlaneGeometry(16, 16);
      const mat = new this.THREE.MeshStandardMaterial({
        color: 0x111133,
        roughness: 0.2,
        metalness: 0.8,
        transparent: true,
        opacity: 0.6,
      });
      const floor = new this.THREE.Mesh(geo, mat);
      floor.rotation.x = -Math.PI / 2;
      floor.position.y = -0.3;
      floor.receiveShadow = true;
      this.scene.add(floor);

      const gridHelper = new this.THREE.GridHelper(16, 32, 0x4444aa, 0x222266);
      gridHelper.position.y = -0.25;
      this.scene.add(gridHelper);

      // Reflective ring
      const ringGeo = new this.THREE.RingGeometry(2.5, 4, 64);
      const ringMat = new this.THREE.MeshStandardMaterial({
        color: 0x222255,
        roughness: 0.1,
        metalness: 0.9,
        transparent: true,
        opacity: 0.3,
        side: this.THREE.DoubleSide,
      });
      const ring = new this.THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = -0.28;
      this.scene.add(ring);
    }

    _buildPedestals() {
      const positions = [
        { x: 0, z: 0, label: '1ST' },
        { x: -1.8, z: 1.2, label: '2ND' },
        { x: 1.8, z: 1.2, label: '3RD' },
      ];

      positions.forEach((pos, i) => {
        const group = new this.THREE.Group();

        // Base
        const baseGeo = new this.THREE.CylinderGeometry(0.6, 0.7, 0.15, 8);
        const baseMat = new this.THREE.MeshStandardMaterial({
          color: i === 0 ? 0xffd700 : i === 1 ? 0xc0c0c0 : 0xcd7f32,
          roughness: 0.4,
          metalness: 0.7,
        });
        const base = new this.THREE.Mesh(baseGeo, baseMat);
        base.position.y = 0.15;
        base.castShadow = true;
        base.receiveShadow = true;
        group.add(base);

        // Column
        const colGeo = new this.THREE.CylinderGeometry(0.45, 0.5, 0.8, 8);
        const colMat = new this.THREE.MeshStandardMaterial({
          color: 0x1a1a3a,
          roughness: 0.5,
          metalness: 0.3,
        });
        const col = new this.THREE.Mesh(colGeo, colMat);
        col.position.y = 0.55;
        col.castShadow = true;
        col.receiveShadow = true;
        group.add(col);

        // Top plate
        const topGeo = new this.THREE.CylinderGeometry(0.5, 0.55, 0.1, 8);
        const topMat = new this.THREE.MeshStandardMaterial({
          color: i === 0 ? 0xffd700 : i === 1 ? 0xc0c0c0 : 0xcd7f32,
          roughness: 0.3,
          metalness: 0.8,
        });
        const top = new this.THREE.Mesh(topGeo, topMat);
        top.position.y = 1.0;
        top.castShadow = true;
        top.receiveShadow = true;
        group.add(top);

        // Glow ring around pedestal
        const glowGeo = new this.THREE.RingGeometry(0.55, 0.7, 32);
        const glowMat = new this.THREE.MeshBasicMaterial({
          color: i === 0 ? 0xffd700 : i === 1 ? 0xc0c0c0 : 0xcd7f32,
          transparent: true,
          opacity: 0.2,
          side: this.THREE.DoubleSide,
        });
        const glow = new this.THREE.Mesh(glowGeo, glowMat);
        glow.rotation.x = -Math.PI / 2;
        glow.position.y = 1.05;
        group.add(glow);

        // Number label using sprite
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, 128, 128);

        ctx.shadowColor = i === 0 ? '#ffd700' : i === 1 ? '#c0c0c0' : '#cd7f32';
        ctx.shadowBlur = 15;
        ctx.font = 'bold 64px Poppins, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = i === 0 ? '#ffd700' : i === 1 ? '#c0c0c0' : '#cd7f32';
        ctx.fillText(`#${i + 1}`, 64, 64);

        const tex = new this.THREE.CanvasTexture(canvas);
        const spriteMat = new this.THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
        const sprite = new this.THREE.Sprite(spriteMat);
        sprite.scale.set(0.6, 0.6, 1);
        sprite.position.y = -0.2;
        group.add(sprite);

        group.position.set(pos.x, -0.2, pos.z);
        this.scene.add(group);
        this.pedestals.push(group);
      });
    }

    _buildStatues() {
      const positions = [
        { x: 0, z: 0 },
        { x: -1.8, z: 1.2 },
        { x: 1.8, z: 1.2 },
      ];

      this.players.forEach((player, i) => {
        if (i > 2) return;
        const group = new this.THREE.Group();

        // Torso (stylized)
        const torsoGeo = new this.THREE.BoxGeometry(0.5, 0.6, 0.35);
        const torsoMat = new this.THREE.MeshStandardMaterial({
          color: 0x2a2a4a,
          roughness: 0.6,
          metalness: 0.2,
        });
        const torso = new this.THREE.Mesh(torsoGeo, torsoMat);
        torso.position.y = 1.4;
        torso.castShadow = true;
        group.add(torso);

        // Shoulders
        const shGeo = new this.THREE.BoxGeometry(0.7, 0.12, 0.2);
        const shMat = new this.THREE.MeshStandardMaterial({
          color: 0x1a1a3a,
          roughness: 0.5,
          metalness: 0.3,
        });
        const shoulders = new this.THREE.Mesh(shGeo, shMat);
        shoulders.position.y = 1.7;
        group.add(shoulders);

        // Neck
        const neckGeo = new this.THREE.CylinderGeometry(0.12, 0.15, 0.15, 8);
        const neckMat = new this.THREE.MeshStandardMaterial({
          color: 0x3a2a1a,
          roughness: 0.8,
        });
        const neck = new this.THREE.Mesh(neckGeo, neckMat);
        neck.position.y = 1.85;
        group.add(neck);

        // Head (sphere with avatar texture)
        const headGeo = new this.THREE.SphereGeometry(0.22, 16, 16);
        let headMat;
        if (player.avatarUrl) {
          const texLoader = new this.THREE.TextureLoader();
          const tex = texLoader.load(player.avatarUrl);
          headMat = new this.THREE.MeshStandardMaterial({
            map: tex,
            roughness: 0.5,
            metalness: 0.1,
          });
        } else {
          headMat = new this.THREE.MeshStandardMaterial({
            color: 0x3a2a1a,
            roughness: 0.8,
          });
        }
        const head = new this.THREE.Mesh(headGeo, headMat);
        head.position.y = 1.95;
        head.castShadow = true;
        group.add(head);

        // Cape/cloak effect
        const capeGeo = new this.THREE.CylinderGeometry(0.35, 0.55, 0.3, 8, 1, true);
        const capeMat = new this.THREE.MeshStandardMaterial({
          color: i === 0 ? 0x1a1a5a : i === 1 ? 0x2a1a4a : 0x1a3a2a,
          roughness: 0.7,
          metalness: 0.1,
          transparent: true,
          opacity: 0.6,
          side: this.THREE.DoubleSide,
        });
        const cape = new this.THREE.Mesh(capeGeo, capeMat);
        cape.position.y = 1.1;
        cape.scale.x = 1.3;
        cape.scale.z = 1.3;
        group.add(cape);

        // Nameplate sprite
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 80;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, 256, 80);

        ctx.shadowColor = i === 0 ? '#ffd700' : i === 1 ? '#c0c0c0' : '#cd7f32';
        ctx.shadowBlur = 10;
        ctx.font = 'bold 32px Poppins, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(player.username, 128, 40);

        const tex = new this.THREE.CanvasTexture(canvas);
        const spriteMat = new this.THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
        const sprite = new this.THREE.Sprite(spriteMat);
        sprite.scale.set(1.2, 0.4, 1);
        sprite.position.y = 2.4;
        group.add(sprite);

        // Score display
        const scoreCanvas = document.createElement('canvas');
        scoreCanvas.width = 200;
        scoreCanvas.height = 60;
        const sctx = scoreCanvas.getContext('2d');
        sctx.clearRect(0, 0, 200, 60);
        sctx.shadowColor = '#ffd700';
        sctx.shadowBlur = 8;
        sctx.font = '24px Poppins, sans-serif';
        sctx.textAlign = 'center';
        sctx.textBaseline = 'middle';
        sctx.fillStyle = '#ffd700';
        sctx.fillText(`${player.total} pts`, 100, 30);

        const scoreTex = new this.THREE.CanvasTexture(scoreCanvas);
        const scoreMat = new this.THREE.SpriteMaterial({ map: scoreTex, transparent: true, depthTest: false });
        const scoreSprite = new this.THREE.Sprite(scoreMat);
        scoreSprite.scale.set(0.8, 0.25, 1);
        scoreSprite.position.y = 2.7;
        group.add(scoreSprite);

        group.position.set(positions[i].x, -0.2, positions[i].z);
        this.scene.add(group);
        this.statues.push(group);
      });
    }

    _buildCrown() {
      if (this.players.length === 0) return;
      const group = new this.THREE.Group();

      // Crown band
      const bandGeo = new this.THREE.TorusGeometry(0.25, 0.04, 8, 16);
      const bandMat = new this.THREE.MeshStandardMaterial({
        color: 0xffd700,
        roughness: 0.3,
        metalness: 0.9,
      });
      const band = new this.THREE.Mesh(bandGeo, bandMat);
      band.rotation.x = Math.PI / 2;
      band.position.y = 0.04;
      group.add(band);

      // Crown points
      for (let i = 0; i < 5; i++) {
        const angle = (i / 5) * Math.PI * 2;
        const ptGeo = new this.THREE.ConeGeometry(0.04, 0.1, 4);
        const ptMat = new this.THREE.MeshStandardMaterial({
          color: 0xffd700,
          roughness: 0.3,
          metalness: 0.9,
        });
        const pt = new this.THREE.Mesh(ptGeo, ptMat);
        pt.position.set(Math.sin(angle) * 0.22, 0.09, Math.cos(angle) * 0.22);
        pt.rotation.x = -0.2;
        pt.rotation.z = Math.sin(angle) * 0.15;
        group.add(pt);
      }

      // Gem on top
      const gemGeo = new this.THREE.OctahedronGeometry(0.05);
      const gemMat = new this.THREE.MeshStandardMaterial({
        color: 0xff4444,
        roughness: 0.1,
        metalness: 0.3,
        emissive: 0xff2222,
        emissiveIntensity: 0.3,
      });
      const gem = new this.THREE.Mesh(gemGeo, gemMat);
      gem.position.y = 0.12;
      gem.scale.y = 2;
      group.add(gem);

      // Crown glow
      const glowGeo = new this.THREE.SphereGeometry(0.35, 16, 16);
      const glowMat = new this.THREE.MeshBasicMaterial({
        color: 0xffd700,
        transparent: true,
        opacity: 0.08,
      });
      const glow = new this.THREE.Mesh(glowGeo, glowMat);
      group.add(glow);

      // Position above first statue
      group.position.set(0, 2.3, 0);
      this.crown = group;
      this.scene.add(group);

      // Crown beam light
      const beamGeo = new this.THREE.CylinderGeometry(0.02, 0.4, 0.8, 8, 1, true);
      const beamMat = new this.THREE.MeshBasicMaterial({
        color: 0xffd700,
        transparent: true,
        opacity: 0.08,
        side: this.THREE.DoubleSide,
      });
      const beam = new this.THREE.Mesh(beamGeo, beamMat);
      beam.position.y = -0.5;
      group.add(beam);
    }

    _setupParticles() {
      // Ambient floating particles
      const count = 200;
      const geo = new this.THREE.BufferGeometry();
      const positions = new Float32Array(count * 3);
      const sizes = new Float32Array(count);
      for (let i = 0; i < count; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 20;
        positions[i * 3 + 1] = Math.random() * 8;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 20;
        sizes[i] = Math.random() * 3 + 1;
      }
      geo.setAttribute('position', new this.THREE.BufferAttribute(positions, 3));
      geo.setAttribute('size', new this.THREE.BufferAttribute(sizes, 1));

      const mat = new this.THREE.PointsMaterial({
        color: 0x8888ff,
        size: 0.03,
        transparent: true,
        opacity: 0.4,
        blending: this.THREE.AdditiveBlending,
        sizeAttenuation: true,
      });
      const points = new this.THREE.Points(geo, mat);
      points.position.y = 0;
      this.scene.add(points);
      this.ambientParticles = points;
    }

    _setupEventListeners() {
      const closeBtn = document.getElementById('hof-close-btn');
      if (closeBtn) {
        closeBtn.addEventListener('click', () => this.destroy());
      }

      const musicBtn = document.getElementById('hof-music-toggle');
      if (musicBtn) {
        musicBtn.addEventListener('click', () => {
          this.musicEnabled = !this.musicEnabled;
          musicBtn.textContent = this.musicEnabled ? '🔊 Music' : '🔇 Mute';
          if (this.audioGain) {
            this.audioGain.gain.linearRampToValueAtTime(
              this.musicEnabled ? 0.08 : 0,
              this.audioCtx.currentTime + 0.5
            );
          }
        });
      }

      window.addEventListener('resize', this._onResize);
      document.addEventListener('keydown', this._onKeyDown);
    }

    _onResize = () => {
      if (!this.container || !this.camera || !this.renderer) return;
      const W = this.container.clientWidth;
      const H = this.container.clientHeight;
      this.camera.aspect = W / H;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(W, H);
    };

    _onKeyDown = (e) => {
      if (e.key === 'Escape') this.destroy();
    };

    _spawnConfetti(count = 50) {
      const colors = [0xffd700, 0xff4444, 0x44ff44, 0x4444ff, 0xff44ff, 0x44ffff];
      for (let i = 0; i < count; i++) {
        const geo = new this.THREE.BoxGeometry(0.03, 0.03, 0.005);
        const mat = new this.THREE.MeshBasicMaterial({
          color: colors[Math.floor(Math.random() * colors.length)],
          transparent: true,
          opacity: 1,
        });
        const mesh = new this.THREE.Mesh(geo, mat);
        mesh.position.set(
          (Math.random() - 0.5) * 4,
          Math.random() * 3 + 1,
          (Math.random() - 0.5) * 4
        );
        mesh.userData = {
          vx: (Math.random() - 0.5) * 3,
          vy: Math.random() * 3 + 1,
          vz: (Math.random() - 0.5) * 3,
          rotX: Math.random() * 10,
          rotY: Math.random() * 10,
          rotZ: Math.random() * 10,
          life: 1,
        };
        this.scene.add(mesh);
        this.confettiParticles.push(mesh);
      }
    }

    _spawnSmoke(position, count = 20) {
      for (let i = 0; i < count; i++) {
        const geo = new this.THREE.SphereGeometry(0.05, 6, 6);
        const mat = new this.THREE.MeshBasicMaterial({
          color: 0x8888aa,
          transparent: true,
          opacity: 0.5,
        });
        const mesh = new this.THREE.Mesh(geo, mat);
        mesh.position.copy(position);
        mesh.userData = {
          vx: (Math.random() - 0.5) * 0.5,
          vy: Math.random() * 0.8 + 0.3,
          vz: (Math.random() - 0.5) * 0.5,
          life: 1,
        };
        this.scene.add(mesh);
        this.smokeParticles.push(mesh);
      }
    }

    _startCeremony() {
      if (this.players.length === 0) return;
      this.ceremonyPhase = 'intro';
      this.ceremonyTimer = 0;
      this.controls.autoRotate = false;

      // Dim lights initially
      this.scene.traverse((child) => {
        if (child.isLight && child.intensity !== undefined) {
          child.userData.origIntensity = child.intensity;
          child.intensity = child.userData.origIntensity * 0.2;
        }
      });
    }

    _playBackgroundMusic() {
      try {
        const Ctor = window.AudioContext || window.webkitAudioContext;
        if (!Ctor) return;
        this.audioCtx = new Ctor();
        this.audioGain = this.audioCtx.createGain();
        this.audioGain.gain.setValueAtTime(0.08, this.audioCtx.currentTime);
        this.audioGain.connect(this.audioCtx.destination);

        // Generate a dramatic ambient drone using oscillators
        const osc1 = this.audioCtx.createOscillator();
        osc1.type = 'sawtooth';
        osc1.frequency.setValueAtTime(55, this.audioCtx.currentTime);
        osc1.frequency.linearRampToValueAtTime(55 + Math.random() * 2, this.audioCtx.currentTime + 4);

        const gain1 = this.audioCtx.createGain();
        gain1.gain.setValueAtTime(0.15, this.audioCtx.currentTime);
        gain1.gain.linearRampToValueAtTime(0.05, this.audioCtx.currentTime + 2);

        osc1.connect(gain1);
        gain1.connect(this.audioGain);
        osc1.start();

        const osc2 = this.audioCtx.createOscillator();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(110, this.audioCtx.currentTime);
        osc2.frequency.linearRampToValueAtTime(108, this.audioCtx.currentTime + 6);

        const gain2 = this.audioCtx.createGain();
        gain2.gain.setValueAtTime(0.1, this.audioCtx.currentTime);
        gain2.gain.linearRampToValueAtTime(0.03, this.audioCtx.currentTime + 3);

        osc2.connect(gain2);
        gain2.connect(this.audioGain);
        osc2.start();

        const osc3 = this.audioCtx.createOscillator();
        osc3.type = 'triangle';
        osc3.frequency.setValueAtTime(165, this.audioCtx.currentTime);
        osc3.frequency.linearRampToValueAtTime(163, this.audioCtx.currentTime + 5);

        const gain3 = this.audioCtx.createGain();
        gain3.gain.setValueAtTime(0.06, this.audioCtx.currentTime);
        gain3.gain.linearRampToValueAtTime(0.02, this.audioCtx.currentTime + 2);

        osc3.connect(gain3);
        gain3.connect(this.audioGain);
        osc3.start();

        this.audioOscillators = [osc1, osc2, osc3];
        this.audioGains = [gain1, gain2, gain3];
      } catch {}
    }

    _playCeremonySting() {
      if (!this.audioCtx || !this.musicEnabled) return;
      try {
        const now = this.audioCtx.currentTime;
        const notes = [261.63, 329.63, 392, 523.25];
        notes.forEach((freq, i) => {
          const osc = this.audioCtx.createOscillator();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now + i * 0.15);
          const gain = this.audioCtx.createGain();
          gain.gain.setValueAtTime(0, now + i * 0.15);
          gain.gain.linearRampToValueAtTime(0.15, now + i * 0.15 + 0.05);
          gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.15 + 0.5);
          osc.connect(gain);
          gain.connect(this.audioGain);
          osc.start(now + i * 0.15);
          osc.stop(now + i * 0.15 + 0.5);
        });
      } catch {}
    }

    _animate() {
      if (!this.renderer || !this.scene) return;
      this.animFrameId = requestAnimationFrame(() => this._animate());

      const delta = this.clock.getDelta();
      const elapsed = this.clock.getElapsedTime();

      // Crown bobbing and rotation
      if (this.crown) {
        this.crown.position.y = 2.3 + Math.sin(elapsed * 0.8) * 0.08;
        this.crown.rotation.y = elapsed * 0.5;
        // Scale pulse
        const pulse = 1 + Math.sin(elapsed * 1.2) * 0.02;
        this.crown.scale.set(pulse, pulse, pulse);
      }

      // Statue subtle idle sway
      this.statues.forEach((statue, i) => {
        const sway = Math.sin(elapsed * 0.3 + i * 2) * 0.003;
        statue.rotation.z = sway;
      });

      // Ambient particles float
      if (this.ambientParticles) {
        const pos = this.ambientParticles.geometry.attributes.position.array;
        for (let i = 0; i < pos.length / 3; i++) {
          pos[i * 3 + 1] += Math.sin(elapsed + i) * 0.001;
          if (pos[i * 3 + 1] > 8) pos[i * 3 + 1] = 0;
          if (pos[i * 3 + 1] < 0) pos[i * 3 + 1] = 8;
        }
        this.ambientParticles.geometry.attributes.position.needsUpdate = true;
      }

      // Confetti particles
      for (let i = this.confettiParticles.length - 1; i >= 0; i--) {
        const p = this.confettiParticles[i];
        p.userData.life -= delta * 0.5;
        if (p.userData.life <= 0) {
          this.scene.remove(p);
          this.confettiParticles.splice(i, 1);
          continue;
        }
        p.position.x += p.userData.vx * delta;
        p.position.y += p.userData.vy * delta - delta * 2;
        p.position.z += p.userData.vz * delta;
        p.rotation.x += p.userData.rotX * delta;
        p.rotation.y += p.userData.rotY * delta;
        p.material.opacity = Math.max(0, p.userData.life);
        p.scale.setScalar(p.userData.life);
      }

      // Smoke particles
      for (let i = this.smokeParticles.length - 1; i >= 0; i--) {
        const p = this.smokeParticles[i];
        p.userData.life -= delta * 0.8;
        if (p.userData.life <= 0) {
          this.scene.remove(p);
          this.smokeParticles.splice(i, 1);
          continue;
        }
        p.position.x += p.userData.vx * delta;
        p.position.y += p.userData.vy * delta;
        p.position.z += p.userData.vz * delta;
        p.scale.setScalar(1 + (1 - p.userData.life) * 2);
        p.material.opacity = Math.max(0, p.userData.life * 0.5);
      }

      // Ceremony animation
      if (this.ceremonyPhase !== 'idle') {
        this._updateCeremony(delta, elapsed);
      }

      // Pedestal glow pulse
      this.pedestals.forEach((ped, i) => {
        const glow = ped.children.find(c => c.type === 'Mesh' && c.geometry.type === 'RingGeometry');
        if (glow) {
          glow.material.opacity = 0.15 + Math.sin(elapsed * 1.5 + i * 2) * 0.08;
          glow.scale.setScalar(1 + Math.sin(elapsed * 0.8 + i) * 0.05);
        }
      });

      this.controls.update();
      this.renderer.render(this.scene, this.camera);
    }

    _updateCeremony(delta, elapsed) {
      this.ceremonyTimer += delta;

      switch (this.ceremonyPhase) {
        case 'intro':
          // Phase 1: Lights slowly come up (1.5s)
          if (this.ceremonyTimer < 1.5) {
            const t = this.ceremonyTimer / 1.5;
            this.scene.traverse((child) => {
              if (child.isLight && child.userData.origIntensity !== undefined) {
                child.intensity = child.userData.origIntensity * (0.2 + t * 0.8);
              }
            });
          } else {
            // Phase 2: Statues rise one by one
            this.ceremonyPhase = 'rising';
            this.ceremonyTimer = 0;
            this.ceremonyTargetIndex = 0;

            // Set all statues below floor initially
            this.statues.forEach((s, i) => {
              s.userData.targetY = s.position.y;
              s.position.y = -3;
            });
            this._playCeremonySting();
            this._spawnConfetti(30);
          }
          break;

        case 'rising':
          const idx = this.ceremonyTargetIndex;
          if (idx < this.statues.length) {
            const statue = this.statues[idx];
            const riseDuration = 1.2;
            const progress = Math.min(this.ceremonyTimer / riseDuration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            statue.position.y = -3 + (statue.userData.targetY + 3) * eased;

            // Smoke on rise
            if (progress > 0.3 && progress < 0.7 && Math.random() < 0.3) {
              this._spawnSmoke(
                new this.THREE.Vector3(statue.position.x, 0.5, statue.position.z),
                3
              );
            }

            if (progress >= 1) {
              this._spawnConfetti(20);
              this.ceremonyTargetIndex++;
              this.ceremonyTimer = 0;

              if (this.ceremonyTargetIndex >= this.statues.length) {
                this.ceremonyPhase = 'crown';
                // After all statues rise, delay then lower crown
                this.ceremonyTimer = -0.8;
              }
            }
          }
          break;

        case 'crown':
          if (this.crown && this.ceremonyTimer > 0) {
            const crownProgress = Math.min(this.ceremonyTimer / 1.5, 1);
            const easedCrown = 1 - Math.pow(1 - crownProgress, 3);
            this.crown.position.y = 3.5 - (3.5 - 2.3) * easedCrown;

            // Crown descending glow
            if (crownProgress > 0.5 && crownProgress < 0.9 && Math.random() < 0.4) {
              this._spawnConfetti(5);
            }

            if (crownProgress >= 1) {
              this.ceremonyPhase = 'finale';
              this.ceremonyTimer = 0;
              this._spawnConfetti(60);
              this._playCeremonySting();
            }
          }
          break;

        case 'finale':
          if (this.ceremonyTimer > 1.5) {
            this.ceremonyPhase = 'idle';
            this.controls.autoRotate = true;
          }
          break;
      }
    }

    destroy() {
      if (this.animFrameId) {
        cancelAnimationFrame(this.animFrameId);
        this.animFrameId = null;
      }

      if (this.audioOscillators) {
        this.audioOscillators.forEach(osc => {
          try { osc.stop(); } catch {}
        });
        this.audioOscillators = null;
      }

      if (this.audioCtx) {
        try { this.audioCtx.close(); } catch {}
        this.audioCtx = null;
      }

      if (this.renderer) {
        this.renderer.dispose();
        if (this.renderer.domElement && this.renderer.domElement.parentNode) {
          this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
        }
        this.renderer = null;
      }

      window.removeEventListener('resize', this._onResize);
      document.removeEventListener('keydown', this._onKeyDown);

      if (this.overlay) {
        this.overlay.style.display = 'none';
      }

      this.scene = null;
      this.camera = null;
      this.controls = null;
      activeScene = null;
    }
  }
})();
