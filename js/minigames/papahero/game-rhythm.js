// js/minigames/papahero/game-rhythm.js

import { DEFAULT_SONG_CONFIG, parseMoonscraperChart, getFallbackChart, createNoteInstances } from './papahero-chart.js';
import { PapaheroAudio } from './papahero-audio.js';
import { PapaheroRenderer } from './papahero-renderer.js';

export class RhythmPotatoGame {
  constructor(containerElement, onWinCallback, mainBgm = null) {
    this.container = containerElement;
    this.onWin = onWinCallback;

    this.audio = new PapaheroAudio(mainBgm);
    this.renderer = new PapaheroRenderer();

    // Resolución interna estilo PS1
    this.width = 640;
    this.height = 360;

    this.canvas = document.createElement('canvas');
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.canvas.className = 'w-full h-full object-contain bg-black';
    this.canvas.style.imageRendering = 'pixelated';

    this.container.innerHTML = '';
    this.container.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');

    this.songConfig = { ...DEFAULT_SONG_CONFIG };

    this.timeOfDayMode = 'auto'; // Cambia Mañana -> Golden Hour -> Noche automáticamente
    this.currentStageTime = 'morning';

    // 5 CARRILES (A, S, D, F, G)
    this.laneCount = 5;
    this.laneKeys = ['KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyG'];
    this.laneLabels = ['A', 'S', 'D', 'F', 'G'];
    this.laneColors = ['#22c55e', '#ef4444', '#eab308', '#3b82f6', '#f97316'];
    this.keysHeld = [false, false, false, false, false];

    // Geometría en perspectiva 3D del mesón de azulejos
    this.neckTopY = 92;
    this.neckBottomY = 335;
    this.hitLineZ = 0.86;
    this.neckTopWidth = 140;
    this.neckBottomWidth = 430;
    this.noteApproachTime = this.songConfig.approachTime;

    // Ventanas de precisión (segundos)
    this.perfectWindow = 0.055; // ±55ms -> ¡BIEN!
    this.goodWindow = 0.150;    // ±150ms -> RUSHING / DRAGGING

    // Estadísticas
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.health = 75;
    this.maxHealth = 100;

    // Medidor de Supercarga (Papa pelándose)
    this.peelCharge = 0;
    this.isOverdrive = false;

    // Textos de feedback
    this.judgmentText = '¡PREPARA LA SARTÉN!';
    this.judgmentSubText = 'Presiona A, S, D, F, G cuando las papas lleguen a los quemadores';
    this.judgmentColor = '#facc15';
    this.judgmentTimer = 3.0;

    this.particles = [];
    this.peelFlakes = [];
    this.activeHolds = [null, null, null, null, null];

    this.songStartTime = 0;
    this.currentSongTime = 0;
    this.songDuration = 195;
    this.chartEndTime = 195;

    this.rawChart = [];
    this.notes = [];
    this.isLoadingChart = false;

    // Estados de pantalla
    this.waitingForStart = true;
    this.isGameOver = false;
    this.isVictory = false;

    this.animFrameId = null;
    this.lastFrameTime = performance.now();

    this.createTouchControls();
    this.bindEvents();

    this.loadSongAndChart();
    this.loop(this.lastFrameTime);
  }

  getTrackPoint(lanePos, zNorm) {
    return this.renderer.getTrackPoint(this, lanePos, zNorm);
  }

