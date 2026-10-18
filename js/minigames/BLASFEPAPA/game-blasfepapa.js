// js/minigames/BLASFEPAPA/game-blasfepapa.js

import { BlasfepapaAudio } from './audio-blasfepapa.js';
import { BlasfepapaRenderer } from './blasfepapa-renderer.js';
import {
  rectsOverlap,
  setupRoomEntities,
  updateEnemies,
  updateBoss,
  checkBossHit,
  updateProjectiles
} from './blasfepapa-entities.js';

export class BlasphemousPotatoGame {
  constructor(containerElement, onWinCallback, mainBgm = null) {
    this.container = containerElement;
    this.onWin = onWinCallback;

    // Inicializar controlador de audio y renderizado
    this.audio = new BlasfepapaAudio(mainBgm);
    this.audio.start(1);
    this.renderer = new BlasfepapaRenderer();

    // Resolución interna estilo Pixel Art / PS1
    this.width = 800;
    this.height = 450;
    this.groundY = 390;

    this.canvas = document.createElement('canvas');
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.canvas.className = 'w-full h-full object-contain bg-black';
    this.canvas.style.imageRendering = 'pixelated';

    this.container.innerHTML = '';
    this.container.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');

    // Estado de controles (Teclado + Táctil)
    this.keys = {};
    this.justPressed = {};
    this.activeTouchKeys = new Set();

    // Progreso de Zonas (Zona 1 o 2, Sección 1, 2 o 3)
    this.zone = 1;
    this.section = 1;
    this.clearedRooms = new Set();

    // Protagonista: Patata Penitente con Armadura Victoriana
    this.player = {
      x: 120,
      y: 330,
      vx: 0,
      vy: 0,
      w: 28,
      h: 40,
      facing: 1,
      aimY: 0,
      hp: 100,
      maxHp: 100,
      stamina: 100,
      maxStamina: 100,
      vials: 3,
      maxVials: 3,
      vialHealPercent: 0.45,
      healEffectTimer: 0,
      onGround: false,
      onLadder: false,
      crouching: false,
      isDodging: false,
      dodgeTimer: 0,
      dodgeCooldown: 0,
      dodgeDirX: 1,
      dodgeDirY: 0,
      isAttacking: false,
      attackTimer: 0,
      attackCooldown: 0,
      attackDir: 'front',
      hitTargets: new Set(),
      invulnTimer: 0,
      afterimages: []
    };

    this.enemies = [];
    this.projectiles = [];
    this.particles = [];
    this.platforms = [];
    this.ladders = [];
    this.shrine = null;
    this.boss = null;

    this.bannerText = '';
    this.bannerTimer = 0;
    this.isGameOver = false;
    this.isVictory = false;
    this.animFrameId = null;
    this.lastTime = performance.now();

    this.createMobileTouchControls();
    this.bindEvents();
    this.loadRoom(1, 1);
    this.loop(this.lastTime);
  }

