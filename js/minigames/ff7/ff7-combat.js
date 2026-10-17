// Diccionario de Hechizos disponibles (los ítems viven en FF7CombatEngine.items)
export const SPELLS_DB = {
  fire:     { id: 'fire',     name: 'Fuego (Fira)',      mp: 22, power: 30, type: 'magic', element: 'fire',      target: 'enemy' },
  ice:      { id: 'ice',      name: 'Hielo (Blizzara)',  mp: 22, power: 30, type: 'magic', element: 'ice',       target: 'enemy' },
  bolt:     { id: 'bolt',     name: 'Eléctrico (Thundara)', mp: 22, power: 30, type: 'magic', element: 'lightning', target: 'enemy' },
  cure:     { id: 'cure',     name: 'Cura (Cura)',       mp: 24, power: 40, type: 'cure',  element: 'restorative', target: 'ally' },
  barrier:  { id: 'barrier',  name: 'Barrera (Barrier)', mp: 16, power: 0,  type: 'buff',  buff: 'barrier',      target: 'self' },
  mbarrier: { id: 'mbarrier', name: 'Barrera M. (MBarrier)', mp: 16, power: 0, type: 'buff', buff: 'mbarrier',   target: 'self' }
};

export class FF7CombatEngine {
  constructor() {
    // ALIADOS MID-GAME (Cloud Lv 35, Barret Lv 33, Tifa Lv 32)
    this.heroes = [
      {
        id: 'cloud', name: 'Papa Cloud', level: 35,
        hp: 2950, maxHp: 2950, mp: 310, maxMp: 310,
        attack: 96, defense: 78, magic: 88, mdef: 72, speed: 62,
        atb: 40, limit: 50, // Cerca de cargar para que veas cómo se activa el LIMIT al recibir daño
        defending: false, barrier: 0, mbarrier: 0, alive: true,
        spells: ['fire', 'bolt', 'barrier', 'cure']
      },
      {
        id: 'barret', name: 'Papa Barret', level: 33,
        hp: 3420, maxHp: 3420, mp: 240, maxMp: 240,
        attack: 92, defense: 88, magic: 72, mdef: 65, speed: 52,
        atb: 20, limit: 40,
        defending: false, barrier: 0, mbarrier: 0, alive: true,
        spells: ['cure', 'bolt', 'ice', 'mbarrier']
      },
      {
        id: 'tifa', name: 'Papa Tifa', level: 32,
        hp: 2680, maxHp: 2680, mp: 275, maxMp: 275,
        attack: 90, defense: 72, magic: 82, mdef: 76, speed: 70,
        atb: 65, limit: 60,
        defending: false, barrier: 0, mbarrier: 0, alive: true,
        spells: ['mbarrier', 'barrier', 'ice', 'fire']
      }
    ];

    // ENEMIGOS NIVEL 35 (Con debilidades, resistencias, inmunidades y absorción)
    this.enemies = [
      {
        index: 0, id: 'knife', name: 'Cuchillo Chef', level: 35,
        hp: 3800, maxHp: 3800, attack: 95, defense: 90, magic: 75, mdef: 75, speed: 55,
        atb: 15, defending: false, barrier: 0, mbarrier: 0, alive: true,
        // Metal: Débil al Rayo, Resiste Hielo
        elements: { lightning: 'weak', ice: 'resist' }
      },
      {
        index: 1, id: 'oil', name: 'Botella Aceite', level: 35,
        hp: 4200, maxHp: 4200, attack: 88, defense: 75, magic: 92, mdef: 85, speed: 48,
        atb: 35, defending: false, barrier: 0, mbarrier: 0, alive: true,
        // Aceite hirviendo: Absorbe Fuego, Débil al Hielo
        elements: { fire: 'absorb', ice: 'weak' }
      },
      {
        index: 2, id: 'fork', name: 'Tenedor Real', level: 35,
        hp: 3500, maxHp: 3500, attack: 92, defense: 85, magic: 70, mdef: 70, speed: 60,
        atb: 5, defending: false, barrier: 0, mbarrier: 0, alive: true,
        elements: { lightning: 'weak' }
      },
      {
        index: 3, id: 'salt', name: 'Salero Mortal', level: 35,
        hp: 3600, maxHp: 3600, attack: 85, defense: 105, magic: 88, mdef: 95, speed: 45,
        atb: 50, defending: false, barrier: 0, mbarrier: 0, alive: true,
        // Mineral: Inmune al Rayo, Débil al Fuego
        elements: { lightning: 'immune', fire: 'weak' }
      }
    ];

    this.items = [
      { id: 'potion', name: 'Poción', count: 5, healHp: 800 },
      { id: 'ether',  name: 'Éter',   count: 3, healMp: 120 }
    ];
    this.readyHeroesQueue = []; // Cola de héroes esperando que el jugador elija comando
    this.actionQueue = [];      // Cola de acciones listas para ejecutarse de 1 en 1
  }

