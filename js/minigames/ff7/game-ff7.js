import { FF7BattleScene } from './ff7-scene.js';
import { FF7CombatEngine, SPELLS_DB } from './ff7-combat.js';
import { FF7Audio } from './ff7-audio.js';

export class FF7Minigame {
  constructor(stageContainer, onWinCallback, onExitCallback) {
    this.container = stageContainer;
    this.onWin = onWinCallback;
    this.onExit = onExitCallback;

    this.combat = new FF7CombatEngine();
    this.audio = new FF7Audio();
    this.battleScene = null;

    // Estados del menú interactivo para el personaje activo
    this.activeHero = null;       // Héroe cuyo menú está abierto ahora
    this.menuState = 'CLOSED';    // 'CLOSED' | 'MAIN' | 'MAGIC' | 'ITEM' | 'TARGET'
    this.cursorIndex = 0;
    this.currentOptions = [];
    this.pendingAction = null;    // Guarda qué acción se eligió antes de escoger objetivo
    this.isExecutingAction = false;

    this.pendingAction = null;
    this.isExecutingAction = false;

    this.readyHeroesQueue = [];
    this.actionQueue = [];

    this.audio.playBGM();

    this.renderLayout();
    this.init3D();
    this.bindControls();
    this.startATBLoop();
  }

  // Cursor clásico de FF7 (Mano enguantada blanca apuntando a la derecha)
  getGloveCursorHTML() {
    return `<span class="inline-block w-5 text-white drop-shadow-[2px_2px_0_#000] select-none mr-1">☞</span>`;
  }

  renderLayout() {
    this.container.innerHTML = `
      <div class="w-full h-full flex flex-col bg-black select-none overflow-hidden relative">
        
        <!-- BANNER SUPERIOR DE MENSAJES DE BATALLA (Como el cuadro superior de magia/ataques en FF7) -->
        <div id="ff7-top-banner" class="hidden absolute top-3 left-1/2 -translate-x-1/2 z-30 ff7-hud-box px-6 py-1.5 text-xl md:text-3xl text-white text-center min-w-[280px]">
        </div>

        <!-- PARTE SUPERIOR (68%): Escena 3D + Números de Daño Flotantes -->
        <div class="relative w-full h-[68%] bg-black overflow-hidden">
          <canvas id="ff7-battle-canvas" class="w-full h-full block" style="image-rendering: pixelated;"></canvas>
          
          <!-- Capa para mostrar los números de daño/curación sobre los personajes -->
          <div id="ff7-damage-layer" class="pointer-events-none absolute inset-0 z-20 overflow-hidden"></div>

          <!-- NUEVO: Cursor Sprite 2D que flota encima de los modelos 3D al elegir objetivo -->
          <div id="ff7-3d-target-cursor" class="hidden pointer-events-none absolute z-30 -translate-x-1/2 -translate-y-1/2 transition-all duration-75">
            <span class="inline-block text-4xl md:text-5xl text-white drop-shadow-[3px_3px_0_#000] rotate-90 animate-bounce">☞</span>
          </div>

          <!-- Guía rápida de teclado/mouse arriba a la derecha -->
          <div class="absolute top-2 right-2 flex items-center gap-2 z-20">
            <span class="ff7-hud-box px-2 py-0.5 text-xs md:text-base text-cyan-200 hidden sm:inline">
              [↑↓] Mover | [Enter/Clic] OK | [Backspace/Esc] Atrás
            </span>
            <button id="ff7-btn-win-test" class="ff7-hud-box px-2 py-0.5 text-xs md:text-lg text-green-300 hover:text-white">
              [ ★ GANAR TEST ]
            </button>
          </div>
        </div>

        <!-- PARTE INFERIOR (32%): HUD Original de Final Fantasy VII + Caja de Comandos Superpuesta -->
        <div class="w-full h-[32%] grid grid-cols-12 bg-black relative">
          
          <!-- CAJA DE COMANDOS DE FF7 (Se superpone entre el panel izquierdo y derecho cuando un héroe tiene turno) -->
          <div id="ff7-command-window" class="hidden absolute left-[28%] sm:left-[32%] bottom-1 z-30 w-44 sm:w-52 h-[96%] ff7-hud-box px-3 py-1.5 flex flex-col justify-between">
          </div>

          <!-- SUBMENÚ DESPLEGABLE (Para lista de Magias, Ítems o Selección de Objetivo) -->
          <div id="ff7-sub-window" class="hidden absolute left-[48%] sm:left-[50%] bottom-1 z-40 w-64 sm:w-80 h-[96%] ff7-hud-box px-3 py-1.5 flex flex-col justify-between">
          </div>

          <!-- PANEL IZQUIERDO: NAME & BARRIER (5 columnas) -->
          <div class="col-span-5 ff7-hud-box px-2 md:px-4 py-1 flex flex-col justify-between">
            <div class="flex justify-between items-center text-xs sm:text-base md:text-xl leading-none ff7-label">
              <span>NAME</span>
              <span class="hidden sm:inline pr-2">BARRIER</span>
            </div>
            <div id="ff7-heroes-names" class="flex-1 flex flex-col justify-around"></div>
          </div>

          <!-- PANEL DERECHO: HP / MP / LIMIT / TIME (7 columnas) -->
          <div class="col-span-7 ff7-hud-box px-2 md:px-4 py-1 flex flex-col justify-between">
            <div class="grid grid-cols-12 items-center text-xs sm:text-base md:text-xl leading-none ff7-label">
              <span class="col-span-5">HP</span>
              <span class="col-span-2">MP</span>
              <span class="col-span-2 hidden md:inline text-center">LIMIT</span>
              <span class="col-span-5 md:col-span-3 text-center">TIME</span>
            </div>
            <div id="ff7-heroes-stats" class="flex-1 flex flex-col justify-around"></div>
          </div>

        </div>
      </div>
    `;

    document.getElementById('ff7-btn-win-test').addEventListener('click', () => {
      this.finishBattle(true);
    });

    this.updateHUD();
  }

