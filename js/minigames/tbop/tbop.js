// js/minigames/tbop/tbop.js

import { TbopAudio } from './tbop-audio.js';
import {
  ROOM_W,
  ROOM_H,
  WALL_THICKNESS,
  POWERUPS,
  createInitialPotato,
  createFloorRooms,
  updateBoss,
  findNearestTarget,
  resolveCircleCollision
} from './tbop-entities.js';
import {
  getTbopLayoutHTML,
  showToast,
  updateHUD,
  drawGame
} from './tbop-renderer.js';

export { TbopAudio };

let tbopAudio = null;
let isGameRunning = false;
let animId = null;
let canvas = null;
let ctx = null;
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

function initGame() {
  game.floor = 1;
  game.currentRoomIdx = 0;
  game.gameOver = false;
  game.victory = false;
  game.totalRoomsCleared = 0;
  game.tears = [];
  game.particles = [];
  game.potato = createInitialPotato();

  const endModal = document.getElementById('papa-end-modal');
  if (endModal) endModal.classList.add('hidden');
  const bossHud = document.getElementById('papa-boss-hud');
  if (bossHud) bossHud.classList.add('hidden');

  buildFloor(1);
  updateHUD(game);
}

function buildFloor(floorNum) {
  game.floor = floorNum;
  game.currentRoomIdx = 0;
  game.rooms = createFloorRooms(floorNum);
  game.tears = [];

  game.potato.x = 160;
  game.potato.y = ROOM_H / 2;

  const titleEl = document.getElementById('papa-floor-title');
  if (titleEl) titleEl.textContent = floorNum === 1 ? 'PISO 1: LA DESPENSA' : 'PISO 2: LA COCINA MORTAL';
  showToast(floorNum === 1 ? '🥔 PISO 1: LA DESPENSA' : '😱 PISO 2: LA COCINA', '5 salas para sobrevivir');
  updateHUD(game);
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
    updateHUD(game);
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
      updateHUD(game);
    }
  }

  if (p.fireCooldown > 0) p.fireCooldown--;
  const target = findNearestTarget(room, p);
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

  if (room.boss && room.boss.hp > 0) {
    updateBoss(
      room.boss,
      p,
      tbopAudio,
      triggerShake,
      spawnParticles,
      damagePotato,
      (tear) => game.tears.push(tear)
    );
  }

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
  updateHUD(game);
}

function damagePotato(amount, source) {
  const p = game.potato;
  if (p.invulnTimer > 0 || p.dashTimer > 0) return;
  p.hp = Math.max(0, p.hp - amount);
  p.invulnTimer = 55;
  if (tbopAudio) tbopAudio.play('hurt');
  triggerShake(9, 14);
  spawnParticles(p.x, p.y, '#d97706', 14);
  updateHUD(game);
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

window.addEventListener('keydown', (e) => {
  if (!isGameRunning) return;
  const k = e.key.toLowerCase();
  input.keys[k] = true;
  if (k === ' ') { e.preventDefault(); triggerDash(); }
});

window.addEventListener('keyup', (e) => {
  input.keys[e.key.toLowerCase()] = false;
});

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
    drawGame(ctx, canvas, game);
  }
  animId = requestAnimationFrame(loop);
}

export function startPapaGame(container, onWin = null, mainBgm = null) {
  isGameRunning = true;
  onWinCallback = onWin;
  tbopAudio = new TbopAudio(mainBgm);

  container.innerHTML = getTbopLayoutHTML();

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
  tbopAudio.start(() => isGameRunning);

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