  createMobileTouchControls() {
    this.touchOverlay = document.createElement('div');
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0 || window.innerWidth < 900;
    this.touchOverlay.className = `${isTouchDevice ? 'flex' : 'hidden md:hidden'} absolute inset-0 pointer-events-none flex-col justify-end p-2 sm:p-4 select-none z-20`;

    this.touchOverlay.innerHTML = `
      <div class="w-full flex justify-between items-end pb-1 px-1">
        <div class="relative w-32 h-32 sm:w-36 sm:h-36 pointer-events-auto touch-none">
          <button data-key="ArrowUp" class="touch-btn absolute top-0 left-1/2 -translate-x-1/2 w-10 h-11 sm:w-11 sm:h-12 bg-stone-900/80 border-2 border-amber-600/80 text-amber-300 text-lg flex items-center justify-center active:bg-amber-700/80 rounded-t">
            ▲
          </button>
          <button data-key="ArrowDown" class="touch-btn absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-11 sm:w-11 sm:h-12 bg-stone-900/80 border-2 border-amber-600/80 text-amber-300 text-lg flex items-center justify-center active:bg-amber-700/80 rounded-b">
            ▼
          </button>
          <button data-key="ArrowLeft" class="touch-btn absolute left-0 top-1/2 -translate-y-1/2 w-11 h-10 sm:w-12 sm:h-11 bg-stone-900/80 border-2 border-amber-600/80 text-amber-300 text-lg flex items-center justify-center active:bg-amber-700/80 rounded-l">
            ◀
          </button>
          <button data-key="ArrowRight" class="touch-btn absolute right-0 top-1/2 -translate-y-1/2 w-11 h-10 sm:w-12 sm:h-11 bg-stone-900/80 border-2 border-amber-600/80 text-amber-300 text-lg flex items-center justify-center active:bg-amber-700/80 rounded-r">
            ▶
          </button>
          <div class="absolute inset-0 m-auto w-9 h-9 bg-stone-950/90 border border-amber-800/50 pointer-events-none"></div>
        </div>

        <div class="grid grid-cols-2 gap-2 sm:gap-2.5 pointer-events-auto touch-none">
          <button data-key="KeyE" class="touch-btn w-14 h-12 sm:w-16 sm:h-14 bg-red-950/80 border-2 border-amber-500/80 text-yellow-300 text-xs sm:text-sm flex flex-col items-center justify-center active:bg-red-700/80 rounded shadow-md leading-none">
            <span>🧪</span>
            <span class="mt-0.5">VIAL</span>
          </button>
          <button data-key="KeyW" class="touch-btn w-14 h-12 sm:w-16 sm:h-14 bg-stone-900/80 border-2 border-amber-600/80 text-amber-200 text-xs sm:text-sm flex flex-col items-center justify-center active:bg-amber-700/80 rounded shadow-md leading-none">
            <span>▲</span>
            <span class="mt-0.5">SALTO</span>
          </button>
          <button data-key="KeyJ" class="touch-btn w-14 h-12 sm:w-16 sm:h-14 bg-red-900/85 border-2 border-yellow-400 text-white text-xs sm:text-sm flex flex-col items-center justify-center active:bg-red-600 rounded shadow-md leading-none">
            <span>⚔</span>
            <span class="mt-0.5">ESPADA</span>
          </button>
          <button data-key="ShiftLeft" class="touch-btn w-14 h-12 sm:w-16 sm:h-14 bg-stone-800/85 border-2 border-cyan-400/80 text-cyan-200 text-xs sm:text-sm flex flex-col items-center justify-center active:bg-cyan-800 rounded shadow-md leading-none">
            <span>💨</span>
            <span class="mt-0.5">ESQUIVA</span>
          </button>
        </div>
      </div>
    `;

    this.container.appendChild(this.touchOverlay);

    const syncTouches = (e) => {
      if (e.cancelable) e.preventDefault();
      e.stopPropagation();

      if (this.isGameOver && e.touches.length > 0) {
        this.justPressed['KeyR'] = true;
        return;
      }

      const nextKeys = new Set();
      for (let i = 0; i < e.touches.length; i++) {
        const t = e.touches[i];
        const el = document.elementFromPoint(t.clientX, t.clientY);
        const btn = el ? el.closest('.touch-btn') : null;
        if (btn && btn.dataset.key) {
          nextKeys.add(btn.dataset.key);
        }
      }

      nextKeys.forEach((k) => {
        if (!this.activeTouchKeys.has(k)) {
          this.justPressed[k] = true;
        }
        this.keys[k] = true;
      });

      this.activeTouchKeys.forEach((k) => {
        if (!nextKeys.has(k)) {
          this.keys[k] = false;
        }
      });

      this.activeTouchKeys = nextKeys;
    };

    this.touchOverlay.addEventListener('touchstart', syncTouches, { passive: false });
    this.touchOverlay.addEventListener('touchmove', syncTouches, { passive: false });
    this.touchOverlay.addEventListener('touchend', syncTouches, { passive: false });
    this.touchOverlay.addEventListener('touchcancel', syncTouches, { passive: false });
  }

  bindEvents() {
    this.handleKeyDown = (e) => {
      const code = e.code;
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(code)) {
        e.preventDefault();
      }
      if (!this.keys[code]) {
        this.justPressed[code] = true;
      }
      this.keys[code] = true;
    };

    this.handleKeyUp = (e) => {
      this.keys[e.code] = false;
    };

