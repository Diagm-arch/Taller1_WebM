// js/minigames/tbop/tbop.js

export class TbopAudio {
  constructor(mainBgm = null) {
    this.mainBgm = mainBgm;
    this.wasMainBgmPlaying = false;
    this.maxVolume = 0.35;

    this.bgMusic = new Audio('./assets/audio/tbop/musica_tbop.mp3');
    this.bgMusic.loop = true;
    this.bgMusic.volume = 0;

    this.enabled = true;
    this.ctx = null;
    this.synthTimer = null;
    this.synthStep = 0;
    this.usingSynth = false;
  }

  initSynthCtx() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) this.ctx = new AC();
    }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }

  start() {
    if (this.mainBgm && this.mainBgm.isPlaying) {
      this.wasMainBgmPlaying = true;
      this.mainBgm.togglePlay();
      const btnBgmToggle = document.getElementById('btn-bgm-toggle');
      if (btnBgmToggle) {
        btnBgmToggle.textContent = '[ ▶ BGM: PAUSADO POR JUEGO ]';
      }
    }

    this.bgMusic.currentTime = 0;
    this.bgMusic.play().then(() => {
      this.usingSynth = false;
      this.fadeVolume(this.bgMusic, 0, this.maxVolume, 1200);
    }).catch(() => {
      this.startSynth();
    });
  }

  startSynth() {
    this.initSynthCtx();
    if (this.synthTimer) clearInterval(this.synthTimer);
    this.usingSynth = true;
    const notes = [220, 0, 261.63, 293.66, 329.63, 0, 293.66, 261.63, 246.94, 0, 196.00, 246.94, 220, 0, 164.81, 196.00];
    this.synthTimer = setInterval(() => {
      if (!this.enabled || !isGameRunning || !this.ctx) return;
      if (this.ctx.state === 'suspended') this.ctx.resume();
      const f = notes[this.synthStep % notes.length];
      this.synthStep++;
      if (f > 0) {
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f, now);
        gain.gain.setValueAtTime(0.04, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.19);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.2);
      }
    }, 210);
  }

  stopAndRestore() {
    this.fadeVolume(this.bgMusic, this.bgMusic.volume, 0, 800, () => {
      this.bgMusic.pause();
      this.bgMusic.currentTime = 0;
    });

    if (this.synthTimer) {
      clearInterval(this.synthTimer);
      this.synthTimer = null;
    }

    if (this.mainBgm && this.wasMainBgmPlaying && !this.mainBgm.isPlaying) {
      this.mainBgm.togglePlay();
      this.wasMainBgmPlaying = false;
    }
  }

  toggleMute() {
    this.enabled = !this.enabled;
    this.bgMusic.muted = !this.enabled;
    return this.enabled;
  }

  fadeVolume(audioEl, startVol, endVol, duration, onComplete) {
    const steps = 20;
    const stepTime = duration / steps;
    const volStep = (endVol - startVol) / steps;
    let currentStep = 0;

    const interval = setInterval(() => {
      currentStep++;
      const newVol = startVol + volStep * currentStep;
      audioEl.volume = Math.max(0, Math.min(1, newVol));

      if (currentStep >= steps) {
        clearInterval(interval);
        audioEl.volume = Math.max(0, Math.min(1, endVol));
        if (onComplete) onComplete();
      }
    }, stepTime);
  }

  play(type) {
    if (!this.enabled) return;
    try {
      this.initSynthCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.ctx.destination);

      if (type === 'pop') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(420, now);
        osc.frequency.exponentialRampToValueAtTime(140, now + 0.07);
        gain.gain.setValueAtTime(0.09, now);
        osc.start(now);
        osc.stop(now + 0.07);
      } else if (type === 'splat') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.exponentialRampToValueAtTime(55, now + 0.09);
        gain.gain.setValueAtTime(0.14, now);
        osc.start(now);
        osc.stop(now + 0.09);
      } else if (type === 'hurt') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.linearRampToValueAtTime(65, now + 0.22);
        gain.gain.setValueAtTime(0.2, now);
        osc.start(now);
        osc.stop(now + 0.22);
      } else if (type === 'door') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.setValueAtTime(450, now + 0.08);
        gain.gain.setValueAtTime(0.15, now);
        osc.start(now);
        osc.stop(now + 0.2);
      } else if (type === 'powerup') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.setValueAtTime(587, now + 0.08);
        osc.frequency.setValueAtTime(880, now + 0.16);
        gain.gain.setValueAtTime(0.18, now);
        osc.start(now);
        osc.stop(now + 0.35);
      } else if (type === 'slap') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(95, now);
        osc.frequency.exponentialRampToValueAtTime(28, now + 0.28);
        gain.gain.setValueAtTime(0.28, now);
        osc.start(now);
        osc.stop(now + 0.28);
      } else if (type === 'dash') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(600, now + 0.12);
        gain.gain.setValueAtTime(0.12, now);
        osc.start(now);
        osc.stop(now + 0.12);
      }
    } catch (e) {}
  }
}

let tbopAudio = null;

// CONSTANTES Y ESTADO
const ROOM_W = 800;
const ROOM_H = 500;
const WALL_THICKNESS = 56;

let isGameRunning = false;
let animId = null;
let canvas, ctx;
let onWinCallback = null;

let game = {
  floor: 1,
  currentRoomIdx: 0,
  rooms: [],
  potato: null,
  tears: [],
  particles: [],
  shakeTimer: 0,
  shakeIntensity: 0,
  gameOver: false,
  victory: false,
  totalRoomsCleared: 0
};

const input = { keys: {}, joyX: 0, joyY: 0 };

const ROOM_TEMPLATES = [
  { rocks: [{ x: 240, y: 170 }, { x: 560, y: 170 }, { x: 240, y: 330 }, { x: 560, y: 330 }], enemies: ['worm', 'worm', 'fly'] },
  { rocks: [{ x: 400, y: 150 }, { x: 400, y: 350 }], enemies: ['fork', 'fly', 'fly'] },
  { rocks: [{ x: 280, y: 250 }, { x: 520, y: 250 }], enemies: ['tomato', 'worm', 'fork'] },
  { rocks: [{ x: 200, y: 140 }, { x: 600, y: 140 }, { x: 200, y: 360 }, { x: 600, y: 360 }], enemies: ['fly', 'fly', 'fly', 'tomato'] },
  { rocks: [{ x: 310, y: 180 }, { x: 490, y: 320 }], enemies: ['fork', 'fork', 'tomato'] }
];

