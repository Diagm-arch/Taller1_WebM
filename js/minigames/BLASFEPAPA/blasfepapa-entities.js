// js/minigames/BLASFEPAPA/blasfepapa-entities.js

export function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function createWeakWorm(x, y, minX, maxX) {
  return {
    type: 'worm',
    x,
    y,
    w: 38,
    h: 22,
    minX,
    maxX,
    vx: 65,
    hp: 45,
    maxHp: 45,
    damage: 15,
    state: 'patrol',
    timer: 1.5 + Math.random() * 2,
    hurtTimer: 0
  };
}

export function createWeakMoth(x, y) {
  return {
    type: 'moth',
    x,
    y,
    baseY: y,
    w: 34,
    h: 28,
    vx: 0,
    vy: 0,
    hp: 35,
    maxHp: 35,
    damage: 15,
    attackCooldown: 2.0 + Math.random(),
    hurtTimer: 0,
    wingPhase: Math.random() * 6
  };
}

export function createEntwinedWormsBoss() {
  return {
    type: 'entwined_worms',
    name: 'LOS GEMELOS ENTRELAZADOS DEL ABISMO',
    hp: 320,
    maxHp: 320,
    cx: 560,
    cy: 300,
    vx: -160,
    vy: 0,
    phase: 0,
    state: 'helix_charge',
    stateTimer: 4.5,
    subTimer: 0,
    twistSpeed: 7,
    twistRadius: 28,
    separation: 0,
    hurtTimer: 0,
    segmentsCount: 8,
    wormA: [],
    wormB: []
  };
}

export function createMothFinalBoss() {
  return {
    type: 'final_moth',
    name: 'PHTHORIMAEA, GRAN POLILLA DE LA PAPA',
    hp: 420,
    maxHp: 420,
    x: 560,
    y: 150,
    vx: 0,
    vy: 0,
    w: 68,
    h: 56,
    targetX: 400,
    targetY: 140,
    state: 'free_fly',
    stateTimer: 3.2,
    shotTimer: 1.1,
    wingAngle: 0,
    hurtTimer: 0
  };
}

export function setupRoomEntities(game, zone, section, enterFromLeft = true) {
  game.enemies = [];
  game.projectiles = [];
  game.particles = [];
  game.platforms = [];
  game.ladders = [];
  game.shrine = null;
  game.boss = null;

  game.player.x = enterFromLeft ? 70 : game.width - 100;
  game.player.y = game.groundY - game.player.h;
  game.player.vx = 0;
  game.player.vy = 0;

  const roomKey = `${zone}-${section}`;
  const isCleared = game.clearedRooms.has(roomKey);

  if (section === 1) {
    game.shrine = { x: 380, y: game.groundY - 78, w: 48, h: 78 };
    game.platforms = [
      { x: 140, y: 280, w: 150, h: 14 },
      { x: 510, y: 280, w: 150, h: 14 }
    ];
    game.ladders = [
      { x: 200, y: 280, w: 28, h: game.groundY - 280 },
      { x: 570, y: 280, w: 28, h: game.groundY - 280 }
    ];

    if (zone === 1) {
      game.showBanner('ZONA I: SEPULCRO DE LAS RAÍCES');
    } else {
      game.showBanner('ZONA II: CLAUSTRO DE LA POLILLA');
    }
  } else if (section === 2) {
    game.platforms = [
      { x: 150, y: 290, w: 170, h: 14 },
      { x: 480, y: 290, w: 170, h: 14 },
      { x: 310, y: 200, w: 180, h: 14 }
    ];
    game.ladders = [
      { x: 220, y: 290, w: 28, h: game.groundY - 290 },
      { x: 550, y: 290, w: 28, h: game.groundY - 290 },
      { x: 386, y: 200, w: 28, h: 90 }
    ];

    if (!isCleared) {
      if (zone === 1) {
        game.enemies.push(createWeakWorm(320, game.groundY - 24, 240, 460));
        game.enemies.push(createWeakWorm(600, game.groundY - 24, 480, 730));
        game.enemies.push(createWeakWorm(520, 290 - 24, 485, 635));
        game.enemies.push(createWeakMoth(420, 140));
      } else {
        game.enemies.push(createWeakMoth(280, 160));
        game.enemies.push(createWeakMoth(560, 130));
        game.enemies.push(createWeakWorm(420, game.groundY - 24, 250, 680));
        game.enemies.push(createWeakWorm(200, 290 - 24, 155, 305));
      }
    }
  } else if (section === 3) {
    game.platforms = [
      { x: 110, y: 285, w: 130, h: 14 },
      { x: 560, y: 285, w: 130, h: 14 }
    ];
    game.ladders = [
      { x: 160, y: 285, w: 26, h: game.groundY - 285 },
      { x: 610, y: 285, w: 26, h: game.groundY - 285 }
    ];

    if (!isCleared) {
      if (zone === 1) {
        game.boss = createEntwinedWormsBoss();
        game.showBanner('VÁSTAGOS ENTRELAZADOS DEL SURCO');
      } else {
        game.boss = createMothFinalBoss();
        game.showBanner('PHTHORIMAEA, POLILLA DE LA CENIZA');
      }
    }
  }
}