  async loadSongAndChart() {
    this.waitingForStart = true;
    this.isGameOver = false;
    this.isVictory = false;
    this.isLoadingChart = true;

    this.score = 0;
    this.combo = 0;
    this.health = 75;
    this.peelCharge = 0;
    this.isOverdrive = false;
    this.activeHolds = [null, null, null, null, null];
    this.currentSongTime = 0;

    this.audio.stopAllAudioTracks();

    try {
      const response = await fetch(this.songConfig.chartSrc);
      if (!response.ok) throw new Error('No se encontró notes1.chart');
      const chartText = await response.text();
      const parsedNotes = parseMoonscraperChart(chartText, this.songConfig.difficulty);

      if (parsedNotes.length > 0) {
        this.rawChart = parsedNotes;
        console.log(`[PAPAHERO] Chart de guitarra cargado: ${parsedNotes.length} notas.`);
      } else {
        this.rawChart = getFallbackChart();
      }
    } catch (err) {
      console.warn('[PAPAHERO] Error al leer notes1.chart, usando respaldo:', err);
      this.rawChart = getFallbackChart();
    }

    this.resetNotes();
    this.songDuration = await this.audio.setupMultiTrackAudio(this.songConfig.audioSources, this.chartEndTime);
    this.isLoadingChart = false;
  }

  resetNotes() {
    const { notes, chartEndTime } = createNoteInstances(this.rawChart);
    this.notes = notes;
    this.chartEndTime = chartEndTime;
    if (!this.audio.masterAudio || !isFinite(this.audio.masterAudio.duration)) {
      this.songDuration = this.chartEndTime;
    }
  }

  startSong() {
    if (this.isLoadingChart) return;
    this.waitingForStart = false;
    this.songStartTime = performance.now();
    this.currentSongTime = 0;
    this.audio.startSong();
  }

  triggerFinalVictory() {
    this.isVictory = true;
    this.audio.stopAllAudioTracks();
    this.judgmentText = '¡HASHBROWNS DORADOS LISTOS!';
    this.judgmentSubText = 'DESBLOQUEANDO RECETA EN EL ANILLO...';
    this.judgmentColor = '#4ade80';
    this.judgmentTimer = 4.0;

    setTimeout(() => {
      if (this.onWin) this.onWin();
    }, 2200);
  }