const POWERUPS = [
  { id: 'butter', name: 'Mantequilla', icon: '🧈', desc: '+Velocidad', apply: (p) => { p.speed += 0.7; } },
  { id: 'salt', name: 'Sal de Mar', icon: '🧂', desc: '+4 Daño', apply: (p) => { p.damage += 4; } },
  { id: 'ketchup', name: 'Ketchup', icon: '🍅', desc: '+1 Corazón', apply: (p) => { p.maxHp = Math.min(10, p.maxHp + 2); p.hp = Math.min(p.maxHp, p.hp + 2); } },
  { id: 'oil', name: 'Aceite', icon: '🫗', desc: '+Cadencia', apply: (p) => { p.fireDelay = Math.max(10, p.fireDelay - 5); } }
];

function initGame() {
  game.floor = 1;
  game.currentRoomIdx = 0;
  game.gameOver = false;
  game.victory = false;
  game.totalRoomsCleared = 0;
  game.tears = [];
  game.particles = [];

  game.potato = {
    x: ROOM_W / 2,
    y: ROOM_H / 2,
    vx: 0,
    vy: 0,
    radius: 22,
    hp: 6,
    maxHp: 6,
    speed: 4.2,
    damage: 10,
    fireDelay: 22,
    fireCooldown: 0,
    invulnTimer: 0,
    dashTimer: 0,
    dashCooldown: 0,
    walkCycle: 0,
    faceDirX: 1,
    faceDirY: 0,
    spots: [{ x: -8, y: -6, r: 2.5 }, { x: 10, y: 5, r: 2 }, { x: -5, y: 9, r: 1.8 }]
  };

  const endModal = document.getElementById('papa-end-modal');
  if (endModal) endModal.classList.add('hidden');
  const bossHud = document.getElementById('papa-boss-hud');
  if (bossHud) bossHud.classList.add('hidden');

  buildFloor(1);
  updateHUD();
}

function buildFloor(floorNum) {
  game.floor = floorNum;
  game.currentRoomIdx = 0;
  game.rooms = [];
  game.tears = [];

  const shuffled = [...ROOM_TEMPLATES].sort(() => Math.random() - 0.5);

  for (let i = 0; i < 5; i++) {
    const isFirst = (i === 0);
    const isLast = (i === 4);
    const tpl = shuffled[i % shuffled.length];

    const room = {
      index: i,
      visited: isFirst,
      cleared: false,
      rocks: [],
      enemies: [],
      items: [],
      trapdoor: false,
      isBossRoom: (floorNum === 2 && isLast),
      boss: null
    };

    if (isFirst) {
      room.rocks = [{ x: 230, y: 170, radius: 24 }, { x: 570, y: 330, radius: 24 }];
      spawnEnemies(room, floorNum === 1 ? ['worm', 'fly'] : ['fork', 'tomato'], floorNum);
    } else if (isLast && floorNum === 1) {
      room.rocks = tpl.rocks.map(r => ({ ...r, radius: 24 }));
      spawnEnemies(room, ['worm', 'fly'], 1);
      room.trapdoor = true;
    } else if (isLast && floorNum === 2) {
      room.rocks = [];
      room.boss = createBoss();
    } else {
      room.rocks = tpl.rocks.map(r => ({ ...r, radius: 24 }));
      spawnEnemies(room, tpl.enemies, floorNum);
    }
    game.rooms.push(room);
  }

  game.potato.x = 160;
  game.potato.y = ROOM_H / 2;

  const titleEl = document.getElementById('papa-floor-title');
  if (titleEl) titleEl.textContent = floorNum === 1 ? 'PISO 1: LA DESPENSA' : 'PISO 2: LA COCINA MORTAL';
  showToast(floorNum === 1 ? '🥔 PISO 1: LA DESPENSA' : '😱 PISO 2: LA COCINA', '5 salas para sobrevivir');
  updateHUD();
}

function spawnEnemies(room, types, floorMult) {
  types.forEach((type, idx) => {
    const ex = 340 + Math.random() * 340;
    const ey = 110 + Math.random() * 280;
    if (type === 'worm') {
      room.enemies.push({ type: 'worm', name: 'Gusano', x: ex, y: ey, radius: 17, hp: 20 * floorMult, maxHp: 20 * floorMult, speed: 1.5 + floorMult * 0.2, color: '#a3e635', phase: Math.random() * 6 });
    } else if (type === 'fly') {
      room.enemies.push({ type: 'fly', name: 'Mosca', x: ex, y: ey, radius: 14, hp: 15 * floorMult, maxHp: 15 * floorMult, speed: 2.3 + floorMult * 0.25, color: '#94a3b8', ignoresRocks: true, phase: Math.random() * 6 });
    } else if (type === 'fork') {
      room.enemies.push({ type: 'fork', name: 'Tenedor', x: ex, y: ey, radius: 18, hp: 30 * floorMult, maxHp: 30 * floorMult, speed: 2.0 + floorMult * 0.3, color: '#cbd5e1', chargeTimer: 60 + idx * 30, phase: 0 });
    } else if (type === 'tomato') {
      room.enemies.push({ type: 'tomato', name: 'Tomate', x: ex, y: ey, radius: 20, hp: 26 * floorMult, maxHp: 26 * floorMult, speed: 1.2, color: '#ef4444', shootCooldown: 75 + idx * 20, phase: Math.random() * 6 });
    }
  });
}

function createBoss() {
  return {
    name: 'EL PROFESOR RABÍ',
    x: ROOM_W / 2,
    y: 115,
    hp: 420,
    maxHp: 420,
    state: 'stalking',
    stateTimer: 80,
    leftHand: { x: ROOM_W / 2 - 140, y: 140, radius: 42, activeSlap: false },
    rightHand: { x: ROOM_W / 2 + 140, y: 140, radius: 44, activeSlap: false },
    activeHand: 'right',
    shadowX: ROOM_W / 2,
    shadowY: ROOM_H / 2,
    shoutText: '¡VEN AQUÍ, PAPA!'
  };
}

