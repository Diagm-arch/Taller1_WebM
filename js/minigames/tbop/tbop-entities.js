// js/minigames/tbop/tbop-entities.js

export const ROOM_W = 800;
export const ROOM_H = 500;
export const WALL_THICKNESS = 56;

export const ROOM_TEMPLATES = [
  { rocks: [{ x: 240, y: 170 }, { x: 560, y: 170 }, { x: 240, y: 330 }, { x: 560, y: 330 }], enemies: ['worm', 'worm', 'fly'] },
  { rocks: [{ x: 400, y: 150 }, { x: 400, y: 350 }], enemies: ['fork', 'fly', 'fly'] },
  { rocks: [{ x: 280, y: 250 }, { x: 520, y: 250 }], enemies: ['tomato', 'worm', 'fork'] },
  { rocks: [{ x: 200, y: 140 }, { x: 600, y: 140 }, { x: 200, y: 360 }, { x: 600, y: 360 }], enemies: ['fly', 'fly', 'fly', 'tomato'] },
  { rocks: [{ x: 310, y: 180 }, { x: 490, y: 320 }], enemies: ['fork', 'fork', 'tomato'] }
];

export const POWERUPS = [
  { id: 'butter', name: 'Mantequilla', icon: '🧈', desc: '+Velocidad', apply: (p) => { p.speed += 0.7; } },
  { id: 'salt', name: 'Sal de Mar', icon: '🧂', desc: '+4 Daño', apply: (p) => { p.damage += 4; } },
  { id: 'ketchup', name: 'Ketchup', icon: '🍅', desc: '+1 Corazón', apply: (p) => { p.maxHp = Math.min(10, p.maxHp + 2); p.hp = Math.min(p.maxHp, p.hp + 2); } },
  { id: 'oil', name: 'Aceite', icon: '🫗', desc: '+Cadencia', apply: (p) => { p.fireDelay = Math.max(10, p.fireDelay - 5); } }
];

export function createInitialPotato() {
  return {
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
}

export function spawnEnemies(room, types, floorMult) {
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

export function createFloorRooms(floorNum) {
  const rooms = [];
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
    rooms.push(room);
  }

  return rooms;
}

export function createBoss() {
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

export function updateBoss(boss, p, tbopAudio, triggerShakeFn, spawnParticlesFn, damagePotatoFn, addTearsFn) {
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
      triggerShakeFn(12, 16);
      spawnParticlesFn(hand.x, hand.y, '#fcd34d', 18);

      if (Math.hypot(p.x - hand.x, p.y - hand.y) < hand.radius + p.radius + 8) {
        damagePotatoFn(2, '¡MANOTAZO HUMANO!');
      }

      for (let a = 0; a < Math.PI * 2; a += Math.PI / 3) {
        addTearsFn({
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
        addTearsFn({
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

export function findNearestTarget(room, p) {
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

export function resolveCircleCollision(entity, cx, cy, cr) {
  const dx = entity.x - cx, dy = entity.y - cy;
  const dist = Math.hypot(dx, dy);
  const min = entity.radius + cr;
  if (dist < min && dist > 0.001) {
    const ov = min - dist;
    entity.x += (dx / dist) * ov;
    entity.y += (dy / dist) * ov;
  }
}
