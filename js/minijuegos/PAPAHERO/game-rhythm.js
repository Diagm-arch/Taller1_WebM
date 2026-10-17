export class RhythmPotatoGame {
  constructor(containerElement, onWinCallback, mainBgm = null) {
    this.container = containerElement;
    this.onWin = onWinCallback;
    this.mainBgm = mainBgm;

    // Pausar la radio DnB del menú principal mientras se juega
    this.wasBgmPlaying = false;
    if (this.mainBgm && this.mainBgm.isPlaying) {
      this.wasBgmPlaying = true;
      if (typeof this.mainBgm.pause === 'function') {
        this.mainBgm.pause();
      } else if (this.mainBgm.audio) {
        this.mainBgm.audio.pause();
      }
    }

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

    // =========================================================================
    // CONFIGURACIÓN: MULTIPISTA AUDIO (.ogg) + SOLO GUITARRA EN NOTAS (.chart)
    // =========================================================================
    this.songConfig = {
      name: 'SOLO DE GUITARRA (BANDA COMPLETA)',
      audioSources: [
        './assets/rhythmGame/guitar.ogg',
        './assets/rhythmGame/bass.ogg',
        './assets/rhythmGame/drums.ogg',
        './assets/rhythmGame/rhythm.ogg',
        './assets/rhythmGame/vocals.ogg'
      ],
      chartSrc: './assets/rhythmGame/notes1.chart',
      difficulty: 'ExpertSingle', // Lee solo la pista de guitarra para las notas
      approachTime: 1.45
    };

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

    // Reproductor Multipista de Audio
    this.audioTracks = [];
    this.masterAudio = null;
    this.useFallbackClock = false;
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

    // Cargar notas de guitarra y todas las pistas .ogg simultáneamente
    this.loadSongAndChart();
    this.loop(this.lastFrameTime);
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

    this.useFallbackClock = false;
    this.stopAllAudioTracks();

    try {
      const response = await fetch(this.songConfig.chartSrc);
      if (!response.ok) throw new Error('No se encontró notes1.chart');
      const chartText = await response.text();
      const parsedNotes = this.parseMoonscraperChart(chartText, this.songConfig.difficulty);

      if (parsedNotes.length > 0) {
        this.rawChart = parsedNotes;
        console.log(`[PAPAHERO] Chart de guitarra cargado: ${parsedNotes.length} notas.`);
      } else {
        this.rawChart = this.getFallbackChart();
      }
    } catch (err) {
      console.warn('[PAPAHERO] Error al leer notes1.chart, usando respaldo:', err);
      this.rawChart = this.getFallbackChart();
    }

    this.resetNotes();
    await this.setupMultiTrackAudio(this.songConfig.audioSources);
    this.isLoadingChart = false;
  }

  // Carga paralela de todos los .ogg de la carpeta
  async setupMultiTrackAudio(sources) {
    this.audioTracks = [];
    this.masterAudio = null;

    const loadPromises = sources.map((url) => {
      return new Promise((resolve) => {
        const audio = new Audio();
        audio.preload = 'auto';

        const cleanup = () => {
          audio.removeEventListener('canplaythrough', onReady);
          audio.removeEventListener('loadedmetadata', onReady);
          audio.removeEventListener('error', onError);
        };

        const onReady = () => {
          cleanup();
          resolve(audio);
        };

        const onError = () => {
          cleanup();
          resolve(null); // Si falta algún instrumento secundario, no bloquea el juego
        };

        audio.addEventListener('canplaythrough', onReady, { once: true });
        audio.addEventListener('loadedmetadata', onReady, { once: true });
        audio.addEventListener('error', onError, { once: true });

        audio.src = url;
        audio.load();
      });
    });

    const loaded = await Promise.all(loadPromises);
    this.audioTracks = loaded.filter(Boolean);

    if (this.audioTracks.length > 0) {
      this.masterAudio = this.audioTracks[0];
      if (this.masterAudio.duration && isFinite(this.masterAudio.duration)) {
        this.songDuration = this.masterAudio.duration;
      }
      this.masterAudio.addEventListener('loadedmetadata', () => {
        if (this.masterAudio && isFinite(this.masterAudio.duration)) {
          this.songDuration = this.masterAudio.duration;
        }
      });
      console.log(`[PAPAHERO] Pistas de audio listas: ${this.audioTracks.length} instrumentos sonando juntos.`);
    } else {
      this.useFallbackClock = true;
      this.songDuration = this.chartEndTime;
    }
  }

  stopAllAudioTracks() {
    if (!this.audioTracks) return;
    for (const track of this.audioTracks) {
      try {
        track.pause();
        track.currentTime = 0;
      } catch (e) {}
    }
  }

  // Parser enfocado exclusivamente en la pista de guitarra principal
  parseMoonscraperChart(chartText, preferredDiff = 'ExpertSingle') {
    const resMatch = chartText.match(/Resolution\s*=\s*(\d+)/i);
    const resolution = resMatch ? parseInt(resMatch[1], 10) : 192;

    const offsetMatch = chartText.match(/Offset\s*=\s*([-\d.]+)/i);
    const offsetSec = offsetMatch ? parseFloat(offsetMatch[1]) : 0;

    const syncMatch = chartText.match(/\[SyncTrack\]\s*\{([\s\S]*?)\}/i);
    const bpmEvents = [];
    if (syncMatch) {
      const lines = syncMatch[1].split('\n');
      for (const line of lines) {
        const m = line.trim().match(/^(\d+)\s*=\s*B\s+(\d+)/i);
        if (m) {
          bpmEvents.push({
            tick: parseInt(m[1], 10),
            bpm: parseInt(m[2], 10) / 1000
          });
        }
      }
    }
    if (bpmEvents.length === 0 || bpmEvents[0].tick > 0) {
      bpmEvents.unshift({ tick: 0, bpm: 120 });
    }
    bpmEvents.sort((a, b) => a.tick - b.tick);

    let accTime = 0;
    for (let i = 0; i < bpmEvents.length; i++) {
      if (i > 0) {
        const deltaTicks = bpmEvents[i].tick - bpmEvents[i - 1].tick;
        accTime += (deltaTicks / resolution) * (60 / bpmEvents[i - 1].bpm);
      }
      bpmEvents[i].timeSec = accTime;
    }

    const tickToSeconds = (tick) => {
      let activeBpm = bpmEvents[0];
      for (let i = 0; i < bpmEvents.length; i++) {
        if (bpmEvents[i].tick <= tick) activeBpm = bpmEvents[i];
        else break;
      }
      const deltaTicks = tick - activeBpm.tick;
      return offsetSec + activeBpm.timeSec + (deltaTicks / resolution) * (60 / activeBpm.bpm);
    };

    const diffOrder = [preferredDiff, 'ExpertSingle', 'HardSingle', 'MediumSingle', 'EasySingle'];
    let notesBlock = null;
    for (const diff of diffOrder) {
      const regex = new RegExp(`\\[${diff}\\]\\s*\\{([\\s\\S]*?)\\}`, 'i');
      const match = chartText.match(regex);
      if (match && match[1].includes('= N')) {
        notesBlock = match[1];
        break;
      }
    }
    if (!notesBlock) return [];

    const result = [];
    const seenAtTick = new Set();
    const lines = notesBlock.split('\n');

    for (const line of lines) {
      const m = line.trim().match(/^(\d+)\s*=\s*N\s+(\d+)\s+(\d+)/i);
      if (!m) continue;

      const tick = parseInt(m[1], 10);
      const rawFret = parseInt(m[2], 10);
      const sustainTicks = parseInt(m[3], 10);

      if (rawFret === 5 || rawFret === 6 || rawFret > 7) continue;

      const lane = rawFret === 7 ? (tick % 5) : rawFret;
      if (lane < 0 || lane > 4) continue;

      const key = `${tick}-${lane}`;
      if (seenAtTick.has(key)) continue;
      seenAtTick.add(key);

      const startTime = tickToSeconds(tick);
      if (startTime < 0.2) continue;

      const endTime = tickToSeconds(tick + sustainTicks);
      const durationSec = sustainTicks > 0 ? Number((endTime - startTime).toFixed(3)) : 0;

      result.push({
        time: Number(startTime.toFixed(3)),
        lane: lane,
        duration: durationSec >= 0.16 ? durationSec : 0
      });
    }

    return result.sort((a, b) => a.time - b.time);
  }

  getFallbackChart() {
    return [
      { time: 1.5, lane: 0, duration: 0 },
      { time: 2.0, lane: 1, duration: 0 },
      { time: 2.5, lane: 2, duration: 0 },
      { time: 3.0, lane: 3, duration: 0 },
      { time: 3.5, lane: 4, duration: 0.8 },
      { time: 4.5, lane: 0, duration: 0 },
      { time: 5.0, lane: 2, duration: 0 },
      { time: 5.5, lane: 4, duration: 1.2 }
    ];
  }

  resetNotes() {
    this.notes = this.rawChart.map((n, idx) => ({
      id: idx,
      time: n.time,
      lane: n.lane,
      duration: n.duration || 0,
      hit: false,
      missed: false,
      holding: false,
      holdCompleted: false,
      seed: (idx * 37) % 100
    }));

    const lastNote = this.notes[this.notes.length - 1];
    this.chartEndTime = lastNote ? lastNote.time + (lastNote.duration || 0) + 2.5 : 30;
    if (!this.masterAudio || !isFinite(this.masterAudio.duration)) {
      this.songDuration = this.chartEndTime;
    }
  }

  setupAudioEvents() {
    // Manejado en setupMultiTrackAudio
  }

  startSong() {
    if (this.isLoadingChart) return;
    this.waitingForStart = false;
    this.songStartTime = performance.now();
    this.currentSongTime = 0;

    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) this.audioCtx = new AudioContextClass();
    }

    if (this.audioTracks.length > 0) {
      for (const track of this.audioTracks) {
        track.currentTime = 0;
        track.play().catch(() => {
          this.useFallbackClock = true;
        });
      }
    } else {
      this.useFallbackClock = true;
    }
  }

  triggerFinalVictory() {
    this.isVictory = true;
    this.stopAllAudioTracks();
    this.judgmentText = '¡HASHBROWNS DORADOS LISTOS!';
    this.judgmentSubText = 'DESBLOQUEANDO RECETA EN EL ANILLO...';
    this.judgmentColor = '#4ade80';
    this.judgmentTimer = 4.0;

    setTimeout(() => {
      if (this.onWin) this.onWin();
    }, 2200);
  }

  playSfx(type, lane = 0) {
    if (!this.audioCtx) return;
    try {
      const now = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      if (type === 'hit') {
        const freqs = [220.0, 261.6, 329.6, 392.0, 523.2];
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freqs[lane] || 330, now);
        gain.gain.setValueAtTime(this.useFallbackClock ? 0.12 : 0.03, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.start(now);
        osc.stop(now + 0.08);
      } else if (type === 'miss') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(95, now);
        osc.frequency.linearRampToValueAtTime(55, now + 0.14);
        gain.gain.setValueAtTime(0.07, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
        osc.start(now);
        osc.stop(now + 0.14);
      } else if (type === 'overdrive') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.35);
        gain.gain.setValueAtTime(0.09, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.35);
      }
    } catch (e) {}
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
    this.playSfx('hit', lane);
  }

  registerMiss(title, subtitle, lane = -1) {
    this.combo = 0;
    this.health = Math.max(0, this.health - 9);

    this.judgmentText = title;
    this.judgmentSubText = subtitle;
    this.judgmentColor = '#ef4444';
    this.judgmentTimer = 0.95;

    this.playSfx('miss', lane);

    if (this.health <= 0) {
      this.isGameOver = true;
      this.stopAllAudioTracks();
    }
  }

  tryActivateOverdrive() {
    if (!this.isOverdrive && this.peelCharge >= 50) {
      this.isOverdrive = true;
      this.playSfx('overdrive');
      this.judgmentText = '¡PAPA PELADA AL MÁXIMO!';
      this.judgmentSubText = '¡SUPERCARGA x2 ACTIVADA!';
      this.judgmentColor = '#fde047';
      this.judgmentTimer = 1.4;

      for (let i = 0; i < 6; i++) this.spawnPeelFlake();
    }
  }

  restartSong() {
    this.stopAllAudioTracks();
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

    if (!this.useFallbackClock && this.masterAudio && !this.masterAudio.paused) {
      this.currentSongTime = this.masterAudio.currentTime;

      // Mantener sincronizadas todas las pistas de audio (guitar, bass, drums, etc.)
      for (let i = 1; i < this.audioTracks.length; i++) {
        const track = this.audioTracks[i];
        if (Math.abs(track.currentTime - this.currentSongTime) > 0.08) {
          track.currentTime = this.currentSongTime;
        }
      }
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

  getTrackPoint(lanePos, zNorm) {
    const pZ = Math.pow(Math.max(0, zNorm), 1.45);
    const y = this.neckTopY + (this.neckBottomY - this.neckTopY) * pZ;
    const widthAtZ = this.neckTopWidth + (this.neckBottomWidth - this.neckTopWidth) * pZ;
    const leftX = (this.width - widthAtZ) / 2;
    const x = leftX + (lanePos / this.laneCount) * widthAtZ;
    const scale = 0.35 + 0.65 * pZ;
    return { x, y, scale, widthAtZ, leftX };
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
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    this.drawKitchenBackground(ctx);
    this.drawTiledCounterFretboard(ctx);
    this.drawStoveBurners(ctx);
    this.drawPotatoNotes(ctx);

    for (const p of this.particles) {
      ctx.fillStyle = p.color;
      ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
    }

    this.drawPeelingPotatoMeter(ctx);
    this.drawRockMeterLeft(ctx);
    this.drawHUD(ctx);

    if (this.waitingForStart) {
      this.drawStartOverlay(ctx);
    } else if (this.isGameOver) {
      this.drawGameOverOverlay(ctx);
    }
  }

  drawKitchenBackground(ctx) {
    const stage = this.currentStageTime;

    let wallColor = '#cbd5e1';
    let cabinetColor = '#78350f';
    let skyTop = '#38bdf8';
    let skyBottom = '#bae6fd';
    let ambientOverlay = 'rgba(255, 255, 220, 0.04)';

    if (stage === 'afternoon') {
      wallColor = '#fed7aa';
      cabinetColor = '#5c2d0c';
      skyTop = '#ea580c';
      skyBottom = '#fde047';
      ambientOverlay = 'rgba(251, 146, 60, 0.16)';
    } else if (stage === 'night') {
      wallColor = '#1e1b4b';
      cabinetColor = '#27170e';
      skyTop = '#090d16';
      skyBottom = '#1e1b4b';
      ambientOverlay = 'rgba(15, 23, 42, 0.35)';
    }

    ctx.fillStyle = wallColor;
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.strokeStyle = stage === 'night' ? '#312e81' : (stage === 'afternoon' ? '#fdba74' : '#94a3b8');
    ctx.lineWidth = 1;
    for (let y = 70; y < 220; y += 18) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(this.width, y); ctx.stroke();
    }
    for (let x = 0; x < this.width; x += 28) {
      ctx.beginPath(); ctx.moveTo(x, 70); ctx.lineTo(x, 220); ctx.stroke();
    }

    const winX = 42, winY = 18, winW = 135, winH = 74;
    const skyGrad = ctx.createLinearGradient(winX, winY, winX, winY + winH);
    skyGrad.addColorStop(0, skyTop);
    skyGrad.addColorStop(1, skyBottom);
    ctx.fillStyle = skyGrad;
    ctx.fillRect(winX, winY, winW, winH);

    if (stage === 'morning') {
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(winX + 38, winY + 26, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.moveTo(winX, winY + winH);
      ctx.lineTo(winX + 45, winY + 52);
      ctx.lineTo(winX + 95, winY + 60);
      ctx.lineTo(winX + winW, winY + 46);
      ctx.lineTo(winX + winW, winY + winH);
      ctx.fill();
    } else if (stage === 'afternoon') {
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.arc(winX + 88, winY + 46, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(winX + 88, winY + 46, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#7c2d12';
      ctx.beginPath();
      ctx.moveTo(winX, winY + winH);
      ctx.lineTo(winX + 50, winY + 48);
      ctx.lineTo(winX + 100, winY + 58);
      ctx.lineTo(winX + winW, winY + 44);
      ctx.lineTo(winX + winW, winY + winH);
      ctx.fill();
    } else {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(winX + 20, winY + 14, 2, 2);
      ctx.fillRect(winX + 55, winY + 28, 2, 2);
      ctx.fillRect(winX + 110, winY + 18, 3, 3);
      ctx.fillRect(winX + 82, winY + 40, 2, 2);
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.arc(winX + 42, winY + 30, 12, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.strokeStyle = cabinetColor;
    ctx.lineWidth = 5;
    ctx.strokeRect(winX, winY, winW, winH);
    ctx.beginPath();
    ctx.moveTo(winX + winW / 2, winY); ctx.lineTo(winX + winW / 2, winY + winH);
    ctx.moveTo(winX, winY + winH / 2); ctx.lineTo(winX + winW, winY + winH / 2);
    ctx.stroke();

    ctx.fillStyle = stage === 'night' ? '#475569' : '#94a3b8';
    ctx.beginPath();
    ctx.moveTo(275, 0); ctx.lineTo(365, 0); ctx.lineTo(405, 68); ctx.lineTo(235, 68);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = stage === 'night' ? 'rgba(253, 224, 71, 0.32)' : 'rgba(253, 224, 71, 0.16)';
    ctx.beginPath();
    ctx.moveTo(250, 68); ctx.lineTo(390, 68); ctx.lineTo(470, 180); ctx.lineTo(170, 180);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = cabinetColor;
    ctx.fillRect(445, 16, 155, 68);
    ctx.strokeStyle = '#1c1917';
    ctx.lineWidth = 2;
    ctx.strokeRect(445, 16, 76, 68);
    ctx.strokeRect(523, 16, 77, 68);
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(510, 44, 4, 14);
    ctx.fillRect(530, 44, 4, 14);

    ctx.fillStyle = stage === 'night' ? '#334155' : (stage === 'afternoon' ? '#78350f' : '#64748b');
    ctx.fillRect(0, 92, this.width, 268);

    ctx.fillStyle = ambientOverlay;
    ctx.fillRect(0, 0, this.width, this.height);
  }

  drawTiledCounterFretboard(ctx) {
    const topL = this.getTrackPoint(0, 0);
    const topR = this.getTrackPoint(this.laneCount, 0);
    const botL = this.getTrackPoint(0, 1);
    const botR = this.getTrackPoint(this.laneCount, 1);

    ctx.fillStyle = this.isOverdrive ? '#ca8a04' : '#78350f';
    ctx.beginPath();
    ctx.moveTo(topL.x - 10, topL.y);
    ctx.lineTo(topR.x + 10, topR.y);
    ctx.lineTo(botR.x + 18, botR.y);
    ctx.lineTo(botL.x - 18, botL.y);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = this.isOverdrive ? '#fef9c3' : '#f8fafc';
    ctx.beginPath();
    ctx.moveTo(topL.x, topL.y);
    ctx.lineTo(topR.x, topR.y);
    ctx.lineTo(botR.x, botR.y);
    ctx.lineTo(botL.x, botL.y);
    ctx.closePath();
    ctx.fill();

    const numRows = 12;
    const scrollOffset = ((this.currentSongTime / this.noteApproachTime) * numRows) % 1;

    for (let r = 0; r < numRows; r++) {
      const z1 = (r + scrollOffset) / numRows;
      const z2 = Math.min(1, (r + 1 + scrollOffset) / numRows);

      for (let c = 0; c < this.laneCount; c++) {
        const isAltTile = (Math.floor(r + this.currentSongTime * (numRows / this.noteApproachTime)) + c) % 2 === 0;
        const p1 = this.getTrackPoint(c, z1);
        const p2 = this.getTrackPoint(c + 1, z1);
        const p3 = this.getTrackPoint(c + 1, z2);
        const p4 = this.getTrackPoint(c, z2);

        ctx.fillStyle = this.isOverdrive
          ? (isAltTile ? '#fef08a' : '#fef9c3')
          : (isAltTile ? '#ffffff' : '#e2e8f0');

        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.lineTo(p3.x, p3.y);
        ctx.lineTo(p4.x, p4.y);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }

    for (let lane = 0; lane <= this.laneCount; lane++) {
      const pTop = this.getTrackPoint(lane, 0);
      const pBot = this.getTrackPoint(lane, 1);
      ctx.strokeStyle = lane === 0 || lane === this.laneCount ? '#334155' : '#64748b';
      ctx.lineWidth = lane === 0 || lane === this.laneCount ? 3 : 2;
      ctx.beginPath();
      ctx.moveTo(pTop.x, pTop.y);
      ctx.lineTo(pBot.x, pBot.y);
      ctx.stroke();
    }
  }

  drawStoveBurners(ctx) {
    for (let lane = 0; lane < this.laneCount; lane++) {
      const center = this.getTrackPoint(lane + 0.5, this.hitLineZ);
      const isPressed = this.keysHeld[lane];
      const rx = 24 * center.scale;
      const ry = 13 * center.scale;

      ctx.save();
      ctx.fillStyle = '#18181b';
      ctx.beginPath();
      ctx.ellipse(center.x, center.y, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = isPressed ? this.laneColors[lane] : '#52525b';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      const flameCount = 8;
      for (let i = 0; i < flameCount; i++) {
        const ang = (i / flameCount) * Math.PI * 2 + performance.now() * 0.008;
        const fx = center.x + Math.cos(ang) * (rx * 0.72);
        const fy = center.y + Math.sin(ang) * (ry * 0.72);

        if (isPressed) {
          ctx.fillStyle = this.isOverdrive ? '#fde047' : '#38bdf8';
          ctx.beginPath();
          ctx.arc(fx, fy - 3, 4.5, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = this.laneColors[lane];
          ctx.beginPath();
          ctx.arc(fx, fy - 6, 2.8, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = '#0284c7';
          ctx.fillRect(fx - 1, fy - 1, 2, 2);
        }
      }

      ctx.strokeStyle = isPressed ? '#e4e4e7' : '#3f3f46';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(center.x - rx * 0.85, center.y);
      ctx.lineTo(center.x + rx * 0.85, center.y);
      ctx.moveTo(center.x, center.y - ry * 0.85);
      ctx.lineTo(center.x, center.y + ry * 0.85);
      ctx.stroke();

      ctx.fillStyle = isPressed ? this.laneColors[lane] : '#27272a';
      ctx.beginPath();
      ctx.ellipse(center.x, center.y, rx * 0.38, ry * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = isPressed ? '#000000' : '#ffffff';
      ctx.font = 'bold 15px VT323, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(this.laneLabels[lane], center.x, center.y + 5);
      ctx.textAlign = 'left';
      ctx.restore();
    }
  }

  drawPotatoNotes(ctx) {
    for (const note of this.notes) {
      if (note.missed) continue;
      if (note.hit && (!note.duration || note.holdCompleted)) continue;

      const timeUntilHit = note.time - this.currentSongTime;
      const headZ = this.hitLineZ * (1 - timeUntilHit / this.noteApproachTime);

      const endTime = note.time + (note.duration || 0);
      const tailTimeUntilHit = endTime - this.currentSongTime;
      const tailZ = this.hitLineZ * (1 - tailTimeUntilHit / this.noteApproachTime);

      if (headZ < 0 && tailZ < 0) continue;
      if (tailZ > 1.15) continue;

      if (note.duration > 0.12) {
        const clampedHeadZ = note.holding ? this.hitLineZ : Math.min(1.05, Math.max(0, headZ));
        const clampedTailZ = Math.min(1.05, Math.max(0, tailZ));

        if (clampedHeadZ > clampedTailZ) {
          const pHead = this.getTrackPoint(note.lane + 0.5, clampedHeadZ);
          const pTail = this.getTrackPoint(note.lane + 0.5, clampedTailZ);
          const headW = 14 * pHead.scale;
          const tailW = 14 * pTail.scale;

          ctx.fillStyle = note.holding ? '#facc15' : '#d97706';
          ctx.beginPath();
          ctx.moveTo(pTail.x - tailW / 2, pTail.y);
          ctx.lineTo(pTail.x + tailW / 2, pTail.y);
          ctx.lineTo(pHead.x + headW / 2, pHead.y);
          ctx.lineTo(pHead.x - headW / 2, pHead.y);
          ctx.closePath();
          ctx.fill();

          ctx.strokeStyle = note.holding ? '#ffffff' : this.laneColors[note.lane];
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      }

      if (!note.hit || note.holding) {
        const drawZ = note.holding ? this.hitLineZ : headZ;
        if (drawZ >= 0 && drawZ <= 1.05) {
          const pos = this.getTrackPoint(note.lane + 0.5, drawZ);
          this.drawRawPotatoSprite(ctx, pos.x, pos.y, pos.scale, note.lane, note.seed, note.holding);
        }
      }
    }
  }

  drawRawPotatoSprite(ctx, x, y, scale, lane, seed, isCooking = false) {
    const rx = 20 * scale;
    const ry = 12 * scale;

    ctx.save();
    ctx.translate(x, y);

    ctx.fillStyle = this.laneColors[lane];
    ctx.beginPath();
    ctx.ellipse(0, 2 * scale, rx * 1.12, ry * 1.12, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = isCooking ? '#eab308' : '#b48343';
    ctx.beginPath();
    const vertices = 8;
    for (let i = 0; i < vertices; i++) {
      const ang = (i / vertices) * Math.PI * 2;
      const wobble = 0.88 + (((seed + i * 19) % 25) / 100);
      const vx = Math.cos(ang) * rx * wobble;
      const vy = Math.sin(ang) * ry * wobble;
      if (i === 0) ctx.moveTo(vx, vy);
      else ctx.lineTo(vx, vy);
    }
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#451a03';
    ctx.lineWidth = Math.max(1.5, 2 * scale);
    ctx.stroke();

    ctx.fillStyle = isCooking ? '#fef08a' : '#d6a364';
    ctx.beginPath();
    ctx.ellipse(-rx * 0.25, -ry * 0.25, rx * 0.4, ry * 0.28, -0.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  drawPeelingPotatoMeter(ctx) {
    const boxX = 528, boxY = 128, boxW = 98, boxH = 188;

    ctx.fillStyle = 'rgba(0, 0, 50, 0.86)';
    ctx.fillRect(boxX, boxY, boxW, boxH);
    ctx.strokeStyle = this.peelCharge >= 50 || this.isOverdrive ? '#fde047' : '#94a3b8';
    ctx.lineWidth = 2;
    ctx.strokeRect(boxX, boxY, boxW, boxH);

    ctx.fillStyle = '#fde047';
    ctx.font = '15px VT323, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('PELA-CARGA', boxX + boxW / 2, boxY + 16);

    const potX = boxX + boxW / 2;
    const potY = boxY + 95;
    const potRX = 30;
    const potRY = 52;
    const peelRatio = Math.max(0, Math.min(1, this.peelCharge / 100));

    const tracePotatoPath = () => {
      ctx.beginPath();
      const pts = [
        [0, -potRY],
        [potRX * 0.75, -potRY * 0.75],
        [potRX, -potRY * 0.15],
        [potRX * 0.9, potRY * 0.55],
        [potRX * 0.45, potRY * 0.95],
        [0, potRY],
        [-potRX * 0.55, potRY * 0.9],
        [-potRX * 0.95, potRY * 0.45],
        [-potRX, -potRY * 0.2],
        [-potRX * 0.7, -potRY * 0.8]
      ];
      pts.forEach(([px, py], idx) => {
        if (idx === 0) ctx.moveTo(potX + px, potY + py);
        else ctx.lineTo(potX + px, potY + py);
      });
      ctx.closePath();
    };

    ctx.save();
    tracePotatoPath();
    ctx.fillStyle = '#854d0e';
    ctx.fill();
    ctx.fillStyle = '#451a03';
    ctx.fillRect(potX - 12, potY - 25, 4, 3);
    ctx.fillRect(potX + 10, potY - 5, 4, 3);
    ctx.fillRect(potX - 8, potY + 18, 5, 3);
    ctx.fillRect(potX + 6, potY + 32, 4, 3);
    ctx.restore();

    if (peelRatio > 0) {
      ctx.save();
      tracePotatoPath();
      ctx.clip();

      const peelHeight = (potRY * 2) * peelRatio;
      ctx.fillStyle = this.isOverdrive ? '#ffffff' : '#fde047';
      ctx.fillRect(potX - potRX - 5, potY - potRY, (potRX + 5) * 2, peelHeight);

      ctx.fillStyle = '#fef9c3';
      ctx.fillRect(potX - 14, potY - potRY + 8, 7, Math.max(0, peelHeight - 14));

      if (peelRatio < 0.98) {
        const cutY = potY - potRY + peelHeight;
        ctx.fillStyle = '#a16207';
        ctx.fillRect(potX - potRX, cutY - 3, potRX * 2, 6);
      }
      ctx.restore();
    }

    ctx.save();
    tracePotatoPath();
    ctx.strokeStyle = this.isOverdrive ? '#facc15' : '#27272a';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.restore();

    for (const f of this.peelFlakes) {
      ctx.save();
      ctx.translate(f.x, f.y);
      ctx.rotate(f.rot);
      ctx.fillStyle = '#854d0e';
      ctx.fillRect(-6, -3, 12, 5);
      ctx.fillStyle = '#fde047';
      ctx.fillRect(-5, -1, 10, 2);
      ctx.restore();
    }

    ctx.fillStyle = this.isOverdrive ? '#4ade80' : (this.peelCharge >= 50 ? '#fde047' : '#cbd5e1');
    ctx.font = '14px VT323, monospace';
    if (this.isOverdrive) {
      ctx.fillText('¡SUPERCARGA!', boxX + boxW / 2, boxY + boxH - 20);
      ctx.fillText('ACTIVA (x2)', boxX + boxW / 2, boxY + boxH - 6);
    } else if (this.peelCharge >= 50) {
      ctx.fillText(`${Math.floor(this.peelCharge)}% PELADA`, boxX + boxW / 2, boxY + boxH - 20);
      ctx.fillText('[ESPACIO] USAR', boxX + boxW / 2, boxY + boxH - 6);
    } else {
      ctx.fillText(`${Math.floor(this.peelCharge)}% PELADA`, boxX + boxW / 2, boxY + boxH - 12);
    }
    ctx.textAlign = 'left';
  }

  drawRockMeterLeft(ctx) {
    const boxX = 14, boxY = 128, boxW = 92, boxH = 188;

    ctx.fillStyle = 'rgba(0, 0, 50, 0.86)';
    ctx.fillRect(boxX, boxY, boxW, boxH);
    ctx.strokeStyle = this.health < 25 ? '#ef4444' : '#94a3b8';
    ctx.lineWidth = 2;
    ctx.strokeRect(boxX, boxY, boxW, boxH);

    ctx.fillStyle = '#fbbf24';
    ctx.font = '15px VT323, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('COCCIÓN', boxX + boxW / 2, boxY + 16);

    const barX = boxX + 32, barY = boxY + 26, barW = 28, barH = 132;
    ctx.fillStyle = '#18181b';
    ctx.fillRect(barX, barY, barW, barH);

    const hpRatio = Math.max(0, Math.min(1, this.health / this.maxHealth));
    const fillH = barH * hpRatio;
    ctx.fillStyle = hpRatio > 0.6 ? '#22c55e' : (hpRatio > 0.3 ? '#eab308' : '#ef4444');
    ctx.fillRect(barX, barY + (barH - fillH), barW, fillH);

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(barX, barY, barW, barH);

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '14px VT323, monospace';
    ctx.fillText(`${Math.ceil(this.health)}%`, boxX + boxW / 2, boxY + boxH - 8);
    ctx.textAlign = 'left';
  }

  drawHUD(ctx) {
    ctx.fillStyle = 'rgba(0, 0, 60, 0.9)';
    ctx.fillRect(14, 10, 175, 54);
    ctx.strokeStyle = '#d4d4d8';
    ctx.lineWidth = 2;
    ctx.strokeRect(14, 10, 175, 54);

    ctx.fillStyle = '#fde047';
    ctx.font = '22px VT323, monospace';
    ctx.fillText(`PTS: ${this.score.toString().padStart(6, '0')}`, 24, 32);

    ctx.fillStyle = '#38bdf8';
    ctx.font = '18px VT323, monospace';
    ctx.fillText(`RACHA: ${this.combo} (MÁX: ${this.maxCombo})`, 24, 54);

    const stageLabels = {
      morning: '[C] COCINA: MAÑANA ☀',
      afternoon: '[C] COCINA: GOLDEN HOUR 🌇',
      night: '[C] COCINA: NOCHE 🌙'
    };
    ctx.fillStyle = 'rgba(0, 0, 60, 0.9)';
    ctx.fillRect(215, 8, 210, 26);
    ctx.strokeStyle = '#facc15';
    ctx.strokeRect(215, 8, 210, 26);
    ctx.fillStyle = '#fef08a';
    ctx.font = '15px VT323, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(stageLabels[this.currentStageTime], 320, 26);

    ctx.fillStyle = 'rgba(0, 0, 60, 0.9)';
    ctx.fillRect(455, 10, 171, 54);
    ctx.strokeStyle = this.isOverdrive ? '#fde047' : '#d4d4d8';
    ctx.strokeRect(455, 10, 171, 54);

    const mult = this.getTotalMultiplier();
    ctx.fillStyle = this.isOverdrive ? '#fde047' : '#4ade80';
    ctx.font = '30px VT323, monospace';
    ctx.fillText(`MULT: x${mult}`, 540, 44);
    ctx.textAlign = 'left';

    if (this.judgmentTimer > 0) {
      ctx.save();
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(0, 0, 0, 0.72)';
      ctx.fillRect(185, 42, 270, 44);
      ctx.strokeStyle = this.judgmentColor;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(185, 42, 270, 44);

      ctx.fillStyle = this.judgmentColor;
      ctx.font = '24px VT323, monospace';
      ctx.fillText(this.judgmentText, this.width / 2, 63);

      ctx.fillStyle = '#e2e8f0';
      ctx.font = '14px VT323, monospace';
      ctx.fillText(this.judgmentSubText, this.width / 2, 80);
      ctx.restore();
    }
  }

  drawStartOverlay(ctx) {
    ctx.fillStyle = 'rgba(0, 0, 20, 0.85)';
    ctx.fillRect(75, 90, 490, 185);
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 3;
    ctx.strokeRect(75, 90, 490, 185);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#fde047';
    ctx.font = '30px VT323, monospace';
    ctx.fillText(`🎸 ${this.songConfig.name} 🥔`, this.width / 2, 128);

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '18px VT323, monospace';
    ctx.fillText('Teclas [ A ] [ S ] [ D ] [ F ] [ G ] en los 5 quemadores', this.width / 2, 162);
    ctx.fillText('Pela la papa (50%+) y presiona [ ESPACIO ] para SUPERCARGA', this.width / 2, 186);
    ctx.fillText(`Notas de guitarra cargadas: ${this.notes.length} papas`, this.width / 2, 212);

    ctx.fillStyle = '#4ade80';
    ctx.font = '24px VT323, monospace';
    ctx.fillText(
      this.isLoadingChart ? 'CARGANDO CHART Y MULTIPISTA...' : '▶ PRESIONA ESPACIO O CLIC PARA EMPEZAR ◀',
      this.width / 2,
      252
    );
    ctx.textAlign = 'left';
  }

  drawGameOverOverlay(ctx) {
    ctx.fillStyle = 'rgba(20, 0, 0, 0.88)';
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#ef4444';
    ctx.font = '44px VT323, monospace';
    ctx.fillText('¡SE QUEMARON LAS PAPAS!', this.width / 2, 150);

    ctx.fillStyle = '#fde047';
    ctx.font = '22px VT323, monospace';
    ctx.fillText(`Puntaje: ${this.score} | Racha Máxima: ${this.maxCombo}`, this.width / 2, 190);

    ctx.fillStyle = '#ffffff';
    ctx.font = '24px VT323, monospace';
    ctx.fillText('Presiona [ R ] o [ ESPACIO ] para reintentar', this.width / 2, 232);
    ctx.textAlign = 'left';
  }

  destroy() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
    }
    this.stopAllAudioTracks();
    if (this.audioTracks) {
      for (const t of this.audioTracks) {
        t.src = '';
      }
    }
    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      this.audioCtx.close().catch(() => {});
    }

    if (this.wasBgmPlaying && this.mainBgm) {
      if (typeof this.mainBgm.play === 'function') {
        this.mainBgm.play();
      } else if (this.mainBgm.audio) {
        this.mainBgm.audio.play().catch(() => {});
      }
    }

    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    this.canvas.removeEventListener('mousedown', this.onCanvasClick);

    if (this.touchOverlay) {
      this.touchOverlay.remove();
    }
  }
}

// Exportamos también con el alias RhythmGame para que funcione directo con tu main.js
export { RhythmPotatoGame as RhythmGame };