function updateBoss(boss) {
  const p = game.potato;
  boss.stateTimer--;
  boss.x += (Math.max(200, Math.min(ROOM_W - 200, p.x)) - boss.x) * 0.04;

  if (boss.state === 'stalking') {
    boss.leftHand.x += ((boss.x - 130) - boss.leftHand.x) * 0.1;
    boss.leftHand.y += (150 + Math.sin(performance.now() * 0.006) * 15 - boss.leftHand.y) * 0.1;
    boss.rightHand.x += ((boss.x + 130) - boss.rightHand.x) * 0.1;
    boss.rightHand.y += (150 + Math.cos(performance.now() * 0.006) * 15 - boss.rightHand.y) * 0.1;

    if (boss.stateTimer <= 0) {
      if (Math.random() < 0.7) {
        boss.state = 'aiming_hand';
        boss.stateTimer = 42;
        boss.activeHand = Math.random() < 0.5 ? 'right' : 'left';
        boss.shadowX = p.x;
        boss.shadowY = p.y;
        boss.shoutText = '¡TOMA MANOTAZO!';
      } else {
        boss.state = 'throwing_chancla';
        boss.stateTimer = 45;
        boss.shoutText = '¡CHANCLAZO!';
      }
    }
  } else if (boss.state === 'aiming_hand') {
    boss.shadowX += (p.x - boss.shadowX) * 0.11;
    boss.shadowY += (p.y - boss.shadowY) * 0.11;
    const hand = boss.activeHand === 'right' ? boss.rightHand : boss.leftHand;
    hand.x += (boss.shadowX - hand.x) * 0.18;
    hand.y += ((boss.shadowY - 110) - hand.y) * 0.18;

    if (boss.stateTimer <= 0) {
      boss.state = 'slapping';
      boss.stateTimer = 18;
      hand.x = boss.shadowX;
      hand.y = boss.shadowY;
      hand.activeSlap = true;

      if (tbopAudio) tbopAudio.play('slap');
      triggerShake(12, 16);
      spawnParticles(hand.x, hand.y, '#fcd34d', 18);

      if (Math.hypot(p.x - hand.x, p.y - hand.y) < hand.radius + p.radius + 8) {
        damagePotato(2, '¡MANOTAZO HUMANO!');
      }

      for (let a = 0; a < Math.PI * 2; a += Math.PI / 3) {
        game.tears.push({
          x: hand.x, y: hand.y,
          vx: Math.cos(a) * 4.5, vy: Math.sin(a) * 4.5,
          radius: 8, fromPlayer: false, color: '#fb7185', life: 75
        });
      }
    }
  } else if (boss.state === 'slapping') {
    if (boss.stateTimer <= 0) {
      boss.leftHand.activeSlap = false;
      boss.rightHand.activeSlap = false;
      boss.state = 'recovering';
      boss.stateTimer = 45;
    }
  } else if (boss.state === 'recovering') {
    if (boss.stateTimer <= 0) {
      boss.state = 'stalking';
      boss.stateTimer = 45;
    }
  } else if (boss.state === 'throwing_chancla') {
    if (boss.stateTimer === 20) {
      if (tbopAudio) tbopAudio.play('slap');
      const angle = Math.atan2(p.y - boss.y, p.x - boss.x);
      for (let spread = -0.25; spread <= 0.25; spread += 0.25) {
        game.tears.push({
          x: boss.x, y: boss.y + 40,
          vx: Math.cos(angle + spread) * 6.2, vy: Math.sin(angle + spread) * 6.2,
          radius: 13, fromPlayer: false, isSlipper: true, color: '#ec4899', life: 110
        });
      }
    }
    if (boss.stateTimer <= 0) {
      boss.state = 'stalking';
      boss.stateTimer = 50;
    }
  }

  const hpBar = document.getElementById('papa-boss-hp-bar');
  if (hpBar) hpBar.style.width = `${Math.max(0, (boss.hp / boss.maxHp) * 100)}%`;
}

