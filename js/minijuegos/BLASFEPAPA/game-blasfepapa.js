import { BlasfepapaAudio } from './audio-blasfepapa.js';

export class BlasphemousPotatoGame {
  constructor(containerElement, onWinCallback, mainBgm = null) {
    this.container = containerElement;
    this.onWin = onWinCallback;

    // Inicializar controlador de audio de Blasfepapa
    this.audio = new BlasfepapaAudio(mainBgm);
    this.audio.start(1);

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
      // Sistema de 3 Viales (45% de vida máxima cada uno)
      vials: 3,
      maxVials: 3,
      vialHealPercent: 0.45,
      healEffectTimer: 0,
      onGround: false,
      onLadder: false,
      crouching: false,
      // Esquiva (Dash con i-frames)
      isDodging: false,
      dodgeTimer: 0,
      dodgeCooldown: 0,
      dodgeDirX: 1,
      dodgeDirY: 0,
      // Ataque con Espada
      isAttacking: false,
      attackTimer: 0,
      attackCooldown: 0,
      attackDir: 'front',
      hitTargets: new Set(),
      // Daño e invulnerabilidad
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

  // =========================================================================
  // CONTROLES TÁCTILES MULTITÁCTIL PARA CELULAR / TABLET
  // =========================================================================
  createMobileTouchControls() {
    this.touchOverlay = document.createElement('div');
    // Se muestra en pantallas móviles/tablets o dispositivos táctiles
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0 || window.innerWidth < 900;
    this.touchOverlay.className = `${isTouchDevice ? 'flex' : 'hidden md:hidden'} absolute inset-0 pointer-events-none flex-col justify-end p-2 sm:p-4 select-none z-20`;

    this.touchOverlay.innerHTML = `
      <div class="w-full flex justify-between items-end pb-1 px-1">
        <!-- CRUCETA DE 4 DIRECCIONES (IZQUIERDA) -->
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

        <!-- BOTONES DE ACCIÓN (DERECHA) -->
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

    // Sincronizar todos los dedos en pantalla (Multitouch real + deslizamiento en cruceta)
    const syncTouches = (e) => {
      if (e.cancelable) e.preventDefault();
      e.stopPropagation();

      // Si el jugador murió y toca cualquier control, renace
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

      // Activar nuevas teclas presionadas
      nextKeys.forEach((k) => {
        if (!this.activeTouchKeys.has(k)) {
          this.justPressed[k] = true;
        }
        this.keys[k] = true;
      });

      // Soltar teclas que dejaron de tocarse
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
      // Evitar que toques en móvil disparen el clic de ratón por duplicado
      if (e.sourceCapabilities && e.sourceCapabilities.firesTouchEvents) return;
      if (e.button === 0) {
        if (this.isGameOver) {
          this.justPressed['KeyR'] = true;
        } else {
          this.justPressed['MouseLeft'] = true;
        }
      }
    };

    // Si en celular aparece algún toque y el overlay estaba oculto, mostrarlo y permitir renacer al tocar el canvas
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

  // =========================================================================
  // DISEÑO DE LAS 2 ZONAS Y SUS 3 SECCIONES
  // =========================================================================
  loadRoom(zone, section, enterFromLeft = true) {
    this.zone = zone;
    this.section = section;

    if (this.audio) {
      this.audio.playZone(zone);
    }

    this.enemies = [];
    this.projectiles = [];
    this.particles = [];
    this.platforms = [];
    this.ladders = [];
    this.shrine = null;
    this.boss = null;

    this.player.x = enterFromLeft ? 70 : this.width - 100;
    this.player.y = this.groundY - this.player.h;
    this.player.vx = 0;
    this.player.vy = 0;

    const roomKey = `${zone}-${section}`;
    const isCleared = this.clearedRooms.has(roomKey);

    if (section === 1) {
      this.shrine = { x: 380, y: this.groundY - 78, w: 48, h: 78 };
      this.platforms = [
        { x: 140, y: 280, w: 150, h: 14 },
        { x: 510, y: 280, w: 150, h: 14 }
      ];
      this.ladders = [
        { x: 200, y: 280, w: 28, h: this.groundY - 280 },
        { x: 570, y: 280, w: 28, h: this.groundY - 280 }
      ];

      if (zone === 1) {
        this.showBanner('ZONA I: SEPULCRO DE LAS RAÍCES');
      } else {
        this.showBanner('ZONA II: CLAUSTRO DE LA POLILLA');
      }
    } else if (section === 2) {
      this.platforms = [
        { x: 150, y: 290, w: 170, h: 14 },
        { x: 480, y: 290, w: 170, h: 14 },
        { x: 310, y: 200, w: 180, h: 14 }
      ];
      this.ladders = [
        { x: 220, y: 290, w: 28, h: this.groundY - 290 },
        { x: 550, y: 290, w: 28, h: this.groundY - 290 },
        { x: 386, y: 200, w: 28, h: 90 }
      ];

      if (!isCleared) {
        if (zone === 1) {
          this.enemies.push(this.createWeakWorm(320, this.groundY - 24, 240, 460));
          this.enemies.push(this.createWeakWorm(600, this.groundY - 24, 480, 730));
          this.enemies.push(this.createWeakWorm(520, 290 - 24, 485, 635));
          this.enemies.push(this.createWeakMoth(420, 140));
        } else {
          this.enemies.push(this.createWeakMoth(280, 160));
          this.enemies.push(this.createWeakMoth(560, 130));
          this.enemies.push(this.createWeakWorm(420, this.groundY - 24, 250, 680));
          this.enemies.push(this.createWeakWorm(200, 290 - 24, 155, 305));
        }
      }
    } else if (section === 3) {
      this.platforms = [
        { x: 110, y: 285, w: 130, h: 14 },
        { x: 560, y: 285, w: 130, h: 14 }
      ];
      this.ladders = [
        { x: 160, y: 285, w: 26, h: this.groundY - 285 },
        { x: 610, y: 285, w: 26, h: this.groundY - 285 }
      ];

      if (!isCleared) {
        if (zone === 1) {
          this.boss = this.createEntwinedWormsBoss();
          this.showBanner('VÁSTAGOS ENTRELAZADOS DEL SURCO');
        } else {
          this.boss = this.createMothFinalBoss();
          this.showBanner('PHTHORIMAEA, POLILLA DE LA CENIZA');
        }
      }
    }
  }

  // =========================================================================
  // FÁBRICA DE ENEMIGOS Y JEFES
  // =========================================================================
  createWeakWorm(x, y, minX, maxX) {
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

  createWeakMoth(x, y) {
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

  createEntwinedWormsBoss() {
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

  createMothFinalBoss() {
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

  // =========================================================================
  // BUCLE PRINCIPAL Y LÓGICA DE JUEGO
  // =========================================================================
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
    this.updateEnemies(dt);
    this.updateBoss(dt);
    this.updateProjectiles(dt);
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

    // 1. INTERACTUAR CON EL ALTAR: Recarga los 3 Viales y restaura la vida
    if (nearAltar && this.justPressed['KeyE']) {
      p.hp = p.maxHp;
      p.vials = p.maxVials;
      p.healEffectTimer = 0.6;
      this.spawnParticles(this.shrine.x + 24, this.shrine.y + 30, '#f59e0b', 28);
      this.showBanner('ALTAR CONSAGRADO — VIALES Y SALUD RESTAURADOS', 2.0);
    }
    // 2. USAR VIAL BILIAR: Recupera el 45% de la vida máxima (sin texto flotante)
    else if (
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

    // ESQUIVA (Shift, K o Espacio)
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

    // ATAQUE CON ESPADA (J, Z o Clic Izquierdo)
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

      // En móvil, ArrowUp sube escaleras y KeyW salta directamente (o ambos)
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
        if (!p.hitTargets.has(enemy) && this.rectsOverlap(swordBox, enemy)) {
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

  // =========================================================================
  // COMPORTAMIENTO DE ENEMIGOS DÉBILES (GUSANOS Y POLILLAS)
  // =========================================================================
  updateEnemies(dt) {
    const p = this.player;

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      if (e.hurtTimer > 0) e.hurtTimer -= dt;

      if (e.hp <= 0) {
        this.spawnParticles(e.x + e.w / 2, e.y + e.h / 2, '#991b1b', 18);
        this.enemies.splice(i, 1);
        if (this.enemies.length === 0) {
          this.clearedRooms.add(`${this.zone}-${this.section}`);
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
            this.spawnParticles(e.x + e.w / 2, e.y + e.h, '#78350f', 8);
          }
        } else if (e.state === 'burrow') {
          const targetX = Math.max(e.minX, Math.min(e.maxX - e.w, p.x));
          e.x += Math.sign(targetX - e.x) * 140 * dt;
          if (Math.random() < 0.4) {
            this.spawnParticles(e.x + e.w / 2, e.y + e.h, '#a16207', 2);
          }
          if (e.timer <= 0) {
            e.state = 'patrol';
            e.timer = 2.5 + Math.random() * 1.5;
            this.spawnParticles(e.x + e.w / 2, e.y + e.h, '#d97706', 12);
          }
        }

        if (e.state !== 'burrow' && this.rectsOverlap(p, e)) {
          this.damagePlayer(e.damage);
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
          this.projectiles.push({
            x: e.x + e.w / 2,
            y: e.y + e.h / 2,
            vx: Math.cos(angle) * 190,
            vy: Math.sin(angle) * 190,
            r: 5,
            color: '#a3e635',
            damage: 14
          });
        }

        if (this.rectsOverlap(p, e)) {
          this.damagePlayer(e.damage);
        }
      }
    }
  }

  // =========================================================================
  // JEFES DE ZONA 1 (GUSANOS ENTRELAZADOS) Y ZONA 2 (GRAN POLILLA)
  // =========================================================================
  updateBoss(dt) {
    if (!this.boss) return;
    const b = this.boss;
    const p = this.player;

    if (b.hurtTimer > 0) b.hurtTimer -= dt;

    if (b.hp <= 0) {
      const centerX = b.type === 'entwined_worms' ? b.cx : b.x + b.w / 2;
      const centerY = b.type === 'entwined_worms' ? b.cy : b.y + b.h / 2;
      this.spawnParticles(centerX, centerY, '#facc15', 45);
      this.clearedRooms.add(`${this.zone}-${this.section}`);
      this.boss = null;

      if (this.zone === 1) {
        this.showBanner('PENITENCIA CONSUMADA — AVANZA A LA DERECHA (ZONA II)', 4.0);
      } else {
        this.isVictory = true;
        this.showBanner('PLAGA EXCOMULGADA — RECETA DESBLOQUEADA', 5.0);
        setTimeout(() => {
          if (this.onWin) this.onWin();
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
          this.spawnParticles(70, b.cy, '#a16207', 12);
        } else if (b.cx > this.width - 110) {
          b.cx = this.width - 110;
          b.vx = -230;
          this.spawnParticles(this.width - 70, b.cy, '#a16207', 12);
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
            this.spawnParticles(b.cx + (Math.random() - 0.5) * 40, this.groundY - 4, '#d97706', 3);
          }
        } else if (b.subTimer < 1.8) {
          if (b.cy > 210) {
            b.cy -= 480 * dt;
            this.spawnParticles(b.cx, this.groundY - 8, '#92400e', 5);
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

        if (this.rectsOverlap(p, segA) || this.rectsOverlap(p, segB)) {
          this.damagePlayer(18);
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
          b.targetX = 90 + Math.random() * (this.width - 240);
          b.targetY = 55 + Math.random() * 230;
        }

        b.shotTimer -= dt;
        if (b.shotTimer <= 0) {
          b.shotTimer = 1.15;
          const baseAngle = Math.atan2((p.y + p.h / 2) - (b.y + b.h / 2), (p.x + p.w / 2) - (b.x + b.w / 2));
          for (let spread = -1; spread <= 1; spread++) {
            const ang = baseAngle + spread * 0.28;
            this.projectiles.push({
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
          this.spawnParticles(b.x + b.w / 2, b.y + b.h / 2, '#f43f5e', 16);
        }
      } else if (b.state === 'swoop_dash') {
        b.x += b.vx * dt;
        b.y += b.vy * dt;

        if (b.x < 30 || b.x + b.w > this.width - 30) b.vx *= -0.8;
        if (b.y < 30 || b.y + b.h > this.groundY - 10) b.vy *= -0.8;

        if (b.stateTimer <= 0) {
          b.state = 'free_fly';
          b.stateTimer = 3.5;
          b.targetX = 120 + Math.random() * 520;
          b.targetY = 70 + Math.random() * 160;
        }
      } else if (b.state === 'spore_storm') {
        b.x += (this.width / 2 - b.w / 2 - b.x) * 3 * dt;
        b.y += (105 - b.y) * 3 * dt;

        b.shotTimer -= dt;
        if (b.shotTimer <= 0) {
          b.shotTimer = 0.45;
          const offset = b.stateTimer * 3;
          for (let k = 0; k < 6; k++) {
            const ang = offset + (k / 6) * Math.PI * 2;
            this.projectiles.push({
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

      if (this.rectsOverlap(p, b)) {
        this.damagePlayer(20);
      }
    }
  }

  checkBossHit(swordBox) {
    if (!this.boss) return false;
    const b = this.boss;

    if (b.type === 'entwined_worms') {
      for (const seg of [...b.wormA, ...b.wormB]) {
        if (this.rectsOverlap(swordBox, seg)) {
          this.spawnParticles(seg.x + 14, seg.y + 14, '#f87171', 12);
          return true;
        }
      }
      return false;
    } else if (b.type === 'final_moth') {
      if (this.rectsOverlap(swordBox, b)) {
        this.spawnParticles(b.x + b.w / 2, b.y + b.h / 2, '#fde047', 12);
        return true;
      }
    }
    return false;
  }

  updateProjectiles(dt) {
    const p = this.player;
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];
      proj.x += proj.vx * dt;
      proj.y += proj.vy * dt;

      if (proj.x < 0 || proj.x > this.width || proj.y < 0 || proj.y > this.groundY) {
        this.projectiles.splice(i, 1);
        continue;
      }

      const projBox = { x: proj.x - proj.r, y: proj.y - proj.r, w: proj.r * 2, h: proj.r * 2 };
      if (this.rectsOverlap(p, projBox)) {
        this.damagePlayer(proj.damage);
        this.projectiles.splice(i, 1);
      }
    }
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

  // =========================================================================
  // TRANSICIONES ENTRE LAS 3 SECCIONES Y LAS 2 ZONAS
  // =========================================================================
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

  rectsOverlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  // =========================================================================
  // RENDERIZADO ESTILO BLASPHEMOUS (GÓTICO PIXELADO 2D)
  // =========================================================================
  render() {
    const ctx = this.ctx;

    ctx.fillStyle = this.zone === 1 ? '#120a07' : '#0b0914';
    ctx.fillRect(0, 0, this.width, this.height);

    this.drawGothicBackground(ctx);
    this.drawPlatformsAndLadders(ctx);

    if (this.section === 1) {
      this.drawShrine(ctx);
      if (this.zone === 1) {
        this.drawZone1TutorialTablets(ctx);
      }
    }

    this.drawPlayer(ctx);
    this.drawEnemies(ctx);
    this.drawBoss(ctx);

    for (const proj of this.projectiles) {
      ctx.fillStyle = proj.color;
      ctx.beginPath();
      ctx.arc(proj.x, proj.y, proj.r, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const pt of this.particles) {
      ctx.fillStyle = pt.color;
      ctx.fillRect(pt.x, pt.y, 4, 4);
    }

    this.drawHUD(ctx);
  }

  drawGothicBackground(ctx) {
    ctx.strokeStyle = this.zone === 1 ? '#291811' : '#1e1b2e';
    ctx.lineWidth = 4;
    for (let x = 80; x < this.width; x += 160) {
      ctx.beginPath();
      ctx.moveTo(x - 50, this.groundY);
      ctx.lineTo(x - 50, 140);
      ctx.quadraticCurveTo(x, 60, x + 50, 140);
      ctx.lineTo(x + 50, this.groundY);
      ctx.stroke();
    }

    ctx.fillStyle = this.zone === 1 ? '#27170e' : '#181326';
    ctx.fillRect(0, this.groundY, this.width, this.height - this.groundY);
    ctx.fillStyle = this.zone === 1 ? '#78350f' : '#4c1d95';
    ctx.fillRect(0, this.groundY, this.width, 4);

    const roomCombatActive = this.enemies.length > 0 || this.boss !== null;
    if (!roomCombatActive && !(this.zone === 2 && this.section === 3)) {
      ctx.fillStyle = '#fbbf24';
      ctx.font = '18px VT323, monospace';
      ctx.fillText('AVANZAR ➔', this.width - 95, this.groundY - 15);
    }
  }

  drawPlatformsAndLadders(ctx) {
    ctx.strokeStyle = '#57534e';
    ctx.lineWidth = 3;
    for (const l of this.ladders) {
      for (let y = l.y; y < l.y + l.h; y += 12) {
        ctx.strokeRect(l.x + 8, y, 10, 8);
      }
    }

    for (const plat of this.platforms) {
      ctx.fillStyle = '#44403c';
      ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
      ctx.strokeStyle = '#a8a29e';
      ctx.lineWidth = 1;
      ctx.strokeRect(plat.x, plat.y, plat.w, plat.h);
    }
  }

  drawShrine(ctx) {
    if (!this.shrine) return;
    const s = this.shrine;
    const near = this.isNearAltar();

    if (near) {
      ctx.fillStyle = 'rgba(250, 204, 21, 0.14)';
      ctx.beginPath();
      ctx.arc(s.x + s.w / 2, s.y + 38, 48, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = '#78350f';
    ctx.fillRect(s.x + 10, s.y + 28, 28, 50);
    ctx.fillStyle = near ? '#fbbf24' : '#d97706';
    ctx.fillRect(s.x + 4, s.y + 24, 40, 6);
    ctx.fillRect(s.x + 20, s.y, 8, 38);
    ctx.fillRect(s.x + 12, s.y + 10, 24, 6);

    ctx.fillStyle = '#ef4444';
    ctx.fillRect(s.x + 6, s.y + 16, 5, 8);
    ctx.fillRect(s.x + 37, s.y + 16, 5, 8);
    ctx.fillStyle = '#fde047';
    ctx.fillRect(s.x + 7, s.y + 11, 3, 5);
    ctx.fillRect(s.x + 38, s.y + 11, 3, 5);

    ctx.fillStyle = near ? '#facc15' : '#fde68a';
    ctx.font = '16px VT323, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(
      near ? '▶ [E / BOTÓN VIAL] RECARGAR 3 VIALES Y VIDA ◀' : '[E / VIAL] ALTAR: RECARGAR VIALES',
      s.x + s.w / 2,
      s.y - 12
    );
    ctx.textAlign = 'left';
  }

  drawZone1TutorialTablets(ctx) {
    const cards = [
      {
        x: 45,
        title: 'I. MOVIMIENTO (4 DIRECCIONES)',
        line1: '[A / D] o Cruceta: Moverse',
        line2: '[W / ▲] Saltar y Subir cadenas',
        line3: '[S / ▼] Agacharse y Bajar'
      },
      {
        x: 285,
        title: 'II. ESQUIVA Y ESPADA',
        line1: '[SPACE / ESQUIVA] Paso sombrío',
        line2: '[Z / ESPADA] Atacar con acero',
        line3: '(Combina con ▲ o ▼ en el aire)'
      },
      {
        x: 525,
        title: 'III. 3 VIALES Y ALTAR',
        line1: '[Q / VIAL] Beber Vial (+45% HP)',
        line2: '[E / VIAL] En el Altar: Recarga',
        line3: 'los 3 Viales y restaura salud'
      }
    ];

    cards.forEach(c => {
      ctx.fillStyle = 'rgba(24, 15, 10, 0.88)';
      ctx.fillRect(c.x, 68, 225, 88);
      ctx.strokeStyle = '#b45309';
      ctx.lineWidth = 2;
      ctx.strokeRect(c.x, 68, 225, 88);

      ctx.fillStyle = '#fbbf24';
      ctx.font = '16px VT323, monospace';
      ctx.fillText(c.title, c.x + 10, 88);

      ctx.fillStyle = '#e7e5e4';
      ctx.font = '15px VT323, monospace';
      ctx.fillText(c.line1, c.x + 10, 108);
      ctx.fillText(c.line2, c.x + 10, 126);
      ctx.fillText(c.line3, c.x + 10, 144);
    });
  }

  // =========================================================================
  // DIBUJO DEL PROTAGONISTA: PAPA CON ARMADURA VICTORIANA Y ESPADA
  // =========================================================================
  drawPlayer(ctx) {
    const p = this.player;

    for (const img of p.afterimages) {
      ctx.save();
      ctx.globalAlpha = img.alpha * 0.5;
      ctx.fillStyle = '#7f1d1d';
      ctx.fillRect(img.x, img.y, p.w, p.h);
      ctx.restore();
    }

    if (p.invulnTimer > 0 && Math.floor(p.invulnTimer * 20) % 2 === 0 && !p.isDodging) {
      return;
    }

    ctx.save();
    const cx = p.x + p.w / 2;
    const cy = p.y + (p.crouching ? 8 : 0);

    if (p.healEffectTimer > 0) {
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy + 18, 24 + Math.sin(performance.now() * 0.03) * 4, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 1. Capa Victoriana Carmesí Oscura
    ctx.fillStyle = '#7f1d1d';
    ctx.beginPath();
    ctx.moveTo(cx - p.facing * 4, cy + 10);
    ctx.lineTo(cx - p.facing * 20, cy + 36);
    ctx.lineTo(cx - p.facing * 6, cy + 36);
    ctx.closePath();
    ctx.fill();

    // 2. Cuerpo de Papa
    ctx.fillStyle = '#b48343';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 20, 14, p.crouching ? 14 : 18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#5c3a18';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#784f24';
    ctx.fillRect(cx - 6, cy + 24, 3, 2);
    ctx.fillRect(cx + 4, cy + 16, 2, 2);

    // 3. Armadura Victoriana
    ctx.fillStyle = '#52525b';
    ctx.fillRect(cx - 11, cy + 14, 22, 12);
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(cx - 11, cy + 14, 22, 12);

    ctx.fillStyle = '#71717a';
    ctx.beginPath();
    ctx.arc(cx - p.facing * 6, cy + 15, 7, Math.PI, 0);
    ctx.fill();
    ctx.strokeStyle = '#fbbf24';
    ctx.stroke();

    // Yelmo / Capirote Victoriano
    ctx.fillStyle = '#3f3f46';
    ctx.beginPath();
    ctx.moveTo(cx - 11, cy + 8);
    ctx.lineTo(cx, cy - 12);
    ctx.lineTo(cx + 11, cy + 8);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#d4d4d8';
    ctx.stroke();

    ctx.fillStyle = '#fef08a';
    ctx.fillRect(cx + (p.facing === 1 ? 1 : -7), cy + 5, 6, 3);

    // 4. Espada Victoriana
    if (p.isAttacking) {
      const hb = this.getSwordHitbox();
      ctx.fillStyle = 'rgba(251, 191, 36, 0.35)';
      ctx.fillRect(hb.x, hb.y, hb.w, hb.h);
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 3;
      ctx.strokeRect(hb.x + 2, hb.y + 2, hb.w - 4, hb.h - 4);

      ctx.fillStyle = '#e4e4e7';
      if (p.attackDir === 'up') {
        ctx.fillRect(cx - 3, p.y - 38, 6, 38);
      } else if (p.attackDir === 'down') {
        ctx.fillRect(cx - 3, p.y + p.h, 6, 38);
      } else {
        ctx.fillRect(p.facing === 1 ? cx + 8 : cx - 50, cy + 16, 42, 6);
        ctx.fillStyle = '#facc15';
        ctx.fillRect(p.facing === 1 ? cx + 8 : cx - 12, cy + 10, 4, 18);
      }
    } else {
      ctx.fillStyle = '#d4d4d8';
      ctx.fillRect(cx + p.facing * 10, cy + 4, 4, 24);
      ctx.fillStyle = '#facc15';
      ctx.fillRect(cx + p.facing * 6, cy + 20, 12, 3);
    }

    ctx.restore();
  }

  drawEnemies(ctx) {
    for (const e of this.enemies) {
      if (e.type === 'worm') {
        if (e.state === 'burrow') continue;
        ctx.fillStyle = e.hurtTimer > 0 ? '#ffffff' : '#d6d3d1';
        for (let s = 0; s < 4; s++) {
          const sx = e.x + s * 9;
          const sy = e.y + Math.sin(performance.now() * 0.01 + s) * 3;
          ctx.beginPath();
          ctx.arc(sx + 6, sy + 11, 8, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = '#7f1d1d';
        ctx.fillRect(e.vx > 0 ? e.x + e.w - 4 : e.x, e.y + 8, 5, 8);
      } else if (e.type === 'moth') {
        const cx = e.x + e.w / 2;
        const cy = e.y + e.h / 2;
        const wingY = Math.sin(e.wingPhase) * 12;

        ctx.fillStyle = e.hurtTimer > 0 ? '#ffffff' : '#78716c';
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx - 18, cy - wingY);
        ctx.lineTo(cx - 12, cy + 10);
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + 18, cy - wingY);
        ctx.lineTo(cx + 12, cy + 10);
        ctx.fill();

        ctx.fillStyle = '#44403c';
        ctx.fillRect(cx - 4, cy - 8, 8, 16);
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(cx - 3, cy - 6, 2, 2);
        ctx.fillRect(cx + 1, cy - 6, 2, 2);
      }
    }
  }

  drawBoss(ctx) {
    if (!this.boss) return;
    const b = this.boss;

    if (b.type === 'entwined_worms') {
      for (let i = 0; i < b.segmentsCount; i++) {
        const sA = b.wormA[i];
        const sB = b.wormB[i];
        if (!sA || !sB) continue;

        ctx.fillStyle = b.hurtTimer > 0 ? '#ffffff' : '#e7e5e4';
        ctx.beginPath();
        ctx.arc(sA.x + 14, sA.y + 14, i === 0 ? 16 : 13, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#57534e';
        ctx.stroke();

        ctx.fillStyle = b.hurtTimer > 0 ? '#ffffff' : '#991b1b';
        ctx.beginPath();
        ctx.arc(sB.x + 14, sB.y + 14, i === 0 ? 16 : 13, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#f87171';
        ctx.stroke();
      }
    } else if (b.type === 'final_moth') {
      const cx = b.x + b.w / 2;
      const cy = b.y + b.h / 2;
      const flap = Math.sin(b.wingAngle) * 26;

      ctx.fillStyle = b.hurtTimer > 0 ? '#ffffff' : '#57534e';
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx - 48, cy - 18 + flap);
      ctx.lineTo(cx - 38, cy + 24);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + 48, cy - 18 + flap);
      ctx.lineTo(cx + 38, cy + 24);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#292524';
      ctx.beginPath();
      ctx.ellipse(cx, cy, 12, 24, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ef4444';
      ctx.fillRect(cx - 6, cy - 16, 4, 4);
      ctx.fillRect(cx + 2, cy - 16, 4, 4);
    }
  }

  drawHUD(ctx) {
    const p = this.player;

    // Panel superior izquierdo limpio (Solo barras y los 3 Viales gráficos)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.78)';
    ctx.fillRect(14, 10, 256, 38);
    ctx.strokeStyle = '#a16207';
    ctx.lineWidth = 2;
    ctx.strokeRect(14, 10, 256, 38);

    // Barra de Vida (sin texto numérico encima)
    ctx.fillStyle = '#450a0a';
    ctx.fillRect(22, 17, 155, 12);
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(22, 17, (p.hp / p.maxHp) * 155, 12);
    ctx.strokeStyle = '#fca5a5';
    ctx.lineWidth = 1;
    ctx.strokeRect(22, 17, 155, 12);

    // Barra de Estamina
    ctx.fillStyle = '#1c1917';
    ctx.fillRect(22, 34, 125, 6);
    ctx.fillStyle = '#eab308';
    ctx.fillRect(22, 34, (p.stamina / p.maxStamina) * 125, 6);

    // Dibujo de los 3 Viales estilo Blasphemous
    for (let i = 0; i < p.maxVials; i++) {
      const vx = 188 + i * 24;
      const vy = 16;
      const isFull = i < p.vials;

      // Tapón dorado y cuello del vial
      ctx.fillStyle = isFull ? '#facc15' : '#57534e';
      ctx.fillRect(vx + 5, vy, 6, 4);
      ctx.fillStyle = '#a8a29e';
      ctx.fillRect(vx + 4, vy + 4, 8, 4);

      // Cuerpo del vial
      ctx.fillStyle = isFull ? '#dc2626' : '#1c1917';
      ctx.fillRect(vx + 1, vy + 8, 14, 18);

      // Brillo del cristal
      if (isFull) {
        ctx.fillStyle = '#fca5a5';
        ctx.fillRect(vx + 3, vy + 10, 3, 6);
      }

      ctx.strokeStyle = isFull ? '#fde047' : '#57534e';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(vx + 1, vy + 8, 14, 18);
    }

    // Indicador de Zona y Sección arriba a la derecha
    ctx.fillStyle = '#fbbf24';
    ctx.font = '18px VT323, monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`ZONA ${this.zone} - SECCIÓN ${this.section}/3`, this.width - 18, 30);
    ctx.textAlign = 'left';

    // Barra de Vida del Jefe
    if (this.boss) {
      const b = this.boss;
      const barW = 460;
      const barX = (this.width - barW) / 2;
      const barY = this.height - 42;

      ctx.fillStyle = '#fde68a';
      ctx.font = '18px VT323, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(b.name, this.width / 2, barY - 6);
      ctx.textAlign = 'left';

      ctx.fillStyle = '#1c1917';
      ctx.fillRect(barX, barY, barW, 14);
      ctx.fillStyle = '#b91c1c';
      ctx.fillRect(barX, barY, Math.max(0, (b.hp / b.maxHp) * barW), 14);
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 2;
      ctx.strokeRect(barX, barY, barW, 14);
    }

    // Banner de anuncio estilo Blasphemous
    if (this.bannerTimer > 0) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.78)';
      ctx.fillRect(0, 175, this.width, 54);
      ctx.strokeStyle = '#b45309';
      ctx.beginPath();
      ctx.moveTo(0, 175); ctx.lineTo(this.width, 175);
      ctx.moveTo(0, 229); ctx.lineTo(this.width, 229);
      ctx.stroke();

      ctx.fillStyle = '#facc15';
      ctx.font = '26px VT323, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(this.bannerText, this.width / 2, 209);
      ctx.textAlign = 'left';
    }

    // Pantalla de Muerte
    if (this.isGameOver) {
      ctx.fillStyle = 'rgba(15, 5, 5, 0.88)';
      ctx.fillRect(0, 0, this.width, this.height);
      ctx.fillStyle = '#dc2626';
      ctx.font = '48px VT323, monospace';
      ctx.textAlign = 'center';
      ctx.fillText('TUBÉRCULO MARCHITO', this.width / 2, this.height / 2 - 10);
      ctx.fillStyle = '#e7e5e4';
      ctx.font = '22px VT323, monospace';
      ctx.fillText('Presiona [ R / ESPACIO ] o TOCA LA PANTALLA para renacer en el Altar', this.width / 2, this.height / 2 + 30);
      ctx.textAlign = 'left';
    }
  }
}