export function updateEnemies(game, dt) {
  const p = game.player;

  for (let i = game.enemies.length - 1; i >= 0; i--) {
    const e = game.enemies[i];
    if (e.hurtTimer > 0) e.hurtTimer -= dt;

    if (e.hp <= 0) {
      game.spawnParticles(e.x + e.w / 2, e.y + e.h / 2, '#991b1b', 18);
      game.enemies.splice(i, 1);
      if (game.enemies.length === 0) {
        game.clearedRooms.add(`${game.zone}-${game.section}`);
      }
      continue;
    }

    if (e.type === 'worm') {
      e.timer -= dt;
      if (e.state === 'patrol') {
        e.x += e.vx * dt;
        if (e.x <= e.minX) { e.x = e.minX; e.vx = Math.abs(e.vx); }
        if (e.x + e.w >= e.maxX) { e.x = e.maxX - e.w; e.vx = -Math.abs(e.vx); }

        if (e.timer <= 0 && Math.abs(p.y + p.h - (e.y + e.h)) < 30) {
          e.state = 'burrow';
          e.timer = 0.7;
          game.spawnParticles(e.x + e.w / 2, e.y + e.h, '#78350f', 8);
        }
      } else if (e.state === 'burrow') {
        const targetX = Math.max(e.minX, Math.min(e.maxX - e.w, p.x));
        e.x += Math.sign(targetX - e.x) * 140 * dt;
        if (Math.random() < 0.4) {
          game.spawnParticles(e.x + e.w / 2, e.y + e.h, '#a16207', 2);
        }
        if (e.timer <= 0) {
          e.state = 'patrol';
          e.timer = 2.5 + Math.random() * 1.5;
          game.spawnParticles(e.x + e.w / 2, e.y + e.h, '#d97706', 12);
        }
      }

      if (e.state !== 'burrow' && rectsOverlap(p, e)) {
        game.damagePlayer(e.damage);
      }
    } else if (e.type === 'moth') {
      e.wingPhase += dt * 14;
      const dx = (p.x + p.w / 2) - (e.x + e.w / 2);
      const dy = (p.y - 75) - e.y;

      e.x += Math.sign(dx) * Math.min(Math.abs(dx), 95) * dt;
      e.y += dy * 1.8 * dt + Math.sin(e.wingPhase * 0.5) * 45 * dt;

      e.attackCooldown -= dt;
      if (e.attackCooldown <= 0) {
        e.attackCooldown = 2.4;
        const angle = Math.atan2((p.y + p.h / 2) - (e.y + e.h / 2), dx);
        game.projectiles.push({
          x: e.x + e.w / 2,
          y: e.y + e.h / 2,
          vx: Math.cos(angle) * 190,
          vy: Math.sin(angle) * 190,
          r: 5,
          color: '#a3e635',
          damage: 14
        });
      }

      if (rectsOverlap(p, e)) {
        game.damagePlayer(e.damage);
      }
    }
  }
}