function updateGame() {
  if (!isGameRunning || game.gameOver || game.victory) return;

  const p = game.potato;
  const room = game.rooms[game.currentRoomIdx];
  if (!room) return;

  let mx = input.joyX;
  let my = input.joyY;
  if (input.keys['arrowup'] || input.keys['w']) my -= 1;
  if (input.keys['arrowdown'] || input.keys['s']) my += 1;
  if (input.keys['arrowleft'] || input.keys['a']) mx -= 1;
  if (input.keys['arrowright'] || input.keys['d']) mx += 1;

  const mag = Math.hypot(mx, my);
  if (mag > 1) { mx /= mag; my /= mag; }

  if (mag > 0.1) {
    p.faceDirX = mx;
    p.faceDirY = my;
    p.walkCycle += 0.25;
  }

  if (p.dashCooldown > 0) p.dashCooldown--;
  if (p.dashTimer > 0) p.dashTimer--;
  if (p.invulnTimer > 0) p.invulnTimer--;

  const spd = p.dashTimer > 0 ? p.speed * 2.3 : p.speed;
  p.vx = mx * spd;
  p.vy = my * spd;
  p.x += p.vx;
  p.y += p.vy;

  for (const rock of room.rocks) {
    resolveCircleCollision(p, rock.x, rock.y, rock.radius);
  }

  const hasEnemies = room.enemies.length > 0 || (room.boss && room.boss.hp > 0);
  if (!hasEnemies && !room.cleared) {
    room.cleared = true;
    game.totalRoomsCleared++;
    if (tbopAudio) tbopAudio.play('door');
    if (!room.isBossRoom && Math.random() < 0.8) {
      const pwr = POWERUPS[Math.floor(Math.random() * POWERUPS.length)];
      room.items.push({ ...pwr, x: ROOM_W / 2, y: ROOM_H / 2, bob: 0 });
    }
    updateHUD();
  }

  const dY1 = ROOM_H / 2 - 42;
  const dY2 = ROOM_H / 2 + 42;

  if (room.cleared && game.currentRoomIdx > 0 && p.y > dY1 && p.y < dY2 && p.x < WALL_THICKNESS + p.radius) {
    if (p.x < WALL_THICKNESS - 6) { changeRoom(game.currentRoomIdx - 1, 'fromRight'); return; }
  } else {
    p.x = Math.max(WALL_THICKNESS + p.radius, p.x);
  }

  if (room.cleared && game.currentRoomIdx < 4 && p.y > dY1 && p.y < dY2 && p.x > ROOM_W - WALL_THICKNESS - p.radius) {
    if (p.x > ROOM_W - WALL_THICKNESS + 6) { changeRoom(game.currentRoomIdx + 1, 'fromLeft'); return; }
  } else {
    p.x = Math.min(ROOM_W - WALL_THICKNESS - p.radius, p.x);
  }

  p.y = Math.max(WALL_THICKNESS + p.radius, Math.min(ROOM_H - WALL_THICKNESS - p.radius, p.y));

  if (room.cleared && room.trapdoor) {
    if (Math.hypot(p.x - (ROOM_W - 140), p.y - ROOM_H / 2) < 34) {
      if (tbopAudio) tbopAudio.play('powerup');
      buildFloor(2);
      return;
    }
  }

  for (let i = room.items.length - 1; i >= 0; i--) {
    const it = room.items[i];
    it.bob += 0.08;
    const dist = Math.hypot(p.x - it.x, p.y - it.y);
    const stuckInRock = room.rocks.some(r => Math.hypot(it.x - r.x, it.y - r.y) < r.radius + 18);

    if ((dist < 260 || stuckInRock) && dist > 1) {
      const pull = stuckInRock ? 4.5 : 3.5;
      it.x += ((p.x - it.x) / dist) * pull;
      it.y += ((p.y - it.y) / dist) * pull;
    }

    if (dist < p.radius + 20) {
      it.apply(p);
      if (tbopAudio) tbopAudio.play('powerup');
      spawnParticles(it.x, it.y, '#fde047', 16);
      showToast(`${it.icon} ¡${it.name}!`, it.desc);
      room.items.splice(i, 1);
      updateHUD();
    }
  }

  if (p.fireCooldown > 0) p.fireCooldown--;
  const target = findNearestTarget(room);
  if (target && p.fireCooldown <= 0) {
    p.fireCooldown = p.fireDelay;
    const ang = Math.atan2(target.y - p.y, target.x - p.x);
    p.faceDirX = Math.cos(ang);
    p.faceDirY = Math.sin(ang);
    if (tbopAudio) tbopAudio.play('pop');
    game.tears.push({
      x: p.x + p.faceDirX * 18, y: p.y + p.faceDirY * 18,
      vx: p.faceDirX * 7.8 + p.vx * 0.25, vy: p.faceDirY * 7.8 + p.vy * 0.25,
      radius: Math.min(13, 6 + Math.floor(p.damage / 5)),
      damage: p.damage, fromPlayer: true, color: '#fef08a', life: 65
    });
  }

  for (let i = room.enemies.length - 1; i >= 0; i--) {
    const en = room.enemies[i];
    en.phase += 0.1;
    const ang = Math.atan2(p.y - en.y, p.x - en.x);

    if (en.type === 'fork') {
      en.chargeTimer--;
      const s = en.chargeTimer < 20 ? en.speed * 2.1 : en.speed * 0.7;
      if (en.chargeTimer <= 0) en.chargeTimer = 95;
      en.x += Math.cos(ang) * s; en.y += Math.sin(ang) * s;
    } else if (en.type === 'tomato') {
      en.x += Math.cos(ang) * en.speed; en.y += Math.sin(ang) * en.speed;
      en.shootCooldown--;
      if (en.shootCooldown <= 0) {
        en.shootCooldown = 85;
        game.tears.push({ x: en.x, y: en.y, vx: Math.cos(ang) * 4.6, vy: Math.sin(ang) * 4.6, radius: 8, fromPlayer: false, color: '#ef4444', life: 90 });
      }
    } else {
      en.x += Math.cos(ang) * en.speed; en.y += Math.sin(ang) * en.speed;
    }

    if (!en.ignoresRocks) {
      for (const rock of room.rocks) resolveCircleCollision(en, rock.x, rock.y, rock.radius);
    }
    en.x = Math.max(WALL_THICKNESS + en.radius, Math.min(ROOM_W - WALL_THICKNESS - en.radius, en.x));
    en.y = Math.max(WALL_THICKNESS + en.radius, Math.min(ROOM_H - WALL_THICKNESS - en.radius, en.y));

    if (Math.hypot(p.x - en.x, p.y - en.y) < p.radius + en.radius) {
      damagePotato(1, en.name);
    }
  }

  if (room.boss && room.boss.hp > 0) updateBoss(room.boss);

  for (let i = game.tears.length - 1; i >= 0; i--) {
    const t = game.tears[i];
    t.x += t.vx; t.y += t.vy; t.life--;

    if (t.life <= 0 || t.x < WALL_THICKNESS || t.x > ROOM_W - WALL_THICKNESS || t.y < WALL_THICKNESS || t.y > ROOM_H - WALL_THICKNESS) {
      spawnParticles(t.x, t.y, t.color, 4);
      game.tears.splice(i, 1);
      continue;
    }

    let hitRock = room.rocks.some(r => Math.hypot(t.x - r.x, t.y - r.y) < t.radius + r.radius);
    if (hitRock) {
      spawnParticles(t.x, t.y, t.color, 5);
      game.tears.splice(i, 1);
      continue;
    }

    if (t.fromPlayer) {
      let hit = false;
      for (let j = room.enemies.length - 1; j >= 0; j--) {
        const en = room.enemies[j];
        if (Math.hypot(t.x - en.x, t.y - en.y) < t.radius + en.radius) {
          en.hp -= t.damage;
          en.x += t.vx * 0.6; en.y += t.vy * 0.6;
          if (tbopAudio) tbopAudio.play('splat');
          spawnParticles(t.x, t.y, '#fef08a', 7);
          if (en.hp <= 0) {
            spawnParticles(en.x, en.y, en.color, 16);
            room.enemies.splice(j, 1);
          }
          hit = true;
          break;
        }
      }
      if (!hit && room.boss && room.boss.hp > 0) {
        const b = room.boss;
        const hHead = Math.hypot(t.x - b.x, t.y - b.y) < t.radius + 65;
        const hL = Math.hypot(t.x - b.leftHand.x, t.y - b.leftHand.y) < t.radius + b.leftHand.radius;
        const hR = Math.hypot(t.x - b.rightHand.x, t.y - b.rightHand.y) < t.radius + b.rightHand.radius;
        if (hHead || hL || hR) {
          b.hp -= t.damage;
          if (tbopAudio) tbopAudio.play('splat');
          spawnParticles(t.x, t.y, '#fef08a', 8);
          hit = true;
          if (b.hp <= 0) triggerVictory();
        }
      }
      if (hit) game.tears.splice(i, 1);
    } else {
      if (Math.hypot(t.x - p.x, t.y - p.y) < t.radius + p.radius) {
        damagePotato(1, 'Proyectil');
        game.tears.splice(i, 1);
      }
    }
  }
}