  // Dibuja los nombres, barras de BARRIER/MBARRIER, HP, MP, LIMIT y TIME en tiempo real
  updateHUD() {
    const namesContainer = document.getElementById('ff7-heroes-names');
    const statsContainer = document.getElementById('ff7-heroes-stats');
    if (!namesContainer || !statsContainer) return;

    namesContainer.innerHTML = this.combat.heroes.map((h) => {
      const isTurn = this.activeHero && this.activeHero.id === h.id;
      const nameColor = !h.alive ? 'text-red-500' : (isTurn ? 'text-yellow-300' : 'text-white');
      const barPct = Math.min(100, (h.barrier / 100) * 100);
      const mbarPct = Math.min(100, (h.mbarrier / 100) * 100);

      return `
        <div class="flex justify-between items-center">
          <span class="text-xl sm:text-3xl md:text-4xl leading-none ${nameColor}">
            ${h.name} ${h.defending ? '<small class="text-xs text-cyan-300">[DEF]</small>' : ''}
          </span>
          <div class="hidden sm:flex flex-col gap-1 w-20 md:w-28 bg-zinc-700 p-1 border-2 border-zinc-400">
            <div class="ff7-slot h-2 md:h-2.5 w-full"><div class="h-full bg-orange-400" style="width:${barPct}%"></div></div>
            <div class="ff7-slot h-2 md:h-2.5 w-full"><div class="h-full bg-green-400" style="width:${mbarPct}%"></div></div>
          </div>
        </div>
      `;
    }).join('');

    statsContainer.innerHTML = this.combat.heroes.map((h) => {
      const hpPct = Math.round((h.hp / h.maxHp) * 100);
      const mpPct = Math.round((h.mp / h.maxMp) * 100);
      const limitFull = h.limit >= 100;
      const atbFull = h.atb >= 100;

      return `
        <div class="grid grid-cols-12 items-center gap-1 md:gap-3">
          <div class="col-span-5 flex flex-col justify-center">
            <span class="text-lg sm:text-3xl md:text-4xl leading-none tracking-tight ${h.hp < h.maxHp * 0.25 ? 'text-yellow-300' : 'text-white'}">
              ${h.hp}/${h.maxHp}
            </span>
            <div class="h-1 bg-gradient-to-r from-blue-500 via-cyan-300 to-white mt-0.5" style="width:${hpPct}%"></div>
          </div>
          <div class="col-span-2 flex flex-col justify-center">
            <span class="text-lg sm:text-3xl md:text-4xl leading-none">${h.mp}</span>
            <div class="h-1 bg-gradient-to-r from-emerald-500 via-green-300 to-white mt-0.5" style="width:${mpPct}%"></div>
          </div>
          <div class="col-span-2 hidden md:block bg-zinc-700 p-1 border-2 border-zinc-400">
            <div class="ff7-slot h-3.5 md:h-4 w-full">
              <div class="h-full ${limitFull ? 'bg-gradient-to-r from-red-400 via-yellow-300 to-cyan-300 animate-pulse' : 'bg-gradient-to-b from-pink-200 to-pink-500'}" style="width:${h.limit}%"></div>
            </div>
          </div>
          <div class="col-span-5 md:col-span-3 bg-zinc-700 p-1 border-2 border-zinc-400">
            <div class="ff7-slot h-3.5 md:h-4 w-full">
              <div class="h-full ${atbFull ? 'bg-yellow-200' : 'bg-gradient-to-b from-yellow-100 via-yellow-300 to-amber-500'}" style="width:${h.atb}%"></div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  // =========================================================================
  // SISTEMA DE TURNOS CON BARRA ATB Y COLAS DE ESPERA
  // =========================================================================
 startATBLoop() {
    this.isDisposed = false;
    if (!this.activeHero && this.readyHeroesQueue.length > 0) {
        this.activeHero = this.readyHeroesQueue.shift();
        this.activeHero.defending = false;
        this.battleScene.setHeroDefending(this.combat.heroes.indexOf(this.activeHero), false); // <-- NUEVO
        this.openMainMenu();
      }
    this.atbInterval = setInterval(() => {
      if (!this.battleScene || !this.battleScene.isRunning || this.isDisposed) return;

      // 1. Verificar victoria o derrota
      if (this.combat.enemies.every(e => !e.alive)) {
        this.finishBattle(true);
        return;
      }
      if (this.combat.heroes.every(h => !h.alive)) {
        this.showBanner('¡EL EQUIPO FUE FRITO! REINICIANDO...', 2500);
        setTimeout(() => this.finishBattle(false), 2500);
        return;
      }

      // 2. PAUSAR EL LLENADO DE BARRAS MIENTRAS OCURRE UNA ACCIÓN EN PANTALLA (Igual que en FF7)
      if (!this.isExecutingAction) {
        // Avanzar barras ATB de Héroes (A velocidad táctica y pausada)
        this.combat.heroes.forEach((h) => {
          if (!h.alive) return;
          if (h.barrier > 0) h.barrier = Math.max(0, h.barrier - 0.04);
          if (h.mbarrier > 0) h.mbarrier = Math.max(0, h.mbarrier - 0.04);

          if (h.atb < 100) {
            h.atb = Math.min(100, h.atb + h.speed * 0.010);
            if (h.atb >= 100 && !this.readyHeroesQueue.includes(h) && this.activeHero !== h) {
              this.readyHeroesQueue.push(h);
            }
          }
        });

        // Avanzar barras ATB de Enemigos
        this.combat.enemies.forEach((e) => {
          if (!e.alive) return;
          if (e.atb < 100) {
            e.atb = Math.min(100, e.atb + e.speed * 0.007);
            if (e.atb >= 100) {
              e.atb = 0;
              this.enqueueEnemyAttack(e);
            }
          }
        });
      }

      // 3. Si ningún héroe tiene el menú abierto y hay alguien en la cola, abrir su menú
      if (!this.activeHero && this.readyHeroesQueue.length > 0) {
        this.activeHero = this.readyHeroesQueue.shift();
        this.activeHero.defending = false;
        this.openMainMenu();
      }

      // 4. Procesar la siguiente acción en la cola si el escenario está libre
      if (!this.isExecutingAction && this.actionQueue.length > 0) {
        const nextAction = this.actionQueue.shift();
        this.executeAction(nextAction);
      }

      // 5. Actualizar posición del cursor 3D si estamos eligiendo objetivo
      if (this.menuState === 'TARGET') {
        this.update3DTargetCursorPosition();
      }

      this.updateHUD();
    }, 100);
  }

// =========================================================================
// COLA DE EJECUCIÓN DE ACCIONES
// =========================================================================
  enqueuePlayerAction(actionObj) {
    this.activeHero.atb = 0;
    this.activeHero = null;
    this.menuState = 'CLOSED';
    this.renderMenuWindow();
    this.actionQueue.push(actionObj);
    this.updateHUD();
  }

  enqueueEnemyAttack(enemy) {
    const aliveHeroes = this.combat.heroes.filter(h => h.alive);
    if (aliveHeroes.length === 0) return;
    const randomHero = aliveHeroes[Math.floor(Math.random() * aliveHeroes.length)];

    const isOilMagic = enemy.id === 'oil' && Math.random() < 0.5;
    this.actionQueue.push({
      type: 'enemy_attack',
      actor: enemy,
      target: randomHero,
      isMagic: isOilMagic,
      element: isOilMagic ? 'fire' : null,
      attackName: isOilMagic ? 'Salpicadura Hirviendo (Fuego)' : 'Golpe Utensilio'
    });
  }

  executeAction(action) {
    if (!action.actor.alive) return;

    if (!action.target.alive) {
      const pool = this.combat.enemies.includes(action.target)
        ? this.combat.enemies.filter(e => e.alive)
        : this.combat.heroes.filter(h => h.alive);
      if (pool.length === 0) return;
      action.target = pool[0];
    }

    this.isExecutingAction = true;

    if (action.type === 'defend') {
      action.actor.defending = true;
      this.showBanner(`${action.actor.name} se protege (Daño x0.5)`, 1100);

    } else if (action.type === 'attack') {
      const res = this.combat.calculateDamage(action.actor, action.target, { isMagic: false, power: 16 });
      this.combat.applyEffect(action.target, res);
      this.showBanner(`${action.actor.name} ataca a ${action.target.name}`, 1200);
      this.spawnFloatingNumber(action.target, res);
      this.checkEnemyDeath(action.target);

    } else if (action.type === 'magic') {
      const sp = action.spell;
      action.actor.mp = Math.max(0, action.actor.mp - sp.mp);
      this.audio.playSFX('magic');
      this.showBanner(`${action.actor.name} lanza ${sp.name}`, 1300);

      if (sp.type === 'buff') {
        if (sp.buff === 'barrier') action.target.barrier = 100;
        if (sp.buff === 'mbarrier') action.target.mbarrier = 100;
        this.spawnFloatingText(action.target, sp.buff.toUpperCase(), 'text-cyan-300');
      } else {
        const res = this.combat.calculateDamage(action.actor, action.target, {
          isMagic: true,
          power: sp.power,
          element: sp.element,
          isCure: sp.type === 'cure'
        });
        this.combat.applyEffect(action.target, res);
        this.spawnFloatingNumber(action.target, res);
        this.checkEnemyDeath(action.target);
      }

    } else if (action.type === 'item') {
      const item = this.combat.items[action.itemIndex];
      if (item && item.count > 0) {
        item.count--;
        this.audio.playSFX('magic');
        this.showBanner(`${action.actor.name} usa ${item.name}`, 1200);
        if (item.healHp) {
          action.target.hp = Math.min(action.target.maxHp, action.target.hp + item.healHp);
          this.spawnFloatingText(action.target, `+${item.healHp} HP`, 'text-green-400');
        }
        if (item.healMp) {
          action.target.mp = Math.min(action.target.maxMp, action.target.mp + item.healMp);
          this.spawnFloatingText(action.target, `+${item.healMp} MP`, 'text-emerald-300');
        }
      }

    } else if (action.type === 'enemy_attack') {
      const res = this.combat.calculateDamage(action.actor, action.target, {
        isMagic: action.isMagic,
        power: 18,
        element: action.element
      });
      this.combat.applyEffect(action.target, res);
      this.showBanner(`${action.actor.name}: ${action.attackName}`, 1200);
      this.spawnFloatingNumber(action.target, res);
    }

    this.updateHUD();

    // Tiempo que dura la pausa de acción antes de que las barras ATB vuelvan a avanzar
    setTimeout(() => {
      this.isExecutingAction = false;
    }, 1350);
  }

  // =========================================================================
  // MENÚS DE COMANDO CON EL GUANTE BLANCO Y SONIDOS
  // =========================================================================
  openMainMenu() {
    this.menuState = 'MAIN';
    this.cursorIndex = 0;
    const limitReady = this.activeHero.limit >= 100;

    // El slot de LIMIT ocupa siempre el 2do espacio (invisible si no está lleno, arcoíris si está al 100%)
    this.currentOptions = [
      { id: 'attack', label: 'Atacar', enabled: true },
      {
        id: 'limit',
        label: limitReady ? '<span class="ff7-limit-ready">LIMIT</span>' : '&nbsp;',
        enabled: limitReady,
        isLimitSlot: true
      },
      { id: 'magic',  label: 'Magia',      enabled: true },
      { id: 'defend', label: 'Protegerse', enabled: true },
      { id: 'item',   label: 'Items',      enabled: true }
    ];

    document.getElementById('ff7-sub-window').classList.add('hidden');
    this.renderMenuWindow();
  }

  update3DTargetCursorPosition() {
    const cursor3D = document.getElementById('ff7-3d-target-cursor');
    const selected = this.currentOptions[this.cursorIndex];
    if (!cursor3D || !selected || !this.battleScene) return;

    const screenPos = this.battleScene.getUnitScreenPosition(selected.isEnemy, selected.unitIndex);
    cursor3D.style.left = `${screenPos.x}%`;
    cursor3D.style.top = `${screenPos.y}%`;
  }

  renderMenuWindow() {
    const cmdWin = document.getElementById('ff7-command-window');
    const subWin = document.getElementById('ff7-sub-window');
    const cursor3D = document.getElementById('ff7-3d-target-cursor');
    if (!cmdWin || !subWin || !cursor3D) return;

    if (this.menuState === 'CLOSED') {
      cmdWin.classList.add('hidden');
      subWin.classList.add('hidden');
      cursor3D.classList.add('hidden');
      return;
    }

    cmdWin.classList.remove('hidden');

    // Si estamos seleccionando objetivo en el escenario 3D, ocultamos el submenú de texto y mostramos el guante en el campo 3D
    if (this.menuState === 'TARGET') {
      subWin.classList.add('hidden');
      cursor3D.classList.remove('hidden');
      this.update3DTargetCursorPosition();
      return;
    }

    cursor3D.classList.add('hidden');

    if (this.menuState === 'MAIN') {
      subWin.classList.add('hidden');
      cmdWin.innerHTML = this.currentOptions.map((opt, idx) => `
        <div data-idx="${idx}" class="ff7-menu-opt flex items-center text-xl sm:text-2xl md:text-3xl leading-none cursor-pointer py-0.5">
          ${this.cursorIndex === idx ? this.getGloveCursorHTML() : '<span class="inline-block w-5 mr-1"></span>'}
          <span>${opt.label}</span>
        </div>
      `).join('');
    } else {
      // Solo para MAGIC e ITEM
      subWin.classList.remove('hidden');
      subWin.innerHTML = this.currentOptions.map((opt, idx) => `
        <div data-idx="${idx}" class="ff7-menu-opt flex justify-between items-center text-lg sm:text-2xl leading-none cursor-pointer py-0.5 ${!opt.enabled ? 'text-gray-400' : 'text-white'}">
          <div class="flex items-center">
            ${this.cursorIndex === idx ? this.getGloveCursorHTML() : '<span class="inline-block w-5 mr-1"></span>'}
            <span>${opt.label}</span>
          </div>
          ${opt.rightText ? `<span class="text-cyan-300 text-base sm:text-xl">${opt.rightText}</span>` : ''}
        </div>
      `).join('');
    }

    this.container.querySelectorAll('.ff7-menu-opt').forEach((el) => {
      el.addEventListener('click', () => {
        const idx = parseInt(el.getAttribute('data-idx'), 10);
        if (this.cursorIndex !== idx) {
          this.cursorIndex = idx;
          this.audio.playSFX('move');
          this.renderMenuWindow();
        } else {
          this.confirmSelection();
        }
      });
    });
  }

  confirmSelection() {
    const selected = this.currentOptions[this.cursorIndex];
    if (!selected) return;

    // Si intenta seleccionar LIMIT sin estar cargado (o magia sin MP), suena cursor-error
    if (!selected.enabled) {
      this.audio.playSFX('error');
      return;
    }

    if (this.menuState === 'MAIN') {
      if (selected.id === 'attack') {
        this.audio.playSFX('move');
        this.pendingAction = { type: 'attack', actor: this.activeHero };
        this.openTargetMenu('enemy');

      } else if (selected.id === 'limit') {
        this.audio.playSFX('move');
        this.pendingAction = { type: 'limit', actor: this.activeHero };
        this.openTargetMenu('enemy');

      } else if (selected.id === 'magic') {
        this.audio.playSFX('move');
        this.openMagicMenu();

      } else if (selected.id === 'defend') {
        this.audio.playSFX('move');
        this.enqueuePlayerAction({ type: 'defend', actor: this.activeHero, target: this.activeHero });

      } else if (selected.id === 'item') {
        this.audio.playSFX('move');
        this.openItemMenu();
      }

    } else if (this.menuState === 'MAGIC') {
      const spell = SPELLS_DB[selected.spellId];
      this.audio.playSFX('move');
      this.pendingAction = { type: 'magic', actor: this.activeHero, spell };

      // Las barreras solo son aplicables a sí mismo
      if (spell.target === 'self') {
        this.enqueuePlayerAction({ ...this.pendingAction, target: this.activeHero });
      } else {
        this.openTargetMenu(spell.target); // 'ally' para Cura, 'enemy' para Fuego/Hielo/Eléctrico
      }

    } else if (this.menuState === 'ITEM') {
      this.audio.playSFX('move');
      this.pendingAction = { type: 'item', actor: this.activeHero, itemIndex: selected.itemIndex };
      this.openTargetMenu('ally');

    } else if (this.menuState === 'TARGET') {
      this.audio.playSFX('move');
      if (this.pendingAction.type === 'limit' && this.activeHero.id === 'tifa') {
        this.openTifaSlotsMinigame(selected.targetRef);
      } else {
        this.enqueuePlayerAction({ ...this.pendingAction, target: selected.targetRef });
      }
    }nqueuePlayerAction({ ...this.pendingAction, target: selected.targetRef });
    
  }

  openMagicMenu() {
    this.menuState = 'MAGIC';
    this.cursorIndex = 0;
    this.currentOptions = this.activeHero.spells.map((spellKey) => {
      const sp = SPELLS_DB[spellKey];
      return {
        spellId: spellKey,
        label: sp.name,
        rightText: `${sp.mp} MP`,
        enabled: this.activeHero.mp >= sp.mp
      };
    });
    this.renderMenuWindow();
  }

  openItemMenu() {
    this.menuState = 'ITEM';
    this.cursorIndex = 0;
    this.currentOptions = this.combat.items.map((it, idx) => ({
      itemIndex: idx,
      label: it.name,
      rightText: `x${it.count}`,
      enabled: it.count > 0
    }));
    this.renderMenuWindow();
  }

  openTargetMenu(targetGroup) {
    this.menuState = 'TARGET';
    this.targetGroupType = targetGroup; // 'enemy' o 'ally'
    this.cursorIndex = 0;

    if (targetGroup === 'enemy') {
      this.currentOptions = this.combat.enemies
        .filter(e => e.alive)
        .map(e => ({ enabled: true, targetRef: e, isEnemy: true, unitIndex: e.index }));
    } else {
      this.currentOptions = this.combat.heroes
        .map((h, idx) => ({ enabled: h.alive, targetRef: h, isEnemy: false, unitIndex: idx }))
        .filter(opt => opt.enabled);
    }
    this.renderMenuWindow();
  }
  // Minijuego de 2 Slot Machines en el menú inferior para el Limit Break de Tifa
  openTifaSlotsMinigame(targetEnemy) {
    this.menuState = 'TIFA_SLOTS';
    const cursor3D = document.getElementById('ff7-3d-target-cursor');
    const subWin = document.getElementById('ff7-sub-window');
    if (cursor3D) cursor3D.classList.add('hidden');
    if (!subWin) return;

    // Cada slot tiene 1 MISS, 1 YEAH y el resto son HIT
    const reelStrip = ['HIT', 'HIT', 'YEAH!', 'HIT', 'HIT', 'MISS'];
    this.tifaSlots = {
      strip: reelStrip,
      idx1: 0,
      idx2: 2,
      stopped1: false,
      stopped2: false,
      target: targetEnemy
    };

    subWin.classList.remove('hidden');

    // Función auxiliar para obtener el ítem anterior, actual y siguiente del rodillo circular
    const getReelItems = (idx) => {
      const len = reelStrip.length;
      return [
        reelStrip[(idx - 1 + len) % len], // Arriba (pasado)
        reelStrip[idx],                   // Centro (actual)
        reelStrip[(idx + 1) % len]        // Abajo (próximo)
      ];
    };

    // Renderiza un rodillo estilo PS1 con fondo blanco y 3 valores visibles
    const renderReel = (items, isStopped) => {
      const colorFor = (val) => val === 'YEAH!' ? 'text-yellow-400' : (val === 'MISS' ? 'text-red-500' : 'text-emerald-500');
      
      return `
        <div class="flex-1 bg-gray-200 border-2 border-gray-400 h-[60px] sm:h-[76px] relative overflow-hidden flex flex-col justify-center items-center mx-2 rounded-sm shadow-inner">
          <!-- Sombra interior y franja central para indicar la selección -->
          <div class="absolute inset-0 shadow-[inset_0_4px_4px_rgba(0,0,0,0.3)] pointer-events-none z-10"></div>
          <div class="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1/3 bg-black/10 border-y border-black/20 pointer-events-none z-10"></div>
          
          <div class="flex flex-col items-center justify-center space-y-0.5 leading-none font-extrabold tracking-wider ${!isStopped ? 'opacity-90' : 'opacity-100'}">
             <div class="text-[10px] sm:text-xs opacity-40 drop-shadow-[1px_1px_0_#fff] ${colorFor(items[0])}">${items[0]}</div>
             <div class="text-lg sm:text-2xl z-20 drop-shadow-[1px_1px_0_#fff] ${colorFor(items[1])}">${items[1]}</div>
             <div class="text-[10px] sm:text-xs opacity-40 drop-shadow-[1px_1px_0_#fff] ${colorFor(items[2])}">${items[2]}</div>
          </div>
        </div>
      `;
    };

    const renderSlotsHTML = () => {
      const items1 = getReelItems(this.tifaSlots.idx1);
      const items2 = getReelItems(this.tifaSlots.idx2);

      subWin.innerHTML = `
        <div class="flex flex-col justify-between h-full py-0.5 select-none">
          <div class="text-xs sm:text-base ff7-label text-center border-b border-blue-400/30 pb-0.5">
            TIFA LIMIT SLOTS — [ENTER] PARAR
          </div>
          <div class="flex justify-center items-center my-auto px-6 py-1">
            ${renderReel(items1, this.tifaSlots.stopped1)}
            ${renderReel(items2, this.tifaSlots.stopped2)}
          </div>
          <div class="text-center text-xs sm:text-sm text-gray-300">
            ${!this.tifaSlots.stopped1 ? '▶ Parar Rodillo 1' : (!this.tifaSlots.stopped2 ? '▶ Parar Rodillo 2' : '¡LISTO!')}
          </div>
        </div>
      `;
    };

    renderSlotsHTML();

    // Girar los rodillos velozmente
    this.tifaSlotTimer = setInterval(() => {
      if (!this.tifaSlots.stopped1) {
        this.tifaSlots.idx1 = (this.tifaSlots.idx1 + 1) % reelStrip.length;
      }
      if (!this.tifaSlots.stopped2) {
        this.tifaSlots.idx2 = (this.tifaSlots.idx2 + 1) % reelStrip.length;
      }
      renderSlotsHTML();
    }, 85);

    subWin.onclick = () => this.stopNextTifaReel();
  }

  stopNextTifaReel() {
    if (this.menuState !== 'TIFA_SLOTS' || !this.tifaSlots) return;
    this.audio.playSFX('move');

    if (!this.tifaSlots.stopped1) {
      this.tifaSlots.stopped1 = true;
    } else if (!this.tifaSlots.stopped2) {
      this.tifaSlots.stopped2 = true;
      clearInterval(this.tifaSlotTimer);

      const r1 = this.tifaSlots.strip[this.tifaSlots.idx1];
      const r2 = this.tifaSlots.strip[this.tifaSlots.idx2];

      // Regla: Cualquier MISS falla el ataque; Dos YEAH! activan la versión poderosa; resto (HIT) activa versión normal
      let tifaMode = 'hit';
      if (r1 === 'MISS' || r2 === 'MISS') {
        tifaMode = 'miss';
      } else if (r1 === 'YEAH!' && r2 === 'YEAH!') {
        tifaMode = 'yeah';
      }

      setTimeout(() => {
        const subWin = document.getElementById('ff7-sub-window');
        if (subWin) subWin.onclick = null;
        this.enqueuePlayerAction({
          type: 'limit',
          actor: this.activeHero,
          target: this.tifaSlots.target,
          tifaMode
        });
      }, 450);
    }
  }

  goBackMenu() {
    if (this.menuState === 'MAGIC' || this.menuState === 'ITEM' || this.menuState === 'TARGET') {
      this.audio.playSFX('back');
      this.openMainMenu();
    }
  }

  bindControls() {
    this.keyHandler = (e) => {
      if (this.menuState === 'CLOSED' || this.isDisposed) return;

      if (e.key === 'ArrowDown' || e.key === 'ArrowRight' || e.key === 's' || e.key === 'd') {
        e.preventDefault();
        this.cursorIndex = (this.cursorIndex + 1) % this.currentOptions.length;
        this.audio.playSFX('move');
        this.renderMenuWindow();
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft' || e.key === 'w' || e.key === 'a') {
        e.preventDefault();
        this.cursorIndex = (this.cursorIndex - 1 + this.currentOptions.length) % this.currentOptions.length;
        this.audio.playSFX('move');
        this.renderMenuWindow();
      } else if (e.key === 'Enter' || e.key === ' ') {
        if (this.menuState === 'TIFA_SLOTS') { this.stopNextTifaReel(); return; }
        e.preventDefault();
        this.confirmSelection();
      } else if (e.key === 'Backspace' || e.key === 'Escape') {
        e.preventDefault();
        this.goBackMenu();
      }
    };

    window.addEventListener('keydown', this.keyHandler);

    // Soporte para elegir objetivo en 3D haciendo clic/toque sobre el modelo en pantalla (PC y Móvil)
    const canvas = document.getElementById('ff7-battle-canvas');
    if (canvas) {
      canvas.addEventListener('click', (e) => {
        if (this.menuState !== 'TARGET' || !this.battleScene) return;
        const rect = canvas.getBoundingClientRect();
        const clickX = ((e.clientX - rect.left) / rect.width) * 100;
        const clickY = ((e.clientY - rect.top) / rect.height) * 100;

        // Buscar cuál de los objetivos válidos está más cerca del toque/clic
        let closestIdx = 0;
        let minDist = Infinity;
        this.currentOptions.forEach((opt, idx) => {
          const pos = this.battleScene.getUnitScreenPosition(opt.isEnemy, opt.unitIndex);
          const dist = Math.hypot(pos.x - clickX, pos.y - clickY);
          if (dist < minDist) {
            minDist = dist;
            closestIdx = idx;
          }
        });

        if (this.cursorIndex !== closestIdx) {
          this.cursorIndex = closestIdx;
          this.audio.playSFX('move');
          this.update3DTargetCursorPosition();
        } else {
          this.confirmSelection();
        }
      });
    }
  }
  // =========================================================================
  // COLA DE EJECUCIÓN DE ACCIONES (Aliados y Enemigos esperan su turno)
  // =========================================================================
  enqueuePlayerAction(actionObj) {
    this.activeHero.atb = 0;
    this.activeHero = null;
    this.menuState = 'CLOSED';
    this.renderMenuWindow();
    this.actionQueue.push(actionObj);
    this.updateHUD();
  }

  enqueueEnemyAttack(enemy) {
    const aliveHeroes = this.combat.heroes.filter(h => h.alive);
    if (aliveHeroes.length === 0) return;
    const randomHero = aliveHeroes[Math.floor(Math.random() * aliveHeroes.length)];

    // Algunos enemigos usan ataque mágico elemental y otros físico
    const isOilMagic = enemy.id === 'oil' && Math.random() < 0.5;
    this.actionQueue.push({
      type: 'enemy_attack',
      actor: enemy,
      target: randomHero,
      isMagic: isOilMagic,
      element: isOilMagic ? 'fire' : null,
      attackName: isOilMagic ? 'Salpicadura Hirviendo (Fuego)' : 'Golpe Utensilio'
    });
  }

  executeAction(action) {
    if (!action.actor.alive) return;

    if (!action.target.alive) {
      const pool = this.combat.enemies.includes(action.target)
        ? this.combat.enemies.filter(e => e.alive)
        : this.combat.heroes.filter(h => h.alive);
      if (pool.length === 0) return;
      action.target = pool[0];
    }

    this.isExecutingAction = true;

    // 1. ATAQUE FÍSICO DE CLOUD, BARRET O TIFA (Con coreografía 3D y SFX sincronizados)
    if (action.type === 'attack') {
      const heroIdx = this.combat.heroes.indexOf(action.actor);
      const enemyIdx = action.target.index;
      const res = this.combat.calculateDamage(action.actor, action.target, { isMagic: false, power: 16 });

      this.showBanner(`${action.actor.name} ataca a ${action.target.name}`, 1400);

      this.battleScene.playPhysicalAttack(heroIdx, enemyIdx, {
        // Exclusivo para Barret: suena su metralleta al empezar a disparar
        onGunStart: () => {
          this.audio.playSFX('gatling');
        },
        // Se dispara cuando el golpe conecta (en Tifa suena en cada puñetazo y en el último aplica el daño)
        onImpact: (isFinalHit = true) => {
          this.audio.playSFX('hit');
          if (isFinalHit) {
            this.combat.applyEffect(action.target, res);
            this.spawnFloatingNumber(action.target, res);
            this.checkEnemyDeath(action.target);
            this.updateHUD();
          }
        },
        // Cuando termina el backstep y vuelve a su sitio, continúa el combate
        onComplete: () => {
          this.isExecutingAction = false;
        }
      });
      return;
    }

    // 2. ATAQUE DE ENEMIGO (Con embiste y SFX de golpe al impactar)
    if (action.type === 'enemy_attack') {
      const enemyIdx = action.actor.index;
      const heroIdx = this.combat.heroes.indexOf(action.target);
      const res = this.combat.calculateDamage(action.actor, action.target, {
        isMagic: action.isMagic,
        power: 18,
        element: action.element
      });

      this.showBanner(`${action.actor.name}: ${action.attackName}`, 1200);

      this.battleScene.playEnemyAttack(enemyIdx, heroIdx, {
        onImpact: () => {
          this.audio.playSFX(action.isMagic ? 'magic' : 'hit');
          this.combat.applyEffect(action.target, res);
          this.spawnFloatingNumber(action.target, res);
          this.updateHUD();
        },
        onComplete: () => {
          this.isExecutingAction = false;
        }
      });
      return;
    }

    // 3. DEFENDERSE, MAGIA E ITEMS (Por ahora sin animación de movimiento, como pediste)
    // 3. DEFENDERSE: Activa la pose de guardia 3D (Espada, Guantes o Arma al frente)
    if (action.type === 'defend') {
      const heroIdx = this.combat.heroes.indexOf(action.actor);
      action.actor.defending = true;
      this.battleScene.setHeroDefending(heroIdx, true);
      this.showBanner(`${action.actor.name} se protege`, 900);
      this.updateHUD();
      setTimeout(() => { this.isExecutingAction = false; }, 600);
      return;
    }

    // 4. MAGIA: Paso al frente -> 2s de anillos verdes ("use-magic.mp3") -> Sonido y efecto del hechizo
    if (action.type === 'magic') {
      const heroIdx = this.combat.heroes.indexOf(action.actor);
      const sp = action.spell;
      const isEnemyTarget = this.combat.enemies.includes(action.target);
      const targetUnit3D = isEnemyTarget
        ? this.battleScene.enemies[action.target.index]
        : this.battleScene.heroes[this.combat.heroes.indexOf(action.target)];

      this.battleScene.playCastAnimation(heroIdx, 'magic', {
      }, targetUnit3D);
      action.actor.mp = Math.max(0, action.actor.mp - sp.mp);
      this.showBanner(`${action.actor.name}: ${sp.name}`, 2400);
      this.updateHUD();

      this.battleScene.playCastAnimation(heroIdx, 'magic', {
        onCastStart: () => {
          this.audio.playSFX('magic');
        },
        onSpellEffect: () => {
          this.audio.playSFX(`spell_${sp.id}`);

          const isEnemyTarget = this.combat.enemies.includes(action.target);
          const targetIdx = isEnemyTarget ? action.target.index : this.combat.heroes.indexOf(action.target);

          // Disparar el efecto 3D del hechizo (Fuego, Iceberg, Rayo con flash, Cura o Pirámide de Barrera)
          this.battleScene.playSpellVFX(sp.id, isEnemyTarget, targetIdx, () => {
            // Pequeño flash eléctrico en pantalla exclusivo para Bolt
            const dmgLayer = document.getElementById('ff7-damage-layer');
            if (dmgLayer) {
              dmgLayer.style.backgroundColor = 'rgba(254, 240, 138, 0.65)';
              setTimeout(() => { dmgLayer.style.backgroundColor = 'transparent'; }, 120);
            }
          });

          if (sp.type === 'buff') {
            if (sp.buff === 'barrier') action.target.barrier = 100;
            if (sp.buff === 'mbarrier') action.target.mbarrier = 100;
            this.spawnFloatingText(action.target, sp.buff.toUpperCase(), 'text-cyan-300');
          } else {
            const res = this.combat.calculateDamage(action.actor, action.target, {
              isMagic: true,
              power: sp.power,
              element: sp.element,
              isCure: sp.type === 'cure'
            });
            this.combat.applyEffect(action.target, res);
            if (!res.isCure && !res.absorbed) {
              const targetUnit = this.battleScene.enemies[action.target.index];
              this.battleScene.triggerTargetHitReaction(targetUnit);
            }
            this.spawnFloatingNumber(action.target, res);
            this.checkEnemyDeath(action.target);
          }
          this.updateHUD();
        },
        onComplete: () => {
          this.isExecutingAction = false;
        }
      });
      return;
    }

    // 5. CASTER DE LIMIT BREAK (Solo animación de cono de fuego + "limit-cast.mp3" ~1.15s por ahora)
    // 5. LIMIT BREAKS: Cloud (Cross-Slash 3x), Barret (Big Shot 3.25x) y Tifa (Slots: Miss / 3x1.25x / 4x1.75x)
    if (action.type === 'limit') {
      const heroIdx = this.combat.heroes.indexOf(action.actor);
      const enemyIdx = action.target.index;
      action.actor.limit = 0;
      this.updateHUD();

      const role = action.actor.id; // 'cloud', 'barret' o 'tifa'
      const limitTitles = {
        cloud: '¡LIMIT: CROSS-SLASH (凶)!',
        barret: '¡LIMIT: BIG SHOT!',
        tifa: action.tifaMode === 'yeah'
          ? '¡LIMIT: FINAL HEAVEN (YEAH x2)!'
          : (action.tifaMode === 'miss' ? 'LIMIT: ¡FALLO EN SLOTS!' : '¡LIMIT: BEAT RUSH!')
      };
      this.showBanner(limitTitles[role], 3100);

      this.battleScene.playLimitBreak(heroIdx, enemyIdx, { tifaMode: action.tifaMode }, {
        onCastStart: () => {
          this.audio.playSFX('limitCast'); // "limit-cast.mp3" (~1.1s)
        },
        onSlashSFX: () => {
          // Sonido en cada trazo del kanji de Cloud o al cargar el cañón de Barret
          this.audio.playSFX(role === 'barret' ? 'gatling' : 'hit');
        },
        onImpact: (stepOrFinal, isMiss = false) => {
          if (role === 'cloud') {
            // Cloud: 3x su daño normal (Power base 16 * 3 = 48) al explotar el kanji
            this.audio.playSFX('hit');
            const res = this.combat.calculateDamage(action.actor, action.target, { isMagic: false, power: 48 });
            this.combat.applyEffect(action.target, res);
            this.spawnFloatingNumber(action.target, res);
            this.checkEnemyDeath(action.target);
            this.updateHUD();

          } else if (role === 'barret') {
            // Barret: 3.25x su daño normal (Power base 16 * 3.25 = 52) al explotar la bola de energía
            this.audio.playSFX('hit');
            const res = this.combat.calculateDamage(action.actor, action.target, { isMagic: false, power: 52 });
            this.combat.applyEffect(action.target, res);
            this.spawnFloatingNumber(action.target, res);
            this.checkEnemyDeath(action.target);
            this.updateHUD();

          } else if (role === 'tifa') {
            if (isMiss) {
              this.audio.playSFX('error');
              this.spawnFloatingText(action.target, 'MISS', 'text-gray-300');
              return;
            }
            // Tifa: HIT = 1.25x por golpe (Power 20, 3 golpes) | YEAH! = 1.75x por golpe (Power 28, 4 golpes)
            this.audio.playSFX('hit');
            const hitPower = action.tifaMode === 'yeah' ? 28 : 20;
            const res = this.combat.calculateDamage(action.actor, action.target, { isMagic: false, power: hitPower });
            this.combat.applyEffect(action.target, res);
            this.spawnFloatingNumber(action.target, res);
            this.checkEnemyDeath(action.target);
            this.updateHUD();
          }
        },
        onComplete: () => {
          this.isExecutingAction = false;
        }
      });
      return;
    }

    this.updateHUD();
    setTimeout(() => {
      this.isExecutingAction = false;
    }, 1250);
  }

  checkEnemyDeath(target) {
    if (this.combat.enemies.includes(target) && !target.alive) {
      this.audio.playSFX('death');
      if (this.battleScene) {
        this.battleScene.playEnemyDeath(target.index);
      }
    }
  }

  // Muestra el número de daño (ej: "1017", "CRITICAL", "ABSORB" o "0") encima del objetivo
  spawnFloatingNumber(target, res) {
    let text = `${res.amount}`;
    let colorClass = 'text-white';

    if (res.immune) {
      text = 'IMMUNE (0)';
      colorClass = 'text-gray-300';
    } else if (res.isCure || res.absorbed) {
      text = `+${res.amount}`;
      colorClass = 'text-green-400';
    } else if (res.isCritical) {
      text = `CRIT! ${res.amount}`;
      colorClass = 'text-yellow-300 scale-125';
    }

    this.spawnFloatingText(target, text, colorClass);
  }

  spawnFloatingText(target, text, colorClass) {
    const layer = document.getElementById('ff7-damage-layer');
    if (!layer || !this.battleScene) return;

    const isEnemy = this.combat.enemies.includes(target);
    const idx = isEnemy ? target.index : this.combat.heroes.indexOf(target);

    // Proyecta la posición 3D actual según el ángulo de cámara activo en este instante
    const screenPos = this.battleScene.getUnitScreenPosition(isEnemy, idx);
    const leftPct = Math.max(12, Math.min(88, screenPos.x));
    const topPct = Math.max(15, Math.min(82, screenPos.y));

    const el = document.createElement('div');
    el.className = `absolute -translate-x-1/2 font-bold text-3xl md:text-5xl drop-shadow-[3px_3px_0_#000] transition-all duration-700 ${colorClass}`;
    el.style.left = `${leftPct}%`;
    el.style.top = `${topPct}%`;
    el.textContent = text;

    layer.appendChild(el);
    requestAnimationFrame(() => {
      el.style.transform = 'translateY(-35px)';
      el.style.opacity = '0';
    });

    setTimeout(() => el.remove(), 800);
  }

  showBanner(msg, duration = 1200) {
    const banner = document.getElementById('ff7-top-banner');
    if (!banner) return;
    banner.textContent = msg;
    banner.classList.remove('hidden');
    clearTimeout(this.bannerTimeout);
    this.bannerTimeout = setTimeout(() => banner.classList.add('hidden'), duration);
  }

  init3D() {
    const canvas = document.getElementById('ff7-battle-canvas');
    this.battleScene = new FF7BattleScene(canvas);
  }

  finishBattle(won) {
    if (this.isFinishing) return;
    this.isFinishing = true;

    clearInterval(this.atbInterval);
    clearInterval(this.tifaSlotTimer);

    if (!won) {
      this.destroy();
      this.onExit();
      return;
    }

    // 1. Ocultar menús de comandos y tocar la Fanfarria de Victoria
    this.menuState = 'CLOSED';
    this.renderMenuWindow();
    this.audio.playVictoryBGM();

    // 2. Activar poses de victoria y cámara frontal en 3D
    if (this.battleScene) {
      this.battleScene.startVictorySequence();
    }

    // 3. Tras 3.8 segundos viendo la celebración 3D, salta la pantalla de EXP/AP mientras la música sigue sonando
    this.victoryTimeout = setTimeout(() => {
      this.showVictoryExpScreen();
    }, 3800);
  }

  // Renderiza la pantalla clásica de fin de combate (Gained EXP and AP) mientras sigue la música
  showVictoryExpScreen() {
    const expData = [
      { name: 'Papa Cloud',  level: 35, exp: 47920, next: 877,  barPct: 48, img: './assets/images/ff7/cloud.png' },
      { name: 'Papa Barret', level: 33, exp: 42150, next: 1240, barPct: 32, img: './assets/images/ff7/barret.png' },
      { name: 'Papa Tifa',   level: 32, exp: 39688, next: 1012, barPct: 42, img: './assets/images/ff7/tifa.png' }
    ];

    const screen = document.createElement('div');
    screen.id = 'ff7-exp-screen';
    screen.className = 'absolute inset-0 z-50 bg-black p-1.5 sm:p-3 flex flex-col gap-1.5 select-none cursor-pointer opacity-0 transition-opacity duration-700 ease-in-out';

    screen.innerHTML = `
      <!-- Fila 1: Banner superior "Gained EXP and AP." -->
      <div class="ff7-hud-box px-4 py-1.5 sm:py-2 text-xl sm:text-3xl text-white flex justify-between items-center">
        <span>Gained EXP and AP.</span>
        <span class="text-xs sm:text-lg text-yellow-300 animate-pulse">[ENTER / CLIC PARA CONTINUAR]</span>
      </div>

      <!-- Fila 2: Cajas divididas de EXP y AP -->
      <div class="grid grid-cols-2 gap-1.5">
        <div class="ff7-hud-box px-4 sm:px-8 py-1 flex justify-between items-center text-xl sm:text-3xl">
          <span class="ff7-label">EXP</span>
          <span class="text-white">300<small class="text-base sm:text-2xl ml-0.5">P</small></span>
        </div>
        <div class="ff7-hud-box px-4 sm:px-8 py-1 flex justify-between items-center text-xl sm:text-3xl">
          <span class="ff7-label">AP</span>
          <span class="text-white">30<small class="text-base sm:text-2xl ml-0.5">P</small></span>
        </div>
      </div>

      <!-- Filas 3, 4 y 5: Tarjetas de los 3 personajes con espacio vacío listo para el Portrait -->
      <div class="flex-1 flex flex-col gap-1.5">
        ${expData.map((h) => `
          <div class="flex-1 ff7-hud-box px-3 sm:px-6 py-1.5 grid grid-cols-12 items-center gap-2 sm:gap-4">
            
            <!-- RECUADRO DE PORTRAIT (Vacío por defecto, listo para rellenar con tu imagen real) -->
            <div class="col-span-3 sm:col-span-2 flex justify-center items-center">
              <div class="w-14 h-14 sm:w-20 sm:h-20 md:w-24 md:h-24 bg-[#000028] border-2 border-zinc-400 shadow-inner overflow-hidden flex items-center justify-center">
                <!-- Cuando agregues la imagen en ./assets/images/ff7/ se mostrará sola; si no existe, queda el cuadro limpio -->
                <img src="${h.img}" alt="" class="w-full h-full object-cover hidden" onload="this.classList.remove('hidden')" onerror="this.classList.add('hidden')" />
              </div>
            </div>

            <!-- Nombre y Nivel -->
            <div class="col-span-4 sm:col-span-4 flex flex-col justify-between h-full py-1">
              <span class="text-xl sm:text-3xl md:text-4xl text-white leading-none">${h.name}</span>
              <div class="text-lg sm:text-2xl md:text-3xl text-white leading-none">
                <span class="ff7-label mr-2">Level:</span>${h.level}
              </div>
            </div>

            <!-- EXP actual, barra rosa/salmón y next level -->
            <div class="col-span-5 sm:col-span-6 flex flex-col justify-between h-full py-1">
              <div class="flex justify-between items-baseline text-lg sm:text-2xl md:text-3xl leading-none">
                <span class="ff7-label">EXP:</span>
                <span>${h.exp}<small class="text-sm sm:text-xl ml-0.5">P</small></span>
              </div>

              <!-- Barra de progreso de nivel estilo FF7 -->
              <div class="w-4/5 ml-auto bg-zinc-700 p-0.5 border-2 border-zinc-400 my-0.5">
                <div class="ff7-slot h-2.5 sm:h-3.5 w-full">
                  <div class="h-full bg-gradient-to-b from-red-200 via-rose-400 to-red-500" style="width:${h.barPct}%"></div>
                </div>
              </div>

              <div class="flex justify-between items-baseline text-lg sm:text-2xl md:text-3xl leading-none">
                <span class="ff7-label">next level:</span>
                <span>${h.next}<small class="text-sm sm:text-xl ml-0.5">P</small></span>
              </div>
            </div>

          </div>
        `).join('')}
      </div>
    `;

    this.container.firstElementChild.appendChild(screen);

    // FADE IN: Esperar al siguiente frame para que el navegador anime la opacidad de 0 a 100%
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        screen.classList.remove('opacity-0');
        screen.classList.add('opacity-100');
      });
    });