  createTouchControls() {
    this.touchOverlay = document.createElement('div');
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0 || window.innerWidth < 900;
    this.touchOverlay.className = `${isTouch ? 'flex' : 'hidden'} absolute inset-x-0 bottom-1 pointer-events-none justify-between px-3 z-20 select-none`;

    this.touchOverlay.innerHTML = `
      <div class="flex gap-1.5 pointer-events-auto">
        <button data-lane="0" class="rhythm-btn w-11 h-12 bg-green-700/80 border-2 border-white text-white font-bold text-lg rounded active:scale-95">A</button>
        <button data-lane="1" class="rhythm-btn w-11 h-12 bg-red-700/80 border-2 border-white text-white font-bold text-lg rounded active:scale-95">S</button>
        <button data-lane="2" class="rhythm-btn w-11 h-12 bg-yellow-500/80 border-2 border-white text-black font-bold text-lg rounded active:scale-95">D</button>
      </div>
      <button data-action="overdrive" class="pointer-events-auto px-2.5 h-12 bg-yellow-600/85 border-2 border-white text-black font-bold text-xs rounded active:scale-95">
        🥔 SUPER
      </button>
      <div class="flex gap-1.5 pointer-events-auto">
        <button data-lane="3" class="rhythm-btn w-11 h-12 bg-blue-700/80 border-2 border-white text-white font-bold text-lg rounded active:scale-95">F</button>
        <button data-lane="4" class="rhythm-btn w-11 h-12 bg-orange-600/80 border-2 border-white text-white font-bold text-lg rounded active:scale-95">G</button>
      </div>
    `;
    this.container.appendChild(this.touchOverlay);

    this.touchOverlay.querySelectorAll('.rhythm-btn').forEach(btn => {
      const lane = Number(btn.dataset.lane);
      btn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (this.waitingForStart) { this.startSong(); return; }
        if (this.isGameOver) { this.restartSong(); return; }
        this.handleLanePress(lane);
      }, { passive: false });

      btn.addEventListener('touchend', (e) => {
        e.preventDefault();
        this.handleLaneRelease(lane);
      }, { passive: false });
    });

    const odBtn = this.touchOverlay.querySelector('[data-action="overdrive"]');
    if (odBtn) {
      odBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        this.tryActivateOverdrive();
      }, { passive: false });
    }
  }

  bindEvents() {
    this.onKeyDown = (e) => {
      const code = e.code;

      if (this.waitingForStart && (this.laneKeys.includes(code) || code === 'Space' || code === 'Enter')) {
        e.preventDefault();
        this.startSong();
        return;
      }

      if (this.isGameOver && (code === 'KeyR' || code === 'Space')) {
        e.preventDefault();
        this.restartSong();
        return;
      }

      if (code === 'KeyC' && !e.repeat) {
        this.cycleTimeOfDayMode();
        return;
      }

      if (code === 'Space' && !e.repeat) {
        e.preventDefault();
        this.tryActivateOverdrive();
        return;
      }

      const laneIdx = this.laneKeys.indexOf(code);
      if (laneIdx !== -1 && !e.repeat) {
        e.preventDefault();
        this.handleLanePress(laneIdx);
      }
    };

    this.onKeyUp = (e) => {
      const laneIdx = this.laneKeys.indexOf(e.code);
      if (laneIdx !== -1) {
        e.preventDefault();
        this.handleLaneRelease(laneIdx);
      }
    };

    this.onCanvasClick = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * this.width;
      const y = ((e.clientY - rect.top) / rect.height) * this.height;

      if (this.waitingForStart) {
        this.startSong();
        return;
      }
      if (this.isGameOver) {
        this.restartSong();
        return;
      }

      if (x >= 220 && x <= 420 && y >= 6 && y <= 34) {
        this.cycleTimeOfDayMode();
        return;
      }

      if (x >= 520 && x <= 630 && y >= 130 && y <= 310) {
        this.tryActivateOverdrive();
      }
    };

    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    this.canvas.addEventListener('mousedown', this.onCanvasClick);
  }

  cycleTimeOfDayMode() {
    const modes = ['auto', 'morning', 'afternoon', 'night'];
    const nextIdx = (modes.indexOf(this.timeOfDayMode) + 1) % modes.length;
    this.timeOfDayMode = modes[nextIdx];
  }

  handleLanePress(lane) {
    this.keysHeld[lane] = true;

    let candidate = null;
    let minAbsDiff = Infinity;

    for (const note of this.notes) {
      if (note.lane !== lane || note.hit || note.missed) continue;
      const diff = this.currentSongTime - note.time;
      const absDiff = Math.abs(diff);
      if (absDiff < minAbsDiff) {
        minAbsDiff = absDiff;
        candidate = { note, diff, absDiff };
      }
    }

    if (candidate && candidate.absDiff <= this.goodWindow) {
      const { note, diff, absDiff } = candidate;
      note.hit = true;

      if (absDiff <= this.perfectWindow) {
        this.registerHit('¡BIEN!', 'PERFECTO EN EL QUEMADOR', '#4ade80', 100, lane);
      } else if (diff < 0) {
        const ms = Math.round(Math.abs(diff) * 1000);
        this.registerHit('RUSHING!', `MUY TEMPRANO (-${ms}ms)`, '#38bdf8', 65, lane);
      } else {
        const ms = Math.round(diff * 1000);
        this.registerHit('DRAGGING!', `MUY TARDE (+${ms}ms)`, '#fb923c', 65, lane);
      }

      if (note.duration > 0.12) {
        note.holding = true;
        this.activeHolds[lane] = note;
      }
    } else {
      this.registerMiss('¡FALLO!', 'QUEMADOR EN VACÍO / DESTIEMPO', lane);
    }
  }

  handleLaneRelease(lane) {
    this.keysHeld[lane] = false;
    const heldNote = this.activeHolds[lane];
    if (heldNote && heldNote.holding) {
      const endTime = heldNote.time + heldNote.duration;
      if (this.currentSongTime < endTime - 0.15) {
        heldNote.holding = false;
        this.judgmentText = '¡SOLTASTE ANTES!';
        this.judgmentSubText = 'MANTÉN LA PAPA EN EL QUEMADOR';
        this.judgmentColor = '#fb923c';
        this.judgmentTimer = 0.8;
      } else {
        heldNote.holding = false;
        heldNote.holdCompleted = true;
      }
      this.activeHolds[lane] = null;
    }
  }

  getBaseMultiplier() {
    if (this.combo >= 30) return 4;
    if (this.combo >= 20) return 3;
    if (this.combo >= 10) return 2;
    return 1;
  }

  getTotalMultiplier() {
    return this.getBaseMultiplier() * (this.isOverdrive ? 2 : 1);
  }

  registerHit(title, subtitle, color, basePoints, lane) {
    this.combo++;
    if (this.combo > this.maxCombo) this.maxCombo = this.combo;

    const mult = this.getTotalMultiplier();
    this.score += basePoints * mult;

    const heal = this.isOverdrive ? 5.5 : 3.0;
    this.health = Math.min(this.maxHealth, this.health + heal);

    if (!this.isOverdrive) {
      const prevCharge = this.peelCharge;
      this.peelCharge = Math.min(100, this.peelCharge + 4.5);
      if (Math.floor(this.peelCharge / 8) > Math.floor(prevCharge / 8)) {
        this.spawnPeelFlake();
      }
    }

    this.judgmentText = title;
    this.judgmentSubText = subtitle;
    this.judgmentColor = color;
    this.judgmentTimer = 0.95;

    const burnerPos = this.getTrackPoint(lane + 0.5, this.hitLineZ);
    this.spawnBurnerSparks(burnerPos.x, burnerPos.y, this.isOverdrive ? '#fde047' : this.laneColors[lane], 14);
    this.audio.playSfx('hit', lane);
  }

  registerMiss(title, subtitle, lane = -1) {
    this.combo = 0;
    this.health = Math.max(0, this.health - 9);

    this.judgmentText = title;
    this.judgmentSubText = subtitle;
    this.judgmentColor = '#ef4444';
    this.judgmentTimer = 0.95;

    this.audio.playSfx('miss', lane);

    if (this.health <= 0) {
      this.isGameOver = true;
      this.audio.stopAllAudioTracks();
    }
  }

  tryActivateOverdrive() {
    if (!this.isOverdrive && this.peelCharge >= 50) {
      this.isOverdrive = true;
      this.audio.playSfx('overdrive');
      this.judgmentText = '¡PAPA PELADA AL MÁXIMO!';
      this.judgmentSubText = '¡SUPERCARGA x2 ACTIVADA!';
      this.judgmentColor = '#fde047';
      this.judgmentTimer = 1.4;

      for (let i = 0; i < 6; i++) this.spawnPeelFlake();
    }
  }

  restartSong() {
    this.audio.stopAllAudioTracks();
    this.isGameOver = false;
    this.isVictory = false;
    this.score = 0;
    this.combo = 0;
    this.health = 75;
    this.peelCharge = 0;
    this.isOverdrive = false;
    this.activeHolds = [null, null, null, null, null];
    this.resetNotes();
    this.startSong();
  }

  loop(timestamp) {
    const dt = Math.min(0.05, (timestamp - this.lastFrameTime) / 1000);
    this.lastFrameTime = timestamp;

    this.update(dt);
    this.render();

    this.animFrameId = requestAnimationFrame((t) => this.loop(t));
  }

  update(dt) {
    if (this.judgmentTimer > 0) this.judgmentTimer -= dt;
    this.updateParticles(dt);

    if (this.waitingForStart || this.isGameOver || this.isVictory) return;

    if (!this.audio.useFallbackClock && this.audio.masterAudio && !this.audio.masterAudio.paused) {
      this.currentSongTime = this.audio.masterAudio.currentTime;
      this.audio.syncTracks(this.currentSongTime);
    } else {
      this.currentSongTime = (performance.now() - this.songStartTime) / 1000;
    }

    this.updateKitchenTimeOfDay();

    if (this.isOverdrive) {
      this.peelCharge -= 12.5 * dt;
      if (this.peelCharge <= 0) {
        this.peelCharge = 0;
        this.isOverdrive = false;
      }
    }

    for (const note of this.notes) {
      if (!note.hit && !note.missed && this.currentSongTime > note.time + this.goodWindow) {
        note.missed = true;
        this.registerMiss('¡FALLO!', 'PAPA CRUDA SIN COCINAR');
      }

      if (note.holding) {
        const endTime = note.time + note.duration;
        if (this.keysHeld[note.lane] && this.currentSongTime <= endTime) {
          this.score += Math.round(140 * this.getTotalMultiplier() * dt);
          this.health = Math.min(this.maxHealth, this.health + 4 * dt);
          if (!this.isOverdrive) {
            this.peelCharge = Math.min(100, this.peelCharge + 3.5 * dt);
          }
          if (Math.random() < 0.45) {
            const burnerPos = this.getTrackPoint(note.lane + 0.5, this.hitLineZ);
            this.spawnBurnerSparks(burnerPos.x, burnerPos.y, '#facc15', 2);
          }
        } else if (this.currentSongTime > endTime) {
          note.holding = false;
          note.holdCompleted = true;
          this.activeHolds[note.lane] = null;
        }
      }
    }

    const levelEndTarget = Math.min(this.songDuration, this.chartEndTime);
    if (this.currentSongTime >= levelEndTarget && !this.isGameOver) {
      this.triggerFinalVictory();
    }
  }

  updateKitchenTimeOfDay() {
    if (this.timeOfDayMode !== 'auto') {
      this.currentStageTime = this.timeOfDayMode;
      return;
    }
    const total = Math.min(this.songDuration, this.chartEndTime) || 60;
    const progress = this.currentSongTime / total;
    if (progress < 0.34) {
      this.currentStageTime = 'morning';
    } else if (progress < 0.68) {
      this.currentStageTime = 'afternoon';
    } else {
      this.currentStageTime = 'night';
    }
  }

  spawnBurnerSparks(x, y, color, count = 10) {
    for (let i = 0; i < count; i++) {
      const ang = -Math.PI * 0.15 - Math.random() * Math.PI * 0.7;
      const spd = 45 + Math.random() * 125;
      this.particles.push({
        x: x + (Math.random() - 0.5) * 18,
        y: y + (Math.random() - 0.5) * 6,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        color,
        size: 3 + Math.floor(Math.random() * 4),
        life: 0.22 + Math.random() * 0.25
      });
    }
  }

  spawnPeelFlake() {
    this.peelFlakes.push({
      x: 565 + (Math.random() - 0.5) * 44,
      y: 195 + (Math.random() - 0.5) * 35,
      vx: (Math.random() - 0.5) * 70,
      vy: -50 - Math.random() * 40,
      rot: Math.random() * Math.PI,
      life: 0.9
    });
  }

  updateParticles(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 240 * dt;
      p.life -= dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }

    for (let i = this.peelFlakes.length - 1; i >= 0; i--) {
      const f = this.peelFlakes[i];
      f.x += f.vx * dt;
      f.y += f.vy * dt;
      f.vy += 190 * dt;
      f.rot += 4 * dt;
      f.life -= dt;
      if (f.life <= 0) this.peelFlakes.splice(i, 1);
    }
  }

  render() {
    this.renderer.render(this);
  }

  destroy() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
    }
    this.audio.destroy();

    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    this.canvas.removeEventListener('mousedown', this.onCanvasClick);

    if (this.touchOverlay) {
      this.touchOverlay.remove();
    }
  }
}

export { RhythmPotatoGame as RhythmGame };