export function updateBoss(game, dt) {
  if (!game.boss) return;
  const b = game.boss;
  const p = game.player;

  if (b.hurtTimer > 0) b.hurtTimer -= dt;

  if (b.hp <= 0) {
    const centerX = b.type === 'entwined_worms' ? b.cx : b.x + b.w / 2;
    const centerY = b.type === 'entwined_worms' ? b.cy : b.y + b.h / 2;
    game.spawnParticles(centerX, centerY, '#facc15', 45);
    game.clearedRooms.add(`${game.zone}-${game.section}`);
    game.boss = null;

    if (game.zone === 1) {
      game.showBanner('PENITENCIA CONSUMADA — AVANZA A LA DERECHA (ZONA II)', 4.0);
    } else {
      game.isVictory = true;
      game.showBanner('PLAGA EXCOMULGADA — RECETA DESBLOQUEADA', 5.0);
      setTimeout(() => {
        if (game.onWin) game.onWin();
      }, 2200);
    }
    return;
  }

  if (b.type === 'entwined_worms') {
    b.phase += dt * b.twistSpeed;
    b.stateTimer -= dt;

    if (b.state === 'helix_charge') {
      b.separation += (0 - b.separation) * 5 * dt;
      b.cx += b.vx * dt;
      b.cy += Math.sin(b.phase * 0.7) * 55 * dt;

      if (b.cx < 110) {
        b.cx = 110;
        b.vx = 230;
        game.spawnParticles(70, b.cy, '#a16207', 12);
      } else if (b.cx > game.width - 110) {
        b.cx = game.width - 110;
        b.vx = -230;
        game.spawnParticles(game.width - 70, b.cy, '#a16207', 12);
      }

      if (b.stateTimer <= 0) {
        b.state = 'burrow_strike';
        b.stateTimer = 2.6;
        b.subTimer = 0;
      }
    } else if (b.state === 'burrow_strike') {
      b.subTimer += dt;
      if (b.subTimer < 1.0) {
        b.cy += 260 * dt;
        b.cx += ((p.x + p.w / 2) - b.cx) * 3.5 * dt;
        if (Math.random() < 0.65) {
          game.spawnParticles(b.cx + (Math.random() - 0.5) * 40, game.groundY - 4, '#d97706', 3);
        }
      } else if (b.subTimer < 1.8) {
        if (b.cy > 210) {
          b.cy -= 480 * dt;
          game.spawnParticles(b.cx, game.groundY - 8, '#92400e', 5);
        }
      } else {
        b.cy += (300 - b.cy) * 4 * dt;
      }

      if (b.stateTimer <= 0) {
        b.state = 'split_pincer';
        b.stateTimer = 3.2;
      }
    } else if (b.state === 'split_pincer') {
      b.separation = Math.sin((3.2 - b.stateTimer) * Math.PI / 3.2) * 75;
      b.cx += Math.sign((p.x + p.w / 2) - b.cx) * 135 * dt;
      b.cy += ((p.y + p.h / 2) - b.cy) * 1.8 * dt;

      if (b.stateTimer <= 0) {
        b.state = 'helix_charge';
        b.stateTimer = 4.5;
        b.vx = p.x < b.cx ? -230 : 230;
      }
    }

    b.wormA = [];
    b.wormB = [];
    const dir = b.vx >= 0 ? 1 : -1;
    for (let i = 0; i < b.segmentsCount; i++) {
      const offsetAngle = b.phase - i * 0.65;
      const segX = b.cx - dir * (i - 3.5) * 20;
      const wave = Math.sin(offsetAngle) * (b.twistRadius + b.separation);

      const segA = { x: segX - 14, y: b.cy + wave - 14, w: 28, h: 28 };
      const segB = { x: segX - 14, y: b.cy - wave - 14, w: 28, h: 28 };
      b.wormA.push(segA);
      b.wormB.push(segB);

      if (rectsOverlap(p, segA) || rectsOverlap(p, segB)) {
        game.damagePlayer(18);
      }
    }
  }

  if (b.type === 'final_moth') {
    b.wingAngle += dt * 18;
    b.stateTimer -= dt;

    if (b.state === 'free_fly') {
      const dx = b.targetX - b.x;
      const dy = b.targetY - b.y;
      b.x += dx * 2.6 * dt;
      b.y += dy * 2.6 * dt;

      if (Math.hypot(dx, dy) < 40) {
        b.targetX = 90 + Math.random() * (game.width - 240);
        b.targetY = 55 + Math.random() * 230;
      }

      b.shotTimer -= dt;
      if (b.shotTimer <= 0) {
        b.shotTimer = 1.15;
        const baseAngle = Math.atan2((p.y + p.h / 2) - (b.y + b.h / 2), (p.x + p.w / 2) - (b.x + b.w / 2));
        for (let spread = -1; spread <= 1; spread++) {
          const ang = baseAngle + spread * 0.28;
          game.projectiles.push({
            x: b.x + b.w / 2,
            y: b.y + b.h / 2,
            vx: Math.cos(ang) * 230,
            vy: Math.sin(ang) * 230,
            r: 6,
            color: '#eab308',
            damage: 16
          });
        }
      }

      if (b.stateTimer <= 0) {
        b.state = Math.random() < 0.55 ? 'swoop_prep' : 'spore_storm';
        b.stateTimer = b.state === 'swoop_prep' ? 0.75 : 3.0;
      }
    } else if (b.state === 'swoop_prep') {
      b.y -= 40 * dt;
      if (b.stateTimer <= 0) {
        b.state = 'swoop_dash';
        b.stateTimer = 0.85;
        const ang = Math.atan2((p.y + p.h / 2) - (b.y + b.h / 2), (p.x + p.w / 2) - (b.x + b.w / 2));
        b.vx = Math.cos(ang) * 460;
        b.vy = Math.sin(ang) * 460;
        game.spawnParticles(b.x + b.w / 2, b.y + b.h / 2, '#f43f5e', 16);
      }
    } else if (b.state === 'swoop_dash') {
      b.x += b.vx * dt;
      b.y += b.vy * dt;

      if (b.x < 30 || b.x + b.w > game.width - 30) b.vx *= -0.8;
      if (b.y < 30 || b.y + b.h > game.groundY - 10) b.vy *= -0.8;

      if (b.stateTimer <= 0) {
        b.state = 'free_fly';
        b.stateTimer = 3.5;
        b.targetX = 120 + Math.random() * 520;
        b.targetY = 70 + Math.random() * 160;
      }
    } else if (b.state === 'spore_storm') {
      b.x += (game.width / 2 - b.w / 2 - b.x) * 3 * dt;
      b.y += (105 - b.y) * 3 * dt;

      b.shotTimer -= dt;
      if (b.shotTimer <= 0) {
        b.shotTimer = 0.45;
        const offset = b.stateTimer * 3;
        for (let k = 0; k < 6; k++) {
          const ang = offset + (k / 6) * Math.PI * 2;
          game.projectiles.push({
            x: b.x + b.w / 2,
            y: b.y + b.h / 2,
            vx: Math.cos(ang) * 185,
            vy: Math.sin(ang) * 185,
            r: 5,
            color: '#eab308',
            damage: 15
          });
        }
      }

      if (b.stateTimer <= 0) {
        b.state = 'free_fly';
        b.stateTimer = 3.6;
      }
    }

    if (rectsOverlap(p, b)) {
      game.damagePlayer(20);
    }
  }
}