function findNearestTarget(room) {
  const p = game.potato;
  let best = null, bDist = Infinity;
  for (const en of room.enemies) {
    const d = Math.hypot(en.x - p.x, en.y - p.y);
    if (d < bDist) { bDist = d; best = en; }
  }
  if (room.boss && room.boss.hp > 0) {
    const b = room.boss;
    const tgts = [{ x: b.x, y: b.y }, { x: b.leftHand.x, y: b.leftHand.y }, { x: b.rightHand.x, y: b.rightHand.y }];
    for (const tg of tgts) {
      const d = Math.hypot(tg.x - p.x, tg.y - p.y);
      if (d < bDist) { bDist = d; best = tg; }
    }
  }
  return best;
}

function changeRoom(newIdx, side) {
  game.currentRoomIdx = newIdx;
  game.tears = [];
  const room = game.rooms[newIdx];
  room.visited = true;

  if (side === 'fromLeft') {
    game.potato.x = WALL_THICKNESS + game.potato.radius + 18;
    game.potato.y = ROOM_H / 2;
  } else {
    game.potato.x = ROOM_W - WALL_THICKNESS - game.potato.radius - 18;
    game.potato.y = ROOM_H / 2;
  }

  const bossHud = document.getElementById('papa-boss-hud');
  if (bossHud) {
    if (room.isBossRoom && room.boss && room.boss.hp > 0) {
      bossHud.classList.remove('hidden');
      showToast('😱 ¡EL HUMANO REAL!', '¡Esquiva sus manotazos!');
    } else {
      bossHud.classList.add('hidden');
    }
  }
  updateHUD();
}

function damagePotato(amount, source) {
  const p = game.potato;
  if (p.invulnTimer > 0 || p.dashTimer > 0) return;
  p.hp = Math.max(0, p.hp - amount);
  p.invulnTimer = 55;
  if (tbopAudio) tbopAudio.play('hurt');
  triggerShake(9, 14);
  spawnParticles(p.x, p.y, '#d97706', 14);
  updateHUD();
  if (p.hp <= 0) triggerGameOver(source);
}

function triggerDash() {
  const p = game.potato;
  if (!p || game.gameOver || p.dashCooldown > 0) return;
  p.dashTimer = 14;
  p.dashCooldown = 38;
  if (tbopAudio) tbopAudio.play('dash');
  spawnParticles(p.x, p.y, '#fde68a', 10);
}

function triggerGameOver(killer) {
  game.gameOver = true;
  const m = document.getElementById('papa-end-modal');
  const icon = document.getElementById('papa-end-icon');
  const btnRetry = document.getElementById('papa-btn-retry');
  if (m) {
    if (icon) icon.textContent = '🥣';
    document.getElementById('papa-end-title').textContent = '¡TE HICIERON PURÉ!';
    document.getElementById('papa-end-desc').textContent = `Caíste ante: ${killer}`;
    if (btnRetry) btnRetry.classList.remove('hidden');
    m.classList.remove('hidden');
  }
}

function triggerVictory() {
  game.victory = true;
  if (tbopAudio) {
    tbopAudio.stopAndRestore();
    tbopAudio.play('powerup');
  }
  const m = document.getElementById('papa-end-modal');
  const icon = document.getElementById('papa-end-icon');
  const btnRetry = document.getElementById('papa-btn-retry');
  if (m) {
    if (icon) icon.textContent = '👑🥔';
    document.getElementById('papa-end-title').textContent = '¡PAPA SUPREMA VICTORIOSA!';
    document.getElementById('papa-end-desc').textContent = '¡Derrotaste al Humano Real y escapaste de ser puré!';
    if (btnRetry) btnRetry.classList.add('hidden');
    m.classList.remove('hidden');
  }
  if (typeof onWinCallback === 'function') {
    setTimeout(() => {
      if (game.victory && isGameRunning) onWinCallback();
    }, 2500);
  }
}