  // =========================================================================
  // FÓRMULAS OFICIALES DE DAÑO DE FINAL FANTASY VII
  // =========================================================================
  calculateDamage(attacker, target, options = {}) {
    const {
      isMagic = false,
      power = 16,        // 16 = 1.0x ataque básico en FF7
      element = null,
      isCure = false
    } = options;

    const lvl = attacker.level;
    let base = 0;
    let defStat = 0;

    if (!isMagic) {
      // Físico: Base = Attack + ((Attack + Level) / 32) * ((Attack * Level) / 32)
      const atk = attacker.attack;
      base = atk + ((atk + lvl) / 32) * ((atk * lvl) / 32);
      defStat = target.defense;
    } else {
      // Mágico: Base = Magic + ((Magic + Level) / 32) * ((Magic * Level) / 32)
      const mag = attacker.magic;
      base = mag + ((mag + lvl) / 32) * ((mag * lvl) / 32);
      defStat = isCure ? 0 : target.mdef; // La curación ignora defensa mágica
    }

    // Cálculo con defensa: Damage = (Power * (512 - Defense) * Base) / 16 / 512
    let damage = (power * (512 - defStat) * base) / 16 / 512;

    let isCritical = false;
    let absorbed = false;
    let immune = false;
    let weak = false;
    let resist = false;

    if (!isCure) {
      // 1. Critical Hit (Físico): x2
      if (!isMagic && Math.random() < 0.15) {
        isCritical = true;
        damage *= 2;
      }

      // 2. Defend command: x0.5 damage taken (Físico)
      if (!isMagic && target.defending) {
        damage *= 0.5;
      }

      // 3. Barrier / M.Barrier: x0.5 physical / magical damage taken
      if (!isMagic && target.barrier > 0) {
        damage *= 0.5;
      } else if (isMagic && target.mbarrier > 0) {
        damage *= 0.5;
      }

      // 4. Modificadores Elementales (Weak x2, Resist x0.5, Immune x0, Absorb = curación)
      if (element && target.elements && target.elements[element]) {
        const rel = target.elements[element];
        if (rel === 'weak') {
          damage *= 2;
          weak = true;
        } else if (rel === 'resist') {
          damage *= 0.5;
          resist = true;
        } else if (rel === 'immune') {
          damage = 0;
          immune = true;
        } else if (rel === 'absorb') {
          absorbed = true;
        }
      }
    }

    // 5. Variación aleatoria de FF7: Damage = Damage * (3841 + random(0..255)) / 4096
    if (!immune) {
      const rand = Math.floor(Math.random() * 256); // 0..255
      damage = Math.floor((damage * (3841 + rand)) / 4096);
    }

    // 6. Cap de daño de FF7: 9999
    damage = Math.min(9999, Math.max(0, damage));

    return { amount: damage, isCritical, absorbed, immune, isCure, weak, resist };
  }

  // Aplica el resultado al objetivo y carga su barra de Limit si recibió daño
  applyEffect(target, result) {
    if (result.immune) return;

    if (result.isCure || result.absorbed) {
      const hpBefore = target.hp;
      target.hp = Math.min(target.maxHp, target.hp + result.amount);
      result.healed = target.hp - hpBefore; // HP realmente recuperados (para mostrarlos en pantalla)
    } else {
      target.hp = Math.max(0, target.hp - result.amount);
      // Si es un héroe y recibe daño, sube su barra de LIMIT
      if (target.limit !== undefined && result.amount > 0) {
        const limitGain = Math.min(35, Math.ceil((result.amount / target.maxHp) * 90));
        target.limit = Math.min(100, target.limit + limitGain);
      }
      if (target.hp === 0) {
        target.alive = false;
        target.atb = 0;
      }
    }
  }
}