    let isClosingScreen = false;

    // FADE OUT: Al presionar Enter o hacer clic, se desvanece suavemente a negro antes de volver al Hub
    const closeVictoryAndUnlock = () => {
      if (isClosingScreen) return;
      isClosingScreen = true;

      window.removeEventListener('keydown', onKeyFinish);
      this.audio.playSFX('move');

      // Vaciamos el contenido con fade-out hacia negro para que la vuelta al Hub sea súper suave
      screen.style.transition = 'opacity 0.65s ease-in-out';
      Array.from(screen.children).forEach((child) => {
        child.style.transition = 'opacity 0.5s ease-in-out';
        child.style.opacity = '0';
      });

      setTimeout(() => {
        this.destroy();
        this.onWin();
      }, 650);
    };

    const onKeyFinish = (e) => {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') {
        e.preventDefault();
        closeVictoryAndUnlock();
      }
    };

    screen.addEventListener('click', closeVictoryAndUnlock);
    window.addEventListener('keydown', onKeyFinish);
  }

  destroy() {
    clearTimeout(this.victoryTimeout);
    this.isDisposed = true;
    clearInterval(this.atbInterval);
    window.removeEventListener('keydown', this.keyHandler);
    this.audio.stopBGM();
    if (this.battleScene) {
      this.battleScene.destroy();
    }
  }
}