    this.handleMouseDown = (e) => {
      if (e.sourceCapabilities && e.sourceCapabilities.firesTouchEvents) return;
      if (e.button === 0) {
        if (this.isGameOver) {
          this.justPressed['KeyR'] = true;
        } else {
          this.justPressed['MouseLeft'] = true;
        }
      }
    };

    this.handleCanvasTouch = (e) => {
      if (this.touchOverlay && this.touchOverlay.classList.contains('hidden')) {
        this.touchOverlay.classList.remove('hidden', 'md:hidden');
        this.touchOverlay.classList.add('flex');
      }
      if (this.isGameOver) {
        if (e.cancelable) e.preventDefault();
        this.justPressed['KeyR'] = true;
      }
    };

    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    this.canvas.addEventListener('mousedown', this.handleMouseDown);
    this.canvas.addEventListener('touchstart', this.handleCanvasTouch, { passive: false });
  }

  destroy() {
    if (this.audio) {
      this.audio.stopAndRestore();
    }
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    this.canvas.removeEventListener('mousedown', this.handleMouseDown);
    this.canvas.removeEventListener('touchstart', this.handleCanvasTouch);
    if (this.touchOverlay) {
      this.touchOverlay.remove();
    }
  }

  showBanner(text, duration = 2.6) {
    this.bannerText = text;
    this.bannerTimer = duration;
  }

  isNearAltar() {
    if (!this.shrine) return false;
    const pCenter = this.player.x + this.player.w / 2;
    const sCenter = this.shrine.x + this.shrine.w / 2;
    return Math.abs(pCenter - sCenter) < 55 && Math.abs((this.player.y + this.player.h) - (this.shrine.y + this.shrine.h)) < 45;
  }

  loadRoom(zone, section, enterFromLeft = true) {
    this.zone = zone;
    this.section = section;

    if (this.audio) {
      this.audio.playZone(zone);
    }

    setupRoomEntities(this, zone, section, enterFromLeft);
  }

  loop(timestamp) {
    const dt = Math.min(0.05, (timestamp - this.lastTime) / 1000);
    this.lastTime = timestamp;

    this.update(dt);
    this.render();

    this.justPressed = {};
    this.animFrameId = requestAnimationFrame((t) => this.loop(t));
  }

  update(dt) {
    if (this.bannerTimer > 0) this.bannerTimer -= dt;

    if (this.isGameOver) {
      if (this.justPressed['KeyR'] || this.justPressed['Space']) {
        this.isGameOver = false;
        this.player.hp = this.player.maxHp;
        this.player.vials = this.player.maxVials;
        this.loadRoom(this.zone, 1, true);
      }
      return;
    }

    if (this.isVictory) return;

    this.updatePlayer(dt);
    updateEnemies(this, dt);
    updateBoss(this, dt);
    updateProjectiles(this, dt);
    this.updateParticles(dt);
    this.checkRoomTransitions();
  }

  updatePlayer(dt) {
    const p = this.player;

    if (p.invulnTimer > 0) p.invulnTimer -= dt;
    if (p.dodgeCooldown > 0) p.dodgeCooldown -= dt;
    if (p.attackCooldown > 0) p.attackCooldown -= dt;
    if (p.healEffectTimer > 0) p.healEffectTimer -= dt;

    if (!p.isDodging && !p.isAttacking) {
      p.stamina = Math.min(p.maxStamina, p.stamina + 38 * dt);
    }

    for (let i = p.afterimages.length - 1; i >= 0; i--) {
      p.afterimages[i].alpha -= dt * 3.2;
      if (p.afterimages[i].alpha <= 0) p.afterimages.splice(i, 1);
    }

    const left = this.keys['KeyA'] || this.keys['ArrowLeft'];
    const right = this.keys['KeyD'] || this.keys['ArrowRight'];
    const up = this.keys['KeyW'] || this.keys['ArrowUp'];
    const down = this.keys['KeyS'] || this.keys['ArrowDown'];

    const dirX = (right ? 1 : 0) - (left ? 1 : 0);
    const dirY = (down ? 1 : 0) - (up ? 1 : 0);

    if (dirX !== 0 && !p.isDodging) p.facing = dirX;
    p.aimY = dirY;

    const nearAltar = this.isNearAltar();

    if (nearAltar && this.justPressed['KeyE']) {
      p.hp = p.maxHp;
      p.vials = p.maxVials;
      p.healEffectTimer = 0.6;
      this.spawnParticles(this.shrine.x + 24, this.shrine.y + 30, '#f59e0b', 28);
      this.showBanner('ALTAR CONSAGRADO — VIALES Y SALUD RESTAURADOS', 2.0);
    } else if (
      this.justPressed['KeyQ'] ||
      this.justPressed['KeyF'] ||
      this.justPressed['KeyL'] ||
      (!nearAltar && this.justPressed['KeyE'])
    ) {
      if (p.vials > 0 && p.hp < p.maxHp) {
        p.vials--;
        const healAmount = Math.round(p.maxHp * p.vialHealPercent);
        p.hp = Math.min(p.maxHp, p.hp + healAmount);
        p.healEffectTimer = 0.45;
        this.spawnParticles(p.x + p.w / 2, p.y + p.h / 2, '#ef4444', 18);
        this.spawnParticles(p.x + p.w / 2, p.y + p.h / 2, '#facc15', 10);
      }
    }

    const wantsDodge = this.justPressed['ShiftLeft'] || this.justPressed['ShiftRight'] ||
                       this.justPressed['KeyK'] || this.justPressed['Space'];
    if (wantsDodge && !p.isDodging && p.dodgeCooldown <= 0 && p.stamina >= 25) {
      p.isDodging = true;
      p.dodgeTimer = 0.24;
      p.dodgeCooldown = 0.42;
      p.invulnTimer = 0.28;
      p.stamina -= 25;
      p.onLadder = false;

      if (dirX !== 0 || dirY !== 0) {
        const len = Math.hypot(dirX, dirY);
        p.dodgeDirX = dirX / len;
        p.dodgeDirY = dirY / len;
      } else {
        p.dodgeDirX = p.facing;
        p.dodgeDirY = 0;
      }
      this.spawnParticles(p.x + p.w / 2, p.y + p.h - 4, '#a8a29e', 8);
    }

    const wantsAttack = this.justPressed['KeyJ'] || this.justPressed['KeyZ'] || this.justPressed['MouseLeft'];
    if (wantsAttack && !p.isAttacking && p.attackCooldown <= 0 && p.stamina >= 15) {
      p.isAttacking = true;
      p.attackTimer = 0.20;
      p.attackCooldown = 0.30;
      p.stamina -= 15;
      p.hitTargets.clear();

      if (this.keys['ArrowUp'] || (this.keys['KeyW'] && !this.justPressed['KeyW'])) p.attackDir = 'up';
      else if (down && !p.onGround) p.attackDir = 'down';
      else p.attackDir = 'front';
    }

    if (p.isDodging) {
      p.dodgeTimer -= dt;
      p.vx = p.dodgeDirX * 420;
      p.vy = p.dodgeDirY * 320;

      if (Math.random() < 0.65) {
        p.afterimages.push({ x: p.x, y: p.y, facing: p.facing, alpha: 0.65 });
      }
      if (p.dodgeTimer <= 0) {
        p.isDodging = false;
        p.vy = Math.min(p.vy, 0);
      }
    } else {
      const touchingLadder = this.ladders.find(l =>
        p.x + p.w > l.x && p.x < l.x + l.w &&
        p.y + p.h >= l.y && p.y <= l.y + l.h
      );

      const climbUp = this.keys['ArrowUp'] || (this.keys['KeyW'] && !this.justPressed['KeyW']);

      if (touchingLadder && (climbUp || down)) {
        p.onLadder = true;
        p.vx = dirX * 140;
        p.vy = (down ? 1 : -1) * 180;
      } else if (p.onLadder && touchingLadder) {
        if (this.justPressed['KeyW']) {
          p.onLadder = false;
          p.vy = -440;
        } else {
          p.vx = dirX * 140;
          p.vy = 0;
        }
      } else {
        p.onLadder = false;
        p.crouching = down && p.onGround;
        const speed = p.crouching ? 95 : 210;
        p.vx = dirX * speed;

        if ((this.justPressed['KeyW'] || this.justPressed['ArrowUp']) && p.onGround) {
          p.vy = -460;
          p.onGround = false;
        }

        p.vy += 1050 * dt;
        if (down && !p.onGround) {
          p.vy += 450 * dt;
        }
      }
    }

    const prevBottom = p.y + p.h;
    p.x += p.vx * dt;
    p.y += p.vy * dt;

    p.onGround = false;
    if (!p.onLadder && p.vy >= 0 && !down) {
      for (const plat of this.platforms) {
        if (
          p.x + p.w > plat.x &&
          p.x < plat.x + plat.w &&
          prevBottom <= plat.y + 8 &&
          p.y + p.h >= plat.y
        ) {
          p.y = plat.y - p.h;
          p.vy = 0;
          p.onGround = true;
        }
      }
    }

    if (p.y + p.h >= this.groundY) {
      p.y = this.groundY - p.h;
      p.vy = 0;
      p.onGround = true;
      p.onLadder = false;
    }

    if (p.y < 20) {
      p.y = 20;
      p.vy = 0;
    }

    if (p.isAttacking) {
      p.attackTimer -= dt;
      const swordBox = this.getSwordHitbox();

      for (const enemy of this.enemies) {
        if (!p.hitTargets.has(enemy) && rectsOverlap(swordBox, enemy)) {
          p.hitTargets.add(enemy);
          enemy.hp -= 25;
          enemy.hurtTimer = 0.18;
          this.spawnParticles(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, '#ef4444', 10);
          if (p.attackDir === 'down') p.vy = -340;
        }
      }

      if (this.boss && !p.hitTargets.has(this.boss)) {
        if (this.checkBossHit(swordBox)) {
          p.hitTargets.add(this.boss);
          this.boss.hp -= 24;
          this.boss.hurtTimer = 0.15;
          if (p.attackDir === 'down') p.vy = -350;
        }
      }

      if (p.attackTimer <= 0) {
        p.isAttacking = false;
      }
    }
  }

  getSwordHitbox() {
    const p = this.player;
    if (p.attackDir === 'up') {
      return { x: p.x - 14, y: p.y - 42, w: p.w + 28, h: 44 };
    }
    if (p.attackDir === 'down') {
      return { x: p.x - 12, y: p.y + p.h - 4, w: p.w + 24, h: 42 };
    }
    return {
      x: p.facing === 1 ? p.x + p.w - 4 : p.x - 52,
      y: p.y - 4,
      w: 56,
      h: p.h + 8
    };
  }

  damagePlayer(amount) {
    const p = this.player;
    if (p.invulnTimer > 0 || p.isDodging || this.isVictory) return;

    p.hp = Math.max(0, p.hp - amount);
    p.invulnTimer = 0.85;
    this.spawnParticles(p.x + p.w / 2, p.y + p.h / 2, '#dc2626', 18);

    if (p.hp <= 0) {
      this.isGameOver = true;
    }
  }

  checkBossHit(swordBox) {
    return checkBossHit(this.boss, swordBox, (x, y, color, count) => {
      this.spawnParticles(x, y, color, count);
    });
  }

  updateParticles(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const pt = this.particles[i];
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.life -= dt;
      if (pt.life <= 0) this.particles.splice(i, 1);
    }
  }

  spawnParticles(x, y, color, count = 10) {
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = 40 + Math.random() * 140;
      this.particles.push({
        x,
        y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        color,
        life: 0.25 + Math.random() * 0.35
      });
    }
  }

  checkRoomTransitions() {
    const p = this.player;
    const roomCombatActive = this.enemies.length > 0 || this.boss !== null;

    if (p.x < 10) {
      if (roomCombatActive && this.section === 3) {
        p.x = 10;
      } else if (this.section > 1) {
        this.loadRoom(this.zone, this.section - 1, false);
      } else if (this.zone === 2 && this.section === 1) {
        this.loadRoom(1, 3, false);
      } else {
        p.x = 10;
      }
    }

    if (p.x + p.w > this.width - 10) {
      if (roomCombatActive) {
        p.x = this.width - 10 - p.w;
      } else if (this.section < 3) {
        this.loadRoom(this.zone, this.section + 1, true);
      } else if (this.zone === 1 && this.section === 3) {
        this.loadRoom(2, 1, true);
      } else {
        p.x = this.width - 10 - p.w;
      }
    }
  }

  render() {
    this.renderer.render(this);
  }
}