export function checkBossHit(boss, swordBox, spawnParticlesFn) {
  if (!boss) return false;

  if (boss.type === 'entwined_worms') {
    for (const seg of [...boss.wormA, ...boss.wormB]) {
      if (rectsOverlap(swordBox, seg)) {
        spawnParticlesFn(seg.x + 14, seg.y + 14, '#f87171', 12);
        return true;
      }
    }
    return false;
  } else if (boss.type === 'final_moth') {
    if (rectsOverlap(swordBox, boss)) {
      spawnParticlesFn(boss.x + boss.w / 2, boss.y + boss.h / 2, '#fde047', 12);
      return true;
    }
  }
  return false;
}

export function updateProjectiles(game, dt) {
  const p = game.player;
  for (let i = game.projectiles.length - 1; i >= 0; i--) {
    const proj = game.projectiles[i];
    proj.x += proj.vx * dt;
    proj.y += proj.vy * dt;

    if (proj.x < 0 || proj.x > game.width || proj.y < 0 || proj.y > game.groundY) {
      game.projectiles.splice(i, 1);
      continue;
    }

    const projBox = { x: proj.x - proj.r, y: proj.y - proj.r, w: proj.r * 2, h: proj.r * 2 };
    if (rectsOverlap(p, projBox)) {
      game.damagePlayer(proj.damage);
      game.projectiles.splice(i, 1);
    }
  }
}