function drawGame() {
  if (!isGameRunning || !canvas) return;

  // Forzamos a que el canvas tome siempre el tamaño real de la ventana completa
  const targetW = canvas.clientWidth || window.innerWidth;
  const targetH = canvas.clientHeight || window.innerHeight;
  if (canvas.width !== targetW || canvas.height !== targetH) {
    canvas.width = targetW;
    canvas.height = targetH;
  }

  ctx.fillStyle = '#120d0a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const scale = Math.min(canvas.width / ROOM_W, canvas.height / ROOM_H);
  const ox = (canvas.width - ROOM_W * scale) / 2;
  const oy = (canvas.height - ROOM_H * scale) / 2;

  ctx.save();
  let sx = 0, sy = 0;
  if (game.shakeTimer > 0) {
    game.shakeTimer--;
    sx = (Math.random() - 0.5) * game.shakeIntensity;
    sy = (Math.random() - 0.5) * game.shakeIntensity;
  }
  ctx.translate(ox + sx, oy + sy);
  ctx.scale(scale, scale);

  const room = game.rooms[game.currentRoomIdx];
  if (!room) { ctx.restore(); return; }

  if (game.floor === 1) {
    ctx.fillStyle = '#3b281e';
    ctx.fillRect(0, 0, ROOM_W, ROOM_H);
    ctx.fillStyle = '#4e3629';
    ctx.fillRect(WALL_THICKNESS, WALL_THICKNESS, ROOM_W - WALL_THICKNESS * 2, ROOM_H - WALL_THICKNESS * 2);
  } else {
    ctx.fillStyle = '#334155';
    ctx.fillRect(0, 0, ROOM_W, ROOM_H);
    const tileS = 44;
    for (let y = WALL_THICKNESS; y < ROOM_H - WALL_THICKNESS; y += tileS) {
      for (let x = WALL_THICKNESS; x < ROOM_W - WALL_THICKNESS; x += tileS) {
        ctx.fillStyle = ((Math.floor(x / tileS) + Math.floor(y / tileS)) % 2 === 0) ? '#475569' : '#3e4c5e';
        ctx.fillRect(x, y, Math.min(tileS, ROOM_W - WALL_THICKNESS - x), Math.min(tileS, ROOM_H - WALL_THICKNESS - y));
      }
    }
  }

  ctx.strokeStyle = '#1f140e';
  ctx.lineWidth = 6;
  ctx.strokeRect(WALL_THICKNESS, WALL_THICKNESS, ROOM_W - WALL_THICKNESS * 2, ROOM_H - WALL_THICKNESS * 2);

  if (game.currentRoomIdx > 0) drawDoor(0, ROOM_H / 2, room.cleared, false);
  if (game.currentRoomIdx < 4) drawDoor(ROOM_W - WALL_THICKNESS, ROOM_H / 2, room.cleared, (game.floor === 2 && game.currentRoomIdx === 3));

  if (room.trapdoor) {
    const tx = ROOM_W - 140, ty = ROOM_H / 2;
    ctx.fillStyle = room.cleared ? '#090706' : '#291d16';
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 5;
    ctx.fillRect(tx - 32, ty - 32, 64, 64);
    ctx.strokeRect(tx - 32, ty - 32, 64, 64);
    if (room.cleared) {
      ctx.fillStyle = '#fde047';
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('BAJAR PISO 2', tx, ty - 42);
    }
  }

  for (const rock of room.rocks) {
    ctx.fillStyle = game.floor === 1 ? '#645348' : '#64748b';
    ctx.beginPath();
    ctx.arc(rock.x, rock.y, rock.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#27201c';
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  for (const it of room.items) {
    const by = it.y + Math.sin(it.bob) * 5;
    ctx.font = '30px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(it.icon, it.x, by);
  }

  for (const en of room.enemies) {
    const emojis = { worm: '🪱', fly: '🪰', fork: '🍴', tomato: '🍅' };
    ctx.font = `${en.radius * 1.75}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emojis[en.type] || '👾', en.x, en.y + Math.sin(en.phase) * 3);
  }

  if (room.boss && room.boss.hp > 0) drawBoss(room.boss);

  drawHero(game.potato);

  for (const t of game.tears) {
    if (t.isSlipper) {
      ctx.save();
      ctx.translate(t.x, t.y);
      ctx.rotate(performance.now() * 0.02);
      ctx.font = '24px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🩴', 0, 0);
      ctx.restore();
    } else {
      ctx.fillStyle = t.color;
      ctx.beginPath();
      ctx.arc(t.x, t.y, t.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  for (let i = game.particles.length - 1; i >= 0; i--) {
    const pt = game.particles[i];
    pt.x += pt.vx; pt.y += pt.vy; pt.life -= 0.05;
    if (pt.life <= 0) { game.particles.splice(i, 1); continue; }
    ctx.save();
    ctx.globalAlpha = pt.life;
    ctx.fillStyle = pt.color;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  ctx.restore();
}

function drawHero(p) {
  ctx.save();
  ctx.translate(p.x, p.y);
  if (p.invulnTimer > 0 && Math.floor(p.invulnTimer / 4) % 2 === 0) ctx.globalAlpha = 0.45;
  if (p.dashTimer > 0) ctx.rotate(performance.now() * 0.035);

  const grad = ctx.createRadialGradient(-6, -8, 4, 0, 0, p.radius + 4);
  grad.addColorStop(0, '#e6b87d');
  grad.addColorStop(0.7, '#b88346');
  grad.addColorStop(1, '#7c5327');
  ctx.fillStyle = grad;
  ctx.strokeStyle = '#4a2e12';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(0, 0, p.radius * 0.95, p.radius * 1.1, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  [-7, 7].forEach(ox => {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(ox + p.faceDirX * 1.5, -3 + p.faceDirY * 1.5, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#111827';
    ctx.beginPath();
    ctx.arc(ox + p.faceDirX * 3, -3 + p.faceDirY * 3, 2.5, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.restore();
}

function drawBoss(boss) {
  ctx.save();
  if (boss.state === 'aiming_hand') {
    ctx.fillStyle = 'rgba(225, 29, 72, 0.3)';
    ctx.beginPath();
    ctx.arc(boss.shadowX, boss.shadowY, 46, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.save();
  ctx.translate(boss.x, boss.y);

  // Avatar fijo del Profesor Rabí (sin cámara)
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(0, -4, 52, 60, 0, 0, Math.PI * 2);
  ctx.clip();

  ctx.fillStyle = '#fdba74';
  ctx.fillRect(-65, -70, 130, 140);
  ctx.fillStyle = '#271c19';
  ctx.beginPath();
  ctx.arc(0, -40, 50, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#000';
  ctx.fillRect(-20, -10, 8, 8);
  ctx.fillRect(12, -10, 8, 8);
  ctx.fillStyle = '#7f1d1d';
  ctx.fillRect(-15, 20, 30, 10);
  ctx.restore();

  ctx.strokeStyle = '#7c2d12';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(0, -4, 52, 60, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = '#fff';
  ctx.fillRect(60, -45, 140, 30);
  ctx.fillStyle = '#000';
  ctx.font = 'bold 11px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(boss.shoutText, 130, -26);
  ctx.restore();

  drawHand(boss.leftHand);
  drawHand(boss.rightHand);
  ctx.restore();
}

function drawHand(h) {
  ctx.save();
  ctx.translate(h.x, h.y);
  ctx.fillStyle = '#fdba74';
  ctx.strokeStyle = '#7c2d12';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, h.radius * 0.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawDoor(x, y, open, isBoss) {
  ctx.fillStyle = isBoss ? '#7f1d1d' : '#451a03';
  ctx.fillRect(x, y - 42, WALL_THICKNESS, 84);
  if (open) {
    ctx.fillStyle = '#000';
    ctx.fillRect(x + 6, y - 32, WALL_THICKNESS - 12, 64);
  }
}

function resolveCircleCollision(entity, cx, cy, cr) {
  const dx = entity.x - cx, dy = entity.y - cy;
  const dist = Math.hypot(dx, dy);
  const min = entity.radius + cr;
  if (dist < min && dist > 0.001) {
    const ov = min - dist;
    entity.x += (dx / dist) * ov;
    entity.y += (dy / dist) * ov;
  }
}

function spawnParticles(x, y, color, count = 8) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = 1 + Math.random() * 3.5;
    game.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, size: 3, color, life: 1.0 });
  }
}

function triggerShake(intensity, frames) {
  game.shakeIntensity = intensity;
  game.shakeTimer = frames;
}

function showToast(title, sub) {
  const b = document.getElementById('papa-toast');
  if (!b) return;
  document.getElementById('papa-toast-title').textContent = title;
  document.getElementById('papa-toast-sub').textContent = sub;
  b.classList.remove('opacity-0');
  setTimeout(() => b.classList.add('opacity-0'), 2200);
}

function updateHUD() {
  const p = game.potato;
  if (!p) return;

  const hBox = document.getElementById('papa-hearts');
  if (hBox) {
    let txt = '';
    for (let i = 0; i < Math.ceil(p.maxHp / 2); i++) {
      const rem = p.hp - i * 2;
      txt += rem >= 2 ? '❤️' : (rem === 1 ? '💔' : '🖤');
    }
    hBox.innerHTML = txt;
  }

  const dmgEl = document.getElementById('papa-stat-dmg');
  const spdEl = document.getElementById('papa-stat-spd');
  const rateEl = document.getElementById('papa-stat-rate');
  if (dmgEl) dmgEl.textContent = p.damage;
  if (spdEl) spdEl.textContent = p.speed.toFixed(1);
  if (rateEl) rateEl.textContent = p.fireDelay <= 14 ? 'Muy Alta' : (p.fireDelay <= 18 ? 'Alta' : 'Normal');

  const roomInd = document.getElementById('papa-room-indicator');
  if (roomInd) roomInd.textContent = `Sala ${game.currentRoomIdx + 1} / 5`;

  const mapEl = document.getElementById('papa-minimap-rooms');
  if (mapEl) {
    mapEl.innerHTML = '';
    for (let i = 0; i < 5; i++) {
      const r = game.rooms[i];
      const isCurrent = (i === game.currentRoomIdx);
      const cell = document.createElement('div');

      let bg = 'bg-stone-800 border-stone-600 text-stone-400';
      if (isCurrent) bg = 'bg-amber-500 border-yellow-200 text-black scale-110 shadow-md';
      else if (r && r.cleared) bg = 'bg-emerald-800/80 border-emerald-400 text-white';

      cell.className = `w-5 h-5 sm:w-6 sm:h-6 rounded border flex items-center justify-center text-[10px] font-bold transition-all ${bg}`;
      if (game.floor === 2 && i === 4) {
        cell.textContent = '🧑';
      } else if (game.floor === 1 && i === 4) {
        cell.textContent = '🪜';
      } else {
        cell.textContent = i + 1;
      }
      mapEl.appendChild(cell);
    }
  }
}

window.addEventListener('keydown', (e) => {
  if (!isGameRunning) return;
  const k = e.key.toLowerCase();
  input.keys[k] = true;
  if (k === ' ') { e.preventDefault(); triggerDash(); }
});
window.addEventListener('keyup', (e) => { input.keys[e.key.toLowerCase()] = false; });

function setupInputs(root) {
  const jZone = root.querySelector('#papa-joy-zone');
  const jKnob = root.querySelector('#papa-joy-knob');
  let tId = null;

  if (jZone && jKnob) {
    const move = (cx, cy) => {
      const r = jZone.getBoundingClientRect();
      const max = r.width * 0.38;
      let dx = cx - (r.left + r.width / 2);
      let dy = cy - (r.top + r.height / 2);
      const d = Math.hypot(dx, dy);
      if (d > max) { dx = (dx / d) * max; dy = (dy / d) * max; }
      jKnob.style.transform = `translate(${dx}px, ${dy}px)`;
      input.joyX = dx / max; input.joyY = dy / max;
    };
    const reset = () => {
      tId = null;
      jKnob.style.transform = 'translate(0px,0px)';
      input.joyX = 0; input.joyY = 0;
    };
    jZone.addEventListener('pointerdown', (e) => { e.preventDefault(); tId = e.pointerId; jZone.setPointerCapture(e.pointerId); move(e.clientX, e.clientY); });
    jZone.addEventListener('pointermove', (e) => { if (e.pointerId === tId) move(e.clientX, e.clientY); });
    jZone.addEventListener('pointerup', (e) => { if (e.pointerId === tId) reset(); });
    jZone.addEventListener('pointercancel', (e) => { if (e.pointerId === tId) reset(); });
  }

  const btnDash = root.querySelector('#papa-btn-dash');
  if (btnDash) btnDash.addEventListener('pointerdown', (e) => { e.preventDefault(); triggerDash(); });
}

function loop() {
  if (isGameRunning) {
    updateGame();
    drawGame();
  }
  animId = requestAnimationFrame(loop);
}

export function startPapaGame(container, onWin = null, mainBgm = null) {
  isGameRunning = true;
  onWinCallback = onWin;
  tbopAudio = new TbopAudio(mainBgm);

  container.innerHTML = `
    <style>
      #papa-root {
        position: fixed !important;
        inset: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        background-color: #120d0a !important;
        overflow: hidden !important;
        user-select: none !important;
        -webkit-user-select: none !important;
        touch-action: none !important;
        font-family: 'Inter', sans-serif !important;
        text-shadow: none !important;
        z-index: 10;
      }
      #papa-root * {
        text-shadow: none !important;
        box-sizing: border-box;
      }
      #papa-canvas {
        position: absolute !important;
        inset: 0 !important;
        width: 100% !important;
        height: 100% !important;
        display: block !important;
      }
      #papa-root .font-pixel {
        font-family: 'VT323', monospace !important;
        letter-spacing: 0.05em;
      }
      #papa-root .isaac-panel {
        background: rgba(20, 14, 10, 0.92) !important;
        border: 2px solid #5c4033 !important;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.75) !important;
        border-radius: 8px !important;
      }
      #papa-root .action-btn {
        background: radial-gradient(circle at 30% 30%, #f59e0b, #b45309) !important;
        border: 2px solid #fde68a !important;
        box-shadow: 0 4px 0 #78350f, 0 6px 12px rgba(0,0,0,0.6) !important;
        transition: transform 0.08s;
      }
      #papa-root .action-btn:active {
        transform: translateY(3px) scale(0.96);
        box-shadow: 0 1px 0 #78350f !important;
      }
      @keyframes boss-pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.05); }
      }
      #papa-root .boss-alert-box {
        animation: boss-pulse 0.8s infinite ease-in-out;
      }
    </style>

    <div id="papa-root">
      <!-- Canvas de juego a pantalla completa al fondo -->
      <canvas id="papa-canvas"></canvas>

      <!-- HUD Superior: el lado izquierdo baja un poco (mt-11) para no chocar con el botón [ ◄ HUB ] -->
      <div class="absolute top-2 left-3 right-3 z-20 flex justify-between items-start pointer-events-none gap-2">
        <div class="isaac-panel px-3 py-1.5 mt-11 pointer-events-auto flex flex-col gap-1">
          <span id="papa-floor-title" class="font-pixel text-yellow-400 text-xs sm:text-sm leading-none">PISO 1: LA DESPENSA</span>
          <div id="papa-hearts" class="text-sm sm:text-base leading-none">❤️❤️❤️</div>
          <div class="flex items-center gap-2 text-[10px] sm:text-[11px] font-bold text-amber-200/90">
            <span>💧 DAÑO: <b id="papa-stat-dmg" class="text-white">10</b></span>
            <span>⚡ VEL: <b id="papa-stat-spd" class="text-white">4.2</b></span>
            <span>🔥 CAD: <b id="papa-stat-rate" class="text-white">Normal</b></span>
          </div>
        </div>

        <!-- Minimapa y botones de sonido/reinicio arriba a la derecha -->
        <div class="flex flex-col items-end gap-1.5 pointer-events-auto">
          <div class="isaac-panel px-2.5 py-1.5 flex items-center gap-2">
            <div class="flex flex-col items-end mr-1">
              <span class="text-[9px] font-bold uppercase tracking-wider text-amber-300/80 leading-none">Mapa</span>
              <span id="papa-room-indicator" class="text-[11px] font-extrabold text-white leading-tight">Sala 1 / 5</span>
            </div>
            <div id="papa-minimap-rooms" class="flex items-center gap-1"></div>
          </div>

          <div class="flex gap-1.5">
            <button id="papa-btn-sound" class="isaac-panel px-2.5 py-1 text-xs text-amber-200 hover:bg-amber-950/60 font-bold active:scale-95 transition" title="Silenciar música y efectos">
              🔊
            </button>
            <button id="papa-btn-restart" class="isaac-panel px-2.5 py-1 text-xs text-rose-300 hover:bg-rose-950/60 font-bold active:scale-95 transition" title="Reiniciar partida">
              🔄
            </button>
          </div>
        </div>
      </div>

      <!-- Barra de vida del Jefe -->
      <div id="papa-boss-hud" class="hidden absolute top-16 left-1/2 -translate-x-1/2 z-20 w-4/5 max-w-xs pointer-events-none text-center">
        <div class="boss-alert-box font-pixel text-rose-300 text-xs bg-red-950/90 border border-red-500 rounded px-2 py-0.5 mb-1">
          ⚠️ ¡EL PROFESOR RABÍ INTENTA PEGARTE! ⚠️
        </div>
        <div class="w-full h-3 bg-black rounded-full border border-red-700 overflow-hidden">
          <div id="papa-boss-hp-bar" class="h-full bg-gradient-to-r from-red-600 to-amber-400" style="width: 100%;"></div>
        </div>
      </div>

      <!-- Notificaciones flotantes (Toasts) -->
      <div id="papa-toast" class="opacity-0 transition-opacity duration-300 pointer-events-none absolute top-1/3 left-1/2 -translate-x-1/2 z-20 bg-black/90 border border-amber-500 px-4 py-2 rounded text-center">
        <div id="papa-toast-title" class="font-pixel text-yellow-400 text-xs"></div>
        <div id="papa-toast-sub" class="text-white text-xs"></div>
      </div>

      <!-- Controles inferiores: Joystick, Guía y Botón RODAR -->
      <div class="absolute bottom-4 left-4 right-4 z-20 flex justify-between items-end pointer-events-none">
        <div id="papa-joy-zone" class="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-amber-950/40 border-2 border-amber-500/50 relative pointer-events-auto flex items-center justify-center">
          <div class="text-[9px] text-amber-200/40 font-bold uppercase tracking-widest pointer-events-none">MOVER</div>
          <div id="papa-joy-knob" class="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-gradient-to-b from-amber-400 to-amber-700 border border-yellow-200 absolute flex items-center justify-center text-lg">🥔</div>
        </div>

        <div class="hidden sm:flex flex-col items-center bg-black/75 px-3 py-1.5 rounded-lg border border-amber-900/60 text-[11px] text-amber-200/90 text-center">
          <span><b>Auto-Disparo Activo</b> (Apunta al enemigo más cercano)</span>
          <span>PC: <b>WASD / Flechas</b> mover • <b>Espacio</b> Rodar</span>
        </div>

        <button id="papa-btn-dash" class="action-btn w-20 h-20 rounded-full flex flex-col items-center justify-center pointer-events-auto cursor-pointer">
          <span class="text-xl leading-none">💨</span>
          <span class="font-pixel text-xs text-white leading-none mt-1">RODAR</span>
          <span class="text-[8px] text-amber-200">ESQUIVAR</span>
        </button>
      </div>

      <!-- Modal Victoria / Derrota -->
      <div id="papa-end-modal" class="hidden absolute inset-0 z-40 bg-black/85 flex items-center justify-center p-4">
        <div class="isaac-panel p-5 max-w-sm w-full text-center border-2 border-amber-500">
          <div id="papa-end-icon" class="text-5xl mb-2">🥣</div>
          <h2 id="papa-end-title" class="font-pixel text-yellow-400 text-lg mb-2"></h2>
          <p id="papa-end-desc" class="text-sm text-gray-200 mb-4"></p>
          <button id="papa-btn-retry" class="action-btn w-full py-2 rounded font-pixel text-xs text-white cursor-pointer">
            🥔 REINTENTAR
          </button>
        </div>
      </div>
    </div>
  `;

  const root = container.querySelector('#papa-root');
  canvas = root.querySelector('#papa-canvas');
  ctx = canvas.getContext('2d');

  root.querySelector('#papa-btn-retry').addEventListener('click', initGame);
  root.querySelector('#papa-btn-restart').addEventListener('click', initGame);
  root.querySelector('#papa-btn-sound').addEventListener('click', (e) => {
    const active = tbopAudio.toggleMute();
    e.currentTarget.textContent = active ? '🔊' : '🔇';
  });

  setupInputs(root);
  initGame();
  tbopAudio.start();

  if (!animId) animId = requestAnimationFrame(loop);
}

export function stopPapaGame() {
  isGameRunning = false;
  input.keys = {};
  input.joyX = 0;
  input.joyY = 0;

  if (tbopAudio) {
    tbopAudio.stopAndRestore();
  }

  if (animId) {
    cancelAnimationFrame(animId);
    animId = null;
  }
}